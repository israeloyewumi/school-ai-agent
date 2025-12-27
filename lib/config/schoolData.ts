// lib/config/schoolData.ts - School Classes and Subjects Configuration

/**
 * Nigerian School System Configuration
 * Grades 1-12 with multiple sections per grade
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

// Pre-generated list for easy access
export const ALL_CLASSES = generateAllClasses();

// Get classes by level
export function getClassesByLevel(level: 'Primary' | 'Junior Secondary' | 'Senior Secondary'): ClassInfo[] {
  return ALL_CLASSES.filter(c => c.level === level);
}

// Get classes by grade
export function getClassesByGrade(grade: number): ClassInfo[] {
  return ALL_CLASSES.filter(c => c.grade === grade);
}

// ============================================
// NIGERIAN SCHOOL SUBJECTS
// ============================================

export interface SubjectInfo {
  subjectId: string;
  subjectName: string;
  category: 'Core' | 'Science' | 'Arts' | 'Commercial' | 'Vocational' | 'Religious';
  applicableLevels: ('Primary' | 'Junior Secondary' | 'Senior Secondary')[];
  applicableGrades: number[];
  isCore: boolean; // Required for all students
}

export const NIGERIAN_SUBJECTS: SubjectInfo[] = [
  // ============================================
  // CORE SUBJECTS (All Levels)
  // ============================================
  {
    subjectId: 'mathematics',
    subjectName: 'Mathematics',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  {
    subjectId: 'english',
    subjectName: 'English Language',
    category: 'Core',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: true
  },
  
  // ============================================
  // PRIMARY LEVEL (Grades 1-6)
  // ============================================
  {
    subjectId: 'basic_science',
    subjectName: 'Basic Science',
    category: 'Science',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: true
  },
  {
    subjectId: 'basic_technology',
    subjectName: 'Basic Technology',
    category: 'Vocational',
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
    subjectId: 'computer_studies',
    subjectName: 'Computer Studies',
    category: 'Vocational',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false
  },
  {
    subjectId: 'home_economics',
    subjectName: 'Home Economics',
    category: 'Vocational',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [4, 5, 6, 7, 8, 9],
    isCore: false
  },
  {
    subjectId: 'creative_arts',
    subjectName: 'Cultural & Creative Arts',
    category: 'Arts',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false
  },
  
  // ============================================
  // RELIGIOUS STUDIES
  // ============================================
  {
    subjectId: 'crk',
    subjectName: 'Christian Religious Studies',
    category: 'Religious',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'irk',
    subjectName: 'Islamic Religious Studies',
    category: 'Religious',
    applicableLevels: ['Primary', 'Junior Secondary', 'Senior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    isCore: false
  },
  
  // ============================================
  // NIGERIAN LANGUAGES
  // ============================================
  {
    subjectId: 'yoruba',
    subjectName: 'Yoruba Language',
    category: 'Arts',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false
  },
  {
    subjectId: 'hausa',
    subjectName: 'Hausa Language',
    category: 'Arts',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false
  },
  {
    subjectId: 'igbo',
    subjectName: 'Igbo Language',
    category: 'Arts',
    applicableLevels: ['Primary', 'Junior Secondary'],
    applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    isCore: false
  },
  
  // ============================================
  // JUNIOR SECONDARY SPECIFIC (Grades 7-9)
  // ============================================
  {
    subjectId: 'business_studies',
    subjectName: 'Business Studies',
    category: 'Commercial',
    applicableLevels: ['Junior Secondary'],
    applicableGrades: [7, 8, 9],
    isCore: false
  },
  {
    subjectId: 'agricultural_science',
    subjectName: 'Agricultural Science',
    category: 'Science',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'french',
    subjectName: 'French Language',
    category: 'Arts',
    applicableLevels: ['Junior Secondary', 'Senior Secondary'],
    applicableGrades: [7, 8, 9, 10, 11, 12],
    isCore: false
  },
  
  // ============================================
  // SENIOR SECONDARY - SCIENCE (Grades 10-12)
  // ============================================
  {
    subjectId: 'biology',
    subjectName: 'Biology',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'chemistry',
    subjectName: 'Chemistry',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'physics',
    subjectName: 'Physics',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'further_mathematics',
    subjectName: 'Further Mathematics',
    category: 'Science',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  
  // ============================================
  // SENIOR SECONDARY - ARTS (Grades 10-12)
  // ============================================
  {
    subjectId: 'literature',
    subjectName: 'Literature in English',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'government',
    subjectName: 'Government',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'history',
    subjectName: 'History',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'geography',
    subjectName: 'Geography',
    category: 'Arts',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  
  // ============================================
  // SENIOR SECONDARY - COMMERCIAL (Grades 10-12)
  // ============================================
  {
    subjectId: 'economics',
    subjectName: 'Economics',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'commerce',
    subjectName: 'Commerce',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'accounting',
    subjectName: 'Financial Accounting',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
  {
    subjectId: 'business_management',
    subjectName: 'Business Management',
    category: 'Commercial',
    applicableLevels: ['Senior Secondary'],
    applicableGrades: [10, 11, 12],
    isCore: false
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get subjects applicable for a specific grade
 */
export function getSubjectsForGrade(grade: number): SubjectInfo[] {
  return NIGERIAN_SUBJECTS.filter(subject => 
    subject.applicableGrades.includes(grade)
  );
}

/**
 * Get subjects by category
 */
export function getSubjectsByCategory(category: SubjectInfo['category']): SubjectInfo[] {
  return NIGERIAN_SUBJECTS.filter(subject => subject.category === category);
}

/**
 * Get core subjects for a grade
 */
export function getCoreSubjectsForGrade(grade: number): SubjectInfo[] {
  return NIGERIAN_SUBJECTS.filter(subject => 
    subject.isCore && subject.applicableGrades.includes(grade)
  );
}

/**
 * Get subject by ID
 */
export function getSubjectById(subjectId: string): SubjectInfo | undefined {
  return NIGERIAN_SUBJECTS.find(s => s.subjectId === subjectId);
}

/**
 * Get class by ID
 */
export function getClassById(classId: string): ClassInfo | undefined {
  return ALL_CLASSES.find(c => c.classId === classId);
}

/**
 * Check if a class already has a class teacher
 */
export async function isClassTeacherAvailable(classId: string): Promise<boolean> {
  // This will be implemented in classManagement.ts
  // For now, return true
  return true;
}

/**
 * Get all available classes (classes without a class teacher)
 */
export async function getAvailableClasses(): Promise<ClassInfo[]> {
  // This will be implemented in classManagement.ts
  // For now, return all classes
  return ALL_CLASSES;
}