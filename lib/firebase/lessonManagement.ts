// lib/firebase/lessonManagement.ts - Lesson Plans & Classworks CRUD

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from './config';
import { createDetailedAuditLog } from './auditLogs';

// ============================================
// TYPES
// ============================================

export interface LessonPlan {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  objectives: string[];
  introduction: string;
  mainContent: string[];
  activities: string[];
  conclusion: string;
  assessment: string;
  originalNote?: string; // Store the original note if needed
  createdAt: Date;
  updatedAt: Date;
  term: string;
  session: string;
}

export interface ClassWork {
  id: string;
  lessonPlanId: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  title: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  questions: string[]; // 10 questions
  dueDate?: Date;
  assignedDate: Date;
  isPublished: boolean;
  createdAt: Date;
  term: string;
  session: string;
}

export interface StudentClassWorkSubmission {
  id: string;
  classWorkId: string;
  studentId: string;
  studentName: string;
  answers: string[]; // 10 answers corresponding to questions
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

// ============================================
// LESSON PLAN OPERATIONS
// ============================================

/**
 * Create a new lesson plan
 */
export async function createLessonPlan(
  lessonPlanData: Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'lessonPlans'), {
      ...lessonPlanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: lessonPlanData.teacherId,
      userRole: 'teacher',
      userName: lessonPlanData.teacherName,
      action: 'LESSON_PLAN_CREATED',
      details: `Created lesson plan: ${lessonPlanData.topic} for ${lessonPlanData.className}`,
      affectedEntity: docRef.id,
      affectedEntityType: 'lesson_plan',
      success: true
    });

    console.log('✅ Lesson plan created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating lesson plan:', error);
    throw error;
  }
}

/**
 * Get lesson plan by ID
 */
export async function getLessonPlanById(planId: string): Promise<LessonPlan | null> {
  try {
    const docRef = doc(db, 'lessonPlans', planId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as LessonPlan;
  } catch (error) {
    console.error('❌ Error getting lesson plan:', error);
    throw error;
  }
}

/**
 * Get all lesson plans for a teacher
 */
export async function getLessonPlansByTeacher(
  teacherId: string,
  term?: string,
  session?: string
): Promise<LessonPlan[]> {
  try {
    let q = query(
      collection(db, 'lessonPlans'),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );

    if (term) {
      q = query(q, where('term', '==', term));
    }
    if (session) {
      q = query(q, where('session', '==', session));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as LessonPlan;
    });
  } catch (error) {
    console.error('❌ Error getting teacher lesson plans:', error);
    throw error;
  }
}

/**
 * Get lesson plans for a specific class and subject
 */
export async function getLessonPlansByClassAndSubject(
  classId: string,
  subjectId: string,
  term: string,
  session: string
): Promise<LessonPlan[]> {
  try {
    const q = query(
      collection(db, 'lessonPlans'),
      where('classId', '==', classId),
      where('subjectId', '==', subjectId),
      where('term', '==', term),
      where('session', '==', session),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as LessonPlan;
    });
  } catch (error) {
    console.error('❌ Error getting lesson plans by class/subject:', error);
    throw error;
  }
}

/**
 * Update lesson plan
 */
export async function updateLessonPlan(
  planId: string,
  updates: Partial<LessonPlan>,
  teacherId: string,
  teacherName: string
): Promise<void> {
  try {
    const docRef = doc(db, 'lessonPlans', planId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    await createDetailedAuditLog({
      userId: teacherId,
      userRole: 'teacher',
      userName: teacherName,
      action: 'LESSON_PLAN_UPDATED',
      details: `Updated lesson plan: ${planId}`,
      affectedEntity: planId,
      affectedEntityType: 'lesson_plan',
      success: true
    });

    console.log('✅ Lesson plan updated:', planId);
  } catch (error) {
    console.error('❌ Error updating lesson plan:', error);
    throw error;
  }
}

/**
 * Delete lesson plan (and associated classworks)
 */
export async function deleteLessonPlan(
  planId: string,
  teacherId: string,
  teacherName: string
): Promise<void> {
  try {
    // First delete all associated classworks
    const classWorks = await getClassWorksByLessonPlan(planId);
    for (const cw of classWorks) {
      await deleteClassWork(cw.id, teacherId, teacherName);
    }

    // Then delete the lesson plan
    const docRef = doc(db, 'lessonPlans', planId);
    await deleteDoc(docRef);

    await createDetailedAuditLog({
      userId: teacherId,
      userRole: 'teacher',
      userName: teacherName,
      action: 'LESSON_PLAN_DELETED',
      details: `Deleted lesson plan: ${planId}`,
      affectedEntity: planId,
      affectedEntityType: 'lesson_plan',
      success: true
    });

    console.log('✅ Lesson plan deleted:', planId);
  } catch (error) {
    console.error('❌ Error deleting lesson plan:', error);
    throw error;
  }
}

// ============================================
// CLASSWORK OPERATIONS
// ============================================

/**
 * Create a classwork
 */
export async function createClassWork(
  classWorkData: Omit<ClassWork, 'id' | 'createdAt' | 'assignedDate'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'classWorks'), {
      ...classWorkData,
      assignedDate: Timestamp.now(),
      createdAt: Timestamp.now()
    });

    await createDetailedAuditLog({
      userId: classWorkData.teacherId,
      userRole: 'teacher',
      userName: classWorkData.teacherName,
      action: 'CLASSWORK_CREATED',
      details: `Created classwork: ${classWorkData.title} (${classWorkData.difficulty}) for ${classWorkData.className}`,
      affectedEntity: docRef.id,
      affectedEntityType: 'classwork',
      success: true
    });

    console.log('✅ Classwork created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating classwork:', error);
    throw error;
  }
}

/**
 * Create multiple classworks at once (for the 6 generated classworks)
 */
export async function createMultipleClassWorks(
  classWorks: Omit<ClassWork, 'id' | 'createdAt' | 'assignedDate'>[]
): Promise<string[]> {
  try {
    const createdIds: string[] = [];

    for (const classWork of classWorks) {
      const id = await createClassWork(classWork);
      createdIds.push(id);
    }

    console.log(`✅ Created ${createdIds.length} classworks`);
    return createdIds;
  } catch (error) {
    console.error('❌ Error creating multiple classworks:', error);
    throw error;
  }
}

/**
 * Get classwork by ID
 */
export async function getClassWorkById(classWorkId: string): Promise<ClassWork | null> {
  try {
    const docRef = doc(db, 'classWorks', classWorkId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      assignedDate: data.assignedDate?.toDate(),
      dueDate: data.dueDate?.toDate(),
      createdAt: data.createdAt?.toDate()
    } as ClassWork;
  } catch (error) {
    console.error('❌ Error getting classwork:', error);
    throw error;
  }
}

/**
 * Get all classworks for a lesson plan
 */
export async function getClassWorksByLessonPlan(lessonPlanId: string): Promise<ClassWork[]> {
  try {
    const q = query(
      collection(db, 'classWorks'),
      where('lessonPlanId', '==', lessonPlanId),
      orderBy('difficulty', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        assignedDate: data.assignedDate?.toDate(),
        dueDate: data.dueDate?.toDate(),
        createdAt: data.createdAt?.toDate()
      } as ClassWork;
    });
  } catch (error) {
    console.error('❌ Error getting classworks by lesson plan:', error);
    throw error;
  }
}

/**
 * Get classworks for a class
 */
export async function getClassWorksByClass(
  classId: string,
  subjectId?: string,
  publishedOnly: boolean = true
): Promise<ClassWork[]> {
  try {
    let q = query(
      collection(db, 'classWorks'),
      where('classId', '==', classId),
      orderBy('assignedDate', 'desc')
    );

    if (publishedOnly) {
      q = query(q, where('isPublished', '==', true));
    }

    if (subjectId) {
      q = query(q, where('subjectId', '==', subjectId));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        assignedDate: data.assignedDate?.toDate(),
        dueDate: data.dueDate?.toDate(),
        createdAt: data.createdAt?.toDate()
      } as ClassWork;
    });
  } catch (error) {
    console.error('❌ Error getting classworks by class:', error);
    throw error;
  }
}

/**
 * Publish/unpublish classwork
 */
export async function toggleClassWorkPublish(
  classWorkId: string,
  isPublished: boolean,
  teacherId: string,
  teacherName: string
): Promise<void> {
  try {
    const docRef = doc(db, 'classWorks', classWorkId);
    
    await updateDoc(docRef, {
      isPublished,
      updatedAt: Timestamp.now()
    });

    await createDetailedAuditLog({
      userId: teacherId,
      userRole: 'teacher',
      userName: teacherName,
      action: isPublished ? 'CLASSWORK_PUBLISHED' : 'CLASSWORK_UNPUBLISHED',
      details: `${isPublished ? 'Published' : 'Unpublished'} classwork: ${classWorkId}`,
      affectedEntity: classWorkId,
      affectedEntityType: 'classwork',
      success: true
    });

    console.log(`✅ Classwork ${isPublished ? 'published' : 'unpublished'}:`, classWorkId);
  } catch (error) {
    console.error('❌ Error toggling classwork publish:', error);
    throw error;
  }
}

/**
 * Delete classwork
 */
export async function deleteClassWork(
  classWorkId: string,
  teacherId: string,
  teacherName: string
): Promise<void> {
  try {
    const docRef = doc(db, 'classWorks', classWorkId);
    await deleteDoc(docRef);

    await createDetailedAuditLog({
      userId: teacherId,
      userRole: 'teacher',
      userName: teacherName,
      action: 'CLASSWORK_DELETED',
      details: `Deleted classwork: ${classWorkId}`,
      affectedEntity: classWorkId,
      affectedEntityType: 'classwork',
      success: true
    });

    console.log('✅ Classwork deleted:', classWorkId);
  } catch (error) {
    console.error('❌ Error deleting classwork:', error);
    throw error;
  }
}

// ============================================
// STUDENT SUBMISSION OPERATIONS
// ============================================

/**
 * Submit classwork answers
 */
export async function submitClassWork(
  submission: Omit<StudentClassWorkSubmission, 'id' | 'submittedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'classWorkSubmissions'), {
      ...submission,
      submittedAt: Timestamp.now()
    });

    console.log('✅ Classwork submitted:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error submitting classwork:', error);
    throw error;
  }
}

/**
 * Get student submissions for a classwork
 */
export async function getClassWorkSubmissions(
  classWorkId: string
): Promise<StudentClassWorkSubmission[]> {
  try {
    const q = query(
      collection(db, 'classWorkSubmissions'),
      where('classWorkId', '==', classWorkId),
      orderBy('submittedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate(),
        gradedAt: data.gradedAt?.toDate()
      } as StudentClassWorkSubmission;
    });
  } catch (error) {
    console.error('❌ Error getting classwork submissions:', error);
    throw error;
  }
}

/**
 * Get student's submission for a specific classwork
 */
export async function getStudentSubmission(
  classWorkId: string,
  studentId: string
): Promise<StudentClassWorkSubmission | null> {
  try {
    const q = query(
      collection(db, 'classWorkSubmissions'),
      where('classWorkId', '==', classWorkId),
      where('studentId', '==', studentId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ...data,
      submittedAt: data.submittedAt?.toDate(),
      gradedAt: data.gradedAt?.toDate()
    } as StudentClassWorkSubmission;
  } catch (error) {
    console.error('❌ Error getting student submission:', error);
    throw error;
  }
}

/**
 * Grade a student's classwork submission
 */
export async function gradeClassWorkSubmission(
  submissionId: string,
  grade: number,
  feedback: string,
  teacherId: string,
  teacherName: string
): Promise<void> {
  try {
    const docRef = doc(db, 'classWorkSubmissions', submissionId);
    
    await updateDoc(docRef, {
      grade,
      feedback,
      gradedBy: teacherId,
      gradedAt: Timestamp.now()
    });

    await createDetailedAuditLog({
      userId: teacherId,
      userRole: 'teacher',
      userName: teacherName,
      action: 'CLASSWORK_GRADED',
      details: `Graded classwork submission: ${submissionId} (Grade: ${grade})`,
      affectedEntity: submissionId,
      affectedEntityType: 'classwork_submission',
      success: true
    });

    console.log('✅ Classwork graded:', submissionId);
  } catch (error) {
    console.error('❌ Error grading classwork:', error);
    throw error;
  }
}

// ============================================
// STATISTICS & ANALYTICS
// ============================================

/**
 * Get lesson plan statistics for a teacher
 */
export async function getTeacherLessonStats(
  teacherId: string,
  term: string,
  session: string
) {
  try {
    const lessonPlans = await getLessonPlansByTeacher(teacherId, term, session);
    
    const stats = {
      totalLessonPlans: lessonPlans.length,
      subjectsCount: new Set(lessonPlans.map(lp => lp.subjectId)).size,
      classesCount: new Set(lessonPlans.map(lp => lp.classId)).size,
      totalClassWorks: 0,
      publishedClassWorks: 0
    };

    // Count classworks
    for (const plan of lessonPlans) {
      const classWorks = await getClassWorksByLessonPlan(plan.id);
      stats.totalClassWorks += classWorks.length;
      stats.publishedClassWorks += classWorks.filter(cw => cw.isPublished).length;
    }

    return stats;
  } catch (error) {
    console.error('❌ Error getting lesson stats:', error);
    throw error;
  }
}

/**
 * Get classwork completion statistics
 */
export async function getClassWorkCompletionStats(classWorkId: string) {
  try {
    const classWork = await getClassWorkById(classWorkId);
    if (!classWork) {
      throw new Error('Classwork not found');
    }

    const submissions = await getClassWorkSubmissions(classWorkId);
    
    const graded = submissions.filter(s => s.grade !== undefined).length;
    const avgGrade = graded > 0
      ? submissions
          .filter(s => s.grade !== undefined)
          .reduce((sum, s) => sum + (s.grade || 0), 0) / graded
      : 0;

    return {
      classWorkId,
      title: classWork.title,
      difficulty: classWork.difficulty,
      totalSubmissions: submissions.length,
      gradedSubmissions: graded,
      pendingGrading: submissions.length - graded,
      averageGrade: Math.round(avgGrade * 10) / 10
    };
  } catch (error) {
    console.error('❌ Error getting classwork stats:', error);
    throw error;
  }
}