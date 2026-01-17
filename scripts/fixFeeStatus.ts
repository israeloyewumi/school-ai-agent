// scripts/fixFeeStatus.ts
import { getDocs, collection, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export async function reconcileFeeStatuses() {
  console.log('🔄 Starting fee status reconciliation...');
  
  try {
    // Get all fee payments
    const paymentsSnapshot = await getDocs(collection(db, 'fee_payments'));
    const batch = writeBatch(db);
    
    console.log(`📊 Found ${paymentsSnapshot.size} payment records`);
    
    // Group payments by student-term-session
    const paymentGroups: Record<string, any[]> = {};
    
    paymentsSnapshot.docs.forEach(paymentDoc => {
      const payment = paymentDoc.data();
      // Use the SAME ID format as feeManagement.ts
      const key = `${payment.studentId}-${payment.term}-${String(payment.session).replace(/\//g, '-')}`;
      
      if (!paymentGroups[key]) {
        paymentGroups[key] = [];
      }
      paymentGroups[key].push({
        id: paymentDoc.id,
        ...payment,
        amountPaid: payment.amountPaid || payment.amount || 0
      });
    });
    
    console.log(`📊 Found ${Object.keys(paymentGroups).length} unique student-term-session combinations`);
    
    // Recreate fee status for each group
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const [statusId, payments] of Object.entries(paymentGroups)) {
      // Calculate totals
      const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const firstPayment = payments[0];
      
      // Get existing status
      const existingStatusRef = doc(db, 'student_fee_status', statusId);
      const existingStatusSnap = await getDoc(existingStatusRef);
      
      if (existingStatusSnap.exists()) {
        const existingData = existingStatusSnap.data();
        const existingPaid = existingData.amountPaid || 0;
        
        // Check if amounts match
        if (Math.abs(existingPaid - totalPaid) > 0.01) {
          console.log(`📝 Updating fee status for ${statusId}: ${existingPaid} → ${totalPaid}`);
          
          // Calculate new balance
          const totalFees = existingData.totalFees || 150000;
          const newBalance = Math.max(0, totalFees - totalPaid);
          
          // Determine new status
          let newStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid';
          if (newBalance <= 0) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }
          
          batch.update(existingStatusRef, {
            amountPaid: totalPaid,
            balance: newBalance,
            status: newStatus,
            payments: payments.map(p => p.id),
            lastPaymentDate: payments[payments.length - 1]?.paymentDate?.toDate?.() || new Date(),
            lastPaymentAmount: payments[payments.length - 1]?.amountPaid || 0,
            lastUpdated: new Date()
          });
          updatedCount++;
        }
      } else {
        // Create new status document
        console.log(`🆕 Creating new fee status for ${statusId}`);
        
        const studentId = firstPayment.studentId;
        const term = firstPayment.term;
        const session = firstPayment.session;
        
        // Default total fees (should come from fee structure, but use fallback)
        const totalFees = 150000;
        
        // Determine status
        let status: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid';
        if (totalPaid >= totalFees) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }
        
        batch.set(existingStatusRef, {
          id: statusId,
          studentId,
          studentName: firstPayment.studentName || '',
          studentClass: firstPayment.studentClass || '',
          classId: firstPayment.classId || '',
          parentId: firstPayment.parentId || '',
          parentName: firstPayment.parentName || '',
          parentPhone: firstPayment.parentPhone || '',
          term,
          session,
          academicYear: firstPayment.academicYear || session,
          totalFees,
          amountPaid: totalPaid,
          balance: Math.max(0, totalFees - totalPaid),
          status,
          payments: payments.map(p => p.id),
          lastPaymentDate: payments[payments.length - 1]?.paymentDate?.toDate?.() || new Date(),
          lastPaymentAmount: payments[payments.length - 1]?.amountPaid || 0,
          dueDate: new Date(new Date().getFullYear(), 11, 31), // Dec 31 of current year
          isOverdue: false,
          lastUpdated: new Date(),
          createdAt: new Date()
        });
        createdCount++;
      }
    }
    
    // Commit all changes
    if (createdCount > 0 || updatedCount > 0) {
      console.log(`💾 Committing ${createdCount + updatedCount} changes to Firestore...`);
      await batch.commit();
    }
    
    console.log(`✅ Reconciliation complete:`);
    console.log(`   - Created: ${createdCount} new fee status documents`);
    console.log(`   - Updated: ${updatedCount} existing documents`);
    console.log(`   - Total processed: ${Object.keys(paymentGroups).length}`);
    
    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      total: Object.keys(paymentGroups).length
    };
    
  } catch (error: any) {
    console.error('❌ Reconciliation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}