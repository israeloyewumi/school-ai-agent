// app/api/admin-chat/route.ts - Proxy to Firebase Cloud Functions

import { NextRequest, NextResponse } from 'next/server';

// Get Cloud Functions URL from environment variable
const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL || 
                           process.env.CLOUD_FUNCTION_URL ||
                           'http://localhost:5001/YOUR-PROJECT-ID/us-central1/api'; // Fallback for local emulator

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, adminId, conversationHistory } = body;

    console.log('🔥 Admin chat request received (proxying to Cloud Function)');

    // Validate required fields
    if (!message || !adminId) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: message and adminId are required' },
        { status: 400 }
      );
    }

    console.log('✅ Forwarding to Cloud Function for admin:', adminId);

    // Call Firebase Cloud Function
    const cloudFunctionResponse = await fetch(`${CLOUD_FUNCTION_URL}/admin-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        adminId,
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
      response: data.response
    });

  } catch (error: any) {
    console.error('❌ Admin chat API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}