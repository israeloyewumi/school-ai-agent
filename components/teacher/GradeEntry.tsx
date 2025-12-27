// components/teacher/GradeEntry.tsx - FIXED Voice-Based Grade Entry
"use client";

import { useState, useEffect } from 'react';
import { getVoiceService } from '@/lib/voice/voiceService';
import { isWithinEditWindow } from '@/lib/firebase/dataLocking';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { recordResult } from '@/lib/firebase/db';
import { Timestamp } from 'firebase/firestore';
import { smartParseNumber } from '@/lib/utils/numberParser';

interface GradeEntryProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: 'ca1' | 'ca2' | 'exam';
  studentList: { id: string; name: string }[];
  term: string;
  session: string;
  maxScore: number;
  onComplete: () => void;
  onCancel: () => void;
}

type GradeStep = 'intro' | 'recording' | 'readback' | 'confirm' | 'saving' | 'complete';

interface StudentGrade {
  studentId: string;
  studentName: string;
  score: number;
}

export default function GradeEntry({
  teacherId,
  teacherName,
  classId,
  className,
  subjectId,
  subjectName,
  assessmentType,
  studentList,
  term,
  session,
  maxScore,
  onComplete,
  onCancel
}: GradeEntryProps) {
  const [step, setStep] = useState<GradeStep>('intro');
  const [voiceService] = useState(() => getVoiceService());
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  useEffect(() => {
    voiceService.speak(
      `Recording ${assessmentType} scores for ${className}, ${subjectName}. ` +
      `${studentList.length} students. Maximum score is ${maxScore}. ` +
      `Say "start" to begin, or "cancel" to abort.`
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
      case 'intro':
        if (lowerText.includes('start') || lowerText.includes('begin')) {
          setStep('recording');
          // Use setTimeout to ensure state updates before speaking
          setTimeout(() => speakNextStudent(), 100);
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
        
      case 'recording':
        handleScoreInput(text);
        break;
        
      case 'readback':
        if (lowerText.includes('confirm') || lowerText.includes('correct')) {
          setStep('confirm');
          voiceService.speak(
            `All ${studentList.length} scores recorded. ` +
            `Average: ${calculateAverage().toFixed(1)}. ` +
            `${grades.filter(g => g.score < maxScore * 0.5).length} students scored below 50%. ` +
            `Say "confirm" to save, or "modify" to make changes.`
          );
        } else if (lowerText.includes('change') || lowerText.includes('modify')) {
          handleModification(text);
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
        
      case 'confirm':
        if (lowerText.includes('confirm') || lowerText.includes('yes')) {
          checkEditWindowAndProceed();
        } else if (lowerText.includes('modify') || lowerText.includes('change')) {
          setStep('recording');
          setCurrentStudentIndex(0);
          setGrades([]);
          voiceService.speak('Starting over. Let\'s record all scores again.');
          setTimeout(() => speakNextStudent(), 500);
        } else if (lowerText.includes('cancel')) {
          onCancel();
        }
        break;
    }
  }

  function speakNextStudent() {
    if (currentStudentIndex < studentList.length) {
      const student = studentList[currentStudentIndex];
      // FIX: Use currentStudentIndex + 1 for the student number
      voiceService.speak(`Student ${currentStudentIndex + 1}: ${student.name}. What's the score?`);
    } else {
      // All scores recorded, read back
      readBackAllScores();
    }
  }

  function handleScoreInput(text: string) {
    // Try to extract score from text using smart parser
    const score = smartParseNumber(text);
    
    if (score !== null && score >= 0 && score <= maxScore) {
      const student = studentList[currentStudentIndex];
      const newGrades = [...grades, {
        studentId: student.id,
        studentName: student.name,
        score: score
      }];
      
      setGrades(newGrades);
      
      // Move to next student
      const nextIndex = currentStudentIndex + 1;
      setCurrentStudentIndex(nextIndex);
      
      // FIX: Use setTimeout with the updated index to ensure state updates
      if (nextIndex < studentList.length) {
        setTimeout(() => {
          const nextStudent = studentList[nextIndex];
          voiceService.speak(`Student ${nextIndex + 1}: ${nextStudent.name}. What's the score?`);
        }, 500);
      } else {
        // All done, read back
        setTimeout(() => readBackAllScores(), 1000);
      }
    } else if (text.toLowerCase().includes('absent')) {
      const student = studentList[currentStudentIndex];
      const newGrades = [...grades, {
        studentId: student.id,
        studentName: student.name,
        score: 0
      }];
      
      setGrades(newGrades);
      voiceService.speak('Marked as absent, score zero.');
      
      const nextIndex = currentStudentIndex + 1;
      setCurrentStudentIndex(nextIndex);
      
      // FIX: Same fix for absent case
      if (nextIndex < studentList.length) {
        setTimeout(() => {
          const nextStudent = studentList[nextIndex];
          voiceService.speak(`Student ${nextIndex + 1}: ${nextStudent.name}. What's the score?`);
        }, 1000);
      } else {
        setTimeout(() => readBackAllScores(), 1000);
      }
    } else {
      voiceService.speak(`Invalid score. Please say a number between 0 and ${maxScore}, like "fifteen" or "23".`);
    }
  }

  function readBackAllScores() {
    setStep('readback');
    
    let readbackText = `Let me read back all ${grades.length} scores. `;
    
    grades.forEach((grade, index) => {
      readbackText += `${grade.studentName}, ${grade.score}. `;
      
      // Add pause every 5 students
      if ((index + 1) % 5 === 0 && index !== grades.length - 1) {
        readbackText += '... ';
      }
    });
    
    readbackText += `That's all ${grades.length} scores. Say "confirm" if correct, or "change" followed by the student name to modify.`;
    
    voiceService.speak(readbackText);
  }

  function handleModification(text: string) {
    // Try to find student name in text
    const words = text.toLowerCase().split(' ');
    
    for (const grade of grades) {
      const nameParts = grade.studentName.toLowerCase().split(' ');
      const nameFound = nameParts.some(part => words.includes(part));
      
      if (nameFound) {
        voiceService.speak(`Changing ${grade.studentName}'s score. Current score is ${grade.score}. What's the new score?`);
        // In a full implementation, handle the modification
        return;
      }
    }
    
    voiceService.speak('Student name not recognized. Say "confirm" to proceed, or name another student to modify.');
  }

  function calculateAverage(): number {
    if (grades.length === 0) return 0;
    const total = grades.reduce((sum, g) => sum + g.score, 0);
    return total / grades.length;
  }

  async function checkEditWindowAndProceed() {
    setStep('saving');
    voiceService.speak('Checking permissions...');
    
    try {
      const windowCheck = await isWithinEditWindow(term, session, assessmentType, classId);
      
      if (!windowCheck.allowed) {
        setError(windowCheck.reason || 'Cannot submit grades at this time');
        voiceService.speak(windowCheck.reason || 'Cannot submit grades at this time');
        setStep('confirm');
        return;
      }
      
      voiceService.speak('Saving grades...');
      saveGrades();
    } catch (err: any) {
      setError(err.message);
      voiceService.speak('Error checking permissions.');
      setStep('confirm');
    }
  }

  async function saveGrades() {
    try {
      // Calculate deadline (7 days from now for example)
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      
      // Save all grades
      for (const grade of grades) {
        await recordResult({
          studentId: grade.studentId,
          subjectId,
          classId,
          term,
          session,
          assessmentType,
          score: grade.score,
          maxScore,
          teacherId,
          dateRecorded: Timestamp.now()
        });
      }
      
      // Create audit log
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'GRADE_ENTERED',
        details: `Entered ${assessmentType} scores for ${className}, ${subjectName}: ${grades.length} students, average ${calculateAverage().toFixed(1)}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        afterData: grades,
        success: true
      });
      
      voiceService.speak(
        `${assessmentType} scores submitted and forwarded to admin department for CA calculation. ` +
        `Edit window closes on ${deadline.toLocaleDateString()}.`
      );
      
      setStep('complete');
      
      setTimeout(() => {
        onComplete();
      }, 4000);
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.message);
      voiceService.speak('Error saving grades. Please try again.');
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'GRADE_ENTERED',
        details: `Failed to enter grades for ${className}, ${subjectName}`,
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📝</div>
          <h2 className="text-3xl font-bold text-gray-800">Grade Entry</h2>
          <p className="text-gray-600 mt-2">
            {className} • {subjectName} • {assessmentType.toUpperCase()}
          </p>
          <p className="text-sm text-gray-500">
            Max Score: {maxScore} • {studentList.length} Students
          </p>
        </div>

        {/* Progress */}
        {step === 'recording' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{currentStudentIndex} / {studentList.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(currentStudentIndex / studentList.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {step === 'intro' && (
            <div className="text-center py-8">
              <p className="text-lg mb-4">
                Ready to record <strong>{assessmentType.toUpperCase()}</strong> scores
              </p>
              <p className="text-gray-600">
                Say each score one by one. I'll read them all back before saving.
              </p>
            </div>
          )}

          {step === 'recording' && currentStudentIndex < studentList.length && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {studentList[currentStudentIndex].name}
              </p>
              <p className="text-gray-600">Student {currentStudentIndex + 1} of {studentList.length}</p>
            </div>
          )}

          {(step === 'readback' || step === 'confirm') && (
            <div>
              <h3 className="text-lg font-semibold mb-3">All Grades</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Student</th>
                      <th className="text-right py-2">Score</th>
                      <th className="text-right py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((grade, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{grade.studentName}</td>
                        <td className="text-right font-semibold">{grade.score}/{maxScore}</td>
                        <td className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${
                            grade.score >= maxScore * 0.7 ? 'bg-green-100 text-green-800' :
                            grade.score >= maxScore * 0.5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade.score >= maxScore * 0.7 ? 'A/B' :
                             grade.score >= maxScore * 0.5 ? 'C/D' : 'E/F'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Average</p>
                  <p className="text-xl font-bold text-blue-600">{calculateAverage().toFixed(1)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Above 70%</p>
                  <p className="text-xl font-bold text-green-600">
                    {grades.filter(g => g.score >= maxScore * 0.7).length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Below 50%</p>
                  <p className="text-xl font-bold text-red-600">
                    {grades.filter(g => g.score < maxScore * 0.5).length}
                  </p>
                </div>
              </div>
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
              <p className="text-2xl font-bold text-green-600 mb-2">Grades Saved!</p>
              <p className="text-gray-600">Forwarded to admin for CA calculation</p>
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