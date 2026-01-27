// ============================================
// FILE: lib/firebase/adminReports.ts - COMPLETE WITH WEEKLY REPORTS
// ============================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
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
import type { Student } from '@/types/database';

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
// INTERFACES - WEEKLY REPORT (NEW!)
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
  
  // Attendance Summary (Present/Absent only)
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
  
// Classwork and Homework
academics: {
  subjectId: string;
  subjectName: string;
  classworkScores: number[];
  classworkAverage: number;
  classworkCount: number;
  homeworkScores: number[];      // NEW
  homeworkAverage: number;       // NEW
  homeworkCount: number;         // NEW
  teacherComment?: string;
}[];
  
// Overall Academic Summary
overallClassworkAverage: number;
totalClassworkCount: number;
overallHomeworkAverage: number;    // NEW
totalHomeworkCount: number;        // NEW

  // Behavior & Merit Points
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
  
  // Teacher's Weekly Observation
  teacherObservation?: string;
  
  // Strengths & Areas for Improvement
  strengths: string[];
  areasForImprovement: string[];
  
  // Curriculum Info (for SS students)
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
    console.warn(`âš ï¸ Subject not found: ${subjectId}`);
    return subjectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } catch (error) {
    console.error(`âŒ Error fetching subject ${subjectId}:`, error);
    return subjectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function extractScore(result: any, assessmentType: 'ca1' | 'ca2' | 'exam'): number {
  console.log('ðŸ” Extracting score from result:', {
    subjectId: result.subjectId,
    assessmentType: result.assessmentType,
    score: result.score,
    ca1: result.ca1,
    ca2: result.ca2,
    exam: result.exam
  });

  // NEW STRUCTURE: Check if result.assessmentType matches
  if (result.assessmentType === assessmentType) {
    console.log(`âœ… Found ${assessmentType} score:`, result.score);
    return result.score || 0;
  }

  // OLD STRUCTURE: Check if result has ca1/ca2/exam fields directly
  if (result[assessmentType] !== undefined && result[assessmentType] !== null) {
    console.log(`âœ… Found ${assessmentType} in old structure:`, result[assessmentType]);
    return result[assessmentType];
  }

  console.log(`âš ï¸ No ${assessmentType} score found, returning 0`);
  return 0;
}

// NEW: Weekly report helper functions
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
    console.log('ðŸ“‹ ===== CA REPORT GENERATION START =====');
    console.log('Student:', studentId, '| Term:', term, '| Session:', session, '| Type:', assessmentType);

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    
    console.log('âœ… Student:', `${student.firstName} ${student.lastName}`);
    console.log('ðŸ“š Enrolled subjects:', student.subjects?.length || 0);

    const allResults = await getStudentResultsRaw(studentId, term, session);
    console.log('ðŸ“Š Total results found:', allResults.length);

    if (allResults.length === 0) {
      console.warn('âš ï¸ NO RESULTS FOUND!');
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

    console.log('ðŸ“Š Subject scores extracted:', Object.fromEntries(subjectScores));

    const subjects = await Promise.all(
      Array.from(subjectScores.entries()).map(async ([subjectId, score]) => {
        const maxScore = 20;
        const grade = calculateGrade(score, maxScore);
        const remark = getGradeRemark(grade);
        const subjectName = await getSubjectName(subjectId);
        
        console.log(`  âœ“ ${subjectName}: ${score}/${maxScore} (${grade})`);

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

    console.log('âœ… Processed', subjects.length, 'subjects');

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

    console.log('ðŸ“ˆ Total:', totalScore, '| Avg:', averageScore.toFixed(1), '| Grade:', overallGrade);
    console.log('ðŸ† Position:', position, '/', classStudents.length);
    console.log('âœ… ===== CA REPORT GENERATION COMPLETE =====');

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

    await setDoc(doc(db, 'caReportCards', reportCard.id), reportCard);
    return reportCard;
  } catch (error) {
    console.error('âŒ CA REPORT ERROR:', error);
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
    console.log('ðŸ“˜ ===== TERM REPORT GENERATION START =====');

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const allResults = await getStudentResultsRaw(studentId, term, session);
    console.log('ðŸ“Š Total results found:', allResults.length);

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
        
        console.log(`  âœ“ ${subjectName}: CA1=${ca1} CA2=${ca2} Exam=${exam} Total=${total} (${grade})`);

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

    console.log('âœ… ===== TERM REPORT GENERATION COMPLETE =====');

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

    await setDoc(doc(db, 'termReportCards', reportCard.id), reportCard);
    return reportCard;
  } catch (error) {
    console.error('âŒ TERM REPORT ERROR:', error);
    throw error;
  }
}

// ============================================
// WEEKLY REPORT GENERATION (NEW!)
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
    console.log('ðŸ“… ===== WEEKLY REPORT GENERATION START =====');
    console.log('Student:', studentId);
    console.log('Week:', weekStart.toLocaleDateString(), 'to', weekEnd.toLocaleDateString());
    console.log('Term:', term, '| Session:', session);

    const student = await getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    
    console.log('âœ… Student:', `${student.firstName} ${student.lastName}`);
    console.log('ðŸ“š Class:', student.className);

// Get attendance for the week
    const allAttendance = await getStudentAttendance(studentId, term, session);
    console.log('ðŸ“‹ ATTENDANCE DEBUG - Total records:', allAttendance.length);
    console.log('ðŸ“‹ ATTENDANCE DEBUG - Sample record:', allAttendance[0]);
    console.log('ðŸ“‹ ATTENDANCE DEBUG - Week range:', {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString()
    });
    
    const weekAttendance = allAttendance.filter(a => {
      if (!a.date) {
        console.log('  âš ï¸ Attendance record missing date!');
        return false;
      }
      
      // Handle Firestore Timestamp
      let attDate: Date;
      try {
        if (typeof a.date === 'object' && 'toDate' in a.date) {
          attDate = a.date.toDate();
        } else if (a.date instanceof Date) {
          attDate = a.date;
        } else {
          attDate = new Date(a.date);
        }
      } catch (err) {
        console.log('  âš ï¸ Could not convert date:', a.date);
        return false;
      }
      
      console.log('  ðŸ“‹ Checking attendance - Raw date:', a.date);
      console.log('     Converted to:', attDate.toISOString());
      console.log('     In week?', attDate >= weekStart && attDate <= weekEnd);
      
      return attDate >= weekStart && attDate <= weekEnd;
    });
    
    console.log('ðŸ“‹ ATTENDANCE DEBUG - Filtered:', weekAttendance.length);
    
    // Calculate attendance stats
    const presentCount = weekAttendance.filter(a => a.status === 'present').length;
    const absentCount = weekAttendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = weekAttendance.length > 0 
      ? (presentCount / weekAttendance.length) * 100 
      : 0;

    console.log('ðŸ“‹ Attendance:', {
      total: weekAttendance.length,
      present: presentCount,
      absent: absentCount,
      percentage: attendancePercentage.toFixed(1)
    });

    // Get classwork for the week
    const allResults = await getStudentResultsRaw(studentId, term, session);
    
    const weekClasswork = allResults.filter(result => {
      if (result.assessmentType !== 'classwork') return false;
      
      const resultDate = result.dateRecorded?.toDate?.() || result.dateRecorded;
      if (!resultDate) return false;
      
      const date = resultDate instanceof Date ? resultDate : new Date(resultDate);
      return date >= weekStart && date <= weekEnd;
    });

    console.log('ðŸ“ Classwork records this week:', weekClasswork.length);

    // Get homework for the week (NEW)
const weekHomework = allResults.filter(result => {
  if (result.assessmentType !== 'homework') return false;
  
  const resultDate = result.dateRecorded?.toDate?.() || result.dateRecorded;
  if (!resultDate) return false;
  
  const date = resultDate instanceof Date ? resultDate : new Date(resultDate);
  return date >= weekStart && date <= weekEnd;
});

console.log('ðŸ“š Homework records this week:', weekHomework.length);

    // Group classwork by subject
    const subjectClasswork = new Map<string, number[]>();
    
    for (const work of weekClasswork) {
      if (!subjectClasswork.has(work.subjectId)) {
        subjectClasswork.set(work.subjectId, []);
      }
      subjectClasswork.get(work.subjectId)!.push(work.score || 0);
    }

    // Group homework by subject (NEW)
const subjectHomework = new Map<string, number[]>();

for (const work of weekHomework) {
  if (!subjectHomework.has(work.subjectId)) {
    subjectHomework.set(work.subjectId, []);
  }
  subjectHomework.get(work.subjectId)!.push(work.score || 0);
}

// Build academics array with both classwork and homework (UPDATED)
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
    
    console.log(`  âœ” ${subjectName}:`, {
      classworkCount: classworkScores.length,
      classworkAvg: classworkAverage.toFixed(1),
      homeworkCount: homeworkScores.length,
      homeworkAvg: homeworkAverage.toFixed(1)
    });

    return {
      subjectId,
      subjectName,
      classworkScores,
      classworkAverage,
      classworkCount: classworkScores.length,
      homeworkScores,        // NEW
      homeworkAverage,       // NEW
      homeworkCount: homeworkScores.length  // NEW
    };
  })
);

// Calculate overall academic summary (UPDATED)
const overallClassworkAverage = academics.length > 0
  ? academics.reduce((sum, a) => sum + a.classworkAverage, 0) / academics.length
  : 0;

const totalClassworkCount = academics.reduce((sum, a) => sum + a.classworkCount, 0);

const overallHomeworkAverage = academics.length > 0
  ? academics.reduce((sum, a) => sum + a.homeworkAverage, 0) / academics.length
  : 0;

const totalHomeworkCount = academics.reduce((sum, a) => sum + a.homeworkCount, 0);

console.log('ðŸ“Š Overall academics:', {
  classworkAverage: overallClassworkAverage.toFixed(1),
  totalClasswork: totalClassworkCount,
  homeworkAverage: overallHomeworkAverage.toFixed(1),
  totalHomework: totalHomeworkCount
});

// Get merit/demerit points for the week
    const allMerits = await getStudentMerits(studentId, term, session);
    console.log('â­ MERITS DEBUG - Total records:', allMerits.length);
    console.log('â­ MERITS DEBUG - Sample record:', allMerits[0]);
    
    const weekMerits = allMerits.filter(m => {
      if (!m.date) {
        console.log('  âš ï¸ Merit record missing date!');
        return false;
      }
      
      let meritDate: Date;
      try {
        if (typeof m.date === 'object' && 'toDate' in m.date) {
          meritDate = m.date.toDate();
        } else if (m.date instanceof Date) {
          meritDate = m.date;
        } else {
          meritDate = new Date(m.date);
        }
      } catch (err) {
        console.log('  âš ï¸ Could not convert merit date:', m.date);
        return false;
      }
      
      console.log('  â­ Checking merit - Raw date:', m.date);
      console.log('     Converted to:', meritDate.toISOString());
      console.log('     Points:', m.points);
      console.log('     In week?', meritDate >= weekStart && meritDate <= weekEnd);
      
      return meritDate >= weekStart && meritDate <= weekEnd;
    });
    
    console.log('â­ MERITS DEBUG - Filtered:', weekMerits.length);

// Calculate merit records and points
const meritRecords = weekMerits.map(m => {
  let recordDate: Date;
  
  try {
    if (m.date instanceof Date) {
      recordDate = m.date;
    } else if (m.date && typeof m.date === 'object' && 'toDate' in m.date) {
      recordDate = m.date.toDate();
    } else {
      recordDate = new Date(m.date);
    }
    
    // Validate the date
    if (isNaN(recordDate.getTime())) {
      console.warn('âš ï¸ Invalid merit date, using current date:', m.date);
      recordDate = new Date();
    }
  } catch (err) {
    console.warn('âš ï¸ Error converting merit date, using current date:', m.date);
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

    console.log('â­ Behavior:', {
      merits: totalMerits,
      demerits: totalDemerits,
      net: netPoints,
      recordsThisWeek: weekMerits.length
    });

    // Analyze strengths and areas for improvement
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

    if (totalClassworkCount >= academics.length * 2) {
      strengths.push('Active participation in classwork activities');
    } else if (totalClassworkCount < academics.length) {
      areasForImprovement.push('Increase participation in classwork activities');
    }

    // Homework performance analysis (NEW)
if (overallHomeworkAverage >= 7) {
  strengths.push('Excellent homework completion and performance');
} else if (overallHomeworkAverage < 5 && totalHomeworkCount > 0) {
  areasForImprovement.push('Improve homework quality and understanding');
}

if (totalHomeworkCount >= academics.length * 2) {
  strengths.push('Consistent homework submission');
} else if (totalHomeworkCount < academics.length && academics.length > 0) {
  areasForImprovement.push('Submit homework more regularly');
}

    if (netPoints > 0) {
      strengths.push('Positive behavior and good conduct');
    } else if (netPoints < 0) {
      areasForImprovement.push('Work on behavior and classroom conduct');
    }

    console.log('ðŸ’ª Strengths:', strengths.length);
    console.log('ðŸ“ˆ Areas for improvement:', areasForImprovement.length);

    // Calculate week number
    const termStartDate = new Date(weekStart);
    termStartDate.setMonth(term === 'First Term' ? 8 : term === 'Second Term' ? 0 : 4);
    const weekNumber = getWeekNumberInTerm(weekStart, termStartDate);

    // Build the report card
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
  dailyRecords: weekAttendance.map(a => {
    let attDate: Date;
    
    try {
      if (a.date instanceof Date) {
        attDate = a.date;
      } else if (a.date && typeof a.date === 'object' && 'toDate' in a.date) {
        attDate = a.date.toDate();
      } else {
        attDate = new Date(a.date);
      }
      
      // Validate the date
      if (isNaN(attDate.getTime())) {
        console.warn('âš ï¸ Invalid attendance date, using current date:', a.date);
        attDate = new Date();
      }
    } catch (err) {
      console.warn('âš ï¸ Error converting attendance date, using current date:', a.date);
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
overallHomeworkAverage,    // NEW
totalHomeworkCount,        // NEW
      
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

console.log('âœ… ===== WEEKLY REPORT GENERATION COMPLETE =====');

    // Save to Firestore - remove undefined fields
    const firestoreData: any = {
      ...reportCard,
      weekStart: Timestamp.fromDate(weekStart),
      weekEnd: Timestamp.fromDate(weekEnd),
      generatedAt: Timestamp.now()
    };

    // Remove undefined fields (Firestore doesn't accept undefined)
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

    await setDoc(doc(db, 'weeklyReportCards', reportCard.id), firestoreData);

    return reportCard;
  } catch (error) {
    console.error('âŒ WEEKLY REPORT ERROR:', error);
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

// NEW: Bulk weekly report generation
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
  const docSnap = await getDoc(doc(db, 'caReportCards', id));
  return docSnap.exists() ? (docSnap.data() as CAReportCard) : null;
}

export async function getTermReportCard(
  studentId: string,
  term: string,
  session: string
): Promise<EndOfTermReportCard | null> {
  const id = `term_${studentId}_${term}_${session}`.replace(/\//g, '_');
  const docSnap = await getDoc(doc(db, 'termReportCards', id));
  return docSnap.exists() ? (docSnap.data() as EndOfTermReportCard) : null;
}

// NEW: Retrieve weekly report
export async function getWeeklyReportCard(
  studentId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportCard | null> {
  const id = `weekly_${studentId}_${weekStart.getTime()}_${weekEnd.getTime()}`.replace(/\//g, '_');
  const docSnap = await getDoc(doc(db, 'weeklyReportCards', id));
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    ...data,
    weekStart: data.weekStart.toDate(),
    weekEnd: data.weekEnd.toDate(),
    generatedAt: data.generatedAt.toDate()
  } as WeeklyReportCard;
}

// Deprecated - kept for backwards compatibility
export async function generateWeeklySummary(): Promise<any> {
  throw new Error('Weekly summary deprecated. Use generateWeeklyReportCard instead');
}