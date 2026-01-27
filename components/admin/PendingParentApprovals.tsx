// components/admin/PendingParentApprovals.tsx - FIXED: Simplified approval flow
"use client";

import { useState } from 'react';
import { PendingParentApproval } from '@/types/database';
import { approveParent, rejectParent } from '@/lib/firebase/parentManagement';

interface PendingParentApprovalsProps {
  approvals: PendingParentApproval[];
  adminId: string;
  adminName: string;
  onRefresh: () => void;
}

export default function PendingParentApprovals({
  approvals,
  adminId,
  adminName,
  onRefresh
}: PendingParentApprovalsProps) {
  const [selectedApproval, setSelectedApproval] = useState<PendingParentApproval | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove(approval: PendingParentApproval) {
    console.log('🔍 ===== PARENT APPROVAL DEBUG START =====');
    console.log('👨‍👩‍👧 Approval Data:', {
      approvalId: approval.id,
      parentName: `${approval.firstName} ${approval.lastName}`,
      email: approval.email,
      childrenCount: approval.children.length
    });

    console.log('👶 Children Data:');
    approval.children.forEach((child, index) => {
      console.log(`  Child ${index + 1}:`, {
        name: `${child.firstName} ${child.lastName}`,
        classId: child.classId,
        className: child.className,
        subjects: child.subjects,
        subjectsCount: child.subjects?.length || 0,
        academicTrack: child.academicTrack,
        tradeSubject: child.tradeSubject,
        age: child.age,
        gender: child.gender
      });
    });

    if (!confirm(`Are you sure you want to approve ${approval.firstName} ${approval.lastName} and create ${approval.children.length} student account(s)?`)) {
      console.log('⛔ Approval cancelled by admin');
      console.log('🔍 ===== PARENT APPROVAL DEBUG END =====');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      console.log('📝 Starting approval process...');
      
      // ✅ FIX: Just call approveParent - it handles EVERYTHING now!
      // - Creates parent record
      // - Creates all children records
      // - Links children to parent
      // - Updates user and approval records
      await approveParent(approval.id!, adminId, adminName);
      
      console.log('✅ Parent and all children approved successfully');

      alert(`✅ ${approval.firstName} ${approval.lastName} has been approved!\n\n${approval.children.length} student account(s) created successfully.`);
      console.log('🔍 ===== PARENT APPROVAL DEBUG END (SUCCESS) =====');
      onRefresh();
    } catch (err: any) {
      console.error('\n❌ ===== APPROVAL PROCESS FAILED =====');
      console.error('Error:', err);
      console.error('Error message:', err.message);
      console.error('Stack trace:', err.stack);
      console.error('======================================\n');
      console.log('🔍 ===== PARENT APPROVAL DEBUG END (FAILED) =====');
      
      setError(err.message || 'Failed to approve parent');
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selectedApproval) return;

    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await rejectParent(
        selectedApproval.id!,
        adminId,
        adminName,
        rejectReason
      );

      alert(`${selectedApproval.firstName} ${selectedApproval.lastName}'s registration has been rejected.`);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedApproval(null);
      onRefresh();
    } catch (err: any) {
      console.error('Rejection error:', err);
      setError(err.message || 'Failed to reject parent');
    } finally {
      setProcessing(false);
    }
  }

  function openRejectModal(approval: PendingParentApproval) {
    setSelectedApproval(approval);
    setShowRejectModal(true);
    setRejectReason('');
    setError('');
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">No pending parent approvals at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Pending Parent Approvals ({approvals.length})
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ <strong>Approval Process:</strong> When you approve a parent, the system automatically creates the parent account and all student accounts for their children.
        </p>
      </div>

      {/* Approval Cards */}
      <div className="space-y-4">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                  👨‍👩‍👧
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {approval.firstName} {approval.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{approval.email}</p>
                  {approval.phoneNumber && (
                    <p className="text-sm text-gray-600">{approval.phoneNumber}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  PENDING
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(approval.submittedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Parent Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Relationship</p>
                <p className="font-medium capitalize">{approval.relationship}</p>
              </div>
              {approval.occupation && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Occupation</p>
                  <p className="font-medium">{approval.occupation}</p>
                </div>
              )}
              {approval.workplace && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Workplace</p>
                  <p className="font-medium">{approval.workplace}</p>
                </div>
              )}
              {approval.address && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-gray-600 mb-1">Address</p>
                  <p className="font-medium">{approval.address}</p>
                </div>
              )}
            </div>

            {/* Children */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Children to be Enrolled ({approval.children.length}):
              </h4>
              <div className="space-y-2">
                {approval.children.map((child, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{child.gender === 'male' ? '👦' : '👧'}</span>
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">
                          {child.firstName} {child.lastName}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {child.className} • Age {child.age} • {child.gender === 'male' ? 'Male' : 'Female'}
                        </p>
                        {child.subjects && child.subjects.length > 0 && (
                          <div className="mt-2 bg-white rounded p-2">
                            <p className="text-xs font-medium text-blue-900">
                              📚 {child.subjects.length} subjects selected
                            </p>
                            {child.academicTrack && (
                              <p className="text-xs text-blue-700">
                                Track: {child.academicTrack}
                              </p>
                            )}
                            {child.tradeSubject && (
                              <p className="text-xs text-blue-700">
                                Trade: {child.tradeSubject}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleApprove(approval)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    ✅ Approve & Create {approval.children.length} Student{approval.children.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                onClick={() => openRejectModal(approval)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Reject Registration
            </h3>

            <p className="text-gray-600 mb-4">
              Are you sure you want to reject <strong>{selectedApproval.firstName} {selectedApproval.lastName}</strong>'s registration?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a clear reason..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedApproval(null);
                  setRejectReason('');
                  setError('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
              >
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}