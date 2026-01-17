// components/teacher/AttendanceRecorder.tsx - FIXED: Handle Student objects correctly
"use client";

import { useState, useEffect } from 'react';
import { getVoiceService } from '@/lib/voice/voiceService';
import { isWithinEditWindow } from '@/lib/firebase/dataLocking';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { markAttendance } from '@/lib/firebase/db';
import { Timestamp } from 'firebase/firestore';
import { smartParseNumber } from '@/lib/utils/numberParser';
import type { Student } from '@/types/database';

interface AttendanceRecorderProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  totalStudents: number;
  studentList: Student[]; // ✅ FIXED: Changed from { id: string; name: string }[] to Student[]
  term: string;
  session: string;
  onComplete: () => void;
  onCancel: () => void;
}

type RecordingStep = 'confirm-class' | 'count-present' | 'name-absent' | 'confirm' | 'saving' | 'complete';

export default function AttendanceRecorder({
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
}: AttendanceRecorderProps) {
  const [step, setStep] = useState<RecordingStep>('confirm-class');
  const [voiceService] = useState(() => getVoiceService());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  // Attendance data
  const [presentCount, setPresentCount] = useState<number | null>(null);
  const [absentStudentNames, setAbsentStudentNames] = useState<string[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    // Speak initial instruction
    voiceService.speak(`Recording attendance for ${className}. There are ${totalStudents} students enrolled. Say "confirm" to continue, or "cancel" to abort.`);
    
    return () => {
      // Only stop listening, don't stop speaking (let speech finish)
      voiceService.stopListening();
      // Don't call voiceService.stopSpeaking() - let completion messages finish
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
      case 'confirm-class':
        if (lowerText.includes('confirm') || lowerText.includes('yes')) {
          setStep('count-present');
          voiceService.speak(`How many students are present today?`);
        } else if (lowerText.includes('cancel') || lowerText.includes('no')) {
          onCancel();
        }
        break;
        
      case 'count-present':
        const count = smartParseNumber(text);
        if (count !== null && count >= 0 && count <= totalStudents) {
          setPresentCount(count);
          const absentCount = totalStudents - count;
          
          if (absentCount === 0) {
            voiceService.speak(`All ${totalStudents} students are present. Perfect attendance! Say "confirm" to save.`);
            prepareAttendanceRecords(count, []);
            setStep('confirm');
          } else {
            voiceService.speak(`${count} students present, ${absentCount} absent. Please name the absent students, one at a time.`);
            setStep('name-absent');
          }
        } else {
          voiceService.speak(`Invalid number. Please say a number between 0 and ${totalStudents}. Try saying the number clearly, like "twenty three" or "5".`);
        }
        break;
        
      case 'name-absent':
        // Try to match student name
        const matchedStudent = findStudentByName(text);
        
        if (matchedStudent) {
          // ✅ FIXED: Build full name from firstName and lastName
          const fullName = `${matchedStudent.firstName} ${matchedStudent.lastName}`;
          const newAbsentList = [...absentStudentNames, fullName];
          setAbsentStudentNames(newAbsentList);
          
          const expectedAbsent = totalStudents - (presentCount || 0);
          
          if (newAbsentList.length < expectedAbsent) {
            voiceService.speak(`${fullName} marked as absent. ${expectedAbsent - newAbsentList.length} more to go.`);
          } else {
            voiceService.speak(`All absent students recorded. Let me read them back: ${newAbsentList.join(', ')}. Say "confirm" to save, or "modify" to make changes.`);
            prepareAttendanceRecords(presentCount!, newAbsentList);
            setStep('confirm');
          }
        } else {
          voiceService.speak(`I didn't recognize that name. Please say the name clearly, or say "cancel" to abort.`);
        }
        break;
        
      case 'confirm':
        if (lowerText.includes('confirm') || lowerText.includes('yes')) {
          checkEditWindowAndProceed();
        } else if (lowerText.includes('modify') || lowerText.includes('change')) {
          setStep('count-present');
          setPresentCount(null);
          setAbsentStudentNames([]);
          voiceService.speak(`Let's start over. How many students are present?`);
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
    }
  }

  // ✅ FIXED: Updated to work with Student objects
  function findStudentByName(spokenName: string): Student | null {
    const normalized = spokenName.toLowerCase().trim();
    
    console.log('🔍 Searching for student:', normalized);
    console.log('📋 Available students:', studentList.length);
    
    // Try exact match on full name
    for (const student of studentList) {
      if (!student.firstName || !student.lastName) {
        console.warn('⚠️ Student missing name fields:', student);
        continue;
      }
      
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      
      if (fullName === normalized) {
        console.log('✅ Exact match found:', fullName);
        return student;
      }
    }
    
    // Try partial match (first name OR last name)
    for (const student of studentList) {
      if (!student.firstName || !student.lastName) continue;
      
      const firstName = student.firstName.toLowerCase();
      const lastName = student.lastName.toLowerCase();
      
      // Check if spoken name contains first name or last name
      if (normalized.includes(firstName) || normalized.includes(lastName)) {
        console.log('✅ Partial match found:', `${student.firstName} ${student.lastName}`);
        return student;
      }
      
      // Check if first name or last name contains spoken name
      if (firstName.includes(normalized) || lastName.includes(normalized)) {
        console.log('✅ Fuzzy match found:', `${student.firstName} ${student.lastName}`);
        return student;
      }
    }
    
    console.log('❌ No match found for:', normalized);
    return null;
  }

  // ✅ FIXED: Updated to use Student objects
  function prepareAttendanceRecords(present: number, absentNames: string[]) {
    const records = studentList.map(student => {
      const fullName = `${student.firstName} ${student.lastName}`;
      const isAbsent = absentNames.includes(fullName);
      
      return {
        studentId: student.id,
        studentName: fullName,
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

  async function checkEditWindowAndProceed() {
    setStep('saving');
    voiceService.speak('Checking permissions...');
    
    try {
      const windowCheck = await isWithinEditWindow(term, session, 'attendance', classId);
      
      if (!windowCheck.allowed) {
        setError(windowCheck.reason || 'Cannot record attendance at this time');
        voiceService.speak(windowCheck.reason || 'Cannot record attendance at this time');
        setStep('confirm');
        return;
      }
      
      voiceService.speak('Saving attendance...');
      saveAttendance();
    } catch (err: any) {
      setError(err.message);
      voiceService.speak('Error checking permissions.');
      setStep('confirm');
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
        details: `Recorded attendance for ${className}: ${presentCount} present, ${absentStudentNames.length} absent`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        afterData: attendanceRecords,
        success: true
      });
      
      // ✅ FIXED: Wait for speech to finish before closing
      voiceService.speak(
        `Attendance saved successfully. ${presentCount} students present, ${absentStudentNames.length} absent. Attendance forwarded to admin department.`,
        {
          onEnd: () => {
            // Wait 2 seconds after speech finishes, then close
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
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'ATTENDANCE_RECORDED',
        details: `Failed to record attendance for ${className}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
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
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-3xl font-bold text-gray-800">Attendance Recording</h2>
          <p className="text-gray-600 mt-2">
            {className} • {totalStudents} Students
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {['confirm-class', 'count-present', 'name-absent', 'confirm', 'saving'].map((s, i) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full ${
                  step === s ? 'bg-blue-500' : 
                  ['confirm-class', 'count-present', 'name-absent', 'confirm'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {step === 'confirm-class' && (
            <div className="text-center">
              <p className="text-lg mb-4">
                Recording attendance for <strong>{className}</strong>
              </p>
              <p className="text-gray-600">
                Total enrolled students: <strong>{totalStudents}</strong>
              </p>
            </div>
          )}

          {step === 'count-present' && (
            <div className="text-center">
              <p className="text-lg mb-4">
                How many students are <strong>present</strong> today?
              </p>
              {presentCount !== null && (
                <div className="text-3xl font-bold text-blue-600">
                  {presentCount}
                </div>
              )}
            </div>
          )}

          {step === 'name-absent' && (
            <div>
              <p className="text-lg mb-4 text-center">
                Name the absent students
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Absent students:</p>
                {absentStudentNames.length > 0 ? (
                  <ul className="space-y-1">
                    {absentStudentNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-red-500">✗</span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400">None yet...</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {totalStudents - (presentCount || 0) - absentStudentNames.length} more to name
                </p>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Summary</h3>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Present</p>
                    <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{absentStudentNames.length}</p>
                  </div>
                </div>
              </div>
              
              {absentStudentNames.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 mb-2">Absent Students:</p>
                  <ul className="space-y-1">
                    {absentStudentNames.map((name, i) => (
                      <li key={i} className="text-sm text-red-700">• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'saving' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-2xl font-bold text-green-600 mb-2">Attendance Saved!</p>
              <p className="text-gray-600">Forwarded to admin department</p>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && step !== 'complete' && (
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">You said:</p>
              <p className="text-sm font-medium">{transcript}</p>
            </div>
          )}

          {/* Error Display */}
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