// components/admin/TeacherActivityCard.tsx
"use client";

import { useState } from 'react';
import type { TeacherDailyActivity } from '@/lib/firebase/dailyRecordings';

interface TeacherActivityCardProps {
  activity: TeacherDailyActivity;
  searchTerm?: string;
  activityFilter?: 'all' | 'attendance' | 'merits' | 'grades';
}

export default function TeacherActivityCard({ 
  activity, 
  searchTerm = '', 
  activityFilter = 'all' 
}: TeacherActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter activities based on props
  function getFilteredActivity(): TeacherDailyActivity {
    let filtered: TeacherDailyActivity = {
      ...activity,
      attendance: activity.attendance,
      merits: activity.merits,
      grades: activity.grades
    };

    // Filter by type
    if (activityFilter === 'attendance') {
      filtered.merits = [];
      filtered.grades = [];
    } else if (activityFilter === 'merits') {
      filtered.attendance = [];
      filtered.grades = [];
    } else if (activityFilter === 'grades') {
      filtered.attendance = [];
      filtered.merits = [];
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered.attendance = filtered.attendance.filter(a => 
        a.studentName.toLowerCase().includes(search) ||
        a.className.toLowerCase().includes(search)
      );
      filtered.merits = filtered.merits.filter(m => 
        m.studentName.toLowerCase().includes(search) ||
        m.className.toLowerCase().includes(search) ||
        m.reason.toLowerCase().includes(search)
      );
      filtered.grades = filtered.grades.filter(g => 
        g.studentName.toLowerCase().includes(search) ||
        g.className.toLowerCase().includes(search) ||
        g.subjectName.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  const filtered = getFilteredActivity();
  const totalFiltered = filtered.attendance.length + filtered.merits.length + filtered.grades.length;

  // Don't render if no activities after filtering
  if (totalFiltered === 0) return null;

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      excused: 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  function getAssessmentBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      classwork: 'bg-blue-100 text-blue-800',
      homework: 'bg-purple-100 text-purple-800',
      ca1: 'bg-green-100 text-green-800',
      ca2: 'bg-orange-100 text-orange-800',
      exam: 'bg-red-100 text-red-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Teacher Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {activity.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{activity.teacherName}</h3>
            <p className="text-sm text-gray-600">
              {activity.summary.classesCovered.length > 0 
                ? activity.summary.classesCovered.join(', ')
                : 'No classes recorded'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {filtered.attendance.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              📋 {filtered.attendance.length}
            </span>
          )}
          {filtered.merits.length > 0 && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              ⭐ {filtered.merits.length}
            </span>
          )}
          {filtered.grades.length > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              📝 {filtered.grades.length}
            </span>
          )}
        </div>
      </div>

      {/* Activity Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Attendance Box */}
        {filtered.attendance.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📋</span>
              <p className="text-sm font-medium text-blue-900">Attendance</p>
            </div>
            <p className="text-3xl font-bold text-blue-900">{filtered.attendance.length}</p>
            <p className="text-xs text-blue-700 mt-1">students marked</p>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-700">
                ✓ {filtered.attendance.filter(a => a.status === 'present').length}
              </span>
              <span className="text-red-700">
                ✗ {filtered.attendance.filter(a => a.status === 'absent').length}
              </span>
              <span className="text-yellow-700">
                ⏰ {filtered.attendance.filter(a => a.status === 'late').length}
              </span>
            </div>
          </div>
        )}

        {/* Merits Box */}
        {filtered.merits.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⭐</span>
              <p className="text-sm font-medium text-purple-900">Merits</p>
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-center">
                <span className="text-2xl font-bold text-green-700">
                  +{filtered.merits.filter(m => m.points > 0).length}
                </span>
                <p className="text-xs text-green-700">positive</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-red-700">
                  {filtered.merits.filter(m => m.points < 0).length}
                </span>
                <p className="text-xs text-red-700">negative</p>
              </div>
            </div>
            <p className="text-xs text-purple-700 mt-2">
              Total: {filtered.merits.reduce((sum, m) => sum + m.points, 0)} points
            </p>
          </div>
        )}

        {/* Grades Box */}
        {filtered.grades.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📝</span>
              <p className="text-sm font-medium text-green-900">Grades</p>
            </div>
            <p className="text-3xl font-bold text-green-900">{filtered.grades.length}</p>
            <p className="text-xs text-green-700 mt-1">
              {activity.summary.subjectsTaught.length} subject(s)
            </p>
            <div className="mt-2 space-y-1">
              {activity.summary.subjectsTaught.slice(0, 2).map((subject, i) => (
                <p key={i} className="text-xs text-green-700 truncate">• {subject}</p>
              ))}
              {activity.summary.subjectsTaught.length > 2 && (
                <p className="text-xs text-green-700">
                  +{activity.summary.subjectsTaught.length - 2} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Time Range */}
      {activity.summary.firstActivity && activity.summary.lastActivity && (
        <div className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <span>🕐</span>
          <span>
            First activity: {formatTime(activity.summary.firstActivity)} • 
            Last activity: {formatTime(activity.summary.lastActivity)}
          </span>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-between"
      >
        <span>{isExpanded ? '▲ Hide' : '▼ View'} Detailed Records</span>
        <span className="text-sm text-gray-500">
          {totalFiltered} total {totalFiltered === 1 ? 'record' : 'records'}
        </span>
      </button>

      {/* Detailed Records (Expanded) */}
      {isExpanded && (
        <div className="mt-4 space-y-6 border-t pt-4">
          {/* Attendance Table */}
          {filtered.attendance.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📋</span> Attendance Records ({filtered.attendance.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Class</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatTime(record.markedAt)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{record.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">{record.className}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Merits Table */}
          {filtered.merits.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>⭐</span> Merit/Demerit Records ({filtered.merits.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Points</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Category</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.merits.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatTime(record.date)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{record.studentName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-lg font-bold ${record.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {record.points > 0 ? '+' : ''}{record.points}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 capitalize">
                          {record.category.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grades Table */}
          {filtered.grades.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📝</span> Grade Records ({filtered.grades.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Time</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Subject</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Assessment</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Score</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.grades.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatTime(record.dateRecorded)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{record.studentName}</td>
                        <td className="px-4 py-3 text-gray-600">{record.subjectName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAssessmentBadgeClass(record.assessmentType)}`}>
                            {record.assessmentType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {record.score}/{record.maxScore}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            record.percentage >= 70 ? 'text-green-600' :
                            record.percentage >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {record.percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}