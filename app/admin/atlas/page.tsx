'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ATLAS AI - Full Screen Chat Interface for Admin
// app/admin/atlas/page.tsx

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AdminAtlasAI() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from localStorage
  useEffect(() => {
    const storedAdminId = localStorage.getItem('adminId') || '';
    const storedAdminName = localStorage.getItem('adminName') || 'Admin';
    setAdminId(storedAdminId);
    setAdminName(storedAdminName);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome to A.T.L.A.S AI, ${adminName}!**

I'm your **Academic Tracking, Learning & Administration System** assistant. I have access to 20 powerful tools to help you manage your school:

📊 **Analytics** - School-wide statistics and insights
👥 **Staff Management** - Teacher and parent approvals
📋 **Student Monitoring** - Track attendance, grades, behavior
💰 **Financial** - Fee collection and payment tracking
📄 **Reports** - Generate and send report cards
🎯 **Insights** - Identify students needing attention

What would you like to know or do today?`,
        timestamp: new Date()
      }]);
    }
  }, [adminName]);

  const quickActions = [
    { icon: '📊', label: 'School Overview', query: "Show me complete school overview" },
    { icon: '⏳', label: 'Pending Approvals', query: "Show all pending approvals" },
    { icon: '💰', label: 'Fee Collection', query: "Show fee collection summary" },
    { icon: '🎯', label: 'At-Risk Students', query: "Which students need attention?" },
    { icon: '🏆', label: 'Top Performers', query: "Show top 10 performing students" },
    { icon: '👨‍🏫', label: 'Teacher Activity', query: "Which teachers did NOT record attendance today?" },
    { icon: '📉', label: 'Low Attendance', query: "Which classes have lowest attendance?" },
    { icon: '📄', label: 'Generate Report', query: "Generate CA1 report" }
  ];

  // ✅ UPDATED: Fixed handleSend function
  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // ✅ FIX: Filter out welcome message from conversation history
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome') // Don't send welcome message to AI
        .map(m => ({
          id: m.id, // Include id for additional filtering
          role: m.role,
          content: m.content
        }));

      console.log('📤 Sending to AI:', {
        message: input.trim(),
        historyCount: conversationHistory.length,
        adminId: adminId
      });

      const response = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          adminId: adminId,
          conversationHistory: conversationHistory
        })
      });

      // ✅ FIX: Better error handling
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ AI Response received:', {
        hasResponse: !!data.response,
        hasError: !!data.error
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.error || 'No response received',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Sorry, I encountered an error: ${error.message}\n\nPlease try again or rephrase your question.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickAction(query: string) {
    setInput(query);
    inputRef.current?.focus();
  }

  function switchToDashboard() {
    router.replace('/admin');
  }

  function clearChat() {
    if (confirm('Clear all chat history?')) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Welcome back!**\n\nChat history cleared. How can I help you manage your school today?`,
        timestamp: new Date()
      }]);
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 left-0"></div>
        <div className="absolute w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 top-0 right-0"></div>
        <div className="absolute w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 bottom-0 left-1/2"></div>
      </div>

      {/* Main Container */}
      <div className="relative h-full flex flex-col max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            {/* ATLAS AI Branding */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  A.T.L.A.S AI
                </h1>
                <p className="text-xs text-gray-600 font-medium">
                  Academic Tracking, Learning & Administration System
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={clearChat}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                title="Clear Chat"
              >
                <span>🗑️</span>
              </button>
              <button
                onClick={switchToDashboard}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <span>📊</span>
                <span>View Dashboard</span>
              </button>
            </div>
          </div>

          {/* Context Bar */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              📅 First Term
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
              📚 2025/2026
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              👤 {adminName}
            </span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`max-w-3xl ${message.role === 'user' ? 'ml-16' : 'mr-16'}`}>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-sm">🎓</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">ATLAS AI</span>
                    <span className="text-xs text-gray-400">• School Intelligence</span>
                  </div>
                )}
                
                <div
                  className={`rounded-2xl px-6 py-4 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-none'
                      : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-bl-none border border-gray-200/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="max-w-3xl mr-16">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm">🎓</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">ATLAS AI</span>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-bl-none px-6 py-4 shadow-lg border border-gray-200/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                    <span className="text-sm text-gray-600">Processing with AI tools...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions - Show when few messages */}
          {messages.length <= 1 && !isLoading && (
            <div className="max-w-5xl mx-auto animate-fadeIn">
              <p className="text-center text-sm font-semibold text-gray-700 mb-4">
                ✨ Quick Actions - Powered by 20 AI Tools
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action.query)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 rounded-xl p-4 text-left transition-all transform hover:scale-105 hover:shadow-xl group"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                      {action.icon}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm mb-1">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {action.query}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200/50 px-6 py-4 shadow-lg">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about school stats, generate reports, check approvals, monitor teachers..."
                className="flex-1 resize-none border-2 border-gray-300 focus:border-purple-500 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all bg-white/90 backdrop-blur-sm"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
              >
                <span className="text-2xl">🚀</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Try: "Generate CA1 report for John Doe and send to parent via WhatsApp" • 
              <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded text-xs font-mono ml-1">Enter</kbd> to send
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}