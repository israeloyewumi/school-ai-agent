// lib/firebase/feeManagement.ts - Fee Management Functions (CLIENT SDK - COMPLETE)
// ✅ FIXED: Academic year slash issue in document IDs

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { 
  FeeStructure, 
  FeePayment, 
  StudentFeeStatus, 
  FeeItem,
  ReceiptNumberConfig 
} from '@/types/database';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize academic year string for use in document IDs
 * Converts "2025/2026" to "2025-2026" to avoid Firestore path issues
 */
function sanitizeAcademicYear(academicYear: string): string {
  return academicYear.replace(/\//g, '-');
}

// ============================================
// FEE STRUCTURE MANAGEMENT
// ============================================

/**
 * Create or update fee structure for a class
 */
export async function setFeeStructure(data: {
  classId: string;
  className: string;
  term: string;
  session: string;
  academicYear: string;
  items: FeeItem[];
  dueDate: Date;
  createdBy: string;
}): Promise<{ success: boolean; feeStructureId?: string; error?: string }> {
  try {
    // Calculate total
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

    // ✅ FIX: Sanitize session for document ID
    const feeStructureId = `${data.classId}-${data.term}-${sanitizeAcademicYear(data.session)}`;
    
    const feeStructure: FeeStructure = {
      id: feeStructureId,
      classId: data.classId,
      className: data.className,
      term: data.term,
      session: data.session, // Keep original for display
      academicYear: data.academicYear,
      items: data.items,
      totalAmount,
      dueDate: data.dueDate,
      createdAt: new Date(),
      createdBy: data.createdBy,
      isActive: true,
    };

    await setDoc(doc(db, 'fee_structures', feeStructureId), {
      ...feeStructure,
      dueDate: Timestamp.fromDate(data.dueDate),
      createdAt: Timestamp.now(),
    });

    // Update all students in this class with fee status
    await initializeStudentFeeStatuses(data.classId, data.term, data.session, data.academicYear, totalAmount, data.dueDate);

    return { success: true, feeStructureId };
  } catch (error: any) {
    console.error('Error setting fee structure:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get fee structure for a class and term
 */
export async function getFeeStructure(
  classId: string, 
  term: string, 
  session: string
): Promise<FeeStructure | null> {
  try {
    // ✅ FIX: Sanitize session for document ID
    const feeStructureId = `${classId}-${term}-${sanitizeAcademicYear(session)}`;
    const docRef = doc(db, 'fee_structures', feeStructureId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        dueDate: data.dueDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as FeeStructure;
    }

    return null;
  } catch (error) {
    console.error('Error getting fee structure:', error);
    return null;
  }
}

/**
 * Initialize fee status for all students in a class
 */
async function initializeStudentFeeStatuses(
  classId: string,
  term: string,
  session: string,
  academicYear: string,
  totalFees: number,
  dueDate: Date
) {
  try {
    // ✅ FIX: Sanitize session for document IDs
    const sanitizedSession = sanitizeAcademicYear(session);
    
    // Get all students in the class
    const studentsQuery = query(
      collection(db, 'students'),
      where('classId', '==', classId),
      where('isActive', '==', true)
    );
    const studentsSnapshot = await getDocs(studentsQuery);

    const batch = writeBatch(db);

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      // ✅ FIX: Use sanitized session in document ID
      const statusId = `${student.id}-${term}-${sanitizedSession}`;

      // Get parent info
      let parentName = '';
      let parentPhone = '';
      if (student.parentId) {
        const parentDocRef = doc(db, 'parents', student.parentId);
        const parentDocSnap = await getDoc(parentDocRef);
        if (parentDocSnap.exists()) {
          const parentData = parentDocSnap.data();
          const userDocRef = doc(db, 'users', parentData.userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            parentName = `${userData.firstName} ${userData.lastName}`;
            parentPhone = userData.phoneNumber || '';
          }
        }
      }

      const feeStatus: StudentFeeStatus = {
        id: statusId,
        studentId: student.id,
        studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        studentClass: student.className,
        classId: student.classId,
        parentId: student.parentId || '',
        parentName,
        parentPhone,
        term,
        session, // Keep original for display
        academicYear,
        totalFees,
        amountPaid: 0,
        balance: totalFees,
        status: 'unpaid',
        payments: [],
        dueDate,
        isOverdue: false,
        lastUpdated: new Date(),
        createdAt: new Date(),
      };

      const statusRef = doc(db, 'student_fee_status', statusId);
      batch.set(statusRef, {
        ...feeStatus,
        dueDate: Timestamp.fromDate(dueDate),
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now(),
      }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Initialized fee status for ${studentsSnapshot.size} students`);
  } catch (error) {
    console.error('❌ Error initializing student fee statuses:', error);
    throw error;
  }
}

// ============================================
// RECEIPT NUMBER GENERATION
// ============================================

/**
 * Generate next receipt number
 */
export async function generateReceiptNumber(): Promise<string> {
  try {
    const configRef = doc(db, 'system_config', 'receipt_number');
    const configSnap = await getDoc(configRef);

    const currentYear = new Date().getFullYear().toString();
    let lastNumber = 0;

    if (configSnap.exists()) {
      const config = configSnap.data() as ReceiptNumberConfig;
      
      // Check if year changed
      if (config.year === currentYear) {
        lastNumber = config.lastNumber;
      }
    }

    const nextNumber = lastNumber + 1;
    const receiptNumber = `RCP/${currentYear}/${nextNumber.toString().padStart(5, '0')}`;

    // Update config
    await setDoc(configRef, {
      prefix: 'RCP',
      year: currentYear,
      lastNumber: nextNumber,
      format: `RCP/${currentYear}/00000`,
    });

    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Fallback
    return `RCP/${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`;
  }
}

// ============================================
// PAYMENT RECORDING
// ============================================

/**
 * Record a fee payment
 */
export async function recordFeePayment(data: {
  studentId: string;
  term: string;
  session: string;
  academicYear: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'card' | 'paystack' | 'other';
  paymentDate: Date;
  paymentReference?: string;
  bankName?: string;
  accountName?: string;
  chequeNumber?: string;
  items?: FeeItem[];
  notes?: string;
  receivedBy: string;
  receivedByName: string;
}): Promise<{ success: boolean; paymentId?: string; receiptNumber?: string; error?: string }> {
  try {
    console.log('📄 Recording payment for student:', data.studentId);

    // Get student info
    const studentDocRef = doc(db, 'students', data.studentId);
    const studentDoc = await getDoc(studentDocRef);
    if (!studentDoc.exists()) {
      return { success: false, error: 'Student not found' };
    }
    const student = studentDoc.data();

    // Get parent info
    let parentName = '';
    let parentPhone = '';
    let parentId = student.parentId || student.guardianId || '';
    
    if (parentId) {
      const parentDocRef = doc(db, 'parents', parentId);
      const parentDoc = await getDoc(parentDocRef);
      if (parentDoc.exists()) {
        const parentData = parentDoc.data();
        const userDocRef = doc(db, 'users', parentData.userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          parentName = `${userData.firstName} ${userData.lastName}`;
          parentPhone = userData.phoneNumber || '';
        }
      }
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();

    // Create payment record
    const paymentId = doc(collection(db, 'fee_payments')).id;
    
    const payment: FeePayment = {
      id: paymentId,
      studentId: data.studentId,
      studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentClass: student.className,
      studentAdmissionNumber: student.admissionNumber,
      parentId,
      parentName,
      parentPhone,
      term: data.term,
      session: data.session, // Keep original
      academicYear: data.academicYear,
      amountPaid: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate,
      paymentReference: data.paymentReference || receiptNumber,
      bankName: data.bankName || null,
      accountName: data.accountName || null,
      chequeNumber: data.chequeNumber || null,
      receiptNumber,
      items: data.items || [],
      receivedBy: data.receivedBy,
      receivedByName: data.receivedByName,
      recordedAt: new Date(),
      status: 'verified',
      verifiedBy: data.receivedBy,
      verifiedByName: data.receivedByName,
      verifiedAt: new Date(),
      notes: data.notes || '',
      createdAt: new Date(),
    };

    // Save payment
    await setDoc(doc(db, 'fee_payments', paymentId), {
      ...payment,
      paymentDate: Timestamp.fromDate(data.paymentDate),
      recordedAt: Timestamp.now(),
      verifiedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });

    // Update student fee status
    await updateStudentFeeStatus(data.studentId, data.term, data.session, paymentId, data.amount);

    console.log('✅ Payment recorded:', receiptNumber);
    return { success: true, paymentId, receiptNumber };
  } catch (error: any) {
    console.error('❌ Error recording payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update student fee status after payment
 */
async function updateStudentFeeStatus(
  studentId: string,
  term: string,
  session: string,
  paymentId: string,
  amount: number
) {
  try {
    // ✅ FIX: Sanitize session for document ID
    const statusId = `${studentId}-${term}-${sanitizeAcademicYear(session)}`;
    const statusRef = doc(db, 'student_fee_status', statusId);
    const statusSnap = await getDoc(statusRef);

    if (!statusSnap.exists()) {
      throw new Error('Student fee status not found. Please set up fee structure first.');
    }

    const currentStatus = statusSnap.data() as StudentFeeStatus;
    const newAmountPaid = currentStatus.amountPaid + amount;
    const newBalance = currentStatus.totalFees - newAmountPaid;

    // Determine new status
    let newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid';
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    // Check if overdue - Convert Timestamp to Date
    const dueDate = currentStatus.dueDate instanceof Date 
      ? currentStatus.dueDate 
      : (currentStatus.dueDate as any).toDate();
    const isOverdue = new Date() > dueDate && newBalance > 0;
    if (isOverdue) {
      newStatus = 'overdue';
    }

    const daysOverdue = isOverdue 
      ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    await updateDoc(statusRef, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      payments: [...currentStatus.payments, paymentId],
      lastPaymentDate: Timestamp.now(),
      lastPaymentAmount: amount,
      isOverdue,
      daysOverdue,
      lastUpdated: Timestamp.now(),
    });
  } catch (error) {
    console.error('❌ Error updating student fee status:', error);
    throw error;
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get student fee status
 */
export async function getStudentFeeStatus(
  studentId: string,
  term: string,
  session: string
): Promise<StudentFeeStatus | null> {
  try {
    // ✅ FIX: Sanitize session for document ID
    const statusId = `${studentId}-${term}-${sanitizeAcademicYear(session)}`;
    const statusDocRef = doc(db, 'student_fee_status', statusId);
    const statusDoc = await getDoc(statusDocRef);

    if (statusDoc.exists()) {
      const data = statusDoc.data();
      return {
        ...data,
        dueDate: data.dueDate.toDate(),
        lastPaymentDate: data.lastPaymentDate?.toDate(),
        lastUpdated: data.lastUpdated.toDate(),
        createdAt: data.createdAt.toDate(),
      } as StudentFeeStatus;
    }

    return null;
  } catch (error) {
    console.error('Error getting student fee status:', error);
    return null;
  }
}

/**
 * Get all payments for a student
 */
export async function getStudentPayments(
  studentId: string,
  term?: string,
  session?: string
): Promise<FeePayment[]> {
  try {
    let q;
    
    if (term && session) {
      q = query(
        collection(db, 'fee_payments'),
        where('studentId', '==', studentId),
        where('term', '==', term),
        where('session', '==', session) // Query still uses original format
      );
    } else {
      q = query(
        collection(db, 'fee_payments'),
        where('studentId', '==', studentId)
      );
    }

    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        paymentDate: data.paymentDate.toDate(),
        recordedAt: data.recordedAt.toDate(),
        verifiedAt: data.verifiedAt?.toDate(),
        createdAt: data.createdAt.toDate(),
      } as FeePayment;
    });
    
    return payments.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());
  } catch (error) {
    console.error('Error getting student payments:', error);
    return [];
  }
}

/**
 * Get fee status for all students in a class
 */
export async function getClassFeeStatus(
  classId: string,
  term: string,
  session: string
): Promise<StudentFeeStatus[]> {
  try {
    const q = query(
      collection(db, 'student_fee_status'),
      where('classId', '==', classId),
      where('term', '==', term),
      where('session', '==', session) // Query still uses original format
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate.toDate(),
        lastPaymentDate: data.lastPaymentDate?.toDate(),
        lastUpdated: data.lastUpdated.toDate(),
        createdAt: data.createdAt.toDate(),
      } as StudentFeeStatus;
    });
  } catch (error) {
    console.error('Error getting class fee status:', error);
    return [];
  }
}

/**
 * Get fee defaulters
 */
export async function getFeeDefaulters(
  term: string,
  session: string,
  classId?: string
): Promise<StudentFeeStatus[]> {
  try {
    let q = query(
      collection(db, 'student_fee_status'),
      where('term', '==', term),
      where('session', '==', session), // Query still uses original format
      where('status', 'in', ['unpaid', 'partial', 'overdue'])
    );

    if (classId) {
      q = query(
        collection(db, 'student_fee_status'),
        where('classId', '==', classId),
        where('term', '==', term),
        where('session', '==', session), // Query still uses original format
        where('status', 'in', ['unpaid', 'partial', 'overdue'])
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate.toDate(),
        lastPaymentDate: data.lastPaymentDate?.toDate(),
        lastUpdated: data.lastUpdated.toDate(),
        createdAt: data.createdAt.toDate(),
      } as StudentFeeStatus;
    });
  } catch (error) {
    console.error('Error getting fee defaulters:', error);
    return [];
  }
}

/**
 * Cancel a payment
 */
export async function cancelPayment(
  paymentId: string,
  cancelledBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const paymentDocRef = doc(db, 'fee_payments', paymentId);
    const paymentDoc = await getDoc(paymentDocRef);
    if (!paymentDoc.exists()) {
      return { success: false, error: 'Payment not found' };
    }

    const payment = paymentDoc.data() as FeePayment;

    // Update payment status
    await updateDoc(paymentDocRef, {
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: Timestamp.now(),
    });

    // Reverse the fee status update
    // ✅ FIX: Sanitize session for document ID
    const statusId = `${payment.studentId}-${payment.term}-${sanitizeAcademicYear(payment.session)}`;
    const statusRef = doc(db, 'student_fee_status', statusId);
    const statusSnap = await getDoc(statusRef);

    if (statusSnap.exists()) {
      const currentStatus = statusSnap.data() as StudentFeeStatus;
      const newAmountPaid = currentStatus.amountPaid - payment.amountPaid;
      const newBalance = currentStatus.totalFees - newAmountPaid;

      let newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid';
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      const dueDate = currentStatus.dueDate instanceof Date 
        ? currentStatus.dueDate 
        : (currentStatus.dueDate as any).toDate();
      const isOverdue = new Date() > dueDate && newBalance > 0;
      if (isOverdue) {
        newStatus = 'overdue';
      }

      await updateDoc(statusRef, {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payments: currentStatus.payments.filter(id => id !== paymentId),
        isOverdue,
        lastUpdated: Timestamp.now(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling payment:', error);
    return { success: false, error: error.message };
  }
}