// lib/firebase/teacherReports.ts
import { db } from './config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
  Timestamp,
  orderBy 
} from 'firebase/firestore';

export interface WeeklyHistoryData {
  studentId: string;
  studentName: string;
  weekStart: Date;
  weekEnd: Date;
  attendance: AttendanceRecord[];
  merits: MeritRecord[];
  grades: GradeRecord[];
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  subjectName: string;
  teacherName: string;
  remarks?: string;
}

export interface MeritRecord {
  id: string;
  date: Date;
  points: number;
  reason: string;
  category: string;
  subjectName?: string;
  teacherName: string;
}

export interface GradeRecord {
  id: string;
  date: Date;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  score: number;
  maxScore: number;
  percentage: number;
  teacherName: string;
  remarks?: string;
}

/**
 * Get the start and end of a week for a given date
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Get teacher's subject IDs
 */
async function getTeacherSubjects(teacherId: string): Promise<string[]> {
  try {
    const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
    if (!teacherDoc.exists()) {
      console.warn(`Teacher ${teacherId} not found`);
      return [];
    }
    
    const teacherData = teacherDoc.data();
    const subjects = teacherData.subjects || [];
    
    // Extract subject IDs from the teacher's subjects array
    const subjectIds = subjects.map((s: any) => s.subjectId);
    console.log(`✅ Teacher ${teacherId} teaches ${subjectIds.length} subjects:`, subjectIds);
    
    return subjectIds;
  } catch (error) {
    console.error('❌ Error fetching teacher subjects:', error);
    return [];
  }
}

/**
 * Fetch weekly history report for a student (filtered by teacher's subjects)
 */
export async function fetchWeeklyHistory(
  studentId: string,
  weekDate: Date,
  teacherId?: string
): Promise<WeeklyHistoryData> {
  const { start: weekStart, end: weekEnd } = getWeekBounds(weekDate);
  
  // Convert to Firestore Timestamps
  const startTimestamp = Timestamp.fromDate(weekStart);
  const endTimestamp = Timestamp.fromDate(weekEnd);

  console.log(`📊 Fetching weekly history for student ${studentId}`);
  console.log(`📅 Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`);

  // Get teacher's subjects if teacherId is provided
  let teacherSubjectIds: string[] = [];
  if (teacherId) {
    teacherSubjectIds = await getTeacherSubjects(teacherId);
  }

  // Fetch student info
  let studentName = 'Unknown Student';
  try {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      studentName = `${studentData.firstName} ${studentData.lastName}`;
      console.log(`✅ Found student: ${studentName}`);
    } else {
      console.warn(`⚠️ Student document not found: ${studentId}`);
    }
  } catch (error) {
    console.error('❌ Error fetching student:', error);
  }

  // Fetch attendance records
  const attendanceQuery = query(
    collection(db, 'attendance'),
    where('studentId', '==', studentId),
    where('date', '>=', startTimestamp),
    where('date', '<=', endTimestamp),
    orderBy('date', 'desc')
  );
  const attendanceSnapshot = await getDocs(attendanceQuery);
  let attendance: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date.toDate(),
      status: data.status,
      subjectName: data.subjectName || 'N/A',
      teacherName: data.teacherName || 'N/A',
      remarks: data.remarks,
      subjectId: data.subjectId
    } as any;
  });

  // Filter attendance by teacher's subjects
  if (teacherId && teacherSubjectIds.length > 0) {
    const beforeFilter = attendance.length;
    attendance = attendance.filter((a: any) => 
      !a.subjectId || teacherSubjectIds.includes(a.subjectId)
    );
    console.log(`✅ Attendance: ${beforeFilter} total → ${attendance.length} for teacher's subjects`);
  }

  // Fetch merit records
  const meritsQuery = query(
    collection(db, 'merits'),
    where('studentId', '==', studentId),
    where('date', '>=', startTimestamp),
    where('date', '<=', endTimestamp),
    orderBy('date', 'desc')
  );
  const meritsSnapshot = await getDocs(meritsQuery);
  let merits: MeritRecord[] = meritsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date.toDate(),
      points: data.points,
      reason: data.reason,
      category: data.category,
      subjectName: data.subjectName,
      teacherName: data.teacherName || 'N/A',
      subjectId: data.subjectId
    } as any;
  });

  // Filter merits by teacher's subjects
  if (teacherId && teacherSubjectIds.length > 0) {
    const beforeFilter = merits.length;
    merits = merits.filter((m: any) => 
      !m.subjectId || teacherSubjectIds.includes(m.subjectId)
    );
    console.log(`✅ Merits: ${beforeFilter} total → ${merits.length} for teacher's subjects`);
  }

  // Fetch grade records (includes classwork, homework, CA1, CA2, exam)
  // NOTE: Collection is named 'results' and uses 'dateRecorded' field
  const gradesQuery = query(
    collection(db, 'results'),
    where('studentId', '==', studentId),
    where('dateRecorded', '>=', startTimestamp),
    where('dateRecorded', '<=', endTimestamp),
    orderBy('dateRecorded', 'desc')
  );
  const gradesSnapshot = await getDocs(gradesQuery);
  let grades: GradeRecord[] = gradesSnapshot.docs.map(doc => {
    const data = doc.data();
    const percentage = data.maxScore > 0 
      ? (data.score / data.maxScore) * 100 
      : 0;
    return {
      id: doc.id,
      date: (data.dateRecorded || data.date || data.createdAt).toDate(),
      subjectName: data.subjectName || data.subjectId || data.subject || 'N/A',
      subjectId: data.subjectId,
      assessmentType: data.assessmentType || data.type || 'classwork',
      score: data.score || 0,
      maxScore: data.maxScore || 10,
      percentage: Math.round(percentage * 10) / 10,
      teacherName: data.teacherName || data.teacher || 'N/A',
      remarks: data.remarks || data.comment
    } as any;
  });

  // Filter grades by teacher's subjects
  if (teacherId && teacherSubjectIds.length > 0) {
    const beforeFilter = grades.length;
    grades = grades.filter((g: any) => 
      g.subjectId && teacherSubjectIds.includes(g.subjectId)
    );
    console.log(`✅ Grades: ${beforeFilter} total → ${grades.length} for teacher's subjects`);
    
    if (grades.length === 0 && beforeFilter > 0) {
      console.log(`ℹ️ This teacher doesn't teach any subjects that this student has grades in.`);
      console.log(`   Student has grades in:`, [...new Set(gradesSnapshot.docs.map(d => d.data().subjectId))]);
      console.log(`   Teacher teaches:`, teacherSubjectIds);
    }
  }

  console.log(`📈 Final totals - Attendance: ${attendance.length}, Merits: ${merits.length}, Grades: ${grades.length}`);

  return {
    studentId,
    studentName,
    weekStart,
    weekEnd,
    attendance,
    merits,
    grades
  };
}

/**
 * Calculate attendance percentage for the week
 */
export function calculateAttendancePercentage(attendance: AttendanceRecord[]): number {
  if (attendance.length === 0) return 0;
  
  const presentCount = attendance.filter(
    a => a.status === 'present' || a.status === 'late'
  ).length;
  
  return Math.round((presentCount / attendance.length) * 100);
}

/**
 * Calculate total merit points for the week
 */
export function calculateTotalMerits(merits: MeritRecord[]): number {
  return merits.reduce((total, merit) => total + merit.points, 0);
}

/**
 * Get grade summary by assessment type
 */
export function getGradeSummary(grades: GradeRecord[]) {
  const summary = {
    classwork: [] as GradeRecord[],
    homework: [] as GradeRecord[],
    ca1: [] as GradeRecord[],
    ca2: [] as GradeRecord[],
    exam: [] as GradeRecord[]
  };

  grades.forEach(grade => {
    summary[grade.assessmentType].push(grade);
  });

  return summary;
}