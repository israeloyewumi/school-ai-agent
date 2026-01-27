// app/admin/page.tsx - UPDATED: Added Parent Approvals Tab
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/auth/authService';
import { AuthUser } from '@/types/auth';
import { getPendingApprovals, getTeacherStats, cleanupAllOrphanedAssignments, forceCleanupAllAssignments } from '@/lib/firebase/teacherManagement';
import { getPendingParentApprovals } from '@/lib/firebase/parentManagement';
import { PendingTeacherApproval, PendingParentApproval } from '@/types/database';
import PendingTeacherApprovals from '@/components/admin/PendingTeacherApprovals';
import PendingParentApprovals from '@/components/admin/PendingParentApprovals';
import StudentReports from '@/components/admin/StudentReports';
import QuickGradeEntry from '@/components/admin/QuickGradeEntry';
import { quickCleanupOrphanedAssignments } from '@/lib/firebase/validationHelpers';
import FeePaymentRecorder from '@/components/admin/FeePaymentRecorder';
import FeeStructureSetup from '@/components/admin/FeeStructureSetup';
import DailyTeacherRecordings from '@/components/admin/DailyTeacherRecordings';
import AdminChatAssistant from '@/components/admin/AdminChatAssistant';
import TeacherReallocation from '@/components/admin/TeacherReallocation';

type ActiveTab = 'overview' | 'approvals' | 'parent-approvals' | 'teachers' | 'reallocation' | 'grades' | 'reports' | 'fees';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTeacherApprovals, setPendingTeacherApprovals] = useState<PendingTeacherApproval[]>([]);
  const [pendingParentApprovals, setPendingParentApprovals] = useState<PendingParentApproval[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    classTeachers: 0,
    subjectTeachers: 0
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [feeSubTab, setFeeSubTab] = useState<'setup' | 'record'>('setup');

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
    
    // 🆕 NEW: Store admin info for ATLAS AI
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminId', user.id);
      localStorage.setItem('adminName', `${user.firstName} ${user.lastName}`);
    }
    
    await loadData();
    
    // 🆕 NEW: Redirect to ATLAS AI on first visit
    const hasVisitedAtlas = sessionStorage.getItem('adminVisitedAtlas');
    if (!hasVisitedAtlas) {
      sessionStorage.setItem('adminVisitedAtlas', 'true');
      router.push('/admin/atlas');
      return;
    }
    
    setLoading(false);
  } catch (error) {
    console.error('Auth check error:', error);
    router.push('/login');
  }
}

  async function loadData() {
    try {
      const [teacherApprovals, teacherStats, parentApprovals] = await Promise.all([
        getPendingApprovals(),
        getTeacherStats(),
        getPendingParentApprovals()  // NEW: Load parent approvals
      ]);

      setPendingTeacherApprovals(teacherApprovals);
      setPendingParentApprovals(parentApprovals);
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
    // 🆕 NEW: Clear ATLAS AI data on logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminId');
      localStorage.removeItem('adminName');
      sessionStorage.removeItem('adminVisitedAtlas');
    }
    router.push('/login');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}

  // ⭐ NEW: Navigate to Cleanup Null Teachers Page
  function goToCleanupNullTeachers() {
    router.push('/admin/cleanup-null-teachers');
  }

  // ⭐ NEW: Navigate to Emergency Cleanup Page
  function goToEmergencyCleanup() {
    router.push('/admin/emergency-cleanup');
  }

  // ⭐ NEW: Navigate to Direct Fix Page
  function goToDirectFix() {
    router.push('/admin/direct-fix');
  }

  // Cleanup Functions
  async function handleQuickCleanup() {
    if (!confirm('Quick cleanup will auto-clean orphaned teacher assignments. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await quickCleanupOrphanedAssignments();
      alert('✅ Quick cleanup complete! Orphaned assignments removed.');
      await loadData();
      setLoading(false);
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('❌ Cleanup failed: ' + (error as Error).message);
      setLoading(false);
    }
  }

  async function handleSmartCleanup() {
    if (!confirm('Smart cleanup will clean all orphaned teacher assignments. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const result = await cleanupAllOrphanedAssignments();
      
      if (result.totalCleaned > 0) {
        alert(`✅ Smart cleanup complete! Removed ${result.totalCleaned} orphaned assignments:
          - Class teachers: ${result.cleanedClassTeachers}
          - Subject teachers: ${result.cleanedSubjectTeachers}
          
          You can now register new teachers.`);
      } else {
        alert('✅ No orphaned assignments found. All data is clean!');
      }
      
      await loadData();
      setLoading(false);
      
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('❌ Cleanup failed: ' + (error as Error).message);
      setLoading(false);
    }
  }

  async function handleEmergencyCleanup() {
    if (!confirm('⚠️ EMERGENCY CLEANUP: This will remove ALL teacher assignments from classes and subjects. This cannot be undone. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await forceCleanupAllAssignments();
      alert('✅ EMERGENCY CLEANUP COMPLETE! All teacher assignments have been removed.');
      await loadData();
      setLoading(false);
      
    } catch (error) {
      console.error('Emergency cleanup error:', error);
      alert('❌ Emergency cleanup failed: ' + (error as Error).message);
      setLoading(false);
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
              <div className="text-4xl">🎓</div>
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
              
              {/* ⭐ NEW: Cleanup Null Teachers Button */}
              <button
                onClick={goToCleanupNullTeachers}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
              >
                🧹 Cleanup Null Teachers
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

      {/* Tabs - UPDATED: Added Parent Approvals Tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
  <button
    onClick={() => setActiveTab('overview')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'overview'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    📊 Overview
  </button>
  <button
    onClick={() => setActiveTab('approvals')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'approvals'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    ⏳ Teacher Approvals
    {pendingTeacherApprovals.length > 0 && (
      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
        {pendingTeacherApprovals.length}
      </span>
    )}
  </button>
  <button
    onClick={() => setActiveTab('parent-approvals')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'parent-approvals'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    👨‍👩‍👧 Parent Approvals
    {pendingParentApprovals.length > 0 && (
      <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
        {pendingParentApprovals.length}
      </span>
    )}
  </button>
  <button
    onClick={() => setActiveTab('teachers')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'teachers'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    👥 Teachers
  </button>
  <button
    onClick={() => setActiveTab('reallocation')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'reallocation'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    🔄 Reassign Teachers
  </button>
  <button
    onClick={() => setActiveTab('grades')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'grades'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    📝 Add Grades
  </button>
  <button
    onClick={() => setActiveTab('reports')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'reports'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    📄 Reports
  </button>
  <button
    onClick={() => setActiveTab('fees')}
    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      activeTab === 'fees'
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    💰 Fee Management
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
                        <p className="text-sm text-yellow-600 font-medium">Pending Teacher Approvals</p>
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

                {/* Pending Approvals Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pending Teacher Approvals */}
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-yellow-900">Teacher Approvals</h3>
                        <p className="text-sm text-yellow-700">Pending teacher registrations</p>
                      </div>
                      <div className="text-3xl">👨‍🏫</div>
                    </div>
                    <div className="text-center py-4">
                      <p className="text-4xl font-bold text-yellow-900">{pendingTeacherApprovals.length}</p>
                      <p className="text-sm text-yellow-700 mt-1">teachers waiting</p>
                    </div>
                    {pendingTeacherApprovals.length > 0 ? (
                      <button
                        onClick={() => setActiveTab('approvals')}
                        className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-semibold transition-all"
                      >
                        Review Teacher Approvals →
                      </button>
                    ) : (
                      <div className="w-full mt-4 px-4 py-3 bg-yellow-200 bg-opacity-50 text-yellow-900 rounded-lg text-center">
                        ✅ All teacher approvals are processed
                      </div>
                    )}
                  </div>

                  {/* Pending Parent Approvals */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-100 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-blue-900">Parent Approvals</h3>
                        <p className="text-sm text-blue-700">Pending parent registrations</p>
                      </div>
                      <div className="text-3xl">👨‍👩‍👧</div>
                    </div>
                    <div className="text-center py-4">
                      <p className="text-4xl font-bold text-blue-900">{pendingParentApprovals.length}</p>
                      <p className="text-sm text-blue-700 mt-1">parents waiting</p>
                    </div>
                    {pendingParentApprovals.length > 0 ? (
                      <button
                        onClick={() => setActiveTab('parent-approvals')}
                        className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all"
                      >
                        Review Parent Approvals →
                      </button>
                    ) : (
                      <div className="w-full mt-4 px-4 py-3 bg-blue-200 bg-opacity-50 text-blue-900 rounded-lg text-center">
                        ✅ All parent approvals are processed
                      </div>
                    )}
                  </div>
                </div>

                {/* ⭐ NEW: Big Cleanup Tools Section */}
                <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-teal-50 border-2 border-blue-300 rounded-xl p-8 shadow-xl">
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">🧹</div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      Cleanup Tools
                    </h3>
                    <p className="text-gray-700 text-lg">
                      Fix teacher registration issues and clean orphaned data
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cleanup Null Teachers - MAIN TOOL */}
                    <button
                      onClick={goToCleanupNullTeachers}
                      className="bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                    >
                      <div className="text-4xl mb-3">🧹</div>
                      <h4 className="text-xl font-bold mb-2">Cleanup Null Teachers</h4>
                      <p className="text-sm text-blue-100 mb-4">
                        Remove all null/invalid teacher entries (RECOMMENDED)
                      </p>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-xs font-semibold">
                        ⭐ Start Here
                      </div>
                    </button>

                    {/* Emergency Cleanup */}
                    <button
                      onClick={goToEmergencyCleanup}
                      className="bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                    >
                      <div className="text-4xl mb-3">🚨</div>
                      <h4 className="text-xl font-bold mb-2">Emergency Cleanup</h4>
                      <p className="text-sm text-red-100 mb-4">
                        Diagnose and fix complex assignment issues
                      </p>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-xs font-semibold">
                        Advanced Tool
                      </div>
                    </button>

                    {/* Direct Fix */}
                    <button
                      onClick={goToDirectFix}
                      className="bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                    >
                      <div className="text-4xl mb-3">🔧</div>
                      <h4 className="text-xl font-bold mb-2">Direct Fix</h4>
                      <p className="text-sm text-purple-100 mb-4">
                        Manually fix specific class assignments
                      </p>
                      <div className="bg-white bg-opacity-20 rounded-lg p-2 text-xs font-semibold">
                        Manual Tool
                      </div>
                    </button>
                  </div>
                </div>

                {/* In-page Cleanup Buttons */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">🚀 Quick Actions (In-Page)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    These cleanup actions run directly on this page without navigation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={handleQuickCleanup}
                      className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-lg text-left transition-colors"
                    >
                      <div className="text-2xl mb-1">⚡</div>
                      <p className="font-semibold text-gray-800">Quick Cleanup</p>
                      <p className="text-sm text-gray-600 mt-1">Auto-clean orphaned assignments</p>
                    </button>
                    <button
                      onClick={handleSmartCleanup}
                      className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border border-yellow-200 rounded-lg text-left transition-colors"
                    >
                      <div className="text-2xl mb-1">🧹</div>
                      <p className="font-semibold text-gray-800">Smart Cleanup</p>
                      <p className="text-sm text-gray-600 mt-1">Clean all orphaned assignments</p>
                    </button>
                    <button
                      onClick={handleEmergencyCleanup}
                      className="p-4 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-200 rounded-lg text-left transition-colors"
                    >
                      <div className="text-2xl mb-1">⚠️</div>
                      <p className="font-semibold text-gray-800">Force Cleanup</p>
                      <p className="text-sm text-gray-600 mt-1">Remove ALL assignments (emergency)</p>
                    </button>
                  </div>
                </div>

{/* Quick Actions */}
<div className="bg-white border border-gray-200 rounded-xl p-6">
  <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
    {/* 🆕 NEW: ATLAS AI Button */}
    <button
      onClick={() => router.push('/admin/atlas')}
      className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-2 border-indigo-300 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">🤖</div>
      <p className="font-semibold text-gray-800">A.T.L.A.S AI</p>
      <p className="text-sm text-gray-600 mt-1">Chat with AI Assistant</p>
    </button>

    <button
      onClick={() => setActiveTab('grades')}
      className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">📝</div>
      <p className="font-semibold text-gray-800">Add CA/Exam Scores</p>
      <p className="text-sm text-gray-600 mt-1">Enter grades for students</p>
    </button>
    <button
      onClick={() => setActiveTab('reports')}
      className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">📄</div>
      <p className="font-semibold text-gray-800">Generate Reports</p>
      <p className="text-sm text-gray-600 mt-1">Create report cards</p>
    </button>
    <button
      onClick={() => setActiveTab('fees')}
      className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">💰</div>
      <p className="font-semibold text-gray-800">Record Fee Payment</p>
      <p className="text-sm text-gray-600 mt-1">Process student fee payments</p>
    </button>
    <button
      onClick={() => setActiveTab('approvals')}
      className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border border-yellow-200 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">⏳</div>
      <p className="font-semibold text-gray-800">Review Teacher Approvals</p>
      <p className="text-sm text-gray-600 mt-1">Approve pending teachers</p>
    </button>
    <button
      onClick={() => setActiveTab('parent-approvals')}
      className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-200 rounded-lg text-left transition-colors"
    >
      <div className="text-2xl mb-1">👨‍👩‍👧</div>
      <p className="font-semibold text-gray-800">Review Parent Approvals</p>
      <p className="text-sm text-gray-600 mt-1">Approve pending parents</p>
    </button>
  </div>
</div>

                {/* Urgent Notices */}
                {(pendingTeacherApprovals.length > 0 || pendingParentApprovals.length > 0) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900">
                          Pending Approvals Require Attention
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          {pendingTeacherApprovals.length > 0 && (
                            <div className="bg-yellow-100 rounded-lg p-3">
                              <p className="text-sm font-medium text-yellow-900">
                                👨‍🏫 {pendingTeacherApprovals.length} Teacher{pendingTeacherApprovals.length !== 1 ? 's' : ''} Awaiting
                              </p>
                              <button
                                onClick={() => setActiveTab('approvals')}
                                className="mt-2 text-xs text-yellow-800 font-medium hover:underline"
                              >
                                Review Teacher Approvals →
                              </button>
                            </div>
                          )}
                          {pendingParentApprovals.length > 0 && (
                            <div className="bg-blue-100 rounded-lg p-3">
                              <p className="text-sm font-medium text-blue-900">
                                👨‍👩‍👧 {pendingParentApprovals.length} Parent{pendingParentApprovals.length !== 1 ? 's' : ''} Awaiting
                              </p>
                              <button
                                onClick={() => setActiveTab('parent-approvals')}
                                className="mt-2 text-xs text-blue-800 font-medium hover:underline"
                              >
                                Review Parent Approvals →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher Approvals Tab */}
            {activeTab === 'approvals' && (
              <PendingTeacherApprovals
                approvals={pendingTeacherApprovals}
                adminId={currentUser?.id || ''}
                adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
                onRefresh={handleRefresh}
              />
            )}

            {/* Parent Approvals Tab - NEW */}
            {activeTab === 'parent-approvals' && (
              <PendingParentApprovals
                approvals={pendingParentApprovals}
                adminId={currentUser?.id || ''}
                adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
                onRefresh={handleRefresh}
              />
            )}

{/* Teachers Tab - Daily Recordings */}
{activeTab === 'teachers' && (
  <DailyTeacherRecordings
    adminId={currentUser?.id || ''}
    adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
  />
)}

{/* Teacher Reallocation Tab - NEW */}
{activeTab === 'reallocation' && (
  <TeacherReallocation
    adminId={currentUser?.id || ''}
    adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
  />
)}

{/* Grades Tab */}
{activeTab === 'grades' && (
  <QuickGradeEntry
    adminId={currentUser?.id || ''}
    adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
  />
)}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <StudentReports
                adminId={currentUser?.id || ''}
                adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
              />
            )}
    {/* Fee Management Tab */}
            {activeTab === 'fees' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-800">Fee Management</h2>
                
                {/* Tabs within Fee Management */}
                <div className="border-b border-gray-200">
                  <nav className="flex gap-4">
                    <button
                      onClick={() => setFeeSubTab('setup')}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        feeSubTab === 'setup'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      🏗️ Setup Fee Structure
                    </button>
                    <button
                      onClick={() => setFeeSubTab('record')}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        feeSubTab === 'record'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      💰 Record Payment
                    </button>
                  </nav>
                </div>

                {/* Setup Fee Structure Sub-tab */}
                {feeSubTab === 'setup' && (
                  <FeeStructureSetup
                    currentTerm="First Term"
                    currentSession="2025/2026"
                    currentAcademicYear="2025/2026"
                    adminUserId={currentUser?.id || ''}
                  />
                )}

                {/* Record Payment Sub-tab */}
                {feeSubTab === 'record' && (
                  <FeePaymentRecorder
                    currentTerm="First Term"
                    currentSession="2025/2026"
                    currentAcademicYear="2025/2026"
                    adminUserId={currentUser?.id || ''}
                    adminName={`${currentUser?.firstName} ${currentUser?.lastName}`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {currentUser && (
     <AdminChatAssistant
       adminId={currentUser.id}
       adminName={`${currentUser.firstName} ${currentUser.lastName}`}
       currentTerm="First Term"
       currentSession="2025/2026"
     />
   )}
    </div>
  );
}