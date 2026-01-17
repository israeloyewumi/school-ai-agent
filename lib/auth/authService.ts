// lib/auth/authService.ts - Firebase SDK Authentication Service
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { AuthUser } from '@/types/auth';

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
 * Register a new user (placeholder - actual registration handled by Firebase Functions)
 */
export async function registerUser(data: any): Promise<void> {
  // This is handled by your registration page which calls Firebase Functions
  // Just throw error if someone tries to call this directly
  throw new Error('Registration must be done through the registration page');
}