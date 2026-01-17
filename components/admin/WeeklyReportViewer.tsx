// components/admin/WeeklyReportViewer.tsx - View Weekly Report on Screen

"use client";

import type { WeeklyReportCard } from '@/lib/firebase/adminReports';

interface WeeklyReportViewerProps {
  report: WeeklyReportCard;
  onClose: () => void;
  onDownload: () => void;
  onSendWhatsApp: () => void;
  sending?: boolean;
}

export default function WeeklyReportViewer({
  report,
  onClose,
  onDownload,
  onSendWhatsApp,
  sending = false
}: WeeklyReportViewerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                📅 Weekly Progress Report
              </h2>
              <p className="text-purple-100 mt-1">
                {report.studentName} - {report.className}
              </p>
              <p className="text-purple-200 text-sm mt-1">
                Week {report.weekNumber}: {report.weekStart.toLocaleDateString()} - {report.weekEnd.toLocaleDateString()}
              </p>
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
                <p className="text-gray-600">Week Number</p>
                <p className="font-semibold">Week {report.weekNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Generated</p>
                <p className="font-semibold text-sm">{report.generatedAt.toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Curriculum Info (for SS students) */}
          {(report.academicTrack || report.tradeSubject) && (
            <div className="bg-purple-50 rounded-lg p-4 mb-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">📚 Curriculum Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {report.totalSubjects && (
                  <div>
                    <p className="text-purple-600">Total Subjects</p>
                    <p className="font-semibold">{report.totalSubjects}</p>
                  </div>
                )}
                {report.academicTrack && (
                  <div>
                    <p className="text-purple-600">Academic Track</p>
                    <p className="font-semibold text-purple-800">{report.academicTrack}</p>
                  </div>
                )}
                {report.tradeSubject && (
                  <div className="col-span-2">
                    <p className="text-purple-600">Trade Subject</p>
                    <p className="font-semibold text-orange-700">{report.tradeSubject}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Section */}
          <div className="mb-6">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-bold">📋 ATTENDANCE</h3>
            </div>
            <div className="bg-blue-50 rounded-b-lg p-4 border-l-4 border-blue-500">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Total Days</p>
                  <p className="text-2xl font-bold text-gray-800">{report.attendance.totalDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Present</p>
                  <p className="text-2xl font-bold text-green-600">{report.attendance.present}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{report.attendance.absent}</p>
                </div>
              </div>
              <div className="text-center pt-3 border-t border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                <p className={`text-3xl font-bold ${
                  report.attendance.percentage >= 90 ? 'text-green-600' :
                  report.attendance.percentage >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {report.attendance.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

{/* Academic Performance Section */}
<div className="mb-6">
  <div className="bg-green-500 text-white px-4 py-2 rounded-t-lg">
    <h3 className="font-bold">📚 ACADEMIC PERFORMANCE</h3>
  </div>
  <div className="bg-green-50 rounded-b-lg p-4 border-l-4 border-green-500">
    {/* Summary - Now includes Homework */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-green-200">
      <div className="text-center">
        <p className="text-gray-600 text-sm">Classwork Average</p>
        <p className="text-2xl font-bold text-green-600">{report.overallClassworkAverage.toFixed(1)}/10</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Total Classwork</p>
        <p className="text-2xl font-bold text-green-600">{report.totalClassworkCount}</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Homework Average</p>
        <p className="text-2xl font-bold text-blue-600">{report.overallHomeworkAverage.toFixed(1)}/10</p>
      </div>
      <div className="text-center">
        <p className="text-gray-600 text-sm">Total Homework</p>
        <p className="text-2xl font-bold text-blue-600">{report.totalHomeworkCount}</p>
      </div>
    </div>

    {/* Subject Details */}
    {report.academics.length > 0 ? (
      <div>
        <p className="font-semibold text-gray-800 mb-3">Subject Breakdown:</p>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {report.academics.map((subject, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-800">{subject.subjectName}</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    📝 {subject.classworkCount} classwork
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    📚 {subject.homeworkCount} homework
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Classwork Avg</p>
                  <p className="font-semibold text-green-700">{subject.classworkAverage.toFixed(1)}/10</p>
                </div>
                <div>
                  <p className="text-gray-600">Classwork Count</p>
                  <p className="font-semibold">{subject.classworkCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Homework Avg</p>
                  <p className="font-semibold text-blue-700">{subject.homeworkAverage.toFixed(1)}/10</p>
                </div>
                <div>
                  <p className="text-gray-600">Homework Count</p>
                  <p className="font-semibold">{subject.homeworkCount}</p>
                </div>
              </div>
              {subject.teacherComment && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  💬 "{subject.teacherComment}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <p className="text-center text-gray-500 py-4">No academic activities recorded this week</p>
    )}
  </div>
</div>

          {/* Behavior Section */}
          <div className="mb-6">
            <div className="bg-purple-500 text-white px-4 py-2 rounded-t-lg">
              <h3 className="font-bold">⭐ BEHAVIOR & CONDUCT</h3>
            </div>
            <div className="bg-purple-50 rounded-b-lg p-4 border-l-4 border-purple-500">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Merit Points</p>
                  <p className="text-2xl font-bold text-green-600">+{report.behavior.totalMerits}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Demerit Points</p>
                  <p className="text-2xl font-bold text-red-600">-{report.behavior.totalDemerits}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Net Points</p>
                  <p className={`text-2xl font-bold ${
                    report.behavior.netPoints > 0 ? 'text-green-600' :
                    report.behavior.netPoints < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {report.behavior.netPoints > 0 ? '+' : ''}{report.behavior.netPoints}
                  </p>
                </div>
              </div>

              {/* Behavior Records */}
              {report.behavior.meritRecords.length > 0 && (
                <div className="pt-4 border-t border-purple-200">
                  <p className="font-semibold text-gray-800 mb-2">Recent Records:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {report.behavior.meritRecords.slice(0, 5).map((record, idx) => (
                      <div key={idx} className={`text-sm p-2 rounded ${
                        record.points > 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <span className="font-semibold">
                          {record.date.toLocaleDateString()}
                        </span>
                        {' • '}
                        <span className={record.points > 0 ? 'text-green-700' : 'text-red-700'}>
                          {record.points > 0 ? '+' : ''}{record.points}
                        </span>
                        {' - '}
                        <span className="text-gray-700">{record.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strengths Section */}
          {report.strengths.length > 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-t-lg">
                <h3 className="font-bold">💪 STRENGTHS</h3>
              </div>
              <div className="bg-green-50 rounded-b-lg p-4 border-l-4 border-green-400">
                <ul className="space-y-2">
                  {report.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {report.areasForImprovement.length > 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded-t-lg">
                <h3 className="font-bold">📈 AREAS FOR IMPROVEMENT</h3>
              </div>
              <div className="bg-orange-50 rounded-b-lg p-4 border-l-4 border-orange-400">
                <ul className="space-y-2">
                  {report.areasForImprovement.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">•</span>
                      <span className="text-gray-700">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Teacher's Observation */}
          {report.teacherObservation && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-400 to-cyan-500 text-white px-4 py-2 rounded-t-lg">
                <h3 className="font-bold">👨‍🏫 TEACHER'S OBSERVATION</h3>
              </div>
              <div className="bg-blue-50 rounded-b-lg p-4 border-l-4 border-blue-400">
                <p className="text-gray-700 italic">"{report.teacherObservation}"</p>
              </div>
            </div>
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