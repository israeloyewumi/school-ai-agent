// lib/firebase/teacherReallocation.ts - Teacher Re-Allocation System
// Comprehensive backend functions for managing teacher assignments

import {
  doc,
  updateDoc,
  writeBatch,
  getDoc,
  getDocs,
  collection
} from 'firebase/firestore';
import { db } from './config';
import { Teacher, Class, Subject } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';
import { 
  getTeacherById, 
  getAllTeachers,
  getActiveTeachers 
} from './teacherManagement';
import { 
  getClassById, 
  getAllClassesFromDB,
  removeClassTeacher,
  assignClassTeacher,
  removeSubjectTeacher,
  assignSubjectTeacher
} from './classManagement';
import { 
  getAllSubjects,
  removeTeacherFromSubject,
  addTeacherToSubject
} from './subjectManagement';

// ============================================
// TEACHER ASSIGNMENT OVERVIEW
// ============================================

export interface TeacherAssignmentOverview {
  teacherId: string;
  teacherName: string;
  email: string;
  teacherType: 'class_teacher' | 'subject_teacher' | 'both';
  isActive: boolean;
  
  // Class teacher assignment
  isClassTeacher: boolean;
  assignedClass?: {
    classId: string;
    className: string;
    assignedDate: Date;
    studentCount: number;
  };
  
  // Subject assignments
  isSubjectTeacher: boolean;
  subjects: {
    subjectId: string;
    subjectName: string;
    classes: {
      classId: string;
      className: string;
      studentCount: number;
    }[];
  }[];
  
  totalClasses: number;
  totalSubjects: number;
}

/**
 * Get complete assignment overview for a teacher
 */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignmentOverview | null> {
  try {
    // ✅ Add validation
    if (!teacherId || typeof teacherId !== 'string') {
      console.warn('⚠️ Invalid teacherId provided:', teacherId);
      return null;
    }

    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      return null;
    }

    const allClasses = await getAllClassesFromDB();

    // Build overview
    const overview: TeacherAssignmentOverview = {
      teacherId: teacher.teacherId,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.email,
      teacherType: teacher.teacherType,
      isActive: teacher.isActive,
      isClassTeacher: teacher.isClassTeacher,
      isSubjectTeacher: teacher.isSubjectTeacher,
      subjects: [],
      totalClasses: 0,
      totalSubjects: 0
    };

    // Get class teacher assignment
    if (teacher.isClassTeacher && teacher.assignedClass) {
      // ✅ Add validation for assignedClass
      if (teacher.assignedClass.classId) {
        const classDoc = allClasses.find(c => c.classId === teacher.assignedClass!.classId);
        if (classDoc) {
          overview.assignedClass = {
            classId: classDoc.classId,
            className: classDoc.className,
            assignedDate: teacher.assignedClass.assignedDate,
            studentCount: classDoc.currentStudentCount
          };
          overview.totalClasses = 1;
        }
      }
    }

    // Get subject assignments
    if (teacher.isSubjectTeacher && teacher.subjects.length > 0) {
      overview.subjects = teacher.subjects
        .filter(sub => sub.subjectId && sub.classes) // ✅ Filter out invalid subjects
        .map(sub => {
          const classesForSubject = sub.classes
            .filter(classId => classId) // ✅ Filter out invalid classIds
            .map(classId => {
              const classDoc = allClasses.find(c => c.classId === classId);
              return {
                classId,
                className: classDoc?.className || classId,
                studentCount: classDoc?.currentStudentCount || 0
              };
            });

          return {
            subjectId: sub.subjectId,
            subjectName: sub.subjectName,
            classes: classesForSubject
          };
        });

      // Count unique classes where teacher teaches subjects
      const uniqueClassIds = new Set(
        teacher.subjects
          .filter(s => s.classes) // ✅ Filter out invalid
          .flatMap(s => s.classes.filter(id => id)) // ✅ Filter out undefined classIds
      );
      overview.totalClasses += uniqueClassIds.size;
      overview.totalSubjects = overview.subjects.length;
    }

    return overview;
  } catch (error) {
    console.error('❌ Error getting teacher assignments:', error);
    throw error;
  }
}

/**
 * Get all teachers with their assignments
 */
export async function getAllTeacherAssignments(): Promise<TeacherAssignmentOverview[]> {
  try {
    const teachers = await getActiveTeachers();
    const assignments: TeacherAssignmentOverview[] = [];

    for (const teacher of teachers) {
      // ✅ Add defensive check for valid teacherId
      if (!teacher || !teacher.teacherId) {
        console.warn('⚠️ Skipping teacher with invalid teacherId:', teacher);
        continue;
      }

      try {
        const overview = await getTeacherAssignments(teacher.teacherId);
        if (overview) {
          assignments.push(overview);
        }
      } catch (error) {
        console.error(`❌ Error getting assignments for teacher ${teacher.teacherId}:`, error);
        // Continue with other teachers even if one fails
      }
    }

    return assignments;
  } catch (error) {
    console.error('❌ Error getting all teacher assignments:', error);
    throw error;
  }
}

// ============================================
// CLASS-CENTRIC VIEW
// ============================================

export interface ClassAssignmentOverview {
  classId: string;
  className: string;
  grade: number;
  level: string;
  studentCount: number;
  
  // Class teacher
  classTeacher?: {
    teacherId: string;
    teacherName: string;
    assignedDate: Date;
  };
  
  // Subject teachers
  subjectTeachers: {
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    assignedDate: Date;
  }[];
  
  totalSubjectsCovered: number;
  hasClassTeacher: boolean;
}

/**
 * Get assignment overview for a class
 */
export async function getClassAssignments(classId: string): Promise<ClassAssignmentOverview | null> {
  try {
    const classDoc = await getClassById(classId);
    if (!classDoc) {
      return null;
    }

    const overview: ClassAssignmentOverview = {
      classId: classDoc.classId,
      className: classDoc.className,
      grade: classDoc.grade,
      level: classDoc.level,
      studentCount: classDoc.currentStudentCount,
      hasClassTeacher: !!classDoc.classTeacher,
      subjectTeachers: classDoc.subjectTeachers.map(st => ({
        subjectId: st.subjectId,
        subjectName: st.subjectName,
        teacherId: st.teacherId,
        teacherName: st.teacherName,
        assignedDate: st.assignedDate
      })),
      totalSubjectsCovered: classDoc.subjectTeachers.length
    };

    if (classDoc.classTeacher) {
      overview.classTeacher = {
        teacherId: classDoc.classTeacher.teacherId,
        teacherName: classDoc.classTeacher.teacherName,
        assignedDate: classDoc.classTeacher.assignedDate
      };
    }

    return overview;
  } catch (error) {
    console.error('❌ Error getting class assignments:', error);
    throw error;
  }
}

/**
 * Get all classes with their assignments
 */
export async function getAllClassAssignments(): Promise<ClassAssignmentOverview[]> {
  try {
    const classes = await getAllClassesFromDB();
    const assignments: ClassAssignmentOverview[] = [];

    for (const cls of classes) {
      // ✅ Add defensive check for valid classId
      if (!cls || !cls.classId) {
        console.warn('⚠️ Skipping class with invalid classId:', cls);
        continue;
      }

      try {
        const overview = await getClassAssignments(cls.classId);
        if (overview) {
          assignments.push(overview);
        }
      } catch (error) {
        console.error(`❌ Error getting assignments for class ${cls.classId}:`, error);
        // Continue with other classes even if one fails
      }
    }

    return assignments;
  } catch (error) {
    console.error('❌ Error getting all class assignments:', error);
    throw error;
  }
}

// ============================================
// RE-ASSIGNMENT OPERATIONS
// ============================================

/**
 * Change class teacher for a class
 */
export async function reassignClassTeacher(
  classId: string,
  oldTeacherId: string,
  newTeacherId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log(`🔄 Reassigning class teacher for ${classId}`);
    console.log(`   From: ${oldTeacherId} → To: ${newTeacherId}`);

    const batch = writeBatch(db);

    // Get teacher details
    const oldTeacher = await getTeacherById(oldTeacherId);
    const newTeacher = await getTeacherById(newTeacherId);
    const classDoc = await getClassById(classId);

    if (!oldTeacher || !newTeacher || !classDoc) {
      throw new Error('Teacher or class not found');
    }

    // Step 1: Remove old teacher's class assignment
    console.log('📝 Step 1: Removing old teacher assignment...');
    const oldTeacherRef = doc(db, 'teachers', oldTeacherId);
    batch.update(oldTeacherRef, {
      assignedClass: null,
      classTeacherId: null,
      isClassTeacher: oldTeacher.isSubjectTeacher ? oldTeacher.isSubjectTeacher : false,
      teacherType: oldTeacher.isSubjectTeacher ? 'subject_teacher' : 'class_teacher',
      updatedAt: new Date()
    });

    // Step 2: Assign new teacher to class
    console.log('📝 Step 2: Assigning new teacher...');
    const newTeacherRef = doc(db, 'teachers', newTeacherId);
    batch.update(newTeacherRef, {
      assignedClass: {
        classId: classDoc.classId,
        className: classDoc.className,
        assignedDate: new Date()
      },
      classTeacherId: classDoc.classId,
      isClassTeacher: true,
      teacherType: newTeacher.isSubjectTeacher ? 'both' : 'class_teacher',
      updatedAt: new Date()
    });

    // Step 3: Update class record
    console.log('📝 Step 3: Updating class record...');
    const classRef = doc(db, 'classes', classId);
    batch.update(classRef, {
      classTeacher: {
        teacherId: newTeacherId,
        teacherName: `${newTeacher.firstName} ${newTeacher.lastName}`,
        assignedDate: new Date()
      },
      classTeacherId: newTeacherId,
      updatedAt: new Date()
    });

    await batch.commit();
    console.log('✅ Batch committed successfully');

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'CLASS_TEACHER_ASSIGNED',
      details: `Reassigned class teacher for ${classDoc.className}: ${oldTeacher.firstName} ${oldTeacher.lastName} → ${newTeacher.firstName} ${newTeacher.lastName}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      beforeData: { teacherId: oldTeacherId, teacherName: `${oldTeacher.firstName} ${oldTeacher.lastName}` },
      afterData: { teacherId: newTeacherId, teacherName: `${newTeacher.firstName} ${newTeacher.lastName}` },
      success: true
    });

    console.log('✅ Class teacher reassigned successfully');
  } catch (error) {
    console.error('❌ Error reassigning class teacher:', error);
    throw error;
  }
}

/**
 * Add subject to teacher's teaching load
 */
export async function assignSubjectToTeacher(
  teacherId: string,
  subjectId: string,
  classIds: string[],
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log(`📚 Assigning subject ${subjectId} to teacher ${teacherId}`);
    console.log(`   Classes: ${classIds.join(', ')}`);

    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const allSubjects = await getAllSubjects();
    const subject = allSubjects.find(s => s.subjectId === subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    const batch = writeBatch(db);

    // Update teacher's subjects array
    const existingSubject = teacher.subjects.find(s => s.subjectId === subjectId);
    let updatedSubjects;

    if (existingSubject) {
      // Add new classes to existing subject
      const uniqueClasses = Array.from(new Set([...existingSubject.classes, ...classIds]));
      updatedSubjects = teacher.subjects.map(s => 
        s.subjectId === subjectId 
          ? { ...s, classes: uniqueClasses }
          : s
      );
    } else {
      // Add new subject
      updatedSubjects = [
        ...teacher.subjects,
        {
          subjectId,
          subjectName: subject.subjectName,
          classes: classIds
        }
      ];
    }

    const teacherRef = doc(db, 'teachers', teacherId);
    batch.update(teacherRef, {
      subjects: updatedSubjects,
      isSubjectTeacher: true,
      teacherType: teacher.isClassTeacher ? 'both' : 'subject_teacher',
      updatedAt: new Date()
    });

    await batch.commit();

    // Assign to each class
    for (const classId of classIds) {
      await assignSubjectTeacher(
        classId,
        subjectId,
        subject.subjectName,
        teacherId,
        `${teacher.firstName} ${teacher.lastName}`,
        adminId,
        adminName
      );
    }

    // Add teacher to subject's teacher list
    await addTeacherToSubject(
      subjectId,
      teacherId,
      `${teacher.firstName} ${teacher.lastName}`,
      classIds,
      adminId,
      adminName
    );

    console.log('✅ Subject assigned to teacher successfully');
  } catch (error) {
    console.error('❌ Error assigning subject to teacher:', error);
    throw error;
  }
}

/**
 * Remove subject from teacher's teaching load
 */
export async function removeSubjectFromTeacher(
  teacherId: string,
  subjectId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log(`🗑️ Removing subject ${subjectId} from teacher ${teacherId}`);

    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const subjectToRemove = teacher.subjects.find(s => s.subjectId === subjectId);
    if (!subjectToRemove) {
      console.log('⚠️ Subject not assigned to this teacher');
      return;
    }

    // Remove from all classes
    for (const classId of subjectToRemove.classes) {
      await removeSubjectTeacher(classId, subjectId, adminId, adminName);
    }

    // Remove from subject's teacher list
    await removeTeacherFromSubject(subjectId, teacherId, adminId, adminName);

    // Update teacher record
    const updatedSubjects = teacher.subjects.filter(s => s.subjectId !== subjectId);
    const teacherRef = doc(db, 'teachers', teacherId);
    
    await updateDoc(teacherRef, {
      subjects: updatedSubjects,
      isSubjectTeacher: updatedSubjects.length > 0,
      teacherType: updatedSubjects.length === 0 && !teacher.isClassTeacher 
        ? 'class_teacher' 
        : teacher.isClassTeacher && updatedSubjects.length === 0
        ? 'class_teacher'
        : teacher.isClassTeacher
        ? 'both'
        : 'subject_teacher',
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'SUBJECT_TEACHER_ASSIGNED',
      details: `Removed ${subjectToRemove.subjectName} from ${teacher.firstName} ${teacher.lastName}'s teaching load`,
      affectedEntity: teacherId,
      affectedEntityType: 'teacher',
      beforeData: { subject: subjectToRemove },
      success: true
    });

    console.log('✅ Subject removed from teacher successfully');
  } catch (error) {
    console.error('❌ Error removing subject from teacher:', error);
    throw error;
  }
}

/**
 * Remove teacher from class (both class teacher and subject teacher roles)
 */
export async function removeTeacherFromClass(
  teacherId: string,
  classId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log(`🗑️ Removing teacher ${teacherId} from class ${classId}`);

    const teacher = await getTeacherById(teacherId);
    const classDoc = await getClassById(classId);

    if (!teacher || !classDoc) {
      throw new Error('Teacher or class not found');
    }

    const batch = writeBatch(db);

    // Remove class teacher assignment if applicable
    if (teacher.isClassTeacher && teacher.assignedClass?.classId === classId) {
      const teacherRef = doc(db, 'teachers', teacherId);
      batch.update(teacherRef, {
        assignedClass: null,
        classTeacherId: null,
        isClassTeacher: false,
        teacherType: teacher.isSubjectTeacher ? 'subject_teacher' : 'class_teacher',
        updatedAt: new Date()
      });

      const classRef = doc(db, 'classes', classId);
      batch.update(classRef, {
        classTeacher: null,
        classTeacherId: null,
        updatedAt: new Date()
      });
    }

    // Remove subject teacher assignments for this class
    if (teacher.isSubjectTeacher) {
      const updatedSubjects = teacher.subjects.map(sub => ({
        ...sub,
        classes: sub.classes.filter(cId => cId !== classId)
      })).filter(sub => sub.classes.length > 0);

      const teacherRef = doc(db, 'teachers', teacherId);
      batch.update(teacherRef, {
        subjects: updatedSubjects,
        isSubjectTeacher: updatedSubjects.length > 0,
        updatedAt: new Date()
      });

      // Update class's subject teachers
      const updatedClassSubjectTeachers = classDoc.subjectTeachers.filter(
        st => st.teacherId !== teacherId
      );

      const classRef = doc(db, 'classes', classId);
      batch.update(classRef, {
        subjectTeachers: updatedClassSubjectTeachers,
        updatedAt: new Date()
      });
    }

    await batch.commit();

    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'CLASS_TEACHER_ASSIGNED',
      details: `Removed ${teacher.firstName} ${teacher.lastName} from ${classDoc.className}`,
      affectedEntity: classId,
      affectedEntityType: 'class',
      beforeData: { teacherId, className: classDoc.className },
      success: true
    });

    console.log('✅ Teacher removed from class successfully');
  } catch (error) {
    console.error('❌ Error removing teacher from class:', error);
    throw error;
  }
}

// ============================================
// AVAILABILITY CHECKS
// ============================================

/**
 * Get available teachers for class teacher role
 */
export async function getAvailableClassTeachers(): Promise<Teacher[]> {
  try {
    const allTeachers = await getActiveTeachers();
    
    // Filter teachers who are not currently class teachers
    return allTeachers.filter(t => 
      !t.isClassTeacher || !t.assignedClass
    );
  } catch (error) {
    console.error('❌ Error getting available class teachers:', error);
    throw error;
  }
}

/**
 * Get available teachers for a subject
 */
export async function getAvailableSubjectTeachers(subjectId: string): Promise<Teacher[]> {
  try {
    const allTeachers = await getActiveTeachers();
    
    // All active teachers can potentially teach any subject
    // Admin decides if they're qualified
    return allTeachers;
  } catch (error) {
    console.error('❌ Error getting available subject teachers:', error);
    throw error;
  }
}

/**
 * Check if teacher can be assigned to a class
 */
export async function canAssignTeacherToClass(
  teacherId: string,
  classId: string
): Promise<{ canAssign: boolean; reason?: string }> {
  try {
    const teacher = await getTeacherById(teacherId);
    const classDoc = await getClassById(classId);

    if (!teacher) {
      return { canAssign: false, reason: 'Teacher not found' };
    }

    if (!classDoc) {
      return { canAssign: false, reason: 'Class not found' };
    }

    if (!teacher.isActive) {
      return { canAssign: false, reason: 'Teacher is not active' };
    }

    // Can always assign as subject teacher
    // For class teacher, check if already assigned elsewhere
    if (teacher.isClassTeacher && teacher.assignedClass && teacher.assignedClass.classId !== classId) {
      return { 
        canAssign: false, 
        reason: `Teacher is already class teacher for ${teacher.assignedClass.className}` 
      };
    }

    return { canAssign: true };
  } catch (error) {
    console.error('❌ Error checking teacher assignment:', error);
    return { canAssign: false, reason: 'Error checking assignment' };
  }
}