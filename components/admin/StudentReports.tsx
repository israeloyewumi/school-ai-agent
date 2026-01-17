// components/admin/StudentReports.tsx - UPDATED: Added Weekly Report Support

"use client";

import { useState, useEffect } from 'react';
import { 
  getAllClasses, 
  getStudentsByClass,
  getAllStudents
} from '@/lib/firebase/db';
import {
  generateWeeklyReportCard,
  generateCAReportCard,
  generateEndOfTermReportCard,
  generateBulkCAReports,
  generateBulkTermReports,
  generateBulkWeeklyReports,
  getCAReportCard,
  getTermReportCard,
  getWeeklyReportCard,
  getWeekDateRange
} from '@/lib/firebase/adminReports';
import { 
  generateCAReportCardPDF, 
  generateTermReportCardPDF,
  generateWeeklyReportCardPDF
} from '@/lib/services/pdfGenerator';
import { sendReportCardToParent } from '@/lib/services/whatsappService';
import { getSubjectById, getCoreSubjectsForGrade } from '@/lib/config/schoolData';
import ReportViewer from '@/components/admin/ReportViewer';
import WeeklyReportViewer from '@/components/admin/WeeklyReportViewer';
import type { Student } from '@/types/database';

interface StudentReportsProps {
  adminId: string;
  adminName: string;
}

type ReportType = 'weekly' | 'ca1' | 'ca2' | 'term';
type ViewMode = 'single' | 'bulk';

export default function StudentReports({ adminId, adminName }: StudentReportsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [reportType, setReportType] = useState<ReportType>('weekly');
  
  // Term/Session
  const [term, setTerm] = useState('First Term');
  const [session, setSession] = useState('2025/2026');
  
  // Week selection for weekly reports
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
  const [selectedWeekEnd, setSelectedWeekEnd] = useState<Date>(new Date());
  
  // Single student mode
  const [studentSearchName, setStudentSearchName] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Bulk mode
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  // Status
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Report viewing
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [viewingReportType, setViewingReportType] = useState<'ca' | 'term' | 'weekly' | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  
  // Bulk results
  const [bulkResults, setBulkResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    loadClasses();
    // Initialize week dates
    const { start, end } = getWeekDateRange(new Date());
    setSelectedWeekStart(start);
    setSelectedWeekEnd(end);
  }, []);

  async function loadClasses() {
    try {
      const allClasses = await getAllClasses();
      setClasses(allClasses);
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  }

  async function handleStudentSearch() {
    if (!studentSearchName.trim() || studentSearchName.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedStudent(null);

    try {
      const allStudents = await getAllStudents();
      const searchLower = studentSearchName.toLowerCase();
      const results = allStudents.filter(student => {
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
        return fullName.includes(searchLower);
      });

      if (results.length === 0) {
        setError(`No students found matching "${studentSearchName}"`);
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Failed to search students');
    } finally {
      setSearching(false);
    }
  }

  function handleStudentSelect(student: Student) {
    setSelectedStudent(student);
    setSearchResults([]);
    setStudentSearchName(`${student.firstName} ${student.lastName}`);
  }

  function getStudentCurriculumInfo(student: Student) {
    const subjects = student.subjects || [];
    const grade = parseInt(student.className.match(/\d+/)?.[0] || '0');
    
    const subjectDetails = subjects.map(subjectId => {
      const subject = getSubjectById(subjectId);
      return {
        id: subjectId,
        name: subject?.subjectName || subjectId,
        category: subject?.category || 'Unknown',
        isCore: subject?.isCore || false
      };
    });

    const coreSubjects = subjectDetails.filter(s => s.isCore);
    const electiveSubjects = subjectDetails.filter(s => !s.isCore);

    let tradeSubjectName = null;
    if (student.tradeSubject) {
      const tradeSubject = getSubjectById(student.tradeSubject);
      tradeSubjectName = tradeSubject?.subjectName || student.tradeSubject;
    }

    return {
      totalSubjects: subjects.length,
      coreSubjects,
      electiveSubjects,
      academicTrack: student.academicTrack,
      tradeSubject: tradeSubjectName,
      grade
    };
  }

  async function handleGenerateSingle() {
    if (!selectedStudent) {
      setError('Please select a student first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const curriculumInfo = getStudentCurriculumInfo(selectedStudent);
      console.log('📚 Generating report for student:', {
        name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        grade: curriculumInfo.grade,
        track: curriculumInfo.academicTrack,
        subjects: curriculumInfo.totalSubjects,
        reportType
      });

      if (reportType === 'weekly') {
        // Generate weekly report
        const report = await generateWeeklyReportCard(
          selectedStudent.id,
          selectedWeekStart,
          selectedWeekEnd,
          term,
          session,
          adminId
        );
        
        const enhancedReport = {
          ...report,
          academicTrack: selectedStudent.academicTrack,
          tradeSubject: curriculumInfo.tradeSubject,
          totalSubjects: curriculumInfo.totalSubjects
        };
        
        setViewingReport(enhancedReport);
        setViewingReportType('weekly');
        setSuccess(
          `✅ Weekly Report generated for Week ${report.weekNumber}!` +
          (selectedStudent.academicTrack ? ` (${selectedStudent.academicTrack} Track)` : '')
        );
      } else if (reportType === 'ca1' || reportType === 'ca2') {
        const report = await generateCAReportCard(
          selectedStudent.id,
          term,
          session,
          reportType,
          adminId
        );
        
        const enhancedReport = {
          ...report,
          academicTrack: selectedStudent.academicTrack,
          tradeSubject: curriculumInfo.tradeSubject,
          totalSubjects: curriculumInfo.totalSubjects,
          coreSubjectsCount: curriculumInfo.coreSubjects.length,
          electiveSubjectsCount: curriculumInfo.electiveSubjects.length
        };
        
        setViewingReport(enhancedReport);
        setViewingReportType('ca');
        setSuccess(
          `✅ ${reportType.toUpperCase()} Report Card generated!` +
          (selectedStudent.academicTrack ? ` (${selectedStudent.academicTrack} Track)` : '')
        );
      } else if (reportType === 'term') {
        const nextTerm = new Date();
        nextTerm.setMonth(nextTerm.getMonth() + 3);
        
        const report = await generateEndOfTermReportCard(
          selectedStudent.id,
          term,
          session,
          adminId,
          undefined,
          undefined,
          nextTerm
        );
        
        const enhancedReport = {
          ...report,
          academicTrack: selectedStudent.academicTrack,
          tradeSubject: curriculumInfo.tradeSubject,
          totalSubjects: curriculumInfo.totalSubjects,
          coreSubjectsCount: curriculumInfo.coreSubjects.length,
          electiveSubjectsCount: curriculumInfo.electiveSubjects.length
        };
        
        setViewingReport(enhancedReport);
        setViewingReportType('term');
        setSuccess(
          `✅ End of Term Report Card generated!` +
          (selectedStudent.academicTrack ? ` (${selectedStudent.academicTrack} Track)` : '')
        );
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!viewingReport) return;

    try {
      setLoading(true);
      let pdfBlob: Blob;

      if (viewingReportType === 'weekly') {
        pdfBlob = await generateWeeklyReportCardPDF(viewingReport);
      } else if (viewingReportType === 'ca') {
        pdfBlob = await generateCAReportCardPDF(viewingReport);
      } else {
        pdfBlob = await generateTermReportCardPDF(viewingReport);
      }

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const reportName = viewingReportType === 'weekly' 
        ? `week_${viewingReport.weekNumber}`
        : viewingReportType === 'ca' 
          ? viewingReport.assessmentType
          : 'term';
      
      link.download = `${viewingReport.studentName}_${viewingReport.term}_${reportName}_report.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('✅ PDF downloaded successfully!');
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendWhatsApp() {
    if (!viewingReport || !selectedStudent) return;

    if (!selectedStudent.guardianId && !selectedStudent.parentId) {
      setError('No parent/guardian linked to this student');
      return;
    }

    setSendingWhatsApp(true);
    setError('');
    setSuccess('');

    try {
      let pdfBlob: Blob;
      let reportName: string;
      
      if (viewingReportType === 'weekly') {
        pdfBlob = await generateWeeklyReportCardPDF(viewingReport);
        reportName = `Week ${viewingReport.weekNumber} Progress Report`;
      } else if (viewingReportType === 'ca') {
        pdfBlob = await generateCAReportCardPDF(viewingReport);
        reportName = `${viewingReport.assessmentType.toUpperCase()} Report Card`;
      } else {
        pdfBlob = await generateTermReportCardPDF(viewingReport);
        reportName = 'End of Term Report Card';
      }

      console.log('📄 Generated PDF blob, size:', pdfBlob.size, 'bytes');

      const parentId = selectedStudent.guardianId || selectedStudent.parentId;

      const result = await sendReportCardToParent(
        parentId,
        viewingReport.studentName,
        reportName,
        pdfBlob
      );

      if (result.success) {
        setSuccess('✅ WhatsApp notification sent to parent! The PDF is ready for download.');
        
        // Auto-download the PDF for the admin
        setTimeout(() => {
          const url = result.downloadUrl;
          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `${viewingReport.studentName}_${reportName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            console.log('📥 PDF auto-downloaded for admin');
          }
        }, 1000);
        
      } else {
        setError(`WhatsApp Error: ${result.error}`);
      }
    } catch (err: any) {
      console.error('❌ Error sending WhatsApp:', err);
      setError(err.message || 'Failed to send WhatsApp message');
    } finally {
      setSendingWhatsApp(false);
    }
  }

  async function handleGenerateBulk() {
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    if (!confirm(`Generate ${reportType.toUpperCase()} reports for entire class?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBulkResults(null);

    try {
      let results;

      if (reportType === 'weekly') {
        // Bulk weekly reports
        results = await generateBulkWeeklyReports(
          selectedClass,
          selectedWeekStart,
          selectedWeekEnd,
          term,
          session,
          adminId
        );
      } else if (reportType === 'ca1' || reportType === 'ca2') {
        results = await generateBulkCAReports(
          selectedClass,
          term,
          session,
          reportType,
          adminId
        );
      } else if (reportType === 'term') {
        const nextTerm = new Date();
        nextTerm.setMonth(nextTerm.getMonth() + 3);
        
        results = await generateBulkTermReports(
          selectedClass,
          term,
          session,
          adminId,
          nextTerm
        );
      } else {
        setError('Invalid report type');
        setLoading(false);
        return;
      }

      setBulkResults(results);
      
      if (results.success > 0) {
        setSuccess(`✅ Generated ${results.success} report(s) successfully!`);
      }
      
      if (results.failed > 0) {
        setError(`⚠️ ${results.failed} report(s) failed`);
      }
    } catch (err: any) {
      console.error('Error generating bulk reports:', err);
      setError(err.message || 'Failed to generate reports');
    } finally {
      setLoading(false);
    }
  }

  // Handle week selection
  function handleWeekChange(direction: 'prev' | 'next' | 'current') {
    if (direction === 'current') {
      const { start, end } = getWeekDateRange(new Date());
      setSelectedWeekStart(start);
      setSelectedWeekEnd(end);
    } else if (direction === 'prev') {
      const newStart = new Date(selectedWeekStart);
      newStart.setDate(newStart.getDate() - 7);
      const { start, end } = getWeekDateRange(newStart);
      setSelectedWeekStart(start);
      setSelectedWeekEnd(end);
    } else {
      const newStart = new Date(selectedWeekStart);
      newStart.setDate(newStart.getDate() + 7);
      const { start, end } = getWeekDateRange(newStart);
      setSelectedWeekStart(start);
      setSelectedWeekEnd(end);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Reports</h2>
        <p className="text-gray-600">
          Generate Weekly, CA and Term reports • Download PDF • Send via WhatsApp
        </p>
      </div>

      {/* Mode Selection */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Generation Mode
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setViewMode('single')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 Single Student
          </button>
          <button
            onClick={() => setViewMode('bulk')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'bulk'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 Bulk (Entire Class)
          </button>
        </div>
      </div>

      {/* Report Type */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setReportType('weekly')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              reportType === 'weekly'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 Weekly
          </button>
          <button
            onClick={() => setReportType('ca1')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              reportType === 'ca1'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 CA1
          </button>
          <button
            onClick={() => setReportType('ca2')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              reportType === 'ca2'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📄 CA2
          </button>
          <button
            onClick={() => setReportType('term')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              reportType === 'term'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📚 Term
          </button>
        </div>
      </div>

      {/* Week Selector (only for weekly reports) */}
      {reportType === 'weekly' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📅 Select Week
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleWeekChange('prev')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Previous Week
            </button>
            <div className="flex-1 text-center">
              <p className="font-semibold text-gray-800">
                {selectedWeekStart.toLocaleDateString()} - {selectedWeekEnd.toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Week {Math.ceil((selectedWeekStart.getDate()) / 7)} of {term}
              </p>
            </div>
            <button
              onClick={() => handleWeekChange('current')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Current Week
            </button>
            <button
              onClick={() => handleWeekChange('next')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Next Week →
            </button>
          </div>
        </div>
      )}

      {/* Term/Session */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Term
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session
          </label>
          <input
            type="text"
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="2025/2026"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Single Student Mode */}
      {viewMode === 'single' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Search Student</h3>
          
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={studentSearchName}
              onChange={(e) => setStudentSearchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStudentSearch()}
              placeholder="Enter student name (first or last)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleStudentSearch}
              disabled={searching}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
            >
              {searching ? 'Searching...' : '🔍 Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Found {searchResults.length} student(s)
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-800">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {student.className} • {student.admissionNumber}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Student */}
          {selectedStudent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-green-900">
                    ✅ Selected: {selectedStudent.firstName} {selectedStudent.lastName}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {selectedStudent.className} • {selectedStudent.admissionNumber}
                  </p>
                  {selectedStudent.academicTrack && (
                    <p className="text-sm text-purple-700 mt-1">
                      📚 {selectedStudent.academicTrack} Track
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearchName('');
                  }}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Mode */}
      {viewMode === 'bulk' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Select Class</h3>
          
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select a class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className}
              </option>
            ))}
          </select>

          {selectedClass && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ℹ️ This will generate {reportType.toUpperCase()} reports for all students in the selected class.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex gap-3">
        {viewMode === 'single' && (
          <button
            onClick={handleGenerateSingle}
            disabled={loading || !selectedStudent}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all disabled:from-gray-400 disabled:to-gray-500"
          >
            {loading ? 'Generating...' : '📊 Generate Report'}
          </button>
        )}
        
        {viewMode === 'bulk' && (
          <button
            onClick={handleGenerateBulk}
            disabled={loading || !selectedClass}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:from-gray-400 disabled:to-gray-500"
          >
            {loading ? 'Generating...' : '📚 Generate Bulk Reports'}
          </button>
        )}
      </div>

      {/* Bulk Results */}
      {bulkResults && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Bulk Generation Results</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Successful</p>
              <p className="text-2xl font-bold text-green-900">{bulkResults.success}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-900">{bulkResults.failed}</p>
            </div>
          </div>

          {bulkResults.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-900 mb-2">Errors:</p>
              <ul className="text-sm text-red-700 space-y-1 max-h-48 overflow-y-auto">
                {bulkResults.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
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

      {/* Report Viewer Modal - Weekly */}
      {viewingReport && viewingReportType === 'weekly' && (
        <WeeklyReportViewer
          report={viewingReport}
          onClose={() => {
            setViewingReport(null);
            setViewingReportType(null);
          }}
          onDownload={handleDownloadPDF}
          onSendWhatsApp={handleSendWhatsApp}
          sending={sendingWhatsApp}
        />
      )}
      
      {/* Report Viewer Modal - CA and Term */}
      {viewingReport && (viewingReportType === 'ca' || viewingReportType === 'term') && (
        <ReportViewer
          report={viewingReport}
          reportType={viewingReportType}
          onClose={() => {
            setViewingReport(null);
            setViewingReportType(null);
          }}
          onDownload={handleDownloadPDF}
          onSendWhatsApp={handleSendWhatsApp}
          sending={sendingWhatsApp}
        />
      )}

      {/* Important Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">✅ Features</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>NEW:</strong> Weekly Progress Reports with attendance, classwork & behavior</li>
          <li>Generate CA and Term report cards for individual students or entire classes</li>
          <li>View reports on screen before downloading</li>
          <li>Download reports as PDF</li>
          <li>Send reports to parents via WhatsApp</li>
          <li>Automatic grade calculation and positioning</li>
          <li>Reports include academic track and curriculum information for SS students</li>
        </ul>
      </div>
    </div>
  );
}