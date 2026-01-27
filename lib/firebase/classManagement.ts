// lib/firebase/classManagement.ts - Class CRUD Operations (CLIENT SDK - COMPLETE)

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
  writeBatch,
  serverTimestamp
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
        capacity: 40,
        currentStudentCount: 0,
        totalStudents: 0,
        studentIds: [],
        currentTerm: 'First Term',
        currentSession: '2025/2026',
        academicYear: '2025/2026',
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
 * ✅ ENHANCED: Check if class has a valid class teacher
 */
export async function classHasClassTeacher(classId: string): Promise<boolean> {
  try {
    const classDoc = await getClassById(classId);
    
    if (!classDoc) {
      console.log(`❌ Class ${classId} not found`);
      return false;
    }
    
    const hasValidTeacher = !!(
      classDoc.classTeacher && 
      classDoc.classTeacher !== null && 
      classDoc.classTeacher.teacherId &&
      typeof classDoc.classTeacher.teacherId === 'string' &&
      classDoc.classTeacher.teacherId.trim() !== ''
    );

    console.log(`🔍 Class ${classId} has valid teacher: ${hasValidTeacher}`, classDoc.classTeacher);
    return hasValidTeacher;
  } catch (error) {
    console.error('❌ Error checking class teacher:', error);
    return false;
  }
}

/**
 * ✅ ENHANCED: Get available classes (no class teacher assigned)
 */
export async function getAvailableClasses(): Promise<Class[]> {
  try {
    const allClasses = await getAllClassesFromDB();
    
    return allClasses.filter(c => {
      if (!c.classTeacher) return true;
      if (c.classTeacher === null) return true;
      if (!c.classTeacher.teacherId) return true;
      if (typeof c.classTeacher.teacherId !== 'string') return true;
      if (c.classTeacher.teacherId.trim() === '') return true;
      return false;
    });
  } catch (error) {
    console.error('❌ Error fetching available classes:', error);
    throw error;
  }
}

/**
 * ✅ COMPLETELY REWRITTEN: Assign class teacher to a class
 * NOW WITH BULLETPROOF AUTO-CLEANUP AND VALIDATION
 */
export async function assignClassTeacher(
  classId: string,
  teacherId: string,
  teacherName: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    console.log(`\n🔧 Starting class teacher assignment...`);
    console.log(`   Class: ${classId}`);
    console.log(`   Teacher: ${teacherName} (${teacherId})`);
    
    // Step 1: Get class document
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error(`Class ${classId} not found`);
    }
    console.log(`✅ Class found: ${classDoc.className}`);

    // Step 2: 🔧 CRITICAL FIX - AUTO-CLEANUP RUNS FIRST, ALWAYS
    console.log(`\n🧹 Running auto-cleanup on ${classDoc.className}...`);
    
    let needsCleanup = false;
    let cleanupReason = '';

    if (classDoc.classTeacher !== undefined) {
      console.log(`   Found existing classTeacher data:`, classDoc.classTeacher);
      
      if (classDoc.classTeacher === null) {
        needsCleanup = true;
        cleanupReason = 'classTeacher is null';
        console.log(`   ⚠️ ${cleanupReason}`);
      }
      else if (!classDoc.classTeacher.teacherId) {
        needsCleanup = true;
        cleanupReason = 'classTeacher has no teacherId';
        console.log(`   ⚠️ ${cleanupReason}`);
      }
      else if (typeof classDoc.classTeacher.teacherId === 'string' && 
               classDoc.classTeacher.teacherId.trim() === '') {
        needsCleanup = true;
        cleanupReason = 'classTeacher teacherId is empty';
        console.log(`   ⚠️ ${cleanupReason}`);
      }
      else {
        console.log(`   🔍 Checking if teacher ${classDoc.classTeacher.teacherId} still exists...`);
        const { getTeacherById } = await import('./teacherManagement');
        const teacherExists = await getTeacherById(classDoc.classTeacher.teacherId);
        
        if (!teacherExists) {
          needsCleanup = true;
          cleanupReason = `teacher ${classDoc.classTeacher.teacherName} no longer exists (orphaned)`;
          console.log(`   ⚠️ Orphaned: ${cleanupReason}`);
        } else {
          console.log(`   ❌ Valid teacher already assigned: ${classDoc.classTeacher.teacherName}`);
          throw new Error(
            `Class ${classDoc.className} already has a class teacher assigned: ${classDoc.classTeacher.teacherName}. ` +
            `Please remove the existing teacher first or choose a different class.`
          );
        }
      }
    } else {
      console.log(`   ℹ️ No classTeacher field found (good - class is available)`);
    }

    // Step 3: Execute cleanup if needed
    if (needsCleanup) {
      console.log(`\n🧹 CLEANING UP: ${cleanupReason}`);
      const classRef = doc(db, 'classes', classId);
      await updateDoc(classRef, {
        classTeacher: null,
        classTeacherId: null,
        updatedAt: new Date()
      });
      console.log(`✅ Cleanup complete - removed invalid teacher data`);
    }

    // Step 4: Double-check after cleanup
    console.log(`\n🔍 Final validation check...`);
    const hasTeacherNow = await classHasClassTeacher(classId);
    if (hasTeacherNow) {
      console.log(`❌ ERROR: Class still shows as having a teacher after cleanup!`);
      throw new Error(
        `Class ${classId} validation failed. Please contact system administrator.`
      );
    }
    console.log(`✅ Validation passed - class is available for assignment`);

    // Step 5: Proceed with new assignment
    console.log(`\n💾 Assigning ${teacherName} to ${classDoc.className}...`);
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

    console.log(`✅ Class teacher successfully assigned!`);

    // Step 6: Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'CLASS_TEACHER_ASSIGNED',
      details: `Assigned ${teacherName} as class teacher for ${classDoc.className}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      afterData: { classTeacher },
      success: true
    });

    console.log(`\n✅ COMPLETE: ${teacherName} is now the class teacher for ${classDoc.className}\n`);
  } catch (error: any) {
    console.error('\n❌ Error assigning class teacher:', error.message);
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
    const teacherName = classData.classTeacher?.teacherName || 'Unknown Teacher';
    
    await updateDoc(classRef, {
      classTeacher: null,
      classTeacherId: null,
      updatedAt: new Date()
    });

    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'CLASS_TEACHER_REMOVED',
      details: `Removed ${teacherName} as class teacher from ${classData.className}`,
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
 * ✅ REWRITTEN: Assign subject teacher to a class with auto-cleanup
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
    console.log(`\n🔧 Assigning subject teacher: ${subjectName} in class ${classId}`);
    
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Auto-cleanup: Remove orphaned or invalid subject teachers
    console.log(`🧹 Cleaning up invalid subject teachers...`);
    const { getTeacherById } = await import('./teacherManagement');
    const cleanedSubjectTeachers: SubjectTeacherAssignment[] = [];
    
    if (classDoc.subjectTeachers && Array.isArray(classDoc.subjectTeachers)) {
      for (const st of classDoc.subjectTeachers) {
        if (!st.teacherId || typeof st.teacherId !== 'string' || st.teacherId.trim() === '') {
          console.log(`   🧹 Removing subject teacher with invalid teacherId`);
          continue;
        }
        
        const teacherExists = await getTeacherById(st.teacherId);
        if (teacherExists) {
          cleanedSubjectTeachers.push(st);
        } else {
          console.log(`   🧹 Removing orphaned subject teacher: ${st.teacherName}`);
        }
      }
    }

    console.log(`✅ Cleanup complete. Valid subject teachers: ${cleanedSubjectTeachers.length}`);

    // Check if subject already assigned
    const existingAssignment = cleanedSubjectTeachers.find(
      st => st.subjectId === subjectId
    );

    if (existingAssignment) {
      throw new Error(
        `Subject ${subjectName} is already taught by ${existingAssignment.teacherName} in ${classDoc.className}. ` +
        `Please remove the existing assignment first.`
      );
    }

    const newAssignment: SubjectTeacherAssignment = {
      subjectId,
      subjectName,
      teacherId,
      teacherName,
      assignedDate: new Date()
    };

    const updatedSubjectTeachers = [...cleanedSubjectTeachers, newAssignment];

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      subjectTeachers: updatedSubjectTeachers,
      updatedAt: new Date()
    });

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

    console.log(`✅ Subject teacher assigned: ${teacherName} -> ${subjectName} in ${classDoc.className}\n`);
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

    const removedTeacher = classDoc.subjectTeachers.find(
      st => st.subjectId === subjectId
    );

    const updatedSubjectTeachers = classDoc.subjectTeachers.filter(
      st => st.subjectId !== subjectId
    );

    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      subjectTeachers: updatedSubjectTeachers,
      updatedAt: new Date()
    });

    if (removedTeacher) {
      await createDetailedAuditLog({
        userId: performedBy,
        userRole: 'admin',
        userName: performerName,
        action: 'SUBJECT_TEACHER_REMOVED',
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
 * Enroll student in class
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

    if (classDoc.studentIds.includes(studentId)) {
      console.log('⚠️ Student already enrolled in this class');
      return;
    }

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
 * Remove student from class roster
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