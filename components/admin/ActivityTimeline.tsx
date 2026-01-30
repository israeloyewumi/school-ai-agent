// components/admin/ActivityTimeline.tsx
"use client";

import type { ActivityTimelineItem } from '@/lib/firebase/dailyRecordings';

interface ActivityTimelineProps {
  timeline: ActivityTimelineItem[];
  searchTerm?: string;
  activityFilter?: 'all' | 'attendance' | 'merits' | 'grades';
}

export default function ActivityTimeline({ 
  timeline, 
  searchTerm = '', 
  activityFilter = 'all' 
}: ActivityTimelineProps) {
  
  // Filter timeline items
  function getFilteredTimeline(): ActivityTimelineItem[] {
    let filtered = [...timeline];

    // Filter by type
    if (activityFilter === 'attendance') {
      filtered = filtered.filter(item => item.type === 'attendance');
    } else if (activityFilter === 'merits') {
      filtered = filtered.filter(item => item.type === 'merit');
    } else if (activityFilter === 'grades') {
      filtered = filtered.filter(item => item.type === 'grade');
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.teacherName.toLowerCase().includes(search) ||
        item.className.toLowerCase().includes(search) ||
        item.details.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  const filteredTimeline = getFilteredTimeline();

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      attendance: 'Attendance',
      merit: 'Merit/Demerit',
      grade: 'Grade'
    };
    return labels[type] || type;
  }

  function getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      attendance: 'bg-blue-100 text-blue-800',
      merit: 'bg-purple-100 text-purple-800',
      grade: 'bg-green-100 text-green-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  }

  function getTypeIconBg(type: string): string {
    const classes: Record<string, string> = {
      attendance: 'bg-blue-500',
      merit: 'bg-purple-500',
      grade: 'bg-green-500'
    };
    return classes[type] || 'bg-gray-500';
  }

  if (filteredTimeline.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-xl font-semibold text-gray-800 mb-2">No Activities Found</p>
        <p className="text-gray-600">
          {searchTerm || activityFilter !== 'all' 
            ? 'Try adjusting your filters or search term'
            : 'No activities recorded in this timeline'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        ⏱️ Activity Timeline ({filteredTimeline.length} activities)
      </h3>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {filteredTimeline.map((item, index) => (
          <div 
            key={index} 
            className="flex gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Timeline Icon */}
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 ${getTypeIconBg(item.type)} rounded-full flex items-center justify-center text-white text-xl`}>
                {item.icon}
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {item.teacherName}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-2">
                {item.details}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span>🏫</span>
                  <span>{item.className}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}