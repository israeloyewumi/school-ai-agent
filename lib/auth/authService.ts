// lib/auth/authService.ts - Firebase SDK Authentication Service (COMPLETE)
// ✅ FIXED: Handles undefined requestedClass for subject-only teachers
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { AuthUser, RegisterData } from '@/types/auth';
import { createPendingApproval as submitTeacherForApproval } from '@/lib/firebase/teacherManagement';
import { submitParentForApproval } from '@/lib/firebase/parentManagement';
import { createAdmin } from '@/lib/firebase/adminManagement';

/**
 * Get the current authenticated user with their role data
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      
      if (!firebaseUser) {
        resolve(null);
        return;
      }

      try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (!userDoc.exists()) {
          resolve(null);
          return;
        }

        const userData = userDoc.data();
        
        // Return AuthUser object
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: userData.phoneNumber || '',
          role: userData.role,
          studentId: userData.studentId,
          teacherId: userData.teacherId,
          parentId: userData.parentId,
          adminId: userData.adminId,
        };

        resolve(authUser);
      } catch (error) {
        console.error('Error getting user data:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;
  
  // Get user data from Firestore
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  
  if (!userDoc.exists()) {
    throw new Error('User data not found');
  }

  const userData = userDoc.data();
  
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    phoneNumber: userData.phoneNumber || '',
    role: userData.role,
    studentId: userData.studentId,
    teacherId: userData.teacherId,
    parentId: userData.parentId,
    adminId: userData.adminId,
  };
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<FirebaseUser> {
  try {
    console.log('🔐 Starting registration for:', data.email, 'Role:', data.role);

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    const user = userCredential.user;
    console.log('✅ Firebase Auth user created:', user.uid);

    // Create base user record in 'users' collection
    const baseUserData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Handle role-specific registration
      switch (data.role) {
        case 'student':
          await handleStudentRegistration(user.uid, data, baseUserData);
          break;

        case 'teacher':
          await handleTeacherRegistration(user.uid, data, baseUserData);
          break;

        case 'parent':
          await handleParentRegistration(user.uid, data, baseUserData);
          break;

        case 'admin':
          await handleAdminRegistration(user.uid, data, baseUserData);
          break;

        default:
          throw new Error('Invalid role');
      }

      console.log('✅ Registration complete for:', data.email);
      
      // Sign out the user after registration (they'll need to login after approval)
      if (data.role === 'teacher' || data.role === 'parent') {
        await signOut(auth);
        console.log('✅ User signed out (awaiting approval)');
      }
      
      return user;

    } catch (error) {
      // If role-specific creation fails, delete the Auth user
      console.error('❌ Role-specific registration failed, cleaning up Auth user...');
      await user.delete();
      throw error;
    }

  } catch (error: any) {
    console.error('❌ Registration error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please login instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    
    throw new Error(error.message || 'Registration failed');
  }
}

/**
 * Handle student registration
 */
async function handleStudentRegistration(
  userId: string, 
  data: RegisterData,
  baseUserData: any
): Promise<void> {
  console.log('📚 Creating student record...');
  
  // Students should be registered by parents or admin, not self-registration
  throw new Error('Student self-registration is not allowed. Students should be registered by their parents or school admin.');
}

/**
 * Handle teacher registration (requires admin approval)
 */
async function handleTeacherRegistration(
  userId: string, 
  data: RegisterData,
  baseUserData: any
): Promise<void> {
  console.log('👨‍🏫 Creating teacher approval request...');

  if (!data.teacherType) {
    throw new Error('Teacher type is required');
  }

  // Validate required fields based on teacher type
  if ((data.teacherType === 'class_teacher' || data.teacherType === 'both') && !data.requestedClass) {
    throw new Error('Class selection is required for class teachers');
  }

  if ((data.teacherType === 'subject_teacher' || data.teacherType === 'both') && 
      (!data.requestedSubjects || data.requestedSubjects.length === 0)) {
    throw new Error('Subject selection is required for subject teachers');
  }

  // Create base user record (pending approval)
  await setDoc(doc(db, 'users', userId), {
    ...baseUserData,
    teacherId: null, // Will be set after approval
    isApproved: false,
    approvalStatus: 'pending'
  });

  // ✅ FIX: Build approval data object, only including defined fields
  const approvalData: any = {
    userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    teacherType: data.teacherType,
  };

  // Only add requestedClass if it exists (for class teachers)
  if (data.requestedClass) {
    approvalData.requestedClass = data.requestedClass;
  }

  // Only add requestedSubjects if it exists (for subject teachers)
  if (data.requestedSubjects && data.requestedSubjects.length > 0) {
    approvalData.requestedSubjects = data.requestedSubjects;
  }

  // Submit teacher for approval
  await submitTeacherForApproval(approvalData);

  console.log('✅ Teacher submitted for approval');
}

/**
 * Handle parent registration (requires admin approval)
 */
async function handleParentRegistration(
  userId: string, 
  data: RegisterData,
  baseUserData: any
): Promise<void> {
  console.log('👨‍👩‍👧 Creating parent approval request...');

  if (!data.children || data.children.length === 0) {
    throw new Error('At least one child is required for parent registration');
  }

  if (!data.address) {
    throw new Error('Home address is required for parent registration');
  }

  // Validate all children have required subject data
  for (const child of data.children) {
    if (!child.subjects || child.subjects.length === 0) {
      throw new Error(`Subject selection is required for ${child.firstName} ${child.lastName}`);
    }
  }

  // Create base user record (pending approval)
  await setDoc(doc(db, 'users', userId), {
    ...baseUserData,
    parentId: null, // Will be set after approval
    isApproved: false,
    approvalStatus: 'pending'
  });

  // Submit parent for approval with children data
  await submitParentForApproval({
    userId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    relationship: data.relationship || 'parent',
    occupation: data.occupation,
    workplace: data.workplace,
    address: data.address,
    children: data.children
  });

  console.log('✅ Parent submitted for approval with', data.children.length, 'children');
}

/**
 * Handle admin registration (immediate activation)
 */
async function handleAdminRegistration(
  userId: string, 
  data: RegisterData,
  baseUserData: any
): Promise<void> {
  console.log('👑 Creating admin record...');

  if (!data.adminDepartment) {
    throw new Error('Admin department is required');
  }

  // Create admin record immediately (no approval needed)
  const adminId = `admin_${Date.now()}`;
  
  await createAdmin({
    userId,
    adminId,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    department: data.adminDepartment,
    departmentName: getDepartmentName(data.adminDepartment),
    isActive: true,
    isSuperAdmin: data.adminDepartment === 'ceo',
    permissions: getDefaultPermissions(data.adminDepartment),
    profileImageUrl: null,
    lastLogin: null,
    metadata: {}
  });

  // Create base user record with adminId
  await setDoc(doc(db, 'users', userId), {
    ...baseUserData,
    adminId,
    isApproved: true,
    approvalStatus: 'approved'
  });

  console.log('✅ Admin created:', adminId);
}

/**
 * Get department display name
 */
function getDepartmentName(department: string): string {
  const names: Record<string, string> = {
    'ceo': 'Chief Executive Officer',
    'principal': 'Principal',
    'vice_principal': 'Vice Principal',
    'hod': 'Head of Department',
    'admin_staff': 'Administrative Staff'
  };
  return names[department] || department;
}

/**
 * Get default permissions based on department
 */
function getDefaultPermissions(department: string): any[] {
  // CEO and Principal get all permissions
  if (department === 'ceo' || department === 'principal') {
    return [
      { module: 'all', actions: ['create', 'read', 'update', 'delete'] }
    ];
  }

  // Vice Principal gets most permissions
  if (department === 'vice_principal') {
    return [
      { module: 'students', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'teachers', actions: ['read', 'update'] },
      { module: 'classes', actions: ['read', 'update'] },
      { module: 'attendance', actions: ['read', 'update'] },
      { module: 'grades', actions: ['read', 'update'] }
    ];
  }

  // HOD gets department-specific permissions
  if (department === 'hod') {
    return [
      { module: 'students', actions: ['read', 'update'] },
      { module: 'teachers', actions: ['read'] },
      { module: 'classes', actions: ['read', 'update'] },
      { module: 'attendance', actions: ['read', 'update'] },
      { module: 'grades', actions: ['read', 'update'] }
    ];
  }

  // Admin staff gets limited permissions
  return [
    { module: 'students', actions: ['read'] },
    { module: 'teachers', actions: ['read'] },
    { module: 'classes', actions: ['read'] },
    { module: 'attendance', actions: ['read'] }
  ];
}