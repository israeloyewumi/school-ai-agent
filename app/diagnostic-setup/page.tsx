'use client';

import { useState } from 'react';
import { ALL_SUBJECTS } from '@/lib/config/schoolData';

export default function DiagnosticSetup() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // Count subjects in schoolData.ts
      const expectedSubjects = ALL_SUBJECTS;
      const expectedCount = expectedSubjects.length;
      const expectedIds = expectedSubjects.map(s => s.subjectId);

      // Check for duplicates in the array itself
      const uniqueIds = new Set(expectedIds);
      const hasDuplicates = uniqueIds.size !== expectedIds.length;

      // Find duplicates
      const duplicateIds: string[] = [];
      const seen = new Set<string>();
      expectedIds.forEach(id => {
        if (seen.has(id)) {
          if (!duplicateIds.includes(id)) {
            duplicateIds.push(id);
          }
        }
        seen.add(id);
      });

      // Get actual subjects from database
      const response = await fetch('/api/check-subjects');
      const dbData = await response.json();

      // Find missing subjects
      const dbSubjectIds = new Set(dbData.subjects.map((s: any) => s.subjectId));
      const missingSubjects = expectedIds.filter(id => !dbSubjectIds.has(id));
      const extraSubjects = dbData.subjects
        .filter((s: any) => !expectedIds.includes(s.subjectId))
        .map((s: any) => s.subjectId);

      setResults({
        expectedCount,
        actualCount: dbData.count,
        hasDuplicates,
        duplicateIds,
        missingSubjects,
        extraSubjects,
        expectedSubjects: expectedSubjects.map(s => ({
          id: s.subjectId,
          name: s.subjectName,
          category: s.category
        })),
        dbSubjects: dbData.subjects.map((s: any) => ({
          id: s.subjectId,
          name: s.subjectName || s.name
        }))
      });
    } catch (error) {
      console.error('Diagnostic error:', error);
      alert('Error running diagnostic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subject Database Diagnostic</h1>

        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 mb-6"
        >
          {loading ? 'Running Diagnostic...' : 'Run Diagnostic'}
        </button>

        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Expected Subjects:</p>
                  <p className="text-2xl font-bold">{results.expectedCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Actual Subjects in DB:</p>
                  <p className="text-2xl font-bold">{results.actualCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Has Duplicates in Config:</p>
                  <p className="text-2xl font-bold text-red-600">
                    {results.hasDuplicates ? 'YES' : 'NO'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Missing from DB:</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {results.missingSubjects.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Duplicate IDs in Config */}
            {results.duplicateIds.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-red-700 mb-4">
                  🚨 DUPLICATE SUBJECT IDs IN CONFIG
                </h2>
                <p className="mb-2">These subject IDs appear multiple times in your schoolData.ts:</p>
                <ul className="list-disc pl-6 space-y-1">
                  {results.duplicateIds.map((id: string) => (
                    <li key={id} className="text-red-600 font-mono">{id}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-red-600">
                  This is causing the filter to remove entries, reducing your subject count!
                </p>
              </div>
            )}

            {/* Missing Subjects */}
            {results.missingSubjects.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-300 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-orange-700 mb-4">
                  ⚠️ Missing Subjects ({results.missingSubjects.length})
                </h2>
                <p className="mb-2">These subjects are in config but NOT in database:</p>
                <ul className="list-disc pl-6 space-y-1">
                  {results.missingSubjects.map((id: string) => {
                    const subject = results.expectedSubjects.find((s: any) => s.id === id);
                    return (
                      <li key={id} className="text-orange-600">
                        <span className="font-mono">{id}</span>
                        {subject && <span className="text-gray-600"> - {subject.name}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Extra Subjects */}
            {results.extraSubjects.length > 0 && (
              <div className="bg-purple-50 border-2 border-purple-300 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-purple-700 mb-4">
                  Extra Subjects in DB
                </h2>
                <p className="mb-2">These subjects are in database but NOT in config:</p>
                <ul className="list-disc pl-6 space-y-1">
                  {results.extraSubjects.map((id: string) => (
                    <li key={id} className="text-purple-600 font-mono">{id}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All Expected Subjects */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">
                All Expected Subjects ({results.expectedCount})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {results.expectedSubjects.map((subject: any, idx: number) => (
                  <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                    <span className="font-mono text-xs text-blue-600">{subject.id}</span>
                    <br />
                    <span className="text-gray-700">{subject.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({subject.category})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}