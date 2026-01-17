import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export Firestore instance
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;