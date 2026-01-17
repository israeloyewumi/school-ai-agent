// app/parent/layout.tsx - Parent Portal Layout with ATLAS AI Navigation

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/auth/authService';
import { getParentChildren, type ParentChild } from '@/lib/firebase/parentAccess';
import Link from 'next/link';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [children_list, setChildrenList] = useState<ParentChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeParent();
  }, []);

  // Store selected child in localStorage and provide to all child pages
  useEffect(() => {
    if (selectedChildId) {
      localStorage.setItem('selectedChildId', selectedChildId);
    }
  }, [selectedChildId]);

  // 🆕 STORE PARENT ID IN LOCALSTORAGE FOR ATLAS AI
  useEffect(() => {
    if (currentUser) {
      const parentId = currentUser.parentId || currentUser.id;
      localStorage.setItem('parentId', parentId);
    }
  }, [currentUser]);

  async function initializeParent() {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (user.role !== 'parent') {
        router.push('/');
        return;
      }

      setCurrentUser(user);

      // Get parent's children
      const parentId = user.parentId || user.id;
      const childrenList = await getParentChildren(parentId);
      
      setChildrenList(childrenList);
      
      if (childrenList.length > 0) {
        // Check if there's a stored selection
        const stored = localStorage.getItem('selectedChildId');
        if (stored && childrenList.find(c => c.studentId === stored)) {
          setSelectedChildId(stored);
        } else {
          setSelectedChildId(childrenList[0].studentId);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing parent:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      localStorage.removeItem('selectedChildId');
      localStorage.removeItem('parentId'); // 🆕 Clear parent ID
      sessionStorage.removeItem('visitedAtlas'); // 🆕 Clear ATLAS visit flag
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || children_list.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Children Found</h2>
          <p className="text-gray-600 mb-4">
            No students are linked to your parent account.
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const selectedChild = children_list.find(c => c.studentId === selectedChildId);

  // 🆕 UPDATED NAV ITEMS - ATLAS AI ADDED AT TOP
  const navItems = [
    { href: '/parent/atlas', icon: '🤖', label: 'ATLAS AI', exact: false },
    { href: '/parent', icon: '📊', label: 'Dashboard', exact: true },
    { href: '/parent/attendance', icon: '📋', label: 'Attendance' },
    { href: '/parent/merits', icon: '⭐', label: 'Merit Points' },
    { href: '/parent/grades', icon: '📚', label: 'Grades' },
    { href: '/parent/fees', icon: '💰', label: 'Fees' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">👨‍👩‍👧‍👦</div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Parent Portal</h1>
              <p className="text-xs text-gray-600">{currentUser.firstName}</p>
            </div>
          </div>

          {/* Child Selector */}
          {children_list.length > 1 && (
            <select
              value={selectedChildId}
              onChange={(e) => {
                const newChildId = e.target.value;
                console.log('SELECTING NEW CHILD:', newChildId);
                localStorage.setItem('selectedChildId', newChildId);
                console.log('LocalStorage set to:', localStorage.getItem('selectedChildId'));
                setSelectedChildId(newChildId);
                // Trigger child-selected event
                window.dispatchEvent(new Event('child-selected'));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {children_list.map(child => (
                <option key={child.studentId} value={child.studentId}>
                  {child.fullName}
                </option>
              ))}
            </select>
          )}

          {/* Single Child Info */}
          {children_list.length === 1 && selectedChild && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="font-semibold text-sm text-gray-800">{selectedChild.fullName}</p>
              <p className="text-xs text-gray-600">{selectedChild.className}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
                {/* 🆕 NEW BADGE FOR ATLAS AI */}
                {item.label === 'ATLAS AI' && (
                  <span className="ml-auto px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full font-semibold">
                    AI
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions - LOGOUT ONLY */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {selectedChild && (
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedChild.fullName}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedChild.className} • Admission: {selectedChild.admissionNumber}
                  </p>
                </div>
              )}
            </div>
            {/* Header right side - can add other actions here if needed */}
            <div className="flex items-center gap-3">
              {/* Empty for now - can add notifications, etc */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}