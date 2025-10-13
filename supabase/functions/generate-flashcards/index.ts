import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

// Disable worker for Deno environment to avoid worker loading issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, userId } = await req.json();
    
    if (!fileId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting flashcard generation for fileId:', fileId);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file information
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('name, file_path, file_type')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fileError || !fileData) {
      console.error('File not found:', fileError);
      return new Response(
        JSON.stringify({ error: 'File not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file content from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('student-files')
      .download(fileData.file_path);

    if (downloadError || !fileBlob) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Error accessing file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text content based on file type
    let textContent = '';
    
    if (fileData.file_type.includes('text/') || fileData.name.endsWith('.txt') || fileData.name.endsWith('.md')) {
      textContent = await fileBlob.text();
      console.log('Text content extracted, length:', textContent.length);
    } else if (fileData.file_type.includes('application/pdf')) {
      // Extract text from PDF
      console.log('Processing PDF file...');
      const arrayBuffer = await fileBlob.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: typedArray,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdfDocument = await loadingTask.promise;
      
      const numPages = pdfDocument.numPages;
      const textPages: string[] = [];
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        textPages.push(pageText);
      }
      
      textContent = textPages.join('\n\n');
      console.log('PDF text extracted, pages:', numPages, 'length:', textContent.length);
    } else {
      // For other file types, use filename as context
      textContent = `Study material from file: ${fileData.name}. Generate educational flashcards based on the subject matter suggested by the filename.`;
    }
    
    console.log('Text content extracted, length:', textContent.length);

    // Limit content to avoid token limits
    const limitedContent = textContent.slice(0, 8000);

    // Generate flashcards using Google Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create exactly 5-10 educational flashcards from this content. You MUST respond with ONLY a valid JSON array, no other text.

Format:
[
  {
    "question": "Clear, specific question",
    "answer": "Detailed answer",
    "difficulty": "easy"
  }
]

Content: ${limitedContent}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error generating flashcards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    let flashcardsData;

    try {
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error('No content in response');
      
      // Try to parse directly first (since we specified JSON mime type)
      try {
        flashcardsData = JSON.parse(content);
      } catch {
        // Fallback: extract JSON array from text
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          flashcardsData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found');
        }
      }
      
      if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
        throw new Error('Invalid flashcard data format');
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      console.log('Raw response:', geminiData);
      return new Response(
        JSON.stringify({ error: 'Error processing flashcard data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert flashcards into database
    const flashcardsToInsert = flashcardsData.map((card: any) => ({
      user_id: userId,
      file_id: fileId,
      question: card.question,
      answer: card.answer,
      difficulty_level: card.difficulty || 'medium',
    }));

    const { data: insertedFlashcards, error: insertError } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting flashcards:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error saving flashcards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${insertedFlashcards.length} flashcards for file ${fileData.name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        flashcards: insertedFlashcards,
        message: `Generated ${insertedFlashcards.length} flashcards successfully!`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-flashcards function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});