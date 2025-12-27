// app/api/agent/route.ts - Enhanced API Route with Debugging
import { NextResponse } from "next/server";
import { generateResponse } from "@/lib/ai/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, message, context } = body;

    console.log('📥 [API] Received request:', { role, message, context });

    // Validate input
    if (!role || !message) {
      console.error('❌ [API] Missing required fields');
      return NextResponse.json(
        { error: "Role and message are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["student", "teacher", "parent", "admin"];
    if (!validRoles.includes(role)) {
      console.error('❌ [API] Invalid role:', role);
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    console.log('🤖 [API] Calling generateResponse...');

    // Generate AI response with context
    const response = await generateResponse(role, message, context);

    console.log('✅ [API] Got response from AI:', {
      hasResponse: !!response,
      length: response?.length || 0,
      preview: response?.substring(0, 100)
    });

    if (!response || response.trim() === '') {
      console.error('❌ [API] AI returned empty response');
      return NextResponse.json({
        response: "I apologize, but I couldn't generate a response. Please try again."
      });
    }

    console.log('📤 [API] Sending response to client');
    return NextResponse.json({ response });
    
  } catch (error: any) {
    console.error("❌ [API] Error in agent API route:", error);
    console.error("❌ [API] Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}