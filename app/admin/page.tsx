// app/admin/page.tsx - Admin Dashboard Main Page (Fixed)
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/auth/authService';
import { AuthUser } from '@/types/auth';
import { getPendingApprovals, getTeacherStats } from '@/lib/firebase/teacherManagement';
import { PendingTeacherApproval } from '@/types/database';
import PendingTeacherApprovals from '@/components/admin/PendingTeacherApprovals';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<PendingTeacherApproval[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    classTeachers: 0,
    subjectTeachers: 0
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'teachers'>('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (user.role !== 'admin') {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      await loadData();
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  }

  async function loadData() {
    try {
      const [approvals, teacherStats] = await Promise.all([
        getPendingApprovals(),
        getTeacherStats()
      ]);

      setPendingApprovals(approvals);
      setStats(teacherStats);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleRefresh() {
    setLoading(true);
    await loadData();
    setLoading(false);
  }

  async function handleLogout() {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👔</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Welcome back, {currentUser?.firstName} {currentUser?.lastName}!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Info Banner */}
      <div className="bg-purple-50 border-b border-purple-200 p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              📧 {currentUser?.email}
            </span>
            {currentUser?.phoneNumber && (
              <span className="text-sm text-gray-700">
                📱 {currentUser?.phoneNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              Admin ID: {currentUser?.adminId}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              ✅ Active
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'approvals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⏳ Pending Approvals
                {pendingApprovals.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'teachers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 All Teachers
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">School Overview</h2>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Teachers</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
                      </div>
                      <div className="text-4xl">👥</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">Pending Approval</p>
                        <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
                      </div>
                      <div className="text-4xl">⏳</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Active Teachers</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{stats.active}</p>
                      </div>
                      <div className="text-4xl">✅</div>
                    </div>
                  </div>
                </div>

                {/* Teacher Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Teacher Distribution</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Class Teachers</span>
                        <span className="font-bold text-purple-600">{stats.classTeachers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Subject Teachers</span>
                        <span className="font-bold text-indigo-600">{stats.subjectTeachers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('approvals')}
                        className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-left transition-colors"
                      >
                        📋 Review Pending Approvals
                      </button>
                      <button
                        onClick={() => setActiveTab('teachers')}
                        className="w-full p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left transition-colors"
                      >
                        👥 Manage All Teachers
                      </button>
                    </div>
                  </div>
                </div>

                {/* Urgent Notices */}
                {pendingApprovals.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <p className="font-semibold text-yellow-900">
                          {pendingApprovals.length} Teacher{pendingApprovals.length !== 1 ? 's' : ''} Awaiting Approval
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Please review and approve/reject pending teacher registrations.
                        </p>
                        <button
                          onClick={() => setActiveTab('approvals')}
                          className="mt-3 text-sm text-yellow-900 font-medium hover:underline"
                        >
                          Review Now →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <PendingTeacherApprovals
                approvals={pendingApprovals}
                adminId={currentUser?.id || ''}
                adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
                onRefresh={handleRefresh}
              />
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">All Teachers</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800">
                    Full teacher management interface coming soon...
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    For now, use the Pending Approvals tab to manage new teachers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}