// components/admin/DailyTeacherRecordings.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  getAllTeachersDailyRecordings, 
  type AllTeachersDailyRecordings
} from '@/lib/firebase/dailyRecordings';
import TeacherActivityCard from './TeacherActivityCard';
import ActivityTimeline from './ActivityTimeline';

interface DailyTeacherRecordingsProps {
  adminId: string;
  adminName: string;
}

type ViewMode = 'all-teachers' | 'by-teacher' | 'by-class' | 'timeline';
type ActivityFilter = 'all' | 'attendance' | 'merits' | 'grades';

export default function DailyTeacherRecordings({ adminId, adminName }: DailyTeacherRecordingsProps) {
  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('all-teachers');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  
  const [recordings, setRecordings] = useState<AllTeachersDailyRecordings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const term = "Second Term";
  const session = "2025/2026";

  // Load data when date changes
  useEffect(() => {
    loadRecordings();
  }, [selectedDate]);

  async function loadRecordings() {
    setLoading(true);
    setError('');
    
    try {
      console.log('📊 Loading recordings for:', selectedDate.toLocaleDateString());
      const data = await getAllTeachersDailyRecordings(selectedDate, term, session);
      setRecordings(data);
      console.log('✅ Recordings loaded:', data.totals);
    } catch (err: any) {
      console.error('❌ Error loading recordings:', err);
      setError(err.message || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }

  function navigateDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recordings for {selectedDate.toLocaleDateString()}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">❌</div>
        <p className="text-red-800 font-medium">{error}</p>
        <button
          onClick={loadRecordings}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">📊 Daily Teacher Recordings</h2>
        <p className="text-gray-600 mt-1">
          View all teacher activities (attendance, merits, grades) for a specific date
        </p>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigateDate(-1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Previous Day
          </button>
          
          <input
            type="date"
            value={formatDate(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            📅 Today
          </button>
          
          <button
            onClick={() => navigateDate(1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Next Day →
          </button>

          <div className="ml-auto">
            <span className="text-sm text-gray-600">Selected: </span>
            <span className="font-semibold text-gray-800">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {recordings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Attendance Records</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">
                  {recordings.totals.totalAttendanceRecords}
                </p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Merit/Demerit Records</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">
                  {recordings.totals.totalMeritRecords}
                </p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Grade Entries</p>
                <p className="text-3xl font-bold text-green-900 mt-2">
                  {recordings.totals.totalGradeRecords}
                </p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Active Teachers</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">
                  {recordings.totals.totalTeachersActive}
                </p>
              </div>
              <div className="text-4xl">👨‍🏫</div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setViewMode('all-teachers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'all-teachers'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 All Teachers
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'timeline'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⏱️ Timeline View
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Activities</option>
            <option value="attendance">📋 Attendance Only</option>
            <option value="merits">⭐ Merits Only</option>
            <option value="grades">📝 Grades Only</option>
          </select>

          <input
            type="search"
            placeholder="Search students, classes, subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Content Area */}
      {recordings && recordings.totals.totalActivities === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl font-semibold text-gray-800 mb-2">No Activities Recorded</p>
          <p className="text-gray-600">
            No teacher activities were recorded on {selectedDate.toLocaleDateString()}
          </p>
        </div>
      )}

      {/* All Teachers View - USING COMPONENT */}
      {recordings && viewMode === 'all-teachers' && recordings.totals.totalActivities > 0 && (
        <div className="space-y-4">
          {Array.from(recordings.byTeacher.values()).map((activity) => (
            <TeacherActivityCard
              key={activity.teacherId}
              activity={activity}
              searchTerm={searchTerm}
              activityFilter={activityFilter}
            />
          ))}
        </div>
      )}

      {/* Timeline View - USING COMPONENT */}
      {recordings && viewMode === 'timeline' && recordings.totals.totalActivities > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ActivityTimeline
            timeline={recordings.timeline}
            searchTerm={searchTerm}
            activityFilter={activityFilter}
          />
        </div>
      )}
    </div>
  );
}