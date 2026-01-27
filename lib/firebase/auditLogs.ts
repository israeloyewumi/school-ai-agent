// lib/firebase/auditLogs.ts - CLIENT SDK VERSION (COMPLETE)
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

export interface DetailedAuditLog {
  id?: string;
  userId: string;
  userRole: 'admin' | 'teacher' | 'parent' | 'student';
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  affectedEntity?: string;
  affectedEntityType?: string;
  details?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  beforeData?: any;
  afterData?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date | any;
  success: boolean;
  errorMessage?: string;
}

/**
 * Create a detailed audit log entry
 */
export async function createDetailedAuditLog(
  log: Omit<DetailedAuditLog, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'detailedAuditLogs'), {
      ...log,
      timestamp: serverTimestamp()
    });
    console.log('✅ Audit log created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw - audit logs shouldn't break the app
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
 * Get audit logs by action type
 */
export async function getAuditLogsByAction(
  action: string,
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
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limitCount: number = 50
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
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
 * NEW: Get audit logs for a specific affected entity (Admin SDK version)
 */
export async function getAffectedEntityAuditLogs(
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
    console.error('Error getting affected entity audit logs:', error);
    return [];
  }
}

/**
 * NEW: Get failed operations (for monitoring)
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
 * NEW: Get recent security verification attempts
 */
export async function getSecurityVerificationLogs(
  userId?: string,
  limitCount: number = 20
): Promise<DetailedAuditLog[]> {
  try {
    // Note: Client SDK doesn't support 'in' operator with multiple where clauses like Admin SDK
    // We'll fetch all and filter in memory
    let q;
    
    if (userId) {
      q = query(
        collection(db, 'detailedAuditLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount * 2) // Fetch more since we'll filter
      );
    } else {
      q = query(
        collection(db, 'detailedAuditLogs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount * 2) // Fetch more since we'll filter
      );
    }
    
    const snapshot = await getDocs(q);
    const logs = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DetailedAuditLog))
      .filter(log => 
        log.action === 'SECURITY_VERIFICATION_PASSED' || 
        log.action === 'SECURITY_VERIFICATION_FAILED'
      )
      .slice(0, limitCount);
    
    return logs;
  } catch (error) {
    console.error('Error getting security verification logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs (for dashboard)
 */
export async function getRecentAuditLogs(
  limitCount: number = 100
): Promise<DetailedAuditLog[]> {
  try {
    const q = query(
      collection(db, 'detailedAuditLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting recent audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs with filters
 */
export async function getFilteredAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}): Promise<DetailedAuditLog[]> {
  try {
    let queryConstraints: any[] = [];
    
    if (filters.userId) {
      queryConstraints.push(where('userId', '==', filters.userId));
    }
    
    if (filters.action) {
      queryConstraints.push(where('action', '==', filters.action));
    }
    
    if (filters.entityType) {
      queryConstraints.push(where('entityType', '==', filters.entityType));
    }
    
    if (filters.startDate) {
      queryConstraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    
    if (filters.endDate) {
      queryConstraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }
    
    queryConstraints.push(orderBy('timestamp', 'desc'));
    queryConstraints.push(limit(filters.limitCount || 100));
    
    const q = query(collection(db, 'detailedAuditLogs'), ...queryConstraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DetailedAuditLog));
  } catch (error) {
    console.error('Error getting filtered audit logs:', error);
    return [];
  }
}