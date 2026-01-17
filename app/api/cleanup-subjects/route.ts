// app/api/cleanup-subjects/route.ts

import { NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function DELETE() {
  try {
    console.log('🗑️ Starting subject cleanup...');
    
    // Get all existing subjects
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    console.log(`📊 Found ${subjectsSnapshot.docs.length} subjects to delete`);
    
    // Delete each subject
    let deletedCount = 0;
    for (const subjectDoc of subjectsSnapshot.docs) {
      await deleteDoc(doc(db, 'subjects', subjectDoc.id));
      deletedCount++;
      
      if (deletedCount % 5 === 0) {
        console.log(`  ✓ Deleted ${deletedCount}/${subjectsSnapshot.docs.length} subjects...`);
      }
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} subjects`);
    
    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} old subjects`
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}