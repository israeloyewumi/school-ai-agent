// app/parent/page.tsx - Parent Dashboard with ATLAS AI Redirect

'use client';

import { useState, useEffect } from 'react';
import { getStudentDashboardData, type StudentDashboardData } from '@/lib/firebase/parentAccess';
import { getCurrentUser } from '@/lib/auth/authService';
import ParentChatAssistant from '@/components/parent/ParentChatAssistant';
import { useRouter } from 'next/navigation';
import { getCurrentAcademicSession, getCurrentTerm } from '@/lib/config/schoolData';

export default function ParentDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  // ✅ FIX: Use dynamic session and term instead of hardcoded values
  const [term] = useState(getCurrentTerm());              // Now returns "Second Term" for January 2026
  const [session] = useState(getCurrentAcademicSession()); // Now returns "2025/2026"
  const [lastChildId, setLastChildId] = useState('');

  // 🆕 REDIRECT TO ATLAS AI ON FIRST VISIT
  useEffect(() => {
    const hasVisitedAtlas = sessionStorage.getItem('visitedAtlas');
    if (!hasVisitedAtlas) {
      sessionStorage.setItem('visitedAtlas', 'true');
      router.push('/parent/atlas');
    }
  }, [router]);

  // Get current user
  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }
    loadUser();
  }, []);

  // Listen for child selection changes
  useEffect(() => {
    const handleChildChange = () => {
      console.log('Child selection changed, reloading dashboard...');
      loadDashboardData();
    };
    
    window.addEventListener('child-selected', handleChildChange);
    
    // Initial load with delay to wait for layout
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 300);
    
    return () => {
      window.removeEventListener('child-selected', handleChildChange);
      clearTimeout(timer);
    };
  }, [term, session]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Wait a moment to ensure localStorage is updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const selectedChildId = localStorage.getItem('selectedChildId');
      
      if (!selectedChildId) {
        console.warn('No child selected');
        setDashboardData(null);
        return;
      }

      // Skip if same child is already loaded
      if (selectedChildId === lastChildId && dashboardData) {
        console.log('Same child, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('Loading dashboard for child:', selectedChildId);
      setLastChildId(selectedChildId);
      
      const data = await getStudentDashboardData(selectedChildId, term, session);
      setDashboardData(data);
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No child selected or data unavailable</p>
        <p className="text-sm text-gray-500 mt-2">
          Please select a child from the menu above
        </p>
      </div>
    );
  }

  const selectedChildId = localStorage.getItem('selectedChildId');
  const parentId = currentUser?.parentId || currentUser?.id;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">📋</div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Attendance</h3>
              <p className="text-2xl font-bold text-green-600">
                {dashboardData.attendance.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Present:</span>
              <span className="font-semibold">{dashboardData.attendance.present} days</span>
            </div>
            <div className="flex justify-between">
              <span>Absent:</span>
              <span className="font-semibold">{dashboardData.attendance.absent} days</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">{dashboardData.attendance.totalDays} days</span>
            </div>
          </div>
        </div>

        {/* Merit Points Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">⭐</div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Merit Points</h3>
              <p className={`text-2xl font-bold ${
                dashboardData.merits.totalPoints >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {dashboardData.merits.totalPoints}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Positive:</span>
              <span className="font-semibold text-green-600">+{dashboardData.merits.positivePoints}</span>
            </div>
            <div className="flex justify-between">
              <span>Negative:</span>
              <span className="font-semibold text-red-600">-{dashboardData.merits.negativePoints}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Total:</span>
              <span className="font-semibold">{dashboardData.merits.totalPoints}</span>
            </div>
          </div>
        </div>

        {/* Academic Performance Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">📚</div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Overall Average</h3>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.academics.overallAverage.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Subjects:</span>
              <span className="font-semibold">{dashboardData.academics.subjects.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Assessments:</span>
              <span className="font-semibold">{dashboardData.academics.totalAssessments}</span>
            </div>
          </div>
        </div>

        {/* Fee Status Card */}
        <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
          dashboardData.fees.status === 'paid' ? 'border-green-500' :
          dashboardData.fees.status === 'partial' ? 'border-yellow-500' : 'border-red-500'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">💰</div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Fee Status</h3>
              <p className={`text-xl font-bold uppercase ${
                dashboardData.fees.status === 'paid' ? 'text-green-600' :
                dashboardData.fees.status === 'partial' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {dashboardData.fees.status}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">₦{dashboardData.fees.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid:</span>
              <span className="font-semibold text-green-600">₦{dashboardData.fees.amountPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance:</span>
              <span className="font-semibold text-red-600">₦{dashboardData.fees.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Performance Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Academic Performance by Subject</h3>
          <p className="text-sm text-gray-600 mt-1">
            Term: {term} • Session: {session} • Student: {dashboardData.student.fullName}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classwork Avg
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Homework Avg
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CA1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CA2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.academics.subjects.map((subject) => (
                <tr key={subject.subjectId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {subject.subjectName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subject.classwork.average > 0 ? `${subject.classwork.average} (${subject.classwork.count})` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subject.homework.average > 0 ? `${subject.homework.average} (${subject.homework.count})` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subject.ca1 !== null ? subject.ca1 : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subject.ca2 !== null ? subject.ca2 : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {subject.exam !== null ? subject.exam : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {subject.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      subject.grade === 'A' ? 'bg-green-100 text-green-800' :
                      subject.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      subject.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      subject.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {subject.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Merit Awards */}
      {dashboardData.merits.recentAwards.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Merit Awards</h3>
            <p className="text-sm text-gray-600 mt-1">For {dashboardData.student.fullName}</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.merits.recentAwards.map((award) => (
                <div
                  key={award.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                    award.points > 0 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {award.points > 0 ? '⭐' : '⚠️'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {award.category}
                      </p>
                      <p className="text-xs text-gray-600">{award.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {award.teacherName} • {award.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    award.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {award.points > 0 ? '+' : ''}{award.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Assistant - Only show if we have required data */}
      {selectedChildId && parentId && (
        <ParentChatAssistant
          parentId={parentId}
          selectedChildId={selectedChildId}
          term={term}
          session={session}
        />
      )}
    </div>
  );
}