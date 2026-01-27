// app/api/parent-chat/route.ts - Proxy to Firebase Cloud Functions

import { NextRequest, NextResponse } from 'next/server';

// Get Cloud Functions URL from environment variable
const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL || 
                           process.env.CLOUD_FUNCTION_URL ||
                           'http://localhost:5001/YOUR-PROJECT-ID/us-central1/api'; // Fallback for local emulator

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, parentId, conversationHistory } = body;

    // Validation
    if (!message || !parentId) {
      return NextResponse.json(
        { error: 'Missing required fields: message and parentId are required' },
        { status: 400 }
      );
    }

    console.log('🔵 Parent Chat Request (proxying to Cloud Function):', {
      parentId,
      messagePreview: message.substring(0, 50) + '...'
    });

    // Call Firebase Cloud Function
    const cloudFunctionResponse = await fetch(`${CLOUD_FUNCTION_URL}/parent-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        parentId,
        conversationHistory: conversationHistory || []
      })
    });

    if (!cloudFunctionResponse.ok) {
      const errorData = await cloudFunctionResponse.json();
      console.error('❌ Cloud Function error:', errorData);
      throw new Error(errorData.error || 'Cloud Function request failed');
    }

    const data = await cloudFunctionResponse.json();
    console.log('✅ Cloud Function response received');

    return NextResponse.json({
      success: true,
      response: data.response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Parent chat API error:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to process your request',
        details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Parent Chat API (Cloud Functions Proxy)',
    version: '1.0.0',
    message: 'Use POST to send chat messages'
  });
}