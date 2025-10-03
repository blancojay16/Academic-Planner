import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, userId } = await req.json();

    if (!fileId || !userId) {
      throw new Error('Missing required fields: fileId and userId');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file metadata
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or access denied');
    }

    console.log('Fetching file content from storage:', fileData.file_path);

    // Download file content from storage
    const { data: fileContent, error: downloadError } = await supabase.storage
      .from('student-files')
      .download(fileData.file_path);

    if (downloadError || !fileContent) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download file content');
    }

    // Extract text content
    let textContent = '';
    
    if (fileData.file_type === 'application/pdf') {
      const arrayBuffer = await fileContent.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      textContent = new TextDecoder().decode(uint8Array);
    } else {
      textContent = await fileContent.text();
    }

    console.log('Text content extracted, length:', textContent.length);

    // Generate quiz using Gemini API
    const prompt = `Based on the following content, generate a quiz with 5-10 multiple choice questions. 
Each question should have 4 options (A, B, C, D) with only one correct answer.
Also provide a brief explanation for each correct answer.

Format your response as a JSON array like this:
[
  {
    "question": "What is...",
    "options": {
      "A": "Option A",
      "B": "Option B",
      "C": "Option C",
      "D": "Option D"
    },
    "correctAnswer": "A",
    "explanation": "The correct answer is A because..."
  }
]

Content to generate quiz from:
${textContent.substring(0, 50000)}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Failed to generate quiz from Gemini API');
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates[0].content.parts[0].text;

    console.log('Generated quiz text:', generatedText);

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse quiz JSON from Gemini response');
    }

    const quizQuestions = JSON.parse(jsonMatch[0]);

    // Create quiz entry
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        file_id: fileId,
        title: `Quiz: ${fileData.name}`,
      })
      .select()
      .single();

    if (quizError || !quizData) {
      console.error('Quiz creation error:', quizError);
      throw new Error('Failed to create quiz');
    }

    // Insert quiz questions
    const questionsToInsert = quizQuestions.map((q: any) => ({
      quiz_id: quizData.id,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions insertion error:', questionsError);
      throw new Error('Failed to save quiz questions');
    }

    console.log('Quiz generated successfully with', quizQuestions.length, 'questions');

    return new Response(
      JSON.stringify({ 
        success: true, 
        quizId: quizData.id,
        questionCount: quizQuestions.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
