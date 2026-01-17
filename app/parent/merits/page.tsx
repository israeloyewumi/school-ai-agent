// app/parent/merits/page.tsx - Merit Points History Page

'use client';

import { useState, useEffect } from 'react';
import { getDetailedMeritRecords } from '@/lib/firebase/parentAccess';

interface MeritRecord {
  id: string;
  date: Date;
  points: number;
  category: string;
  reason: string;
  teacherName: string;
  className: string;
}

export default function MeritsPage() {
  const [records, setRecords] = useState<MeritRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [term] = useState('First Term');
  const [session] = useState('2025/2026');

  useEffect(() => {
    loadMeritRecords();
  }, []);

  async function loadMeritRecords() {
    try {
      setLoading(true);
      const selectedChildId = localStorage.getItem('selectedChildId');
      
      if (!selectedChildId) {
        console.warn('No child selected');
        return;
      }

      const data = await getDetailedMeritRecords(selectedChildId, term, session);
      setRecords(data);
    } catch (error) {
      console.error('❌ Error loading merits:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = filter === 'all' 
    ? records 
    : filter === 'positive'
    ? records.filter(r => r.points > 0)
    : records.filter(r => r.points < 0);

  const stats = {
    totalRecords: records.length,
    positiveCount: records.filter(r => r.points > 0).length,
    negativeCount: records.filter(r => r.points < 0).length,
    totalPoints: records.reduce((sum, r) => sum + r.points, 0),
    positivePoints: records.filter(r => r.points > 0).reduce((sum, r) => sum + r.points, 0),
    negativePoints: Math.abs(records.filter(r => r.points < 0).reduce((sum, r) => sum + r.points, 0)),
  };

  const getMeritLevel = (points: number): { level: string; color: string; emoji: string } => {
    if (points >= 501) return { level: 'Diamond', color: 'text-cyan-600', emoji: '💎' };
    if (points >= 301) return { level: 'Platinum', color: 'text-gray-600', emoji: '🏆' };
    if (points >= 151) return { level: 'Gold', color: 'text-yellow-600', emoji: '🥇' };
    if (points >= 51) return { level: 'Silver', color: 'text-gray-500', emoji: '🥈' };
    if (points >= 0) return { level: 'Bronze', color: 'text-orange-600', emoji: '🥉' };
    return { level: 'Warning', color: 'text-red-600', emoji: '⚠️' };
  };

  const currentLevel = getMeritLevel(stats.totalPoints);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading merit records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Merit Points History</h1>
        <p className="text-gray-600 mt-1">
          {term} • {session}
        </p>
      </div>

      {/* Merit Level Badge */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Current Merit Level</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-5xl">{currentLevel.emoji}</span>
              <div>
                <p className="text-3xl font-bold">{currentLevel.level}</p>
                <p className="text-lg opacity-90">{stats.totalPoints} points</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Total Awards</p>
            <p className="text-4xl font-bold">{stats.totalRecords}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⭐</div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Positive Points</p>
              <p className="text-2xl font-bold text-green-600">+{stats.positivePoints}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.positiveCount} awards</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Negative Points</p>
              <p className="text-2xl font-bold text-red-600">-{stats.negativePoints}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.negativeCount} demerits</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📊</div>
            <div>
              <p className="text-xs text-gray-600 uppercase">Net Total</p>
              <p className={`text-2xl font-bold ${stats.totalPoints >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {stats.totalPoints}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalRecords} total records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All ({stats.totalRecords})
        </button>
        <button
          onClick={() => setFilter('positive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'positive'
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Merits ({stats.positiveCount})
        </button>
        <button
          onClick={() => setFilter('negative')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'negative'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Demerits ({stats.negativeCount})
        </button>
      </div>

      {/* Merit Records */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Merit History ({filteredRecords.length} records)
          </h3>
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-5xl mb-4">⭐</div>
            <p>No merit records found</p>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`flex items-start gap-4 p-4 rounded-lg border-l-4 ${
                  record.points > 0
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="text-3xl">
                  {record.points > 0 ? '⭐' : '⚠️'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{record.category}</p>
                      <p className="text-sm text-gray-700 mt-1">{record.reason}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span>👨‍🏫 {record.teacherName}</span>
                        <span>•</span>
                        <span>🏫 {record.className}</span>
                        <span>•</span>
                        <span>📅 {record.date.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className={`text-2xl font-bold ${
                      record.points > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.points > 0 ? '+' : ''}{record.points}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download/Print Options */}
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          📄 Download Report
        </button>
        <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
          🖨️ Print
        </button>
      </div>
    </div>
  );
}