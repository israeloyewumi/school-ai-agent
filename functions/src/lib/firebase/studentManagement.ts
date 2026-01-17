// functions/src/lib/firebase/studentManagement.ts - ADMIN SDK VERSION
import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

import { Student } from '../../types/database';
import { createDetailedAuditLog } from './auditLogs';
import { enrollStudentInClass } from './classManagement';
import {
  getClassById,
  getCoreSubjectsForGrade,
  getJSSElectiveRequirements,
  getSubjectById
} from '../config/schoolData';

/**
 * Safely convert date values to Date objects
 */
function safeDate(value: any): Date {
  if (!value) return new Date();
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }
  
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  return new Date();
}

/**
 * Helper function to extract grade from class ID
 */
function getGradeFromClassId(classId: string): number {
  const classInfo = getClassById(classId);
  return classInfo?.grade || 0;
}

/**
 * 🛠 DEBUG: Validate student subject selection based on grade level
 */
function validateSubjectSelection(studentData: Partial<Student>): void {
  console.log('🔍 ===== SUBJECT VALIDATION DEBUG START =====');
  console.log('📋 Student Data:', {
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    classId: studentData.classId,
    subjects: studentData.subjects,
    subjectsCount: studentData.subjects?.length || 0,
    academicTrack: studentData.academicTrack,
    tradeSubject: studentData.tradeSubject
  });

  const grade = getGradeFromClassId(studentData.classId || '');
  console.log('📊 Grade extracted:', grade);
  
  if (!grade) {
    console.error('❌ Invalid class ID:', studentData.classId);
    throw new Error('Invalid class ID');
  }

  // Skip validation if no subjects provided
  if (!studentData.subjects || studentData.subjects.length === 0) {
    console.warn('⚠️ No subjects provided for student. Skipping validation.');
    console.log('🔍 ===== SUBJECT VALIDATION DEBUG END =====');
    return;
  }

  console.log('✅ Subjects array provided, proceeding with validation...');

  // PRIMARY LEVEL (Grades 1-6)
  if (grade >= 1 && grade <= 6) {
    console.log('📚 PRIMARY LEVEL VALIDATION (Grades 1-6)');
    const coreSubjects = getCoreSubjectsForGrade(grade);
    console.log('📖 Core subjects for grade', grade, ':', {
      count: coreSubjects.length,
      subjects: coreSubjects.map(s => ({ id: s.subjectId, name: s.subjectName }))
    });
    
    console.log('👉 Student selected subjects:', studentData.subjects);
    console.log('🔢 Student subjects count:', studentData.subjects.length);
    console.log('🔢 Expected core subjects count:', coreSubjects.length);
    
    if (studentData.subjects.length !== coreSubjects.length) {
      console.error('❌ VALIDATION FAILED: Subject count mismatch');
      throw new Error(
        `Primary students (Grade ${grade}) must select all ${coreSubjects.length} core subjects. ` +
        `Currently selected: ${studentData.subjects.length}`
      );
    }

    const validSubjectIds = coreSubjects.map(s => s.subjectId);
    console.log('✅ Valid subject IDs for this grade:', validSubjectIds);
    
    const invalidSubjects = studentData.subjects.filter(id => !validSubjectIds.includes(id));
    console.log('🔍 Invalid subjects check:', {
      invalidSubjects,
      count: invalidSubjects.length
    });
    
    if (invalidSubjects.length > 0) {
      console.error('❌ VALIDATION FAILED: Invalid subjects detected:', invalidSubjects);
      throw new Error(
        `Invalid subjects selected for Grade ${grade}: ${invalidSubjects.join(', ')}`
      );
    }

    console.log(`✅ Primary (Grade ${grade}) subject validation passed: ${studentData.subjects.length} core subjects`);
    console.log('🔍 ===== SUBJECT VALIDATION DEBUG END =====');
  }
  
  // JUNIOR SECONDARY (Grades 7-9)
  else if (grade >= 7 && grade <= 9) {
    console.log('📚 JUNIOR SECONDARY VALIDATION (Grades 7-9)');
    
    const requirements = getJSSElectiveRequirements();
    console.log('📋 JSS Requirements:', requirements);
    
    const coreSubjects = getCoreSubjectsForGrade(grade);
    console.log('📖 Core subjects for JSS Grade', grade, ':', {
      count: coreSubjects.length,
      subjects: coreSubjects.map(s => ({ 
        id: s.subjectId, 
        name: s.subjectName, 
        isCore: s.isCore,
        isElective: s.isElective 
      }))
    });
    
    const coreCount = coreSubjects.length;
    const totalCount = studentData.subjects.length;
    const electiveCount = totalCount - coreCount;
    
    console.log('🔢 JSS Subject Count Analysis:', {
      coreCount,
      totalCount,
      electiveCount,
      calculatedAs: `${totalCount} - ${coreCount} = ${electiveCount}`,
      requiredElectives: `${requirements.min}-${requirements.max}`
    });
    
    const coreSubjectIds = coreSubjects.map(s => s.subjectId);
    const studentCoreSubjects = studentData.subjects.filter(id => coreSubjectIds.includes(id));
    const studentElectiveSubjects = studentData.subjects.filter(id => !coreSubjectIds.includes(id));
    
    console.log('📊 Subject Breakdown:', {
      studentCore: {
        count: studentCoreSubjects.length,
        subjects: studentCoreSubjects
      },
      studentElectives: {
        count: studentElectiveSubjects.length,
        subjects: studentElectiveSubjects
      }
    });
    
    if (electiveCount < requirements.min || electiveCount > requirements.max) {
      console.error('❌ VALIDATION FAILED: Elective count out of range');
      throw new Error(
        `JSS students (Grade ${grade}) must select ${requirements.min}-${requirements.max} elective subjects. ` +
        `Currently selected: ${electiveCount} electives (${totalCount} total subjects)`
      );
    }

    const missingCoreSubjects = coreSubjectIds.filter(id => !studentData.subjects!.includes(id));
    
    if (missingCoreSubjects.length > 0) {
      const missingNames = missingCoreSubjects.map(id => {
        const subject = getSubjectById(id);
        return subject?.subjectName || id;
      });
      console.error('❌ VALIDATION FAILED: Missing core subjects:', missingNames);
      
      throw new Error(
        `Missing core subjects for Grade ${grade}: ${missingNames.join(', ')}`
      );
    }

    console.log(`✅ JSS (Grade ${grade}) subject validation passed: ${coreCount} core + ${electiveCount} electives`);
    console.log('🔍 ===== SUBJECT VALIDATION DEBUG END =====');
  }
  
  // SENIOR SECONDARY (Grades 10-12)
  else if (grade >= 10 && grade <= 12) {
    console.log('📚 SENIOR SECONDARY VALIDATION (Grades 10-12)');
    
    if (!studentData.academicTrack) {
      console.error('❌ VALIDATION FAILED: No academic track selected');
      throw new Error(
        `SS students (Grade ${grade}) must select an academic track (Science, Arts, or Commercial)`
      );
    }
    console.log('✅ Academic track:', studentData.academicTrack);

    if (!studentData.tradeSubject) {
      console.error('❌ VALIDATION FAILED: No trade subject selected');
      throw new Error(
        `SS students (Grade ${grade}) must select a trade subject`
      );
    }
    console.log('✅ Trade subject:', studentData.tradeSubject);

    const minSubjects = 8;
    if (studentData.subjects.length < minSubjects) {
      console.error('❌ VALIDATION FAILED: Not enough subjects');
      throw new Error(
        `SS students (Grade ${grade}) must select at least ${minSubjects} subjects. ` +
        `Currently selected: ${studentData.subjects.length}`
      );
    }

    if (!studentData.subjects.includes(studentData.tradeSubject)) {
      console.error('❌ VALIDATION FAILED: Trade subject not in subjects array');
      throw new Error(
        `Trade subject must be included in the subjects list`
      );
    }

    console.log(
      `✅ SS (Grade ${grade}) subject validation passed: ` +
      `${studentData.academicTrack} track, ${studentData.subjects.length} subjects + trade`
    );
    console.log('🔍 ===== SUBJECT VALIDATION DEBUG END =====');
  }
  
  else {
    console.error('❌ Invalid grade level:', grade);
    throw new Error(`Invalid grade level: ${grade}`);
  }
}

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
 * 🛠 DEBUG: Create a new student record with subject validation
 */
export async function createStudent(studentData: Partial<Student>, adminId: string, adminName: string): Promise<string> {
  console.log('🎓 ===== CREATE STUDENT DEBUG START =====');
  console.log('📥 Incoming student data:', {
    firstName: studentData.firstName,
    lastName: studentData.lastName,
    classId: studentData.classId,
    className: studentData.className,
    subjects: studentData.subjects,
    subjectsCount: studentData.subjects?.length || 0,
    academicTrack: studentData.academicTrack,
    tradeSubject: studentData.tradeSubject,
    guardianId: studentData.guardianId
  });

  try {
    const studentId = studentData.id || `student_${Date.now()}`;
    console.log('🆔 Student ID:', studentId);
    
    const admissionNumber = studentData.admissionNumber || await generateAdmissionNumber();
    console.log('🎫 Admission Number:', admissionNumber);

    console.log('🔍 Starting subject validation...');
    validateSubjectSelection(studentData);
    console.log('✅ Subject validation passed!');

    const studentDoc: any = {
      id: studentId,
      studentId,
      userId: studentData.userId || studentId,
      admissionNumber,
      firstName: studentData.firstName || '',
      lastName: studentData.lastName || '',
      gender: studentData.gender || 'male',
      dateOfBirth: safeDate(studentData.dateOfBirth),
      age: studentData.age || 0,
      classId: studentData.classId || '',
      className: studentData.className || '',
      parentId: studentData.parentId || studentData.guardianId || '',
      guardianId: studentData.guardianId || studentData.parentId || '',
      address: studentData.address || '',
      city: studentData.city || '',
      state: studentData.state || '',
      admissionDate: safeDate(studentData.admissionDate),
      emergencyContact: studentData.emergencyContact || '',
      emergencyPhone: studentData.emergencyPhone || '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      subjects: studentData.subjects || [],
      academicTrack: studentData.academicTrack || null,
      tradeSubject: studentData.tradeSubject || null
    };

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

    console.log('📄 Final student document to be saved:', {
      studentId: studentDoc.studentId,
      name: `${studentDoc.firstName} ${studentDoc.lastName}`,
      class: studentDoc.className,
      subjects: studentDoc.subjects,
      subjectsCount: studentDoc.subjects.length,
      academicTrack: studentDoc.academicTrack,
      tradeSubject: studentDoc.tradeSubject
    });

    const studentRef = db.collection('students').doc(studentId);
    await studentRef.set(studentDoc);

    console.log('✅ Student record created:', studentId, admissionNumber);

    if (studentDoc.classId) {
      console.log('🏫 Enrolling student in class:', studentDoc.classId);
      await enrollStudentInClass(
        studentDoc.classId,
        studentId,
        `${studentDoc.firstName} ${studentDoc.lastName}`,
        adminId,
        adminName
      );
      console.log('✅ Student enrolled in class');
    }

    console.log('🎓 ===== CREATE STUDENT DEBUG END =====');
    return studentId;
  } catch (error) {
    console.error('❌ ===== CREATE STUDENT ERROR =====');
    console.error('Error details:', error);
    console.log('🎓 ===== CREATE STUDENT DEBUG END =====');
    throw error;
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const studentDoc = await db.collection('students').doc(studentId).get();
    
    if (!studentDoc.exists) {
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
    const snapshot = await db.collection('students')
      .where('admissionNumber', '==', admissionNumber)
      .limit(1)
      .get();
    
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
    const studentsSnapshot = await db.collection('students').get();
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
    const snapshot = await db.collection('students')
      .where('classId', '==', classId)
      .where('isActive', '==', true)
      .get();
    
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
    const snapshot = await db.collection('students')
      .where('parentId', '==', parentId)
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching students by parent:', error);
    throw error;
  }
}

/**
 * Get students by subject
 */
export async function getStudentsBySubject(subjectId: string, classId?: string): Promise<Student[]> {
  try {
    let studentsQuery = db.collection('students')
      .where('isActive', '==', true);

    if (classId) {
      studentsQuery = db.collection('students')
        .where('classId', '==', classId)
        .where('isActive', '==', true);
    }

    const snapshot = await studentsQuery.get();
    const allStudents = snapshot.docs.map(doc => doc.data() as Student);
    
    return allStudents.filter(student => 
      student.subjects && student.subjects.includes(subjectId)
    );
  } catch (error) {
    console.error('❌ Error fetching students by subject:', error);
    throw error;
  }
}

/**
 * Get students by academic track
 */
export async function getStudentsByTrack(
  track: 'Science' | 'Arts' | 'Commercial',
  classId?: string
): Promise<Student[]> {
  try {
    let studentsQuery = db.collection('students')
      .where('academicTrack', '==', track)
      .where('isActive', '==', true);

    if (classId) {
      studentsQuery = db.collection('students')
        .where('classId', '==', classId)
        .where('academicTrack', '==', track)
        .where('isActive', '==', true);
    }

    const snapshot = await studentsQuery.get();
    return snapshot.docs.map(doc => doc.data() as Student);
  } catch (error) {
    console.error('❌ Error fetching students by track:', error);
    throw error;
  }
}

/**
 * Get active students
 */
export async function getActiveStudents(): Promise<Student[]> {
  try {
    const snapshot = await db.collection('students')
      .where('isActive', '==', true)
      .get();
    
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
  updates: Partial<Student> = {},  // ✅ Add default value
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      throw new Error('Student not found');
    }

    const beforeData = studentDoc.data();
    const oldClassId = beforeData.classId;
    const newClassId = updates.classId;

    if (updates.subjects || updates.academicTrack || updates.tradeSubject) {
      const mergedData = {
        ...beforeData,
        ...updates
      };
      validateSubjectSelection(mergedData);
    }

    await studentRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (newClassId && newClassId !== oldClassId) {
      if (oldClassId) {
        const { removeStudentFromClass } = await import('./classManagement');
        await removeStudentFromClass(oldClassId, studentId, performedBy, performerName);
      }
      
      await enrollStudentInClass(
        newClassId,
        studentId,
        `${beforeData.firstName} ${beforeData.lastName}`,
        performedBy,
        performerName
      );
    }

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
 * Update student subjects only
 */
export async function updateStudentSubjects(
  studentId: string,
  subjects: string[],
  academicTrack?: 'Science' | 'Arts' | 'Commercial' | null,
  tradeSubject?: string | null,
   // @ts-ignore
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const updates: Partial<Student> = { subjects };
    
    if (academicTrack !== undefined) {
      updates.academicTrack = academicTrack;
    }
    
    if (tradeSubject !== undefined) {
      updates.tradeSubject = tradeSubject;
    }

    await updateStudent(studentId, updates, performedBy, performerName);
    
    console.log('✅ Student subjects updated:', studentId);
  } catch (error) {
    console.error('❌ Error updating student subjects:', error);
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
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      throw new Error('Student not found');
    }

    const studentData = studentDoc.data();

    await studentRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (studentData.classId) {
      const { removeStudentFromClass } = await import('./classManagement');
      await removeStudentFromClass(
        studentData.classId,
        studentId,
        performedBy,
        performerName
      );
    }

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

    await updateStudent(
      studentId,
      {
        classId: newClassId,
        className: newClassName
      },
      performedBy,
      performerName
    );

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

    const maleCount = activeStudents.filter(s => s.gender === 'male').length;
    const femaleCount = activeStudents.filter(s => s.gender === 'female').length;

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

    const scienceTrackCount = activeStudents.filter(s => s.academicTrack === 'Science').length;
    const artsTrackCount = activeStudents.filter(s => s.academicTrack === 'Arts').length;
    const commercialTrackCount = activeStudents.filter(s => s.academicTrack === 'Commercial').length;

    const subjectEnrollment: Record<string, number> = {};
    activeStudents.forEach(student => {
      if (student.subjects && Array.isArray(student.subjects)) {
        student.subjects.forEach(subjectId => {
          subjectEnrollment[subjectId] = (subjectEnrollment[subjectId] || 0) + 1;
        });
      }
    });

    return {
      totalStudents: allStudents.length,
      activeStudents: activeStudents.length,
      inactiveStudents: allStudents.length - activeStudents.length,
      maleStudents: maleCount,
      femaleStudents: femaleCount,
      primaryLevel: primaryCount,
      juniorSecondary: jsCount,
      seniorSecondary: ssCount,
      tracks: {
        science: scienceTrackCount,
        arts: artsTrackCount,
        commercial: commercialTrackCount,
        noTrack: ssCount - (scienceTrackCount + artsTrackCount + commercialTrackCount)
      },
      subjectEnrollment
    };
  } catch (error) {
    console.error('❌ Error fetching student stats:', error);
    throw error;
  }
}