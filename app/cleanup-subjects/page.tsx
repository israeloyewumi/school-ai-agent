'use client';

import { useState } from 'react';
import { initializeAllSubjects, getAllSubjects } from '@/lib/firebase/subjectManagement';
import { ALL_SUBJECTS } from '@/lib/config/schoolData';

export default function CleanupAndReinitialize() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const cleanupAndReinitialize = async () => {
    setLoading(true);
    setStatus('Starting cleanup and reinitialization...');
    
    try {
      // Step 1: Delete ALL existing subjects
      setStatus('Step 1/3: Deleting old subjects...');
      const response = await fetch('/api/cleanup-subjects', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup subjects');
      }
      
      const cleanupResult = await response.json();
      setStatus(`✅ Deleted ${cleanupResult.deletedCount} old subjects`);
      
      // Wait a moment for Firestore to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Initialize new subjects
      setStatus('Step 2/3: Creating 32 new subjects...');
      await initializeAllSubjects();
      setStatus('✅ Created 32 new subjects');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Verify
      setStatus('Step 3/3: Verifying subjects...');
      const allSubjects = await getAllSubjects();
      
      const configIds = ALL_SUBJECTS.map(s => s.subjectId);
      const dbIds = allSubjects.map(s => s.subjectId);
      
      const missingSubjects = configIds.filter(id => !dbIds.includes(id));
      const extraSubjects = dbIds.filter(id => !configIds.includes(id));
      
      setResults({
        expectedCount: configIds.length,
        actualCount: dbIds.length,
        missingSubjects,
        extraSubjects,
        success: missingSubjects.length === 0 && extraSubjects.length === 0
      });
      
      if (missingSubjects.length === 0 && extraSubjects.length === 0) {
        setStatus('✅ SUCCESS! All 32 subjects are correctly initialized!');
      } else {
        setStatus('⚠️ Verification found issues. See details below.');
      }
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            Subject Database Cleanup & Reinitialization
          </h1>
          
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">⚠️ Warning</h2>
            <p className="text-yellow-700 mb-4">
              This will <strong>DELETE ALL existing subjects</strong> and recreate them with the correct IDs.
            </p>
            <ul className="list-disc pl-6 text-yellow-700 space-y-1">
              <li>All teacher-subject assignments will be preserved in classes</li>
              <li>Only the subjects collection will be affected</li>
              <li>This will fix the ID mismatch problem</li>
            </ul>
          </div>

          <button
            onClick={cleanupAndReinitialize}
            disabled={loading}
            className="w-full bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-bold text-lg mb-6"
          >
            {loading ? 'Processing...' : '🔄 Clean Up & Reinitialize Subjects'}
          </button>

          {status && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">{status}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Verification Results</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600">Expected Subjects:</p>
                    <p className="text-2xl font-bold">{results.expectedCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Actual Subjects in DB:</p>
                    <p className={`text-2xl font-bold ${results.success ? 'text-green-600' : 'text-red-600'}`}>
                      {results.actualCount}
                    </p>
                  </div>
                </div>

                {results.success ? (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <p className="text-green-800 font-bold text-lg">
                      ✅ Perfect! All subjects are correctly initialized!
                    </p>
                  </div>
                ) : (
                  <>
                    {results.missingSubjects.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                        <p className="text-red-800 font-bold mb-2">
                          ❌ Missing Subjects ({results.missingSubjects.length}):
                        </p>
                        <ul className="list-disc pl-6">
                          {results.missingSubjects.map((id: string) => (
                            <li key={id} className="text-red-700 font-mono">{id}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {results.extraSubjects.length > 0 && (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                        <p className="text-orange-800 font-bold mb-2">
                          ⚠️ Extra Subjects ({results.extraSubjects.length}):
                        </p>
                        <ul className="list-disc pl-6">
                          {results.extraSubjects.map((id: string) => (
                            <li key={id} className="text-orange-700 font-mono">{id}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              {results.success && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-green-800 mb-2">
                    🎉 All Done! Next Steps:
                  </h3>
                  <ol className="list-decimal pl-6 text-green-700 space-y-2">
                    <li>Go to the teacher registration page</li>
                    <li>Try registering a teacher with subject assignments</li>
                    <li>The "Expected 32 subjects, found 22" error should be GONE!</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}