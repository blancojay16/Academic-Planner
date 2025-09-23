import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', {
        hasOpenAI: !!openAIApiKey,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting flashcard generation for fileId:', fileId);
    console.log('Environment variables check:', {
      hasOpenAI: !!openAIApiKey,
      openAIKeyLength: openAIApiKey ? openAIApiKey.length : 0,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

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
    } else if (fileData.file_type.includes('application/pdf')) {
      // For PDF files, we'll use a simple approach - in production, you'd want to use a PDF parser
      textContent = `PDF file: ${fileData.name}. Please provide study material for flashcard generation.`;
    } else {
      // For other file types, use filename as context
      textContent = `Study material from file: ${fileData.name}. Generate educational flashcards based on the subject matter suggested by the filename.`;
    }

    // Limit content to avoid token limits
    const limitedContent = textContent.slice(0, 8000);

    // Generate flashcards using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an educational AI assistant that creates flashcards for students. 
            Based on the provided content, create exactly 5-10 flashcards that help students learn and review the material.
            Each flashcard should have a clear question and a comprehensive answer.
            
            Return the response as a JSON array in this exact format:
            [
              {
                "question": "Clear, specific question about the content",
                "answer": "Detailed answer that explains the concept",
                "difficulty": "easy|medium|hard"
              }
            ]
            
            Make sure the questions test understanding, not just memorization. Include a mix of difficulty levels.`
          },
          {
            role: 'user',
            content: `Create flashcards from this content:\n\n${limitedContent}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorDetails = await openAIResponse.text();
      console.error('OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        details: errorDetails
      });
      return new Response(
        JSON.stringify({ 
          error: 'Error generating flashcards', 
          details: `OpenAI API returned ${openAIResponse.status}: ${openAIResponse.statusText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    let flashcardsData;

    try {
      const content = openAIData.choices[0].message.content;
      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcardsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw response:', openAIData.choices[0].message.content);
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