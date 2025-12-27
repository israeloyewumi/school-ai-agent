// scripts/seed-database.js
// Comprehensive Firebase Seed Script with Real Names and Data

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} = require('firebase/firestore');

// Firebase configuration - YOU MUST UPDATE THIS
const firebaseConfig = {
  apiKey: "AIzaSyAIz1mGLfO4efg9lBnbyUYmi1kbagqghRI",
  authDomain: "school-ai-mg.firebaseapp.com",
  projectId: "school-ai-mg",
  storageBucket: "school-ai-mg.firebasestorage.app",
  messagingSenderId: "12984998180",
  appId: "1:12984998180:web:37e478c6427e001f503bb1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to create timestamps
const now = () => Timestamp.now();
const daysAgo = (days) => Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
const daysFromNow = (days) => Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

// Current academic session details
const CURRENT_TERM = "First Term";
const CURRENT_SESSION = "2024/2025";

// ============================================
// SEED DATA DEFINITIONS
// ============================================

const users = [
  // STUDENTS
  {
    id: "STU2024001",
    email: "chidi.okonkwo@school.edu.ng",
    firstName: "Chidi",
    lastName: "Okonkwo",
    role: "student",
    phoneNumber: "+234 803 456 7890",
    isActive: true,
    createdAt: now()
  },
  {
    id: "STU2024002",
    email: "amina.bello@school.edu.ng",
    firstName: "Amina",
    lastName: "Bello",
    role: "student",
    phoneNumber: "+234 805 678 9012",
    isActive: true,
    createdAt: now()
  },
  {
    id: "STU2024003",
    email: "tunde.adeyemi@school.edu.ng",
    firstName: "Tunde",
    lastName: "Adeyemi",
    role: "student",
    phoneNumber: "+234 807 890 1234",
    isActive: true,
    createdAt: now()
  },
  
  // TEACHERS
  {
    id: "TEACH001",
    email: "ngozi.okeke@school.edu.ng",
    firstName: "Ngozi",
    lastName: "Okeke",
    role: "teacher",
    phoneNumber: "+234 809 012 3456",
    isActive: true,
    createdAt: now()
  },
  {
    id: "TEACH002",
    email: "ibrahim.musa@school.edu.ng",
    firstName: "Ibrahim",
    lastName: "Musa",
    role: "teacher",
    phoneNumber: "+234 810 234 5678",
    isActive: true,
    createdAt: now()
  },
  {
    id: "TEACH003",
    email: "folake.williams@school.edu.ng",
    firstName: "Folake",
    lastName: "Williams",
    role: "teacher",
    phoneNumber: "+234 812 456 7890",
    isActive: true,
    createdAt: now()
  },
  
  // PARENTS
  {
    id: "PARENT001",
    email: "emeka.okonkwo@email.com",
    firstName: "Emeka",
    lastName: "Okonkwo",
    role: "parent",
    phoneNumber: "+234 813 678 9012",
    isActive: true,
    createdAt: now()
  },
  {
    id: "PARENT002",
    email: "hajiya.bello@email.com",
    firstName: "Hajiya",
    lastName: "Bello",
    role: "parent",
    phoneNumber: "+234 815 890 1234",
    isActive: true,
    createdAt: now()
  },
  {
    id: "PARENT003",
    email: "funke.adeyemi@email.com",
    firstName: "Funke",
    lastName: "Adeyemi",
    role: "parent",
    phoneNumber: "+234 817 012 3456",
    isActive: true,
    createdAt: now()
  },
  
  // ADMINS
  {
    id: "ADMIN001",
    email: "principal@school.edu.ng",
    firstName: "Dr. Adebayo",
    lastName: "Ogunleye",
    role: "admin",
    phoneNumber: "+234 818 234 5678",
    isActive: true,
    createdAt: now()
  },
  {
    id: "ADMIN002",
    email: "bursar@school.edu.ng",
    firstName: "Mrs. Chioma",
    lastName: "Nwankwo",
    role: "admin",
    phoneNumber: "+234 819 456 7890",
    isActive: true,
    createdAt: now()
  },
  {
    id: "ADMIN003",
    email: "vp.academics@school.edu.ng",
    firstName: "Mr. Yusuf",
    lastName: "Abdullahi",
    role: "admin",
    phoneNumber: "+234 820 678 9012",
    isActive: true,
    createdAt: now()
  }
];

const students = [
  {
    id: "STU2024001",
    admissionNumber: "STU2024001",
    firstName: "Chidi",
    lastName: "Okonkwo",
    dateOfBirth: Timestamp.fromDate(new Date(2011, 3, 15)), // April 15, 2011
    gender: "Male",
    bloodGroup: "O+",
    address: "23 Ademola Street, Wuse 2, Abuja",
    email: "chidi.okonkwo@school.edu.ng",
    phoneNumber: "+234 803 456 7890",
    guardianId: "PARENT001",
    classId: "JSS1A",
    userId: "STU2024001",
    enrollmentDate: daysAgo(180),
    isActive: true,
    createdAt: daysAgo(180)
  },
  {
    id: "STU2024002",
    admissionNumber: "STU2024002",
    firstName: "Amina",
    lastName: "Bello",
    dateOfBirth: Timestamp.fromDate(new Date(2011, 7, 22)), // August 22, 2011
    gender: "Female",
    bloodGroup: "A+",
    address: "45 Gimbiya Street, Garki, Abuja",
    email: "amina.bello@school.edu.ng",
    phoneNumber: "+234 805 678 9012",
    guardianId: "PARENT002",
    classId: "JSS1A",
    userId: "STU2024002",
    enrollmentDate: daysAgo(180),
    isActive: true,
    createdAt: daysAgo(180)
  },
  {
    id: "STU2024003",
    admissionNumber: "STU2024003",
    firstName: "Tunde",
    lastName: "Adeyemi",
    dateOfBirth: Timestamp.fromDate(new Date(2011, 1, 10)), // February 10, 2011
    gender: "Male",
    bloodGroup: "B+",
    address: "12 Olusegun Obasanjo Way, Maitama, Abuja",
    email: "tunde.adeyemi@school.edu.ng",
    phoneNumber: "+234 807 890 1234",
    guardianId: "PARENT003",
    classId: "JSS1A",
    userId: "STU2024003",
    enrollmentDate: daysAgo(180),
    isActive: true,
    createdAt: daysAgo(180)
  }
];

const parents = [
  {
    id: "PARENT001",
    firstName: "Emeka",
    lastName: "Okonkwo",
    email: "emeka.okonkwo@email.com",
    phoneNumber: "+234 813 678 9012",
    address: "23 Ademola Street, Wuse 2, Abuja",
    occupation: "Civil Engineer",
    userId: "PARENT001",
    relationship: "Father",
    children: ["STU2024001"],
    isActive: true,
    createdAt: daysAgo(180)
  },
  {
    id: "PARENT002",
    firstName: "Hajiya",
    lastName: "Bello",
    email: "hajiya.bello@email.com",
    phoneNumber: "+234 815 890 1234",
    address: "45 Gimbiya Street, Garki, Abuja",
    occupation: "Businesswoman",
    userId: "PARENT002",
    relationship: "Mother",
    children: ["STU2024002"],
    isActive: true,
    createdAt: daysAgo(180)
  },
  {
    id: "PARENT003",
    firstName: "Funke",
    lastName: "Adeyemi",
    email: "funke.adeyemi@email.com",
    phoneNumber: "+234 817 012 3456",
    address: "12 Olusegun Obasanjo Way, Maitama, Abuja",
    occupation: "Doctor",
    userId: "PARENT003",
    relationship: "Mother",
    children: ["STU2024003"],
    isActive: true,
    createdAt: daysAgo(180)
  }
];

const teachers = [
  {
    id: "TEACH001",
    staffId: "TEACH001",
    firstName: "Ngozi",
    lastName: "Okeke",
    email: "ngozi.okeke@school.edu.ng",
    phoneNumber: "+234 809 012 3456",
    address: "78 Herbert Macaulay Way, Central Area, Abuja",
    dateOfBirth: Timestamp.fromDate(new Date(1985, 5, 10)),
    gender: "Female",
    qualification: "B.Ed Mathematics, M.Sc Applied Mathematics",
    subjects: ["MATH001", "MATH002"],
    classes: ["JSS1A", "JSS2B"],
    employmentDate: Timestamp.fromDate(new Date(2018, 8, 1)),
    userId: "TEACH001",
    isClassTeacher: true,
    classTeacherOf: "JSS1A",
    isActive: true,
    createdAt: daysAgo(200)
  },
  {
    id: "TEACH002",
    staffId: "TEACH002",
    firstName: "Ibrahim",
    lastName: "Musa",
    email: "ibrahim.musa@school.edu.ng",
    phoneNumber: "+234 810 234 5678",
    address: "34 Yakubu Gowon Crescent, Asokoro, Abuja",
    dateOfBirth: Timestamp.fromDate(new Date(1982, 2, 20)),
    gender: "Male",
    qualification: "B.A English, M.Ed Curriculum Studies",
    subjects: ["ENG001", "LIT001"],
    classes: ["JSS1A", "JSS1B"],
    employmentDate: Timestamp.fromDate(new Date(2015, 1, 15)),
    userId: "TEACH002",
    isClassTeacher: false,
    isActive: true,
    createdAt: daysAgo(200)
  },
  {
    id: "TEACH003",
    staffId: "TEACH003",
    firstName: "Folake",
    lastName: "Williams",
    email: "folake.williams@school.edu.ng",
    phoneNumber: "+234 812 456 7890",
    address: "56 Aguiyi Ironsi Street, Maitama, Abuja",
    dateOfBirth: Timestamp.fromDate(new Date(1988, 10, 5)),
    gender: "Female",
    qualification: "B.Sc Computer Science, M.Sc Information Technology",
    subjects: ["CS001", "ICT001"],
    classes: ["JSS1A", "JSS2A"],
    employmentDate: Timestamp.fromDate(new Date(2019, 6, 1)),
    userId: "TEACH003",
    isClassTeacher: false,
    isActive: true,
    createdAt: daysAgo(200)
  }
];

const classes = [
  {
    id: "JSS1A",
    name: "JSS 1A",
    level: "JSS1",
    section: "A",
    classTeacherId: "TEACH001",
    academicYear: "2024/2025",
    capacity: 35,
    currentStudentCount: 3,
    subjects: ["MATH001", "ENG001", "CS001", "PHY001", "CHEM001", "BIO001"],
    isActive: true,
    createdAt: daysAgo(200)
  }
];

const subjects = [
  {
    id: "MATH001",
    name: "Mathematics",
    code: "MATH",
    category: "Core",
    level: "JSS1",
    teacherId: "TEACH001",
    description: "Introduction to Algebra, Geometry and Basic Mathematics",
    isActive: true,
    createdAt: daysAgo(200)
  },
  {
    id: "ENG001",
    name: "English Language",
    code: "ENG",
    category: "Core",
    level: "JSS1",
    teacherId: "TEACH002",
    description: "Grammar, Composition, Comprehension and Literature",
    isActive: true,
    createdAt: daysAgo(200)
  },
  {
    id: "CS001",
    name: "Computer Science",
    code: "CS",
    category: "Elective",
    level: "JSS1",
    teacherId: "TEACH003",
    description: "Introduction to Computing and Programming",
    isActive: true,
    createdAt: daysAgo(200)
  },
  {
    id: "PHY001",
    name: "Basic Science (Physics)",
    code: "PHY",
    category: "Core",
    level: "JSS1",
    teacherId: "TEACH001",
    description: "Introduction to Physical Sciences",
    isActive: true,
    createdAt: daysAgo(200)
  }
];

// Generate attendance for the last 30 school days
const attendanceRecords = [];
const students_ids = ["STU2024001", "STU2024002", "STU2024003"];
const statuses = ["present", "absent", "late"];

for (let day = 30; day >= 1; day--) {
  students_ids.forEach((studentId, index) => {
    // Most days present, occasional absent/late
    let status = "present";
    if (day === 15 && index === 0) status = "late";
    if (day === 10 && index === 1) status = "absent";
    if (day === 5 && index === 2) status = "late";
    
    attendanceRecords.push({
      studentId: studentId,
      classId: "JSS1A",
      date: daysAgo(day),
      status: status,
      term: CURRENT_TERM,
      session: CURRENT_SESSION,
      markedBy: "TEACH001",
      markedAt: daysAgo(day),
      createdAt: daysAgo(day)
    });
  });
}

// Results for First Term
const results = [
  // Chidi's Results (Good student)
  {
    studentId: "STU2024001",
    subjectId: "MATH001",
    subjectName: "Mathematics",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 18,
    ca2: 17,
    exam: 62,
    total: 97,
    grade: "A",
    remark: "Excellent performance",
    teacherId: "TEACH001",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024001",
    subjectId: "ENG001",
    subjectName: "English Language",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 16,
    ca2: 18,
    exam: 58,
    total: 92,
    grade: "A",
    remark: "Very good work",
    teacherId: "TEACH002",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024001",
    subjectId: "CS001",
    subjectName: "Computer Science",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 19,
    ca2: 19,
    exam: 60,
    total: 98,
    grade: "A",
    remark: "Outstanding!",
    teacherId: "TEACH003",
    createdAt: daysAgo(5)
  },
  
  // Amina's Results (Average student)
  {
    studentId: "STU2024002",
    subjectId: "MATH001",
    subjectName: "Mathematics",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 14,
    ca2: 15,
    exam: 48,
    total: 77,
    grade: "B",
    remark: "Good effort",
    teacherId: "TEACH001",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024002",
    subjectId: "ENG001",
    subjectName: "English Language",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 15,
    ca2: 16,
    exam: 52,
    total: 83,
    grade: "B",
    remark: "Keep improving",
    teacherId: "TEACH002",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024002",
    subjectId: "CS001",
    subjectName: "Computer Science",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 13,
    ca2: 14,
    exam: 45,
    total: 72,
    grade: "B",
    remark: "Satisfactory",
    teacherId: "TEACH003",
    createdAt: daysAgo(5)
  },
  
  // Tunde's Results (Struggling student)
  {
    studentId: "STU2024003",
    subjectId: "MATH001",
    subjectName: "Mathematics",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 11,
    ca2: 12,
    exam: 38,
    total: 61,
    grade: "C",
    remark: "Needs more practice",
    teacherId: "TEACH001",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024003",
    subjectId: "ENG001",
    subjectName: "English Language",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 10,
    ca2: 11,
    exam: 35,
    total: 56,
    grade: "C",
    remark: "Requires extra attention",
    teacherId: "TEACH002",
    createdAt: daysAgo(5)
  },
  {
    studentId: "STU2024003",
    subjectId: "CS001",
    subjectName: "Computer Science",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    ca1: 12,
    ca2: 13,
    exam: 42,
    total: 67,
    grade: "C",
    remark: "Fair performance",
    teacherId: "TEACH003",
    createdAt: daysAgo(5)
  }
];

// Merit points
const merits = [
  // Chidi - High achiever
  { studentId: "STU2024001", category: "academic", points: 20, reason: "Excellent performance in Mathematics test", awardedBy: "TEACH001", date: daysAgo(25), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(25) },
  { studentId: "STU2024001", category: "homework", points: 10, reason: "Consistently submits quality homework", awardedBy: "TEACH002", date: daysAgo(20), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(20) },
  { studentId: "STU2024001", category: "leadership", points: 15, reason: "Led class project successfully", awardedBy: "TEACH003", date: daysAgo(15), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(15) },
  { studentId: "STU2024001", category: "participation", points: 10, reason: "Active participation in class discussions", awardedBy: "TEACH001", date: daysAgo(10), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(10) },
  
  // Amina - Good student
  { studentId: "STU2024002", category: "homework", points: 10, reason: "Well done homework assignments", awardedBy: "TEACH001", date: daysAgo(22), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(22) },
  { studentId: "STU2024002", category: "behavior", points: 15, reason: "Excellent classroom behavior", awardedBy: "TEACH002", date: daysAgo(18), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(18) },
  { studentId: "STU2024002", category: "participation", points: 10, reason: "Good class participation", awardedBy: "TEACH003", date: daysAgo(12), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(12) },
  
  // Tunde - Needs improvement (some negative merits)
  { studentId: "STU2024003", category: "homework", points: 5, reason: "Completed homework on time", awardedBy: "TEACH001", date: daysAgo(24), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(24) },
  { studentId: "STU2024003", category: "behavior", points: -10, reason: "Late to class multiple times", awardedBy: "TEACH002", date: daysAgo(16), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(16) },
  { studentId: "STU2024003", category: "homework", points: -5, reason: "Incomplete homework submission", awardedBy: "TEACH001", date: daysAgo(8), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(8) },
  { studentId: "STU2024003", category: "participation", points: 5, reason: "Improved participation", awardedBy: "TEACH003", date: daysAgo(3), term: CURRENT_TERM, session: CURRENT_SESSION, createdAt: daysAgo(3) }
];

// Merit summaries
const meritSummaries = [
  {
    id: "STU2024001_First Term_2024_2025",
    studentId: "STU2024001",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    totalMerits: 55,
    level: "silver",
    rank: 1,
    classRank: 1,
    lastUpdated: daysAgo(3)
  },
  {
    id: "STU2024002_First Term_2024_2025",
    studentId: "STU2024002",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    totalMerits: 35,
    level: "bronze",
    rank: 2,
    classRank: 2,
    lastUpdated: daysAgo(3)
  },
  {
    id: "STU2024003_First Term_2024_2025",
    studentId: "STU2024003",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    totalMerits: 5,
    level: "bronze",
    rank: 3,
    classRank: 3,
    lastUpdated: daysAgo(3)
  }
];

// Fee payments
const feePayments = [
  {
    studentId: "STU2024001",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    amount: 150000,
    paidBy: "PARENT001",
    feeType: "Tuition",
    status: "paid",
    paymentMethod: "Bank Transfer",
    receiptNumber: "RCP/2024/001",
    paymentDate: daysAgo(90),
    createdAt: daysAgo(90)
  },
  {
    studentId: "STU2024002",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    amount: 150000,
    paidBy: "PARENT002",
    feeType: "Tuition",
    status: "paid",
    paymentMethod: "Cash",
    receiptNumber: "RCP/2024/002",
    paymentDate: daysAgo(85),
    createdAt: daysAgo(85)
  },
  {
    studentId: "STU2024003",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    amount: 75000,
    paidBy: "PARENT003",
    feeType: "Tuition",
    status: "partial",
    paymentMethod: "Bank Transfer",
    receiptNumber: "RCP/2024/003",
    paymentDate: daysAgo(80),
    createdAt: daysAgo(80)
  }
];

// Assignments
const assignments = [
  {
    id: "ASSIGN001",
    title: "Algebra Problem Set 1",
    description: "Solve problems 1-20 from Chapter 3",
    subjectId: "MATH001",
    teacherId: "TEACH001",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    dueDate: daysFromNow(7),
    maxScore: 20,
    isActive: true,
    createdAt: daysAgo(3)
  },
  {
    id: "ASSIGN002",
    title: "Essay Writing: My School",
    description: "Write a 300-word essay about your school",
    subjectId: "ENG001",
    teacherId: "TEACH002",
    classId: "JSS1A",
    term: CURRENT_TERM,
    session: CURRENT_SESSION,
    dueDate: daysFromNow(5),
    maxScore: 20,
    isActive: true,
    createdAt: daysAgo(2)
  }
];

// Announcements
const announcements = [
  {
    title: "Mid-Term Break Announcement",
    content: "School will be closed from December 23rd to January 6th for the mid-term break. Classes resume on January 7th, 2025.",
    priority: "high",
    targetAudience: ["student", "parent", "teacher"],
    createdBy: "ADMIN001",
    isActive: true,
    createdAt: daysAgo(10)
  },
  {
    title: "Parent-Teacher Meeting",
    content: "All parents are invited to attend the parent-teacher conference on December 20th at 10:00 AM.",
    priority: "medium",
    targetAudience: ["parent", "teacher"],
    createdBy: "ADMIN001",
    isActive: true,
    createdAt: daysAgo(15)
  },
  {
    title: "Sports Day Coming Up!",
    content: "Annual sports day will be held on January 15th. All students should prepare for various sporting events.",
    priority: "low",
    targetAudience: ["student", "teacher", "parent"],
    createdBy: "ADMIN002",
    isActive: true,
    createdAt: daysAgo(20)
  }
];

// ============================================
// SEEDING FUNCTION
// ============================================

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // Seed Users
    console.log('📝 Seeding Users...');
    for (const user of users) {
      await setDoc(doc(db, 'users', user.id), user);
      console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role})`);
    }
    
    // Seed Students
    console.log('\n👨‍🎓 Seeding Students...');
    for (const student of students) {
      await setDoc(doc(db, 'students', student.id), student);
      console.log(`  ✅ ${student.firstName} ${student.lastName} - ${student.admissionNumber}`);
    }
    
    // Seed Parents
    console.log('\n👨‍👩‍👧 Seeding Parents...');
    for (const parent of parents) {
      await setDoc(doc(db, 'parents', parent.id), parent);
      console.log(`  ✅ ${parent.firstName} ${parent.lastName}`);
    }
    
    // Seed Teachers
    console.log('\n👨‍🏫 Seeding Teachers...');
    for (const teacher of teachers) {
      await setDoc(doc(db, 'teachers', teacher.id), teacher);
      console.log(`  ✅ ${teacher.firstName} ${teacher.lastName} - ${teacher.qualification}`);
    }
    
    // Seed Classes
    console.log('\n🏫 Seeding Classes...');
    for (const classItem of classes) {
      await setDoc(doc(db, 'classes', classItem.id), classItem);
      console.log(`  ✅ ${classItem.name}`);
    }
    
    // Seed Subjects
    console.log('\n📚 Seeding Subjects...');
    for (const subject of subjects) {
      await setDoc(doc(db, 'subjects', subject.id), subject);
      console.log(`  ✅ ${subject.name} (${subject.code})`);
    }
    
    // Seed Attendance
    console.log('\n📅 Seeding Attendance Records...');
    let attendanceCount = 0;
    for (const attendance of attendanceRecords) {
      const docRef = doc(collection(db, 'attendance'));
      await setDoc(docRef, attendance);
      attendanceCount++;
    }
    console.log(`  ✅ Created ${attendanceCount} attendance records`);
    
    // Seed Results
    console.log('\n📊 Seeding Results...');
    for (const result of results) {
      const docRef = doc(collection(db, 'results'));
      await setDoc(docRef, result);
      console.log(`  ✅ ${result.subjectName} - Student ${result.studentId}: ${result.total}/${100} (${result.grade})`);
    }
    
    // Seed Merits
    console.log('\n⭐ Seeding Merit Points...');
    for (const merit of merits) {
      const docRef = doc(collection(db, 'merits'));
      await setDoc(docRef, merit);
      console.log(`  ✅ ${merit.studentId}: ${merit.points > 0 ? '+' : ''}${merit.points} (${merit.category})`);
    }
    
    // Seed Merit Summaries
    console.log('\n🏆 Seeding Merit Summaries...');
    for (const summary of meritSummaries) {
      await setDoc(doc(db, 'studentMeritSummaries', summary.id), summary);
      console.log(`  ✅ ${summary.studentId}: ${summary.totalMerits} merits (${summary.level})`);
    }
    
    // Seed Fee Payments
    console.log('\n💰 Seeding Fee Payments...');
    for (const payment of feePayments) {
      const docRef = doc(collection(db, 'feePayments'));
      await setDoc(docRef, payment);
      console.log(`  ✅ ${payment.studentId}: ₦${payment.amount.toLocaleString()} (${payment.status})`);
    }
    
    // Seed Assignments
    console.log('\n📝 Seeding Assignments...');
    for (const assignment of assignments) {
      await setDoc(doc(db, 'assignments', assignment.id), assignment);
      console.log(`  ✅ ${assignment.title} - ${assignment.subjectId}`);
    }
    
    // Seed Announcements
    console.log('\n📢 Seeding Announcements...');
    for (const announcement of announcements) {
      const docRef = doc(collection(db, 'announcements'));
      await setDoc(docRef, announcement);
      console.log(`  ✅ ${announcement.title}`);
    }
    
    console.log('\n✅ =====================================');
    console.log('✅ DATABASE SEEDING COMPLETED!');
    console.log('✅ =====================================\n');
    
    console.log('📊 Summary:');
    console.log(`  • ${users.length} Users`);
    console.log(`  • ${students.length} Students`);
    console.log(`  • ${parents.length} Parents`);
    console.log(`  • ${teachers.length} Teachers`);
    console.log(`  • ${classes.length} Classes`);
    console.log(`  • ${subjects.length} Subjects`);
    console.log(`  • ${attendanceRecords.length} Attendance Records`);
    console.log(`  • ${results.length} Results`);
    console.log(`  • ${merits.length} Merit Points`);
    console.log(`  • ${meritSummaries.length} Merit Summaries`);
    console.log(`  • ${feePayments.length} Fee Payments`);
    console.log(`  • ${assignments.length} Assignments`);
    console.log(`  • ${announcements.length} Announcements`);
    
    console.log('\n🎯 Test with these Student IDs:');
    console.log('  • STU2024001 - Chidi Okonkwo (Excellent student)');
    console.log('  • STU2024002 - Amina Bello (Good student)');
    console.log('  • STU2024003 - Tunde Adeyemi (Needs improvement)');
    
    console.log('\n🔐 Test User Credentials:');
    console.log('  Students:');
    console.log('    - chidi.okonkwo@school.edu.ng');
    console.log('    - amina.bello@school.edu.ng');
    console.log('    - tunde.adeyemi@school.edu.ng');
    console.log('  Teachers:');
    console.log('    - ngozi.okeke@school.edu.ng (Math Teacher, Class Teacher)');
    console.log('    - ibrahim.musa@school.edu.ng (English Teacher)');
    console.log('    - folake.williams@school.edu.ng (Computer Science)');
    console.log('  Parents:');
    console.log('    - emeka.okonkwo@email.com (Chidi\'s father)');
    console.log('    - hajiya.bello@email.com (Amina\'s mother)');
    console.log('    - funke.adeyemi@email.com (Tunde\'s mother)');
    console.log('  Admins:');
    console.log('    - principal@school.edu.ng (Principal)');
    console.log('    - bursar@school.edu.ng (Bursar)');
    console.log('    - vp.academics@school.edu.ng (VP Academics)\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });