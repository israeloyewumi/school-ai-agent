// lib/auth/authService.ts - Authentication Service (UPDATED with Parent Registration)

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { AuthUser, LoginCredentials, RegisterData, AuditLog } from '@/types/auth';
import { createTeacher } from '@/lib/firebase/teacherManagement';
import { createPendingApproval } from '@/lib/firebase/teacherManagement';
import { createParent, addChildToParent } from '@/lib/firebase/parentManagement';
import { createStudent } from '@/lib/firebase/studentManagement';
import { 
  assignClassTeacher, 
  assignSubjectTeacher 
} from '@/lib/firebase/classManagement';
import { addTeacherToSubject } from '@/lib/firebase/subjectManagement';

/**
 * Register a new user (Enhanced for Teacher & Parent Registration)
 */
export async function registerUser(data: RegisterData): Promise<AuthUser> {
  try {
    console.log('📝 Starting registration for:', data.email, 'Role:', data.role);
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    
    const firebaseUser = userCredential.user;
    
    console.log('✅ Firebase Auth user created:', firebaseUser.uid);
    
    // Determine if user needs approval (only teachers)
    const needsApproval = data.role === 'teacher';
    
    // Build the user document data
    const firestoreData: any = {
      id: firebaseUser.uid,
      email: data.email,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      isActive: needsApproval ? false : true, // Teachers start inactive
      isPending: needsApproval ? true : false, // Teachers need approval
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    // Add role-specific IDs
    if (data.role === 'student' && data.admissionNumber) {
      firestoreData.studentId = data.admissionNumber;
    } else if (data.role === 'teacher') {
      firestoreData.teacherId = firebaseUser.uid;
      if (data.staffId) {
        firestoreData.staffId = data.staffId;
      }
    } else if (data.role === 'parent') {
      firestoreData.parentId = firebaseUser.uid;
    } else if (data.role === 'admin') {
      firestoreData.adminId = firebaseUser.uid;
    }
    
    console.log('💾 Saving user to Firestore:', {
      userId: firebaseUser.uid,
      role: data.role,
      needsApproval
    });
    
    // Save to Firestore users collection
    await setDoc(doc(db, 'users', firebaseUser.uid), firestoreData);
    
    console.log('✅ User document saved to Firestore');
    
    // TEACHER REGISTRATION: Create teacher record and pending approval
    if (data.role === 'teacher' && data.teacherType) {
      console.log('👨‍🏫 Creating teacher record...');
      
      // Determine teacher flags
      const isClassTeacher = data.teacherType === 'class_teacher' || data.teacherType === 'both';
      const isSubjectTeacher = data.teacherType === 'subject_teacher' || data.teacherType === 'both';
      
      // Create teacher record (filter out undefined values for Firestore)
      const teacherData: any = {
        teacherId: firebaseUser.uid,
        userId: firebaseUser.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber || '',
        staffId: data.staffId || `STAFF_${Date.now()}`,
        qualification: '',
        specialization: '',
        dateOfJoining: new Date(),
        employmentType: 'full-time',
        teacherType: data.teacherType,
        isClassTeacher,
        isSubjectTeacher,
        subjects: data.requestedSubjects || [],
        classes: [],
        isActive: false,
        isPending: true
      };

      // Only add assignedClass if it exists
      if (data.requestedClass) {
        teacherData.assignedClass = {
          classId: data.requestedClass.classId,
          className: data.requestedClass.className,
          assignedDate: new Date()
        };
      }

      await createTeacher(teacherData);
      
      console.log('✅ Teacher record created');
      
      // Create pending approval request
      await createPendingApproval({
        userId: firebaseUser.uid,
        teacherId: firebaseUser.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        teacherType: data.teacherType,
        requestedClass: data.requestedClass,
        requestedSubjects: data.requestedSubjects,
        status: 'pending',
        submittedAt: new Date()
      });
      
      console.log('✅ Pending approval request created');
    }
    
    // PARENT REGISTRATION: Create parent and children records
    if (data.role === 'parent' && data.children && data.children.length > 0) {
      console.log('👨‍👩‍👧 Creating parent record with children...');
      
      // Create parent record
      const parentData: any = {
        id: firebaseUser.uid,
        parentId: firebaseUser.uid,
        userId: firebaseUser.uid,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber || '',
        relationship: data.relationship || 'guardian',
        occupation: data.occupation,
        workplace: data.workplace,
        address: data.address,
        children: [], // Will be populated as we create students
        isActive: true
      };

      await createParent(parentData);
      console.log('✅ Parent record created');

      // Create student records for each child
      const createdStudentIds: string[] = [];
      
      for (const child of data.children) {
        console.log(`👶 Creating student record for: ${child.firstName} ${child.lastName}`);
        
        const studentData: any = {
          firstName: child.firstName,
          lastName: child.lastName,
          gender: child.gender,
          dateOfBirth: child.dateOfBirth,
          age: child.age,
          classId: child.classId,
          className: child.className,
          parentId: firebaseUser.uid,
          guardianId: firebaseUser.uid,
          address: data.address || '',
          city: '',
          state: '',
          emergencyContact: `${data.firstName} ${data.lastName}`,
          emergencyPhone: data.phoneNumber || '',
          isActive: true
        };

        const createdStudent = await createStudent(studentData);
        createdStudentIds.push(createdStudent.studentId);
        
        console.log(`✅ Student created: ${createdStudent.studentId} (${createdStudent.admissionNumber})`);
      }

      // Update parent with all children IDs
      const parentRef = doc(db, 'parents', firebaseUser.uid);
      await updateDoc(parentRef, {
        children: createdStudentIds,
        updatedAt: new Date()
      });

      console.log('✅ Parent updated with children IDs:', createdStudentIds);
    }
    
    // Log the registration
    await createAuditLog({
      userId: firebaseUser.uid,
      userName: `${data.firstName} ${data.lastName}`,
      action: 'USER_REGISTERED',
      details: needsApproval 
        ? `New ${data.role} account created - Pending admin approval`
        : data.role === 'parent' && data.children
        ? `New parent account created with ${data.children.length} children`
        : `New ${data.role} account created`,
      timestamp: new Date(),
      success: true
    });
    
    console.log('✅ Registration complete');
    
    return firestoreData as AuthUser;
  } catch (error: any) {
    console.error('❌ Registration error:', error);
    throw new Error(error.message || 'Failed to register user');
  }
}

/**
 * Login user with email and password (Enhanced with Pending Check)
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }
    
    const userData = userDoc.data() as AuthUser;
    
    // Check if user is pending approval (teachers only)
    if (userData.isPending && !userData.isActive) {
      await firebaseSignOut(auth);
      throw new Error('Your account is pending admin approval. You will receive an email notification once approved.');
    }
    
    // Check if user is active
    if (!userData.isActive) {
      await firebaseSignOut(auth);
      throw new Error('Account is deactivated. Contact admin.');
    }
    
    // Check if user was rejected
    if (userData.rejectedBy) {
      await firebaseSignOut(auth);
      const reason = userData.rejectionReason || 'No reason provided';
      throw new Error(`Your registration was rejected. Reason: ${reason}`);
    }
    
    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: Timestamp.now()
    });
    
    // Log the login
    await createAuditLog({
      userId: firebaseUser.uid,
      userName: `${userData.firstName} ${userData.lastName}`,
      action: 'USER_LOGIN',
      details: `${userData.role} logged in`,
      timestamp: new Date(),
      success: true
    });
    
    return {
      ...userData,
      lastLogin: new Date()
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Log failed login attempt
    await createAuditLog({
      userId: 'unknown',
      userName: credentials.email,
      action: 'LOGIN_FAILED',
      details: error.message,
      timestamp: new Date(),
      success: false
    });
    
    throw new Error(error.message || 'Failed to login');
  }
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<void> {
  try {
    const user = auth.currentUser;
    
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      await createAuditLog({
        userId: user.uid,
        userName: userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown',
        action: 'USER_LOGOUT',
        details: `${userData?.role || 'User'} logged out`,
        timestamp: new Date(),
        success: true
      });
    }
    
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser) {
      return null;
    }
    
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return userDoc.data() as AuthUser;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Create audit log entry
 */
export async function createAuditLog(log: Omit<AuditLog, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), {
      ...log,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Create audit log error:', error);
    // Don't throw error - logging should not break the main flow
    return '';
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<AuthUser>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    throw new Error('Failed to update profile');
  }
}