// app/api/check-subjects/route.ts

import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function GET() {
  try {
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const subjects = subjectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      count: subjects.length,
      subjects: subjects.map(s => ({
        subjectId: s.subjectId || s.id,
        subjectName: s.subjectName || s.name,
        category: s.category
      }))
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}