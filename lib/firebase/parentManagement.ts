// lib/firebase/parentManagement.ts - Parent CRUD Operations

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
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { Parent } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Create a new parent record
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