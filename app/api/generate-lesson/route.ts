// app/api/generate-lesson/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, images, className, subjectName } = await request.json();

    console.log('📝 Received request:', { 
      className, 
      subjectName, 
      contentLength: content?.length,
      imageCount: images?.length || 0
    });

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured. Please add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Validate inputs
    if ((!content || content.trim() === '') && (!images || images.length === 0)) {
      console.error('❌ No content or images provided');
      return NextResponse.json(
        { error: 'Please provide either text content or images' },
        { status: 400 }
      );
    }

    if (!className || !subjectName) {
      console.error('❌ Missing className or subjectName');
      return NextResponse.json(
        { error: 'Missing required fields: className or subjectName' },
        { status: 400 }
      );
    }

    console.log('🤖 Initializing Gemini AI...');
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const instructionText = `You are an expert Nigerian educator creating lesson plans and classwork for ${className} students studying ${subjectName}.

${images && images.length > 0 ? 'HANDWRITTEN LESSON NOTE (from images):' : 'LESSON NOTE:'}
${content || '(See attached images for handwritten notes)'}

Please analyze this lesson note and create:

1. A COMPREHENSIVE LESSON PLAN with:
   - Topic/Title
   - Learning Objectives (3-5 specific objectives)
   - Introduction (hook/engagement activity)
   - Main Content (key points broken down)
   - Learning Activities
   - Conclusion/Summary
   - Assessment Strategy

2. SIX THEORY-BASED CLASSWORKS (10 questions each):
   - 2 EASY classworks (basic recall and understanding)
   - 2 MODERATE classworks (application and analysis)
   - 2 HARD classworks (evaluation and synthesis)

Each question should be theory-based (no multiple choice), requiring students to write explanations, describe concepts, compare/contrast, analyze, etc.

Format your response as JSON with this EXACT structure:
{
  "lessonPlan": {
    "topic": "string",
    "objectives": ["string", "string", "string"],
    "introduction": "string",
    "mainContent": ["string", "string", "string"],
    "activities": ["string", "string", "string"],
    "conclusion": "string",
    "assessment": "string"
  },
  "classWorks": [
    {
      "id": "easy_1",
      "title": "Understanding the Basics: [Topic Name]",
      "difficulty": "easy",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    },
    {
      "id": "easy_2",
      "title": "Recall and Recognition: [Topic Name]",
      "difficulty": "easy",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    },
    {
      "id": "moderate_1",
      "title": "Applying Concepts: [Topic Name]",
      "difficulty": "moderate",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    },
    {
      "id": "moderate_2",
      "title": "Analyzing and Comparing: [Topic Name]",
      "difficulty": "moderate",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    },
    {
      "id": "hard_1",
      "title": "Critical Evaluation: [Topic Name]",
      "difficulty": "hard",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    },
    {
      "id": "hard_2",
      "title": "Synthesis and Creation: [Topic Name]",
      "difficulty": "hard",
      "questions": ["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]
    }
  ]
}

CRITICAL: 
- Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text
- Each classwork MUST have exactly 10 questions
- Make questions age-appropriate for ${className} level and aligned with Nigerian curriculum standards`;

    console.log('🔄 Generating content with Gemini...');
    
    // Prepare the prompt parts
    let promptParts: any[] = [];

    // If images are provided, add them first
    if (images && images.length > 0) {
      console.log(`📸 Processing ${images.length} image(s)...`);
      for (let i = 0; i < images.length; i++) {
        promptParts.push({
          inlineData: {
            mimeType: images[i].mimeType,
            data: images[i].data
          }
        });
      }
    }

    // Add the instruction text
    promptParts.push({ text: instructionText });

    // Generate content
    const result = await model.generateContent(promptParts);
    const response = await result.response;
    let text = response.text();

    console.log('📄 Raw Gemini response length:', text.length);
    console.log('📄 First 200 chars:', text.substring(0, 200));

    // Clean up the response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to find JSON in the response
    let jsonStart = text.indexOf('{');
    let jsonEnd = text.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      text = text.substring(jsonStart, jsonEnd + 1);
    }

    console.log('🧹 Cleaned response length:', text.length);

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(text);
      console.log('✅ Successfully parsed JSON');
      console.log('📊 Lesson plan topic:', parsedData.lessonPlan?.topic);
      console.log('📊 Number of classworks:', parsedData.classWorks?.length);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON');
      console.error('Parse error:', parseError);
      console.error('Text that failed to parse:', text.substring(0, 500));
      
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response as JSON. The AI may have returned invalid format.',
          details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          preview: text.substring(0, 200)
        },
        { status: 500 }
      );
    }

    // Validate the structure
    if (!parsedData.lessonPlan || !parsedData.classWorks) {
      console.error('❌ Invalid structure:', { 
        hasLessonPlan: !!parsedData.lessonPlan, 
        hasClassWorks: !!parsedData.classWorks 
      });
      
      return NextResponse.json(
        { error: 'AI response missing required fields (lessonPlan or classWorks)' },
        { status: 500 }
      );
    }

    // Return the structured data
    console.log('✅ Returning successful response');
    return NextResponse.json({
      content: [{
        type: 'text',
        text: JSON.stringify(parsedData)
      }]
    });

  } catch (error: any) {
    console.error('❌ Error in generate-lesson API:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate lesson',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}