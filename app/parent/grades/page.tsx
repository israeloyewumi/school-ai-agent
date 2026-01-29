// ============================================
// FILE 1: app/parent/grades/page.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { getDetailedGradeRecords } from '@/lib/firebase/parentAccess';
import { getCurrentAcademicSession, getCurrentTerm } from '@/lib/config/schoolData';

interface GradeRecord {
  id: string;
  date: Date;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  score: number;
  maxScore: number;
  percentage: number;
  teacherName: string;
}

export default function GradesPage() {
  const [records, setRecords] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam'>('all');
  const [term] = useState(getCurrentTerm());              // ✅ Dynamic - currently "Second Term"
  const [session] = useState(getCurrentAcademicSession()); // ✅ Dynamic - currently "2025/2026"

  useEffect(() => {
    loadGradeRecords();
  }, []);

  async function loadGradeRecords() {
    try {
      setLoading(true);
      const selectedChildId = localStorage.getItem('selectedChildId');
      
      if (!selectedChildId) return;

      const data = await getDetailedGradeRecords(selectedChildId, term, session);
      setRecords(data);
    } catch (error) {
      console.error('❌ Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = filter === 'all' 
    ? records 
    : records.filter(r => r.assessmentType === filter);

  const bySubject = records.reduce((acc, record) => {
    if (!acc[record.subjectName]) {
      acc[record.subjectName] = [];
    }
    acc[record.subjectName].push(record);
    return acc;
  }, {} as Record<string, GradeRecord[]>);

  const getAssessmentBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      classwork: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Classwork' },
      homework: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Homework' },
      ca1: { bg: 'bg-green-100', text: 'text-green-800', label: 'CA1' },
      ca2: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'CA2' },
      exam: { bg: 'bg-red-100', text: 'text-red-800', label: 'EXAM' },
    };
    return badges[type] || badges.classwork;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading grades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Academic Grades</h1>
        <p className="text-gray-600 mt-1">{term} • {session}</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'classwork', 'homework', 'ca1', 'ca2', 'exam'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Grades by Subject */}
      {Object.keys(bySubject).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-600">No grades recorded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySubject).map(([subject, subjectRecords]) => {
            const filtered = filter === 'all' ? subjectRecords : subjectRecords.filter(r => r.assessmentType === filter);
            if (filtered.length === 0) return null;

            return (
              <div key={subject} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{subject}</h3>
                  <p className="text-xs text-gray-600">{filtered.length} assessments</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filtered.map((record) => {
                        const badge = getAssessmentBadge(record.assessmentType);
                        return (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {record.date.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {record.score}/{record.maxScore}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-sm font-bold rounded ${
                                record.percentage >= 70 ? 'text-green-600' :
                                record.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {record.percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{record.teacherName}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}