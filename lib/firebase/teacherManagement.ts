// lib/firebase/teacherManagement.ts - Teacher CRUD Operations

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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { Teacher, PendingTeacherApproval, TeacherType } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Create a new teacher record
 */
export async function createTeacher(teacherData: Partial<Teacher>): Promise<Teacher> {
  try {
    const teacherId = teacherData.teacherId || teacherData.id;
    if (!teacherId) {
      throw new Error('Teacher ID is required');
    }

    // Build teacher object with only defined values (Firestore doesn't accept undefined)
    const teacher: any = {
      id: teacherId,
      teacherId,
      userId: teacherData.userId || teacherId,
      staffId: teacherData.staffId || `STAFF_${Date.now()}`,
      firstName: teacherData.firstName || '',
      lastName: teacherData.lastName || '',
      email: teacherData.email || '',
      qualification: teacherData.qualification || '',
      specialization: teacherData.specialization || '',
      dateOfJoining: teacherData.dateOfJoining || new Date(),
      employmentType: teacherData.employmentType || 'full-time',
      teacherType: teacherData.teacherType || 'subject_teacher',
      isClassTeacher: teacherData.isClassTeacher || false,
      isSubjectTeacher: teacherData.isSubjectTeacher || false,
      subjects: teacherData.subjects || [],
      classes: teacherData.classes || [],
      isActive: false, // Starts inactive until approved
      isPending: true, // Pending admin approval
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they exist (not undefined)
    if (teacherData.phoneNumber) {
      teacher.phoneNumber = teacherData.phoneNumber;
    }
    if (teacherData.assignedClass) {
      teacher.assignedClass = teacherData.assignedClass;
    }
    if (teacherData.classTeacherId) {
      teacher.classTeacherId = teacherData.classTeacherId;
    }
    if (teacherData.yearsOfExperience !== undefined) {
      teacher.yearsOfExperience = teacherData.yearsOfExperience;
    }

    await setDoc(doc(db, 'teachers', teacherId), teacher);

    console.log('✅ Teacher record created:', teacherId);
    return teacher as Teacher;
  } catch (error) {
    console.error('❌ Error creating teacher:', error);
    throw error;
  }
}

/**
 * Get teacher by ID
 */
export async function getTeacherById(teacherId: string): Promise<Teacher | null> {
  try {
    const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
    
    if (!teacherDoc.exists()) {
      return null;
    }

    return teacherDoc.data() as Teacher;
  } catch (error) {
    console.error('❌ Error fetching teacher:', error);
    throw error;
  }
}

/**
 * Get all teachers
 */
export async function getAllTeachers(): Promise<Teacher[]> {
  try {
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    return teachersSnapshot.docs.map(doc => doc.data() as Teacher);
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    throw error;
  }
}

/**
 * Get active teachers only
 */
export async function getActiveTeachers(): Promise<Teacher[]> {
  try {
    const q = query(
      collection(db, 'teachers'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Teacher);
  } catch (error) {
    console.error('❌ Error fetching active teachers:', error);
    throw error;
  }
}

/**
 * Get pending teachers (awaiting approval)
 */
export async function getPendingTeachers(): Promise<Teacher[]> {
  try {
    const q = query(
      collection(db, 'teachers'),
      where('isPending', '==', true),
      where('isActive', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Teacher);
  } catch (error) {
    console.error('❌ Error fetching pending teachers:', error);
    throw error;
  }
}

/**
 * Update teacher information
 */
export async function updateTeacher(
  teacherId: string,
  updates: Partial<Teacher>
): Promise<void> {
  try {
    const teacherRef = doc(db, 'teachers', teacherId);
    
    await updateDoc(teacherRef, {
      ...updates,
      updatedAt: new Date()
    });

    console.log('✅ Teacher updated:', teacherId);
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    throw error;
  }
}

/**
 * Delete teacher
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
    console.log('✅ Teacher deleted:', teacherId);
  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    throw error;
  }
}

/**
 * Get class teacher for a specific class
 */
export async function getClassTeacherForClass(classId: string): Promise<Teacher | null> {
  try {
    const q = query(
      collection(db, 'teachers'),
      where('isClassTeacher', '==', true),
      where('assignedClass.classId', '==', classId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Teacher;
  } catch (error) {
    console.error('❌ Error fetching class teacher:', error);
    throw error;
  }
}

/**
 * Get subject teachers for a specific subject
 */
export async function getSubjectTeachers(subjectId: string): Promise<Teacher[]> {
  try {
    const allTeachers = await getActiveTeachers();
    
    // Filter teachers who teach this subject
    return allTeachers.filter(teacher => 
      teacher.subjects.some(sub => sub.subjectId === subjectId)
    );
  } catch (error) {
    console.error('❌ Error fetching subject teachers:', error);
    throw error;
  }
}

/**
 * Check if a class already has a class teacher
 */
export async function classHasTeacher(classId: string): Promise<boolean> {
  try {
    const teacher = await getClassTeacherForClass(classId);
    return teacher !== null;
  } catch (error) {
    console.error('❌ Error checking class teacher:', error);
    throw error;
  }
}

// ============================================
// PENDING APPROVAL MANAGEMENT
// ============================================

/**
 * Create a pending teacher approval request
 */
export async function createPendingApproval(
  approvalData: Omit<PendingTeacherApproval, 'id'>
): Promise<string> {
  try {
    const approvalRef = doc(collection(db, 'pendingApprovals'));
    const approval: PendingTeacherApproval = {
      id: approvalRef.id,
      ...approvalData,
      status: 'pending',
      submittedAt: new Date()
    };

    await setDoc(approvalRef, approval);
    
    console.log('✅ Pending approval created:', approvalRef.id);
    return approvalRef.id;
  } catch (error) {
    console.error('❌ Error creating pending approval:', error);
    throw error;
  }
}

/**
 * Get all pending approvals
 */
export async function getPendingApprovals(): Promise<PendingTeacherApproval[]> {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as PendingTeacherApproval);
  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    throw error;
  }
}

/**
 * Get pending approval by user ID
 */
export async function getPendingApprovalByUserId(
  userId: string
): Promise<PendingTeacherApproval | null> {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as PendingTeacherApproval;
  } catch (error) {
    console.error('❌ Error fetching pending approval:', error);
    throw error;
  }
}

/**
 * Approve teacher registration
 */
export async function approveTeacher(
  approvalId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Get approval data
    const approvalDoc = await getDoc(doc(db, 'pendingApprovals', approvalId));
    if (!approvalDoc.exists()) {
      throw new Error('Approval request not found');
    }

    const approval = approvalDoc.data() as PendingTeacherApproval;

    // Update user status
    const userRef = doc(db, 'users', approval.userId);
    batch.update(userRef, {
      isActive: true,
      isPending: false,
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });

    // Update teacher status
    const teacherRef = doc(db, 'teachers', approval.teacherId);
    batch.update(teacherRef, {
      isActive: true,
      isPending: false,
      updatedAt: new Date()
    });

    // Update approval record
    const approvalRef = doc(db, 'pendingApprovals', approvalId);
    batch.update(approvalRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: new Date()
    });

    await batch.commit();

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'TEACHER_APPROVED',
      details: `Approved teacher registration for ${approval.firstName} ${approval.lastName} (${approval.email})`,
      affectedEntity: approval.teacherId,
      affectedEntityType: 'teacher',
      success: true
    });

    console.log('✅ Teacher approved:', approval.teacherId);
  } catch (error) {
    console.error('❌ Error approving teacher:', error);
    throw error;
  }
}

/**
 * Reject teacher registration
 */
export async function rejectTeacher(
  approvalId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Get approval data
    const approvalDoc = await getDoc(doc(db, 'pendingApprovals', approvalId));
    if (!approvalDoc.exists()) {
      throw new Error('Approval request not found');
    }

    const approval = approvalDoc.data() as PendingTeacherApproval;

    // Update user status
    const userRef = doc(db, 'users', approval.userId);
    batch.update(userRef, {
      isActive: false,
      isPending: false,
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    });

    // Delete teacher record (since rejected)
    const teacherRef = doc(db, 'teachers', approval.teacherId);
    batch.delete(teacherRef);

    // Update approval record
    const approvalRef = doc(db, 'pendingApprovals', approvalId);
    batch.update(approvalRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: reason
    });

    await batch.commit();

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'TEACHER_REJECTED',
      details: `Rejected teacher registration for ${approval.firstName} ${approval.lastName}: ${reason}`,
      affectedEntity: approval.teacherId,
      affectedEntityType: 'teacher',
      success: true
    });

    console.log('✅ Teacher rejected:', approval.teacherId);
  } catch (error) {
    console.error('❌ Error rejecting teacher:', error);
    throw error;
  }
}

/**
 * Get teacher statistics
 */
export async function getTeacherStats() {
  try {
    const teachers = await getAllTeachers();
    const pending = teachers.filter(t => t.isPending);
    const active = teachers.filter(t => t.isActive);
    const classTeachers = teachers.filter(t => t.isClassTeacher && t.isActive);
    const subjectTeachers = teachers.filter(t => t.isSubjectTeacher && t.isActive);

    return {
      total: teachers.length,
      pending: pending.length,
      active: active.length,
      classTeachers: classTeachers.length,
      subjectTeachers: subjectTeachers.length
    };
  } catch (error) {
    console.error('❌ Error fetching teacher stats:', error);
    throw error;
  }
}