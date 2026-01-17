// app/parent/fees/page.tsx - Parent Fee Information Page (FIXED SESSION)

'use client';

import { useState, useEffect } from 'react';
import { getStudentFeeStatus, type FeeStatus } from '@/lib/firebase/parentAccess';

export default function FeesPage() {
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // ✅ FIXED: Use current session 2025-2026 instead of 2024/2025
  const [term] = useState('First Term');
  const [session] = useState('2025/2026'); // ✅ CHANGED: Use slashes

  useEffect(() => {
    loadFeeStatus();
  }, []);

  async function loadFeeStatus() {
    try {
      setLoading(true);
      setError('');
      
      const selectedChildId = localStorage.getItem('selectedChildId');
      
      if (!selectedChildId) {
        setError('No student selected. Please select a student from the dashboard.');
        return;
      }

      const data = await getStudentFeeStatus(selectedChildId, term, session);
      setFeeStatus(data);
    } catch (err: any) {
      console.error('❌ Error loading fees:', err);
      setError(err.message || 'Failed to load fee information');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading fee information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Fees</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadFeeStatus}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!feeStatus) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-yellow-800">No Fee Information Available</h3>
          </div>
          <p className="text-yellow-700">
            Fee structure has not been set up for this student's class yet. 
            Please contact the school administration for more information.
          </p>
        </div>
      </div>
    );
  }

  const statusColor = 
    feeStatus.status === 'paid' ? 'bg-green-500' :
    feeStatus.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500';

  const statusIcon = 
    feeStatus.status === 'paid' ? '✓' :
    feeStatus.status === 'partial' ? '⚠' : '✗';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Fee Information</h1>
        <p className="text-gray-600 mt-1">{term} • {session}</p>
      </div>

      {/* Fee Status Banner */}
      <div className={`${statusColor} text-white rounded-lg shadow-lg p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Fee Status</p>
            <p className="text-4xl font-bold uppercase mt-2 flex items-center gap-3">
              <span>{statusIcon}</span>
              <span>{feeStatus.status}</span>
            </p>
          </div>
          <div className="text-6xl">💰</div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Total Fee</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ₦{feeStatus.totalAmount.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Amount Paid</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            ₦{feeStatus.amountPaid.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Balance Due</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            ₦{feeStatus.balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {feeStatus.totalAmount > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-700">Payment Progress</p>
            <p className="text-sm font-semibold text-gray-900">
              {Math.round((feeStatus.amountPaid / feeStatus.totalAmount) * 100)}%
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                feeStatus.status === 'paid' ? 'bg-green-500' :
                feeStatus.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((feeStatus.amountPaid / feeStatus.totalAmount) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Payment History */}
      {feeStatus.paymentHistory && feeStatus.paymentHistory.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
            <p className="text-sm text-gray-600 mt-1">
              {feeStatus.paymentHistory.length} payment{feeStatus.paymentHistory.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeStatus.paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.date.toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ₦{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {payment.method.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {payment.receiptNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payment.recordedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Payment Summary */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Payments:</span>
              <span className="text-lg font-bold text-gray-900">
                ₦{feeStatus.paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium">No payments recorded yet</p>
          <p className="text-sm text-gray-500 mt-1">Payment history will appear here once payments are made</p>
        </div>
      )}

      {/* Outstanding Balance Alert */}
      {feeStatus.balance > 0 && (
        <div className={`${
          feeStatus.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        } border rounded-lg p-4`}>
          <div className="flex items-start">
            <svg className={`w-5 h-5 ${
              feeStatus.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
            } mt-0.5 mr-3 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className={`font-semibold ${
                feeStatus.status === 'overdue' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {feeStatus.status === 'overdue' ? 'Payment Overdue' : 'Outstanding Balance'}
              </p>
              <p className={`text-sm mt-1 ${
                feeStatus.status === 'overdue' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                An outstanding balance of <strong>₦{feeStatus.balance.toLocaleString()}</strong> remains unpaid.
                {feeStatus.dueDate && (
                  <> {feeStatus.status === 'overdue' ? 'Payment was' : 'Payment is'} due on{' '}
                    <strong>
                      {feeStatus.dueDate.toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </strong>.
                  </>
                )}
              </p>
              <p className={`text-sm mt-2 ${
                feeStatus.status === 'overdue' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                Please contact the school bursar's office to make payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paid in Full Success */}
      {feeStatus.status === 'paid' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-800">Fees Paid in Full</p>
              <p className="text-sm text-green-700 mt-1">
                All fees for {term} ({session}) have been paid. Thank you!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={loadFeeStatus}
          className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>
  );
}