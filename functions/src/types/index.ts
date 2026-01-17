// User Roles
export type UserRole = 'parent' | 'student' | 'teacher' | 'admin';

// User Type
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  schoolId: string;
  fingerprintId?: string;
  createdAt: Date;
}

// Student Type
export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  class: string;
  parentIds: string[];
  dateOfBirth: Date;
  fingerprintId?: string;
  schoolId: string;
}

// Attendance Type
export interface Attendance {
  id: string;
  studentId: string;
  date: Date;
  status: 'present' | 'absent' | 'late';
  timestamp: Date;
  method: 'fingerprint' | 'manual';
  markedBy: string;
}

// Class Type
export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  subjects: string[];
  schoolId: string;
}

// Subject Type
export interface Subject {
  id: string;
  name: string;
  classId: string;
  teacherId: string;
  topics: string[];
}

// Result Type
export interface Result {
  id: string;
  studentId: string;
  subjectId: string;
  term: string;
  session: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remarks?: string;
}

// Fee Type
export interface Fee {
  id: string;
  studentId: string;
  term: string;
  session: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  dueDate: Date;
}

// Message Type
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Conversation Type
export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  lastMessage: string;
  timestamp: Date;
}