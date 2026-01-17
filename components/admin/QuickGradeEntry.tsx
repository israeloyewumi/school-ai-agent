// components/admin/QuickGradeEntry.tsx - Enhanced with Student Subject Enrollment Filtering

"use client";

import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAllClassesFromDB } from '@/lib/firebase/classManagement';
import { getStudentsByClass } from '@/lib/firebase/db';
import { getAllSubjects } from '@/lib/firebase/subjectManagement';
import { ALL_SUBJECTS, getSubjectById } from '@/lib/config/schoolData';
import type { Class, Subject, Student } from '@/types/database';

interface QuickGradeEntryProps {
  adminId: string;
  adminName: string;
}

export default function QuickGradeEntry({ adminId, adminName }: QuickGradeEntryProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [term, setTerm] = useState('First Term');
  const [session, setSession] = useState('2024/2025');
  const [assessmentType, setAssessmentType] = useState<'ca1' | 'ca2' | 'exam'>('ca1');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [grades, setGrades] = useState<{ [studentId: string]: string }>({});
  
  // NEW: Track which students are enrolled in selected subject
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [ineligibleStudents, setIneligibleStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  // NEW: Filter students when subject changes
  useEffect(() => {
    if (selectedSubject && students.length > 0) {
      filterStudentsBySubject();
    }
  }, [selectedSubject, students]);

  async function loadInitialData() {
    setLoadingData(true);
    try {
      const [allClasses, allSubjects] = await Promise.all([
        getAllClassesFromDB(),
        getAllSubjects()
      ]);
      
      setClasses(allClasses);
      setSubjects(allSubjects);
      
      if (allSubjects.length > 0) {
        setSelectedSubject(allSubjects[0].id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load classes and subjects');
    } finally {
      setLoadingData(false);
    }
  }

  async function loadStudents() {
    try {
      setLoading(true);
      const classStudents = await getStudentsByClass(selectedClass);
      setStudents(classStudents);
      
      // Initialize grades
      const initialGrades: { [key: string]: string } = {};
      classStudents.forEach(student => {
        initialGrades[student.id] = '';
      });
      setGrades(initialGrades);
      
      if (classStudents.length === 0) {
        setError('No students found in this class');
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  // NEW: Filter students based on subject enrollment
  function filterStudentsBySubject() {
    if (!selectedSubject) {
      setEligibleStudents(students);
      setIneligibleStudents([]);
      return;
    }

    const eligible: Student[] = [];
    const ineligible: Student[] = [];

    students.forEach(student => {
      // Check if student has subjects array and is enrolled in selected subject
      const studentSubjects = student.subjects || [];
      
      if (studentSubjects.includes(selectedSubject)) {
        eligible.push(student);
      } else {
        ineligible.push(student);
      }
    });

    setEligibleStudents(eligible);
    setIneligibleStudents(ineligible);

    console.log(`📊 Subject Filter: ${eligible.length} eligible, ${ineligible.length} ineligible for ${selectedSubject}`);
  }

  function handleGradeChange(studentId: string, value: string) {
    setGrades(prev => ({
      ...prev,
      [studentId]: value
    }));
  }

  async function handleSubmit() {
    if (!selectedClass || !selectedSubject) {
      setError('Please select class and subject');
      return;
    }

    // Check if at least one grade is entered for eligible students
    const hasGrades = eligibleStudents.some(student => 
      grades[student.id]?.trim() !== ''
    );
    
    if (!hasGrades) {
      setError('Please enter at least one grade for enrolled students');
      return;
    }

    const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
    const selectedClassObj = classes.find(c => c.id === selectedClass);

    if (!confirm(`Save ${assessmentType.toUpperCase()} scores for ${selectedSubjectObj?.subjectName} in ${selectedClassObj?.className}?\n\n${eligibleStudents.length} enrolled student(s) will be graded.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let savedCount = 0;
      const maxScore = assessmentType === 'exam' ? 60 : 20;

      // Only save grades for eligible students
      for (const student of eligibleStudents) {
        const scoreText = grades[student.id]?.trim();
        if (!scoreText) continue;

        const score = parseInt(scoreText);
        if (isNaN(score) || score < 0 || score > maxScore) {
          console.warn(`Invalid score for ${student.firstName}: ${scoreText}`);
          continue;
        }

        // Create result document
        const resultData: any = {
          studentId: student.id,
          subjectId: selectedSubject,
          subjectName: selectedSubjectObj?.subjectName || selectedSubject,
          classId: selectedClass,
          className: selectedClassObj?.className || '',
          term,
          session,
          teacherId: adminId, // Admin is entering on behalf
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Set scores based on assessment type
        if (assessmentType === 'ca1') {
          resultData.ca1 = score;
          resultData.ca2 = 0;
          resultData.exam = 0;
        } else if (assessmentType === 'ca2') {
          resultData.ca1 = 0;
          resultData.ca2 = score;
          resultData.exam = 0;
        } else {
          resultData.ca1 = 0;
          resultData.ca2 = 0;
          resultData.exam = score;
        }

        resultData.total = resultData.ca1 + resultData.ca2 + resultData.exam;
        
        // Calculate grade
        const percentage = (resultData.total / 100) * 100;
        if (percentage >= 70) resultData.grade = 'A';
        else if (percentage >= 60) resultData.grade = 'B';
        else if (percentage >= 50) resultData.grade = 'C';
        else if (percentage >= 45) resultData.grade = 'D';
        else if (percentage >= 40) resultData.grade = 'E';
        else resultData.grade = 'F';

        resultData.remark = resultData.grade === 'A' ? 'Excellent' :
                           resultData.grade === 'B' ? 'Very Good' :
                           resultData.grade === 'C' ? 'Good' :
                           resultData.grade === 'D' ? 'Pass' :
                           resultData.grade === 'E' ? 'Weak Pass' : 'Fail';

        // Save to Firebase
        await addDoc(collection(db, 'results'), resultData);
        savedCount++;
      }

      setSuccess(`✅ Successfully saved ${savedCount} ${assessmentType.toUpperCase()} scores for ${selectedSubjectObj?.subjectName}!`);
      
      // Clear grades
      const resetGrades: { [key: string]: string } = {};
      eligibleStudents.forEach(student => {
        resetGrades[student.id] = '';
      });
      setGrades(resetGrades);

    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.message || 'Failed to save grades');
    } finally {
      setLoading(false);
    }
  }

  const maxScore = assessmentType === 'exam' ? 60 : 20;
  const selectedClassObj = classes.find(c => c.id === selectedClass);
  const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes and subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quick Grade Entry</h2>
        <p className="text-gray-600">
          Manually enter CA1, CA2, or Exam scores for students enrolled in specific subjects
        </p>
      </div>

      {/* Assessment Type */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assessment Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setAssessmentType('ca1')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              assessmentType === 'ca1'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 CA1 (Max: 20)
          </button>
          <button
            onClick={() => setAssessmentType('ca2')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              assessmentType === 'ca2'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📄 CA2 (Max: 20)
          </button>
          <button
            onClick={() => setAssessmentType('exam')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              assessmentType === 'exam'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Exam (Max: 60)
          </button>
        </div>
      </div>

      {/* Term & Session */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option>First Term</option>
            <option>Second Term</option>
            <option>Third Term</option>
          </select>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
          <input
            type="text"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="2024/2025"
          />
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Class ({classes.length} classes available)
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Class --</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.className} ({cls.level})
            </option>
          ))}
        </select>
        {selectedClassObj && (
          <p className="text-sm text-gray-600 mt-2">
            📊 {selectedClassObj.totalStudents} students in {selectedClassObj.className}
          </p>
        )}
      </div>

      {/* Subject Selection */}
      {selectedClass && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Subject ({subjects.length} subjects available)
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subjectName} ({subject.category})
              </option>
            ))}
          </select>
          
          {/* NEW: Enrollment Status Display */}
          {selectedSubjectObj && students.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                📚 {selectedSubjectObj.subjectName} Enrollment Status:
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-700">
                  ✓ {eligibleStudents.length} enrolled
                </span>
                {ineligibleStudents.length > 0 && (
                  <span className="text-orange-700">
                    ⚠️ {ineligibleStudents.length} not enrolled
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Students Grade Entry - ELIGIBLE STUDENTS ONLY */}
      {eligibleStudents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Enter Scores for Enrolled Students ({eligibleStudents.length} students) - Max: {maxScore}
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {eligibleStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border-l-4 border-green-500">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">
                      {student.firstName} {student.lastName}
                    </p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      ✓ Enrolled
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {student.gender === 'male' ? '👦' : '👧'} {student.className}
                    {student.academicTrack && (
                      <span className="ml-2 text-purple-600">• {student.academicTrack} Track</span>
                    )}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={grades[student.id] || ''}
                  onChange={(e) => handleGradeChange(student.id, e.target.value)}
                  placeholder={`0-${maxScore}`}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : `💾 Save All Scores (${eligibleStudents.length} students)`}
          </button>
        </div>
      )}

      {/* NOT ENROLLED STUDENTS WARNING */}
      {ineligibleStudents.length > 0 && selectedSubject && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>Students Not Enrolled in {selectedSubjectObj?.subjectName}</span>
          </h3>
          <p className="text-sm text-orange-800 mb-3">
            The following {ineligibleStudents.length} student(s) are not enrolled in this subject and cannot be graded:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ineligibleStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-3 bg-white p-2 rounded-lg">
                <span className="text-xl">{student.gender === 'male' ? '👦' : '👧'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {student.className}
                    {student.academicTrack && ` • ${student.academicTrack} Track`}
                  </p>
                  {student.subjects && student.subjects.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Enrolled in {student.subjects.length} other subjects
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NO ENROLLED STUDENTS MESSAGE */}
      {selectedSubject && students.length > 0 && eligibleStudents.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">❌</div>
          <h3 className="font-semibold text-red-900 mb-2">
            No Students Enrolled in {selectedSubjectObj?.subjectName}
          </h3>
          <p className="text-sm text-red-800">
            None of the {students.length} students in {selectedClassObj?.className} are enrolled in this subject.
          </p>
          <p className="text-xs text-red-700 mt-2">
            Please select a different subject or check student subject assignments.
          </p>
        </div>
      )}

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📌 How It Works</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Select assessment type (CA1, CA2, or Exam)</li>
          <li>Choose term and session</li>
          <li>Select a class from your {classes.length} classes</li>
          <li>Select a subject from {subjects.length} Nigerian subjects</li>
          <li><strong>✓ Only students enrolled in the selected subject will be shown</strong></li>
          <li>Enter scores for enrolled students (leave blank if absent)</li>
          <li>Click "Save All Scores"</li>
        </ol>
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>✅ Smart Subject Filtering Active</strong>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Grades can only be entered for students who are enrolled in the selected subject according to their Nigerian curriculum track.
          </p>
        </div>
      </div>
    </div>
  );
}