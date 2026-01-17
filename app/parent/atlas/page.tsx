'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ATLAS AI - Full Screen Chat Interface for Parents
// app/parent/atlas/page.tsx

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ParentAtlasAI() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [parentId, setParentId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from localStorage
  useEffect(() => {
    const childId = localStorage.getItem('selectedChildId') || '';
    const storedParentId = localStorage.getItem('parentId') || '';
    setSelectedChildId(childId);
    setParentId(storedParentId);
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
        content: `👋 **Welcome to A.T.L.A.S AI!**

I'm your **Academic Tracking, Learning & Administration System** assistant. I can help you understand your child's progress across all areas:

📋 **Attendance** - View records and statistics
⭐ **Merit Points** - Check awards and behavior
📚 **Grades** - Review all academic assessments
💰 **Fees** - Check payment status

What would you like to know about your child today?`,
        timestamp: new Date()
      }]);
    }
  }, []);

  const quickActions = [
    { icon: '📊', label: 'Overall Summary', query: "How is my child doing overall?" },
    { icon: '📋', label: 'Attendance Status', query: "Show my child's attendance" },
    { icon: '⭐', label: 'Merit Points', query: "What are my child's merit points?" },
    { icon: '📚', label: 'Recent Grades', query: "Show recent grades and assessments" },
    { icon: '💰', label: 'Fee Status', query: "What is the fee payment status?" },
    { icon: '📈', label: 'Weekly Performance', query: "Show this week's performance" }
  ];

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
      const response = await fetch('/api/parent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          parentId: parentId,
          studentId: selectedChildId,
          term: 'First Term',
          session: '2025/2026'
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or contact support.',
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
    router.replace('/parent');
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob top-0 left-0"></div>
        <div className="absolute w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 top-0 right-0"></div>
        <div className="absolute w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 bottom-0 left-1/2"></div>
      </div>

      {/* Main Container */}
      <div className="relative h-full flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            {/* ATLAS AI Branding */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <span className="text-2xl">🤖</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
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
                onClick={switchToDashboard}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <span>📊</span>
                <span>View Dashboard</span>
              </button>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`max-w-2xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-sm">🤖</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">ATLAS AI</span>
                  </div>
                )}
                
                <div
                  className={`rounded-2xl px-6 py-4 shadow-lg ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none'
                      : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-bl-none border border-gray-200/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
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
              <div className="max-w-2xl mr-12">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm">🤖</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">ATLAS AI</span>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-bl-none px-6 py-4 shadow-lg border border-gray-200/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                    <span className="text-sm text-gray-600">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions - Show when few messages */}
          {messages.length <= 1 && !isLoading && (
            <div className="max-w-4xl mx-auto animate-fadeIn">
              <p className="text-center text-sm font-semibold text-gray-700 mb-4">
                ✨ Quick Actions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your child's attendance, grades, merits, or fees..."
                className="flex-1 resize-none border-2 border-gray-300 focus:border-purple-500 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all bg-white/90 backdrop-blur-sm"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
              >
                <span className="text-2xl">🚀</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Press <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded text-xs font-mono">Enter</kbd> to send, 
              <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded text-xs font-mono ml-1">Shift+Enter</kbd> for new line
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