// functions/src/lib/firebase/parentManagement.ts - ADMIN SDK VERSION
import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

import { Parent, PendingParentApproval } from '../../types/database';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Create a new parent record (IMMEDIATE - NO APPROVAL)
 */
export async function createParent(parentData: Partial<Parent>): Promise<Parent> {
  try {
    const parentId = parentData.id || parentData.userId;
    if (!parentId) {
      throw new Error('Parent ID is required');
    }

    const parentDoc: Parent = {
      id: parentId,
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

    const parentRef = db.collection('parents').doc(parentId);
    await parentRef.set(parentDoc);

    console.log('✅ Parent record created:', parentId);
    return parentDoc;
  } catch (error) {
    console.error('❌ Error creating parent:', error);
    throw error;
  }
}

/**
 * ============================================
 * PARENT APPROVAL SYSTEM
 * ============================================
 */

/**
 * Submit parent registration for admin approval
 */
export async function submitParentForApproval(
  parentData: {
    userId: string;
    parentId: string;
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
    const cleanData = (obj: any) => {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
      );
    };

    const approvalData = cleanData({
      userId: parentData.userId,
      parentId: parentData.parentId,
      firstName: parentData.firstName,
      lastName: parentData.lastName,
      email: parentData.email,
      phoneNumber: parentData.phoneNumber,
      relationship: parentData.relationship,
      occupation: parentData.occupation,
      workplace: parentData.workplace,
      address: parentData.address,
      children: parentData.children,
      status: 'pending',
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const approvalRef = db.collection('pendingApprovals').doc();
    await approvalRef.set(approvalData);

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
    const snapshot = await db.collection('pendingApprovals')
      .where('status', '==', 'pending')
      .where('relationship', 'in', ['father', 'mother', 'guardian', 'other'])
      .get();
    
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
 */
export async function approveParent(
  approvalId: string,
  adminId: string,
  adminName: string
): Promise<void> {
  try {
    console.log('📄 Approving parent...');
    
    const approvalRef = db.collection('pendingApprovals').doc(approvalId);
    const approvalSnap = await approvalRef.get();
    
    if (!approvalSnap.exists) {
      throw new Error('Approval request not found');
    }
    
    const approvalData = approvalSnap.data() as PendingParentApproval;
    
    const cleanData = (obj: any) => {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
      );
    };
                       // @ts-ignore
    const parentDoc = cleanData({
      id: approvalData.parentId,
      parentId: approvalData.parentId,
      userId: approvalData.userId,
      firstName: approvalData.firstName,
      lastName: approvalData.lastName,
      email: approvalData.email,
      phoneNumber: approvalData.phoneNumber || '',
      relationship: approvalData.relationship,
      occupation: approvalData.occupation || null,
      workplace: approvalData.workplace || null,
      address: approvalData.address || null,
      children: [],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }) as Parent;
    
    const parentRef = db.collection('parents').doc(approvalData.parentId);
    await parentRef.set(parentDoc);
    
    const userRef = db.collection('users').doc(approvalData.userId);
    await userRef.update({
      isPending: false,
      isActive: true,
      approvedBy: adminId,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await approvalRef.update({
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'USER_REGISTERED',
      details: `Approved parent registration for ${approvalData.firstName} ${approvalData.lastName}`,
      affectedEntity: approvalData.parentId,
      affectedEntityType: 'user',
      afterData: { status: 'approved', children: approvalData.children.length },
      success: true
    });
    
    console.log('✅ Parent approved successfully');
  } catch (error) {
    console.error('❌ Error approving parent:', error);
    throw error;
  }
}

/**
 * Reject parent registration
 */
export async function rejectParent(
  approvalId: string,
  adminId: string,
  adminName: string,
  reason: string
): Promise<void> {
  try {
    console.log('📄 Rejecting parent...');
    
    const approvalRef = db.collection('pendingApprovals').doc(approvalId);
    const approvalSnap = await approvalRef.get();
    
    if (!approvalSnap.exists) {
      throw new Error('Approval request not found');
    }
    
    const approvalData = approvalSnap.data() as PendingParentApproval;
    
    await approvalRef.update({
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewNotes: reason
    });
    
    const userRef = db.collection('users').doc(approvalData.userId);
    await userRef.update({
      isPending: false,
      isActive: false,
      rejectedBy: adminId,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await createDetailedAuditLog({
      userId: adminId,
      userRole: 'admin',
      userName: adminName,
      action: 'USER_REGISTERED',
      details: `Rejected parent registration for ${approvalData.firstName} ${approvalData.lastName}: ${reason}`,
      affectedEntity: approvalData.userId,
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

/**
 * ============================================
 * EXISTING FUNCTIONS
 * ============================================
 */

export async function getParentById(parentId: string): Promise<Parent | null> {
  try {
    const parentDoc = await db.collection('parents').doc(parentId).get();
    
    if (!parentDoc.exists) {
      return null;
    }

    return parentDoc.data() as Parent;
  } catch (error) {
    console.error('❌ Error fetching parent:', error);
    throw error;
  }
}

export async function getParentByUserId(userId: string): Promise<Parent | null> {
  try {
    const snapshot = await db.collection('parents')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Parent;
  } catch (error) {
    console.error('❌ Error fetching parent by user ID:', error);
    throw error;
  }
}

export async function getAllParents(): Promise<Parent[]> {
  try {
    const parentsSnapshot = await db.collection('parents').get();
    return parentsSnapshot.docs.map(doc => doc.data() as Parent);
  } catch (error) {
    console.error('❌ Error fetching parents:', error);
    throw error;
  }
}

export async function getActiveParents(): Promise<Parent[]> {
  try {
    const snapshot = await db.collection('parents')
      .where('isActive', '==', true)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Parent);
  } catch (error) {
    console.error('❌ Error fetching active parents:', error);
    throw error;
  }
}

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

    if (parent.children.includes(studentId)) {
      console.log('⚠️ Child already linked to parent');
      return;
    }

    const updatedChildren = [...parent.children, studentId];

    const parentRef = db.collection('parents').doc(parentId);
    await parentRef.update({
      children: updatedChildren,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

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

    const parentRef = db.collection('parents').doc(parentId);
    await parentRef.update({
      children: updatedChildren,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

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

export async function updateParent(
  parentId: string,
  updates: Partial<Parent>,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parentRef = db.collection('parents').doc(parentId);
    const parentDoc = await parentRef.get();
    
    if (!parentDoc.exists) {
      throw new Error('Parent not found');
    }

    const beforeData = parentDoc.data();

    await parentRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'USER_REGISTERED',
      details: `Updated parent information for ${beforeData!.firstName} ${beforeData!.lastName}`,
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

export async function deleteParent(
  parentId: string,
  performedBy: string,
  performerName: string
): Promise<void> {
  try {
    const parentRef = db.collection('parents').doc(parentId);
    const parentDoc = await parentRef.get();
    
    if (!parentDoc.exists) {
      throw new Error('Parent not found');
    }

    const parentData = parentDoc.data();

    await parentRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await createDetailedAuditLog({
      userId: performedBy,
      userRole: 'admin',
      userName: performerName,
      action: 'DATA_DELETED',
      details: `Deactivated parent ${parentData!.firstName} ${parentData!.lastName}`,
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

export async function getParentChildren(parentId: string): Promise<any[]> {
  try {
    const parent = await getParentById(parentId);
    if (!parent) {
      throw new Error('Parent not found');
    }

    const children = [];
    
    for (const studentId of parent.children) {
      const studentDoc = await db.collection('students').doc(studentId).get();
      if (studentDoc.exists) {
        children.push(studentDoc.data());
      }
    }

    return children;
  } catch (error) {
    console.error('❌ Error fetching parent children:', error);
    throw error;
  }
}

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