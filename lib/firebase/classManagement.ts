// lib/firebase/classManagement.ts - Class CRUD Operations (UPDATED with Student Enrollment)

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
import { Class, ClassTeacher, SubjectTeacherAssignment } from '@/types/database';
import { ALL_CLASSES } from '@/lib/config/schoolData';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Initialize all classes in Firestore (run once during setup)
 */
export async function initializeAllClasses(): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const classInfo of ALL_CLASSES) {
      const classDoc: Class = {
        id: classInfo.classId,
        classId: classInfo.classId,
        name: classInfo.className,
        className: classInfo.className,
        grade: classInfo.grade,
        section: classInfo.section,
        level: classInfo.level,
        subjectTeachers: [],
        capacity: 40, // Default capacity
        currentStudentCount: 0,
        totalStudents: 0,
        studentIds: [],
        currentTerm: 'First Term',
        currentSession: '2024/2025',
        academicYear: '2024/2025',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const classRef = doc(db, 'classes', classInfo.classId);
      batch.set(classRef, classDoc);
    }

    await batch.commit();
    console.log('✅ All classes initialized');
  } catch (error) {
    console.error('❌ Error initializing classes:', error);
    throw error;
  }
}

/**
 * Get class by ID
 */
export async function getClassById(classId: string): Promise<Class | null> {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    
    if (!classDoc.exists()) {
      return null;
    }

    return classDoc.data() as Class;
  } catch (error) {
    console.error('❌ Error fetching class:', error);
    throw error;
  }
}

/**
 * Get all classes
 */
export async function getAllClassesFromDB(): Promise<Class[]> {
  try {
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    return classesSnapshot.docs.map(doc => doc.data() as Class);
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    throw error;
  }
}

/**
 * Get classes by level
 */
export async function getClassesByLevel(
  level: 'Primary' | 'Junior Secondary' | 'Senior Secondary'
): Promise<Class[]> {
  try {
    const q = query(
      collection(db, 'classes'),
      where('level', '==', level)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Class);
  } catch (error) {
    console.error('❌ Error fetching classes by level:', error);
    throw error;
  }
}

/**
 * Get classes by grade
 */
export async function getClassesByGrade(grade: number): Promise<Class[]> {
  try {
    const q = query(
      collection(db, 'classes'),
      where('grade', '==', grade)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Class);
  } catch (error) {
    console.error('❌ Error fetching classes by grade:', error);
    throw error;
  }
}

/**
 * Check if class has a class teacher
 */
export async function classHasClassTeacher(classId: string): Promise<boolean> {
  try {
    const classDoc = await getClassById(classId);
    return classDoc?.classTeacher !== undefined;
  } catch (error) {
    console.error('❌ Error checking class teacher:', error);
    throw error;
  }
}

/**
 * Get available classes (no class teacher assigned)
 */
export async function getAvailableClasses(): Promise<Class[]> {
  try {
    const allClasses = await getAllClassesFromDB();
    return allClasses.filter(c => !c.classTeacher);
  } catch (error) {
    console.error('❌ Error fetching available classes:', error);
    throw error;
  }
}

/**
 * Assign class teacher to a class
 */
export async function assignClassTeacher(
  classId: string,
  teacherId: string,
  teacherName: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    // Check if class already has a teacher
    const hasTeacher = await classHasClassTeacher(classId);
    if (hasTeacher) {
      throw new Error(`Class ${classId} already has a class teacher assigned`);
    }

    const classTeacher: ClassTeacher = {
      teacherId,
      teacherName,
      assignedDate: new Date()
    };

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      classTeacher,
      classTeacherId: teacherId,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'CLASS_TEACHER_ASSIGNED',
      details: `Assigned ${teacherName} as class teacher for ${classId}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      afterData: { classTeacher },
      success: true
    });

    console.log('✅ Class teacher assigned:', classId);
  } catch (error) {
    console.error('❌ Error assigning class teacher:', error);
    throw error;
  }
}

/**
 * Remove class teacher from a class
 */
export async function removeClassTeacher(
  classId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }

    const classData = classDoc.data() as Class;
    
    await updateDoc(classRef, {
      classTeacher: null,
      classTeacherId: null,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'CLASS_TEACHER_ASSIGNED',
      details: `Removed ${classData.classTeacher?.teacherName} as class teacher from ${classId}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      beforeData: { classTeacher: classData.classTeacher },
      success: true
    });

    console.log('✅ Class teacher removed:', classId);
  } catch (error) {
    console.error('❌ Error removing class teacher:', error);
    throw error;
  }
}

/**
 * Assign subject teacher to a class
 */
export async function assignSubjectTeacher(
  classId: string,
  subjectId: string,
  subjectName: string,
  teacherId: string,
  teacherName: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Check if this subject is already assigned to a teacher
    const existingAssignment = classDoc.subjectTeachers.find(
      st => st.subjectId === subjectId
    );

    if (existingAssignment) {
      throw new Error(
        `Subject ${subjectName} is already taught by ${existingAssignment.teacherName} in this class`
      );
    }

    const newAssignment: SubjectTeacherAssignment = {
      subjectId,
      subjectName,
      teacherId,
      teacherName,
      assignedDate: new Date()
    };

    const updatedSubjectTeachers = [...classDoc.subjectTeachers, newAssignment];

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      subjectTeachers: updatedSubjectTeachers,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'SUBJECT_TEACHER_ASSIGNED',
      details: `Assigned ${teacherName} to teach ${subjectName} in ${classDoc.className}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      afterData: { assignment: newAssignment },
      success: true
    });

    console.log('✅ Subject teacher assigned:', classId, subjectId);
  } catch (error) {
    console.error('❌ Error assigning subject teacher:', error);
    throw error;
  }
}

/**
 * Remove subject teacher from a class
 */
export async function removeSubjectTeacher(
  classId: string,
  subjectId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    const updatedSubjectTeachers = classDoc.subjectTeachers.filter(
      st => st.subjectId !== subjectId
    );

    const removedTeacher = classDoc.subjectTeachers.find(
      st => st.subjectId === subjectId
    );

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      subjectTeachers: updatedSubjectTeachers,
      updatedAt: new Date()
    });

    // Create audit log
    if (removedTeacher) {
      await createDetailedAuditLog({
        userId: performedBy,
        userRole: 'admin',
        userName: performerName,
        action: 'SUBJECT_TEACHER_ASSIGNED',
        details: `Removed ${removedTeacher.teacherName} from teaching ${removedTeacher.subjectName} in ${classDoc.className}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        beforeData: { assignment: removedTeacher },
        success: true
      });
    }

    console.log('✅ Subject teacher removed:', classId, subjectId);
  } catch (error) {
    console.error('❌ Error removing subject teacher:', error);
    throw error;
  }
}

/**
 * NEW: Enroll student in class (add to class roster)
 */
export async function enrollStudentInClass(
  classId: string,
  studentId: string,
  studentName: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Check if student already enrolled
    if (classDoc.studentIds.includes(studentId)) {
      console.log('⚠️ Student already enrolled in this class');
      return;
    }

    // Check class capacity
    if (classDoc.currentStudentCount >= classDoc.capacity) {
      throw new Error(`Class ${classDoc.className} is at full capacity (${classDoc.capacity} students)`);
    }

    const updatedStudentIds = [...classDoc.studentIds, studentId];
    const newCount = updatedStudentIds.length;

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      studentIds: updatedStudentIds,
      currentStudentCount: newCount,
      totalStudents: newCount,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: performedBy === 'system' ? 'admin' : 'parent',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Enrolled student ${studentName} in ${classDoc.className}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      afterData: { studentId, studentName, newCount },
      success: true
    });

    console.log('✅ Student enrolled in class:', studentId, classId);
  } catch (error) {
    console.error('❌ Error enrolling student:', error);
    throw error;
  }
}

/**
 * NEW: Remove student from class roster
 */
export async function removeStudentFromClass(
  classId: string,
  studentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    const updatedStudentIds = classDoc.studentIds.filter(id => id !== studentId);
    const newCount = updatedStudentIds.length;

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      studentIds: updatedStudentIds,
      currentStudentCount: newCount,
      totalStudents: newCount,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'DATA_DELETED',
      details: `Removed student from ${classDoc.className}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      beforeData: { studentCount: classDoc.currentStudentCount },
      afterData: { studentCount: newCount },
      success: true
    });

    console.log('✅ Student removed from class:', studentId, classId);
  } catch (error) {
    console.error('❌ Error removing student from class:', error);
    throw error;
  }
}

/**
 * Update class information
 */
export async function updateClass(
  classId: string,
  updates: Partial<Class>
): Promise<void> {
  try {
    const classRef = doc(db, 'classes', classId);
    
    await updateDoc(classRef, {
      ...updates,
      updatedAt: new Date()
    });

    console.log('✅ Class updated:', classId);
  } catch (error) {
    console.error('❌ Error updating class:', error);
    throw error;
  }
}

/**
 * Get class statistics
 */
export async function getClassStats(classId: string) {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    return {
      className: classDoc.className,
      totalStudents: classDoc.totalStudents,
      capacity: classDoc.capacity,
      hasClassTeacher: !!classDoc.classTeacher,
      classTeacherName: classDoc.classTeacher?.teacherName,
      numberOfSubjectTeachers: classDoc.subjectTeachers.length,
      subjectsCovered: classDoc.subjectTeachers.map(st => st.subjectName),
      occupancyRate: (classDoc.totalStudents / classDoc.capacity) * 100
    };
  } catch (error) {
    console.error('❌ Error fetching class stats:', error);
    throw error;
  }
}

/**
 * Get all classes taught by a teacher
 */
export async function getClassesByTeacher(teacherId: string): Promise<Class[]> {
  try {
    const allClasses = await getAllClassesFromDB();
    
    return allClasses.filter(cls => 
      cls.classTeacher?.teacherId === teacherId ||
      cls.subjectTeachers.some(st => st.teacherId === teacherId)
    );
  } catch (error) {
    console.error('❌ Error fetching classes by teacher:', error);
    throw error;
  }
}