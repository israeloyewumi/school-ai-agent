// lib/firebase/parentManagement.ts - Parent CRUD Operations (CLIENT SDK - COMPLETE)
// ✅ FIXED: Creates parent during approval, not during registration

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
import { Parent, PendingParentApproval } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';

// ============================================
// PARENT CRUD OPERATIONS
// ============================================

/**
 * Create a new parent record (IMMEDIATE - NO APPROVAL)
 */
export async function createParent(parentData: Partial<Parent>): Promise<Parent> {
  try {
    const parentId = parentData.id || parentData.userId;
    if (!parentId) {
      throw new Error('Parent ID is required');
    }

    // Build parent document
    const parentDoc: Parent = {
      id: parentId,
      parentId,
      userId: parentData.userId || parentId,
      firstName: parentData.firstName || '',
      lastName: parentData.lastName || '',
      email: parentData.email || '',
      phoneNumber: parentData.phoneNumber || '',
      relationship: parentData.relationship || 'guardian',
      occupation: parentData.occupation,
      workplace: parentData.workplace,
      address: parentData.address,
      children: parentData.children || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const parentRef = doc(db, 'parents', parentId);
    await setDoc(parentRef, parentDoc);

    console.log('✅ Parent record created:', parentId);
    return parentDoc;
  } catch (error) {
    console.error('❌ Error creating parent:', error);
    throw error;
  }
}

/**
 * Get parent by ID
 */
export async function getParentById(parentId: string): Promise<Parent | null> {
  try {
    const parentDoc = await getDoc(doc(db, 'parents', parentId));
    
    if (!parentDoc.exists()) {
      return null;
    }

    return parentDoc.data() as Parent;
  } catch (error) {
    console.error('❌ Error fetching parent:', error);
    throw error;
  }
}

/**
 * Get parent by user ID
 */
export async function getParentByUserId(userId: string): Promise<Parent | null> {
  try {
    const q = query(
      collection(db, 'parents'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Parent;
  } catch (error) {
    console.error('❌ Error fetching parent by user ID:', error);
    throw error;
  }
}

/**
 * Get all parents
 */
export async function getAllParents(): Promise<Parent[]> {
  try {
    const parentsSnapshot = await getDocs(collection(db, 'parents'));
    return parentsSnapshot.docs.map(doc => doc.data() as Parent);
  } catch (error) {
    console.error('❌ Error fetching parents:', error);
    throw error;
  }
}

/**
 * Get active parents only
 */
export async function getActiveParents(): Promise<Parent[]> {
  try {
    const q = query(
      collection(db, 'parents'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Parent);
  } catch (error) {
    console.error('❌ Error fetching active parents:', error);
    throw error;
  }
}

/**
 * Add child to parent's children array
 */
export async function addChildToParent(
  parentId: string,
  studentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parent = await getParentById(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    // Check if child already exists
    if (parent.children.includes(studentId)) {
      console.log('⚠️ Child already linked to parent');
      return;
    }

    const updatedChildren = [...parent.children, studentId];

    const parentRef = doc(db, 'parents', parentId);
    await updateDoc(parentRef, {
      children: updatedChildren,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'parent',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Added child ${studentId} to parent ${parent.firstName} ${parent.lastName}`,
      affectedEntity: parentId,
      affectedEntityType: 'user',
      afterData: { children: updatedChildren },
      success: true
    });

    console.log('✅ Child added to parent:', studentId);
  } catch (error) {
    console.error('❌ Error adding child to parent:', error);
    throw error;
  }
}

/**
 * Remove child from parent's children array
 */
export async function removeChildFromParent(
  parentId: string,
  studentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parent = await getParentById(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    const updatedChildren = parent.children.filter(id => id !== studentId);

    const parentRef = doc(db, 'parents', parentId);
    await updateDoc(parentRef, {
      children: updatedChildren,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'DATA_DELETED',
      details: `Removed child ${studentId} from parent ${parent.firstName} ${parent.lastName}`,
      affectedEntity: parentId,
      affectedEntityType: 'user',
      beforeData: { children: parent.children },
      afterData: { children: updatedChildren },
      success: true
    });

    console.log('✅ Child removed from parent:', studentId);
  } catch (error) {
    console.error('❌ Error removing child from parent:', error);
    throw error;
  }
}

/**
 * Update parent information
 */
export async function updateParent(
  parentId: string,
  updates: Partial<Parent>,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parentRef = doc(db, 'parents', parentId);
    const parentDoc = await getDoc(parentRef);
    
    if (!parentDoc.exists()) {
      throw new Error('Parent not found');
    }

    const beforeData = parentDoc.data();

    await updateDoc(parentRef, {
      ...updates,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Updated parent information for ${beforeData.firstName} ${beforeData.lastName}`,
      affectedEntity: parentId,
      affectedEntityType: 'user',
      beforeData,
      afterData: updates,
      success: true
    });

    console.log('✅ Parent updated:', parentId);
  } catch (error) {
    console.error('❌ Error updating parent:', error);
    throw error;
  }
}

/**
 * Delete parent (deactivate)
 */
export async function deleteParent(
  parentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parentRef = doc(db, 'parents', parentId);
    const parentDoc = await getDoc(parentRef);
    
    if (!parentDoc.exists()) {
      throw new Error('Parent not found');
    }

    const parentData = parentDoc.data();

    // Soft delete - just deactivate
    await updateDoc(parentRef, {
      isActive: false,
      updatedAt: new Date()
    });

    // Create audit log
    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'DATA_DELETED',
      details: `Deactivated parent ${parentData.firstName} ${parentData.lastName}`,
      affectedEntity: parentId,
      affectedEntityType: 'user',
      beforeData: parentData,
      success: true
    });

    console.log('✅ Parent deactivated:', parentId);
  } catch (error) {
    console.error('❌ Error deleting parent:', error);
    throw error;
  }
}

/**
 * Get parent's children details
 */
export async function getParentChildren(parentId: string): Promise<any[]> {
  try {
    const parent = await getParentById(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    // Fetch all children from students collection
    const children = [];
    
    for (const studentId of parent.children) {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists()) {
        children.push(studentDoc.data());
      }
    }

    return children;
  } catch (error) {
    console.error('❌ Error fetching parent children:', error);
    throw error;
  }
}

/**
 * Get parent statistics
 */
export async function getParentStats() {
  try {
    const allParents = await getAllParents();
    const activeParents = allParents.filter(p => p.isActive);

    const totalChildren = allParents.reduce((sum, p) => sum + p.children.length, 0);
    const avgChildrenPerParent = totalChildren / allParents.length || 0;

    return {
      totalParents: allParents.length,
      activeParents: activeParents.length,
      inactiveParents: allParents.length - activeParents.length,
      totalChildren,
      averageChildrenPerParent: Math.round(avgChildrenPerParent * 10) / 10
    };
  } catch (error) {
    console.error('❌ Error fetching parent stats:', error);
    throw error;
  }
}

// ============================================
// PARENT APPROVAL SYSTEM
// ============================================

/**
 * Submit parent registration for admin approval
 */
export async function submitParentForApproval(
  parentData: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    relationship: 'father' | 'mother' | 'guardian' | 'other';
    occupation?: string;
    workplace?: string;
    address?: string;
    children: any[];
  }
): Promise<string> {
  try {
    // Clean undefined values - only include defined fields
    const approvalData: any = {
      userId: parentData.userId,
      firstName: parentData.firstName,
      lastName: parentData.lastName,
      email: parentData.email,
      relationship: parentData.relationship,
      children: parentData.children,
      status: 'pending',
      submittedAt: new Date()
    };

    // Only add optional fields if they exist
    if (parentData.phoneNumber) {
      approvalData.phoneNumber = parentData.phoneNumber;
    }
    if (parentData.occupation) {
      approvalData.occupation = parentData.occupation;
    }
    if (parentData.workplace) {
      approvalData.workplace = parentData.workplace;
    }
    if (parentData.address) {
      approvalData.address = parentData.address;
    }

    const approvalRef = doc(collection(db, 'pendingApprovals'));
    await setDoc(approvalRef, approvalData);

    console.log('✅ Parent submitted for approval:', approvalRef.id);
    return approvalRef.id;
  } catch (error) {
    console.error('❌ Error submitting parent for approval:', error);
    throw error;
  }
}

/**
 * Get all pending parent approvals
 */
export async function getPendingParentApprovals(): Promise<PendingParentApproval[]> {
  try {
    const q = query(
      collection(db, 'pendingApprovals'),
      where('status', '==', 'pending'),
      where('relationship', 'in', ['father', 'mother', 'guardian', 'other'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PendingParentApproval));
  } catch (error) {
    console.error('❌ Error fetching pending parent approvals:', error);
    throw error;
  }
}

/**
 * Approve parent registration
 * ✅ FIXED: Creates the parent record during approval (not during registration)
 */
export async function approveParent(
  approvalId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log('✅ Starting parent approval process...');
    
    // Get approval data
    const approvalDoc = await getDoc(doc(db, 'pendingApprovals', approvalId));
    if (!approvalDoc.exists()) {
      throw new Error('Approval request not found');
    }
    
    const approval = approvalDoc.data() as PendingParentApproval;
    console.log('📋 Approval data:', approval);

    // ✅ FIX: Generate parentId if not present
    const parentId = approval.parentId || `parent_${Date.now()}`;
    console.log('🆔 Parent ID:', parentId);

    const batch = writeBatch(db);

    // ✅ FIX: CREATE the parent record during approval
    const parentData: any = {
      id: parentId,
      parentId,
      userId: approval.userId,
      firstName: approval.firstName,
      lastName: approval.lastName,
      email: approval.email,
      phoneNumber: approval.phoneNumber || '',
      relationship: approval.relationship,
      children: [], // Start with empty array, children will be added after creation
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they exist
    if (approval.occupation) {
      parentData.occupation = approval.occupation;
    }
    if (approval.workplace) {
      parentData.workplace = approval.workplace;
    }
    if (approval.address) {
      parentData.address = approval.address;
    }

    // Create parent record
    const parentRef = doc(db, 'parents', parentId);
    batch.set(parentRef, parentData);
    console.log('✅ Parent record prepared for creation');
    
    // Update user status
    const userRef = doc(db, 'users', approval.userId);
    batch.update(userRef, {
      parentId, // Store the parentId in the user record
      isPending: false,
      isActive: true,
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
      parentId, // Store the parentId in the approval
      reviewedBy: adminId,
      reviewedAt: new Date()
    });
    console.log('✅ Approval record prepared for update');

    // Commit all changes
    await batch.commit();
    console.log('✅ Batch committed successfully');

    // Now create children and link them to the parent
    if (approval.children && approval.children.length > 0) {
      console.log('👶 Creating children records...');
      const { createStudent } = await import('./studentManagement');
      const createdChildrenIds: string[] = [];

      for (const child of approval.children) {
        try {
          // Create student record
          const student = await createStudent({
            ...child,
            parentId,
            parentName: `${approval.firstName} ${approval.lastName}`,
            isActive: true
          });

          createdChildrenIds.push(student.id);
          console.log(`✅ Child created: ${student.firstName} ${student.lastName}`);
        } catch (error) {
          console.error(`❌ Error creating child ${child.firstName}:`, error);
          // Continue with other children even if one fails
        }
      }

      // Update parent with children IDs
      if (createdChildrenIds.length > 0) {
        await updateDoc(parentRef, {
          children: createdChildrenIds,
          updatedAt: new Date()
        });
        console.log(`✅ Parent updated with ${createdChildrenIds.length} children`);
      }
    }
    
    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'PARENT_APPROVED',
      details: `Approved parent registration for ${approval.firstName} ${approval.lastName}`,
      affectedEntity: parentId,
      affectedEntityType: 'parent',
      afterData: { 
        status: 'approved', 
        childrenCount: approval.children?.length || 0 
      },
      success: true
    });
    
    console.log('✅ Parent approved successfully:', parentId);
  } catch (error) {
    console.error('❌ Error approving parent:', error);
    throw error;
  }
}

/**
 * Reject parent registration
 * ✅ FIXED: Handles rejection when no parent record exists
 */
export async function rejectParent(
  approvalId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<void> {
  try {
    console.log('📄 Rejecting parent...');
    
    const approvalDoc = await getDoc(doc(db, 'pendingApprovals', approvalId));
    if (!approvalDoc.exists()) {
      throw new Error('Approval request not found');
    }
    
    const approval = approvalDoc.data() as PendingParentApproval;

    const batch = writeBatch(db);
    
    // Update approval record
    const approvalRef = doc(db, 'pendingApprovals', approvalId);
    batch.update(approvalRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      reviewNotes: reason
    });
    
    // Update user status
    const userRef = doc(db, 'users', approval.userId);
    batch.update(userRef, {
      isPending: false,
      isActive: false,
      isApproved: false,
      approvalStatus: 'rejected',
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    });

    await batch.commit();

    // ✅ FIX: Only delete parent if the record exists
    if (approval.parentId) {
      try {
        await deleteParent(approval.parentId, adminId, adminName);
      } catch (error) {
        console.warn('Parent record not found during rejection (this is OK):', error);
      }
    }
    
    // Create audit log
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'PARENT_REJECTED',
      details: `Rejected parent registration for ${approval.firstName} ${approval.lastName}: ${reason}`,
      affectedEntity: approval.userId,
      affectedEntityType: 'user',
      beforeData: { status: 'pending' },
      afterData: { status: 'rejected', reason },
      success: true
    });
    
    console.log('✅ Parent rejected');
  } catch (error) {
    console.error('❌ Error rejecting parent:', error);
    throw error;
  }
}