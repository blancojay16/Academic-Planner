import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs';

// Configure worker for Deno environment
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.worker.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, userId, summaryType = 'concise' } = await req.json();
    console.log('Starting summary generation for fileId:', fileId, 'summaryType:', summaryType);

    if (!fileId || !userId) {
      throw new Error('fileId and userId are required');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Required environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError) throw fileError;

    console.log('Fetching file content from storage:', fileData.file_path);

    // Download file from storage
    const { data: fileBlob, error: storageError } = await supabase.storage
      .from('student-files')
      .download(fileData.file_path);

    if (storageError) throw storageError;

    // Extract text content based on file type
    let textContent = '';

    if (fileData.file_type.includes('text/')) {
      textContent = await fileBlob.text();
      console.log('Text content extracted, length:', textContent.length);
    } else if (fileData.file_type.includes('application/pdf')) {
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
      console.log('PDF text extracted, pages:', numPages);
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        textContent += pageText + '\n';
      }
      
      console.log('PDF text extracted, length:', textContent.length);
    } else {
      // For other file types, use filename as context
      textContent = `Filename: ${fileData.name}`;
    }

    // Limit content length to avoid token limits
    textContent = textContent.substring(0, 8000);

    // Generate appropriate prompt based on summary type
    let systemPrompt = '';
    switch (summaryType) {
      case 'bullet_points':
        systemPrompt = 'You are a helpful study assistant that creates clear, concise bullet-point summaries from lecture notes and documents. Format your response as a series of bullet points (using • or -) that capture the key concepts and facts. Focus on the most important information that students need to remember.';
        break;
      case 'key_definitions':
        systemPrompt = 'You are a helpful study assistant that identifies and defines key terms and concepts from lecture notes and documents. Format your response as a list of terms with their definitions. Each entry should be: **Term:** followed by the definition. Focus on important vocabulary, concepts, and terminology that students need to understand.';
        break;
      default: // concise
        systemPrompt = 'You are a helpful study assistant that creates concise, well-organized summaries from lecture notes and documents. Your summary should capture the main ideas, key points, and essential information in a clear, easy-to-understand paragraph format. Keep it focused and comprehensive without being too lengthy.';
    }

    const userPrompt = `Please create a ${summaryType.replace('_', ' ')} from the following content:\n\n${textContent}`;

    console.log('Calling Gemini API for summary generation');

    // Call Gemini API for summary generation
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const summaryContent = geminiData.candidates[0].content.parts[0].text;

    console.log('Summary generated successfully');

    // Store summary in database
    const { data: summary, error: insertError } = await supabase
      .from('summaries')
      .insert({
        user_id: userId,
        file_id: fileId,
        summary_type: summaryType,
        content: summaryContent
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Summary stored in database');

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: summary
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-summary function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
