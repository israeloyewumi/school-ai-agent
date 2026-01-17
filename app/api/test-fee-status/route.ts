// app/api/test-fee-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentFeeStatus } from '@/lib/firebase/feeManagement';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const term = searchParams.get('term');
    const session = searchParams.get('session');

    if (!studentId || !term || !session) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Testing fee status for:', { studentId, term, session });
    
    const feeStatus = await getStudentFeeStatus(studentId, term, session);
    
    return NextResponse.json({
      success: true,
      data: feeStatus,
      testDetails: {
        studentId,
        term,
        session,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error in test-fee-status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch fee status', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

// You can also add other methods if needed
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}