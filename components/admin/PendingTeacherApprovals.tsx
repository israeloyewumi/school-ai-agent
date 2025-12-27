// components/admin/PendingTeacherApprovals.tsx - Pending Teacher Approval Interface
"use client";

import { useState } from 'react';
import { PendingTeacherApproval } from '@/types/database';
import { approveTeacher, rejectTeacher } from '@/lib/firebase/teacherManagement';
import { 
  assignClassTeacher, 
  assignSubjectTeacher 
} from '@/lib/firebase/classManagement';
import { addTeacherToSubject } from '@/lib/firebase/subjectManagement';

interface PendingTeacherApprovalsProps {
  approvals: PendingTeacherApproval[];
  adminId: string;
  adminName: string;
  onRefresh: () => void;
}

export default function PendingTeacherApprovals({
  approvals,
  adminId,
  adminName,
  onRefresh
}: PendingTeacherApprovalsProps) {
  const [selectedApproval, setSelectedApproval] = useState<PendingTeacherApproval | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove(approval: PendingTeacherApproval) {
    if (!confirm(`Are you sure you want to approve ${approval.firstName} ${approval.lastName}?`)) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Approve the teacher
      await approveTeacher(approval.id!, adminId, adminName);

      // Assign class teacher if applicable
      if (approval.requestedClass) {
        await assignClassTeacher(
          approval.requestedClass.classId,
          approval.teacherId,
          `${approval.firstName} ${approval.lastName}`,
          adminId,
          adminName
        );
      }

      // Assign subject teacher if applicable
      if (approval.requestedSubjects && approval.requestedSubjects.length > 0) {
        for (const subject of approval.requestedSubjects) {
          // Add to subject collection
          await addTeacherToSubject(
            subject.subjectId,
            approval.teacherId,
            `${approval.firstName} ${approval.lastName}`,
            subject.classes,
            adminId,
            adminName
          );

          // Add to each class's subject teachers
          for (const classId of subject.classes) {
            await assignSubjectTeacher(
              classId,
              subject.subjectId,
              subject.subjectName,
              approval.teacherId,
              `${approval.firstName} ${approval.lastName}`,
              adminId,
              adminName
            );
          }
        }
      }

      alert(`✅ ${approval.firstName} ${approval.lastName} has been approved successfully!`);
      onRefresh();
    } catch (err: any) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve teacher');
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
      await rejectTeacher(
        selectedApproval.id!,
        adminId,
        adminName,
        rejectReason
      );

      alert(`${selectedApproval.firstName} ${selectedApproval.lastName}'s application has been rejected.`);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedApproval(null);
      onRefresh();
    } catch (err: any) {
      console.error('Rejection error:', err);
      setError(err.message || 'Failed to reject teacher');
    } finally {
      setProcessing(false);
    }
  }

  function openRejectModal(approval: PendingTeacherApproval) {
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
        <p className="text-gray-600">No pending teacher approvals at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Pending Teacher Approvals ({approvals.length})
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

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
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  👨‍🏫
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

            {/* Teacher Type */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Teacher Type:</h4>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                approval.teacherType === 'class_teacher'
                  ? 'bg-green-100 text-green-800'
                  : approval.teacherType === 'subject_teacher'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {approval.teacherType === 'class_teacher' && '📋 Class Teacher Only'}
                {approval.teacherType === 'subject_teacher' && '📚 Subject Teacher Only'}
                {approval.teacherType === 'both' && '🎓 Both (Class + Subject)'}
              </span>
            </div>

            {/* Requested Class */}
            {approval.requestedClass && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Requested Class:</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-medium text-green-900">{approval.requestedClass.className}</p>
                </div>
              </div>
            )}

            {/* Requested Subjects */}
            {approval.requestedSubjects && approval.requestedSubjects.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Requested Subjects ({approval.requestedSubjects.length}):
                </h4>
                <div className="space-y-2">
                  {approval.requestedSubjects.map((subject, idx) => (
                    <div
                      key={idx}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <p className="font-medium text-blue-900 mb-1">{subject.subjectName}</p>
                      <p className="text-xs text-blue-700">
                        {subject.classes.length} {subject.classes.length === 1 ? 'class' : 'classes'} assigned
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    ✅ Approve
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
              Reject Application
            </h3>

            <p className="text-gray-600 mb-4">
              Are you sure you want to reject <strong>{selectedApproval.firstName} {selectedApproval.lastName}</strong>'s application?
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