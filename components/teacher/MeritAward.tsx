// components/teacher/MeritAward.tsx - Voice-Based Merit/Demerit Award (No Security Questions)
"use client";

import { useState, useEffect } from 'react';
import { getVoiceService } from '@/lib/voice/voiceService';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { awardMerit } from '@/lib/firebase/db';
import { MeritCategory } from '@/types/database';

interface MeritAwardProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  studentList: { id: string; name: string }[];
  term: string;
  session: string;
  onComplete: () => void;
  onCancel: () => void;
}

type MeritStep = 'select-type' | 'select-student' | 'enter-reason' | 'confirm' | 'saving' | 'complete';

const MERIT_CATEGORIES: { 
  positive: { value: MeritCategory; label: string; points: number }[];
  negative: { value: MeritCategory; label: string; points: number }[];
} = {
  positive: [
    { value: 'academic_excellence', label: 'Academic Excellence', points: 10 },
    { value: 'homework', label: 'Homework Excellence', points: 5 },
    { value: 'punctuality', label: 'Punctuality', points: 3 },
    { value: 'helpfulness', label: 'Helpfulness', points: 5 },
    { value: 'participation', label: 'Class Participation', points: 3 },
    { value: 'leadership', label: 'Leadership', points: 7 },
    { value: 'responsibility', label: 'Responsibility', points: 5 },
  ],
  negative: [
    { value: 'noise_making', label: 'Noise Making', points: -3 },
    { value: 'late_to_class', label: 'Late to Class', points: -2 },
    { value: 'missing_homework', label: 'Missing Homework', points: -5 },
    { value: 'disrespect', label: 'Disrespect', points: -7 },
    { value: 'phone_in_class', label: 'Phone in Class', points: -5 },
    { value: 'distraction', label: 'Causing Distraction', points: -3 },
  ]
};

export default function MeritAward({
  teacherId,
  teacherName,
  classId,
  className,
  studentList,
  term,
  session,
  onComplete,
  onCancel
}: MeritAwardProps) {
  const [step, setStep] = useState<MeritStep>('select-type');
  const [voiceService] = useState(() => getVoiceService());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  // Merit data
  const [isPositive, setIsPositive] = useState<boolean | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [category, setCategory] = useState<MeritCategory | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    voiceService.speak(
      `Award merit or demerit for ${className}. ` +
      `Say "merit" for positive points, or "demerit" for negative points.`
    );
    
    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, []);

  function startListening() {
    setError('');
    setIsListening(true);
    
    voiceService.startListening(
      (text) => {
        setTranscript(text);
        handleVoiceInput(text);
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        setError(`Voice error: ${err}`);
        setIsListening(false);
      }
    );
  }

  function handleVoiceInput(text: string) {
    const lowerText = text.toLowerCase().trim();
    
    switch (step) {
      case 'select-type':
        if (lowerText.includes('merit') && !lowerText.includes('demerit')) {
          setIsPositive(true);
          setStep('select-student');
          voiceService.speak('Merit selected. Which student?');
        } else if (lowerText.includes('demerit')) {
          setIsPositive(false);
          setStep('select-student');
          voiceService.speak('Demerit selected. Which student?');
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
        
      case 'select-student':
        const student = findStudentByName(text);
        if (student) {
          setSelectedStudent(student);
          setStep('enter-reason');
          voiceService.speak(
            `${student.name} selected. What's the reason? ` +
            `Say the category like "homework", "punctuality", "noise making", etc.`
          );
        } else if (lowerText.includes('cancel')) {
          onCancel();
        } else {
          voiceService.speak('Student not recognized. Please say the name clearly.');
        }
        break;
        
      case 'enter-reason':
        const matchedCategory = matchCategory(text, isPositive!);
        if (matchedCategory) {
          setCategory(matchedCategory.value);
          setPoints(matchedCategory.points);
          setReason(matchedCategory.label);
          
          setStep('confirm');
          voiceService.speak(
            `${isPositive ? 'Merit' : 'Demerit'} for ${selectedStudent!.name}: ` +
            `${matchedCategory.label}, ${Math.abs(matchedCategory.points)} points. ` +
            `Say "confirm" to save.`
          );
        } else if (lowerText.includes('other')) {
          // Custom reason
          voiceService.speak('Please type the custom reason and points manually.');
          // In full implementation, allow custom input
        } else {
          voiceService.speak('Category not recognized. Try saying "homework", "punctuality", "noise making", etc.');
        }
        break;
        
      case 'confirm':
        if (lowerText.includes('confirm') || lowerText.includes('yes')) {
          // No security verification needed - proceed directly to save
          voiceService.speak('Saving merit...');
          saveMerit();
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
    }
  }

  function findStudentByName(spokenName: string): { id: string; name: string } | null {
    const normalized = spokenName.toLowerCase().trim();
    
    for (const student of studentList) {
      if (student.name.toLowerCase() === normalized) {
        return student;
      }
    }
    
    for (const student of studentList) {
      const nameParts = student.name.toLowerCase().split(' ');
      if (nameParts.some(part => part === normalized || normalized.includes(part))) {
        return student;
      }
    }
    
    return null;
  }

  function matchCategory(text: string, positive: boolean): typeof MERIT_CATEGORIES.positive[0] | null {
    const lowerText = text.toLowerCase();
    const categories = positive ? MERIT_CATEGORIES.positive : MERIT_CATEGORIES.negative;
    
    for (const cat of categories) {
      const label = cat.label.toLowerCase();
      if (lowerText.includes(label) || label.includes(lowerText)) {
        return cat;
      }
      
      // Check individual words
      const words = label.split(' ');
      if (words.some(word => lowerText.includes(word))) {
        return cat;
      }
    }
    
    return null;
  }

  async function saveMerit() {
    setStep('saving');
    
    try {
      if (!selectedStudent || !category) {
        throw new Error('Missing required data');
      }
      
      // Save merit
      await awardMerit({
        studentId: selectedStudent.id,
        teacherId,
        points,
        category,
        reason,
        date: new Date(),
        term,
        session,
        classId
      });
      
      // Create audit log
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: points > 0 ? 'MERIT_AWARDED' : 'DEMERIT_GIVEN',
        details: `${points > 0 ? 'Awarded' : 'Gave'} ${Math.abs(points)} ${points > 0 ? 'merit' : 'demerit'} points to ${selectedStudent.name} for ${reason}`,
        affectedEntity: selectedStudent.id,
        affectedEntityType: 'student',
        afterData: { points, category, reason },
        success: true
      });
      
      voiceService.speak(
        `${isPositive ? 'Merit' : 'Demerit'} awarded to ${selectedStudent.name}. ` +
        `${Math.abs(points)} points for ${reason}. ` +
        `Forwarded to admin department.`
      );
      
      setStep('complete');
      
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err: any) {
      console.error('Error saving merit:', err);
      setError(err.message);
      voiceService.speak('Error saving merit. Please try again.');
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: points > 0 ? 'MERIT_AWARDED' : 'DEMERIT_GIVEN',
        details: `Failed to award merit/demerit`,
        affectedEntity: selectedStudent?.id || '',
        affectedEntityType: 'student',
        success: false,
        errorMessage: err.message
      });
      
      setStep('confirm');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">
            {isPositive === null ? '⭐' : isPositive ? '🌟' : '⚠️'}
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            {isPositive === null ? 'Merit/Demerit Award' : isPositive ? 'Merit Award' : 'Demerit'}
          </h2>
          <p className="text-gray-600 mt-2">{className}</p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {step === 'select-type' && (
            <div className="text-center py-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => {
                    setIsPositive(true);
                    setStep('select-student');
                    voiceService.speak('Merit selected. Which student?');
                  }}
                  className="p-6 bg-green-50 hover:bg-green-100 rounded-xl border-2 border-green-200 transition-all"
                >
                  <div className="text-4xl mb-2">🌟</div>
                  <div className="font-bold text-green-700">Merit</div>
                  <div className="text-xs text-green-600 mt-1">Award positive points</div>
                </button>
                
                <button
                  onClick={() => {
                    setIsPositive(false);
                    setStep('select-student');
                    voiceService.speak('Demerit selected. Which student?');
                  }}
                  className="p-6 bg-red-50 hover:bg-red-100 rounded-xl border-2 border-red-200 transition-all"
                >
                  <div className="text-4xl mb-2">⚠️</div>
                  <div className="font-bold text-red-700">Demerit</div>
                  <div className="text-xs text-red-600 mt-1">Deduct points</div>
                </button>
              </div>
              <p className="text-sm text-gray-500">Or use voice: Say "merit" or "demerit"</p>
            </div>
          )}

          {step === 'select-student' && (
            <div>
              <p className="text-lg mb-4 text-center">
                Select or say the student's name
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {studentList.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setStep('enter-reason');
                      voiceService.speak(`${student.name} selected. What's the reason?`);
                    }}
                    className="p-3 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                  >
                    <div className="font-medium text-sm">{student.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'enter-reason' && selectedStudent && (
            <div>
              <p className="text-lg mb-4 text-center">
                Reason for {selectedStudent.name}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(isPositive ? MERIT_CATEGORIES.positive : MERIT_CATEGORIES.negative).map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value);
                      setPoints(cat.points);
                      setReason(cat.label);
                      setStep('confirm');
                      voiceService.speak(
                        `${isPositive ? 'Merit' : 'Demerit'} for ${selectedStudent.name}: ` +
                        `${cat.label}, ${Math.abs(cat.points)} points. Say "confirm" to save.`
                      );
                    }}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all flex items-center justify-between"
                  >
                    <span className="font-medium">{cat.label}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      cat.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cat.points > 0 ? '+' : ''}{cat.points}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'confirm' && selectedStudent && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Confirm Details</h3>
              <div className={`rounded-lg p-6 ${
                isPositive ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Student</p>
                    <p className="text-xl font-bold">{selectedStudent.name}</p>
                  </div>
                  <div className={`text-4xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {points > 0 ? '+' : ''}{points}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="font-medium">{reason}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    This {isPositive ? 'merit' : 'demerit'} will be forwarded to admin department and added to the student's record.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Saving...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-2xl font-bold text-green-600 mb-2">
                {isPositive ? 'Merit' : 'Demerit'} Awarded!
              </p>
              <p className="text-gray-600">Forwarded to admin department</p>
            </div>
          )}

          {transcript && step !== 'complete' && (
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-sm font-medium">{transcript}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-700 rounded-lg p-3">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        {step !== 'saving' && step !== 'complete' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startListening}
              disabled={isListening}
              className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {isListening ? (
                <>
                  <span className="animate-pulse">🎤</span>
                  Listening...
                </>
              ) : (
                <>
                  🎤 Speak
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}