// components/parent/ParentChildrenForm.tsx - Add Children During Parent Registration
"use client";

import { useState } from 'react';
import { ALL_CLASSES } from '@/lib/config/schoolData';

interface Child {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  age: number;
  classId: string;
  className: string;
}

interface ParentChildrenFormProps {
  children: Child[];
  onChildrenChanged: (children: Child[]) => void;
}

export default function ParentChildrenForm({
  children,
  onChildrenChanged
}: ParentChildrenFormProps) {
  const [editingChild, setEditingChild] = useState<Child>({
    firstName: '',
    lastName: '',
    gender: 'male',
    dateOfBirth: new Date(),
    age: 0,
    classId: '',
    className: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'Primary' | 'Junior Secondary' | 'Senior Secondary' | 'All'>('All');

  // Filter classes by level
  const filteredClasses = levelFilter === 'All' 
    ? ALL_CLASSES 
    : ALL_CLASSES.filter(c => c.level === levelFilter);

  function calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  function handleDateChange(dateString: string) {
    const date = new Date(dateString);
    const age = calculateAge(date);
    
    setEditingChild(prev => ({
      ...prev,
      dateOfBirth: date,
      age
    }));
  }

  function handleClassSelect(classId: string, className: string) {
    setEditingChild(prev => ({
      ...prev,
      classId,
      className
    }));
  }

  function addChild() {
    if (!editingChild.firstName || !editingChild.lastName || !editingChild.classId) {
      alert('Please fill all required fields');
      return;
    }

    onChildrenChanged([...children, editingChild]);
    
    // Reset form
    setEditingChild({
      firstName: '',
      lastName: '',
      gender: 'male',
      dateOfBirth: new Date(),
      age: 0,
      classId: '',
      className: ''
    });
    setIsAdding(false);
  }

  function removeChild(index: number) {
    const updated = children.filter((_, i) => i !== index);
    onChildrenChanged(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Children/Wards ({children.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Child
          </button>
        )}
      </div>

      {/* Existing Children List */}
      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((child, index) => (
            <div
              key={index}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">
                    {child.gender === 'male' ? '👦' : '👧'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {child.className} • Age {child.age} • {child.gender === 'male' ? 'Male' : 'Female'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeChild(index)}
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Child Form */}
      {isAdding && (
        <div className="bg-white border-2 border-blue-300 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Add New Child</h4>

          <div className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editingChild.firstName}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ahmed"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editingChild.lastName}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Bello"
                  required
                />
              </div>
            </div>

            {/* Gender & Date of Birth */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={editingChild.gender}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={editingChild.dateOfBirth.toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Age Display */}
            {editingChild.age > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Age:</strong> {editingChild.age} years old
                </p>
              </div>
            )}

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class *
              </label>

              {/* Level Filter */}
              <div className="flex gap-2 mb-3">
                {(['All', 'Primary', 'Junior Secondary', 'Senior Secondary'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevelFilter(level)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      levelFilter === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Class Grid */}
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {filteredClasses.map((cls) => (
                  <button
                    key={cls.classId}
                    type="button"
                    onClick={() => handleClassSelect(cls.classId, cls.className)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      editingChild.classId === cls.classId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-sm">{cls.className}</div>
                    <div className="text-xs text-gray-500 mt-1">{cls.level}</div>
                  </button>
                ))}
              </div>

              {editingChild.classId && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Selected: <strong>{editingChild.className}</strong>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addChild}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Add Child
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {children.length === 0 && !isAdding && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">👶</div>
          <p className="text-gray-600 mb-4">No children added yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Add Your First Child
          </button>
        </div>
      )}

      {/* Minimum Requirement Notice */}
      {children.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Note:</strong> You must add at least one child to complete registration.
          </p>
        </div>
      )}
    </div>
  );
}