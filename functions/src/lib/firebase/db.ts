// functions/src/lib/firebase/db.ts - ADMIN SDK VERSION
import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

// Type imports (keep these)
import type {
  Student,
  Teacher,
  Parent,
  AcademicTrack,
  Attendance,
  Merit,
  StudentMeritSummary,
  Result,
  FeePayment,
  StudentFeeStatus,
  Assignment,
  AssignmentSubmission,
  Announcement,
  Notification
} from '../../types/database';

// ============================================
// HELPER FUNCTIONS
// ============================================

function sanitizeSession(session: string): string {
  return session.replace(/\//g, '_');
}

async function getStudentDocId(admissionNumberOrDocId: string): Promise<string | null> {
  try {
    const docRef = db.collection('students').doc(admissionNumberOrDocId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return admissionNumberOrDocId;
    }
  } catch (error) {
    // Not a valid doc ID
  }

  try {
    const snapshot = await db.collection('students')
      .where('admissionNumber', '==', admissionNumberOrDocId)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error converting admission number to doc ID:', error);
    return null;
  }
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

export async function createDocument<T>(
  collectionName: string, 
  data: Omit<T, 'id'>
): Promise<string> {
  try {
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<any>
): Promise<void> {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.delete();
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

// ============================================
// STUDENT OPERATIONS
// ============================================

export async function getStudentByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
  try {
    const snapshot = await db.collection('students')
      .where('admissionNumber', '==', admissionNumber)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Student;
  } catch (error) {
    console.error('Error getting student by admission number:', error);
    throw error;
  }
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const byId = await getDocument<Student>('students', studentId);
  if (byId) return byId;
  
  return getStudentByAdmissionNumber(studentId);
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  try {
    const snapshot = await db.collection('students')
      .where('classId', '==', classId)
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error('Error getting students by class:', error);
    throw error;
  }
}

export async function getStudentsByParent(parentId: string): Promise<Student[]> {
  try {
    const snapshot = await db.collection('students')
      .where('guardianId', '==', parentId)
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error('Error getting students by parent:', error);
    throw error;
  }
}

export async function getStudentsBySubject(
  subjectId: string,
  classId?: string
): Promise<Student[]> {
  try {
    let query = db.collection('students').where('isActive', '==', true);

    if (classId) {
      query = query.where('classId', '==', classId);
    }

    const snapshot = await query.get();
    const allStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    
    return allStudents.filter(student => 
      student.subjects && student.subjects.includes(subjectId)
    );
  } catch (error) {
    console.error('Error fetching students by subject:', error);
    throw error;
  }
}

export async function getStudentsByTrack(
  track: AcademicTrack,
  classId?: string
): Promise<Student[]> {
  try {
    let query = db.collection('students')
      .where('academicTrack', '==', track)
      .where('isActive', '==', true);

    if (classId) {
      query = query.where('classId', '==', classId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error('Error fetching students by track:', error);
    throw error;
  }
}

// ============================================
// PARENT OPERATIONS
// ============================================

export async function getParent(parentId: string): Promise<Parent | null> {
  try {
    const docRef = db.collection('parents').doc(parentId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as Parent;
    }
    return null;
  } catch (error) {
    console.error('Error getting parent:', error);
    throw error;
  }
}

// ============================================
// TEACHER OPERATIONS
// ============================================

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  try {
    const docRef = db.collection('teachers').doc(teacherId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as Teacher;
    }
    return null;
  } catch (error) {
    console.error('Error getting teacher:', error);
    throw error;
  }
}

export async function getTeacherClasses(teacherId: string): Promise<any[]> {
  try {
    const teacher = await getTeacher(teacherId);
    if (!teacher) return [];

    const classes = [];
    
    if (teacher.assignedClass?.classId) {
      try {
        const classDoc = await getDocument('classes', teacher.assignedClass.classId);
        if (classDoc) {
          classes.push(classDoc);
        }
      } catch (error) {
        console.error('Error fetching assigned class:', error);
      }
    }
    
    if (Array.isArray(teacher.classes)) {
      for (const classId of teacher.classes) {
        try {
          const classDoc = await getDocument('classes', classId);
                                                               // @ts-ignore
          if (classDoc && !classes.some(c => c.id === classDoc.id)) {
            classes.push(classDoc);
          }
        } catch (error) {
          console.error('Error fetching class from array:', error);
        }
      }
    }

    return classes;
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return [];
  }
}

export async function getTeacherSubjects(teacherId: string): Promise<any[]> {
  try {
    const teacher = await getTeacher(teacherId);
    if (!teacher || !teacher.subjects) {
      return [];
    }
                                                 // @ts-ignore
    const subjectPromises = teacher.subjects.map(async (subjectId: string) => {
      const subjectDoc = await getDocument('subjects', subjectId);
      return subjectDoc;
    });

    const subjects = await Promise.all(subjectPromises);
    return subjects.filter(s => s !== null);
  } catch (error) {
    console.error('Error getting teacher subjects:', error);
    throw error;
  }
}

export async function getClassStudentsForTeacher(classId: string): Promise<Student[]> {
  return getStudentsByClass(classId);
}

export async function getClassAttendanceSummary(
  classId: string,
  term: string,
  session: string
): Promise<any> {
  try {
    const students = await getStudentsByClass(classId);
    
    const attendanceSummaries = await Promise.all(
      students.map(async (student) => {
        const attendance = await getStudentAttendance(student.id, term, session);
        
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const total = attendance.length;
        
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          present,
          absent,
          late,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
      })
    );
    
    return {
      classId,
      students: attendanceSummaries,
      classAverage: attendanceSummaries.length > 0 
        ? Math.round(attendanceSummaries.reduce((sum, s) => sum + s.percentage, 0) / attendanceSummaries.length)
        : 0
    };
  } catch (error) {
    console.error('Error getting class attendance summary:', error);
    throw error;
  }
}

export async function getClassResultsSummary(
  classId: string,
  term: string,
  session: string,
  subjectId?: string
): Promise<any> {
  try {
    const students = await getStudentsByClass(classId);
    
    const resultsSummaries = await Promise.all(
      students.map(async (student) => {
        const results = await getStudentResults(student.id, term, session);
        
        const filteredResults = subjectId 
          ? results.filter(r => r.subjectId === subjectId)
          : results;
        
        const average = filteredResults.length > 0
          ? Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length)
          : 0;
        
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          results: filteredResults,
          average,
          totalSubjects: filteredResults.length
        };
      })
    );
    
    return {
      classId,
      students: resultsSummaries,
      classAverage: resultsSummaries.length > 0
        ? Math.round(resultsSummaries.reduce((sum, s) => sum + s.average, 0) / resultsSummaries.length)
        : 0
    };
  } catch (error) {
    console.error('Error getting class results summary:', error);
    throw error;
  }
}

// ============================================
// ADMIN OPERATIONS
// ============================================

export async function getAdmin(adminId: string): Promise<any | null> {
  try {
    const docRef = db.collection('users').doc(adminId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists && docSnap.data()?.role === 'admin') {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting admin:', error);
    throw error;
  }
}

export async function getAllStudents(): Promise<Student[]> {
  try {
    const snapshot = await db.collection('students')
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error('Error getting all students:', error);
    throw error;
  }
}

export async function getStudentCurriculumStats(): Promise<{
  byTrack: Record<string, number>;
  byGrade: Record<number, { total: number; withSubjects: number }>;
  totalWithSubjects: number;
  totalWithoutSubjects: number;
}> {
  try {
    const students = await getAllStudents();
    
    const byTrack: Record<string, number> = {
      Science: 0,
      Arts: 0,
      Commercial: 0,
      None: 0
    };
    
    const byGrade: Record<number, { total: number; withSubjects: number }> = {};
    let totalWithSubjects = 0;
    let totalWithoutSubjects = 0;
    
    students.forEach(student => {
      if (student.academicTrack) {
        byTrack[student.academicTrack] = (byTrack[student.academicTrack] || 0) + 1;
      } else {
        byTrack.None++;
      }
      
      const grade = parseInt(student.className.match(/\d+/)?.[0] || '0');
      if (grade > 0) {
        if (!byGrade[grade]) {
          byGrade[grade] = { total: 0, withSubjects: 0 };
        }
        byGrade[grade].total++;
        
        if (student.subjects && student.subjects.length > 0) {
          byGrade[grade].withSubjects++;
          totalWithSubjects++;
        } else {
          totalWithoutSubjects++;
        }
      }
    });
    
    return {
      byTrack,
      byGrade,
      totalWithSubjects,
      totalWithoutSubjects
    };
  } catch (error) {
    console.error('Error getting curriculum stats:', error);
    throw error;
  }
}

export async function getAllTeachers(): Promise<Teacher[]> {
  try {
    const snapshot = await db.collection('teachers')
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
  } catch (error) {
    console.error('Error getting all teachers:', error);
    throw error;
  }
}

export async function getAllClasses(): Promise<any[]> {
  try {
    const snapshot = await db.collection('classes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all classes:', error);
    throw error;
  }
}

export async function getSchoolStatistics(
  term: string,
  session: string
): Promise<any> {
  try {
    const students = await getAllStudents();
    const teachers = await getAllTeachers();
    const classes = await getAllClasses();
    
    const meritSnapshot = await db.collection('merits')
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    const totalMerits = meritSnapshot.docs.reduce((sum, doc) => sum + (doc.data().points || 0), 0);
    
    const feeSnapshot = await db.collection('feePayments')
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    const totalFeesCollected = feeSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    
    const attendanceSnapshot = await db.collection('attendance')
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data());
    const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
    const totalAttendance = attendanceRecords.length;
    const attendanceRate = totalAttendance > 0 
      ? Math.round((presentCount / totalAttendance) * 100) 
      : 0;
    
    const curriculumStats = await getStudentCurriculumStats();
    
    return {
      term,
      session,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClasses: classes.length,
      totalMeritsAwarded: totalMerits,
      totalFeesCollected,
      overallAttendanceRate: attendanceRate,
      curriculumStats: {
        byTrack: curriculumStats.byTrack,
        totalWithSubjects: curriculumStats.totalWithSubjects,
        totalWithoutSubjects: curriculumStats.totalWithoutSubjects
      },
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('Error getting school statistics:', error);
    throw error;
  }
}

export async function getTopPerformingStudents(
  term: string,
  session: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const students = await getAllStudents();
    
    const studentPerformances = await Promise.all(
      students.map(async (student) => {
        const results = await getStudentResults(student.id, term, session);
        const average = results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0;
        
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          classId: student.classId,
          average,
          totalSubjects: results.length
        };
      })
    );
    
    return studentPerformances
      .filter(sp => sp.totalSubjects > 0)
      .sort((a, b) => b.average - a.average)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top performing students:', error);
    throw error;
  }
}

export async function getStudentsNeedingAttention(
  term: string,
  session: string
): Promise<any[]> {
  try {
    const students = await getAllStudents();
    
    const studentStatuses = await Promise.all(
      students.map(async (student) => {
        const results = await getStudentResults(student.id, term, session);
        const attendance = await getStudentAttendance(student.id, term, session);
        const merits = await getStudentMerits(student.id, term, session);
        
        const average = results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0;
        
        const attendanceRate = attendance.length > 0
          ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
          : 100;
        
        const totalMerits = merits.reduce((sum, m) => sum + m.points, 0);
        
        const needsAttention = average < 50 || attendanceRate < 75 || totalMerits < 0;
        
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          classId: student.classId,
          average,
          attendanceRate: Math.round(attendanceRate),
          totalMerits,
          needsAttention,
          reasons: [
            average < 50 ? 'Low academic performance' : null,
            attendanceRate < 75 ? 'Poor attendance' : null,
            totalMerits < 0 ? 'Negative merit points' : null
          ].filter(Boolean)
        };
      })
    );
    
    return studentStatuses.filter(s => s.needsAttention);
  } catch (error) {
    console.error('Error getting students needing attention:', error);
    throw error;
  }
}

export async function getFeeCollectionReport(
  term: string,
  session: string
): Promise<any> {
  try {
    const students = await getAllStudents();
    
    const feeStatuses = await Promise.all(
      students.map(async (student) => {
        const payments = await getStudentFeePayments(student.id, term, session);
        
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const expectedFees = 150000;
        const balance = expectedFees - totalPaid;
        const status = balance === 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');
        
        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          expectedFees,
          totalPaid,
          balance,
          status,
          payments: payments.length
        };
      })
    );
    
    const totalExpected = feeStatuses.length * 150000;
    const totalCollected = feeStatuses.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalOutstanding = totalExpected - totalCollected;
    const collectionRate = totalExpected > 0 
      ? Math.round((totalCollected / totalExpected) * 100)
      : 0;
    
    return {
      term,
      session,
      totalStudents: students.length,
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate,
      paidInFull: feeStatuses.filter(s => s.status === 'paid').length,
      partialPayment: feeStatuses.filter(s => s.status === 'partial').length,
      unpaid: feeStatuses.filter(s => s.status === 'unpaid').length,
      students: feeStatuses
    };
  } catch (error) {
    console.error('Error getting fee collection report:', error);
    throw error;
  }
}

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

export async function markAttendance(attendance: Omit<Attendance, 'id'>): Promise<string> {
  return createDocument<Attendance>('attendance', attendance);
}

export async function getStudentAttendance(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<Attendance[]> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) {
      console.warn('Student not found:', studentIdOrAdmissionNumber);
      return [];
    }

    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentDocId)
      .where('term', '==', term)
      .where('session', '==', session)
      .orderBy('date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  } catch (error) {
    console.error('Error getting student attendance:', error);
    throw error;
  }
}

export async function getClassAttendanceForDate(
  classId: string,
  date: Date
): Promise<Attendance[]> {
  try {
    const timestamp = admin.firestore.Timestamp.fromDate(date);
    const snapshot = await db.collection('attendance')
      .where('classId', '==', classId)
      .where('date', '==', timestamp)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  } catch (error) {
    console.error('Error getting class attendance:', error);
    throw error;
  }
}

// ============================================
// MERIT SYSTEM OPERATIONS
// ============================================

export async function awardMerit(merit: Omit<Merit, 'id'>): Promise<string> {
  try {
    const studentDocId = await getStudentDocId(merit.studentId);
    if (!studentDocId) {
      throw new Error('Student not found: ' + merit.studentId);
    }

    const meritData = { ...merit, studentId: studentDocId };
    const meritId = await createDocument<Merit>('merits', meritData);
    
    await updateStudentMeritSummary(studentDocId, merit.term, merit.session, merit.points);
    
    await createNotification({
      userId: studentDocId,
      type: 'merit',
      title: merit.points > 0 ? '🏆 Merits Earned!' : '⚠️ Merits Deducted',
      message: `${merit.points > 0 ? '+' : ''}${merit.points} merits: ${merit.reason}`,
      relatedId: meritId,
      isRead: false
    });
    
    return meritId;
  } catch (error) {
    console.error('Error awarding merit:', error);
    throw error;
  }
}

async function updateStudentMeritSummary(
  studentDocId: string,
  term: string,
  session: string,
  points: number
): Promise<void> {
  try {
    const sanitizedSession = sanitizeSession(session);
    const summaryId = `${studentDocId}_${term}_${sanitizedSession}`;
    
    const summaryRef = db.collection('studentMeritSummaries').doc(summaryId);
    const summarySnap = await summaryRef.get();
    
    if (summarySnap.exists) {
      const currentTotal = summarySnap.data()?.totalMerits || 0;
      const newTotal = Math.max(0, currentTotal + points);
      const level = getMeritLevel(newTotal);
      
      await summaryRef.update({
        totalMerits: newTotal,
        level: level,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const newTotal = Math.max(0, points);
      const level = getMeritLevel(newTotal);
      
      await summaryRef.set({
        studentId: studentDocId,
        term,
        session,
        totalMerits: newTotal,
        level: level,
        rank: 0,
        classRank: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating merit summary:', error);
    throw error;
  }
}

function getMeritLevel(points: number): string {
  if (points >= 501) return 'diamond';
  if (points >= 301) return 'platinum';
  if (points >= 151) return 'gold';
  if (points >= 51) return 'silver';
  return 'bronze';
}

export async function getStudentMerits(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<Merit[]> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) {
      console.warn('Student not found:', studentIdOrAdmissionNumber);
      return [];
    }

    const snapshot = await db.collection('merits')
      .where('studentId', '==', studentDocId)
      .where('term', '==', term)
      .where('session', '==', session)
      .orderBy('date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Merit));
  } catch (error) {
    console.error('Error getting student merits:', error);
    throw error;
  }
}

export async function getStudentMeritSummary(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<StudentMeritSummary | null> {
  const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
  if (!studentDocId) return null;

  const sanitizedSession = sanitizeSession(session);
  const summaryId = `${studentDocId}_${term}_${sanitizedSession}`;
  return getDocument<StudentMeritSummary>('studentMeritSummaries', summaryId);
}

export async function getClassMeritLeaderboard(
  classId: string,
  limit: number = 10
): Promise<Array<{
  studentId: string;
  studentName: string;
  totalMerits: number;
  meritBreakdown: Record<string, number>;
}>> {
  try {
    const meritsRef = db.collection('meritPoints');
    const snapshot = await meritsRef
      .where('classId', '==', classId)
      .get();

    const studentMerits: Record<string, {
      studentName: string;
      totalMerits: number;
      meritBreakdown: Record<string, number>;
    }> = {};

    snapshot.forEach(doc => {      // @ts-ignore
      const merit = doc.data() as MeritPoint;
      if (!studentMerits[merit.studentId]) {
        studentMerits[merit.studentId] = {
          studentName: merit.studentName,
          totalMerits: 0,
          meritBreakdown: {}
        };
      }

      studentMerits[merit.studentId].totalMerits += merit.points;
      const category = merit.category || 'Other';
      studentMerits[merit.studentId].meritBreakdown[category] = 
        (studentMerits[merit.studentId].meritBreakdown[category] || 0) + merit.points;
    });

    const summaries = Object.entries(studentMerits).map(([studentId, data]) => ({
      studentId,
      ...data
    }));

    const limitCount = Math.min(limit, summaries.length);
    return summaries
      .sort((a, b) => b.totalMerits - a.totalMerits)
      .slice(0, limitCount);

  } catch (error) {
    console.error('Error fetching class merit leaderboard:', error);
    throw error;
  }
}

    // CONTINUATION OF db.ts - RESULTS AND FEES OPERATIONS

// ============================================
// RESULTS OPERATIONS
// ============================================

export async function recordResult(result: Omit<Result, 'id'>): Promise<string> {
  const studentDocId = await getStudentDocId(result.studentId);
  if (!studentDocId) {
    throw new Error('Student not found: ' + result.studentId);
  }

  const resultData = { ...result, studentId: studentDocId };
  return createDocument<Result>('results', resultData);
}

export async function getStudentResults(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<Result[]> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) {
      console.warn('Student not found:', studentIdOrAdmissionNumber);
      return [];
    }

    const snapshot = await db.collection('results')
      .where('studentId', '==', studentDocId)
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: data.studentId,
        subjectId: data.subjectId,
        classId: data.classId,
        term: data.term,
        session: data.session,
        assessmentType: 'exam',
        score: data.total || 0,
        maxScore: 100,
        grade: data.grade,
        remark: data.remark,
        teacherId: data.teacherId || '',
        dateRecorded: data.createdAt || new Date()
      } as Result;
    });
  } catch (error) {
    console.error('Error getting student results:', error);
    throw error;
  }
}

export async function getStudentResultsRaw(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<any[]> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) {
      return [];
    }

    const snapshot = await db.collection('results')
      .where('studentId', '==', studentDocId)
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting student results raw:', error);
    throw error;
  }
}

// ============================================
// FEE OPERATIONS
// ============================================

export async function recordFeePayment(payment: Omit<FeePayment, 'id'>): Promise<string> {
  try {
    const studentDocId = await getStudentDocId(payment.studentId);
    if (!studentDocId) {
      throw new Error('Student not found: ' + payment.studentId);
    }

    const paymentData = { ...payment, studentId: studentDocId };
    const paymentId = await createDocument<FeePayment>('feePayments', paymentData);
    
    await updateStudentFeeStatus(studentDocId, payment.term, payment.session);
    
    await createNotification({
      userId: studentDocId,
      type: 'fee',
      title: '💰 Payment Received',
      message: `Payment of ₦${payment.amountPaid.toLocaleString()} received. Receipt: ${payment.receiptNumber}`,
      relatedId: paymentId,
      isRead: false
    });
    
    return paymentId;
  } catch (error) {
    console.error('Error recording fee payment:', error);
    throw error;
  }
}

async function updateStudentFeeStatus(
  studentDocId: string,
  term: string,
  session: string
): Promise<void> {
  // Placeholder
}

export async function getStudentFeeStatus(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<StudentFeeStatus | null> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) return null;

    const statusId = `${studentDocId}-${term}-${session.replace(/\//g, '-')}`;
    return getDocument<StudentFeeStatus>('studentFeeStatuses', statusId);
  } catch (error) {
    console.error('Error getting student fee status:', error);
    return null;
  }
}

export async function getStudentFeePayments(
  studentIdOrAdmissionNumber: string,
  term: string,
  session: string
): Promise<any[]> {
  try {
    const studentDocId = await getStudentDocId(studentIdOrAdmissionNumber);
    if (!studentDocId) {
      return [];
    }

    const snapshot = await db.collection('feePayments')
      .where('studentId', '==', studentDocId)
      .where('term', '==', term)
      .where('session', '==', session)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting student fee payments:', error);
    throw error;
  }
}

// ============================================
// ASSIGNMENT OPERATIONS
// ============================================

export async function createAssignment(assignment: Omit<Assignment, 'id'>): Promise<string> {
  return createDocument<Assignment>('assignments', assignment);
}

export async function submitAssignment(
  submission: Omit<AssignmentSubmission, 'id'>
): Promise<string> {
  return createDocument<AssignmentSubmission>('assignmentSubmissions', submission);
}

export async function getClassAssignments(
  classId: string,
  term: string,
  session: string
): Promise<Assignment[]> {
  try {
    const snapshot = await db.collection('assignments')
      .where('classId', '==', classId)
      .where('term', '==', term)
      .where('session', '==', session)
      .orderBy('dueDate', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
  } catch (error) {
    console.error('Error getting class assignments:', error);
    throw error;
  }
}

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt'>
): Promise<string> {                     // @ts-ignore
  return createDocument('notifications', notification);
}

export async function getUserNotifications(
  userId: string,
  limitCount: number = 20
): Promise<Notification[]> {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  return updateDocument('notifications', notificationId, { isRead: true });
}

// ============================================
// ANNOUNCEMENT OPERATIONS
// ============================================

export async function createAnnouncement(
  announcement: Omit<Announcement, 'id'>
): Promise<string> {
  return createDocument<Announcement>('announcements', announcement);
}

export async function getActiveAnnouncements(role?: string): Promise<Announcement[]> {
  try {
    let query = db.collection('announcements').where('isActive', '==', true);
    
    if (role) {
      query = query.where('targetAudience', 'array-contains', role);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
  } catch (error) {
    console.error('Error getting announcements:', error);
    throw error;
  }
}