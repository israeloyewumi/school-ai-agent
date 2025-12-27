// types/auth.ts - Authentication Types (Phase A Update - Admin Enhanced)

import { TeacherType, AdminDepartment } from './database';

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePhoto?: string;
  isActive: boolean;
  isPending: boolean; // NEW: For admin approval (teachers)
  
  // Role-specific IDs
  studentId?: string;
  teacherId?: string;
  parentId?: string;
  adminId?: string;
  
  // NEW: Approval tracking
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: UserRole;
  
  // Role-specific data
  admissionNumber?: string; // For students
  staffId?: string; // For teachers
  parentId?: string; // For parents linking to existing parent record
  
  // NEW: Teacher-specific registration data
  teacherType?: TeacherType; // 'class_teacher' | 'subject_teacher' | 'both'
  requestedClass?: {
    classId: string;
    className: string;
  };
  requestedSubjects?: {
    subjectId: string;
    subjectName: string;
    classes: string[]; // Array of class IDs
  }[];
  
  // NEW: Admin-specific registration data
  adminDepartment?: AdminDepartment; // 'ceo' | 'principal' | 'vice_principal' | 'hod' | 'admin_staff'
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: Date;
  success: boolean;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

// NEW: Teacher approval status
export interface TeacherApprovalStatus {
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}