// app/setup/page.tsx - One-time School Setup Page
"use client";

import { useState } from 'react';
import { initializeAllClasses } from '@/lib/firebase/classManagement';
import { initializeAllSubjects } from '@/lib/firebase/subjectManagement';

export default function SetupPage() {
  const [step, setStep] = useState<'ready' | 'initializing' | 'complete' | 'error'>('ready');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  async function handleInitialize() {
    setStep('initializing');
    setError('');

    try {
      // Step 1: Initialize classes
      setProgress('Creating all classes (Grade 1-12, sections A-D)...');
      await initializeAllClasses();
      setProgress('✅ Classes created! (48 classes total)');
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Initialize subjects
      setProgress('Creating all Nigerian curriculum subjects...');
      await initializeAllSubjects();
      setProgress('✅ Subjects created!');

      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('complete');
    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Initialization failed');
      setStep('error');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏫</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">School Setup</h1>
          <p className="text-gray-600">
            Initialize your school database with classes and subjects
          </p>
        </div>

        {/* Ready State */}
        {step === 'ready' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-3">⚠️ Important Information</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>✓ This setup creates <strong>48 classes</strong> (Grade 1-12, sections A-D)</li>
                <li>✓ This setup creates <strong>all Nigerian curriculum subjects</strong></li>
                <li>✓ This is required before approving teachers</li>
                <li>⚠️ <strong>Only run this ONCE</strong> - running again will overwrite data</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> If you've already run this setup before, you don't need to run it again.
              </p>
            </div>

            <button
              onClick={handleInitialize}
              className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-lg transition-colors"
            >
              🚀 Initialize School Database
            </button>

            <p className="text-center text-sm text-gray-500">
              This process takes about 10-15 seconds
            </p>
          </div>
        )}

        {/* Initializing State */}
        {step === 'initializing' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Initializing...</h3>
              <p className="text-gray-600">{progress}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">
                Please wait, do not close this page...
              </p>
            </div>
          </div>
        )}

        {/* Complete State */}
        {step === 'complete' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">Setup Complete!</h3>
              <p className="text-gray-600 mb-6">Your school database is ready to use</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-bold text-green-900 mb-3">What's been created:</h4>
              <ul className="text-sm text-green-700 space-y-2">
                <li>✓ <strong>48 Classes</strong> - Grade 1A through Grade 12D</li>
                <li>✓ <strong>35+ Subjects</strong> - All Nigerian curriculum subjects</li>
                <li>✓ All classes are ready for teacher assignments</li>
                <li>✓ All subjects are ready for teacher assignments</li>
              </ul>
            </div>

            <div className="space-y-3">
              <a
                href="/admin"
                className="block w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-center transition-colors"
              >
                Go to Admin Dashboard
              </a>
              <a
                href="/"
                className="block w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium text-center transition-colors"
              >
                Go to Home
              </a>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> You can now approve teacher registrations. Teachers will be automatically assigned to their requested classes and subjects.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-red-600 mb-2">Setup Failed</h3>
              <p className="text-gray-600 mb-6">An error occurred during initialization</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-mono">{error}</p>
            </div>

            <button
              onClick={() => setStep('ready')}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}