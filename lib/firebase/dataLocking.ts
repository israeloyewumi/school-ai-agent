// lib/firebase/dataLocking.ts - Data Locking & Edit Windows Service

import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { DataLock, EditWindow } from '@/types/database';

/**
 * Check if a data record is locked
 */
export async function isDataLocked(
  entityType: 'attendance' | 'result' | 'merit' | 'fee',
  entityId: string
): Promise<{ isLocked: boolean; reason?: string; lockedBy?: string }> {
  try {
    const lockId = `${entityType}_${entityId}`;
    const lockDoc = await getDoc(doc(db, 'dataLocks', lockId));
    
    if (!lockDoc.exists()) {
      return { isLocked: false };
    }
    
    const lockData = lockDoc.data() as DataLock;
    
    if (lockData.isLocked) {
      return {
        isLocked: true,
        reason: lockData.lockReason,
        lockedBy: lockData.lockedBy
      };
    }
    
    // Check if past edit deadline
    if (lockData.editDeadline) {
      const now = new Date();
      const deadline = lockData.editDeadline instanceof Timestamp 
        ? lockData.editDeadline.toDate() 
        : new Date(lockData.editDeadline);
      
      if (now > deadline) {
        // Auto-lock if past deadline
        await lockData_Internal(entityType, entityId, 'Edit deadline passed', 'system');
        return {
          isLocked: true,
          reason: 'Edit deadline has passed',
          lockedBy: 'system'
        };
      }
    }
    
    return { isLocked: false };
  } catch (error) {
    console.error('Error checking data lock:', error);
    return { isLocked: false };
  }
}

/**
 * Lock a data record
 */
async function lockData_Internal(
  entityType: 'attendance' | 'result' | 'merit' | 'fee',
  entityId: string,
  reason: string,
  lockedBy: string
): Promise<void> {
  try {
    const lockId = `${entityType}_${entityId}`;
    
    await setDoc(doc(db, 'dataLocks', lockId), {
      entityType,
      entityId,
      isLocked: true,
      lockReason: reason,
      lockedBy,
      lockedAt: Timestamp.now()
    }, { merge: true });
    
    console.log(`✅ Data locked: ${entityType}/${entityId}`);
  } catch (error) {
    console.error('Error locking data:', error);
    throw error;
  }
}

export const lockData = lockData_Internal;

/**
 * Unlock a data record
 */
export async function unlockData(
  entityType: 'attendance' | 'result' | 'merit' | 'fee',
  entityId: string,
  unlockedBy: string
): Promise<void> {
  try {
    const lockId = `${entityType}_${entityId}`;
    const lockDoc = await getDoc(doc(db, 'dataLocks', lockId));
    
    if (!lockDoc.exists()) {
      console.warn('No lock found for:', lockId);
      return;
    }
    
    const lockData = lockDoc.data() as DataLock;
    
    // Check if user is authorized to unlock
    if (lockData.canBeUnlockedBy && lockData.canBeUnlockedBy.length > 0) {
      if (!lockData.canBeUnlockedBy.includes(unlockedBy)) {
        throw new Error('You are not authorized to unlock this data');
      }
    }
    
    await updateDoc(doc(db, 'dataLocks', lockId), {
      isLocked: false,
      lockReason: null,
      lockedBy: null,
      lockedAt: null
    });
    
    console.log(`✅ Data unlocked: ${entityType}/${entityId} by ${unlockedBy}`);
  } catch (error) {
    console.error('Error unlocking data:', error);
    throw error;
  }
}

/**
 * Set edit deadline for data (auto-locks after deadline)
 */
export async function setEditDeadline(
  entityType: 'attendance' | 'result' | 'merit' | 'fee',
  entityId: string,
  deadline: Date,
  term: string,
  session: string
): Promise<void> {
  try {
    const lockId = `${entityType}_${entityId}`;
    
    await setDoc(doc(db, 'dataLocks', lockId), {
      entityType,
      entityId,
      term,
      session,
      editDeadline: Timestamp.fromDate(deadline),
      isLocked: false
    }, { merge: true });
    
    console.log(`✅ Edit deadline set: ${entityType}/${entityId} until ${deadline}`);
  } catch (error) {
    console.error('Error setting edit deadline:', error);
    throw error;
  }
}

/**
 * Create an edit window for a specific assessment
 */
export async function createEditWindow(
  window: Omit<EditWindow, 'id'>
): Promise<string> {
  try {
    const windowId = `${window.term}_${window.session}_${window.assessmentType}`.replace(/\//g, '_');
    
    await setDoc(doc(db, 'editWindows', windowId), {
      ...window,
      startDate: Timestamp.fromDate(window.startDate),
      endDate: Timestamp.fromDate(window.endDate)
    });
    
    console.log(`✅ Edit window created: ${windowId}`);
    return windowId;
  } catch (error) {
    console.error('Error creating edit window:', error);
    throw error;
  }
}

/**
 * Check if current time is within edit window
 */
export async function isWithinEditWindow(
  term: string,
  session: string,
  assessmentType: 'ca1' | 'ca2' | 'exam' | 'attendance' | 'merit',
  classId?: string
): Promise<{ allowed: boolean; window?: EditWindow; reason?: string }> {
  try {
    const windowId = `${term}_${session}_${assessmentType}`.replace(/\//g, '_');
    const windowDoc = await getDoc(doc(db, 'editWindows', windowId));
    
    if (!windowDoc.exists()) {
      // No edit window defined = always allowed
      return { allowed: true };
    }
    
    const windowData = windowDoc.data() as EditWindow;
    
    if (!windowData.isActive) {
      return {
        allowed: false,
        window: windowData,
        reason: 'Edit window is not active'
      };
    }
    
    // Check if class is affected (empty array = all classes)
    if (classId && windowData.affectedClasses && windowData.affectedClasses.length > 0) {
      if (!windowData.affectedClasses.includes(classId)) {
        // This class is not affected by this window
        return { allowed: true };
      }
    }
    
    // Check dates
    const now = new Date();
    const start = windowData.startDate instanceof Timestamp 
      ? windowData.startDate.toDate() 
      : new Date(windowData.startDate);
    const end = windowData.endDate instanceof Timestamp 
      ? windowData.endDate.toDate() 
      : new Date(windowData.endDate);
    
    if (now < start) {
      return {
        allowed: false,
        window: windowData,
        reason: `Edit window opens on ${start.toLocaleDateString()}`
      };
    }
    
    if (now > end) {
      return {
        allowed: false,
        window: windowData,
        reason: `Edit window closed on ${end.toLocaleDateString()}`
      };
    }
    
    return { allowed: true, window: windowData };
  } catch (error) {
    console.error('Error checking edit window:', error);
    // On error, allow the operation (fail open)
    return { allowed: true };
  }
}

/**
 * Get all active edit windows
 */
export async function getActiveEditWindows(
  term: string,
  session: string
): Promise<EditWindow[]> {
  try {
    const q = query(
      collection(db, 'editWindows'),
      where('term', '==', term),
      where('session', '==', session),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EditWindow));
  } catch (error) {
    console.error('Error getting active edit windows:', error);
    return [];
  }
}