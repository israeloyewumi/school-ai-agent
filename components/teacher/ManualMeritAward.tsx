// components/teacher/ManualMeritAward.tsx - Manual Merit/Demerit Entry
"use client";

import { useState } from 'react';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { awardMerit } from '@/lib/firebase/db';
import { MeritCategory } from '@/types/database';
import type { Student } from '@/types/database';

interface ManualMeritAwardProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  studentList: Student[];
  term: string;
  session: string;
  onComplete: () => void;
  onCancel: () => void;
}

const MERIT_CATEGORIES: { 
  positive: { value: MeritCategory; label: string; points: number; icon: string }[];
  negative: { value: MeritCategory; label: string; points: number; icon: string }[];
} = {
  positive: [
    { value: 'academic_excellence', label: 'Academic Excellence', points: 10, icon: '🏆' },
    { value: 'homework', label: 'Homework Excellence', points: 5, icon: '📚' },
    { value: 'punctuality', label: 'Punctuality', points: 3, icon: '⏰' },
    { value: 'helpfulness', label: 'Helpfulness', points: 5, icon: '🤝' },
    { value: 'participation', label: 'Class Participation', points: 3, icon: '✋' },
    { value: 'leadership', label: 'Leadership', points: 7, icon: '👑' },
    { value: 'responsibility', label: 'Responsibility', points: 5, icon: '💪' },
  ],
  negative: [
    { value: 'noise_making', label: 'Noise Making', points: -3, icon: '🔊' },
    { value: 'late_to_class', label: 'Late to Class', points: -2, icon: '⏱️' },
    { value: 'missing_homework', label: 'Missing Homework', points: -5, icon: '❌' },
    { value: 'disrespect', label: 'Disrespect', points: -7, icon: '😤' },
    { value: 'phone_in_class', label: 'Phone in Class', points: -5, icon: '📱' },
    { value: 'distraction', label: 'Causing Distraction', points: -3, icon: '🎭' },
  ]
};

export default function ManualMeritAward({
  teacherId,
  teacherName,
  classId,
  className,
  studentList,
  term,
  session,
  onComplete,
  onCancel
}: ManualMeritAwardProps) {
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<typeof MERIT_CATEGORIES.positive[0] | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [customPoints, setCustomPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit() {
    if (!selectedStudent || !selectedCategory) {
      setError('Please select a student and category');
      return;
    }

    // Use custom reason if provided, otherwise use category label
    const finalReason = customReason.trim() || selectedCategory.label;
    const finalPoints = customPoints.trim() ? parseInt(customPoints) : selectedCategory.points;

    if (isNaN(finalPoints)) {
      setError('Invalid points value');
      return;
    }

    if (!confirm(
      `Award ${Math.abs(finalPoints)} ${finalPoints > 0 ? 'merit' : 'demerit'} points to ${selectedStudent.firstName} ${selectedStudent.lastName}?\n\n` +
      `Reason: ${finalReason}`
    )) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save merit
      await awardMerit({
        studentId: selectedStudent.id,
        teacherId,
        points: finalPoints,
        category: selectedCategory.value,
        reason: finalReason,
        date: new Date(),
        term,
        session,
        classId
      });
      
      // Create audit log
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: finalPoints > 0 ? 'MERIT_AWARDED' : 'DEMERIT_GIVEN',
        details: `${finalPoints > 0 ? 'Awarded' : 'Gave'} ${Math.abs(finalPoints)} ${finalPoints > 0 ? 'merit' : 'demerit'} points to ${selectedStudent.firstName} ${selectedStudent.lastName} for ${finalReason}`,
        affectedEntity: selectedStudent.id,
        affectedEntityType: 'student',
        afterData: { points: finalPoints, category: selectedCategory.value, reason: finalReason },
        success: true
      });

      setSuccess(`✅ ${finalPoints > 0 ? 'Merit' : 'Demerit'} awarded successfully!`);
      
      // Reset form
      setSelectedStudent(null);
      setSelectedCategory(null);
      setCustomReason('');
      setCustomPoints('');
      setIsPositive(null);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err: any) {
      console.error('Error saving merit:', err);
      setError(err.message || 'Failed to save merit/demerit');
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: finalPoints > 0 ? 'MERIT_AWARDED' : 'DEMERIT_GIVEN',
        details: `Failed to award merit/demerit`,
        affectedEntity: selectedStudent.id,
        affectedEntityType: 'student',
        success: false,
        errorMessage: err.message
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setIsPositive(null);
    setSelectedStudent(null);
    setSelectedCategory(null);
    setCustomReason('');
    setCustomPoints('');
    setError('');
    setSuccess('');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">
            {isPositive === null ? '⭐' : isPositive ? '🌟' : '⚠️'}
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Manual Merit/Demerit Entry</h2>
          <p className="text-gray-600 mt-2">{className}</p>
        </div>

        {/* Step 1: Select Type */}
        {isPositive === null && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
              Select Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsPositive(true)}
                className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border-2 border-green-200 hover:border-green-300 transition-all"
              >
                <div className="text-5xl mb-3">🌟</div>
                <div className="text-xl font-bold text-green-700 mb-1">Merit</div>
                <div className="text-sm text-green-600">Award positive points</div>
              </button>
              
              <button
                onClick={() => setIsPositive(false)}
                className="p-8 bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 rounded-xl border-2 border-red-200 hover:border-red-300 transition-all"
              >
                <div className="text-5xl mb-3">⚠️</div>
                <div className="text-xl font-bold text-red-700 mb-1">Demerit</div>
                <div className="text-sm text-red-600">Deduct points</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Student */}
        {isPositive !== null && !selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Select Student ({studentList.length} students)
              </h3>
              <button
                onClick={() => setIsPositive(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Change Type
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {studentList.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="p-4 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{student.gender === 'male' ? '👦' : '👧'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {student.className}
                        {student.academicTrack && ` • ${student.academicTrack}`}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Category & Confirm */}
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {isPositive ? 'Merit' : 'Demerit'} for {selectedStudent.firstName} {selectedStudent.lastName}
              </h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Change Student
              </button>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Category
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {(isPositive ? MERIT_CATEGORIES.positive : MERIT_CATEGORIES.negative).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all flex items-center justify-between ${
                      selectedCategory?.value === cat.value
                        ? isPositive
                          ? 'bg-green-100 border-green-500'
                          : 'bg-red-100 border-red-500'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-medium">{cat.label}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      cat.points > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {cat.points > 0 ? '+' : ''}{cat.points}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason (Optional) */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Reason (Optional)
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={`Default: ${selectedCategory.label}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Custom Points (Optional) */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Points (Optional)
                </label>
                <input
                  type="number"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder={`Default: ${selectedCategory.points}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Summary */}
            {selectedCategory && (
              <div className={`rounded-lg p-6 ${
                isPositive ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
              }`}>
                <h4 className="font-semibold text-gray-800 mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Student:</span>
                    <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{isPositive ? 'Merit' : 'Demerit'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{selectedCategory.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reason:</span>
                    <span className="font-medium">{customReason || selectedCategory.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Points:</span>
                    <span className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {customPoints || selectedCategory.points > 0 ? '+' : ''}{customPoints || selectedCategory.points}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedCategory && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 ${
                  isPositive
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Award {isPositive ? 'Merit' : 'Demerit'}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        {success && (
          <div className="mt-4 bg-green-50 text-green-700 rounded-lg p-3">
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 rounded-lg p-3">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {(selectedStudent || isPositive !== null) && (
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              🔄 Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}