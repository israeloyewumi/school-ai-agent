// ============================================
// FILE: functions/src/lib/firebase/adminReports.ts - ADMIN SDK VERSION
// ============================================

import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

// Import from other Admin SDK files
import {
  getStudentById,
  getStudentsByClass
} from './studentManagement';
import {
  getStudentAttendance,
  getStudentMerits,
  getStudentResultsRaw
} from './db';
import { getSubjectById } from './subjectManagement';

// ============================================
// INTERFACES - CA REPORT
// ============================================
export interface CAReportCard {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  term: string;
  session: string;
  assessmentType: 'ca1' | 'ca2';
  subjects: {
    subjectId: string;
    subjectName: string;
    score: number;
    maxScore: number;
    grade: string;
    remark: string;
  }[];
  totalScore: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  grade: string;
  attendancePercentage: number;
  totalMerits: number;
  teacherComment?: string;
  principalComment?: string;
  generatedAt: Date;
  generatedBy: string;
  sentToParent: boolean;
  sentAt?: Date;
  pdfUrl?: string;
}

// ============================================
// INTERFACES - TERM REPORT
// ============================================
export interface EndOfTermReportCard {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  term: string;
  session: string;
  subjects: {
    subjectId: string;
    subjectName: string;
    ca1: number;
    ca2: number;
    exam: number;
    total: number;
    average: number;
    grade: string;
    remark: string;
    position?: number;
  }[];
  totalScore: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  overallGrade: string;
  attendancePercentage: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalSchoolDays: number;
  totalMerits: number;
  meritLevel: string;
  teacherComment?: string;
  principalComment?: string;
  nextTermBegins?: Date;
  promoted: boolean;
  nextClass?: string;
  generatedAt: Date;
  generatedBy: string;
  sentToParent: boolean;
  sentAt?: Date;
  pdfUrl?: string;
}

// ============================================
// INTERFACES - WEEKLY REPORT
// ============================================
export interface WeeklyReportCard {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  term: string;
  session: string;
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    percentage: number;
    dailyRecords: {
      date: Date;
      status: 'present' | 'absent';
    }[];
  };
  
  academics: {
    subjectId: string;
    subjectName: string;
    classworkScores: number[];
    classworkAverage: number;
    classworkCount: number;
    homeworkScores: number[];
    homeworkAverage: number;
    homeworkCount: number;
    teacherComment?: string;
  }[];
  
  overallClassworkAverage: number;
  totalClassworkCount: number;
  overallHomeworkAverage: number;
  totalHomeworkCount: number;

  behavior: {
    totalMerits: number;
    totalDemerits: number;
    netPoints: number;
    meritRecords: {
      date: Date;
      category: string;
      points: number;
      reason: string;
    }[];
  };
  
  teacherObservation?: string;
  strengths: string[];
  areasForImprovement: string[];
  
  academicTrack?: string | null;
  tradeSubject?: string | null;
  totalSubjects?: number;
  
  generatedAt: Date;
  generatedBy: string;
  sentToParent: boolean;
  sentAt?: Date;
  pdfUrl?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateGrade(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
}

function getGradeRemark(grade: string): string {
  const remarks: Record<string, string> = {
    'A': 'Excellent', 'B': 'Very Good', 'C': 'Good',
    'D': 'Pass', 'E': 'Weak Pass', 'F': 'Fail'
  };
  return remarks[grade] || 'N/A';
}

function getMeritLevel(points: number): string {
  if (points >= 501) return 'Diamond';
  if (points >= 301) return 'Platinum';
  if (points >= 151) return 'Gold';
  if (points >= 51) return 'Silver';
  return 'Bronze';
}

async function getSubjectName(subjectId: string): Promise<string> {
  try {
    const subject = await getSubjectById(subjectId);
    if (subject && subject.subjectName) {
      return subject.subjectName;
    }
    console.warn(`⚠️ Subject not found: ${subjectId}`);
    return subjectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch (error) {
    console.error(`❌ Error fetching subject ${subjectId}:`, error);
    return subjectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function extractScore(result: any, assessmentType: 'ca1' | 'ca2' | 'exam'): number {
  console.log('🔍 Extracting score from result:', {
    subjectId: result.subjectId,
    assessmentType: result.assessmentType,
    score: result.score,
    ca1: result.ca1,
    ca2: result.ca2,
    exam: result.exam
  });

  if (result.assessmentType === assessmentType) {
    console.log(`✅ Found ${assessmentType} score:`, result.score);
    return result.score || 0;
  }

  if (result[assessmentType] !== undefined && result[assessmentType] !== null) {
    console.log(`✅ Found ${assessmentType} in old structure:`, result[assessmentType]);
    return result[assessmentType];
  }

  console.log(`⚠️ No ${assessmentType} score found, returning 0`);
  return 0;
}

export function getWeekNumberInTerm(date: Date, termStartDate: Date): number {
  const diffTime = Math.abs(date.getTime() - termStartDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

export function getWeekDateRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

// ============================================
// CA REPORT GENERATION
// ============================================
export async function generateCAReportCard(
  studentId: string,
  term: string,
  session: string,
  assessmentType: 'ca1' | 'ca2',
  generatedBy: string
): Promise<CAReportCard> {
  try {
    console.log('📋 ===== CA REPORT GENERATION START =====');
    console.log('Student:', studentId, '| Term:', term, '| Session:', session, '| Type:', assessmentType);

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    
    console.log('✅ Student:', `${student.firstName} ${student.lastName}`);
    console.log('📚 Enrolled subjects:', student.subjects?.length || 0);

    const allResults = await getStudentResultsRaw(studentId, term, session);
    console.log('📊 Total results found:', allResults.length);

    if (allResults.length === 0) {
      console.warn('⚠️ NO RESULTS FOUND!');
      throw new Error('No results found for this student in this term/session');
    }

    const subjectScores = new Map<string, number>();
    
    for (const result of allResults) {
      const score = extractScore(result, assessmentType);
      
      if (subjectScores.has(result.subjectId)) {
        const existingScore = subjectScores.get(result.subjectId)!;
        subjectScores.set(result.subjectId, Math.max(existingScore, score));
      } else {
        subjectScores.set(result.subjectId, score);
      }
    }

    console.log('📊 Subject scores extracted:', Object.fromEntries(subjectScores));

    const subjects = await Promise.all(
      Array.from(subjectScores.entries()).map(async ([subjectId, score]) => {
        const maxScore = 20;
        const grade = calculateGrade(score, maxScore);
        const remark = getGradeRemark(grade);
        const subjectName = await getSubjectName(subjectId);
        
        console.log(`  ✓ ${subjectName}: ${score}/${maxScore} (${grade})`);

        return {
          subjectId,
          subjectName,
          score,
          maxScore,
          grade,
          remark
        };
      })
    );

    console.log('✅ Processed', subjects.length, 'subjects');

    const totalScore = subjects.reduce((sum, s) => sum + s.score, 0);
    const averageScore = subjects.length > 0 ? totalScore / subjects.length : 0;
    const overallGrade = calculateGrade(averageScore, 20);

    const classStudents = await getStudentsByClass(student.classId);
    const classAverages = await Promise.all(
      classStudents.map(async (s) => {
        const sResults = await getStudentResultsRaw(s.id, term, session);
        const sScores = sResults.map(r => extractScore(r, assessmentType));
        const sAvg = sScores.length > 0 ? sScores.reduce((sum, sc) => sum + sc, 0) / sScores.length : 0;
        return { studentId: s.id, average: sAvg };
      })
    );
    classAverages.sort((a, b) => b.average - a.average);
    const position = classAverages.findIndex(ca => ca.studentId === studentId) + 1;

    const attendance = await getStudentAttendance(studentId, term, session);
    const present = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = attendance.length > 0 ? (present / attendance.length) * 100 : 0;
    
    const merits = await getStudentMerits(studentId, term, session);
    const totalMerits = merits.reduce((sum, m) => sum + m.points, 0);

    console.log('📈 Total:', totalScore, '| Avg:', averageScore.toFixed(1), '| Grade:', overallGrade);
    console.log('🏆 Position:', position, '/', classStudents.length);
    console.log('✅ ===== CA REPORT GENERATION COMPLETE =====');

    const reportCard: CAReportCard = {
      id: `${assessmentType}_${studentId}_${term}_${session}`.replace(/\//g, '_'),
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      term,
      session,
      assessmentType,
      subjects,
      totalScore,
      averageScore,
      position,
      totalStudents: classStudents.length,
      grade: overallGrade,
      attendancePercentage,
      totalMerits,
      generatedAt: new Date(),
      generatedBy,
      sentToParent: false
    };

    // Save to Firestore using Admin SDK
    await db.collection('caReportCards').doc(reportCard.id).set({
      ...reportCard,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return reportCard;
  } catch (error) {
    console.error('❌ CA REPORT ERROR:', error);
    throw error;
  }
}

// ============================================
// TERM REPORT GENERATION
// ============================================
export async function generateEndOfTermReportCard(
  studentId: string,
  term: string,
  session: string,
  generatedBy: string,
  teacherComment?: string,
  principalComment?: string,
  nextTermBegins?: Date
): Promise<EndOfTermReportCard> {
  try {
    console.log('📘 ===== TERM REPORT GENERATION START =====');

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const allResults = await getStudentResultsRaw(studentId, term, session);
    console.log('📊 Total results found:', allResults.length);

    const subjectData = new Map<string, { ca1: number; ca2: number; exam: number }>();
    
    for (const result of allResults) {
      if (!subjectData.has(result.subjectId)) {
        subjectData.set(result.subjectId, { ca1: 0, ca2: 0, exam: 0 });
      }
      
      const data = subjectData.get(result.subjectId)!;
      
      const ca1Score = extractScore(result, 'ca1');
      const ca2Score = extractScore(result, 'ca2');
      const examScore = extractScore(result, 'exam');
      
      data.ca1 = Math.max(data.ca1, ca1Score);
      data.ca2 = Math.max(data.ca2, ca2Score);
      data.exam = Math.max(data.exam, examScore);
    }

    const subjects = await Promise.all(
      Array.from(subjectData.entries()).map(async ([subjectId, scores]) => {
        const ca1 = scores.ca1;
        const ca2 = scores.ca2;
        const exam = scores.exam;
        const total = ca1 + ca2 + exam;
        const grade = calculateGrade(total, 100);
        const remark = getGradeRemark(grade);
        const subjectName = await getSubjectName(subjectId);
        
        console.log(`  ✓ ${subjectName}: CA1=${ca1} CA2=${ca2} Exam=${exam} Total=${total} (${grade})`);

        return {
          subjectId,
          subjectName,
          ca1,
          ca2,
          exam,
          total,
          average: total,
          grade,
          remark
        };
      })
    );

    const totalScore = subjects.reduce((sum, s) => sum + s.total, 0);
    const averageScore = subjects.length > 0 ? totalScore / subjects.length : 0;
    const overallGrade = calculateGrade(averageScore, 100);

    const classStudents = await getStudentsByClass(student.classId);
    const classAverages = await Promise.all(
      classStudents.map(async (s) => {
        const sResults = await getStudentResultsRaw(s.id, term, session);
        const sSubjects = new Map<string, { ca1: number; ca2: number; exam: number }>();
        
        for (const r of sResults) {
          if (!sSubjects.has(r.subjectId)) {
            sSubjects.set(r.subjectId, { ca1: 0, ca2: 0, exam: 0 });
          }
          const data = sSubjects.get(r.subjectId)!;
          data.ca1 = Math.max(data.ca1, extractScore(r, 'ca1'));
          data.ca2 = Math.max(data.ca2, extractScore(r, 'ca2'));
          data.exam = Math.max(data.exam, extractScore(r, 'exam'));
        }
        
        const totals = Array.from(sSubjects.values()).map(d => d.ca1 + d.ca2 + d.exam);
        const sAvg = totals.length > 0 ? totals.reduce((sum, t) => sum + t, 0) / totals.length : 0;
        return { studentId: s.id, average: sAvg };
      })
    );
    classAverages.sort((a, b) => b.average - a.average);
    const position = classAverages.findIndex(ca => ca.studentId === studentId) + 1;

    const attendance = await getStudentAttendance(studentId, term, session);
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const attendancePercentage = attendance.length > 0 ? (present / attendance.length) * 100 : 0;

    const merits = await getStudentMerits(studentId, term, session);
    const totalMerits = merits.reduce((sum, m) => sum + m.points, 0);
    const meritLevel = getMeritLevel(totalMerits);

    const promoted = averageScore >= 40;

    console.log('✅ ===== TERM REPORT GENERATION COMPLETE =====');

    const reportCard: EndOfTermReportCard = {
      id: `term_${studentId}_${term}_${session}`.replace(/\//g, '_'),
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      term,
      session,
      subjects,
      totalScore,
      averageScore,
      position,
      totalStudents: classStudents.length,
      overallGrade,
      attendancePercentage,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      totalSchoolDays: attendance.length,
      totalMerits,
      meritLevel,
      teacherComment,
      principalComment,
      nextTermBegins,
      promoted,
      generatedAt: new Date(),
      generatedBy,
      sentToParent: false
    };

    // Save to Firestore using Admin SDK
    await db.collection('termReportCards').doc(reportCard.id).set({
      ...reportCard,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      nextTermBegins: nextTermBegins ? admin.firestore.Timestamp.fromDate(nextTermBegins) : null
    });
    
    return reportCard;
  } catch (error) {
    console.error('❌ TERM REPORT ERROR:', error);
    throw error;
  }
}

// ============================================
// WEEKLY REPORT GENERATION
// ============================================
export async function generateWeeklyReportCard(
  studentId: string,
  weekStart: Date,
  weekEnd: Date,
  term: string,
  session: string,
  generatedBy: string,
  teacherObservation?: string
): Promise<WeeklyReportCard> {
  try {
    console.log('📅 ===== WEEKLY REPORT GENERATION START =====');
    console.log('Student:', studentId);
    console.log('Week:', weekStart.toLocaleDateString(), 'to', weekEnd.toLocaleDateString());
    console.log('Term:', term, '| Session:', session);

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    
    console.log('✅ Student:', `${student.firstName} ${student.lastName}`);
    console.log('📚 Class:', student.className);

    // Get attendance for the week
    const allAttendance = await getStudentAttendance(studentId, term, session);
    console.log('📋 ATTENDANCE DEBUG - Total records:', allAttendance.length);
    
    const weekAttendance = allAttendance.filter(a => {
      if (!a.date) return false;
      
      let attDate: Date;
      try {
        if (typeof a.date === 'object' && 'toDate' in a.date) {
          attDate = (a.date as any).toDate();
        } else if (a.date instanceof Date) {
          attDate = a.date;
        } else {
          attDate = new Date(a.date as any);
        }
      } catch (err) {
        return false;
      }
      
      return attDate >= weekStart && attDate <= weekEnd;
    });
    
    console.log('📋 ATTENDANCE DEBUG - Filtered:', weekAttendance.length);
    
    const presentCount = weekAttendance.filter(a => a.status === 'present').length;
    const absentCount = weekAttendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = weekAttendance.length > 0 
      ? (presentCount / weekAttendance.length) * 100 
      : 0;

    // Get classwork and homework for the week
    const allResults = await getStudentResultsRaw(studentId, term, session);
    
    const weekClasswork = allResults.filter(result => {
      if (result.assessmentType !== 'classwork') return false;
      
      const resultDate = result.dateRecorded?.toDate?.() || result.dateRecorded;
      if (!resultDate) return false;
      
      const date = resultDate instanceof Date ? resultDate : new Date(resultDate);
      return date >= weekStart && date <= weekEnd;
    });

    const weekHomework = allResults.filter(result => {
      if (result.assessmentType !== 'homework') return false;
      
      const resultDate = result.dateRecorded?.toDate?.() || result.dateRecorded;
      if (!resultDate) return false;
      
      const date = resultDate instanceof Date ? resultDate : new Date(resultDate);
      return date >= weekStart && date <= weekEnd;
    });

    console.log('📝 Classwork records this week:', weekClasswork.length);
    console.log('📚 Homework records this week:', weekHomework.length);

    // Group by subject
    const subjectClasswork = new Map<string, number[]>();
    const subjectHomework = new Map<string, number[]>();
    
    for (const work of weekClasswork) {
      if (!subjectClasswork.has(work.subjectId)) {
        subjectClasswork.set(work.subjectId, []);
      }
      subjectClasswork.get(work.subjectId)!.push(work.score || 0);
    }

    for (const work of weekHomework) {
      if (!subjectHomework.has(work.subjectId)) {
        subjectHomework.set(work.subjectId, []);
      }
      subjectHomework.get(work.subjectId)!.push(work.score || 0);
    }

    const allSubjects = new Set([
      ...subjectClasswork.keys(),
      ...subjectHomework.keys()
    ]);

    const academics = await Promise.all(
      Array.from(allSubjects).map(async (subjectId) => {
        const subjectName = await getSubjectName(subjectId);
        
        const classworkScores = subjectClasswork.get(subjectId) || [];
        const classworkAverage = classworkScores.length > 0 
          ? classworkScores.reduce((sum, s) => sum + s, 0) / classworkScores.length 
          : 0;
        
        const homeworkScores = subjectHomework.get(subjectId) || [];
        const homeworkAverage = homeworkScores.length > 0 
          ? homeworkScores.reduce((sum, s) => sum + s, 0) / homeworkScores.length 
          : 0;

        return {
          subjectId,
          subjectName,
          classworkScores,
          classworkAverage,
          classworkCount: classworkScores.length,
          homeworkScores,
          homeworkAverage,
          homeworkCount: homeworkScores.length
        };
      })
    );

    const overallClassworkAverage = academics.length > 0
      ? academics.reduce((sum, a) => sum + a.classworkAverage, 0) / academics.length
      : 0;

    const totalClassworkCount = academics.reduce((sum, a) => sum + a.classworkCount, 0);

    const overallHomeworkAverage = academics.length > 0
      ? academics.reduce((sum, a) => sum + a.homeworkAverage, 0) / academics.length
      : 0;

    const totalHomeworkCount = academics.reduce((sum, a) => sum + a.homeworkCount, 0);

    // Get merit/demerit points
    const allMerits = await getStudentMerits(studentId, term, session);
    
    const weekMerits = allMerits.filter(m => {
      if (!m.date) return false;
      
      let meritDate: Date;
      try {
        if (typeof m.date === 'object' && 'toDate' in m.date) {
          meritDate = (m.date as any).toDate();
        } else if (m.date instanceof Date) {
          meritDate = m.date;
        } else {
          meritDate = new Date(m.date as any);
        }
      } catch (err) {
        return false;
      }
      
      return meritDate >= weekStart && meritDate <= weekEnd;
    });

    const meritRecords = weekMerits.map(m => {
      let recordDate: Date;
      
      try {
        if (m.date instanceof Date) {
          recordDate = m.date;
        } else if (m.date && typeof m.date === 'object' && 'toDate' in m.date) {
          recordDate = (m.date as any).toDate();
        } else {
          recordDate = new Date(m.date as any);
        }
        
        if (isNaN(recordDate.getTime())) {
          recordDate = new Date();
        }
      } catch (err) {
        recordDate = new Date();
      }
      
      return {
        date: recordDate,
        category: m.category,
        points: m.points,
        reason: m.reason
      };
    });

    const totalMerits = weekMerits.filter(m => m.points > 0).reduce((sum, m) => sum + m.points, 0);
    const totalDemerits = Math.abs(weekMerits.filter(m => m.points < 0).reduce((sum, m) => sum + m.points, 0));
    const netPoints = totalMerits - totalDemerits;

    // Analyze strengths and improvements
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    if (attendancePercentage >= 90) {
      strengths.push('Excellent attendance record');
    } else if (attendancePercentage < 70) {
      areasForImprovement.push('Improve attendance consistency');
    }

    if (overallClassworkAverage >= 7) {
      strengths.push('Strong academic performance in classwork');
    } else if (overallClassworkAverage < 5) {
      areasForImprovement.push('Focus on improving classwork scores');
    }

    if (overallHomeworkAverage >= 7) {
      strengths.push('Excellent homework completion and performance');
    } else if (overallHomeworkAverage < 5 && totalHomeworkCount > 0) {
      areasForImprovement.push('Improve homework quality and understanding');
    }

    if (netPoints > 0) {
      strengths.push('Positive behavior and good conduct');
    } else if (netPoints < 0) {
      areasForImprovement.push('Work on behavior and classroom conduct');
    }

    const termStartDate = new Date(weekStart);
    termStartDate.setMonth(term === 'First Term' ? 8 : term === 'Second Term' ? 0 : 4);
    const weekNumber = getWeekNumberInTerm(weekStart, termStartDate);

    const reportCard: WeeklyReportCard = {
      id: `weekly_${studentId}_${weekStart.getTime()}_${weekEnd.getTime()}`.replace(/\//g, '_'),
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      term,
      session,
      weekStart,
      weekEnd,
      weekNumber,
      
      attendance: {
        totalDays: weekAttendance.length,
        present: presentCount,
        absent: absentCount,
        percentage: attendancePercentage,
         // @ts-ignore
        dailyRecords: weekAttendance.map(a => {
          let attDate: Date;
          
          try {
            if (a.date instanceof Date) {
              attDate = a.date;
            } else if (a.date && typeof a.date === 'object' && 'toDate' in a.date) {
              attDate = (a.date as any).toDate();
            } else {
              attDate = new Date(a.date as any);
            }
            
            if (isNaN(attDate.getTime())) {
              attDate = new Date();
            }
          } catch (err) {
            attDate = new Date();
          }
          
          return {
            date: attDate,
            status: a.status
          };
        })
      },
      
      academics,
      overallClassworkAverage,
      totalClassworkCount,
      overallHomeworkAverage,
      totalHomeworkCount,
      
      behavior: {
        totalMerits,
        totalDemerits,
        netPoints,
        meritRecords
      },
      
      teacherObservation,
      strengths,
      areasForImprovement,
      
      academicTrack: student.academicTrack || null,
      tradeSubject: student.tradeSubject ? await getSubjectName(student.tradeSubject) : null,
      totalSubjects: student.subjects?.length || 0,
      
      generatedAt: new Date(),
      generatedBy,
      sentToParent: false
    };

    console.log('✅ ===== WEEKLY REPORT GENERATION COMPLETE =====');

    // Save to Firestore using Admin SDK
    const firestoreData: any = {
      ...reportCard,
      weekStart: admin.firestore.Timestamp.fromDate(weekStart),
      weekEnd: admin.firestore.Timestamp.fromDate(weekEnd),
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Remove undefined fields
    if (firestoreData.teacherObservation === undefined) {
      delete firestoreData.teacherObservation;
    }
    if (firestoreData.academicTrack === undefined || firestoreData.academicTrack === null) {
      delete firestoreData.academicTrack;
    }
    if (firestoreData.tradeSubject === undefined || firestoreData.tradeSubject === null) {
      delete firestoreData.tradeSubject;
    }
    if (firestoreData.totalSubjects === undefined) {
      delete firestoreData.totalSubjects;
    }

    await db.collection('weeklyReportCards').doc(reportCard.id).set(firestoreData);

    return reportCard;
  } catch (error) {
    console.error('❌ WEEKLY REPORT ERROR:', error);
    throw error;
  }
}

// ============================================
// BULK GENERATION FUNCTIONS
// ============================================

export async function generateBulkCAReports(
  classId: string,
  term: string,
  session: string,
  assessmentType: 'ca1' | 'ca2',
  generatedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const students = await getStudentsByClass(classId);
  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      await generateCAReportCard(student.id, term, session, assessmentType, generatedBy);
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`${student.firstName} ${student.lastName}: ${error.message}`);
    }
  }
  return { success, failed, errors };
}

export async function generateBulkTermReports(
  classId: string,
  term: string,
  session: string,
  generatedBy: string,
  nextTermBegins?: Date
): Promise<{ success: number; failed: number; errors: string[] }> {
  const students = await getStudentsByClass(classId);
  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      await generateEndOfTermReportCard(student.id, term, session, generatedBy, undefined, undefined, nextTermBegins);
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`${student.firstName} ${student.lastName}: ${error.message}`);
    }
  }
  return { success, failed, errors };
}

export async function generateBulkWeeklyReports(
  classId: string,
  weekStart: Date,
  weekEnd: Date,
  term: string,
  session: string,
  generatedBy: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const students = await getStudentsByClass(classId);
  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const student of students) {
    try {
      await generateWeeklyReportCard(student.id, weekStart, weekEnd, term, session, generatedBy);
      success++;
    } catch (error: any) {
      failed++;
      errors.push(`${student.firstName} ${student.lastName}: ${error.message}`);
    }
  }
  
  return { success, failed, errors };
}

// ============================================
// RETRIEVE FUNCTIONS
// ============================================

export async function getCAReportCard(
  studentId: string,
  term: string,
  session: string,
  assessmentType: 'ca1' | 'ca2'
): Promise<CAReportCard | null> {
  const id = `${assessmentType}_${studentId}_${term}_${session}`.replace(/\//g, '_');
  const docSnap = await db.collection('caReportCards').doc(id).get();
  return docSnap.exists ? (docSnap.data() as CAReportCard) : null;
}

export async function getTermReportCard(
  studentId: string,
  term: string,
  session: string
): Promise<EndOfTermReportCard | null> {
  const id = `term_${studentId}_${term}_${session}`.replace(/\//g, '_');
  const docSnap = await db.collection('termReportCards').doc(id).get();
  return docSnap.exists ? (docSnap.data() as EndOfTermReportCard) : null;
}

export async function getWeeklyReportCard(
  studentId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportCard | null> {
  const id = `weekly_${studentId}_${weekStart.getTime()}_${weekEnd.getTime()}`.replace(/\//g, '_');
  const docSnap = await db.collection('weeklyReportCards').doc(id).get();
  
  if (!docSnap.exists) return null;
  
  const data = docSnap.data();
  return {
    ...data,
    weekStart: data.weekStart.toDate(),
    weekEnd: data.weekEnd.toDate(),
    generatedAt: data.generatedAt.toDate()
  } as WeeklyReportCard;
}

export async function generateWeeklySummary(): Promise<any> {
  throw new Error('Weekly summary deprecated. Use generateWeeklyReportCard instead');
}