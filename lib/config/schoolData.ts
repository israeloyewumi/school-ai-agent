// lib/config/schoolData.ts - Nigerian School System Configuration (FIXED)

/**
 * STANDARD NIGERIAN SCHOOL SUBJECTS ONLY
 * Based on NERDC (Nigerian Educational Research and Development Council) curriculum
 * NO non-standard subjects, NO experimental trades
 */

// ============================================
// GRADE LEVELS & CLASSES
// ============================================

export interface ClassInfo {
  classId: string;
  className: string;
  grade: number;
  section: string;
  level: 'Primary' | 'Junior Secondary' | 'Senior Secondary';
}

// Generate all classes (Grade 1-12, Sections A-D)
export function generateAllClasses(): ClassInfo[] {
  const classes: ClassInfo[] = [];
  const sections = ['A', 'B', 'C', 'D'];
  
  for (let grade = 1; grade <= 12; grade++) {
    const level = 
      grade <= 6 ? 'Primary' :
      grade <= 9 ? 'Junior Secondary' :
      'Senior Secondary';
    
    for (const section of sections) {
      classes.push({
        classId: `grade_${grade}${section.toLowerCase()}`,
        className: `Grade ${grade}${section}`,
        grade,
        section,
        level
      });
    }
  }
  
  return classes;
}

export const ALL_CLASSES = generateAllClasses();

export function getClassesByLevel(level: 'Primary' | 'Junior Secondary' | 'Senior Secondary'): ClassInfo[] {
  return ALL_CLASSES.filter(c => c.level === level);
}

export function getClassesByGrade(grade: number): ClassInfo[] {
  return ALL_CLASSES.filter(c => c.grade === grade);
}

// ============================================
// SUBJECT STRUCTURE
// ============================================

export type SubjectCategory = 'Core' | 'Science' | 'Arts' | 'Commercial' | 'Vocational' | 'Religious' | 'Language' | 'Elective';
export type AcademicTrack = 'Science' | 'Arts' | 'Commercial' | null;

export interface SubjectInfo {
  subjectId: string;
  subjectName: string;
  category: SubjectCategory;
  applicableLevels: ('Primary' | 'Junior Secondary' | 'Senior Secondary')[];
  applicableGrades: number[];
  isCore: boolean;
  isElective?: boolean;
  forTrack?: AcademicTrack;
}

// ============================================
// PRIMARY SUBJECTS (Grades 1-6) - ALL COMPULSORY
// ============================================

export const PRIMARY_CORE_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'english_language',
    subjectName: 'English Language',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'basic_science',
    subjectName: 'Basic Science',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'basic_technology',
    subjectName: 'Basic Technology',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'social_studies',
    subjectName: 'Social Studies',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'civic_education',
    subjectName: 'Civic Education',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'phe',
    subjectName: 'Physical & Health Education',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'cultural_creative_arts',
    subjectName: 'Cultural & Creative Arts',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'hausa',
    subjectName: 'Hausa Language',
    category: 'Language',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'christian_religious_studies',
    subjectName: 'Christian Religious Studies',
    category: 'Religious',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'islamic_studies',
    subjectName: 'Islamic Studies',
    category: 'Religious',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false,
    isElective: true
  }
];

// ============================================
// JSS ADDITIONAL CORE - EMPTY (All are core already)
// ============================================

export const JSS_ADDITIONAL_CORE: SubjectInfo[] = [
  // JSS has NO additional core subjects beyond the 9 primary core subjects
  // Business Studies and French are ELECTIVES for JSS
];

// ============================================
// JSS ELECTIVES (Students choose 2-3)
// ============================================

export const JSS_ELECTIVE_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'business_studies',
    subjectName: 'Business Studies',
    category: 'Commercial',
    applicableLevels: ['Junior Secondary'],
    applicableGrades: [7, 8, 9],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'french',
    subjectName: 'French Language',
    category: 'Language',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'agricultural_science',
    subjectName: 'Agricultural Science',
    category: 'Science',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'home_economics',
    subjectName: 'Home Economics',
    category: 'Vocational',
    applicableLevels: ['Junior Secondary'],
    applicableGrades: [7, 8, 9],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'computer_studies',
    subjectName: 'Computer Studies',
    category: 'Vocational',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'fine_arts',
    subjectName: 'Fine Arts',
    category: 'Arts',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'music',
    subjectName: 'Music',
    category: 'Arts',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  },
  {
    subjectId: 'technical_drawing',
    subjectName: 'Technical Drawing',
    category: 'Vocational',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false,
    isElective: true
  }
];

// ============================================
// SSS CORE SUBJECTS (ALL students)
// ============================================

export const SS_CORE_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'english_language',
    subjectName: 'English Language',
    category: 'Core',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    category: 'Core',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'civic_education',
    subjectName: 'Civic Education',
    category: 'Core',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'phe',
    subjectName: 'Physical & Health Education',
    category: 'Core',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: true
  }
];

// ============================================
// SSS SCIENCE TRACK (Choose 3-4 + electives)
// ============================================

export const SS_SCIENCE_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'biology',
    subjectName: 'Biology',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Science'
  },
  {
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Science'
  },
  {
    subjectId: 'physics',
    subjectName: 'Physics',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Science'
  },
  {
    subjectId: 'further_mathematics',
    subjectName: 'Further Mathematics',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Science'
  },
  {
    subjectId: 'agricultural_science',
    subjectName: 'Agricultural Science',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Science'
  },
  {
    subjectId: 'geography',
    subjectName: 'Geography',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Science'
  },
  {
    subjectId: 'computer_studies',
    subjectName: 'Computer Studies',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Science'
  },
  {
    subjectId: 'technical_drawing',
    subjectName: 'Technical Drawing',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Science'
  }
];

// ============================================
// SSS ARTS TRACK
// ============================================

export const SS_ARTS_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'literature_in_english',
    subjectName: 'Literature in English',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Arts'
  },
  {
    subjectId: 'government',
    subjectName: 'Government',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Arts'
  },
  {
    subjectId: 'history',
    subjectName: 'History',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Arts'
  },
  {
    subjectId: 'geography',
    subjectName: 'Geography',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Arts'
  },
  {
    subjectId: 'christian_religious_studies',
    subjectName: 'Christian Religious Studies',
    category: 'Religious',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  },
  {
    subjectId: 'islamic_studies',
    subjectName: 'Islamic Studies',
    category: 'Religious',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  },
  {
    subjectId: 'french',
    subjectName: 'French Language',
    category: 'Language',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  },
  {
    subjectId: 'fine_arts',
    subjectName: 'Fine Arts',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  },
  {
    subjectId: 'music',
    subjectName: 'Music',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  },
  {
    subjectId: 'hausa',
    subjectName: 'Hausa Language',
    category: 'Language',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Arts'
  }
];

// ============================================
// SSS COMMERCIAL TRACK
// ============================================

export const SS_COMMERCIAL_SUBJECTS: SubjectInfo[] = [
  {
    subjectId: 'economics',
    subjectName: 'Economics',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Commercial'
  },
  {
    subjectId: 'commerce',
    subjectName: 'Commerce',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Commercial'
  },
  {
    subjectId: 'accounting',
    subjectName: 'Accounting',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    forTrack: 'Commercial'
  },
  {
    subjectId: 'office_practice',
    subjectName: 'Office Practice',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Commercial'
  },
  {
    subjectId: 'marketing',
    subjectName: 'Marketing',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Commercial'
  },
  {
    subjectId: 'geography',
    subjectName: 'Geography',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false,
    isElective: true,
    forTrack: 'Commercial'
  }
];

// ============================================
// CONSOLIDATED SUBJECT LIST
// ============================================

export const ALL_SUBJECTS: SubjectInfo[] = [
  ...PRIMARY_CORE_SUBJECTS,
  ...JSS_ADDITIONAL_CORE,
  ...JSS_ELECTIVE_SUBJECTS,
  ...SS_SCIENCE_SUBJECTS,
  ...SS_ARTS_SUBJECTS,
  ...SS_COMMERCIAL_SUBJECTS
].filter((subject, index, self) => 
  // Remove duplicates by subjectId
  index === self.findIndex(s => s.subjectId === subject.subjectId)
);

// Alias for backwards compatibility
export const NIGERIAN_SUBJECTS = ALL_SUBJECTS;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSubjectsForGrade(grade: number): SubjectInfo[] {
  return ALL_SUBJECTS.filter(subject => 
    subject.applicableGrades.includes(grade)
  );
}

export function getCoreSubjectsForGrade(grade: number): SubjectInfo[] {
  return ALL_SUBJECTS.filter(subject => 
    subject.isCore && subject.applicableGrades.includes(grade)
  );
}

export function getElectiveSubjectsForGrade(grade: number): SubjectInfo[] {
  if (grade >= 7 && grade <= 9) {
    return JSS_ELECTIVE_SUBJECTS;
  }
  return [];
}

export function getSubjectsByTrack(track: AcademicTrack): SubjectInfo[] {
  if (!track) return [];
  
  if (track === 'Science') return SS_SCIENCE_SUBJECTS;
  if (track === 'Arts') return SS_ARTS_SUBJECTS;
  if (track === 'Commercial') return SS_COMMERCIAL_SUBJECTS;
  
  return [];
}

export function getSubjectById(subjectId: string): SubjectInfo | undefined {
  return ALL_SUBJECTS.find(s => s.subjectId === subjectId);
}

export function getClassById(classId: string): ClassInfo | undefined {
  return ALL_CLASSES.find(c => c.classId === classId);
}

export function getGradeLevel(grade: number): 'Primary' | 'Junior Secondary' | 'Senior Secondary' | null {
  if (grade >= 1 && grade <= 6) return 'Primary';
  if (grade >= 7 && grade <= 9) return 'Junior Secondary';
  if (grade >= 10 && grade <= 12) return 'Senior Secondary';
  return null;
}

export function requiresTrackSelection(grade: number): boolean {
  return grade >= 10 && grade <= 12;
}

export function getJSSElectiveRequirements(): { min: number; max: number } {
  return { min: 2, max: 3 };
}

export function getTradeSubjects(): SubjectInfo[] {
  // For now, return empty array - trade subjects are optional
  // Schools can use elective subjects instead
  return [];
}