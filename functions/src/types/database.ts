// types/database.ts - Complete School Management Database Types (Enhanced with Subject Selection)

// ============================================
// USER & AUTHENTICATION
// ============================================

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePhoto?: string;
  isActive: boolean;
  isPending: boolean; // For admin approval (teachers)
  createdAt: Date;
  updatedAt: Date;
  
  // Approval tracking
  approvedBy?: string; // Admin user ID who approved
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

// ============================================
// SCHOOL STRUCTURE
// ============================================

export interface School {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  logo?: string;
  motto?: string;
  currentTerm: string;
  currentSession: string;
  createdAt: Date;
}

export interface Class {
  id: string;
  classId: string; // e.g., "grade_1a"
  name: string; // e.g., "Grade 1A"
  className: string; // Same as name
  grade: number; // 1-12
  section: string; // e.g., "A", "B", "C", "D"
  level: 'Primary' | 'Junior Secondary' | 'Senior Secondary';
  
  // Teacher assignments
  classTeacher?: ClassTeacher; // Enhanced structure
  classTeacherId?: string; // Kept for backward compatibility
  subjectTeachers: SubjectTeacherAssignment[];
  
  // Student info
  capacity: number;
  currentStudentCount: number;
  totalStudents: number; // Alias for currentStudentCount
  studentIds: string[];
  
  // Academic info
  currentTerm: string;
  currentSession: string;
  academicYear: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Class Teacher assignment structure
export interface ClassTeacher {
  teacherId: string;
  teacherName: string;
  assignedDate: Date;
}

// Subject teacher assignment in class
export interface SubjectTeacherAssignment {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  assignedDate: Date;
}

export interface Subject {
  id: string;
  subjectId: string; // e.g., "mathematics"
  name: string;
  subjectName: string; // Same as name
  code: string;
  description?: string;
  category: 'Core' | 'Science' | 'Arts' | 'Commercial' | 'Vocational' | 'Religious' | 'Language' | 'Elective';
  isCore: boolean;
  
  // Teacher assignments
  teachers: SubjectTeacher[];
  
  // Applicable levels
  applicableLevels: ('Primary' | 'Junior Secondary' | 'Senior Secondary')[];
  applicableGrades: number[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Subject teacher assignment structure
export interface SubjectTeacher {
  teacherId: string;
  teacherName: string;
  classes: string[]; // Class IDs where this teacher teaches this subject
  assignedDate: Date;
}

// ============================================
// ACADEMIC TRACK TYPE (NEW)
// ============================================

export type AcademicTrack = 'Science' | 'Arts' | 'Commercial' | null;

// ============================================
// STUDENTS (ENHANCED WITH SUBJECT SELECTION)
// ============================================

export interface Student {
  id: string;
  userId: string;
  studentId: string;
  admissionNumber: string;
  
  // Basic Info (THESE ARE USED)
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  age: number;
  
  // Class Info
  classId: string;
  className: string;
  
  // Parent/Guardian
  parentId: string;
  guardianId: string;
  
  // Contact Info
  address: string;
  city: string;
  state: string;
  emergencyContact: string;
  emergencyPhone: string;
  
  // Optional Medical Info
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  
  // Academic Info
  admissionDate: Date;
  previousSchool?: string;
  
  // Subject Selection
  subjects: string[];
  academicTrack?: AcademicTrack;
  tradeSubject?: string;
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TEACHERS (ENHANCED)
// ============================================

export type TeacherType = 'class_teacher' | 'subject_teacher' | 'both';

export interface AssignedClass {
  classId: string;
  className: string;
  assignedDate: Date;
}

export interface TeacherSubject {
  subjectId: string;
  subjectName: string;
  classes: string[]; // Array of class IDs where this subject is taught
}

export interface Teacher {
  id: string;
  teacherId: string; // Same as user ID
  userId: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  qualification: string;
  specialization: string;
  dateOfJoining: Date;
  employmentType: 'full-time' | 'part-time' | 'contract';
  
  // Enhanced teaching roles
  teacherType: TeacherType;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  
  // Class teacher data (if applicable)
  assignedClass?: AssignedClass;
  classTeacherId?: string; // Kept for backward compatibility
  
  // Enhanced subject teaching
  subjects: TeacherSubject[];
  classes: string[]; // Kept for backward compatibility
  
  // Status
  isActive: boolean;
  isPending: boolean; // For admin approval
  
  // Metadata
  yearsOfExperience?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ADMINS
// ============================================

export type AdminDepartment = 'ceo' | 'principal' | 'vice_principal' | 'hod' | 'admin_staff';

export interface Admin {
  id: string;
  adminId: string; // Same as user ID
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  
  // Admin-specific fields
  department: AdminDepartment;
  departmentName: string; // e.g., "Principal", "Vice Principal"
  permissions: AdminPermission[];
  
  // Status
  isActive: boolean;
  isSuperAdmin: boolean; // CEO has super admin powers
  
  // Metadata
  dateOfJoining: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPermission {
  module: 'teachers' | 'students' | 'parents' | 'classes' | 'subjects' | 
          'attendance' | 'grades' | 'fees' | 'reports' | 'settings' | 'all';
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve')[];
}

// Default permissions by department
export const DEFAULT_ADMIN_PERMISSIONS: Record<AdminDepartment, AdminPermission[]> = {
  ceo: [
    { module: 'all', actions: ['view', 'create', 'edit', 'delete', 'approve'] }
  ],
  principal: [
    { module: 'all', actions: ['view', 'create', 'edit', 'delete', 'approve'] }
  ],
  vice_principal: [
    { module: 'teachers', actions: ['view', 'approve'] },
    { module: 'students', actions: ['view', 'edit'] },
    { module: 'attendance', actions: ['view'] },
    { module: 'grades', actions: ['view'] },
    { module: 'reports', actions: ['view', 'create'] }
  ],
  hod: [
    { module: 'teachers', actions: ['view'] },
    { module: 'students', actions: ['view'] },
    { module: 'classes', actions: ['view', 'edit'] },
    { module: 'subjects', actions: ['view', 'edit'] },
    { module: 'grades', actions: ['view'] }
  ],
  admin_staff: [
    { module: 'students', actions: ['view', 'create', 'edit'] },
    { module: 'parents', actions: ['view', 'create', 'edit'] },
    { module: 'fees', actions: ['view', 'create', 'edit'] },
    { module: 'attendance', actions: ['view'] }
  ]
};

export function getDepartmentDisplayName(department: AdminDepartment): string {
  const names: Record<AdminDepartment, string> = {
    ceo: 'Chief Executive Officer (CEO)',
    principal: 'Principal',
    vice_principal: 'Vice Principal',
    hod: 'Head of Department (HOD)',
    admin_staff: 'Admin Staff'
  };
  return names[department];
}

// ============================================
// PARENTS/GUARDIANS
// ============================================

export interface Parent {
  id: string;
  userId: string;
  
  // Basic Info (THESE ARE USED)
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  
  // Parent Details
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  occupation?: string;
  workplace?: string;
  address?: string;
  
  // Children
  children: string[];
  
  // Status
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ATTENDANCE
// ============================================

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  className?: string;  // Used in parent access
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  markedAt: Date;
  reason?: string;
  remarks?: string;  // Used in parent access
  term: string;
  session: string;
  notes?: string;
}

export interface AttendanceSummary {
  studentId: string;
  term: string;
  session: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: number;
  lastUpdated: Date;
}

// ============================================
// MERIT SYSTEM
// ============================================

export type MeritCategory = 
  | 'academic_excellence'
  | 'homework'
  | 'punctuality'
  | 'helpfulness'
  | 'participation'
  | 'leadership'
  | 'responsibility'
  | 'noise_making'
  | 'late_to_class'
  | 'missing_homework'
  | 'disrespect'
  | 'phone_in_class'
  | 'distraction'
  | 'other';

export type MeritLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Merit {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName: string;  // Used in parent access
  className?: string;   // Used in parent access
  points: number;
  category: MeritCategory;
  reason: string;
  date: Date;
  term: string;
  session: string;
  classId: string;
}

export interface StudentMeritSummary {
  studentId: string;
  term: string;
  session: string;
  totalMerits: number;
  level: MeritLevel;
  rank: number;
  classRank: number;
  lastUpdated: Date;
}

export interface MeritLevelDefinition {
  name: MeritLevel;
  minPoints: number;
  maxPoints: number;
  badge: string;
  color: string;
}

// ============================================
// ACADEMIC RESULTS
// ============================================

export interface Result {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  term: string;
  session: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam' | 'project' | 'assignment';
  score: number;
  maxScore: number;
  grade?: string;
  remark?: string;
  teacherId: string;
  teacherName?: string;  // ✅ This should exist (optional field)
  dateRecorded: Date;
  locked?: boolean;
  lockedAt?: Date;
}

export interface TermResult {
  id: string;
  studentId: string;
  term: string;
  session: string;
  classId: string;
  subjects: SubjectResult[];
  totalScore: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  attendancePercentage: number;
  merits: number;
  teacherComment?: string;
  principalComment?: string;
  nextTermBegins?: Date;
  generatedAt: Date;
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  classwork: number;  // Added
  homework: number;   // NEW - Add this line
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  teacherId: string;
}

// ============================================
// FEE MANAGEMENT (ENHANCED FOR MANUAL ENTRY)
// ============================================

export type FeeCategory = 
  | 'tuition'
  | 'development'
  | 'sports'
  | 'library'
  | 'exam'
  | 'transport'
  | 'uniform'
  | 'books'
  | 'pta'
  | 'excursion'
  | 'other';

export interface FeeItem {
  category: FeeCategory;
  description: string;
  amount: number;
  isMandatory: boolean;
}

// Fee Structure - What each class should pay per term
export interface FeeStructure {
  id: string;
  classId: string;
  className: string;
  term: string;
  session: string;
  academicYear: string; // e.g., "2025/2026"
  
  // Fee breakdown
  items: FeeItem[];
  totalAmount: number;
  
  // Dates
  dueDate: Date;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  isActive: boolean;
}

// Fee Payment - Individual payment record (ENHANCED)
export interface FeePayment {
  id: string;
  
  // Student & Parent Info
  studentId: string;
  studentName: string;
  studentClass: string;
  studentAdmissionNumber?: string;
  parentId: string;
  parentName: string;
  parentPhone?: string;
  
  // Payment Period
  term: string;
  session: string;
  academicYear: string;
  
  // Payment Details
  amountPaid: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'card' | 'paystack' | 'other';
  paymentDate: Date;
  
  // For bank transfers/cheques/POS
  paymentReference: string; // Receipt/transaction reference
  bankName?: string;
  accountName?: string; // Who made the payment
  chequeNumber?: string;
  
  // Receipt
  receiptNumber: string; // Auto-generated: e.g., "RCP/2026/00001"
  
  // Fee Allocation (optional - which specific fees paid)
  items?: FeeItem[]; // Which fees this payment covers
  
  // Recording & Verification
  receivedBy: string; // Admin user ID who recorded payment
  receivedByName: string;
  recordedAt: Date;
  
  verifiedBy?: string; // Another admin who verified
  verifiedByName?: string;
  verifiedAt?: Date;
  
  // Status
  status: 'pending' | 'verified' | 'cancelled';
  
  // Notes
  notes?: string;
  cancellationReason?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

// Student Fee Status - Current balance per student (SIMPLIFIED)
export interface StudentFeeStatus {
  id: string; // studentId-term-session
  
  // Student Info
  studentId: string;
  studentName: string;
  studentClass: string;
  classId: string;
  
  // Parent Info
  parentId: string;
  parentName?: string;
  parentPhone?: string;
  
  // Fee Period
  term: string;
  session: string;
  academicYear: string;
  
  // Amounts
  totalFees: number; // Total expected from fee structure
  amountPaid: number; // Sum of verified payments
  balance: number; // totalFees - amountPaid
  
  // Payment Status
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  
  // Payment History
  payments: string[]; // Array of FeePayment IDs
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  
  // Due date
  dueDate: Date;
  isOverdue: boolean;
  daysOverdue?: number;
  
  // Metadata
  lastUpdated: Date;
  updatedBy?: string;
  createdAt: Date;
}

// Fee Payment Summary - For reports
export interface FeePaymentSummary {
  term: string;
  session: string;
  classId?: string;
  className?: string;
  
  // Totals
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  totalBalance: number;
  
  // Breakdown
  paidInFull: number; // Number of students
  partialPayment: number;
  notPaid: number;
  overdue: number;
  
  // Collection rate
  collectionRate: number; // Percentage
  
  // By payment method
  paymentMethodBreakdown: {
    cash: number;
    bankTransfer: number;
    pos: number;
    cheque: number;
    card: number;
    paystack: number;
    other: number;
  };
  
  generatedAt: Date;
  generatedBy: string;
}

// Fee Defaulters Report
export interface FeeDefaulter {
  studentId: string;
  studentName: string;
  studentClass: string;
  admissionNumber: string;
  parentName: string;
  parentPhone: string;
  
  totalExpected: number;
  amountPaid: number;
  balance: number;
  
  dueDate: Date;
  daysOverdue: number;
  
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  
  term: string;
  session: string;
}

// Receipt Number Generator Config
export interface ReceiptNumberConfig {
  prefix: string; // e.g., "RCP"
  year: string; // e.g., "2026"
  lastNumber: number; // Last used number
  format: string; // e.g., "RCP/2026/00001"
}

// ============================================
// TIMETABLE
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface TimetableEntry {
  id: string;
  classId: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  room?: string;
  term: string;
  session: string;
}

export interface Timetable {
  id: string;
  classId: string;
  term: string;
  session: string;
  entries: TimetableEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ASSIGNMENTS/HOMEWORK
// ============================================

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  dueDate: Date;
  maxScore: number;
  attachments?: string[];
  instructions?: string;
  term: string;
  session: string;
  createdAt: Date;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  files?: string[];
  content?: string;
  status: 'submitted' | 'late' | 'graded' | 'returned';
  score?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

// ============================================
// ANNOUNCEMENTS & NOTIFICATIONS
// ============================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: UserRole[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  attachments?: string[];
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'merit' | 'attendance' | 'fee' | 'result' | 'assignment' | 'announcement' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedId?: string;
  actionUrl?: string;
}

// ============================================
// ANALYTICS & REPORTS
// ============================================

export interface ClassAnalytics {
  classId: string;
  term: string;
  session: string;
  totalStudents: number;
  averageAttendance: number;
  averageScore: number;
  totalMerits: number;
  topPerformers: string[];
  needsAttention: string[];
  subjectPerformance: {
    subjectId: string;
    averageScore: number;
    passRate: number;
  }[];
}

export interface SchoolAnalytics {
  session: string;
  term: string;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  overallAttendance: number;
  feeCollectionRate: number;
  totalMeritsAwarded: number;
  topPerformingClasses: string[];
  generatedAt: Date;
}

// ============================================
// WEEKLY HISTORY REPORTS (NEW)
// ============================================

export interface WeeklyHistoryReport {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  weekStart: Date;
  weekEnd: Date;
  term: string;
  session: string;
  
  // Summary statistics
  summary: WeeklyHistorySummary;
  
  // Detailed records
  attendance: WeeklyAttendanceRecord[];
  merits: WeeklyMeritRecord[];
  grades: WeeklyGradeRecord[];
  
  // Metadata
  generatedAt: Date;
  generatedBy: string;
  requestedBy?: string;
}

export interface WeeklyHistorySummary {
  attendancePercentage: number;
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  
  totalMerits: number;
  totalMeritRecords: number;
  positivePoints: number;
  negativePoints: number;
  
  totalGradeRecords: number;
  gradesByType: {
    classwork: number;
    homework: number;
    ca1: number;
    ca2: number;
    exam: number;
  };
  averageScore?: number;
}

export interface WeeklyAttendanceRecord {
  id: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  subjectId?: string;
  subjectName?: string;
  teacherId: string;
  teacherName: string;
  remarks?: string;
}

export interface WeeklyMeritRecord {
  id: string;
  date: Date;
  points: number;
  category: MeritCategory;
  reason: string;
  subjectId?: string;
  subjectName?: string;
  teacherId: string;
  teacherName: string;
}

export interface WeeklyGradeRecord {
  id: string;
  date: Date;
  subjectId: string;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  score: number;
  maxScore: number;
  percentage: number;
  teacherId: string;
  teacherName: string;
  remarks?: string;
}

// ============================================
// PENDING APPROVALS
// ============================================

export interface PendingTeacherApproval {
  id?: string;
  userId: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  
  // Teaching role request
  teacherType: TeacherType;
  requestedClass?: {
    classId: string;
    className: string;
  };
  requestedSubjects?: {
    subjectId: string;
    subjectName: string;
    classes: string[];
  }[];
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// ADD THIS INTERFACE TO types/database.ts after PendingTeacherApproval

// ============================================
// PENDING PARENT APPROVALS (NEW)
// ============================================

export interface PendingParentApproval {
  id?: string;
  userId: string;
  parentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  
  // Parent-specific details
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  occupation?: string;
  workplace?: string;
  address?: string;
  
  // Children data
  children: {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    dateOfBirth: Date;
    age: number;
    classId: string;
    className: string;
    grade: number;
    subjects: string[];
    academicTrack?: AcademicTrack;
    tradeSubject?: string;
  }[];
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// ============================================
// AUDIT LOGS & SECURITY
// ============================================

export type AuditAction = 
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'TEACHER_APPROVED'
  | 'TEACHER_REJECTED'
  | 'ATTENDANCE_RECORDED'
  | 'GRADE_ENTERED'
  | 'GRADE_MODIFIED'
  | 'MERIT_AWARDED'
  | 'DEMERIT_GIVEN'
  | 'REPORT_GENERATED'
  | 'REPORT_SENT'
  | 'DATA_DELETED'
  | 'BULK_OPERATION'
  | 'CLASS_TEACHER_ASSIGNED'
  | 'SUBJECT_TEACHER_ASSIGNED'
  | 'CLASS_TEACHER_REMOVED'      // ✅ ADD THIS LINE
  | 'SUBJECT_TEACHER_REMOVED'    // ✅ ADD THIS LINE
  | 'DATA_LOCKED'
  | 'DATA_UNLOCKED';

  
export interface DetailedAuditLog {
  id: string;
  userId: string;
  userRole: 'student' | 'teacher' | 'parent' | 'admin';
  userName: string;
  action: AuditAction;
  details: string;
  affectedEntity?: string;
  affectedEntityType?: 'user' | 'student' | 'class' | 'subject' | 'teacher' | 'result' | 'attendance';
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  deviceInfo?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// ============================================
// DATA LOCKING & EDIT WINDOWS
// ============================================

export interface DataLock {
  id: string;
  entityType: 'attendance' | 'result' | 'merit' | 'fee' | 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  entityId: string;
  classId?: string;
  term: string;
  session: string;
  isLocked: boolean;
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: Date;
  editDeadline?: Date;
  canBeUnlockedBy?: string[];
}

export interface EditWindow {
  id: string;
  term: string;
  session: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam' | 'attendance' | 'merit';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  affectedClasses?: string[];
  affectedSubjects?: string[];
  createdBy: string;
}

// ============================================
// REPORT CARD GENERATION
// ============================================

export interface ReportCardTemplate {
  id: string;
  name: string;
  term: string;
  session: string;
  schoolName: string;
  schoolLogo?: string;
  schoolAddress?: string;
  includeAttendance: boolean;
  includeMerits: boolean;
  includeTeacherComment: boolean;
  includePrincipalComment: boolean;
  gradeScale: GradeScale[];
  remarkScale: RemarkScale[];
  createdBy: string;
  createdAt: Date;
}

export interface GradeScale {
  minScore: number;
  maxScore: number;
  grade: string;
  description: string;
}

export interface RemarkScale {
  minAverage: number;
  maxAverage: number;
  remark: string;
}

export interface GeneratedReportCard {
  id: string;
  studentId: string;
  term: string;
  session: string;
  classId: string;
  subjects: SubjectResult[];
  totalScore: number;
  averageScore: number;
  position: number;
  totalStudents: number;
  grade: string;
  attendancePercentage: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalSchoolDays: number;
  totalMerits: number;
  meritLevel: string;
  meritRank?: number;
  teacherComment?: string;
  principalComment?: string;
  nextTermBegins?: Date;
  generatedBy: string;
  generatedAt: Date;
  sentToParent: boolean;
  sentAt?: Date;
  parentViewedAt?: Date;
  pdfUrl?: string;
}

export interface BulkReportGeneration {
  id: string;
  term: string;
  session: string;
  classIds: string[];
  totalStudents: number;
  generatedCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  initiatedBy: string;
  errors?: string[];
}

// ============================================
// CONVERSATION HISTORY (Voice/Chat)
// ============================================

export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  userRole: 'student' | 'teacher' | 'parent' | 'admin';
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoiceInput?: boolean;
  voiceTranscription?: string;
  isVoiceOutput?: boolean;
  toolCalls?: {
    toolName: string;
    arguments: any;
    result: any;
  }[];
  context?: {
    term: string;
    session: string;
    classId?: string;
    studentId?: string;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  userRole: 'student' | 'teacher' | 'parent' | 'admin';
  title?: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  isPinned?: boolean;
}

// ============================================
// BACKUP & RECOVERY
// ============================================

export interface BackupRecord {
  id: string;
  backupType: 'daily' | 'weekly' | 'term-end' | 'manual';
  term?: string;
  session?: string;
  collections: string[];
  totalRecords: number;
  storageLocation: 'cloud' | 'local';
  cloudUrl?: string;
  localPath?: string;
  fileSize: number;
  isVerified: boolean;
  verificationDate?: Date;
  checksum?: string;
  initiatedBy: string;
  createdAt: Date;
  canBeRestored: boolean;
}

export interface DataRestoreLog {
  id: string;
  backupId: string;
  restoredBy: string;
  restoredAt: Date;
  collectionsRestored: string[];
  recordsRestored: number;
  success: boolean;
  errors?: string[];
}

// ============================================
// SYSTEM SETTINGS
// ============================================

export interface SystemSettings {
  id: string;
  schoolId: string;
  currentTerm: string;
  currentSession: string;
  termStartDate: Date;
  termEndDate: Date;
  nextTermBegins: Date;
  ca1Deadline?: Date;
  ca2Deadline?: Date;
  examDeadline?: Date;
  reportCardGenerationDeadline?: Date;
  autoBackupEnabled: boolean;
  autoBackupFrequency: 'daily' | 'weekly';
  backupRetentionDays: number;
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  aiAssistantEnabled: boolean;
  notifyParentsOnReportCard: boolean;
  notifyParentsOnMerit: boolean;
  notifyParentsOnAttendance: boolean;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================
// GRADE SUBMISSION STATUS
// ============================================

export interface GradeSubmissionStatus {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  term: string;
  session: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  totalStudents: number;
  submittedCount: number;
  pendingCount: number;
  isComplete: boolean;
  submittedAt?: Date;
  deadline: Date;
  isLocked: boolean;
  lastUpdated: Date;
}

// ============================================
// READ-BACK VERIFICATION
// ============================================

export interface ReadBackSession {
  id: string;
  teacherId: string;
  sessionType: 'attendance' | 'grades' | 'merits';
  classId?: string;
  subjectId?: string;
  date: Date;
  term: string;
  session: string;
  pendingData: any[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'modified';
  readBackCompleted: boolean;
  confirmedAt?: Date;
  modifications?: {
    original: any;
    modified: any;
    modifiedAt: Date;
  }[];
  createdAt: Date;
}