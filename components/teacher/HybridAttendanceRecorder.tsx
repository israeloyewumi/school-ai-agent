// components/teacher/HybridAttendanceRecorder.tsx - Visual Selection + Voice Confirmation
"use client";

import { useState, useEffect } from 'react';
import { getVoiceService } from '@/lib/voice/voiceService';
import { isWithinEditWindow } from '@/lib/firebase/dataLocking';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { markAttendance } from '@/lib/firebase/db';
import { Timestamp } from 'firebase/firestore';
import type { Student } from '@/types/database';

interface HybridAttendanceRecorderProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  totalStudents: number;
  studentList: Student[];
  term: string;
  session: string;
  onComplete: () => void;
  onCancel: () => void;
}

type RecordingStep = 'select-mode' | 'visual-selection' | 'voice-confirmation' | 'saving' | 'complete';
type AttendanceMode = 'visual' | 'voice' | 'admission-number' | null;

export default function HybridAttendanceRecorder({
  teacherId,
  teacherName,
  classId,
  className,
  totalStudents,
  studentList,
  term,
  session,
  onComplete,
  onCancel
}: HybridAttendanceRecorderProps) {
  const [step, setStep] = useState<RecordingStep>('select-mode');
  const [mode, setMode] = useState<AttendanceMode>(null);
  const [voiceService] = useState(() => getVoiceService());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  // Visual selection state
  const [selectedAbsentIds, setSelectedAbsentIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  
  // Attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    voiceService.speak(`Recording attendance for ${className}. Please choose your preferred method.`);
    
    return () => {
      voiceService.stopListening();
    };
  }, []);

  function handleModeSelect(selectedMode: AttendanceMode) {
    setMode(selectedMode);
    
    if (selectedMode === 'visual') {
      setStep('visual-selection');
      voiceService.speak('Visual mode selected. Tap or click to mark students as absent, then click Review to confirm.');
    } else if (selectedMode === 'voice') {
      // Redirect to original voice-only component
      alert('Voice-only mode - please use the standard attendance recorder');
      onCancel();
    } else if (selectedMode === 'admission-number') {
      setStep('visual-selection');
      voiceService.speak('Admission number mode. Select absent students by their admission numbers.');
    }
  }

  function toggleStudentAbsent(studentId: string) {
    const newSet = new Set(selectedAbsentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedAbsentIds(newSet);
  }

  function handleReviewSelection() {
    if (selectedAbsentIds.size === 0) {
      voiceService.speak('Perfect attendance! All students are present. Say confirm to save.');
    } else {
      const absentStudents = studentList
        .filter(s => selectedAbsentIds.has(s.id))
        .map(s => `${s.firstName} ${s.lastName}`);
      
      voiceService.speak(
        `You marked ${selectedAbsentIds.size} student${selectedAbsentIds.size !== 1 ? 's' : ''} as absent: ${absentStudents.join(', ')}. Say confirm to save, or go back to modify.`
      );
    }
    
    prepareAttendanceRecords();
    setStep('voice-confirmation');
  }

  function prepareAttendanceRecords() {
    const records = studentList.map(student => {
      const isAbsent = selectedAbsentIds.has(student.id);
      
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        classId,
        date: new Date(),
        status: isAbsent ? 'absent' : 'present',
        markedBy: teacherId,
        markedAt: new Date(),
        term,
        session
      };
    });
    
    setAttendanceRecords(records);
  }

  function startListening() {
    setError('');
    setIsListening(true);
    
    voiceService.startListening(
      (text) => {
        setTranscript(text);
        handleVoiceConfirmation(text);
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

  function handleVoiceConfirmation(text: string) {
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText.includes('confirm') || lowerText.includes('yes')) {
      checkEditWindowAndProceed();
    } else if (lowerText.includes('back') || lowerText.includes('modify')) {
      setStep('visual-selection');
      voiceService.speak('Going back. Make your changes and click Review again.');
    } else if (lowerText.includes('cancel')) {
      onCancel();
    }
  }

  async function checkEditWindowAndProceed() {
    setStep('saving');
    voiceService.speak('Saving attendance...');
    
    try {
      const windowCheck = await isWithinEditWindow(term, session, 'attendance', classId);
      
      if (!windowCheck.allowed) {
        setError(windowCheck.reason || 'Cannot record attendance at this time');
        voiceService.speak(windowCheck.reason || 'Cannot record attendance at this time');
        setStep('voice-confirmation');
        return;
      }
      
      saveAttendance();
    } catch (err: any) {
      setError(err.message);
      voiceService.speak('Error checking permissions.');
      setStep('voice-confirmation');
    }
  }

  async function saveAttendance() {
    try {
      for (const record of attendanceRecords) {
        await markAttendance({
          studentId: record.studentId,
          classId: record.classId,
          date: Timestamp.fromDate(record.date),
          status: record.status,
          markedBy: record.markedBy,
          markedAt: Timestamp.fromDate(record.markedAt),
          term: record.term,
          session: record.session
        });
      }
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'ATTENDANCE_RECORDED',
        details: `Recorded attendance for ${className}: ${totalStudents - selectedAbsentIds.size} present, ${selectedAbsentIds.size} absent (Hybrid mode)`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        afterData: attendanceRecords,
        success: true
      });
      
      const presentCount = totalStudents - selectedAbsentIds.size;
      
      voiceService.speak(
        `Attendance saved successfully. ${presentCount} students present, ${selectedAbsentIds.size} absent. Attendance forwarded to admin department.`,
        {
          onEnd: () => {
            setTimeout(() => {
              onComplete();
            }, 2000);
          }
        }
      );
      
      setStep('complete');
      
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err.message);
      voiceService.speak('Error saving attendance. Please try again.');
      setStep('voice-confirmation');
    }
  }

  const filteredStudents = searchFilter
    ? studentList.filter(s => {
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const admNum = s.admissionNumber.toLowerCase();
        const filter = searchFilter.toLowerCase();
        return fullName.includes(filter) || admNum.includes(filter);
      })
    : studentList;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-3xl font-bold text-gray-800">Attendance Recording</h2>
          <p className="text-gray-600 mt-2">
            {className} • {totalStudents} Students
          </p>
        </div>

        {/* MODE SELECTION */}
        {step === 'select-mode' && (
          <div className="space-y-4">
            <p className="text-center text-gray-700 mb-6">
              Choose your preferred attendance recording method:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Visual Mode */}
              <button
                onClick={() => handleModeSelect('visual')}
                className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300 rounded-xl transition-all text-left group"
              >
                <div className="text-4xl mb-3">👆</div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Visual Selection</h3>
                <p className="text-sm text-blue-700">
                  Tap/click absent students from a list
                </p>
                <div className="mt-4">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    ⭐ Recommended
                  </span>
                </div>
                <ul className="mt-3 text-xs text-blue-600 space-y-1">
                  <li>✓ Works with difficult names</li>
                  <li>✓ Fast and accurate</li>
                  <li>✓ Search by name/number</li>
                </ul>
              </button>

              {/* Voice Only Mode */}
              <button
                onClick={() => handleModeSelect('voice')}
                className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-300 rounded-xl transition-all text-left"
              >
                <div className="text-4xl mb-3">🎤</div>
                <h3 className="text-lg font-bold text-purple-900 mb-2">Voice Only</h3>
                <p className="text-sm text-purple-700">
                  Speak student names (original method)
                </p>
                <ul className="mt-3 text-xs text-purple-600 space-y-1">
                  <li>✓ Hands-free</li>
                  <li>✓ Good for short names</li>
                  <li>⚠️ May struggle with long names</li>
                </ul>
              </button>

              {/* Admission Number Mode */}
              <button
                onClick={() => handleModeSelect('admission-number')}
                className="p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-300 rounded-xl transition-all text-left"
              >
                <div className="text-4xl mb-3">🔢</div>
                <h3 className="text-lg font-bold text-green-900 mb-2">Admission Numbers</h3>
                <p className="text-sm text-green-700">
                  Select by student ID/number
                </p>
                <ul className="mt-3 text-xs text-green-600 space-y-1">
                  <li>✓ Universal solution</li>
                  <li>✓ No name pronunciation needed</li>
                  <li>✓ Clear and unambiguous</li>
                </ul>
              </button>
            </div>
          </div>
        )}

        {/* VISUAL SELECTION */}
        {step === 'visual-selection' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Mark Absent Students</h3>
                <p className="text-sm text-gray-600">
                  {selectedAbsentIds.size} selected • {totalStudents - selectedAbsentIds.size} present
                </p>
              </div>
              <button
                onClick={() => setStep('select-mode')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Change Mode
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search by name or admission number..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Student List */}
            <div className="max-h-96 overflow-y-auto border-2 border-gray-200 rounded-lg">
              {filteredStudents.map((student) => {
                const isAbsent = selectedAbsentIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleStudentAbsent(student.id)}
                    className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                      isAbsent ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isAbsent 
                              ? 'bg-red-500 border-red-500 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isAbsent && '✓'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {student.admissionNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isAbsent 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isAbsent ? 'ABSENT' : 'PRESENT'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSelection}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* VOICE CONFIRMATION */}
        {step === 'voice-confirmation' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm Selection</h3>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Present</p>
                  <p className="text-4xl font-bold text-green-600">{totalStudents - selectedAbsentIds.size}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Absent</p>
                  <p className="text-4xl font-bold text-red-600">{selectedAbsentIds.size}</p>
                </div>
              </div>
            </div>

            {selectedAbsentIds.size > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">Absent Students:</p>
                <ul className="space-y-1">
                  {studentList
                    .filter(s => selectedAbsentIds.has(s.id))
                    .map(s => (
                      <li key={s.id} className="text-sm text-red-700">
                        • {s.firstName} {s.lastName} ({s.admissionNumber})
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {transcript && (
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep('visual-selection')}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                ← Go Back
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
                    🎤 Say "Confirm"
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SAVING */}
        {step === 'saving' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Saving attendance...</p>
          </div>
        )}

        {/* COMPLETE */}
        {step === 'complete' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-2xl font-bold text-green-600 mb-2">Attendance Saved!</p>
            <p className="text-gray-600">Forwarded to admin department</p>
          </div>
        )}
      </div>
    </div>
  );
}