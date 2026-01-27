// lib/firebase/teacherManagement.ts - Teacher CRUD Operations (CLIENT SDK - COMPLETE)
// ✅ FIXED: Creates teacher during approval, not during registration

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
import { Teacher, PendingTeacherApproval, TeacherType } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';

// ============================================
// TEACHER CRUD OPERATIONS
// ============================================

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
 * Delete teacher - UPDATED TO CLEAN ALL ASSIGNMENTS
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
        const classRef = doc(db, 'classes', teacher.assignedClass.classId);
        await updateDoc(classRef, {
          classTeacher: null,
          classTeacherId: null,
          updatedAt: new Date()
        });
      } catch (error) {
        console.warn(`  Warning: Could not remove class teacher assignment:`, error);
      }
    }

    // 2. Clean up subject teacher assignments in classes
    if (teacher.subjects && teacher.subjects.length > 0) {
      console.log(`  Removing ${teacher.subjects.length} subject assignments`);
      for (const subject of teacher.subjects) {
        if (subject.classes) {
          for (const classId of subject.classes) {
            try {
              const classRef = doc(db, 'classes', classId);
              const classDoc = await getDoc(classRef);
              if (classDoc.exists()) {
                const classData = classDoc.data();
                const updatedSubjectTeachers = classData?.subjectTeachers?.filter(
                  (st: any) => st.teacherId !== teacherId
                ) || [];
                
                await updateDoc(classRef, {
                  subjectTeachers: updatedSubjectTeachers,
                  updatedAt: new Date()
                });
              }
            } catch (error) {
              console.warn(`  Warning: Could not remove subject assignment for ${subject.subjectName}:`, error);
            }
          }
        }
      }
    }

    // 3. Clean up from subjects collection
    const allSubjects = await getDocs(collection(db, 'subjects'));
    for (const subjectDoc of allSubjects.docs) {
      const subjectData = subjectDoc.data();
      if (subjectData.teachers && subjectData.teachers.some((t: any) => t.teacherId === teacherId)) {
        const updatedTeachers = subjectData.teachers.filter((t: any) => t.teacherId !== teacherId);
        await updateDoc(subjectDoc.ref, {
          teachers: updatedTeachers,
          updatedAt: new Date()
        });
      }
    }

    // 4. Finally delete the teacher
    await deleteDoc(doc(db, 'teachers', teacherId));
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
  approvalData: Omit<PendingTeacherApproval, 'id' | 'status' | 'submittedAt'>
): Promise<string> {
  try {
    const approvalRef = doc(collection(db, 'pendingApprovals'));
    
    // Build approval object, only including defined fields
    const approval: any = {
      id: approvalRef.id,
      userId: approvalData.userId,
      email: approvalData.email,
      firstName: approvalData.firstName,
      lastName: approvalData.lastName,
      phoneNumber: approvalData.phoneNumber,
      teacherType: approvalData.teacherType,
      status: 'pending',
      submittedAt: new Date()
    };

    // Only add optional fields if they exist
    if (approvalData.requestedClass) {
      approval.requestedClass = approvalData.requestedClass;
    }

    if (approvalData.requestedSubjects && approvalData.requestedSubjects.length > 0) {
      approval.requestedSubjects = approvalData.requestedSubjects;
    }

    await setDoc(approvalRef, approval);
    
    console.log('✅ Pending approval created:', approvalRef.id);
    return approvalRef.id;
  } catch (error) {
    console.error('❌ Error creating pending approval:', error);
    throw error;
  }
}

/**
 * Get all pending approvals (TEACHERS ONLY - filters out parent approvals)
 */
export async function getPendingApprovals(): Promise<PendingTeacherApproval[]> {
  try {
    // First get all pending approvals
    const q = query(
      collection(db, 'pendingApprovals'),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    // Filter for teachers only (those with teacherType field)
    const allApprovals = snapshot.docs.map(doc => doc.data() as PendingTeacherApproval);
    
    return allApprovals.filter(approval => 
      approval.teacherType && 
      ['class_teacher', 'subject_teacher', 'both'].includes(approval.teacherType)
    );
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
 * ✅ FIXED: Creates the teacher record during approval (not during registration)
 */
export async function approveTeacher(
  approvalId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log('✅ Starting teacher approval process...');
    
    // Get approval data
    const approvalDoc = await getDoc(doc(db, 'pendingApprovals', approvalId));
    if (!approvalDoc.exists()) {
      throw new Error('Approval request not found');
    }

    const approval = approvalDoc.data() as PendingTeacherApproval;
    console.log('📋 Approval data:', approval);

    // ✅ FIX: Generate teacherId if not present
    const teacherId = approval.teacherId || `teacher_${Date.now()}`;
    console.log('🆔 Teacher ID:', teacherId);

    const batch = writeBatch(db);

    // ✅ FIX: CREATE the teacher record during approval
    const teacherData: any = {
      id: teacherId,
      teacherId,
      userId: approval.userId,
      staffId: `STAFF_${Date.now()}`,
      firstName: approval.firstName,
      lastName: approval.lastName,
      email: approval.email,
      phoneNumber: approval.phoneNumber,
      qualification: '',
      specialization: '',
      dateOfJoining: new Date(),
      employmentType: 'full-time',
      teacherType: approval.teacherType,
      isClassTeacher: approval.teacherType === 'class_teacher' || approval.teacherType === 'both',
      isSubjectTeacher: approval.teacherType === 'subject_teacher' || approval.teacherType === 'both',
      subjects: [],
      classes: [],
      isActive: true,
      isPending: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add class assignment if present
    if (approval.requestedClass) {
      teacherData.assignedClass = {
        classId: approval.requestedClass.classId,
        className: approval.requestedClass.className
      };
      teacherData.classTeacherId = approval.requestedClass.classId;
    }

    // Add subject assignments if present
    if (approval.requestedSubjects && approval.requestedSubjects.length > 0) {
      teacherData.subjects = approval.requestedSubjects.map(sub => ({
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        classes: sub.classes || []
      }));
    }

    // Create teacher record
    const teacherRef = doc(db, 'teachers', teacherId);
    batch.set(teacherRef, teacherData);
    console.log('✅ Teacher record prepared for creation');

    // Update user record with teacherId
    const userRef = doc(db, 'users', approval.userId);
    batch.update(userRef, {
      teacherId,
      isActive: true,
      isPending: false,
      isApproved: true,
      approvalStatus: 'approved',
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ User record prepared for update');

    // Update approval record
    const approvalRef = doc(db, 'pendingApprovals', approvalId);
    batch.update(approvalRef, {
      status: 'approved',
      teacherId, // Store the teacherId in the approval
      reviewedBy: adminId,
      reviewedAt: new Date()
    });
    console.log('✅ Approval record prepared for update');

    // Commit all changes
    await batch.commit();
    console.log('✅ Batch committed successfully');

    // Now handle class and subject assignments
    // ✅ FIX: Use the correct function names from classManagement
    if (approval.requestedClass) {
      console.log('📚 Assigning class teacher...');
      const { assignClassTeacher } = await import('./classManagement');
      await assignClassTeacher(
        approval.requestedClass.classId,
        teacherId,
        `${approval.firstName} ${approval.lastName}`,
        adminId,
        adminName
      );
    }

    if (approval.requestedSubjects && approval.requestedSubjects.length > 0) {
      console.log('📖 Assigning subject teachers...');
      const { assignSubjectTeacher } = await import('./classManagement');
      const { addTeacherToSubject } = await import('./subjectManagement');
      
      for (const subject of approval.requestedSubjects) {
        for (const classId of subject.classes) {
          // Assign to class
          await assignSubjectTeacher(
            classId,
            subject.subjectId,
            subject.subjectName,
            teacherId,
            `${approval.firstName} ${approval.lastName}`,
            adminId,
            adminName
          );
        }
        
        // Also add teacher to subject's teacher list
        await addTeacherToSubject(
          subject.subjectId,
          teacherId,
          `${approval.firstName} ${approval.lastName}`,
          subject.classes,
          adminId,
          adminName
        );
      }
    }

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'TEACHER_APPROVED',
      details: `Approved teacher registration for ${approval.firstName} ${approval.lastName} (${approval.email})`,
      affectedEntity: teacherId,
      affectedEntityType: 'teacher',
      success: true
    });

    console.log('✅ Teacher approved successfully:', teacherId);
  } catch (error) {
    console.error('❌ Error approving teacher:', error);
    throw error;
  }
}

/**
 * Reject teacher registration
 * ✅ FIXED: Handles rejection when no teacher record exists
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
      isApproved: false,
      approvalStatus: 'rejected',
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    });

    // Update approval record
    const approvalRef = doc(db, 'pendingApprovals', approvalId);
    batch.update(approvalRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: reason
    });

    await batch.commit();

    // ✅ FIX: Only delete teacher if the record exists
    if (approval.teacherId) {
      try {
        await deleteTeacher(approval.teacherId);
      } catch (error) {
        console.warn('Teacher record not found during rejection (this is OK):', error);
      }
    }

    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'TEACHER_REJECTED',
      details: `Rejected teacher registration for ${approval.firstName} ${approval.lastName}: ${reason}`,
      affectedEntity: approval.userId,
      affectedEntityType: 'user',
      success: true
    });

    console.log('✅ Teacher rejected:', approval.userId);
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
  
  const batch = writeBatch(db);
  let cleanedClassTeachers = 0;
  let cleanedSubjectTeachers = 0;

  try {
    const allTeachers = await getAllTeachers();
    const activeTeacherIds = new Set(allTeachers.map(t => t.teacherId));

    // Clean up classes
    const allClasses = await getDocs(collection(db, 'classes'));
    
    for (const classDoc of allClasses.docs) {
      const classData = classDoc.data();
      const updates: any = {};
      let needsUpdate = false;

      // Check class teacher
      if (classData.classTeacher && classData.classTeacher.teacherId) {
        if (!activeTeacherIds.has(classData.classTeacher.teacherId)) {
          console.log(`  Removing orphaned class teacher from ${classData.className}: ${classData.classTeacher.teacherName}`);
          updates.classTeacher = null;
          updates.classTeacherId = null;
          needsUpdate = true;
          cleanedClassTeachers++;
        }
      }

      // Check subject teachers
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
        updates.updatedAt = new Date();
        batch.update(classDoc.ref, updates);
      }
    }

    // Clean up subjects collection
    const allSubjects = await getDocs(collection(db, 'subjects'));
    
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
            updatedAt: new Date()
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
    const allClasses = await getDocs(collection(db, 'classes'));
    for (const classDoc of allClasses.docs) {
      await updateDoc(classDoc.ref, {
        classTeacher: null,
        classTeacherId: null,
        subjectTeachers: [],
        updatedAt: new Date()
      });
    }

    const allSubjects = await getDocs(collection(db, 'subjects'));
    for (const subjectDoc of allSubjects.docs) {
      await updateDoc(subjectDoc.ref, {
        teachers: [],
        updatedAt: new Date()
      });
    }

    console.log('✅ Force cleanup complete! All assignments removed.');
  } catch (error) {
    console.error('❌ Force cleanup error:', error);
    throw error;
  }
}