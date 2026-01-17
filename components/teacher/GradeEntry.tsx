// components/teacher/GradeEntry.tsx - Enhanced with Student Subject Enrollment Validation
"use client";

import { useState, useEffect } from 'react';
import { getVoiceService } from '@/lib/voice/voiceService';
import { isWithinEditWindow } from '@/lib/firebase/dataLocking';
import { createDetailedAuditLog } from '@/lib/firebase/auditLogs';
import { recordResult } from '@/lib/firebase/db';
import { Timestamp } from 'firebase/firestore';
import { smartParseNumber } from '@/lib/utils/numberParser';
import type { Student } from '@/types/database';

interface GradeEntryProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam';
  studentList: Student[]; // UPDATED: Now expects full Student objects with subject data
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
  academicTrack?: string | null;
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
  
  // NEW: Filter students by subject enrollment
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [ineligibleStudents, setIneligibleStudents] = useState<Student[]>([]);

  // NEW: Filter students on mount and when studentList changes
  useEffect(() => {
    filterStudentsBySubject();
  }, [studentList, subjectId]);

  // NEW: Filter students based on subject enrollment
  function filterStudentsBySubject() {
    const eligible: Student[] = [];
    const ineligible: Student[] = [];

    studentList.forEach(student => {
      const studentSubjects = student.subjects || [];
      
      if (studentSubjects.includes(subjectId)) {
        eligible.push(student);
      } else {
        ineligible.push(student);
      }
    });

    setEligibleStudents(eligible);
    setIneligibleStudents(ineligible);

    console.log(`📊 Grade Entry Filter: ${eligible.length} eligible, ${ineligible.length} ineligible for ${subjectName}`);

    // Show warning if some students are not enrolled
    if (ineligible.length > 0) {
      console.warn(`⚠️ ${ineligible.length} students not enrolled in ${subjectName}:`, 
        ineligible.map(s => `${s.firstName} ${s.lastName}`).join(', ')
      );
    }
  }

  // Get assessment display name
function getAssessmentDisplayName(type: string): string {
  const names: Record<string, string> = {
    classwork: 'Classwork',
    homework: 'Homework',
    ca1: 'CA 1',
    ca2: 'CA 2',
    exam: 'Exam'
  };
  return names[type] || type.toUpperCase();
}

  useEffect(() => {
    // Only proceed if there are eligible students
    if (eligibleStudents.length === 0) {
      voiceService.speak(
        `Warning: No students in ${className} are enrolled in ${subjectName}. ` +
        `Please check student subject assignments. Say "cancel" to exit.`
      );
      setError(`No students enrolled in ${subjectName}`);
    } else {
      voiceService.speak(
        `Recording ${getAssessmentDisplayName(assessmentType)} scores for ${className}, ${subjectName}. ` +
        `${eligibleStudents.length} enrolled students. Maximum score is ${maxScore}. ` +
        (ineligibleStudents.length > 0 ? 
          `Note: ${ineligibleStudents.length} students not enrolled in this subject will be skipped. ` : '') +
        `Say "start" to begin, or "cancel" to abort.`
      );
    }
    
    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, [eligibleStudents, ineligibleStudents]);

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
          if (eligibleStudents.length === 0) {
            voiceService.speak('Cannot start. No students enrolled in this subject.');
            return;
          }
          setStep('recording');
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
            `All ${eligibleStudents.length} scores recorded. ` +
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
    if (currentStudentIndex < eligibleStudents.length) {
      const student = eligibleStudents[currentStudentIndex];
      const studentName = `${student.firstName} ${student.lastName}`;
      voiceService.speak(`Student ${currentStudentIndex + 1}: ${studentName}. What's the score?`);
    } else {
      readBackAllScores();
    }
  }

  function handleScoreInput(text: string) {
    const score = smartParseNumber(text);
    
    console.log('🎯 Processing score input:', text);
    console.log('📊 Parsed score:', score);
    console.log('👤 Current student index:', currentStudentIndex);
    console.log('📝 Current grades array:', grades);
    
    if (score !== null && score >= 0 && score <= maxScore) {
      const student = eligibleStudents[currentStudentIndex];
      const studentName = `${student.firstName} ${student.lastName}`;
      
      console.log('✅ Valid score! Adding for student:', studentName);
      
      // Create new grade entry with academic track info
      const newGrade: StudentGrade = {
        studentId: student.id,
        studentName: studentName,
        score: score,
        academicTrack: student.academicTrack || null
      };
      
      // Update grades array
      setGrades(prevGrades => {
        const updated = [...prevGrades, newGrade];
        console.log('📝 Updated grades array:', updated);
        return updated;
      });
      
      // Move to next student
      const nextIndex = currentStudentIndex + 1;
      console.log('➡️ Moving to next student. Next index:', nextIndex);
      setCurrentStudentIndex(nextIndex);
      
      // Speak next student after state updates
      if (nextIndex < eligibleStudents.length) {
        setTimeout(() => {
          const nextStudent = eligibleStudents[nextIndex];
          const nextStudentName = `${nextStudent.firstName} ${nextStudent.lastName}`;
          console.log('🗣️ Speaking next student:', nextStudentName);
          voiceService.speak(`Student ${nextIndex + 1}: ${nextStudentName}. What's the score?`);
        }, 500);
      } else {
        // All done, read back
        console.log('🎉 All students recorded! Reading back...');
        setTimeout(() => {
          setGrades(currentGrades => {
            console.log('📋 Final grades before readback:', currentGrades);
            setTimeout(() => readBackAllScores(currentGrades), 100);
            return currentGrades;
          });
        }, 1000);
      }
    } else if (text.toLowerCase().includes('absent')) {
      const student = eligibleStudents[currentStudentIndex];
      const studentName = `${student.firstName} ${student.lastName}`;
      
      console.log('📝 Marking student as absent:', studentName);
      
      const newGrade: StudentGrade = {
        studentId: student.id,
        studentName: studentName,
        score: 0,
        academicTrack: student.academicTrack || null
      };
      
      setGrades(prevGrades => {
        const updated = [...prevGrades, newGrade];
        console.log('📝 Updated grades array (absent):', updated);
        return updated;
      });
      
      voiceService.speak('Marked as absent, score zero.');
      
      const nextIndex = currentStudentIndex + 1;
      console.log('➡️ Moving to next student. Next index:', nextIndex);
      setCurrentStudentIndex(nextIndex);
      
      if (nextIndex < eligibleStudents.length) {
        setTimeout(() => {
          const nextStudent = eligibleStudents[nextIndex];
          const nextStudentName = `${nextStudent.firstName} ${nextStudent.lastName}`;
          console.log('🗣️ Speaking next student:', nextStudentName);
          voiceService.speak(`Student ${nextIndex + 1}: ${nextStudentName}. What's the score?`);
        }, 1000);
      } else {
        console.log('🎉 All students recorded! Reading back...');
        setTimeout(() => {
          setGrades(currentGrades => {
            console.log('📋 Final grades before readback:', currentGrades);
            setTimeout(() => readBackAllScores(currentGrades), 100);
            return currentGrades;
          });
        }, 1000);
      }
    } else {
      voiceService.speak(`Invalid score. Please say a number between 0 and ${maxScore}, like "fifteen" or "23".`);
    }
  }

  function readBackAllScores(gradesToReadBack?: StudentGrade[]) {
    const gradesData = gradesToReadBack || grades;
    
    setStep('readback');
    
    console.log('📢 Reading back scores for:', gradesData.length, 'students');
    console.log('📊 Grades data:', gradesData);
    
    let readbackText = `Let me read back all ${gradesData.length} scores. `;
    
    gradesData.forEach((grade, index) => {
      const scoreText = `${grade.studentName}, ${grade.score} out of ${maxScore}. `;
      console.log(`${index + 1}. ${scoreText}`);
      readbackText += scoreText;
      
      if ((index + 1) % 5 === 0 && index !== gradesData.length - 1) {
        readbackText += '... ';
      }
    });
    
    readbackText += `That's all ${gradesData.length} scores. Say "confirm" if correct, or "change" followed by the student name to modify.`;
    
    console.log('📢 Final readback text:', readbackText);
    voiceService.speak(readbackText);
  }

  function handleModification(text: string) {
    const words = text.toLowerCase().split(' ');
    
    for (const grade of grades) {
      const nameParts = grade.studentName.toLowerCase().split(' ');
      const nameFound = nameParts.some(part => words.includes(part));
      
      if (nameFound) {
        voiceService.speak(`Changing ${grade.studentName}'s score. Current score is ${grade.score}. What's the new score?`);
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
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      
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
          teacherName,  // ✅ ADD THIS LINE
          dateRecorded: Timestamp.now()
        });
      }
      
      await createDetailedAuditLog({
        userId: teacherId,
        userRole: 'teacher',
        userName: teacherName,
        action: 'GRADE_ENTERED',
        details: `Entered ${getAssessmentDisplayName(assessmentType)} scores for ${className}, ${subjectName}: ${grades.length} enrolled students, average ${calculateAverage().toFixed(1)}`,
        affectedEntity: classId,
        affectedEntityType: 'class',
        afterData: grades,
        success: true
      });
      
      voiceService.speak(
        `${getAssessmentDisplayName(assessmentType)} scores submitted and forwarded to admin department for processing. ` +
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

function getAssessmentIcon(type: string): string {
  const icons: Record<string, string> = {
    classwork: '📝',
    homework: '📚',
    ca1: '📊',
    ca2: '📄',
    exam: '📖'
  };
  return icons[type] || '📋';
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{getAssessmentIcon(assessmentType)}</div>
          <h2 className="text-3xl font-bold text-gray-800">Grade Entry</h2>
          <p className="text-gray-600 mt-2">
            {className} • {subjectName} • {getAssessmentDisplayName(assessmentType)}
          </p>
          <p className="text-sm text-gray-500">
            Max Score: {maxScore} • {eligibleStudents.length} Enrolled Students
          </p>
          
          {/* NEW: Enrollment Status Badge */}
          {ineligibleStudents.length > 0 && (
            <div className="mt-2 inline-block">
              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                ⚠️ {ineligibleStudents.length} students not enrolled in this subject
              </span>
            </div>
          )}
        </div>

        {/* Progress */}
        {step === 'recording' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{currentStudentIndex} / {eligibleStudents.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(currentStudentIndex / eligibleStudents.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-4">
          {step === 'intro' && (
            <div className="text-center py-8">
              {eligibleStudents.length > 0 ? (
                <>
                  <p className="text-lg mb-4">
                    Ready to record <strong>{getAssessmentDisplayName(assessmentType)}</strong> scores
                  </p>
                  <p className="text-gray-600">
                    Say each score one by one. I'll read them all back before saving.
                  </p>
                  {ineligibleStudents.length > 0 && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        ℹ️ <strong>{ineligibleStudents.length} students will be skipped</strong> - they are not enrolled in {subjectName}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      ⚠️ <strong>Cannot be edited after submission</strong> - speak clearly!
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <div className="text-6xl mb-4">❌</div>
                  <p className="text-xl font-bold text-red-600 mb-2">
                    No Students Enrolled
                  </p>
                  <p className="text-gray-600">
                    None of the students in {className} are enrolled in {subjectName}.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please check student subject assignments or select a different subject.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'recording' && currentStudentIndex < eligibleStudents.length && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {eligibleStudents[currentStudentIndex].firstName} {eligibleStudents[currentStudentIndex].lastName}
              </p>
              <p className="text-gray-600">
                Student {currentStudentIndex + 1} of {eligibleStudents.length}
              </p>
              
              {/* NEW: Show Academic Track */}
              {eligibleStudents[currentStudentIndex].academicTrack && (
                <div className="mt-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    {eligibleStudents[currentStudentIndex].academicTrack} Track
                  </span>
                </div>
              )}
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
                        <td className="py-2">
                          <div className="flex flex-col">
                            <span>{grade.studentName}</span>
                            {/* NEW: Show Academic Track in readback */}
                            {grade.academicTrack && (
                              <span className="text-xs text-purple-600 mt-0.5">
                                {grade.academicTrack} Track
                              </span>
                            )}
                          </div>
                        </td>
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
              <p className="text-gray-600">Forwarded to admin for processing</p>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>7-day edit window</strong> - contact admin after deadline
                </p>
              </div>
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
              disabled={isListening || eligibleStudents.length === 0}
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

        {/* NEW: Ineligible Students Info (shown at bottom) */}
        {ineligibleStudents.length > 0 && step === 'intro' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <details className="cursor-pointer">
              <summary className="font-medium text-gray-700 text-sm">
                View {ineligibleStudents.length} students not enrolled in {subjectName}
              </summary>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {ineligibleStudents.map((student) => (
                  <div key={student.id} className="text-xs text-gray-600 flex items-center gap-2">
                    <span>{student.gender === 'male' ? '👦' : '👧'}</span>
                    <span>{student.firstName} {student.lastName}</span>
                    {student.academicTrack && (
                      <span className="text-purple-600">• {student.academicTrack}</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}