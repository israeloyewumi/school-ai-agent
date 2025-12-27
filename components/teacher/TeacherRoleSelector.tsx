// components/teacher/TeacherRoleSelector.tsx - Teacher Role Selection Component
"use client";

import { TeacherType } from '@/types/database';

interface TeacherRoleSelectorProps {
  onRoleSelected: (type: TeacherType) => void;
  onBack: () => void;
}

export default function TeacherRoleSelector({
  onRoleSelected,
  onBack
}: TeacherRoleSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">What type of teacher are you?</h2>
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          ← Back
        </button>
      </div>

      <p className="text-gray-600 mb-6">
        Select your teaching role. This will determine what you'll be responsible for.
      </p>

      <div className="space-y-4">
        {/* Class Teacher Only */}
        <button
          onClick={() => onRoleSelected('class_teacher')}
          className="w-full p-6 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-green-300 rounded-xl transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">👨‍🏫</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Class Teacher Only
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                You will be in charge of managing a specific class
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Handle attendance for your class</li>
                <li>• Manage discipline and merits</li>
                <li>• Monitor student progress</li>
                <li>• No subject teaching required</li>
              </ul>
            </div>
            <div className="text-green-600 text-xl">→</div>
          </div>
        </button>

        {/* Subject Teacher Only */}
        <button
          onClick={() => onRoleSelected('subject_teacher')}
          className="w-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">📚</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Subject Teacher Only
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                You will teach specific subjects across multiple classes
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Teach one or more subjects</li>
                <li>• Enter grades and assessments</li>
                <li>• Teach across different classes</li>
                <li>• No class management duties</li>
              </ul>
            </div>
            <div className="text-blue-600 text-xl">→</div>
          </div>
        </button>

        {/* Both */}
        <button
          onClick={() => onRoleSelected('both')}
          className="w-full p-6 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-200 hover:border-purple-300 rounded-xl transition-all text-left"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">🎓</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                Both (Class Teacher + Subject Teacher)
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                You will manage a class AND teach specific subjects
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• All class teacher responsibilities</li>
                <li>• Plus teach subjects to your class or others</li>
                <li>• Enter grades and manage attendance</li>
                <li>• Most comprehensive teaching role</li>
              </ul>
            </div>
            <div className="text-purple-600 text-xl">→</div>
          </div>
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 text-xl">ℹ️</span>
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Note:</p>
            <p>Your selection will be reviewed by the school admin before your account is activated.</p>
          </div>
        </div>
      </div>
    </div>
  );
}