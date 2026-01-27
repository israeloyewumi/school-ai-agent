// lib/firebase/dataLocking.ts - CLIENT SDK VERSION
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

/**
 * Data lock configuration
 */
export interface DataLock {
  id?: string;
  entityType: 'attendance' | 'grade' | 'merit' | 'fee';
  entityId: string;
  lockedAt: Date | any;
  lockedBy: string;
  lockedByName: string;
  reason: string;
  expiresAt?: Date | any;
  isLocked: boolean;
}

/**
 * Edit window configuration (in days)
 */
const EDIT_WINDOWS = {
  attendance: 7,  // 7 days to edit attendance
  grade: 7,       // 7 days to edit grades
  merit: 30,      // 30 days to edit merits
  fee: 90         // 90 days to edit fee records
};

/**
 * Check if a record is within the edit window
 */
export function isWithinEditWindow(
  recordDate: Date,
  entityType: 'attendance' | 'grade' | 'merit' | 'fee'
): boolean {
  const now = new Date();
  const recordTime = recordDate instanceof Date ? recordDate : new Date(recordDate);
  const daysSinceRecord = Math.floor((now.getTime() - recordTime.getTime()) / (1000 * 60 * 60 * 24));
  
  const windowDays = EDIT_WINDOWS[entityType];
  return daysSinceRecord <= windowDays;
}

/**
 * Get remaining days in edit window
 */
export function getRemainingEditDays(
  recordDate: Date,
  entityType: 'attendance' | 'grade' | 'merit' | 'fee'
): number {
  const now = new Date();
  const recordTime = recordDate instanceof Date ? recordDate : new Date(recordDate);
  const daysSinceRecord = Math.floor((now.getTime() - recordTime.getTime()) / (1000 * 60 * 60 * 24));
  
  const windowDays = EDIT_WINDOWS[entityType];
  const remaining = windowDays - daysSinceRecord;
  
  return Math.max(0, remaining);
}

/**
 * Check if a record is locked
 */
export async function isRecordLocked(
  entityType: 'attendance' | 'grade' | 'merit' | 'fee',
  entityId: string
): Promise<boolean> {
  try {
    const lockRef = doc(db, 'dataLocks', `${entityType}_${entityId}`);
    const lockSnap = await getDoc(lockRef);
    
    if (!lockSnap.exists()) {
      return false;
    }
    
    const lockData = lockSnap.data() as DataLock;
    
    // Check if lock has expired
    if (lockData.expiresAt) {
      const expiresAt = lockData.expiresAt instanceof Timestamp 
        ? lockData.expiresAt.toDate() 
        : new Date(lockData.expiresAt);
      
      if (expiresAt < new Date()) {
        // Lock expired, remove it
        await updateDoc(lockRef, { isLocked: false });
        return false;
      }
    }
    
    return lockData.isLocked || false;
  } catch (error) {
    console.error('Error checking record lock:', error);
    return false; // If can't check, assume not locked
  }
}

/**
 * Lock a record
 */
export async function lockRecord(
  entityType: 'attendance' | 'grade' | 'merit' | 'fee',
  entityId: string,
  lockedBy: string,
  lockedByName: string,
  reason: string,
  durationHours?: number
): Promise<void> {
  try {
    const lockRef = doc(db, 'dataLocks', `${entityType}_${entityId}`);
    
    const lockData: Partial<DataLock> = {
      entityType,
      entityId,
      lockedBy,
      lockedByName,
      reason,
      isLocked: true,
      lockedAt: serverTimestamp()
    };
    
    if (durationHours) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);
      lockData.expiresAt = Timestamp.fromDate(expiresAt);
    }
    
    await setDoc(lockRef, lockData);
  } catch (error) {
    console.error('Error locking record:', error);
    throw error;
  }
}

/**
 * Unlock a record
 */
export async function unlockRecord(
  entityType: 'attendance' | 'grade' | 'merit' | 'fee',
  entityId: string
): Promise<void> {
  try {
    const lockRef = doc(db, 'dataLocks', `${entityType}_${entityId}`);
    await updateDoc(lockRef, {
      isLocked: false,
      unlockedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error unlocking record:', error);
    throw error;
  }
}

/**
 * Get lock information
 */
export async function getLockInfo(
  entityType: 'attendance' | 'grade' | 'merit' | 'fee',
  entityId: string
): Promise<DataLock | null> {
  try {
    const lockRef = doc(db, 'dataLocks', `${entityType}_${entityId}`);
    const lockSnap = await getDoc(lockRef);
    
    if (!lockSnap.exists()) {
      return null;
    }
    
    return { id: lockSnap.id, ...lockSnap.data() } as DataLock;
  } catch (error) {
    console.error('Error getting lock info:', error);
    return null;
  }
}

/**
 * Validate if user can edit a record
 */
export async function canEditRecord(
  recordDate: Date,
  entityType: 'attendance' | 'grade' | 'merit' | 'fee',
  entityId: string,
  userId: string
): Promise<{
  canEdit: boolean;
  reason?: string;
}> {
  // Check edit window
  if (!isWithinEditWindow(recordDate, entityType)) {
    const windowDays = EDIT_WINDOWS[entityType];
    return {
      canEdit: false,
      reason: `Edit window expired. Records can only be edited within ${windowDays} days.`
    };
  }
  
  // Check if locked
  const isLocked = await isRecordLocked(entityType, entityId);
  if (isLocked) {
    const lockInfo = await getLockInfo(entityType, entityId);
    if (lockInfo && lockInfo.lockedBy !== userId) {
      return {
        canEdit: false,
        reason: `Record is locked by ${lockInfo.lockedByName}. Reason: ${lockInfo.reason}`
      };
    }
  }
  
  return { canEdit: true };
}