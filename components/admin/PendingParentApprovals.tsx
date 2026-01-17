// components/admin/PendingParentApprovals.tsx - WITH COMPREHENSIVE DEBUGGING
"use client";

import { useState } from 'react';
import { PendingParentApproval } from '@/types/database';
import { approveParent, rejectParent } from '@/lib/firebase/parentManagement';
import { createStudent } from '@/lib/firebase/studentManagement';
import { addChildToParent } from '@/lib/firebase/parentManagement';

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
      parentId: approval.parentId,
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
      // Step 1: Approve the parent
      console.log('📝 Step 1: Approving parent account...');
      await approveParent(approval.id!, adminId, adminName);
      console.log('✅ Parent approved');

      // Step 2: Create student accounts for all children
      const createdStudentIds: string[] = [];
      
      console.log('📝 Step 2: Creating student accounts...');
      for (let i = 0; i < approval.children.length; i++) {
        const child = approval.children[i];
        console.log(`\n🎓 Creating student ${i + 1}/${approval.children.length}:`, child.firstName, child.lastName);
        
        try {
          console.log('📤 Sending to createStudent:', {
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
            gender: child.gender,
            classId: child.classId,
            className: child.className,
            guardianId: approval.parentId,
            subjects: child.subjects,
            subjectsCount: child.subjects?.length || 0,
            academicTrack: child.academicTrack,
            tradeSubject: child.tradeSubject
          });

          const studentId = await createStudent({
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: new Date(child.dateOfBirth),
            gender: child.gender,
            classId: child.classId,
            className: child.className,
            guardianId: approval.parentId,
            address: approval.address || '',
            city: '',
            state: '',
            emergencyContact: `${approval.firstName} ${approval.lastName}`,
            emergencyPhone: approval.phoneNumber || '',
            subjects: child.subjects || [],
            academicTrack: child.academicTrack || null,
            tradeSubject: child.tradeSubject || null
          }, adminId, adminName);
          
          createdStudentIds.push(studentId);
          console.log(`✅ Student created successfully: ${child.firstName} ${child.lastName} (${studentId})`);
        } catch (childError) {
          console.error(`\n❌ ===== ERROR CREATING STUDENT =====`);
          console.error(`Student: ${child.firstName} ${child.lastName}`);
          console.error('Error:', childError);
          console.error('Error message:', (childError as Error).message);
          console.error('Stack trace:', (childError as Error).stack);
          console.error('Child data that failed:', {
            firstName: child.firstName,
            lastName: child.lastName,
            classId: child.classId,
            className: child.className,
            subjects: child.subjects,
            subjectsCount: child.subjects?.length || 0,
            academicTrack: child.academicTrack,
            tradeSubject: child.tradeSubject
          });
          console.error('=====================================\n');
          
          throw new Error(`Failed to create student account for ${child.firstName} ${child.lastName}`);
        }
      }

      console.log('\n✅ All students created successfully');
      console.log('Created student IDs:', createdStudentIds);

      // Step 3: Link all children to parent
      console.log('\n📝 Step 3: Linking children to parent...');
      for (const studentId of createdStudentIds) {
        await addChildToParent(approval.parentId, studentId, adminId, adminName);
      }
      console.log('✅ All children linked to parent');

      alert(`✅ ${approval.firstName} ${approval.lastName} has been approved!\n\n${createdStudentIds.length} student account(s) created successfully.`);
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

      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          🐛 <strong>Debug Mode Active:</strong> Check browser console for detailed logs
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
                            {/* Debug: Show actual subject IDs */}
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">
                                🐛 View subject details
                              </summary>
                              <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
{JSON.stringify({
  subjects: child.subjects,
  count: child.subjects.length,
  academicTrack: child.academicTrack,
  tradeSubject: child.tradeSubject
}, null, 2)}
                              </pre>
                            </details>
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