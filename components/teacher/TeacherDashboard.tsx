// components/teacher/TeacherDashboard.tsx - WITH GRADE ENTRY MODE TOGGLE
"use client";

import { useState, useEffect } from 'react';
import { AuthUser } from '@/types/auth';
import AttendanceRecorder from './AttendanceRecorder';
import HybridAttendanceRecorder from './HybridAttendanceRecorder';
import GradeEntry from './GradeEntry';
import ManualGradeEntry from './ManualGradeEntry';
import MeritAward from './MeritAward';
import ManualMeritAward from './ManualMeritAward';
import LessonNoteUploader from './LessonNoteUploader';
import WeeklyHistoryReport from './WeeklyHistoryReport';
import { getTeacherClasses, getStudentsByClass, getTeacher } from '@/lib/firebase/db';
import { ALL_SUBJECTS, getSubjectsForGrade, getClassById, getCurrentAcademicSession, getCurrentTerm } from '@/lib/config/schoolData';
import { Student } from '@/types/database';


interface TeacherDashboardProps {
  user: AuthUser;
  onClose: () => void;
}

type ActiveTool = 'attendance' | 'grades' | 'merits' | 'lesson-planner' | 'weekly-report' | null;
type AttendanceMode = 'voice-only' | 'hybrid';
type GradeEntryMode = 'voice' | 'manual';
type MeritMode = 'voice' | 'manual'; // NEW

interface ClassData {
  id: string;
  name: string;
  grade: number;
  students: Student[];
}

interface SubjectData {
  id: string;
  name: string;
}

export default function TeacherDashboard({ user, onClose }: TeacherDashboardProps) {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectData[]>([]);
  const [teacherDoc, setTeacherDoc] = useState<any>(null);
  const [assignedClassForAttendance, setAssignedClassForAttendance] = useState<ClassData | null>(null);
  
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('hybrid');
  const [gradeEntryMode, setGradeEntryMode] = useState<GradeEntryMode>('manual');
  const [meritMode, setMeritMode] = useState<MeritMode>('manual'); // NEW: Default to manual

  // ✅ NEW: Dynamic session and term management
  const currentSession = getCurrentAcademicSession();
  const currentTerm = getCurrentTerm();
  const [selectedSession, setSelectedSession] = useState<string>(currentSession);
  const [selectedTerm, setSelectedTerm] = useState<string>(currentTerm);

  const teacherId = user.teacherId || user.id;
  const teacherName = `${user.firstName} ${user.lastName}`;

  const canRecordAttendance = teacherDoc && 
    (teacherDoc.teacherType === 'class_teacher' || teacherDoc.teacherType === 'both') &&
    teacherDoc.assignedClass?.classId;

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  async function loadTeacherClasses() {
    try {
      setIsLoading(true);
      const teacher = await getTeacher(teacherId);
      
      if (!teacher) {
        setClasses([]);
        setIsLoading(false);
        return;
      }

      setTeacherDoc(teacher);
      const classesWithStudents: ClassData[] = [];
      
      if (teacher.assignedClass?.classId) {
        try {
          const classInfo = getClassById(teacher.assignedClass.classId);
          const students = await getStudentsByClass(teacher.assignedClass.classId);
          
          const assignedClass: ClassData = {
            id: teacher.assignedClass.classId,
            name: teacher.assignedClass.className,
            grade: classInfo?.grade || 8,
            students: students
          };

          setAssignedClassForAttendance(assignedClass);
          classesWithStudents.push(assignedClass);
        } catch (error) {
          console.error('Error loading assigned class:', error);
        }
      } else {
        setAssignedClassForAttendance(null);
      }
      
      if (teacher.teacherType === 'subject_teacher' || teacher.teacherType === 'both') {
        if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
          const classIdSet = new Set<string>();
          teacher.subjects.forEach((subject: any) => {
            if (subject.classes && Array.isArray(subject.classes)) {
              subject.classes.forEach((classId: string) => classIdSet.add(classId));
            }
          });

          for (const classId of classIdSet) {
            if (!classesWithStudents.some(c => c.id === classId)) {
              try {
                const classInfo = getClassById(classId);
                const students = await getStudentsByClass(classId);
                if (classInfo) {
                  classesWithStudents.push({
                    id: classId,
                    name: classInfo.className,
                    grade: classInfo.grade,
                    students: students
                  });
                }
              } catch (error) {
                console.error('Error loading subject class:', classId, error);
              }
            }
          }
        }
      }
      
      if (Array.isArray(teacher.classes)) {
        for (const classId of teacher.classes) {
          if (!classesWithStudents.some(c => c.id === classId)) {
            try {
              const classInfo = getClassById(classId);
              const students = await getStudentsByClass(classId);
              if (classInfo) {
                classesWithStudents.push({
                  id: classId,
                  name: classInfo.className,
                  grade: classInfo.grade,
                  students: students
                });
              }
            } catch (error) {
              console.error('Error loading class:', classId, error);
            }
          }
        }
      }
      
      setClasses(classesWithStudents);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error loading teacher classes:', error);
      setClasses([]);
      setIsLoading(false);
    }
  }

  function handleToolSelect(tool: ActiveTool) {
    if (tool === 'attendance' && !canRecordAttendance) {
      alert('⚠️ Only class teachers can record attendance.\n\nYou are assigned as a subject teacher. Contact admin if you believe this is incorrect.');
      return;
    }
    setActiveTool(tool);
    setSelectedClass(null);
    setSelectedSubject(null);
    setSelectedAssessment(null);
  }

  function handleClassSelect(classData: ClassData) {
    setSelectedClass(classData);
    if (activeTool === 'grades' || activeTool === 'lesson-planner') {
      loadSubjectsForClass(classData);
    }
  }

  async function loadSubjectsForClass(classData: ClassData) {
    try {
      if (!teacherDoc) {
        setAvailableSubjects([]);
        return;
      }

      const teacherSubjectsList: SubjectData[] = [];

      if (Array.isArray(teacherDoc.subjects)) {
        teacherDoc.subjects.forEach((subject: any) => {
          if (typeof subject === 'object' && subject.subjectId) {
            if (subject.classes && Array.isArray(subject.classes) && subject.classes.includes(classData.id)) {
              const subjectInfo = ALL_SUBJECTS.find(s => s.subjectId === subject.subjectId);
              if (subjectInfo) {
                teacherSubjectsList.push({
                  id: subjectInfo.subjectId,
                  name: subjectInfo.subjectName
                });
              }
            }
          } else if (typeof subject === 'string') {
            const subjectInfo = ALL_SUBJECTS.find(s => s.subjectId === subject);
            if (subjectInfo && subjectInfo.applicableGrades.includes(classData.grade)) {
              teacherSubjectsList.push({
                id: subjectInfo.subjectId,
                name: subjectInfo.subjectName
              });
            }
          }
        });
      }

      const uniqueSubjects = Array.from(
        new Map(teacherSubjectsList.map(s => [s.id, s])).values()
      );
      setAvailableSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
      setAvailableSubjects([]);
    }
  }

  function renderToolSelector() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleToolSelect('attendance')}
          disabled={!canRecordAttendance}
          className={`p-6 rounded-xl border-2 transition-all text-left group ${
            canRecordAttendance
              ? 'bg-blue-50 hover:bg-blue-100 border-blue-200'
              : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Record Attendance</h3>
          <p className="text-sm text-blue-700">
            {canRecordAttendance ? 'Voice-based attendance marking' : '⚠️ Class teachers only'}
          </p>
          {canRecordAttendance && <div className="mt-4 text-xs text-blue-600 group-hover:text-blue-800">Click to start →</div>}
          {!canRecordAttendance && <div className="mt-4 text-xs text-red-600">🔒 Not authorized</div>}
        </button>

        <button onClick={() => handleToolSelect('grades')} className="p-6 bg-green-50 hover:bg-green-100 rounded-xl border-2 border-green-200 transition-all text-left group">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Enter Grades</h3>
          <p className="text-sm text-green-700">Classwork, CA1, CA2, Exam</p>
          <div className="mt-4 text-xs text-green-600 group-hover:text-green-800">Click to start →</div>
        </button>

        <button onClick={() => handleToolSelect('merits')} className="p-6 bg-purple-50 hover:bg-purple-100 rounded-xl border-2 border-purple-200 transition-all text-left group">
          <div className="text-4xl mb-3">⭐</div>
          <h3 className="text-xl font-bold text-purple-900 mb-2">Award Merits</h3>
          <p className="text-sm text-purple-700">Give merits with voice</p>
          <div className="mt-4 text-xs text-purple-600 group-hover:text-purple-800">Click to start →</div>
        </button>

        <button onClick={() => handleToolSelect('lesson-planner')} className="p-6 bg-gradient-to-br from-orange-50 to-pink-50 hover:from-orange-100 hover:to-pink-100 rounded-xl border-2 border-orange-200 transition-all text-left group relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">AI ✨</div>
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-xl font-bold text-orange-900 mb-2">AI Lesson Planner</h3>
          <p className="text-sm text-orange-700">Generate plans & classworks</p>
          <div className="mt-4 text-xs text-orange-600 group-hover:text-orange-800">Click to start →</div>
        </button>

        <button onClick={() => handleToolSelect('weekly-report')} className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 rounded-xl border-2 border-cyan-200 transition-all text-left group">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-xl font-bold text-cyan-900 mb-2">Weekly History Report</h3>
          <p className="text-sm text-cyan-700">View student records by week</p>
          <div className="mt-4 text-xs text-cyan-600 group-hover:text-cyan-800">Click to start →</div>
        </button>
      </div>
    );
  }

  function renderAttendanceClassSelector() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Your Assigned Class</h3>
            <p className="text-sm text-gray-600">Only class teachers can record attendance</p>
          </div>
          <button onClick={() => setActiveTool(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
        </div>

        {/* Attendance Mode Selector */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
          <p className="text-sm font-medium text-gray-700 mb-3">📋 Choose Attendance Method:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAttendanceMode('hybrid')}
              className={`p-4 rounded-lg border-2 transition-all ${
                attendanceMode === 'hybrid'
                  ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="text-3xl mb-2">👆</div>
              <p className="text-sm font-bold">Hybrid Mode</p>
              <p className="text-xs mt-1 opacity-90">Visual + Voice</p>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  attendanceMode === 'hybrid' ? 'bg-white bg-opacity-20' : 'bg-green-100 text-green-800'
                }`}>⭐ Recommended</span>
              </div>
            </button>
            
            <button
              onClick={() => setAttendanceMode('voice-only')}
              className={`p-4 rounded-lg border-2 transition-all ${
                attendanceMode === 'voice-only'
                  ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="text-3xl mb-2">🎤</div>
              <p className="text-sm font-bold">Voice Only</p>
              <p className="text-xs mt-1 opacity-90">Traditional</p>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  attendanceMode === 'voice-only' ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-600'
                }`}>Fast</span>
              </div>
            </button>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded-lg">
            <p className="text-xs text-gray-600">
              {attendanceMode === 'hybrid' ? (
                <><strong>Hybrid:</strong> Click/tap to mark students absent, then confirm with voice. Perfect for difficult-to-pronounce names.</>
              ) : (
                <><strong>Voice Only:</strong> Speak student names to mark them absent. Fast and hands-free for easy names.</>
              )}
            </p>
          </div>
        </div>

        {assignedClassForAttendance ? (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleClassSelect(assignedClassForAttendance)}
              className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 hover:border-blue-400 rounded-lg text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-lg">{assignedClassForAttendance.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{assignedClassForAttendance.students.length} students enrolled</p>
                  <p className="text-xs text-blue-600 mt-2">📋 You are the class teacher for this class</p>
                </div>
                <div className="text-3xl">→</div>
              </div>
            </button>
          </div>
        ) : (
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
            <div className="text-5xl mb-4">🚫</div>
            <p className="text-red-800 font-medium">No Assigned Class</p>
            <p className="text-sm text-red-600 mt-2">You are not assigned as a class teacher for any class</p>
            <p className="text-xs text-gray-500 mt-4">Only class teachers can record attendance. Contact admin if you believe this is incorrect.</p>
          </div>
        )}
      </div>
    );
  }

  function renderClassSelector() {
    if (activeTool === 'attendance') return renderAttendanceClassSelector();
    
    // NEW: Weekly Report - Just needs class selection
    if (activeTool === 'weekly-report') {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Select a Class</h3>
            <button onClick={() => setActiveTool(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleClassSelect(cls)} className="p-4 bg-white border-2 border-gray-200 hover:border-cyan-300 rounded-lg text-left transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{cls.name}</h4>
                    <p className="text-sm text-gray-600">{cls.students.length} students</p>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
            ))}
          </div>
          {classes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-500">No classes assigned yet</p>
              <p className="text-sm text-gray-400 mt-2">Contact admin to get classes assigned to you</p>
            </div>
          )}
        </div>
      );
    }
    
    // NEW: Show merit mode selector for merit tool
    if (activeTool === 'merits') {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Select a Class</h3>
            <button onClick={() => setActiveTool(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
          </div>
          
          {/* Merit Mode Selector */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <p className="text-sm font-medium text-gray-700 mb-3">⭐ Choose Merit Entry Method:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMeritMode('manual')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  meritMode === 'manual'
                    ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-3xl mb-2">⌨️</div>
                <p className="text-sm font-bold">Manual Entry</p>
                <p className="text-xs mt-1 opacity-90">Click & select</p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    meritMode === 'manual' ? 'bg-white bg-opacity-20' : 'bg-green-100 text-green-800'
                  }`}>⭐ Recommended</span>
                </div>
              </button>
              
              <button
                onClick={() => setMeritMode('voice')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  meritMode === 'voice'
                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">🎤</div>
                <p className="text-sm font-bold">Voice Entry</p>
                <p className="text-xs mt-1 opacity-90">Speak names</p>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    meritMode === 'voice' ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-600'
                  }`}>Hands-free</span>
                </div>
              </button>
            </div>
            
            <div className="mt-3 p-3 bg-white rounded-lg">
              <p className="text-xs text-gray-600">
                {meritMode === 'manual' ? (
                  <><strong>Manual:</strong> Click student names and select merit/demerit categories. Fast and precise.</>
                ) : (
                  <><strong>Voice:</strong> Speak student names and reasons. Hands-free but requires clear pronunciation.</>
                )}
              </p>
            </div>
          </div>
          
          {/* Class List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleClassSelect(cls)} className="p-4 bg-white border-2 border-gray-200 hover:border-purple-300 rounded-lg text-left transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{cls.name}</h4>
                    <p className="text-sm text-gray-600">{cls.students.length} students</p>
                  </div>
                  <div className="text-2xl">→</div>
                </div>
              </button>
            ))}
          </div>
          {classes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-gray-500">No classes assigned yet</p>
              <p className="text-sm text-gray-400 mt-2">Contact admin to get classes assigned to you</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Select a Class</h3>
          <button onClick={() => setActiveTool(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {classes.map((cls) => (
            <button key={cls.id} onClick={() => handleClassSelect(cls)} className="p-4 bg-white border-2 border-gray-200 hover:border-blue-300 rounded-lg text-left transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800">{cls.name}</h4>
                  <p className="text-sm text-gray-600">{cls.students.length} students</p>
                </div>
                <div className="text-2xl">→</div>
              </div>
            </button>
          ))}
        </div>
        {classes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500">No classes assigned yet</p>
            <p className="text-sm text-gray-400 mt-2">Contact admin to get classes assigned to you</p>
          </div>
        )}
      </div>
    );
  }

  function renderSubjectSelector() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Select Subject</h3>
            <p className="text-sm text-gray-600">{selectedClass?.name} • Grade {selectedClass?.grade}</p>
          </div>
          <button onClick={() => setSelectedClass(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
        </div>
        {availableSubjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {availableSubjects.map((subject) => (
              <button key={subject.id} onClick={() => setSelectedSubject(subject)} className="p-4 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-left transition-all">
                <h4 className="font-bold text-gray-800">{subject.name}</h4>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-gray-500">No subjects available for this class</p>
            <p className="text-sm text-gray-400 mt-2">You may not teach any subjects in {selectedClass?.name}</p>
          </div>
        )}
      </div>
    );
  }

  function renderAssessmentSelector() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Select Assessment Type</h3>
            <p className="text-sm text-gray-600">{selectedClass?.name} • {selectedSubject?.name}</p>
          </div>
          <button onClick={() => setSelectedSubject(null)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
        </div>

        {/* NEW: Grade Entry Mode Selector */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
          <p className="text-sm font-medium text-gray-700 mb-3">📝 Choose Grade Entry Method:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGradeEntryMode('manual')}
              className={`p-4 rounded-lg border-2 transition-all ${
                gradeEntryMode === 'manual'
                  ? 'bg-green-500 border-green-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
              }`}
            >
              <div className="text-3xl mb-2">⌨️</div>
              <p className="text-sm font-bold">Manual Entry</p>
              <p className="text-xs mt-1 opacity-90">Type scores</p>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  gradeEntryMode === 'manual' ? 'bg-white bg-opacity-20' : 'bg-green-100 text-green-800'
                }`}>⭐ Recommended</span>
              </div>
            </button>
            
            <button
              onClick={() => setGradeEntryMode('voice')}
              className={`p-4 rounded-lg border-2 transition-all ${
                gradeEntryMode === 'voice'
                  ? 'bg-purple-500 border-purple-500 text-white shadow-lg'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="text-3xl mb-2">🎤</div>
              <p className="text-sm font-bold">Voice Entry</p>
              <p className="text-xs mt-1 opacity-90">Speak scores</p>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  gradeEntryMode === 'voice' ? 'bg-white bg-opacity-20' : 'bg-gray-100 text-gray-600'
                }`}>Hands-free</span>
              </div>
            </button>
          </div>
          
          <div className="mt-3 p-3 bg-white rounded-lg">
            <p className="text-xs text-gray-600">
              {gradeEntryMode === 'manual' ? (
                <><strong>Manual:</strong> Type each student's score. Perfect for large classes with many students.</>
              ) : (
                <><strong>Voice:</strong> Speak each score. Faster for small classes but requires clear pronunciation.</>
              )}
            </p>
          </div>
        </div>

<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
  <button onClick={() => setSelectedAssessment('classwork')} className="p-6 bg-white border-2 border-gray-200 hover:border-blue-300 rounded-lg text-center transition-all">
    <div className="text-3xl mb-2">📝</div>
    <h4 className="font-bold text-gray-800">Classwork</h4>
    <p className="text-xs text-gray-600 mt-1">Daily work</p>
    <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 10 marks</p>
  </button>
  <button onClick={() => setSelectedAssessment('homework')} className="p-6 bg-white border-2 border-gray-200 hover:border-purple-300 rounded-lg text-center transition-all">
    <div className="text-3xl mb-2">📚</div>
    <h4 className="font-bold text-gray-800">Homework</h4>
    <p className="text-xs text-gray-600 mt-1">Take-home</p>
    <p className="text-xs text-purple-600 mt-2 font-semibold">Max: 10 marks</p>
  </button>
  <button onClick={() => setSelectedAssessment('ca1')} className="p-6 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-center transition-all">
    <div className="text-3xl mb-2">📊</div>
    <h4 className="font-bold text-gray-800">CA 1</h4>
    <p className="text-xs text-gray-600 mt-1">First Assessment</p>
    <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 20 marks</p>
  </button>
  <button onClick={() => setSelectedAssessment('ca2')} className="p-6 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-center transition-all">
    <div className="text-3xl mb-2">📄</div>
    <h4 className="font-bold text-gray-800">CA 2</h4>
    <p className="text-xs text-gray-600 mt-1">Second Assessment</p>
    <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 20 marks</p>
  </button>
  <button onClick={() => setSelectedAssessment('exam')} className="p-6 bg-white border-2 border-gray-200 hover:border-red-300 rounded-lg text-center transition-all">
    <div className="text-3xl mb-2">📖</div>
    <h4 className="font-bold text-gray-800">Exam</h4>
    <p className="text-xs text-gray-600 mt-1">Final Exam</p>
    <p className="text-xs text-red-600 mt-2 font-semibold">Max: 70 marks</p>
  </button>
</div>
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800"><strong>⚠️ Important:</strong> All grades have a <strong>7-day edit window</strong> after submission.</p>
          <p className="text-xs text-orange-600 mt-1">💡 Tip: {gradeEntryMode === 'manual' ? 'Manual entry is faster for large classes' : 'Voice will read back scores for confirmation'}</p>
        </div>
      </div>
    );
  }

function getMaxScore(assessmentType: 'classwork' | 'homework' | 'ca1' | 'ca2' | 'exam'): number {
  switch (assessmentType) {
    case 'classwork': return 10;
    case 'homework': return 10;
    case 'ca1': return 20;
    case 'ca2': return 20;
    case 'exam': return 70;
    default: return 10;
  }
}

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {teacherName}</p>
              {teacherDoc && (
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                  teacherDoc.teacherType === 'class_teacher' ? 'bg-blue-100 text-blue-800' :
                  teacherDoc.teacherType === 'both' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {teacherDoc.teacherType === 'class_teacher' ? '📋 Class Teacher' :
                   teacherDoc.teacherType === 'both' ? '📋📚 Class & Subject Teacher' :
                   '📚 Subject Teacher'}
                </span>
              )}
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors">Close</button>
          </div>

          <div className="bg-white rounded-xl p-6">
            {!activeTool && renderToolSelector()}
            {activeTool && !selectedClass && renderClassSelector()}
            {(activeTool === 'grades' || activeTool === 'lesson-planner') && selectedClass && !selectedSubject && renderSubjectSelector()}
            {activeTool === 'grades' && selectedClass && selectedSubject && !selectedAssessment && renderAssessmentSelector()}
          </div>
        </div>
      </div>

      {/* Attendance Modals */}
      {activeTool === 'attendance' && selectedClass && (
        <>
          {attendanceMode === 'hybrid' ? (
            <HybridAttendanceRecorder
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              totalStudents={selectedClass.students.length}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
              }}
              onCancel={() => setSelectedClass(null)}
            />
          ) : (
            <AttendanceRecorder
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              totalStudents={selectedClass.students.length}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
              }}
              onCancel={() => setSelectedClass(null)}
            />
          )}
        </>
      )}

      {/* Grade Entry Modals - NEW: Conditional based on mode */}
      {activeTool === 'grades' && selectedClass && selectedSubject && selectedAssessment && (
        <>
          {gradeEntryMode === 'manual' ? (
            <ManualGradeEntry
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              subjectId={selectedSubject.id}
              subjectName={selectedSubject.name}
              assessmentType={selectedAssessment}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              maxScore={getMaxScore(selectedAssessment)}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
                setSelectedSubject(null);
                setSelectedAssessment(null);
              }}
              onCancel={() => setSelectedAssessment(null)}
            />
          ) : (
            <GradeEntry
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              subjectId={selectedSubject.id}
              subjectName={selectedSubject.name}
              assessmentType={selectedAssessment}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              maxScore={getMaxScore(selectedAssessment)}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
                setSelectedSubject(null);
                setSelectedAssessment(null);
              }}
              onCancel={() => setSelectedAssessment(null)}
            />
          )}
        </>
      )}

      {/* Merit Awards Modal - NEW: Conditional based on mode */}
      {activeTool === 'merits' && selectedClass && (
        <>
          {meritMode === 'manual' ? (
            <ManualMeritAward
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
              }}
              onCancel={() => setSelectedClass(null)}
            />
          ) : (
            <MeritAward
              teacherId={teacherId}
              teacherName={teacherName}
              classId={selectedClass.id}
              className={selectedClass.name}
              studentList={selectedClass.students}
              term={selectedTerm}
              session={selectedSession}
              onComplete={() => {
                setActiveTool(null);
                setSelectedClass(null);
              }}
              onCancel={() => setSelectedClass(null)}
            />
          )}
        </>
      )}

      {/* Lesson Planner Modal */}
      {activeTool === 'lesson-planner' && selectedClass && selectedSubject && (
        <LessonNoteUploader
          teacherId={teacherId}
          teacherName={teacherName}
          classId={selectedClass.id}
          className={selectedClass.name}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          onComplete={() => {
            setActiveTool(null);
            setSelectedClass(null);
            setSelectedSubject(null);
          }}
          onCancel={() => setSelectedSubject(null)}
        />
      )}
{/* Weekly History Report Modal */}
      {activeTool === 'weekly-report' && selectedClass && (
        <WeeklyHistoryReport
          teacherId={teacherId}
          onClose={() => {
            setActiveTool(null);
            setSelectedClass(null);
          }}
        />
      )}    
      </>
  );
}