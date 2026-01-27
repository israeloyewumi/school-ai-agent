// lib/firebase/dailyRecordings.ts - Daily Teacher Recordings Query Functions (CLIENT SDK - COMPLETE)

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { getTeacher, getAllTeachers } from './db';
import { getStudentById } from './studentManagement';

// ============================================
// INTERFACES
// ============================================

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  markedByName: string;
  markedAt: Date;
  date: Date;
  remarks?: string;
}

export interface MeritRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  points: number;
  category: string;
  reason: string;
  teacherId: string;
  teacherName: string;
  date: Date;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  score: number;
  maxScore: number;
  percentage: number;
  teacherId: string;
  teacherName: string;
  dateRecorded: Date;
}

export interface TeacherDailyActivity {
  teacherId: string;
  teacherName: string;
  attendance: AttendanceRecord[];
  merits: MeritRecord[];
  grades: GradeRecord[];
  summary: {
    totalAttendance: number;
    totalMerits: number;
    totalGrades: number;
    totalPositiveMerits: number;
    totalNegativeMerits: number;
    classesCovered: string[];
    subjectsTaught: string[];
    firstActivity: Date | null;
    lastActivity: Date | null;
  };
}

export interface AllTeachersDailyRecordings {
  date: Date;
  term: string;
  session: string;
  byTeacher: Map<string, TeacherDailyActivity>;
  totals: {
    totalTeachersActive: number;
    totalAttendanceRecords: number;
    totalMeritRecords: number;
    totalGradeRecords: number;
    totalActivities: number;
  };
  timeline: ActivityTimelineItem[];
}

export interface ActivityTimelineItem {
  timestamp: Date;
  type: 'attendance' | 'merit' | 'grade';
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  details: string;
  icon: string;
  color: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function getTeacherNameSafely(teacherId: string): Promise<string> {
  try {
    const teacher = await getTeacher(teacherId);
    if (teacher) {
      return `${teacher.firstName} ${teacher.lastName}`;
    }
    return 'Unknown Teacher';
  } catch (error) {
    return 'Unknown Teacher';
  }
}

/**
 * Helper function to lookup student name
 */
async function getStudentNameSafely(studentId: string, existingName?: string): Promise<string> {
  // If we already have a valid name, use it
  if (existingName && existingName !== 'Unknown Student') {
    return existingName;
  }

  // Try to lookup student
  try {
    const student = await getStudentById(studentId);
    if (student) {
      const fullName = `${student.firstName} ${student.lastName}`;
      console.log(`✅ Looked up student: ${fullName} (${studentId})`);
      return fullName;
    }
  } catch (error) {
    console.warn(`⚠️ Could not lookup student ${studentId}:`, error);
  }

  return 'Unknown Student';
}

function getAssessmentIcon(type: string): string {
  const icons: Record<string, string> = {
    classwork: '📝',
    homework: '📚',
    ca1: '📊',
    ca2: '📄',
    exam: '📖'
  };
  return icons[type] || '📋';
}

// ============================================
// MAIN QUERY FUNCTIONS
// ============================================

/**
 * Get all recordings from ALL teachers for a specific date
 */
export async function getAllTeachersDailyRecordings(
  date: Date,
  term: string,
  session: string
): Promise<AllTeachersDailyRecordings> {
  console.log('📊 Fetching daily recordings for:', date.toLocaleDateString());
  
  const startOfDay = Timestamp.fromDate(getStartOfDay(date));
  const endOfDay = Timestamp.fromDate(getEndOfDay(date));

  try {
    // Query 1: Attendance records
    console.log('📋 Fetching attendance records...');
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay),
      where('term', '==', term),
      where('session', '==', session)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    console.log(`✅ Found ${attendanceSnapshot.size} attendance records`);

    // Query 2: Merit records
    console.log('⭐ Fetching merit records...');
    const meritsQuery = query(
      collection(db, 'merits'),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay),
      where('term', '==', term),
      where('session', '==', session)
    );
    const meritsSnapshot = await getDocs(meritsQuery);
    console.log(`✅ Found ${meritsSnapshot.size} merit records`);

    // Query 3: Grade records
    console.log('📝 Fetching grade records...');
    const gradesQuery = query(
      collection(db, 'results'),
      where('dateRecorded', '>=', startOfDay),
      where('dateRecorded', '<=', endOfDay),
      where('term', '==', term),
      where('session', '==', session)
    );
    const gradesSnapshot = await getDocs(gradesQuery);
    console.log(`✅ Found ${gradesSnapshot.size} grade records`);

    // Process data by teacher
    const teacherActivities = new Map<string, TeacherDailyActivity>();
    const timeline: ActivityTimelineItem[] = [];

    // Process Attendance - WITH STUDENT NAME LOOKUP
    console.log('🔍 Processing attendance records with student lookup...');
    for (const doc of attendanceSnapshot.docs) {
      const data = doc.data();
      const teacherId = data.markedBy;
      
      if (!teacherActivities.has(teacherId)) {
        const teacherName = await getTeacherNameSafely(teacherId);
        teacherActivities.set(teacherId, {
          teacherId,
          teacherName,
          attendance: [],
          merits: [],
          grades: [],
          summary: {
            totalAttendance: 0,
            totalMerits: 0,
            totalGrades: 0,
            totalPositiveMerits: 0,
            totalNegativeMerits: 0,
            classesCovered: [],
            subjectsTaught: [],
            firstActivity: null,
            lastActivity: null
          }
        });
      }

      const activity = teacherActivities.get(teacherId)!;
      const attendanceDate = data.date.toDate();
      
      // Lookup student name
      const studentName = await getStudentNameSafely(data.studentId, data.studentName);
      
      const record: AttendanceRecord = {
        id: doc.id,
        studentId: data.studentId,
        studentName: studentName,
        classId: data.classId,
        className: data.className || data.classId,
        status: data.status,
        markedBy: teacherId,
        markedByName: activity.teacherName,
        markedAt: data.markedAt?.toDate() || attendanceDate,
        date: attendanceDate,
        remarks: data.remarks
      };

      activity.attendance.push(record);

      // Add to timeline
      timeline.push({
        timestamp: record.markedAt,
        type: 'attendance',
        teacherId,
        teacherName: activity.teacherName,
        classId: record.classId,
        className: record.className,
        details: `Marked ${studentName} as ${record.status}`,
        icon: '📋',
        color: 'blue'
      });
    }

    // Process Merits - WITH STUDENT NAME LOOKUP
    console.log('🔍 Processing merit records with student lookup...');
    for (const doc of meritsSnapshot.docs) {
      const data = doc.data();
      const teacherId = data.teacherId;
      
      if (!teacherActivities.has(teacherId)) {
        const teacherName = await getTeacherNameSafely(teacherId);
        teacherActivities.set(teacherId, {
          teacherId,
          teacherName,
          attendance: [],
          merits: [],
          grades: [],
          summary: {
            totalAttendance: 0,
            totalMerits: 0,
            totalGrades: 0,
            totalPositiveMerits: 0,
            totalNegativeMerits: 0,
            classesCovered: [],
            subjectsTaught: [],
            firstActivity: null,
            lastActivity: null
          }
        });
      }

      const activity = teacherActivities.get(teacherId)!;
      const meritDate = data.date.toDate();
      
      // Lookup student name
      const studentName = await getStudentNameSafely(data.studentId, data.studentName);
      
      const record: MeritRecord = {
        id: doc.id,
        studentId: data.studentId,
        studentName: studentName,
        classId: data.classId,
        className: data.className || data.classId,
        points: data.points,
        category: data.category,
        reason: data.reason,
        teacherId,
        teacherName: activity.teacherName,
        date: meritDate
      };

      activity.merits.push(record);

      // Add to timeline
      timeline.push({
        timestamp: meritDate,
        type: 'merit',
        teacherId,
        teacherName: activity.teacherName,
        classId: record.classId,
        className: record.className,
        details: `${record.points > 0 ? '+' : ''}${record.points} points to ${studentName}: ${record.reason}`,
        icon: record.points > 0 ? '⭐' : '⚠️',
        color: record.points > 0 ? 'green' : 'red'
      });
    }

    // Process Grades - WITH STUDENT NAME LOOKUP
    console.log('🔍 Processing grade records with student lookup...');
    for (const doc of gradesSnapshot.docs) {
      const data = doc.data();
      const teacherId = data.teacherId;
      
      if (!teacherId) continue; // Skip if no teacher ID
      
      if (!teacherActivities.has(teacherId)) {
        const teacherName = await getTeacherNameSafely(teacherId);
        teacherActivities.set(teacherId, {
          teacherId,
          teacherName,
          attendance: [],
          merits: [],
          grades: [],
          summary: {
            totalAttendance: 0,
            totalMerits: 0,
            totalGrades: 0,
            totalPositiveMerits: 0,
            totalNegativeMerits: 0,
            classesCovered: [],
            subjectsTaught: [],
            firstActivity: null,
            lastActivity: null
          }
        });
      }

      const activity = teacherActivities.get(teacherId)!;
      const gradeDate = data.dateRecorded?.toDate() || date;
      
      // Lookup student name
      const studentName = await getStudentNameSafely(data.studentId, data.studentName);
      
      const percentage = data.maxScore > 0 ? (data.score / data.maxScore) * 100 : 0;
      
      const record: GradeRecord = {
        id: doc.id,
        studentId: data.studentId,
        studentName: studentName,
        classId: data.classId,
        className: data.className || data.classId,
        subjectId: data.subjectId,
        subjectName: data.subjectName || data.subjectId,
        assessmentType: data.assessmentType,
        score: data.score,
        maxScore: data.maxScore,
        percentage: Math.round(percentage * 10) / 10,
        teacherId,
        teacherName: activity.teacherName,
        dateRecorded: gradeDate
      };

      activity.grades.push(record);

      // Add to timeline
      timeline.push({
        timestamp: gradeDate,
        type: 'grade',
        teacherId,
        teacherName: activity.teacherName,
        classId: record.classId,
        className: record.className,
        details: `${record.assessmentType.toUpperCase()} for ${studentName} in ${record.subjectName}: ${record.score}/${record.maxScore}`,
        icon: getAssessmentIcon(record.assessmentType),
        color: 'purple'
      });
    }

    // Calculate summaries for each teacher
    console.log('📊 Calculating summaries...');
    for (const [teacherId, activity] of teacherActivities) {
      const classesCovered = new Set<string>();
      const subjectsTaught = new Set<string>();
      const allTimestamps: Date[] = [];

      // From attendance
      activity.attendance.forEach(a => {
        classesCovered.add(a.className);
        allTimestamps.push(a.markedAt);
      });

      // From merits
      activity.merits.forEach(m => {
        classesCovered.add(m.className);
        allTimestamps.push(m.date);
      });

      // From grades
      activity.grades.forEach(g => {
        classesCovered.add(g.className);
        subjectsTaught.add(g.subjectName);
        allTimestamps.push(g.dateRecorded);
      });

      // Sort timestamps
      allTimestamps.sort((a, b) => a.getTime() - b.getTime());

      activity.summary = {
        totalAttendance: activity.attendance.length,
        totalMerits: activity.merits.length,
        totalGrades: activity.grades.length,
        totalPositiveMerits: activity.merits.filter(m => m.points > 0).length,
        totalNegativeMerits: activity.merits.filter(m => m.points < 0).length,
        classesCovered: Array.from(classesCovered),
        subjectsTaught: Array.from(subjectsTaught),
        firstActivity: allTimestamps[0] || null,
        lastActivity: allTimestamps[allTimestamps.length - 1] || null
      };
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const result: AllTeachersDailyRecordings = {
      date,
      term,
      session,
      byTeacher: teacherActivities,
      totals: {
        totalTeachersActive: teacherActivities.size,
        totalAttendanceRecords: attendanceSnapshot.size,
        totalMeritRecords: meritsSnapshot.size,
        totalGradeRecords: gradesSnapshot.size,
        totalActivities: timeline.length
      },
      timeline
    };

    console.log('✅ Daily recordings fetched successfully!');
    console.log(`   Teachers active: ${result.totals.totalTeachersActive}`);
    console.log(`   Total activities: ${result.totals.totalActivities}`);

    return result;
  } catch (error) {
    console.error('❌ Error fetching daily recordings:', error);
    throw error;
  }
}

/**
 * Get recordings for a specific teacher on a specific date
 */
export async function getTeacherDailyRecordings(
  teacherId: string,
  date: Date,
  term: string,
  session: string
): Promise<TeacherDailyActivity | null> {
  try {
    const allRecordings = await getAllTeachersDailyRecordings(date, term, session);
    return allRecordings.byTeacher.get(teacherId) || null;
  } catch (error) {
    console.error('❌ Error fetching teacher daily recordings:', error);
    throw error;
  }
}

/**
 * Get recordings for a specific class on a specific date
 */
export async function getClassDailyRecordings(
  classId: string,
  date: Date,
  term: string,
  session: string
): Promise<{
  attendance: AttendanceRecord[];
  merits: MeritRecord[];
  grades: GradeRecord[];
  teachersInvolved: string[];
  summary: {
    totalAttendance: number;
    totalMerits: number;
    totalGrades: number;
  };
}> {
  try {
    const allRecordings = await getAllTeachersDailyRecordings(date, term, session);
    
    const attendance: AttendanceRecord[] = [];
    const merits: MeritRecord[] = [];
    const grades: GradeRecord[] = [];
    const teachersSet = new Set<string>();

    // Collect all activities for this class
    for (const [teacherId, activity] of allRecordings.byTeacher) {
      const classAttendance = activity.attendance.filter(a => a.classId === classId);
      const classMerits = activity.merits.filter(m => m.classId === classId);
      const classGrades = activity.grades.filter(g => g.classId === classId);

      if (classAttendance.length > 0 || classMerits.length > 0 || classGrades.length > 0) {
        teachersSet.add(activity.teacherName);
        attendance.push(...classAttendance);
        merits.push(...classMerits);
        grades.push(...classGrades);
      }
    }

    return {
      attendance,
      merits,
      grades,
      teachersInvolved: Array.from(teachersSet),
      summary: {
        totalAttendance: attendance.length,
        totalMerits: merits.length,
        totalGrades: grades.length
      }
    };
  } catch (error) {
    console.error('❌ Error fetching class daily recordings:', error);
    throw error;
  }
}

/**
 * Simplified function for admin chat agent - Get daily teacher activity
 */
export async function getDailyTeacherActivity(
  activityType: 'attendance' | 'grades' | 'all' = 'all',
  targetDate?: Date
): Promise<{
  date: string;
  activityType: string;
  summary: {
    totalTeachers: number;
    recordedActivity: number;
    noActivity: number;
    recordedAttendance: number;
    notRecordedAttendance: number;
    recordedGrades: number;
    notRecordedGrades: number;
  };
  teachersWhoRecorded: Array<any>;
  teachersWhoDidNot: Array<any>;
  teachersWhoRecordedAttendance: Array<any>;
  teachersWhoDidNotRecordAttendance: Array<any>;
  teachersWhoRecordedGrades: Array<any>;
  teachersWhoDidNotRecordedGrades: Array<any>;
}> {
  const date = targetDate || new Date();
  const term = "First Term";
  const session = "2025/2026";
  
  // Get all teachers
  const allTeachers = await getAllTeachers();
  const activeTeachers = allTeachers.filter(t => t.isActive);
  
  // Get all recordings for the date
  const recordings = await getAllTeachersDailyRecordings(date, term, session);
  
  // Build activity map
  const teacherActivity = activeTeachers.map(teacher => {
    const activity = recordings.byTeacher.get(teacher.id);
    
    const hasAttendance = activity ? activity.attendance.length > 0 : false;
    const hasGrades = activity ? activity.grades.length > 0 : false;
    const hasAnyActivity = hasAttendance || hasGrades;
    
    return {
      teacherId: teacher.id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      isClassTeacher: teacher.isClassTeacher,
      assignedClass: teacher.assignedClass?.className || null,
      recordedToday: {
        attendance: hasAttendance,
        grades: hasGrades,
        anyActivity: hasAnyActivity
      },
      details: {
        attendanceCount: activity?.attendance.length || 0,
        gradesCount: activity?.grades.length || 0,
        attendanceClasses: activity ? Array.from(new Set(activity.attendance.map(a => a.className))) : [],
        gradesSubjects: activity ? Array.from(new Set(activity.grades.map(g => g.subjectName))) : []
      }
    };
  });
  
  // Filter based on activity type
  const recorded = teacherActivity.filter(t => t.recordedToday.anyActivity);
  const notRecorded = teacherActivity.filter(t => !t.recordedToday.anyActivity);
  
  const recordedAttendance = teacherActivity.filter(t => t.recordedToday.attendance);
  const notRecordedAttendance = teacherActivity.filter(t => !t.recordedToday.attendance);
  
  const recordedGrades = teacherActivity.filter(t => t.recordedToday.grades);
  const notRecordedGrades = teacherActivity.filter(t => !t.recordedToday.grades);
  
  return {
    date: date.toLocaleDateString(),
    activityType,
    summary: {
      totalTeachers: activeTeachers.length,
      recordedActivity: recorded.length,
      noActivity: notRecorded.length,
      recordedAttendance: recordedAttendance.length,
      notRecordedAttendance: notRecordedAttendance.length,
      recordedGrades: recordedGrades.length,
      notRecordedGrades: notRecordedGrades.length
    },
    teachersWhoRecorded: recorded,
    teachersWhoDidNot: notRecorded,
    teachersWhoRecordedAttendance: recordedAttendance,
    teachersWhoDidNotRecordAttendance: notRecordedAttendance,
    teachersWhoRecordedGrades: recordedGrades,
    teachersWhoDidNotRecordedGrades: notRecordedGrades
  };
}