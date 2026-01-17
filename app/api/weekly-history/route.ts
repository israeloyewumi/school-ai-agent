// app/api/weekly-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchWeeklyHistory,
  calculateAttendancePercentage,
  calculateTotalMerits,
  getGradeSummary
} from '@/lib/firebase/teacherReports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');
    const weekDate = searchParams.get('weekDate');
    const teacherId = searchParams.get('teacherId'); // NEW: Get teacher ID

    console.log('Weekly History API called:', { studentId, weekDate, teacherId });

    // Validate required parameters
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (!weekDate) {
      return NextResponse.json(
        { error: 'Week date is required' },
        { status: 400 }
      );
    }

    // Parse the date
    const date = new Date(weekDate);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    console.log('Fetching weekly history...');

    // Fetch the weekly history data (with teacher filter if provided)
    const historyData = await fetchWeeklyHistory(studentId, date, teacherId || undefined);

    console.log('History data fetched:', {
      attendance: historyData.attendance.length,
      merits: historyData.merits.length,
      grades: historyData.grades.length
    });

    // Calculate summary statistics
    const attendancePercentage = calculateAttendancePercentage(historyData.attendance);
    const totalMerits = calculateTotalMerits(historyData.merits);
    const gradeSummary = getGradeSummary(historyData.grades);

    // Prepare response
    const response = {
      success: true,
      data: {
        ...historyData,
        summary: {
          attendancePercentage,
          totalMerits,
          totalAttendanceRecords: historyData.attendance.length,
          totalMeritRecords: historyData.merits.length,
          totalGradeRecords: historyData.grades.length,
          gradesByType: {
            classwork: gradeSummary.classwork.length,
            homework: gradeSummary.homework.length,
            ca1: gradeSummary.ca1.length,
            ca2: gradeSummary.ca2.length,
            exam: gradeSummary.exam.length
          }
        }
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error fetching weekly history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch weekly history',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}