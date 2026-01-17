// components/teacher/SubjectTeacherForm.tsx - Subject Selection Form
"use client";

import { useState, useEffect } from 'react';
import { ALL_SUBJECTS, SubjectInfo, ALL_CLASSES, ClassInfo } from '@/lib/config/schoolData';

interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  classes: string[];
}

interface SubjectTeacherFormProps {
  selectedSubjects: SelectedSubject[];
  onSubjectsChanged: (subjects: SelectedSubject[]) => void;
}

export default function SubjectTeacherForm({
  selectedSubjects,
  onSubjectsChanged
}: SubjectTeacherFormProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectInfo[]>(ALL_SUBJECTS);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    let subjects = ALL_SUBJECTS;

    if (categoryFilter !== 'all') {
      subjects = subjects.filter(s => s.category === categoryFilter);
    }

    setFilteredSubjects(subjects);
  }, [categoryFilter]);

  function handleSubjectToggle(subject: SubjectInfo) {
    const isSelected = selectedSubjects.some(s => s.subjectId === subject.subjectId);

    if (isSelected) {
      // Remove subject
      onSubjectsChanged(selectedSubjects.filter(s => s.subjectId !== subject.subjectId));
    } else {
      // Add subject with empty classes
      onSubjectsChanged([...selectedSubjects, {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        classes: []
      }]);
      setActiveSubject(subject.subjectId);
    }
  }

  function handleClassToggle(subjectId: string, classId: string) {
    const updatedSubjects = selectedSubjects.map(subject => {
      if (subject.subjectId === subjectId) {
        const hasClass = subject.classes.includes(classId);
        return {
          ...subject,
          classes: hasClass
            ? subject.classes.filter(c => c !== classId)
            : [...subject.classes, classId]
        };
      }
      return subject;
    });

    onSubjectsChanged(updatedSubjects);
  }

  const categories = Array.from(new Set(ALL_SUBJECTS.map(s => s.category)));

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-bold text-purple-900 mb-2">📚 Subject Teaching Assignment</h3>
        <p className="text-sm text-purple-700">
          Select the subjects you will teach and specify which classes you'll teach them to.
        </p>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Category:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              categoryFilter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-3 py-1 rounded-full text-sm ${
                categoryFilter === category
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Subjects: ({selectedSubjects.length} selected)
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
          {filteredSubjects.map((subject) => {
            const isSelected = selectedSubjects.some(s => s.subjectId === subject.subjectId);
            return (
              <button
                key={subject.subjectId}
                onClick={() => handleSubjectToggle(subject)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{subject.subjectName}</div>
                    <div className="text-xs text-gray-500">{subject.category}</div>
                  </div>
                  {isSelected && (
                    <span className="text-purple-600 text-lg">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class Assignment for Each Subject */}
      {selectedSubjects.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800">
            Assign Classes for Each Subject:
          </h4>

          {selectedSubjects.map((subject) => {
            const subjectInfo = ALL_SUBJECTS.find(s => s.subjectId === subject.subjectId);
            if (!subjectInfo) return null;

            // Filter classes applicable for this subject
            const applicableClasses = ALL_CLASSES.filter(cls =>
              subjectInfo.applicableGrades.includes(cls.grade)
            );

            const isExpanded = activeSubject === subject.subjectId;

            return (
              <div key={subject.subjectId} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setActiveSubject(isExpanded ? null : subject.subjectId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{subject.subjectName}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {subject.classes.length} {subject.classes.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>
                  <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-3">
                      Select classes where you'll teach {subject.subjectName}:
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {applicableClasses.map((cls) => {
                        const isSelected = subject.classes.includes(cls.classId);
                        return (
                          <button
                            key={cls.classId}
                            onClick={() => handleClassToggle(subject.subjectId, cls.classId)}
                            className={`p-2 rounded text-sm ${
                              isSelected
                                ? 'bg-purple-500 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {cls.className}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedSubjects.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          Please select at least one subject to teach.
        </div>
      )}

      {selectedSubjects.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-green-600 text-xl">✓</span>
            <div className="text-sm">
              <p className="font-semibold text-green-900 mb-1">Selected Subjects ({selectedSubjects.length}):</p>
              <ul className="text-green-700 space-y-1">
                {selectedSubjects.map((subject) => (
                  <li key={subject.subjectId}>
                    <strong>{subject.subjectName}</strong> - {subject.classes.length} {subject.classes.length === 1 ? 'class' : 'classes'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}