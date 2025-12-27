// scripts/test-firebase.js - Test Firebase Connection
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Firebase Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing');
console.log('Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing');
console.log('App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing');

// Show actual Project ID (to verify it's not placeholder)
console.log('\n🆔 Project ID Value:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ NOT SET');

// Check if it's a placeholder
if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'your_project_id' || 
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.log('\n❌ ERROR: Firebase is not configured properly!');
  console.log('\n📝 To fix this:');
  console.log('1. Go to https://console.firebase.google.com');
  console.log('2. Select your project');
  console.log('3. Click ⚙️ Project Settings');
  console.log('4. Scroll to "Your apps" section');
  console.log('5. Copy the Firebase config values');
  console.log('6. Update your .env.local file');
  process.exit(1);
}

// Test Firebase connection
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('\n🔥 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully!');

// Try to write a test document
console.log('\n📝 Testing Firestore write permissions...');

addDoc(collection(db, 'test'), {
  message: 'Test write',
  timestamp: new Date()
})
  .then((docRef) => {
    console.log('✅ SUCCESS! Write test passed!');
    console.log('📄 Test document created with ID:', docRef.id);
    console.log('\n🎉 Firebase is configured correctly!');
    console.log('✅ You can now run the seed script safely.');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ FAILED! Cannot write to Firestore.');
    console.log('\n🔍 Error Details:');
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\n📋 FIX: Update Firestore Security Rules');
      console.log('1. Go to https://console.firebase.google.com');
      console.log('2. Select your project');
      console.log('3. Click "Firestore Database" → "Rules" tab');
      console.log('4. Change to:');
      console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
      `);
      console.log('5. Click "Publish"');
    }
    
    process.exit(1);
  });