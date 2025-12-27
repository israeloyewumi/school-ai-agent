// components/teacher/ClassTeacherForm.tsx - Class Selection Form
"use client";

import { useState, useEffect } from 'react';
import { ALL_CLASSES, ClassInfo } from '@/lib/config/schoolData';

interface ClassTeacherFormProps {
  selectedClass: { classId: string; className: string } | null;
  onClassSelected: (classId: string, className: string) => void;
}

export default function ClassTeacherForm({
  selectedClass,
  onClassSelected
}: ClassTeacherFormProps) {
  const [selectedLevel, setSelectedLevel] = useState<'Primary' | 'Junior Secondary' | 'Senior Secondary' | 'all'>('all');
  const [filteredClasses, setFilteredClasses] = useState<ClassInfo[]>(ALL_CLASSES);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let classes = ALL_CLASSES;

    // Filter by level
    if (selectedLevel !== 'all') {
      classes = classes.filter(c => c.level === selectedLevel);
    }

    // Filter by search term
    if (searchTerm) {
      classes = classes.filter(c => 
        c.className.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClasses(classes);
  }, [selectedLevel, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">📋 Class Teacher Assignment</h3>
        <p className="text-sm text-blue-700">
          Select the class you will be in charge of. As a class teacher, you'll manage attendance, discipline, and overall class welfare.
        </p>
      </div>

      {/* Level Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Level:
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['all', 'Primary', 'Junior Secondary', 'Senior Secondary'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level === 'all' ? 'All' : level.replace(' ', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Class:
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="e.g., Grade 5A, Grade 10B..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Your Class:
        </label>
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-2 border border-gray-200 rounded-lg">
          {filteredClasses.map((classInfo) => (
            <button
              key={classInfo.classId}
              onClick={() => onClassSelected(classInfo.classId, classInfo.className)}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                selectedClass?.classId === classInfo.classId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="font-bold text-lg">{classInfo.className}</div>
              <div className="text-xs text-gray-500 mt-1">{classInfo.level}</div>
            </button>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No classes found matching your search.
          </div>
        )}
      </div>

      {/* Selected Class Display */}
      {selectedClass && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-2xl">✓</span>
            <div>
              <p className="font-semibold text-green-900">Selected Class:</p>
              <p className="text-green-700">{selectedClass.className}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-xs text-yellow-800">
          ⚠️ <strong>Note:</strong> Your class assignment will be verified by the admin. If the class already has a teacher, you may be assigned to a different class.
        </p>
      </div>
    </div>
  );
}