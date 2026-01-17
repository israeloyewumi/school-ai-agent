// lib/firebase/subjectManagement.ts - Subject CRUD Operations

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
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { Subject, SubjectTeacher } from '@/types/database';
import { NIGERIAN_SUBJECTS } from '@/lib/config/schoolData';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Initialize all subjects in Firestore (run once during setup)
 */
export async function initializeAllSubjects(): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const subjectInfo of NIGERIAN_SUBJECTS) {
      const subjectDoc: Subject = {
        id: subjectInfo.subjectId,
        subjectId: subjectInfo.subjectId,
        name: subjectInfo.subjectName,
        subjectName: subjectInfo.subjectName,
        code: subjectInfo.subjectId.toUpperCase(),
        category: subjectInfo.category,
        isCore: subjectInfo.isCore,
        teachers: [],
        applicableLevels: subjectInfo.applicableLevels,
        applicableGrades: subjectInfo.applicableGrades,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const subjectRef = doc(db, 'subjects', subjectInfo.subjectId);
      batch.set(subjectRef, subjectDoc);
    }

    await batch.commit();
    console.log('✅ All subjects initialized');
  } catch (error) {
    console.error('❌ Error initializing subjects:', error);
    throw error;
  }
}

/**
 * Get subject by ID
 */
export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  try {
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    
    if (!subjectDoc.exists()) {
      return null;
    }

    return subjectDoc.data() as Subject;
  } catch (error) {
    console.error('❌ Error fetching subject:', error);
    throw error;
  }
}

/**
 * Get all subjects
 */
export async function getAllSubjects(): Promise<Subject[]> {
  try {
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    return subjectsSnapshot.docs.map(doc => doc.data() as Subject);
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
    throw error;
  }
}

/**
 * Get subjects by category
 */
export async function getSubjectsByCategory(
  category: 'Core' | 'Science' | 'Arts' | 'Commercial' | 'Vocational' | 'Religious'
): Promise<Subject[]> {
  try {
    const q = query(
      collection(db, 'subjects'),
      where('category', '==', category)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Subject);
  } catch (error) {
    console.error('❌ Error fetching subjects by category:', error);
    throw error;
  }
}

/**
 * Get subjects for a specific grade
 */
export async function getSubjectsForGrade(grade: number): Promise<Subject[]> {
  try {
    const allSubjects = await getAllSubjects();
    return allSubjects.filter(subject => 
      subject.applicableGrades.includes(grade)
    );
  } catch (error) {
    console.error('❌ Error fetching subjects for grade:', error);
    throw error;
  }
}

/**
 * Get core subjects for a grade
 */
export async function getCoreSubjectsForGrade(grade: number): Promise<Subject[]> {
  try {
    const allSubjects = await getAllSubjects();
    return allSubjects.filter(subject => 
      subject.isCore && subject.applicableGrades.includes(grade)
    );
  } catch (error) {
    console.error('❌ Error fetching core subjects:', error);
    throw error;
  }
}

/**
 * Add teacher to subject
 */
export async function addTeacherToSubject(
  subjectId: string,
  teacherId: string,
  teacherName: string,
  classes: string[],
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const subjectDoc = await getSubjectById(subjectId);
    if (!subjectDoc) {
      throw new Error('Subject not found');
    }

    // Check if teacher is already assigned to this subject
    const existingTeacher = subjectDoc.teachers.find(
      t => t.teacherId === teacherId
    );

    if (existingTeacher) {
      // Update classes for existing teacher
      const updatedTeachers = subjectDoc.teachers.map(t =>
        t.teacherId === teacherId
          ? { ...t, classes: Array.from(new Set([...t.classes, ...classes])) }
          : t
      );

      await updateDoc(doc(db, 'subjects', subjectId), {
        teachers: updatedTeachers,
        updatedAt: new Date()
      });
    } else {
      // Add new teacher
      const newTeacher: SubjectTeacher = {
        teacherId,
        teacherName,
        classes,
        assignedDate: new Date()
      };

      const updatedTeachers = [...subjectDoc.teachers, newTeacher];

      await updateDoc(doc(db, 'subjects', subjectId), {
        teachers: updatedTeachers,
        updatedAt: new Date()
      });
    }

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'SUBJECT_TEACHER_ASSIGNED',
      details: `Assigned ${teacherName} to teach ${subjectDoc.subjectName}`,
      affectedEntity: subjectId,
      affectedEntityType: 'subject',
      afterData: { teacherId, teacherName, classes },
      success: true
    });

    console.log('✅ Teacher added to subject:', subjectId, teacherId);
  } catch (error) {
    console.error('❌ Error adding teacher to subject:', error);
    throw error;
  }
}

/**
 * Remove teacher from subject
 */
export async function removeTeacherFromSubject(
  subjectId: string,
  teacherId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const subjectDoc = await getSubjectById(subjectId);
    if (!subjectDoc) {
      throw new Error('Subject not found');
    }

    const removedTeacher = subjectDoc.teachers.find(t => t.teacherId === teacherId);
    const updatedTeachers = subjectDoc.teachers.filter(t => t.teacherId !== teacherId);

    await updateDoc(doc(db, 'subjects', subjectId), {
      teachers: updatedTeachers,
      updatedAt: new Date()
    });

    // Create audit log
    if (removedTeacher) {
      await createDetailedAuditLog({
        userId: performedBy,
        userRole: 'admin',
        userName: performerName,
        action: 'SUBJECT_TEACHER_ASSIGNED',
        details: `Removed ${removedTeacher.teacherName} from teaching ${subjectDoc.subjectName}`,
        affectedEntity: subjectId,
        affectedEntityType: 'subject',
        beforeData: { teacher: removedTeacher },
        success: true
      });
    }

    console.log('✅ Teacher removed from subject:', subjectId, teacherId);
  } catch (error) {
    console.error('❌ Error removing teacher from subject:', error);
    throw error;
  }
}

/**
 * Update teacher's classes for a subject
 */
export async function updateTeacherClassesForSubject(
  subjectId: string,
  teacherId: string,
  newClasses: string[],
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const subjectDoc = await getSubjectById(subjectId);
    if (!subjectDoc) {
      throw new Error('Subject not found');
    }

    const updatedTeachers = subjectDoc.teachers.map(t =>
      t.teacherId === teacherId
        ? { ...t, classes: newClasses }
        : t
    );

    await updateDoc(doc(db, 'subjects', subjectId), {
      teachers: updatedTeachers,
      updatedAt: new Date()
    });

    console.log('✅ Teacher classes updated for subject:', subjectId, teacherId);
  } catch (error) {
    console.error('❌ Error updating teacher classes:', error);
    throw error;
  }
}

/**
 * Get all subjects taught by a teacher
 */
export async function getSubjectsByTeacher(teacherId: string): Promise<Subject[]> {
  try {
    const allSubjects = await getAllSubjects();
    
    return allSubjects.filter(subject =>
      subject.teachers.some(t => t.teacherId === teacherId)
    );
  } catch (error) {
    console.error('❌ Error fetching subjects by teacher:', error);
    throw error;
  }
}

/**
 * Get teachers for a subject
 */
export async function getTeachersForSubject(subjectId: string): Promise<SubjectTeacher[]> {
  try {
    const subject = await getSubjectById(subjectId);
    if (!subject) {
      return [];
    }

    return subject.teachers;
  } catch (error) {
    console.error('❌ Error fetching teachers for subject:', error);
    throw error;
  }
}

/**
 * Check if a teacher teaches a specific subject
 */
export async function teacherTeachesSubject(
  teacherId: string,
  subjectId: string
): Promise<boolean> {
  try {
    const subject = await getSubjectById(subjectId);
    if (!subject) {
      return false;
    }

    return subject.teachers.some(t => t.teacherId === teacherId);
  } catch (error) {
    console.error('❌ Error checking if teacher teaches subject:', error);
    throw error;
  }
}

/**
 * Get subject statistics
 */
export async function getSubjectStats(subjectId: string) {
  try {
    const subject = await getSubjectById(subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    const totalTeachers = subject.teachers.length;
    const totalClasses = new Set(
      subject.teachers.flatMap(t => t.classes)
    ).size;

    return {
      subjectName: subject.subjectName,
      category: subject.category,
      isCore: subject.isCore,
      totalTeachers,
      totalClasses,
      teachers: subject.teachers.map(t => ({
        name: t.teacherName,
        classesCount: t.classes.length
      })),
      applicableGrades: subject.applicableGrades,
      applicableLevels: subject.applicableLevels
    };
  } catch (error) {
    console.error('❌ Error fetching subject stats:', error);
    throw error;
  }
}

/**
 * Update subject information
 */
export async function updateSubject(
  subjectId: string,
  updates: Partial<Subject>
): Promise<void> {
  try {
    const subjectRef = doc(db, 'subjects', subjectId);
    
    await updateDoc(subjectRef, {
      ...updates,
      updatedAt: new Date()
    });

    console.log('✅ Subject updated:', subjectId);
  } catch (error) {
    console.error('❌ Error updating subject:', error);
    throw error;
  }
}