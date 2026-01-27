// lib/firebase/parentAccess.ts - Backend Functions for Parent Portal

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { getStudentById } from './studentManagement';
import { getStudentAttendance, getStudentMerits, getStudentResultsRaw } from './db';

// ============================================
// INTERFACES
// ============================================

export interface ParentChild {
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  className: string;
  classId: string;
  admissionNumber: string;
  profilePhoto?: string;
}

export interface ParentDashboardData {
  children: ParentChild[];
  selectedChild?: StudentDashboardData;
}

export interface StudentDashboardData {
  student: ParentChild;
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  merits: {
    totalPoints: number;
    positivePoints: number;
    negativePoints: number;
    recentAwards: MeritAward[];
  };
  academics: {
    subjects: SubjectPerformance[];
    overallAverage: number;
    totalAssessments: number;
  };
  fees: FeeStatus;
}

export interface MeritAward {
  id: string;
  date: Date;
  points: number;
  category: string;
  reason: string;
  teacherName: string;
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  classwork: {
    scores: number[];
    average: number;
    count: number;
  };
  homework: {
    scores: number[];
    average: number;
    count: number;
  };
  ca1: number | null;
  ca2: number | null;
  exam: number | null;
  total: number;
  grade: string;
}

export interface FeeStatus {
  term: string;
  session: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate?: Date;
  paymentHistory: FeePayment[];
}

export interface FeePayment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  receiptNumber: string;
  recordedBy: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateGrade(percentage: number): string {
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get all children linked to a parent
 */
export async function getParentChildren(parentId: string): Promise<ParentChild[]> {
  try {
    console.log('👨‍👩‍👧‍👦 Fetching children for parent:', parentId);

    // Query students collection for students with this parentId
    const studentsQuery = query(
      collection(db, 'students'),
      where('parentId', '==', parentId)
    );
    
    const snapshot = await getDocs(studentsQuery);
    
    if (snapshot.empty) {
      console.log('⚠️ No children found for this parent');
      return [];
    }

    const children: ParentChild[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        studentId: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        className: data.className,
        classId: data.classId,
        admissionNumber: data.admissionNumber,
        profilePhoto: data.profilePhoto
      };
    });

    console.log(`✅ Found ${children.length} children`);
    return children;
  } catch (error) {
    console.error('❌ Error fetching parent children:', error);
    throw error;
  }
}

/**
 * Get complete dashboard data for a student
 */
export async function getStudentDashboardData(
  studentId: string,
  term: string,
  session: string
): Promise<StudentDashboardData> {
  try {
    console.log('📊 Fetching dashboard data for student:', studentId);

    // Get student info
    const student = await getStudentById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const studentInfo: ParentChild = {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      classId: student.classId,
      admissionNumber: student.admissionNumber,
      profilePhoto: student.profilePhoto
    };

    // Get attendance data
    const attendanceRecords = await getStudentAttendance(studentId, term, session);
    const present = attendanceRecords.filter(a => a.status === 'present').length;
    const absent = attendanceRecords.filter(a => a.status === 'absent').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;
    const excused = attendanceRecords.filter(a => a.status === 'excused').length;
    const attendancePercentage = attendanceRecords.length > 0 
      ? ((present + late) / attendanceRecords.length) * 100 
      : 0;

    // Get merit data
    const meritRecords = await getStudentMerits(studentId, term, session);
    const positivePoints = meritRecords
      .filter(m => m.points > 0)
      .reduce((sum, m) => sum + m.points, 0);
    const negativePoints = Math.abs(
      meritRecords
        .filter(m => m.points < 0)
        .reduce((sum, m) => sum + m.points, 0)
    );
    const totalPoints = positivePoints - negativePoints;

    // Recent merit awards (last 5)
    const recentAwards: MeritAward[] = meritRecords
      .slice(0, 5)
      .map(m => {
        // Convert Firestore Timestamp to Date
        let awardDate: Date;
        try {
          if (m.date instanceof Date) {
            awardDate = m.date;
          } else if (m.date && typeof m.date === 'object' && 'toDate' in m.date) {
            awardDate = m.date.toDate();
          } else {
            awardDate = new Date(m.date);
          }
        } catch (err) {
          awardDate = new Date();
        }

        return {
          id: m.id,
          date: awardDate,
          points: m.points,
          category: m.category,
          reason: m.reason,
          teacherName: m.teacherName || 'Unknown Teacher'
        };
      });

    // Get academic data
    const allResults = await getStudentResultsRaw(studentId, term, session);
    
    // Group by subject
    const subjectMap = new Map<string, any>();
    
    for (const result of allResults) {
      if (!subjectMap.has(result.subjectId)) {
        subjectMap.set(result.subjectId, {
          subjectId: result.subjectId,
          subjectName: result.subjectName || result.subjectId,
          classwork: { scores: [], average: 0, count: 0 },
          homework: { scores: [], average: 0, count: 0 },
          ca1: null,
          ca2: null,
          exam: null,
          total: 0,
          grade: ''
        });
      }

      const subjectData = subjectMap.get(result.subjectId);

      switch (result.assessmentType) {
        case 'classwork':
          subjectData.classwork.scores.push(result.score);
          break;
        case 'homework':
          subjectData.homework.scores.push(result.score);
          break;
        case 'ca1':
          subjectData.ca1 = Math.max(subjectData.ca1 || 0, result.score);
          break;
        case 'ca2':
          subjectData.ca2 = Math.max(subjectData.ca2 || 0, result.score);
          break;
        case 'exam':
          subjectData.exam = Math.max(subjectData.exam || 0, result.score);
          break;
      }
    }

    // Calculate averages and totals
    const subjects: SubjectPerformance[] = Array.from(subjectMap.values()).map(subject => {
      // Classwork average
      const classworkAvg = subject.classwork.scores.length > 0
        ? subject.classwork.scores.reduce((sum: number, s: number) => sum + s, 0) / subject.classwork.scores.length
        : 0;
      
      // Homework average
      const homeworkAvg = subject.homework.scores.length > 0
        ? subject.homework.scores.reduce((sum: number, s: number) => sum + s, 0) / subject.homework.scores.length
        : 0;

      // Total score (CA1 + CA2 + Exam)
      const total = (subject.ca1 || 0) + (subject.ca2 || 0) + (subject.exam || 0);
      const percentage = total; // Assuming max is 100
      const grade = calculateGrade(percentage);

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        classwork: {
          scores: subject.classwork.scores,
          average: Math.round(classworkAvg * 10) / 10,
          count: subject.classwork.scores.length
        },
        homework: {
          scores: subject.homework.scores,
          average: Math.round(homeworkAvg * 10) / 10,
          count: subject.homework.scores.length
        },
        ca1: subject.ca1,
        ca2: subject.ca2,
        exam: subject.exam,
        total,
        grade
      };
    });

    // Overall academic average
    const totalScores = subjects.map(s => s.total);
    const overallAverage = totalScores.length > 0
      ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length
      : 0;

    const totalAssessments = subjects.reduce(
      (sum, s) => sum + s.classwork.count + s.homework.count + 
                  (s.ca1 !== null ? 1 : 0) + 
                  (s.ca2 !== null ? 1 : 0) + 
                  (s.exam !== null ? 1 : 0),
      0
    );

    // Get fee status
    const feeStatus = await getStudentFeeStatus(studentId, term, session);

    const dashboardData: StudentDashboardData = {
      student: studentInfo,
      attendance: {
        totalDays: attendanceRecords.length,
        present,
        absent,
        late,
        excused,
        percentage: Math.round(attendancePercentage * 10) / 10
      },
      merits: {
        totalPoints,
        positivePoints,
        negativePoints,
        recentAwards
      },
      academics: {
        subjects,
        overallAverage: Math.round(overallAverage * 10) / 10,
        totalAssessments
      },
      fees: feeStatus
    };

    console.log('✅ Dashboard data fetched successfully');
    return dashboardData;
  } catch (error) {
    console.error('❌ Error fetching student dashboard data:', error);
    throw error;
  }
}

/**
 * Get student fee status - FIXED VERSION
 */
export async function getStudentFeeStatus(
  studentId: string,
  term: string,
  session: string
): Promise<FeeStatus> {
  try {
    console.log('💰 Fetching fee status for:', { studentId, term, session });

    // Use the CORRECT function from feeManagement.ts
    const { getStudentFeeStatus: getFeeStatus, getStudentPayments } = await import('./feeManagement');
    
    // Get fee status from the correct collection
    const feeStatusData = await getFeeStatus(studentId, term, session);
    
    // Get payment history
    const payments = await getStudentPayments(studentId, term, session);

    const paymentHistory: FeePayment[] = payments.map(payment => {
      // Convert Firestore Timestamp to Date
      let paymentDate: Date;
      try {
        if (payment.paymentDate instanceof Date) {
          paymentDate = payment.paymentDate;
        } else if (payment.paymentDate && typeof payment.paymentDate === 'object' && 'toDate' in payment.paymentDate) {
          paymentDate = payment.paymentDate.toDate();
        } else if (payment.recordedAt && typeof payment.recordedAt === 'object' && 'toDate' in payment.recordedAt) {
          paymentDate = payment.recordedAt.toDate();
        } else {
          paymentDate = new Date(payment.paymentDate || payment.recordedAt);
        }
      } catch (err) {
        paymentDate = new Date();
      }

      return {
        id: payment.id,
        amount: payment.amountPaid || payment.amount || 0,
        date: paymentDate,
        method: payment.paymentMethod || payment.method || 'Unknown',
        receiptNumber: payment.receiptNumber || '',
        recordedBy: payment.receivedByName || payment.recordedBy || 'System'
      };
    });

    // If fee status exists, use it
    if (feeStatusData) {
      console.log('✅ Using fee status from student_fee_status collection');
      
      return {
        term,
        session,
        totalAmount: feeStatusData.totalFees || 0,
        amountPaid: feeStatusData.amountPaid || 0,
        balance: feeStatusData.balance || 0,
        status: feeStatusData.status as 'paid' | 'partial' | 'unpaid',
        dueDate: feeStatusData.dueDate,
        paymentHistory
      };
    }

    // If no fee status but payments exist, calculate from payments
    if (paymentHistory.length > 0) {
      console.log('⚠️ No fee status document found, calculating from payments');
      
      const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        term,
        session,
        totalAmount: totalPaid,
        amountPaid: totalPaid,
        balance: 0,
        status: 'paid',
        paymentHistory
      };
    }

    // No fee status and no payments
    console.log('ℹ️ No fee status and no payments found - truly unpaid');
    return {
      term,
      session,
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      status: 'unpaid',
      paymentHistory: []
    };
  } catch (error) {
    console.error('❌ Error fetching fee status:', error);
    return {
      term,
      session,
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      status: 'unpaid',
      paymentHistory: []
    };
  }
}

/**
 * Get detailed attendance records for display
 */
export async function getDetailedAttendanceRecords(
  studentId: string,
  term: string,
  session: string
) {
  try {
    const records = await getStudentAttendance(studentId, term, session);
    return records.map(record => {
      // Convert Firestore Timestamp to Date
      let recordDate: Date;
      try {
        if (record.date instanceof Date) {
          recordDate = record.date;
        } else if (record.date && typeof record.date === 'object' && 'toDate' in record.date) {
          recordDate = record.date.toDate();
        } else {
          recordDate = new Date(record.date);
        }
      } catch (err) {
        recordDate = new Date();
      }

      return {
        id: record.id,
        date: recordDate,
        status: record.status,
        className: record.className || 'N/A',
        markedBy: record.markedBy || 'System',
        remarks: record.remarks
      };
    });
  } catch (error) {
    console.error('❌ Error fetching detailed attendance:', error);
    throw error;
  }
}

/**
 * Get detailed merit records for display
 */
export async function getDetailedMeritRecords(
  studentId: string,
  term: string,
  session: string
) {
  try {
    const records = await getStudentMerits(studentId, term, session);
    return records.map(record => {
      // Convert Firestore Timestamp to Date
      let recordDate: Date;
      try {
        if (record.date instanceof Date) {
          recordDate = record.date;
        } else if (record.date && typeof record.date === 'object' && 'toDate' in record.date) {
          recordDate = record.date.toDate();
        } else {
          recordDate = new Date(record.date);
        }
      } catch (err) {
        recordDate = new Date();
      }

      return {
        id: record.id,
        date: recordDate,
        points: record.points,
        category: record.category,
        reason: record.reason,
        teacherName: record.teacherName || 'Unknown Teacher',
        className: record.className || 'N/A'
      };
    });
  } catch (error) {
    console.error('❌ Error fetching detailed merits:', error);
    throw error;
  }
}

/**
 * Get detailed grade records for display
 */
export async function getDetailedGradeRecords(
  studentId: string,
  term: string,
  session: string
) {
  try {
    const records = await getStudentResultsRaw(studentId, term, session);
    return records.map(record => {
      // Convert Firestore Timestamp to Date
      let recordDate: Date;
      try {
        if (record.dateRecorded instanceof Date) {
          recordDate = record.dateRecorded;
        } else if (record.dateRecorded && typeof record.dateRecorded === 'object' && 'toDate' in record.dateRecorded) {
          recordDate = record.dateRecorded.toDate();
        } else {
          recordDate = new Date(record.dateRecorded);
        }
      } catch (err) {
        recordDate = new Date();
      }

      return {
        id: record.id,
        date: recordDate,
        subjectName: record.subjectName || record.subjectId,
        assessmentType: record.assessmentType,
        score: record.score,
        maxScore: record.maxScore,
        percentage: record.maxScore > 0 ? (record.score / record.maxScore) * 100 : 0,
        teacherName: record.teacherName || 'Unknown Teacher'
      };
    });
  } catch (error) {
    console.error('❌ Error fetching detailed grades:', error);
    throw error;
  }
}