// ============================================
// FILE 3: components/admin/ReportViewer.tsx
// View Report Card on Screen
// ============================================

"use client";

import { useState } from 'react';
import type { CAReportCard, EndOfTermReportCard } from '@/lib/firebase/adminReports';

interface ReportViewerProps {
  report: CAReportCard | EndOfTermReportCard;
  reportType: 'ca' | 'term';
  onClose: () => void;
  onDownload: () => void;
  onSendWhatsApp: () => void;
  sending?: boolean;
}

export default function ReportViewer({
  report,
  reportType,
  onClose,
  onDownload,
  onSendWhatsApp,
  sending = false
}: ReportViewerProps) {
  const isTermReport = reportType === 'term';
  const termReport = isTermReport ? (report as EndOfTermReportCard) : null;
  const caReport = !isTermReport ? (report as CAReportCard) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {isTermReport ? 'End of Term Report Card' : 
                 caReport?.assessmentType === 'ca1' ? 'CA1 Report Card' : 'CA2 Report Card'}
              </h2>
              <p className="text-blue-100 mt-1">{report.studentName} - {report.className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Term</p>
                <p className="font-semibold">{report.term}</p>
              </div>
              <div>
                <p className="text-gray-600">Session</p>
                <p className="font-semibold">{report.session}</p>
              </div>
              <div>
                <p className="text-gray-600">Position</p>
                <p className="font-semibold">{report.position}/{report.totalStudents}</p>
              </div>
              <div>
                <p className="text-gray-600">Overall Grade</p>
                <p className="font-semibold text-lg">{isTermReport ? termReport?.overallGrade : caReport?.grade}</p>
              </div>
            </div>
          </div>

          {/* Scores Table */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Subject Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3">Subject</th>
                    {isTermReport && (
                      <>
                        <th className="text-center p-3">CA1</th>
                        <th className="text-center p-3">CA2</th>
                        <th className="text-center p-3">Exam</th>
                      </>
                    )}
                    {!isTermReport && <th className="text-center p-3">Score</th>}
                    <th className="text-center p-3">Total</th>
                    <th className="text-center p-3">Grade</th>
                    <th className="text-left p-3">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((subject, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3">{subject.subjectName}</td>
                      {isTermReport && termReport && (
                        <>
                          <td className="text-center p-3">{(subject as any).ca1}</td>
                          <td className="text-center p-3">{(subject as any).ca2}</td>
                          <td className="text-center p-3">{(subject as any).exam}</td>
                        </>
                      )}
                      {!isTermReport && caReport && (
                        <td className="text-center p-3">{(subject as any).score}/{(subject as any).maxScore}</td>
                      )}
                      <td className="text-center p-3 font-semibold">
                        {isTermReport ? (subject as any).total : (subject as any).score}
                      </td>
                      <td className="text-center p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          subject.grade === 'A' ? 'bg-green-100 text-green-800' :
                          subject.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          subject.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {subject.grade}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{subject.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">Total Score</p>
              <p className="text-2xl font-bold text-blue-900">{report.totalScore}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Average</p>
              <p className="text-2xl font-bold text-green-900">{report.averageScore.toFixed(1)}%</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-xs text-purple-600 mb-1">Attendance</p>
              <p className="text-2xl font-bold text-purple-900">{report.attendancePercentage.toFixed(1)}%</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-xs text-orange-600 mb-1">Merit Points</p>
              <p className="text-2xl font-bold text-orange-900">{report.totalMerits}</p>
            </div>
          </div>

          {/* Term Report Specific Info */}
          {isTermReport && termReport && (
            <>
              {/* Attendance Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Attendance Summary</h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Present</p>
                    <p className="font-semibold text-green-600">{termReport.presentDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Absent</p>
                    <p className="font-semibold text-red-600">{termReport.absentDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Late</p>
                    <p className="font-semibold text-yellow-600">{termReport.lateDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Days</p>
                    <p className="font-semibold">{termReport.totalSchoolDays}</p>
                  </div>
                </div>
              </div>

              {/* Merit Level */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Merit Level</h4>
                <p className="text-2xl font-bold text-orange-600">{termReport.meritLevel}</p>
                <p className="text-sm text-gray-600 mt-1">{termReport.totalMerits} total points</p>
              </div>

              {/* Promotion Status */}
              <div className={`rounded-lg p-4 mb-6 ${
                termReport.promoted 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-lg font-bold ${
                  termReport.promoted ? 'text-green-800' : 'text-red-800'
                }`}>
                  {termReport.promoted ? '✓ PROMOTED' : '✗ NOT PROMOTED'}
                </p>
                {termReport.nextTermBegins && (
                  <p className="text-sm text-gray-600 mt-1">
                    Next term begins: {new Date(termReport.nextTermBegins).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Comments */}
              {(termReport.teacherComment || termReport.principalComment) && (
                <div className="space-y-4">
                  {termReport.teacherComment && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="font-semibold text-blue-900 mb-2">Teacher's Comment</p>
                      <p className="text-sm text-gray-700">{termReport.teacherComment}</p>
                    </div>
                  )}
                  {termReport.principalComment && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="font-semibold text-purple-900 mb-2">Principal's Comment</p>
                      <p className="text-sm text-gray-700">{termReport.principalComment}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={onDownload}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              📄 Download PDF
            </button>
            <button
              onClick={onSendWhatsApp}
              disabled={sending}
              className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {sending ? 'Sending...' : '📱 Send WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}