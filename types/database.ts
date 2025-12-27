// types/database.ts - Complete School Management Database Types (Phase A Update)

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
  isPending: boolean; // NEW: For admin approval (teachers)
  createdAt: Date;
  updatedAt: Date;
  
  // NEW: Approval tracking
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
  classId: string; // NEW: e.g., "grade_1a"
  name: string; // e.g., "Grade 1A"
  className: string; // NEW: Same as name
  grade: number; // NEW: 1-12
  section: string; // e.g., "A", "B", "C", "D"
  level: 'Primary' | 'Junior Secondary' | 'Senior Secondary'; // NEW
  
  // Teacher assignments
  classTeacher?: ClassTeacher; // NEW: Enhanced structure
  classTeacherId?: string; // Kept for backward compatibility
  subjectTeachers: SubjectTeacherAssignment[]; // NEW
  
  // Student info
  capacity: number;
  currentStudentCount: number;
  totalStudents: number; // NEW: Alias for currentStudentCount
  studentIds: string[]; // NEW
  
  // Academic info
  currentTerm: string;
  currentSession: string;
  academicYear: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// NEW: Class Teacher assignment structure
export interface ClassTeacher {
  teacherId: string;
  teacherName: string;
  assignedDate: Date;
}

// NEW: Subject teacher assignment in class
export interface SubjectTeacherAssignment {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  assignedDate: Date;
}

export interface Subject {
  id: string;
  subjectId: string; // NEW: e.g., "mathematics"
  name: string;
  subjectName: string; // NEW: Same as name
  code: string;
  description?: string;
  category: 'Core' | 'Science' | 'Arts' | 'Commercial' | 'Vocational' | 'Religious'; // UPDATED
  isCore: boolean; // NEW
  
  // NEW: Teacher assignments
  teachers: SubjectTeacher[];
  
  // NEW: Applicable levels
  applicableLevels: ('Primary' | 'Junior Secondary' | 'Senior Secondary')[];
  applicableGrades: number[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// NEW: Subject teacher assignment structure
export interface SubjectTeacher {
  teacherId: string;
  teacherName: string;
  classes: string[]; // Class IDs where this teacher teaches this subject
  assignedDate: Date;
}

// ============================================
// STUDENTS
// ============================================

export interface Student {
  id: string;
  userId: string;
  studentId: string; // NEW: Unique student identifier
  admissionNumber: string;
  classId: string;
  className: string; // NEW
  dateOfBirth: Date;
  gender: 'male' | 'female';
  bloodGroup?: string;
  address: string;
  city: string;
  state: string;
  admissionDate: Date;
  guardianId: string;
  parentId?: string; // NEW: Alias for guardianId
  emergencyContact: string;
  emergencyPhone: string;
  medicalConditions?: string;
  allergies?: string;
  previousSchool?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// TEACHERS (ENHANCED)
// ============================================

export type TeacherType = 'class_teacher' | 'subject_teacher' | 'both'; // NEW

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
  teacherId: string; // NEW: Same as user ID
  userId: string;
  staffId: string;
  firstName: string; // NEW
  lastName: string; // NEW
  email: string; // NEW
  phoneNumber?: string; // NEW
  qualification: string;
  specialization: string;
  dateOfJoining: Date;
  employmentType: 'full-time' | 'part-time' | 'contract';
  
  // NEW: Enhanced teaching roles
  teacherType: TeacherType;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  
  // NEW: Class teacher data (if applicable)
  assignedClass?: AssignedClass;
  classTeacherId?: string; // Kept for backward compatibility
  
  // Enhanced subject teaching
  subjects: TeacherSubject[]; // NEW: Enhanced structure
  classes: string[]; // Kept for backward compatibility
  
  // Status
  isActive: boolean;
  isPending: boolean; // NEW: For admin approval
  
  // Metadata
  yearsOfExperience?: number; // NEW
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ADD THIS ADMIN INTERFACE TO YOUR types/database.ts FILE
// Place it after the Teacher interface (around line 200)

// ============================================
// ADMINS (NEW)
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
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  occupation?: string;
  workplace?: string;
  children: string[];
}

// ============================================
// ATTENDANCE
// ============================================

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  markedAt: Date;
  reason?: string;
  term: string;
  session: string;
  notes?: string; // NEW
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
  assessmentType: 'ca1' | 'ca2' | 'exam' | 'project' | 'assignment';
  score: number;
  maxScore: number;
  grade?: string;
  remark?: string;
  teacherId: string;
  dateRecorded: Date;
  locked?: boolean; // NEW
  lockedAt?: Date; // NEW
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
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
  teacherId: string;
}

// ============================================
// FEE MANAGEMENT
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
  | 'excursion'
  | 'other';

export interface FeeStructure {
  id: string;
  classId: string;
  term: string;
  session: string;
  items: FeeItem[];
  totalAmount: number;
  dueDate: Date;
}

export interface FeeItem {
  category: FeeCategory;
  description: string;
  amount: number;
  isMandatory: boolean;
}

export interface FeePayment {
  id: string;
  studentId: string;
  term: string;
  session: string;
  amountPaid: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'paystack' | 'other';
  paymentReference: string;
  paymentDate: Date;
  receivedBy: string;
  receiptNumber: string;
  items: FeeItem[];
}

export interface StudentFeeStatus {
  studentId: string;
  term: string;
  session: string;
  totalFees: number;
  amountPaid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  lastPaymentDate?: Date;
  dueDate: Date;
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
// PENDING APPROVALS (NEW FOR PHASE A)
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

// ============================================
// AUDIT LOGS & SECURITY
// ============================================

export type AuditAction = 
  | 'USER_REGISTERED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'TEACHER_APPROVED' // NEW
  | 'TEACHER_REJECTED' // NEW
  | 'ATTENDANCE_RECORDED'
  | 'GRADE_ENTERED'
  | 'GRADE_MODIFIED'
  | 'MERIT_AWARDED'
  | 'DEMERIT_GIVEN'
  | 'REPORT_GENERATED'
  | 'REPORT_SENT'
  | 'DATA_DELETED'
  | 'BULK_OPERATION'
  | 'CLASS_TEACHER_ASSIGNED' // NEW
  | 'SUBJECT_TEACHER_ASSIGNED' // NEW
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
  userAgent?: string; // NEW
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

// ============================================
// DATA LOCKING & EDIT WINDOWS
// ============================================

export interface DataLock {
  id: string;
  entityType: 'attendance' | 'result' | 'merit' | 'fee' | 'ca1' | 'ca2' | 'exam'; // UPDATED
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
  assessmentType: 'ca1' | 'ca2' | 'exam' | 'attendance' | 'merit';
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
  assessmentType: 'ca1' | 'ca2' | 'exam';
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