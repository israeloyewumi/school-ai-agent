// scripts/initializeSchoolData.ts - One-time setup script to initialize classes and subjects

import { initializeAllClasses } from '../lib/firebase/classManagement';
import { initializeAllSubjects } from '../lib/firebase/subjectManagement';

/**
 * Run this script ONCE to set up your school database
 * It will create all Grade 1-12 classes and all Nigerian subjects
 */
async function initializeSchoolData() {
  console.log('🚀 Starting school data initialization...');
  console.log('');

  try {
    // Step 1: Initialize all classes (Grade 1A-12D)
    console.log('📚 Step 1: Creating all classes (Grade 1-12, sections A-D)...');
    await initializeAllClasses();
    console.log('✅ Classes initialized successfully!');
    console.log('   - Created 48 classes (12 grades × 4 sections)');
    console.log('');

    // Step 2: Initialize all subjects
    console.log('📖 Step 2: Creating all Nigerian curriculum subjects...');
    await initializeAllSubjects();
    console.log('✅ Subjects initialized successfully!');
    console.log('   - Created all core and elective subjects');
    console.log('');

    console.log('🎉 School data initialization complete!');
    console.log('');
    console.log('✅ You can now:');
    console.log('   1. Approve teacher registrations');
    console.log('   2. Assign teachers to classes and subjects');
    console.log('   3. Start using the system');
    console.log('');
    console.log('⚠️  NOTE: Only run this script ONCE. Running it again will overwrite existing data.');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Run the initialization
initializeSchoolData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });