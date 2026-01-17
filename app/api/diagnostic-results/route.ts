// app/api/diagnostic-results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentResultsRaw } from '@/lib/firebase/db';
import { getSubjectById } from '@/lib/firebase/subjectManagement';

export async function POST(request: NextRequest) {
  try {
    const { studentId, term, session } = await request.json();

    console.log('🔍 DIAGNOSTIC REQUEST:', { studentId, term, session });

    if (!studentId || !term || !session) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch raw results
    const rawResults = await getStudentResultsRaw(studentId, term, session);
    
    console.log('📊 Raw results count:', rawResults.length);

    // Enhance with subject names
    const enhancedResults = await Promise.all(
      rawResults.map(async (result) => {
        const subject = await getSubjectById(result.subjectId);
        
        console.log('Result:', {
          subjectId: result.subjectId,
          subjectName: subject?.subjectName,
          ca1: result.ca1,
          ca2: result.ca2,
          exam: result.exam,
          total: result.total
        });

        return {
          ...result,
          subjectName: subject?.subjectName || result.subjectId,
          // Ensure all fields are present
          ca1: result.ca1 !== undefined ? result.ca1 : null,
          ca2: result.ca2 !== undefined ? result.ca2 : null,
          exam: result.exam !== undefined ? result.exam : null,
          total: result.total || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      studentId,
      term,
      session,
      results: enhancedResults,
      summary: {
        total: enhancedResults.length,
        withCA1: enhancedResults.filter(r => r.ca1 && r.ca1 > 0).length,
        withCA2: enhancedResults.filter(r => r.ca2 && r.ca2 > 0).length,
        withExam: enhancedResults.filter(r => r.exam && r.exam > 0).length,
        withNoScores: enhancedResults.filter(r => !r.ca1 && !r.ca2 && !r.exam).length
      }
    });

  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}