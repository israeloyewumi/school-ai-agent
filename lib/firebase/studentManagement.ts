// lib/firebase/studentManagement.ts - Student CRUD Operations (FIXED)

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from './config';
import { Student } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';
import { enrollStudentInClass } from './classManagement'; // ✅ FIXED: Added import

/**
 * Generate unique admission number
 */
export async function generateAdmissionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const allStudents = await getAllStudents();
  const nextNumber = allStudents.length + 1;
  return `STU${year}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Create a new student record
 */
export async function createStudent(studentData: Partial<Student>): Promise<Student> {
  try {
    // Generate student ID if not provided
    const studentId = studentData.id || `student_${Date.now()}`;
    
    // Generate admission number if not provided
    const admissionNumber = studentData.admissionNumber || await generateAdmissionNumber();

    // Build student document (filter out undefined values for Firestore)
    const studentDoc: any = {
      id: studentId,
      studentId,
      userId: studentData.userId || studentId,
      admissionNumber,
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      gender: studentData.gender || 'male',
      dateOfBirth: studentData.dateOfBirth || new Date(),
      age: studentData.age || 0,
      classId: studentData.classId || '',
      className: studentData.className || '',
      parentId: studentData.parentId || studentData.guardianId || '',
      guardianId: studentData.guardianId || studentData.parentId || '',
      address: studentData.address || '',
      city: studentData.city || '',
      state: studentData.state || '',
      admissionDate: studentData.admissionDate || new Date(),
      emergencyContact: studentData.emergencyContact || '',
      emergencyPhone: studentData.emergencyPhone || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have values
    if (studentData.medicalConditions) {
      studentDoc.medicalConditions = studentData.medicalConditions;
    }
    if (studentData.allergies) {
      studentDoc.allergies = studentData.allergies;
    }
    if (studentData.bloodGroup) {
      studentDoc.bloodGroup = studentData.bloodGroup;
    }
    if (studentData.previousSchool) {
      studentDoc.previousSchool = studentData.previousSchool;
    }

    // Save to Firestore
    const studentRef = doc(db, 'students', studentId);
    await setDoc(studentRef, studentDoc);

    console.log('✅ Student record created:', studentId, admissionNumber);

    // Enroll student in class (NOW WORKS - function imported above)
    if (studentDoc.classId) {
      await enrollStudentInClass(
        studentDoc.classId,
        studentId,
        `${studentDoc.firstName} ${studentDoc.lastName}`,
        'system',
        'System'
      );
    }

    return studentDoc as Student;
  } catch (error) {
    console.error('❌ Error creating student:', error);
    throw error;
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const studentDoc = await getDoc(doc(db, 'students', studentId));
    
    if (!studentDoc.exists()) {
      return null;
    }

    return studentDoc.data() as Student;
  } catch (error) {
    console.error('❌ Error fetching student:', error);
    throw error;
  }
}

/**
 * Get student by admission number
 */
export async function getStudentByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
  try {
    const q = query(
      collection(db, 'students'),
      where('admissionNumber', '==', admissionNumber)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Student;
  } catch (error) {
    console.error('❌ Error fetching student by admission number:', error);
    throw error;
  }
}

/**
 * Get all students
 */
export async function getAllStudents(): Promise<Student[]> {
  try {
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    return studentsSnapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    throw error;
  }
}

/**
 * Get students by class
 */
export async function getStudentsByClass(classId: string): Promise<Student[]> {
  try {
    const q = query(
      collection(db, 'students'),
      where('classId', '==', classId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching students by class:', error);
    throw error;
  }
}

/**
 * Get students by parent
 */
export async function getStudentsByParent(parentId: string): Promise<Student[]> {
  try {
    const q = query(
      collection(db, 'students'),
      where('parentId', '==', parentId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching students by parent:', error);
    throw error;
  }
}

/**
 * Get active students
 */
export async function getActiveStudents(): Promise<Student[]> {
  try {
    const q = query(
      collection(db, 'students'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching active students:', error);
    throw error;
  }
}

/**
 * Update student information
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<Student>,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      throw new Error('Student not found');
    }

    const beforeData = studentDoc.data();
    const oldClassId = beforeData.classId;
    const newClassId = updates.classId;

    await updateDoc(studentRef, {
      ...updates,
      updatedAt: new Date()
    });

    // If class changed, update class rosters
    if (newClassId && newClassId !== oldClassId) {
      // Remove from old class
      if (oldClassId) {
        const { removeStudentFromClass } = await import('./classManagement');
        await removeStudentFromClass(oldClassId, studentId, performedBy, performerName);
      }
      
      // Add to new class
      await enrollStudentInClass(
        newClassId,
        studentId,
        `${beforeData.firstName} ${beforeData.lastName}`,
        performedBy,
        performerName
      );
    }

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Updated student information for ${beforeData.firstName} ${beforeData.lastName}`,
      affectedEntity: studentId,
      affectedEntityType: 'student',
      beforeData,
      afterData: updates,
      success: true
    });

    console.log('✅ Student updated:', studentId);
  } catch (error) {
    console.error('❌ Error updating student:', error);
    throw error;
  }
}

/**
 * Delete student (deactivate)
 */
export async function deleteStudent(
  studentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      throw new Error('Student not found');
    }

    const studentData = studentDoc.data();

    // Soft delete - just deactivate
    await updateDoc(studentRef, {
      isActive: false,
      updatedAt: new Date()
    });

    // Remove from class roster
    if (studentData.classId) {
      const { removeStudentFromClass } = await import('./classManagement');
      await removeStudentFromClass(
        studentData.classId,
        studentId,
        performedBy,
        performerName
      );
    }

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'DATA_DELETED',
      details: `Deactivated student ${studentData.firstName} ${studentData.lastName}`,
      affectedEntity: studentId,
      affectedEntityType: 'student',
      beforeData: studentData,
      success: true
    });

    console.log('✅ Student deactivated:', studentId);
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    throw error;
  }
}

/**
 * Transfer student to another class
 */
export async function transferStudent(
  studentId: string,
  newClassId: string,
  newClassName: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const student = await getStudentById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const oldClassId = student.classId;

    // Update student's class
    await updateStudent(
      studentId,
      {
        classId: newClassId,
        className: newClassName
      },
      performedBy,
      performerName
    );

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Transferred ${student.firstName} ${student.lastName} from ${student.className} to ${newClassName}`,
      affectedEntity: studentId,
      affectedEntityType: 'student',
      beforeData: { classId: oldClassId, className: student.className },
      afterData: { classId: newClassId, className: newClassName },
      success: true
    });

    console.log('✅ Student transferred:', studentId, 'to', newClassName);
  } catch (error) {
    console.error('❌ Error transferring student:', error);
    throw error;
  }
}

/**
 * Get student statistics
 */
export async function getStudentStats() {
  try {
    const allStudents = await getAllStudents();
    const activeStudents = allStudents.filter(s => s.isActive);

    // Count by gender
    const maleCount = activeStudents.filter(s => s.gender === 'male').length;
    const femaleCount = activeStudents.filter(s => s.gender === 'female').length;

    // Count by level
    const primaryCount = activeStudents.filter(s => {
      const grade = parseInt(s.className.match(/\d+/)?.[0] || '0');
      return grade >= 1 && grade <= 6;
    }).length;

    const jsCount = activeStudents.filter(s => {
      const grade = parseInt(s.className.match(/\d+/)?.[0] || '0');
      return grade >= 7 && grade <= 9;
    }).length;

    const ssCount = activeStudents.filter(s => {
      const grade = parseInt(s.className.match(/\d+/)?.[0] || '0');
      return grade >= 10 && grade <= 12;
    }).length;

    return {
      totalStudents: allStudents.length,
      activeStudents: activeStudents.length,
      inactiveStudents: allStudents.length - activeStudents.length,
      maleStudents: maleCount,
      femaleStudents: femaleCount,
      primaryLevel: primaryCount,
      juniorSecondary: jsCount,
      seniorSecondary: ssCount
    };
  } catch (error) {
    console.error('❌ Error fetching student stats:', error);
    throw error;
  }
}