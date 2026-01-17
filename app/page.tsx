// app/page.tsx - Main Chat Interface (Redirects Admins & Parents)
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser } from "@/lib/auth/authService";
import { AuthUser } from "@/types/auth";
import TeacherDashboard from "@/components/teacher/TeacherDashboard";

type Role = "student" | "teacher" | "parent" | "admin";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
        return;
      }
      
      // ✅ REDIRECT ADMINS TO ADMIN DASHBOARD
      if (user.role === 'admin') {
        router.push('/admin');
        return;
      }
      
      // ✅ NEW: REDIRECT PARENTS TO PARENT PORTAL
      if (user.role === 'parent') {
        router.push('/parent');
        return;
      }
      
      setCurrentUser(user);
      setSelectedRole(user.role);
      setIsCheckingAuth(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedRole || !currentUser) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      console.log('🚀 Sending request:', {
        role: selectedRole,
        message: userMessage,
        userId: currentUser.id,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      // Build context based on role
      const context: any = {
        term: "First Term",
        session: "2024/2025",
        userId: currentUser.id
      };

      // Add appropriate ID to context based on role
      switch (selectedRole) {
        case "student":
          context.studentId = currentUser.studentId || currentUser.id;
          break;
        case "parent":
          context.parentId = currentUser.parentId || currentUser.id;
          break;
        case "teacher":
          context.teacherId = currentUser.teacherId || currentUser.id;
          break;
        case "admin":
          context.adminId = currentUser.adminId || currentUser.id;
          break;
      }

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: selectedRole,
          message: userMessage,
          context
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (data.error) {
        console.error('❌ API returned error:', data.error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ Error: ${data.error}`,
          },
        ]);
      } else if (data.response) {
        console.log('✅ Got response:', data.response.substring(0, 100) + '...');
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);
      } else {
        console.error('❌ No response in data:', data);
        throw new Error('No response from AI');
      }
    } catch (error: any) {
      console.error('❌ Catch block error:', error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "⏱️ Request timed out after 2 minutes. Please try again or check your internet connection.";
      } else if (error.message) {
        errorMessage = `❌ Error: ${error.message}`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
      console.log('✅ Request completed');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login, admin, or parent portal
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">
              {selectedRole === "student" && "👨‍🎓"}
              {selectedRole === "teacher" && "👨‍🏫"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 capitalize">
                {selectedRole} Portal
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {currentUser.firstName} {currentUser.lastName}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* User Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              📧 {currentUser.email}
            </span>
            {currentUser.phoneNumber && (
              <span className="text-sm text-gray-700">
                📱 {currentUser.phoneNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Teacher Dashboard Button */}
            {currentUser.role === 'teacher' && (
              <button
                onClick={() => setShowTeacherDashboard(true)}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                🎯 Teacher Tools
              </button>
            )}
            
            {currentUser.studentId && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                ID: {currentUser.studentId}
              </span>
            )}
            {currentUser.teacherId && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Staff: {currentUser.teacherId}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Hello {currentUser.firstName}! How can I help you today?
              </h2>
              <p className="text-gray-600 mb-6">
                I'm ready to help you with your {selectedRole} queries!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {selectedRole === "student" && (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">🌟</span> "What are my merits?"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">📊</span> "Show my attendance"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">📈</span> "What are my grades?"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">🎯</span> "Show my performance"
                    </div>
                  </>
                )}
                {selectedRole === "teacher" && (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">👥</span> "Show my classes"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">📊</span> "Record attendance"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">📈</span> "Enter grades"
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                      <span className="text-lg">⭐</span> "Award merits"
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800 shadow-md"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className="ml-2 text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>

      {/* Teacher Dashboard */}
      {showTeacherDashboard && currentUser.role === 'teacher' && (
        <TeacherDashboard
          user={currentUser}
          onClose={() => setShowTeacherDashboard(false)}
        />
      )}
    </div>
  );
}