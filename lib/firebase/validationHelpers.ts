// lib/firebase/validationHelpers.ts - FIXED to match registration page expectations
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { createDetailedAuditLog } from './auditLogs';
import { TeacherType } from '@/types/database';

/**
 * Validate teacher registration data
 * ✅ FIXED: Updated signature to match registration page expectations
 */
export async function validateTeacherRegistration(data: {
  teacherType: TeacherType;
  requestedClass?: { classId: string; className: string };
  requestedSubjects?: { subjectId: string; subjectName: string; classes: string[] }[];
}): Promise<{ isValid: boolean; errors: string[] }> {
  try {
    const errors: string[] = [];

    // Validate teacher type
    if (!data.teacherType) {
      errors.push('Teacher type is required');
      return { isValid: false, errors };
    }

    const validTeacherTypes: TeacherType[] = ['class_teacher', 'subject_teacher', 'both'];
    if (!validTeacherTypes.includes(data.teacherType)) {
      errors.push('Invalid teacher type');
      return { isValid: false, errors };
    }

    // Validate class teacher requirements
    if (data.teacherType === 'class_teacher' || data.teacherType === 'both') {
      if (!data.requestedClass || !data.requestedClass.classId) {
        errors.push('Class selection is required for class teachers');
        return { isValid: false, errors };
      }

      // Check if class exists
      const classExists = await validateClassExists(data.requestedClass.classId);
      if (!classExists) {
        errors.push(`Selected class "${data.requestedClass.className}" does not exist`);
        return { isValid: false, errors };
      }

      // Check if class already has a teacher
      const classDoc = await getDoc(doc(db, 'classes', data.requestedClass.classId));
      const classData = classDoc.data();
      
      if (classData?.classTeacher && classData.classTeacher.teacherId) {
        // Check if the existing teacher still exists
        const existingTeacherExists = await validateTeacherExists(classData.classTeacher.teacherId);
        if (existingTeacherExists) {
          errors.push(
            `Class "${data.requestedClass.className}" already has a class teacher assigned (${classData.classTeacher.teacherName})`
          );
          return { isValid: false, errors };
        }
        // If teacher doesn't exist anymore, allow assignment (orphaned record will be cleaned up)
      }
    }

    // Validate subject teacher requirements
    if (data.teacherType === 'subject_teacher' || data.teacherType === 'both') {
      if (!data.requestedSubjects || data.requestedSubjects.length === 0) {
        errors.push('At least one subject is required for subject teachers');
        return { isValid: false, errors };
      }

      // Validate each subject exists and has classes assigned
      for (const subjectData of data.requestedSubjects) {
        const subjectExists = await validateSubjectExists(subjectData.subjectId);
        if (!subjectExists) {
          errors.push(`Subject "${subjectData.subjectName}" does not exist`);
          continue;
        }

        if (!subjectData.classes || subjectData.classes.length === 0) {
          errors.push(`Subject "${subjectData.subjectName}" must have at least one class assigned`);
        }

        // Validate each assigned class exists
        for (const classId of subjectData.classes) {
          const classExists = await validateClassExists(classId);
          if (!classExists) {
            errors.push(`Class "${classId}" assigned to "${subjectData.subjectName}" does not exist`);
          }
        }
      }

      if (errors.length > 0) {
        return { isValid: false, errors };
      }
    }

    return { isValid: true, errors: [] };
  } catch (error: any) {
    console.error('Error validating teacher registration:', error);
    return { 
      isValid: false, 
      errors: [error.message || 'Validation failed due to an unexpected error']
    };
  }
}

/**
 * Validate parent registration data
 */
export async function validateParentRegistration(data: {
  email: string;
  phoneNumber: string;
  studentIds?: string[];
}): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Basic phone validation
    if (!data.phoneNumber || data.phoneNumber.length < 10) {
      return { valid: false, error: 'Invalid phone number' };
    }

    // Validate student IDs if provided
    if (data.studentIds && data.studentIds.length > 0) {
      for (const studentId of data.studentIds) {
        const studentExists = await validateStudentExists(studentId);
        if (!studentExists) {
          return { valid: false, error: `Student ${studentId} does not exist` };
        }
      }
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Error validating parent registration:', error);
    return { valid: false, error: error.message || 'Validation failed' };
  }
}

/**
 * Validate admin registration data
 */
export async function validateAdminRegistration(data: {
  email: string;
  department: string;
}): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Validate department
    const validDepartments = ['ceo', 'principal', 'vice_principal', 'hod', 'admin_staff'];
    if (!validDepartments.includes(data.department)) {
      return { valid: false, error: 'Invalid department' };
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Error validating admin registration:', error);
    return { valid: false, error: error.message || 'Validation failed' };
  }
}

/**
 * Quick cleanup of orphaned assignments
 * Used by admin dashboard for quick maintenance
 */
export async function quickCleanupOrphanedAssignments(): Promise<void> {
  try {
    console.log('🧹 Starting quick cleanup of orphaned assignments...');

    // Get all classes
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const validClassIds = new Set(classesSnapshot.docs.map(doc => doc.id));
    console.log(`📚 Found ${validClassIds.size} valid classes`);

    // Get all subjects
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const validSubjectIds = new Set(subjectsSnapshot.docs.map(doc => doc.id));
    console.log(`📖 Found ${validSubjectIds.size} valid subjects`);

    // Get all students
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const validStudentIds = new Set(studentsSnapshot.docs.map(doc => doc.id));
    console.log(`👨‍🎓 Found ${validStudentIds.size} valid students`);

    let cleanedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;

    // Check class teachers
    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      
      // Check if class teacher exists
      if (classData.classTeacher && classData.classTeacher.teacherId) {
        const teacherDoc = await getDoc(doc(db, 'teachers', classData.classTeacher.teacherId));
        if (!teacherDoc.exists()) {
          console.log(`⚠️ Removing orphaned class teacher from ${classDoc.id}`);
          batch.update(classDoc.ref, {
            classTeacher: null,
            classTeacherId: null,
            updatedAt: new Date()
          });
          batchCount++;
          cleanedCount++;

          if (batchCount >= 500) {
            await batch.commit();
            console.log(`✅ Committed batch of ${batchCount} operations`);
            batchCount = 0;
          }
        }
      }

      // Check subject teachers
      if (classData.subjectTeachers && Array.isArray(classData.subjectTeachers)) {
        const validSubjectTeachers = [];
        
        for (const st of classData.subjectTeachers) {
          const teacherDoc = await getDoc(doc(db, 'teachers', st.teacherId));
          if (teacherDoc.exists()) {
            validSubjectTeachers.push(st);
          } else {
            console.log(`⚠️ Removing orphaned subject teacher ${st.teacherName} from ${classDoc.id}`);
            cleanedCount++;
          }
        }

        if (validSubjectTeachers.length !== classData.subjectTeachers.length) {
          batch.update(classDoc.ref, {
            subjectTeachers: validSubjectTeachers,
            updatedAt: new Date()
          });
          batchCount++;

          if (batchCount >= 500) {
            await batch.commit();
            console.log(`✅ Committed batch of ${batchCount} operations`);
            batchCount = 0;
          }
        }
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} operations`);
    }

    console.log(`✅ Quick cleanup complete: ${cleanedCount} orphaned assignments removed`);
    
    // Create audit log
    await createDetailedAuditLog({
      userId: 'system',
      userRole: 'admin',
      userName: 'System',
      action: 'DATA_CLEANUP',
      details: `Quick cleanup: Removed ${cleanedCount} orphaned teacher assignments`,
      affectedEntity: 'classes',
      affectedEntityType: 'class',
      success: true
    });

  } catch (error: any) {
    console.error('❌ Error during quick cleanup:', error);
    throw new Error(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Validate if a student exists
 */
export async function validateStudentExists(studentId: string): Promise<boolean> {
  try {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    return studentDoc.exists();
  } catch (error) {
    console.error('Error validating student:', error);
    return false;
  }
}

/**
 * Validate if a subject exists
 */
export async function validateSubjectExists(subjectId: string): Promise<boolean> {
  try {
    const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
    return subjectDoc.exists();
  } catch (error) {
    console.error('Error validating subject:', error);
    return false;
  }
}

/**
 * Validate if a teacher exists
 */
export async function validateTeacherExists(teacherId: string): Promise<boolean> {
  try {
    const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
    return teacherDoc.exists();
  } catch (error) {
    console.error('Error validating teacher:', error);
    return false;
  }
}

/**
 * Validate if a class exists
 */
export async function validateClassExists(classId: string): Promise<boolean> {
  try {
    const classDoc = await getDoc(doc(db, 'classes', classId));
    return classDoc.exists();
  } catch (error) {
    console.error('Error validating class:', error);
    return false;
  }
}

/**
 * Clean up orphaned grades (grades for non-existent students)
 */
export async function cleanupOrphanedGrades(): Promise<number> {
  try {
    console.log('🧹 Cleaning up orphaned grades...');
    
    const gradesSnapshot = await getDocs(collection(db, 'grades'));
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const validStudentIds = new Set(studentsSnapshot.docs.map(doc => doc.id));

    let deletedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const gradeDoc of gradesSnapshot.docs) {
      const grade = gradeDoc.data();
      if (!validStudentIds.has(grade.studentId)) {
        batch.delete(gradeDoc.ref);
        deletedCount++;
        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Cleaned up ${deletedCount} orphaned grades`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned grades:', error);
    return 0;
  }
}

/**
 * Clean up orphaned attendance records
 */
export async function cleanupOrphanedAttendance(): Promise<number> {
  try {
    console.log('🧹 Cleaning up orphaned attendance records...');
    
    const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const validStudentIds = new Set(studentsSnapshot.docs.map(doc => doc.id));

    let deletedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const attendanceDoc of attendanceSnapshot.docs) {
      const attendance = attendanceDoc.data();
      if (!validStudentIds.has(attendance.studentId)) {
        batch.delete(attendanceDoc.ref);
        deletedCount++;
        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Cleaned up ${deletedCount} orphaned attendance records`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned attendance:', error);
    return 0;
  }
}

/**
 * Validate student subject enrollment
 * Check if a student is enrolled in a specific subject
 */
export async function validateStudentSubjectEnrollment(
  studentId: string,
  subjectId: string
): Promise<boolean> {
  try {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    if (!studentDoc.exists()) {
      return false;
    }

    const student = studentDoc.data();
    const subjects = student.subjects || [];
    return subjects.includes(subjectId);
  } catch (error) {
    console.error('Error validating student subject enrollment:', error);
    return false;
  }
}

/**
 * Get students enrolled in a specific subject within a class
 */
export async function getStudentsEnrolledInSubject(
  classId: string,
  subjectId: string
): Promise<string[]> {
  try {
    const studentsQuery = query(
      collection(db, 'students'),
      where('classId', '==', classId)
    );

    const studentsSnapshot = await getDocs(studentsQuery);
    const enrolledStudents: string[] = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      const subjects = student.subjects || [];
      
      if (subjects.includes(subjectId)) {
        enrolledStudents.push(studentDoc.id);
      }
    }

    return enrolledStudents;
  } catch (error) {
    console.error('Error getting students enrolled in subject:', error);
    return [];
  }
}