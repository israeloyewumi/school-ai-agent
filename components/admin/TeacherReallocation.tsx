// components/admin/TeacherReallocation.tsx - Complete Teacher Re-Allocation UI
"use client";

import { useState, useEffect } from 'react';
import { Teacher, Class, Subject } from '@/types/database';
import {
  getAllTeacherAssignments,
  getAllClassAssignments,
  getTeacherAssignments,
  getClassAssignments,
  reassignClassTeacher,
  assignSubjectToTeacher,
  removeSubjectFromTeacher,
  removeTeacherFromClass,
  getAvailableClassTeachers,
  TeacherAssignmentOverview,
  ClassAssignmentOverview
} from '@/lib/firebase/teacherReallocation';
import { getAllTeachers, getActiveTeachers } from '@/lib/firebase/teacherManagement';
import { getAllClassesFromDB } from '@/lib/firebase/classManagement';
import { getAllSubjects } from '@/lib/firebase/subjectManagement';

interface TeacherReallocationProps {
  adminId: string;
  adminName: string;
}

type ViewMode = 'teachers' | 'classes' | 'subjects';

export default function TeacherReallocation({
  adminId,
  adminName
}: TeacherReallocationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('teachers');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentOverview[]>([]);
  const [classAssignments, setClassAssignments] = useState<ClassAssignmentOverview[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Modals
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showAssignSubjectModal, setShowAssignSubjectModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherAssignmentOverview | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassAssignmentOverview | null>(null);

  // Form states
  const [selectedNewTeacher, setSelectedNewTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClassesForSubject, setSelectedClassesForSubject] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [teachers, classes, subjects, teacherAssigns, classAssigns] = await Promise.all([
        getActiveTeachers(),
        getAllClassesFromDB(),
        getAllSubjects(),
        getAllTeacherAssignments(),
        getAllClassAssignments()
      ]);

      setAllTeachers(teachers);
      setAllClasses(classes);
      setAllSubjects(subjects);
      setTeacherAssignments(teacherAssigns);
      setClassAssignments(classAssigns);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // REASSIGN CLASS TEACHER
  // ============================================

  async function handleReassignClassTeacher(classId: string, oldTeacherId: string) {
    if (!selectedNewTeacher) {
      setError('Please select a new teacher');
      return;
    }

    if (selectedNewTeacher === oldTeacherId) {
      setError('New teacher is the same as current teacher');
      return;
    }

    if (!confirm('Are you sure you want to reassign this class teacher?')) {
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await reassignClassTeacher(
        classId,
        oldTeacherId,
        selectedNewTeacher,
        adminId,
        adminName
      );

      setSuccess('Class teacher reassigned successfully!');
      setShowReassignModal(false);
      setSelectedNewTeacher('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign class teacher');
      console.error('Reassign error:', err);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // ASSIGN SUBJECT TO TEACHER
  // ============================================

  async function handleAssignSubject() {
    if (!selectedSubject) {
      setError('Please select a subject');
      return;
    }

    if (selectedClassesForSubject.length === 0) {
      setError('Please select at least one class');
      return;
    }

    if (!selectedTeacher) {
      return;
    }

    if (!confirm(`Assign ${allSubjects.find(s => s.subjectId === selectedSubject)?.subjectName} to ${selectedTeacher.teacherName}?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await assignSubjectToTeacher(
        selectedTeacher.teacherId,
        selectedSubject,
        selectedClassesForSubject,
        adminId,
        adminName
      );

      setSuccess('Subject assigned successfully!');
      setShowAssignSubjectModal(false);
      setSelectedSubject('');
      setSelectedClassesForSubject([]);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign subject');
      console.error('Assign subject error:', err);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // REMOVE SUBJECT FROM TEACHER
  // ============================================

  async function handleRemoveSubject(teacherId: string, subjectId: string, subjectName: string) {
    if (!confirm(`Remove ${subjectName} from this teacher's teaching load?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await removeSubjectFromTeacher(teacherId, subjectId, adminId, adminName);

      setSuccess('Subject removed successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove subject');
      console.error('Remove subject error:', err);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================
  // REMOVE TEACHER FROM CLASS
  // ============================================

  async function handleRemoveFromClass(teacherId: string, classId: string, className: string) {
    if (!confirm(`Remove this teacher from ${className}?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await removeTeacherFromClass(teacherId, classId, adminId, adminName);

      setSuccess('Teacher removed from class successfully!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove teacher from class');
      console.error('Remove from class error:', err);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading teacher assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Teacher Re-Allocation</h2>
          <p className="text-gray-600 mt-1">Manage teacher assignments across classes and subjects</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
          {success}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setViewMode('teachers')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'teachers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              👨‍🏫 By Teacher ({teacherAssignments.length})
            </button>
            <button
              onClick={() => setViewMode('classes')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'classes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🏫 By Class ({classAssignments.length})
            </button>
            <button
              onClick={() => setViewMode('subjects')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'subjects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📚 By Subject ({allSubjects.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* TEACHER VIEW */}
          {viewMode === 'teachers' && (
            <div className="space-y-4">
              {teacherAssignments.map((teacher) => (
                <div
                  key={teacher.teacherId}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Teacher Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{teacher.teacherName}</h3>
                      <p className="text-sm text-gray-600">{teacher.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded capitalize">
                          {teacher.teacherType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setShowAssignSubjectModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                    >
                      ➕ Assign Subject
                    </button>
                  </div>

                  {/* Class Teacher Assignment */}
                  {teacher.assignedClass && (
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Class Teacher</p>
                          <p className="text-lg font-bold text-blue-600">{teacher.assignedClass.className}</p>
                          <p className="text-xs text-gray-500">{teacher.assignedClass.studentCount} students</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromClass(teacher.teacherId, teacher.assignedClass!.classId, teacher.assignedClass!.className)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Subject Assignments */}
                  {teacher.subjects.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Subjects ({teacher.totalSubjects})
                      </p>
                      <div className="space-y-2">
                        {teacher.subjects.map((subject) => (
                          <div key={subject.subjectId} className="bg-white rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{subject.subjectName}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {subject.classes.map((cls) => (
                                    <span
                                      key={cls.classId}
                                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                                    >
                                      {cls.className} ({cls.studentCount})
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveSubject(teacher.teacherId, subject.subjectId, subject.subjectName)}
                                className="ml-3 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!teacher.assignedClass && teacher.subjects.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No assignments yet</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CLASS VIEW */}
          {viewMode === 'classes' && (
            <div className="space-y-4">
              {classAssignments.map((cls) => (
                <div
                  key={cls.classId}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Class Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{cls.className}</h3>
                      <p className="text-sm text-gray-600">
                        Grade {cls.grade} • {cls.level} • {cls.studentCount} students
                      </p>
                    </div>
                  </div>

                  {/* Class Teacher */}
                  <div className="bg-white rounded-lg p-3 mb-3">
                    {cls.classTeacher ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">Class Teacher</p>
                          <p className="font-medium text-gray-800">{cls.classTeacher.teacherName}</p>
                          <p className="text-xs text-gray-500">
                            Since {new Date(cls.classTeacher.assignedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedClass(cls);
                            setShowReassignModal(true);
                          }}
                          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded transition-colors"
                        >
                          Reassign
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500 mb-2">No class teacher assigned</p>
                        <button
                          onClick={() => {
                            setSelectedClass(cls);
                            setShowReassignModal(true);
                          }}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                        >
                          Assign Teacher
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subject Teachers */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Subject Teachers ({cls.totalSubjectsCovered})
                    </p>
                    {cls.subjectTeachers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cls.subjectTeachers.map((st) => (
                          <div key={st.subjectId} className="bg-white rounded-lg p-2 text-sm">
                            <p className="font-medium text-gray-800">{st.subjectName}</p>
                            <p className="text-gray-600">{st.teacherName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No subject teachers assigned</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SUBJECT VIEW */}
          {viewMode === 'subjects' && (
            <div className="space-y-4">
              {allSubjects.map((subject) => {
                const teachersForSubject = teacherAssignments.filter(t =>
                  t.subjects.some(s => s.subjectId === subject.subjectId)
                );

                return (
                  <div
                    key={subject.subjectId}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{subject.subjectName}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                            {subject.category}
                          </span>
                          {subject.isCore && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              Core
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                        {teachersForSubject.length} Teacher{teachersForSubject.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {teachersForSubject.length > 0 ? (
                      <div className="space-y-2">
                        {teachersForSubject.map((teacher) => {
                          const subjectData = teacher.subjects.find(s => s.subjectId === subject.subjectId);
                          return (
                            <div key={teacher.teacherId} className="bg-white rounded-lg p-3">
                              <p className="font-medium text-gray-800">{teacher.teacherName}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {subjectData?.classes.map((cls) => (
                                  <span
                                    key={cls.classId}
                                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                                  >
                                    {cls.className}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No teachers assigned to this subject</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* REASSIGN CLASS TEACHER MODAL */}
      {showReassignModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {selectedClass.classTeacher ? 'Reassign' : 'Assign'} Class Teacher
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Class</p>
              <p className="text-lg font-bold text-gray-800">{selectedClass.className}</p>
            </div>

            {selectedClass.classTeacher && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Current Teacher</p>
                <p className="font-medium text-gray-800">{selectedClass.classTeacher.teacherName}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedClass.classTeacher ? 'New' : 'Select'} Teacher
              </label>
              <select
                value={selectedNewTeacher}
                onChange={(e) => setSelectedNewTeacher(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select Teacher --</option>
                {allTeachers
                  .filter(t => !t.assignedClass || t.assignedClass.classId === selectedClass.classId)
                  .map((teacher) => (
                    <option key={teacher.teacherId} value={teacher.teacherId}>
                      {teacher.firstName} {teacher.lastName}
                      {teacher.assignedClass && teacher.assignedClass.classId !== selectedClass.classId
                        ? ` (Already class teacher for ${teacher.assignedClass.className})`
                        : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setSelectedClass(null);
                  setSelectedNewTeacher('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedClass.classTeacher) {
                    handleReassignClassTeacher(selectedClass.classId, selectedClass.classTeacher.teacherId);
                  }
                }}
                disabled={processing || !selectedNewTeacher}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN SUBJECT TO TEACHER MODAL */}
{showAssignSubjectModal && selectedTeacher && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">
        Assign Subject to Teacher
      </h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600">Teacher</p>
        <p className="text-lg font-bold text-gray-800">{selectedTeacher.teacherName}</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Subject
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select Subject --</option>
          {allSubjects.map((subject) => (
            <option key={subject.subjectId} value={subject.subjectId}>
              {subject.subjectName} ({subject.category})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Classes (can select multiple)
        </label>
        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
          {allClasses
            .filter(cls => cls && cls.classId) // ✅ Filter out invalid classes
            .map((cls, index) => (
              <label 
                key={`${cls.classId}-${index}`} // ✅ Use compound key to ensure uniqueness
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedClassesForSubject.includes(cls.classId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClassesForSubject([...selectedClassesForSubject, cls.classId]);
                    } else {
                      setSelectedClassesForSubject(selectedClassesForSubject.filter(id => id !== cls.classId));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{cls.className} ({cls.currentStudentCount} students)</span>
              </label>
            ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowAssignSubjectModal(false);
            setSelectedTeacher(null);
            setSelectedSubject('');
            setSelectedClassesForSubject([]);
          }}
          disabled={processing}
          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAssignSubject}
          disabled={processing || !selectedSubject || selectedClassesForSubject.length === 0}
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
        >
          {processing ? 'Processing...' : 'Assign'}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}