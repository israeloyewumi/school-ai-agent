// functions/src/lib/firebase/feeManagement.ts - ADMIN SDK VERSION
import * as admin from 'firebase-admin';

// Initialize Firestore from Admin SDK
const db = admin.firestore();

import { 
  FeeStructure, 
  FeePayment, 
  StudentFeeStatus, 
  FeeItem
} from '../../types/database';

// ============================================
// FEE STRUCTURE MANAGEMENT
// ============================================

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
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    
    const sanitizedSession = data.session.replace(/\//g, '-');
    const feeStructureId = `${data.classId}-${data.term}-${sanitizedSession}`;
    
    const feeStructure: FeeStructure = {
      id: feeStructureId,
      classId: data.classId,
      className: data.className,
      term: data.term,
      session: data.session,
      academicYear: data.academicYear,
      items: data.items,
      totalAmount,
      dueDate: data.dueDate,
      createdAt: new Date(),
      createdBy: data.createdBy,
      isActive: true,
    };

    await db.collection('fee_structures').doc(feeStructureId).set({
      ...feeStructure,
      dueDate: admin.firestore.Timestamp.fromDate(data.dueDate),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, feeStructureId };
  } catch (error: any) {
    console.error('Error setting fee structure:', error);
    return { success: false, error: error.message };
  }
}

export async function getFeeStructure(
  classId: string, 
  term: string, 
  session: string
): Promise<FeeStructure | null> {
  try {
    const sanitizedSession = session.replace(/\//g, '-');
    const feeStructureId = `${classId}-${term}-${sanitizedSession}`;
    
    const docRef = db.collection('fee_structures').doc(feeStructureId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data()!;
      return {
        ...data,
        dueDate: data.dueDate.toDate(),
        createdAt: data.createdAt.toDate(),
      } as FeeStructure;
    }

    return null;
  } catch (error) {
    console.error('Error getting fee structure:', error);
    return null;
  }
}

// ============================================
// RECEIPT NUMBER GENERATION
// ============================================

export async function generateReceiptNumber(): Promise<string> {
  try {
    const configRef = db.collection('system_config').doc('receipt_number');
    const configSnap = await configRef.get();

    const currentYear = new Date().getFullYear().toString();
    let lastNumber = 0;

    if (configSnap.exists) {
      const config = configSnap.data() as any;
      if (config.year === currentYear) {
        lastNumber = config.lastNumber || 0;
      }
    }

    const nextNumber = lastNumber + 1;
    const receiptNumber = `RCP/${currentYear}/${nextNumber.toString().padStart(5, '0')}`;

    await configRef.set({
      prefix: 'RCP',
      year: currentYear,
      lastNumber: nextNumber,
    }, { merge: true });

    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    return `RCP/${new Date().getFullYear()}/${Date.now().toString().slice(-5)}`;
  }
}

// ============================================
// PAYMENT RECORDING
// ============================================

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

    const studentDoc = await db.collection('students').doc(data.studentId).get();
    if (!studentDoc.exists) {
      return { success: false, error: 'Student not found' };
    }
    const student = studentDoc.data()!;

    let parentName = '';
    let parentPhone = '';
    let parentId = student.parentId || student.guardianId || '';
    
    if (parentId) {
      const parentDoc = await db.collection('parents').doc(parentId).get();
      if (parentDoc.exists) {
        const parentData = parentDoc.data()!;
        const userDoc = await db.collection('users').doc(parentData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          parentName = `${userData.firstName} ${userData.lastName}`;
          parentPhone = userData.phoneNumber || '';
        }
      }
    }

    const receiptNumber = await generateReceiptNumber();

    const paymentId = db.collection('fee_payments').doc().id;
    
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
      session: data.session,
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

    await db.collection('fee_payments').doc(paymentId).set({
      ...payment,
      session: data.session,
      paymentDate: admin.firestore.Timestamp.fromDate(data.paymentDate),
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Payment recorded:', receiptNumber);
    return { success: true, paymentId, receiptNumber };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FEE STATUS CALCULATION
// ============================================

export async function getStudentFeeStatus(
  studentId: string,
  term: string,
  session: string
): Promise<StudentFeeStatus | null> {
  try {
    console.log('💰 Calculating fee status for:', { studentId, term, session });

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      console.error('Student not found:', studentId);
      return null;
    }
    
    const student = studentDoc.data()!;
    const classId = student.classId;
    const className = student.className;
    
    console.log('📚 Student class:', { classId, className });

    const feeStructure = await getFeeStructure(classId, term, session);
    if (!feeStructure) {
      console.log('⚠️ No fee structure found for:', { classId, term, session });
      return null;
    }

    const totalFees = feeStructure.totalAmount;
    console.log('💰 Total fees from structure:', totalFees);

    const paymentsSnapshot = await db.collection('fee_payments')
      .where('studentId', '==', studentId)
      .where('term', '==', term)
      .where('session', '==', session)
      .where('status', '==', 'verified')
      .get();
    
    console.log('💳 Payments found:', paymentsSnapshot.size);

    let amountPaid = 0;
    const paymentIds: string[] = [];
    
    paymentsSnapshot.forEach(paymentDoc => {
      const payment = paymentDoc.data();
      amountPaid += payment.amountPaid || 0;
      paymentIds.push(paymentDoc.id);
    });

    const balance = totalFees - amountPaid;
    
    let status: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid';
    if (balance <= 0) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    const isOverdue = new Date() > feeStructure.dueDate && balance > 0;
    if (isOverdue) {
      status = 'overdue';
    }

    const daysOverdue = isOverdue 
      ? Math.floor((new Date().getTime() - feeStructure.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const feeStatus: StudentFeeStatus = {
      id: `${studentId}-${term}-${session.replace(/\//g, '-')}`,
      studentId,
      studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentClass: className,
      classId,
      parentId: student.parentId || '',
      parentName: '',
      parentPhone: '',
      term,
      session,
      academicYear: feeStructure.academicYear,
      totalFees,
      amountPaid,
      balance,
      status,
      payments: paymentIds,
      dueDate: feeStructure.dueDate,
      isOverdue,
      daysOverdue,
      lastPaymentDate: paymentIds.length > 0 ? new Date() : undefined,
      lastPaymentAmount: amountPaid > 0 ? amountPaid : undefined,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };

    console.log('✅ Calculated fee status:', { 
      totalFees, 
      amountPaid, 
      balance, 
      status,
      studentName: feeStatus.studentName 
    });

    return feeStatus;
  } catch (error) {
    console.error('❌ Error calculating fee status:', error);
    return null;
  }
}

// ============================================
// OTHER FUNCTIONS
// ============================================

export async function getStudentPayments(
  studentId: string,
  term?: string,
  session?: string
): Promise<FeePayment[]> {
  try {
    let queryRef = db.collection('fee_payments')
      .where('studentId', '==', studentId);
    
    if (term && session) {
      queryRef = queryRef
        .where('term', '==', term)
        .where('session', '==', session);
    }

    const snapshot = await queryRef.get();
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

export async function getClassFeeStatus(
  classId: string,
  term: string,
  session: string
): Promise<StudentFeeStatus[]> {
  try {
    const studentsSnapshot = await db.collection('students')
      .where('classId', '==', classId)
      .where('isActive', '==', true)
      .get();
    
    const feeStatuses: StudentFeeStatus[] = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const feeStatus = await getStudentFeeStatus(studentId, term, session);
      
      if (feeStatus) {
        feeStatuses.push(feeStatus);
      }
    }

    return feeStatuses;
  } catch (error) {
    console.error('Error getting class fee status:', error);
    return [];
  }
}

// ============================================
// BACKFILL FUNCTION
// ============================================

export async function backfillFeeStatusForAllStudents(
  term: string = 'First Term',
  session: string = '2025/2026'
): Promise<{ success: boolean; processed: number; errors: string[] }> {
  try {
    console.log('📄 Backfilling fee status for all students...');
    
    const studentsSnapshot = await db.collection('students')
      .where('isActive', '==', true)
      .get();
    
    let processed = 0;
    const errors: string[] = [];

    console.log(`Found ${studentsSnapshot.size} active students`);

    for (const studentDoc of studentsSnapshot.docs) {
      try {
        const studentId = studentDoc.id;
        await getStudentFeeStatus(studentId, term, session);
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${studentsSnapshot.size} students`);
        }
      } catch (error: any) {
        errors.push(`Student ${studentDoc.id}: ${error.message}`);
      }
    }

    console.log(`✅ Backfill completed: ${processed} processed, ${errors.length} errors`);
    return { success: true, processed, errors };
  } catch (error: any) {
    console.error('❌ Backfill failed:', error);
    return { success: false, processed: 0, errors: [error.message] };
  }
}