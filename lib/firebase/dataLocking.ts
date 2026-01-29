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

// ADD THIS FUNCTION TO dataLocking.ts (OVERLOAD for grade/assessment checking)
// This is the version that grade entry components need

/**
 * Check if grades can be submitted for a specific term/session/assessment
 * This is an OVERLOADED version for grade submission validation
 */
export async function isWithinEditWindow(
  term: string,
  session: string,
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam',
  classId: string
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    // For grade submission, we check if we're within the current academic term
    // and if the specific assessment type is still open for recording
    
    // Get current academic session and term
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Determine current academic session (e.g., "2024/2025")
    let academicYear: string;
    if (currentMonth >= 9) {
      // September onwards is new academic year
      academicYear = `${currentYear}/${currentYear + 1}`;
    } else {
      academicYear = `${currentYear - 1}/${currentYear}`;
    }
    
    // Determine current term based on month
    let currentTerm: string;
    if (currentMonth >= 9 && currentMonth <= 12) {
      currentTerm = 'First Term';
    } else if (currentMonth >= 1 && currentMonth <= 4) {
      currentTerm = 'Second Term';
    } else {
      currentTerm = 'Third Term';
    }
    
    // Check if the requested term/session matches current term/session
    if (session !== academicYear) {
      return {
        allowed: false,
        reason: `Cannot record grades for past session. Current session is ${academicYear}, you're trying to record for ${session}.`
      };
    }
    
    if (term !== currentTerm) {
      return {
        allowed: false,
        reason: `Cannot record grades for different term. Current term is ${currentTerm}, you're trying to record for ${term}.`
      };
    }
    
    // Define cutoff dates for each assessment type (example - adjust as needed)
    // These represent when each assessment should be completed
    const assessmentCutoffs: Record<string, { month: number, day: number }> = {
      'First Term': {
        classwork: { month: 10, day: 31 },   // End of October
        homework: { month: 11, day: 15 },    // Mid November
        ca1: { month: 11, day: 30 },         // End of November
        ca2: { month: 12, day: 10 },         // Early December
        exam: { month: 12, day: 20 }         // Late December
      },
      'Second Term': {
        classwork: { month: 2, day: 28 },
        homework: { month: 3, day: 15 },
        ca1: { month: 3, day: 31 },
        ca2: { month: 4, day: 10 },
        exam: { month: 4, day: 20 }
      },
      'Third Term': {
        classwork: { month: 6, day: 30 },
        homework: { month: 7, day: 15 },
        ca1: { month: 7, day: 31 },
        ca2: { month: 8, day: 10 },
        exam: { month: 8, day: 20 }
      }
    };
    
    // For now, allow all grade submissions during the current term
    // You can implement stricter rules based on assessment cutoffs above
    
    // Allow 7-day grace period after cutoff
    const gracePeriodDays = 7;
    
    // Check if we have a cutoff for this term and assessment
    const termCutoffs = assessmentCutoffs[currentTerm];
    if (termCutoffs && termCutoffs[assessmentType]) {
      const cutoff = termCutoffs[assessmentType];
      const cutoffDate = new Date(currentYear, cutoff.month - 1, cutoff.day);
      cutoffDate.setDate(cutoffDate.getDate() + gracePeriodDays);
      
      if (now > cutoffDate) {
        return {
          allowed: false,
          reason: `${assessmentType.toUpperCase()} submission deadline has passed. Deadline was ${cutoffDate.toLocaleDateString()}.`
        };
      }
    }
    
    // All checks passed
    return {
      allowed: true
    };
    
  } catch (error) {
    console.error('Error checking edit window:', error);
    // On error, allow submission but log the error
    return {
      allowed: true,
      reason: 'Warning: Could not verify submission window, proceeding...'
    };
  }
}

// Keep the original function with different name for backward compatibility
export function isWithinEditWindowByDate(
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