// components/admin/FeePaymentRecorder.tsx - FIXED VERSION

'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { recordFeePayment, getStudentFeeStatus } from '@/lib/firebase/feeManagement';
import { Student, StudentFeeStatus, FeeItem } from '@/types/database';

interface FeePaymentRecorderProps {
  currentTerm: string;
  currentSession: string;
  currentAcademicYear: string;
  adminUserId: string;
  adminName: string;
}

export default function FeePaymentRecorder({
  currentTerm,
  currentSession,
  currentAcademicYear,
  adminUserId,
  adminName,
}: FeePaymentRecorderProps) {
  // Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feeStatus, setFeeStatus] = useState<StudentFeeStatus | null>(null);

  // Payment Form
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'pos' | 'cheque' | 'card' | 'paystack' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Load all students
  useEffect(() => {
    loadStudents();
  }, []);

  // Filter students based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents([]);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(query) ||
          s.lastName?.toLowerCase().includes(query) ||
          s.admissionNumber?.toLowerCase().includes(query) ||
          s.className?.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered.slice(0, 10));
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsQuery = query(
        collection(db, 'students'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(studentsQuery);
      const studentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(studentsList);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.firstName} ${student.lastName} - ${student.className}`);
    setFilteredStudents([]);
    setError('');
    setSuccess(false);

    // Load fee status
    try {
      const status = await getStudentFeeStatus(student.id, currentTerm, currentSession);
      setFeeStatus(status);

      if (!status) {
        setError('No fee structure set for this student\'s class. Please set up fees first.');
      }
    } catch (err) {
      console.error('Error loading fee status:', err);
      setError('Failed to load fee status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!feeStatus) {
      setError('Fee structure not found for this student. Please set up fees first.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      // ✅ FIX: Log what we're sending
      console.log('💳 Recording payment with session:', currentSession);
      
      const result = await recordFeePayment({
        studentId: selectedStudent.id,
        term: currentTerm,
        session: currentAcademicYear, // This ensures session matches academicYear
        academicYear: currentAcademicYear,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate: new Date(paymentDate),
        paymentReference: paymentReference || undefined,
        bankName: bankName || undefined,
        accountName: accountName || undefined,
        chequeNumber: chequeNumber || undefined,
        notes: notes || undefined,
        receivedBy: adminUserId,
        receivedByName: adminName,
      });

      if (result.success) {
        setSuccess(true);
        setReceiptNumber(result.receiptNumber || '');
        
        // Reload fee status
        const updatedStatus = await getStudentFeeStatus(selectedStudent.id, currentTerm, currentSession);
        setFeeStatus(updatedStatus);

        // Reset form
        setAmount('');
        setPaymentMethod('cash');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentReference('');
        setBankName('');
        setAccountName('');
        setChequeNumber('');
        setNotes('');
      } else {
        setError(result.error || 'Failed to record payment');
      }
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Fee Payment</h2>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-800">Payment Recorded Successfully!</p>
              <p className="text-sm text-green-700">Receipt Number: <strong>{receiptNumber}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Student Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Student
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, admission number, or class..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {/* Search Results Dropdown */}
          {filteredStudents.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                >
                  <p className="font-semibold text-gray-800">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {student.admissionNumber} • {student.className}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Info */}
      {selectedStudent && feeStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">Student Fee Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-blue-700">Total Fees</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(feeStatus.totalFees)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Amount Paid</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(feeStatus.amountPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Balance</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(feeStatus.balance)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Status</p>
              <p className={`text-lg font-bold ${
                feeStatus.status === 'paid' ? 'text-green-600' :
                feeStatus.status === 'partial' ? 'text-yellow-600' :
                feeStatus.status === 'overdue' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {feeStatus.status.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {selectedStudent && feeStatus && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Paid <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">₦</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Remaining balance: {formatCurrency(feeStatus.balance)}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="paystack">Paystack</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Conditional Fields */}
          {(paymentMethod === 'bank_transfer' || paymentMethod === 'pos') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., GTBank, Access Bank"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name / Payer Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Name of person who made payment"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., FT2026001234567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {paymentMethod === 'cheque' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cheque Number
                </label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="Cheque number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setFeeStatus(null);
                setSearchQuery('');
                setAmount('');
                setSuccess(false);
                setError('');
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      )}

      {/* Instructions */}
      {!selectedStudent && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Search for the student using their name, admission number, or class</li>
            <li>Select the student from the dropdown</li>
            <li>Review their current fee status</li>
            <li>Enter the payment amount and details</li>
            <li>Click "Record Payment" to save</li>
          </ol>
        </div>
      )}
    </div>
  );
}