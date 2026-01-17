// functions/src/lib/firebase/teacherManagement.ts - ADMIN SDK VERSION
import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

import { Teacher, PendingTeacherApproval } from '../../types/database';
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
      isActive: false,
      isPending: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

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

    await db.collection('teachers').doc(teacherId).set(teacher);

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
    const teacherDoc = await db.collection('teachers').doc(teacherId).get();
    
    if (!teacherDoc.exists) {
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
    const teachersSnapshot = await db.collection('teachers').get();
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
    const snapshot = await db.collection('teachers')
      .where('isActive', '==', true)
      .get();
    
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
    const snapshot = await db.collection('teachers')
      .where('isPending', '==', true)
      .where('isActive', '==', false)
      .get();
    
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
    const teacherRef = db.collection('teachers').doc(teacherId);
    
    await teacherRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Teacher updated:', teacherId);
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    throw error;
  }
}

/**
 * Delete teacher - UPDATED TO CLEAN ASSIGNMENTS
 */
export async function deleteTeacher(teacherId: string): Promise<void> {
  try {
    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    console.log(`🧹 Deleting teacher ${teacherId} and cleaning assignments...`);

    // 1. Clean up class teacher assignment
    if (teacher.isClassTeacher && teacher.assignedClass) {
      console.log(`  Removing class teacher from ${teacher.assignedClass.className}`);
      try {
        const classRef = db.collection('classes').doc(teacher.assignedClass.classId);
        await classRef.update({
          classTeacher: null,
          classTeacherId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.warn(`  Warning: Could not remove class teacher assignment: ${error}`);
      }
    }

    // 2. Clean up subject teacher assignments in classes
    if (teacher.subjects && teacher.subjects.length > 0) {
      console.log(`  Removing ${teacher.subjects.length} subject assignments`);
      for (const subject of teacher.subjects) {
        if (subject.classes) {
          for (const classId of subject.classes) {
            try {
              const classRef = db.collection('classes').doc(classId);
              const classDoc = await classRef.get();
              if (classDoc.exists) {
                const classData = classDoc.data();
                const updatedSubjectTeachers = classData!.subjectTeachers?.filter(
                  (st: any) => st.teacherId !== teacherId
                ) || [];
                
                await classRef.update({
                  subjectTeachers: updatedSubjectTeachers,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            } catch (error) {
              console.warn(`  Warning: Could not remove subject assignment for ${subject.subjectName}: ${error}`);
            }
          }
        }
      }
    }

    // 3. Clean up from subjects collection
    const allSubjects = await db.collection('subjects').get();
    for (const subjectDoc of allSubjects.docs) {
      const subjectData = subjectDoc.data();
      if (subjectData.teachers && subjectData.teachers.some((t: any) => t.teacherId === teacherId)) {
        const updatedTeachers = subjectData.teachers.filter((t: any) => t.teacherId !== teacherId);
        await subjectDoc.ref.update({
          teachers: updatedTeachers,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 4. Finally delete the teacher
    await db.collection('teachers').doc(teacherId).delete();
    console.log(`✅ Teacher ${teacherId} deleted with all assignments cleaned`);
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
    const snapshot = await db.collection('teachers')
      .where('isClassTeacher', '==', true)
      .where('assignedClass.classId', '==', classId)
      .where('isActive', '==', true)
      .get();
    
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
    const approvalRef = db.collection('pendingApprovals').doc();
    const approval: PendingTeacherApproval = {
      id: approvalRef.id,
      ...approvalData,
      status: 'pending',
      submittedAt: new Date()
    };

    await approvalRef.set(approval);
    
    console.log('✅ Pending approval created:', approvalRef.id);
    return approvalRef.id;
  } catch (error) {
    console.error('❌ Error creating pending approval:', error);
    throw error;
  }
}

/**
 * Get all pending approvals (TEACHERS ONLY)
 */
export async function getPendingApprovals(): Promise<PendingTeacherApproval[]> {
  try {
    const snapshot = await db.collection('pendingApprovals')
      .where('status', '==', 'pending')
      .where('teacherType', 'in', ['class_teacher', 'subject_teacher', 'both'])
      .get();
    
    return snapshot.docs.map(doc => doc.data() as PendingTeacherApproval);
  } catch (error) {
    console.error('❌ Error fetching pending teacher approvals:', error);
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
    const snapshot = await db.collection('pendingApprovals')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    
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
    const batch = db.batch();

    const approvalDoc = await db.collection('pendingApprovals').doc(approvalId).get();
    if (!approvalDoc.exists) {
      throw new Error('Approval request not found');
    }

    const approval = approvalDoc.data() as PendingTeacherApproval;

    const userRef = db.collection('users').doc(approval.userId);
    batch.update(userRef, {
      isActive: true,
      isPending: false,
      approvedBy: adminId,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const teacherRef = db.collection('teachers').doc(approval.teacherId);
    batch.update(teacherRef, {
      isActive: true,
      isPending: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const approvalRef = db.collection('pendingApprovals').doc(approvalId);
    batch.update(approvalRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

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
    const batch = db.batch();

    const approvalDoc = await db.collection('pendingApprovals').doc(approvalId).get();
    if (!approvalDoc.exists) {
      throw new Error('Approval request not found');
    }

    const approval = approvalDoc.data() as PendingTeacherApproval;

    const userRef = db.collection('users').doc(approval.userId);
    batch.update(userRef, {
      isActive: false,
      isPending: false,
      rejectedBy: adminId,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await deleteTeacher(approval.teacherId);

    const approvalRef = db.collection('pendingApprovals').doc(approvalId);
    batch.update(approvalRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewNotes: reason
    });

    await batch.commit();

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

// ============================================
// CLEANUP FUNCTIONS
// ============================================

/**
 * Clean ALL orphaned teacher assignments
 */
export async function cleanupAllOrphanedAssignments(): Promise<{
  cleanedClassTeachers: number;
  cleanedSubjectTeachers: number;
  totalCleaned: number;
}> {
  console.log('🧹 Starting cleanup of all orphaned assignments...');
  
  const batch = db.batch();
  let cleanedClassTeachers = 0;
  let cleanedSubjectTeachers = 0;

  try {
    const allTeachers = await getAllTeachers();
    const activeTeacherIds = new Set(allTeachers.map(t => t.teacherId));

    const allClasses = await db.collection('classes').get();
    
    for (const classDoc of allClasses.docs) {
      const classData = classDoc.data();
      const updates: any = {};
      let needsUpdate = false;

      if (classData.classTeacher && classData.classTeacher.teacherId) {
        if (!activeTeacherIds.has(classData.classTeacher.teacherId)) {
          console.log(`  Removing orphaned class teacher from ${classData.className}: ${classData.classTeacher.teacherName}`);
          updates.classTeacher = null;
          updates.classTeacherId = null;
          needsUpdate = true;
          cleanedClassTeachers++;
        }
      }

      if (classData.subjectTeachers && classData.subjectTeachers.length > 0) {
        const validSubjectTeachers = classData.subjectTeachers.filter((st: any) => 
          activeTeacherIds.has(st.teacherId)
        );
        
        if (validSubjectTeachers.length !== classData.subjectTeachers.length) {
          const removedCount = classData.subjectTeachers.length - validSubjectTeachers.length;
          console.log(`  Removing ${removedCount} orphaned subject teachers from ${classData.className}`);
          updates.subjectTeachers = validSubjectTeachers;
          needsUpdate = true;
          cleanedSubjectTeachers += removedCount;
        }
      }

      if (needsUpdate) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        batch.update(classDoc.ref, updates);
      }
    }

    const allSubjects = await db.collection('subjects').get();
    
    for (const subjectDoc of allSubjects.docs) {
      const subjectData = subjectDoc.data();
      if (subjectData.teachers && subjectData.teachers.length > 0) {
        const validTeachers = subjectData.teachers.filter((t: any) => 
          activeTeacherIds.has(t.teacherId)
        );
        
        if (validTeachers.length !== subjectData.teachers.length) {
          const removedCount = subjectData.teachers.length - validTeachers.length;
          console.log(`  Removing ${removedCount} orphaned teachers from ${subjectData.subjectName}`);
          
          batch.update(subjectDoc.ref, {
            teachers: validTeachers,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }

    console.log('💾 Committing cleanup changes...');
    await batch.commit();

    const totalCleaned = cleanedClassTeachers + cleanedSubjectTeachers;
    console.log(`✅ Cleanup complete! Removed ${totalCleaned} orphaned assignments:
      - Class teachers: ${cleanedClassTeachers}
      - Subject teachers: ${cleanedSubjectTeachers}`);

    return { cleanedClassTeachers, cleanedSubjectTeachers, totalCleaned };

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
}

/**
 * Force cleanup - remove ALL assignments (emergency use)
 */
export async function forceCleanupAllAssignments(): Promise<void> {
  console.log('⚠️ FORCE CLEANUP - Removing ALL teacher assignments...');
  
  try {
    const allClasses = await db.collection('classes').get();
    for (const classDoc of allClasses.docs) {
      await classDoc.ref.update({
        classTeacher: null,
        classTeacherId: null,
        subjectTeachers: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    const allSubjects = await db.collection('subjects').get();
    for (const subjectDoc of allSubjects.docs) {
      await subjectDoc.ref.update({
        teachers: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log('✅ Force cleanup complete! All assignments removed.');
  } catch (error) {
    console.error('❌ Force cleanup error:', error);
    throw error;
  }
}