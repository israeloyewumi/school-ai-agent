// components/teacher/WeeklyHistoryReport.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
}

interface AttendanceRecord {
  id: string;
  date: Date;
  status: string;
  subjectName: string;
  teacherName: string;
  remarks?: string;
}

interface MeritRecord {
  id: string;
  date: Date;
  points: number;
  reason: string;
  category: string;
  subjectName?: string;
  teacherName: string;
}

interface GradeRecord {
  id: string;
  date: Date;
  subjectName: string;
  assessmentType: string;
  score: number;
  maxScore: number;
  percentage: number;
  teacherName: string;
  remarks?: string;
}

interface WeeklyHistoryData {
  studentId: string;
  studentName: string;
  weekStart: Date;
  weekEnd: Date;
  attendance: AttendanceRecord[];
  merits: MeritRecord[];
  grades: GradeRecord[];
  summary: {
    attendancePercentage: number;
    totalMerits: number;
    totalAttendanceRecords: number;
    totalMeritRecords: number;
    totalGradeRecords: number;
    gradesByType: {
      classwork: number;
      homework: number;
      ca1: number;
      ca2: number;
      exam: number;
    };
  };
}

interface WeeklyHistoryReportProps {
  teacherId: string;
  onClose?: () => void;
}

export default function WeeklyHistoryReport({ teacherId, onClose }: WeeklyHistoryReportProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [historyData, setHistoryData] = useState<WeeklyHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Fetch students for the teacher
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        
        // Get teacher document to find all their classes
        const teacherQuery = query(
          collection(db, 'teachers'),
          where('__name__', '==', teacherId)
        );
        const teacherSnapshot = await getDocs(teacherQuery);
        
        const classIds = new Set<string>();
        
        if (!teacherSnapshot.empty) {
          const teacherData = teacherSnapshot.docs[0].data();
          
          // Add assigned class (if class teacher)
          if (teacherData.assignedClass?.classId) {
            classIds.add(teacherData.assignedClass.classId);
          }
          
          // Add classes from subjects array
          if (Array.isArray(teacherData.subjects)) {
            teacherData.subjects.forEach((subject: any) => {
              if (subject.classes && Array.isArray(subject.classes)) {
                subject.classes.forEach((classId: string) => classIds.add(classId));
              }
            });
          }
          
          // Add classes from legacy classes array
          if (Array.isArray(teacherData.classes)) {
            teacherData.classes.forEach((classId: string) => classIds.add(classId));
          }
        }

        console.log('Class IDs found:', Array.from(classIds));

        // Fetch students from ALL these classes
        const studentsList: Student[] = [];
        for (const classId of classIds) {
          const studentsQuery = query(
            collection(db, 'students'),
            where('classId', '==', classId)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          
          console.log(`Students in ${classId}:`, studentsSnapshot.docs.length);
          
          studentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Avoid duplicates
            if (!studentsList.find(s => s.id === doc.id)) {
              studentsList.push({
                id: doc.id,
                firstName: data.firstName,
                lastName: data.lastName,
                className: data.className || 'N/A'
              });
            }
          });
        }

        // Sort by name
        studentsList.sort((a, b) => 
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );

        console.log('Total students loaded:', studentsList.length);
        setStudents(studentsList);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoadingStudents(false);
      }
    };

    if (teacherId) {
      fetchStudents();
    }
  }, [teacherId]);

  const handleGenerateReport = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weekly-history?studentId=${selectedStudent}&weekDate=${selectedDate}&teacherId=${teacherId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch report');
      }

      const result = await response.json();
      
      // Convert date strings back to Date objects
      const data = result.data;
      data.weekStart = new Date(data.weekStart);
      data.weekEnd = new Date(data.weekEnd);
      data.attendance = data.attendance.map((a: any) => ({
        ...a,
        date: new Date(a.date)
      }));
      data.merits = data.merits.map((m: any) => ({
        ...m,
        date: new Date(m.date)
      }));
      data.grades = data.grades.map((g: any) => ({
        ...g,
        date: new Date(g.date)
      }));

      setHistoryData(data);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!historyData) return;

    try {
      setLoading(true);
      // Import PDF generator
      const { generateWeeklyHistoryReportPDF } = await import('@/lib/services/pdfGenerator');
      
      // Generate PDF
      const pdfBlob = await generateWeeklyHistoryReportPDF(historyData);
      
      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Weekly_History_${historyData.studentName}_${historyData.weekStart.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'absent': return 'text-red-600 bg-red-50';
      case 'late': return 'text-yellow-600 bg-yellow-50';
      case 'excused': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'classwork': return 'Classwork';
      case 'homework': return 'Homework';
      case 'ca1': return 'CA1';
      case 'ca2': return 'CA2';
      case 'exam': return 'Exam';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Weekly History Report
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Selection Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingStudents}
            >
              <option value="">
                {loadingStudents ? 'Loading students...' : 'Choose a student'}
              </option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} ({student.className})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Week (Any date in the week)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading || !selectedStudent}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Report Display */}
        {historyData && (
          <div className="mt-8 space-y-6">
            {/* Header with Download Button */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {historyData.studentName}
                </h3>
                <p className="text-gray-600">
                  Week: {formatDate(historyData.weekStart)} - {formatDate(historyData.weekEnd)}
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Attendance</h4>
                <p className="text-3xl font-bold text-green-700">
                  {historyData.summary.attendancePercentage}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {historyData.summary.totalAttendanceRecords} records
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Merit Points</h4>
                <p className="text-3xl font-bold text-purple-700">
                  {historyData.summary.totalMerits}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {historyData.summary.totalMeritRecords} awards
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600 mb-1">Grades Recorded</h4>
                <p className="text-3xl font-bold text-blue-700">
                  {historyData.summary.totalGradeRecords}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  CW: {historyData.summary.gradesByType.classwork}, 
                  HW: {historyData.summary.gradesByType.homework}, 
                  CA: {historyData.summary.gradesByType.ca1 + historyData.summary.gradesByType.ca2}, 
                  Exam: {historyData.summary.gradesByType.exam}
                </p>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Attendance Records ({historyData.attendance.length})
              </h4>
              {historyData.attendance.length === 0 ? (
                <p className="text-gray-500 italic">No attendance records for this week</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.attendance.map(record => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.subjectName}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.status)}`}>
                              {record.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.teacherName}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 italic">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Merit Records */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Merit Awards ({historyData.merits.length})
              </h4>
              {historyData.merits.length === 0 ? (
                <p className="text-gray-500 italic">No merit awards for this week</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.merits.map(record => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-sm font-semibold rounded ${
                              record.points > 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                            }`}>
                              {record.points > 0 ? '+' : ''}{record.points}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.category}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.reason}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {record.subjectName || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.teacherName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grade Records */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">
                Grade Records ({historyData.grades.length})
              </h4>
              {historyData.grades.length === 0 ? (
                <p className="text-gray-500 italic">No grades recorded for this week</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.grades.map(record => (
                        <tr key={record.id}>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.subjectName}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {getAssessmentTypeLabel(record.assessmentType)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {record.score}/{record.maxScore}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-sm font-semibold rounded ${
                              record.percentage >= 70 ? 'text-green-700 bg-green-100' :
                              record.percentage >= 50 ? 'text-yellow-700 bg-yellow-100' :
                              'text-red-700 bg-red-100'
                            }`}>
                              {record.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{record.teacherName}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 italic">
                            {record.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}