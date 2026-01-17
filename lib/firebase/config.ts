import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAIz1mGLfO4efg9lBnbyUYmi1kbagqghRI",
  authDomain: "school-ai-mg.firebaseapp.com",
  projectId: "school-ai-mg",
  storageBucket: "school-ai-mg.firebasestorage.app",
  messagingSenderId: "12984998180",
  appId: "1:12984998180:web:37e478c6427e001f503bb1",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;