// lib/firebase/adminManagement.ts - Admin CRUD Operations

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
import { Admin, AdminDepartment, DEFAULT_ADMIN_PERMISSIONS } from '@/types/database';
import { createDetailedAuditLog } from './auditLogs';

/**
 * Create a new admin record
 */
export async function createAdmin(admin: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    console.log('📝 Creating admin record:', admin.email);
    
    const adminData = {
      ...admin,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'admins', admin.adminId), adminData);
    
    console.log('✅ Admin record created:', admin.adminId);
    
    // Create audit log
    await createDetailedAuditLog({
      userId: admin.userId,
      userRole: 'admin',
      userName: `${admin.firstName} ${admin.lastName}`,
      action: 'USER_REGISTERED',
      details: `New admin registered - ${admin.departmentName}`,
      affectedEntity: admin.adminId,
      affectedEntityType: 'user',
      timestamp: new Date(),
      success: true
    });
    
    return admin.adminId;
  } catch (error: any) {
    console.error('❌ Create admin error:', error);
    throw new Error(`Failed to create admin: ${error.message}`);
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(adminId: string): Promise<Admin | null> {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', adminId));
    
    if (!adminDoc.exists()) {
      return null;
    }
    
    return {
      id: adminDoc.id,
      ...adminDoc.data()
    } as Admin;
  } catch (error) {
    console.error('Get admin error:', error);
    return null;
  }
}

/**
 * Get all admins
 */
export async function getAllAdmins(): Promise<Admin[]> {
  try {
    const adminsSnapshot = await getDocs(collection(db, 'admins'));
    
    return adminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Admin));
  } catch (error) {
    console.error('Get all admins error:', error);
    return [];
  }
}

/**
 * Get active admins only
 */
export async function getActiveAdmins(): Promise<Admin[]> {
  try {
    const q = query(
      collection(db, 'admins'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Admin));
  } catch (error) {
    console.error('Get active admins error:', error);
    return [];
  }
}

/**
 * Get admins by department
 */
export async function getAdminsByDepartment(department: AdminDepartment): Promise<Admin[]> {
  try {
    const q = query(
      collection(db, 'admins'),
      where('department', '==', department),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Admin));
  } catch (error) {
    console.error('Get admins by department error:', error);
    return [];
  }
}

/**
 * Update admin
 */
export async function updateAdmin(
  adminId: string,
  updates: Partial<Admin>,
  updatedBy: string,
  updatedByName: string
): Promise<void> {
  try {
    const adminRef = doc(db, 'admins', adminId);
    
    await updateDoc(adminRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    await createDetailedAuditLog({
      userId: updatedBy,
      userRole: 'admin',
      userName: updatedByName,
      action: 'USER_REGISTERED',
      details: `Updated admin: ${adminId}`,
      affectedEntity: adminId,
      affectedEntityType: 'user',
      timestamp: new Date(),
      success: true
    });
    
    console.log('✅ Admin updated:', adminId);
  } catch (error: any) {
    console.error('❌ Update admin error:', error);
    throw new Error(`Failed to update admin: ${error.message}`);
  }
}

/**
 * Deactivate admin (soft delete)
 */
export async function deactivateAdmin(
  adminId: string,
  deactivatedBy: string,
  deactivatedByName: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'admins', adminId), {
      isActive: false,
      updatedAt: Timestamp.now()
    });
    
    await createDetailedAuditLog({
      userId: deactivatedBy,
      userRole: 'admin',
      userName: deactivatedByName,
      action: 'USER_REGISTERED',
      details: `Deactivated admin: ${adminId}`,
      affectedEntity: adminId,
      affectedEntityType: 'user',
      timestamp: new Date(),
      success: true
    });
    
    console.log('✅ Admin deactivated:', adminId);
  } catch (error: any) {
    console.error('❌ Deactivate admin error:', error);
    throw new Error(`Failed to deactivate admin: ${error.message}`);
  }
}

/**
 * Activate admin
 */
export async function activateAdmin(
  adminId: string,
  activatedBy: string,
  activatedByName: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'admins', adminId), {
      isActive: true,
      updatedAt: Timestamp.now()
    });
    
    await createDetailedAuditLog({
      userId: activatedBy,
      userRole: 'admin',
      userName: activatedByName,
      action: 'USER_REGISTERED',
      details: `Activated admin: ${adminId}`,
      affectedEntity: adminId,
      affectedEntityType: 'user',
      timestamp: new Date(),
      success: true
    });
    
    console.log('✅ Admin activated:', adminId);
  } catch (error: any) {
    console.error('❌ Activate admin error:', error);
    throw new Error(`Failed to activate admin: ${error.message}`);
  }
}

/**
 * Delete admin permanently
 */
export async function deleteAdmin(
  adminId: string,
  deletedBy: string,
  deletedByName: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admins', adminId));
    
    await createDetailedAuditLog({
      userId: deletedBy,
      userRole: 'admin',
      userName: deletedByName,
      action: 'DATA_DELETED',
      details: `Permanently deleted admin: ${adminId}`,
      affectedEntity: adminId,
      affectedEntityType: 'user',
      timestamp: new Date(),
      success: true
    });
    
    console.log('✅ Admin deleted:', adminId);
  } catch (error: any) {
    console.error('❌ Delete admin error:', error);
    throw new Error(`Failed to delete admin: ${error.message}`);
  }
}

/**
 * Check if user has admin permission for a specific action
 */
export async function hasPermission(
  adminId: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const admin = await getAdminById(adminId);
    
    if (!admin || !admin.isActive) {
      return false;
    }
    
    // Super admins have all permissions
    if (admin.isSuperAdmin) {
      return true;
    }
    
    // Check specific permissions
    const hasPermission = admin.permissions.some(perm => {
      if (perm.module === 'all' || perm.module === module) {
        return perm.actions.includes(action as any);
      }
      return false;
    });
    
    return hasPermission;
  } catch (error) {
    console.error('Check permission error:', error);
    return false;
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats() {
  try {
    const allAdmins = await getAllAdmins();
    const activeAdmins = allAdmins.filter(a => a.isActive);
    
    return {
      total: allAdmins.length,
      active: activeAdmins.length,
      inactive: allAdmins.length - activeAdmins.length,
      byDepartment: {
        ceo: allAdmins.filter(a => a.department === 'ceo').length,
        principal: allAdmins.filter(a => a.department === 'principal').length,
        vice_principal: allAdmins.filter(a => a.department === 'vice_principal').length,
        hod: allAdmins.filter(a => a.department === 'hod').length,
        admin_staff: allAdmins.filter(a => a.department === 'admin_staff').length
      },
      superAdmins: allAdmins.filter(a => a.isSuperAdmin).length
    };
  } catch (error) {
    console.error('Get admin stats error:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      byDepartment: {
        ceo: 0,
        principal: 0,
        vice_principal: 0,
        hod: 0,
        admin_staff: 0
      },
      superAdmins: 0
    };
  }
}