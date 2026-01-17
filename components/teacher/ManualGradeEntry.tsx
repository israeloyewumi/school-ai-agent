// components/teacher/ManualGradeEntry.tsx - Manual Grade Entry for Teachers
"use client";

import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { isWithinEditWindow } from '@/lib/firebase/dataLocking';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { recordResult } from '@/lib/firebase/db';
import type { Student } from '@/types/database';

interface ManualGradeEntryProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  studentList: Student[];
  term: string;
  session: string;
  maxScore: number;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ManualGradeEntry({
  teacherId,
  teacherName,
  classId,
  className,
  subjectId,
  subjectName,
  assessmentType,
  studentList,
  term,
  session,
  maxScore,
  onComplete,
  onCancel
}: ManualGradeEntryProps) {
  const [grades, setGrades] = useState<{ [studentId: string]: string }>({});
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [ineligibleStudents, setIneligibleStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    filterStudentsBySubject();
  }, [studentList, subjectId]);

  function filterStudentsBySubject() {
    const eligible: Student[] = [];
    const ineligible: Student[] = [];

    studentList.forEach(student => {
      const studentSubjects = student.subjects || [];
      
      if (studentSubjects.includes(subjectId)) {
        eligible.push(student);
      } else {
        ineligible.push(student);
      }
    });

    setEligibleStudents(eligible);
    setIneligibleStudents(ineligible);

    // Initialize grades for eligible students
    const initialGrades: { [key: string]: string } = {};
    eligible.forEach(student => {
      initialGrades[student.id] = '';
    });
    setGrades(initialGrades);

    console.log(`📊 Manual Grade Entry: ${eligible.length} eligible, ${ineligible.length} ineligible for ${subjectName}`);
  }

function getAssessmentDisplayName(type: string): string {
  const names: Record<string, string> = {
    classwork: 'Classwork',
    homework: 'Homework',
    ca1: 'CA 1',
    ca2: 'CA 2',
    exam: 'Exam'
  };
  return names[type] || type.toUpperCase();
}

function getAssessmentIcon(type: string): string {
  const icons: Record<string, string> = {
    classwork: '📝',
    homework: '📚',
    ca1: '📊',
    ca2: '📄',
    exam: '📖'
  };
  return icons[type] || '📋';
}

  function handleGradeChange(studentId: string, value: string) {
    setGrades(prev => ({
      ...prev,
      [studentId]: value
    }));
  }

  function calculateStats() {
    const validScores = eligibleStudents
      .map(s => parseInt(grades[s.id]))
      .filter(score => !isNaN(score) && score >= 0 && score <= maxScore);

    if (validScores.length === 0) return { average: 0, above70: 0, below50: 0 };

    const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    const above70 = validScores.filter(score => score >= maxScore * 0.7).length;
    const below50 = validScores.filter(score => score < maxScore * 0.5).length;

    return { average, above70, below50 };
  }

  async function handleSubmit() {
    if (eligibleStudents.length === 0) {
      setError('No students enrolled in this subject');
      return;
    }

    // Check if at least one grade is entered
    const hasGrades = eligibleStudents.some(student => 
      grades[student.id]?.trim() !== ''
    );
    
    if (!hasGrades) {
      setError('Please enter at least one grade');
      return;
    }

    // Validate all entered grades
    const invalidGrades: string[] = [];
    eligibleStudents.forEach(student => {
      const scoreText = grades[student.id]?.trim();
      if (scoreText) {
        const score = parseInt(scoreText);
        if (isNaN(score) || score < 0 || score > maxScore) {
          invalidGrades.push(`${student.firstName} ${student.lastName}: "${scoreText}"`);
        }
      }
    });

    if (invalidGrades.length > 0) {
      setError(`Invalid scores detected:\n${invalidGrades.join('\n')}\n\nPlease enter numbers between 0 and ${maxScore}`);
      return;
    }

    const enteredCount = eligibleStudents.filter(s => grades[s.id]?.trim()).length;
    if (!confirm(`Save ${getAssessmentDisplayName(assessmentType)} scores?\n\n${enteredCount} student(s) will be graded.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check edit window
      const windowCheck = await isWithinEditWindow(term, session, assessmentType, classId);
      
      if (!windowCheck.allowed) {
        setError(windowCheck.reason || 'Cannot submit grades at this time');
        setLoading(false);
        return;
      }

      let savedCount = 0;
      const savedGrades: Array<{studentId: string, studentName: string, score: number}> = [];

      // Save grades for eligible students
      for (const student of eligibleStudents) {
        const scoreText = grades[student.id]?.trim();
        if (!scoreText) continue;

        const score = parseInt(scoreText);
        if (isNaN(score) || score < 0 || score > maxScore) continue;

        await recordResult({
          studentId: student.id,
          subjectId,
          classId,
          term,
          session,
          assessmentType,
          score: score,
          maxScore,
          teacherId,
          teacherName,  // ✅ ADD THIS LINE
          dateRecorded: Timestamp.now()
        });

        savedGrades.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          score: score
        });
        savedCount++;
      }

      // Create audit log
      const stats = calculateStats();
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'GRADE_ENTERED',
        details: `Entered ${getAssessmentDisplayName(assessmentType)} scores (Manual Entry) for ${className}, ${subjectName}: ${savedCount} students, average ${stats.average.toFixed(1)}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        afterData: savedGrades,
        success: true
      });

      setSuccess(`✅ Successfully saved ${savedCount} ${getAssessmentDisplayName(assessmentType)} scores!`);
      
      // Clear grades
      const resetGrades: { [key: string]: string } = {};
      eligibleStudents.forEach(student => {
        resetGrades[student.id] = '';
      });
      setGrades(resetGrades);

      // Auto-close after 3 seconds
      setTimeout(() => {
        onComplete();
      }, 3000);

    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.message || 'Failed to save grades');
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'GRADE_ENTERED',
        details: `Failed to enter grades (Manual Entry) for ${className}, ${subjectName}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        success: false,
        errorMessage: err.message
      });
    } finally {
      setLoading(false);
    }
  }

  const stats = calculateStats();
  const enteredCount = eligibleStudents.filter(s => grades[s.id]?.trim()).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{getAssessmentIcon(assessmentType)}</div>
          <h2 className="text-3xl font-bold text-gray-800">Manual Grade Entry</h2>
          <p className="text-gray-600 mt-2">
            {className} • {subjectName} • {getAssessmentDisplayName(assessmentType)}
          </p>
          <p className="text-sm text-gray-500">
            Max Score: {maxScore} • {eligibleStudents.length} Enrolled Students
          </p>
          
          {ineligibleStudents.length > 0 && (
            <div className="mt-2 inline-block">
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                ⚠️ {ineligibleStudents.length} students not enrolled in this subject
              </span>
            </div>
          )}
        </div>

        {/* Progress Stats */}
        {enteredCount > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Entered</p>
              <p className="text-xl font-bold text-blue-600">{enteredCount}/{eligibleStudents.length}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Average</p>
              <p className="text-xl font-bold text-purple-600">{stats.average.toFixed(1)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Above 70%</p>
              <p className="text-xl font-bold text-green-600">{stats.above70}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Below 50%</p>
              <p className="text-xl font-bold text-red-600">{stats.below50}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {eligibleStudents.length > 0 ? (
          <div className="space-y-4">
            {/* Students Grade Entry */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Enter Scores ({eligibleStudents.length} students enrolled)
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eligibleStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border-l-4 border-green-500">
                    <div className="w-8 text-center">
                      <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">
                          {student.firstName} {student.lastName}
                        </p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          ✓ Enrolled
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-600">
                          {student.gender === 'male' ? '👦' : '👧'} {student.className}
                        </p>
                        {student.academicTrack && (
                          <span className="text-xs text-purple-600">• {student.academicTrack} Track</span>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={maxScore}
                      value={grades[student.id] || ''}
                      onChange={(e) => handleGradeChange(student.id, e.target.value)}
                      placeholder={`0-${maxScore}`}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                ⚠️ <strong>7-day edit window</strong> - Grades cannot be edited after the deadline
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || enteredCount === 0}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  💾 Save {enteredCount > 0 ? `${enteredCount} ` : ''}Scores
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-xl font-bold text-red-600 mb-2">
              No Students Enrolled
            </p>
            <p className="text-gray-600">
              None of the students in {className} are enrolled in {subjectName}.
            </p>
          </div>
        )}

        {/* Ineligible Students Info */}
        {ineligibleStudents.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <details className="cursor-pointer">
              <summary className="font-medium text-gray-700 text-sm">
                View {ineligibleStudents.length} students not enrolled in {subjectName}
              </summary>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {ineligibleStudents.map((student) => (
                  <div key={student.id} className="text-xs text-gray-600 flex items-center gap-2">
                    <span>{student.gender === 'male' ? '👦' : '👧'}</span>
                    <span>{student.firstName} {student.lastName}</span>
                    {student.academicTrack && (
                      <span className="text-purple-600">• {student.academicTrack}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
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
            <p className="text-sm whitespace-pre-line">{error}</p>
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
        </div>
      </div>
    </div>
  );
}