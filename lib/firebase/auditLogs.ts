// lib/firebase/auditLogs.ts - Audit Logging Service

import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { DetailedAuditLog, AuditAction } from '@/types/database';

/**
 * Create a detailed audit log entry
 */
export async function createDetailedAuditLog(
  log: Omit<DetailedAuditLog, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'detailedAuditLogs'), {
      ...log,
      timestamp: Timestamp.now()
    });
    
    console.log('✅ Audit log created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw - audit logging should never break the main flow
    return '';
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limitCount: number = 50
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting user audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific action type
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limitCount: number = 50
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      where('action', '==', action),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting audit logs by action:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific entity (e.g., a student)
 */
export async function getEntityAuditLogs(
  entityId: string,
  limitCount: number = 50
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      where('affectedEntity', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting entity audit logs:', error);
    return [];
  }
}

/**
 * Get failed operations (for monitoring)
 */
export async function getFailedOperations(
  limitCount: number = 50
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      where('success', '==', false),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting failed operations:', error);
    return [];
  }
}

/**
 * Get recent security verification attempts
 */
export async function getSecurityVerificationLogs(
  userId?: string,
  limitCount: number = 20
): Promise<DetailedAuditLog[]> {
  try {
    let q;
    
    if (userId) {
      q = query(
        collection(db, 'detailedAuditLogs'),
        where('userId', '==', userId),
        where('action', 'in', ['SECURITY_VERIFICATION_PASSED', 'SECURITY_VERIFICATION_FAILED']),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'detailedAuditLogs'),
        where('action', 'in', ['SECURITY_VERIFICATION_PASSED', 'SECURITY_VERIFICATION_FAILED']),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting security verification logs:', error);
    return [];
  }
}