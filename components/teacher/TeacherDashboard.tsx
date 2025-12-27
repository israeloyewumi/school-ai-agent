// components/teacher/TeacherDashboard.tsx - FIXED: Subject Teacher Support
"use client";

import { useState, useEffect } from 'react';
import { AuthUser } from '@/types/auth';
import AttendanceRecorder from './AttendanceRecorder';
import GradeEntry from './GradeEntry';
import MeritAward from './MeritAward';
import LessonNoteUploader from './LessonNoteUploader';
import { getTeacherClasses, getStudentsByClass, getTeacher } from '@/lib/firebase/db';
import { NIGERIAN_SUBJECTS, getSubjectsForGrade, getClassById } from '@/lib/config/schoolData';

interface TeacherDashboardProps {
  user: AuthUser;
  onClose: () => void;
}

type ActiveTool = 'attendance' | 'grades' | 'merits' | 'lesson-planner' | null;

interface ClassData {
  id: string;
  name: string;
  grade: number;
  students: { id: string; name: string }[];
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
  const [selectedAssessment, setSelectedAssessment] = useState<'ca1' | 'ca2' | 'exam' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectData[]>([]);
  const [teacherDoc, setTeacherDoc] = useState<any>(null);

  const teacherId = user.teacherId || user.id;
  const teacherName = `${user.firstName} ${user.lastName}`;

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  async function loadTeacherClasses() {
    try {
      setIsLoading(true);
      console.log('🚀 Loading teacher classes for:', teacherId);
      
      const teacher = await getTeacher(teacherId);
      
      if (!teacher) {
        console.error('❌ Teacher not found');
        setClasses([]);
        setIsLoading(false);
        return;
      }

      // Store teacher doc for later use
      setTeacherDoc(teacher);

      console.log('👤 Teacher Type:', teacher.teacherType);
      console.log('📚 Teacher Subjects:', teacher.subjects);
      console.log('🏫 Teacher Classes:', teacher.classes);
      console.log('📋 Assigned Class:', teacher.assignedClass);

      const classesWithStudents: ClassData[] = [];
      
      // 1. Add assigned class (for class teachers)
      if (teacher.assignedClass?.classId) {
        try {
          const classInfo = getClassById(teacher.assignedClass.classId);
          const students = await getStudentsByClass(teacher.assignedClass.classId);
          
          classesWithStudents.push({
            id: teacher.assignedClass.classId,
            name: teacher.assignedClass.className,
            grade: classInfo?.grade || 8,
            students: students.map((s: any) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`
            }))
          });
          
          console.log('✅ Added assigned class:', teacher.assignedClass.className);
        } catch (error) {
          console.error('❌ Error loading assigned class:', error);
        }
      }
      
      // 2. For SUBJECT TEACHERS: Add classes from their subjects array
      if (teacher.teacherType === 'subject_teacher' || teacher.teacherType === 'both') {
        if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) {
          console.log('📖 Processing subject teacher assignments...');
          
          // Extract unique class IDs from subjects
          const classIdSet = new Set<string>();
          
          teacher.subjects.forEach((subject: any) => {
            if (subject.classes && Array.isArray(subject.classes)) {
              subject.classes.forEach((classId: string) => classIdSet.add(classId));
            }
          });

          console.log('🎯 Found classes from subjects:', Array.from(classIdSet));

          // Load each unique class
          for (const classId of classIdSet) {
            // Avoid duplicates
            if (!classesWithStudents.some(c => c.id === classId)) {
              try {
                const classInfo = getClassById(classId);
                const students = await getStudentsByClass(classId);
                
                if (classInfo) {
                  classesWithStudents.push({
                    id: classId,
                    name: classInfo.className,
                    grade: classInfo.grade,
                    students: students.map((s: any) => ({
                      id: s.id,
                      name: `${s.firstName} ${s.lastName}`
                    }))
                  });
                  
                  console.log('✅ Added subject class:', classInfo.className);
                }
              } catch (error) {
                console.error('❌ Error loading subject class:', classId, error);
              }
            }
          }
        }
      }
      
      // 3. Fallback: Add classes from classes array
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
                  students: students.map((s: any) => ({
                    id: s.id,
                    name: `${s.firstName} ${s.lastName}`
                  }))
                });
                
                console.log('✅ Added class from array:', classInfo.className);
              }
            } catch (error) {
              console.error('❌ Error loading class:', classId, error);
            }
          }
        }
      }
      
      console.log('🎉 Final classes loaded:', classesWithStudents.length);
      setClasses(classesWithStudents);
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading teacher classes:', error);
      setClasses([]);
      setIsLoading(false);
    }
  }

  function handleToolSelect(tool: ActiveTool) {
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
        console.warn('⚠️ Teacher document not loaded yet');
        setAvailableSubjects([]);
        return;
      }

      console.log('🔍 Loading subjects for class:', classData.name);
      console.log('👨‍🏫 Teacher type:', teacherDoc.teacherType);
      console.log('📚 Teacher subjects:', teacherDoc.subjects);

      const teacherSubjectsList: SubjectData[] = [];

      // Handle different teacher.subjects formats
      if (Array.isArray(teacherDoc.subjects)) {
        teacherDoc.subjects.forEach((subject: any) => {
          // Format 1: Array of objects with subjectId and classes
          if (typeof subject === 'object' && subject.subjectId) {
            // Check if this subject is taught in the selected class
            if (subject.classes && Array.isArray(subject.classes) && subject.classes.includes(classData.id)) {
              const subjectInfo = NIGERIAN_SUBJECTS.find(s => s.subjectId === subject.subjectId);
              if (subjectInfo) {
                teacherSubjectsList.push({
                  id: subjectInfo.subjectId,
                  name: subjectInfo.subjectName
                });
                console.log('✅ Added subject (format 1):', subjectInfo.subjectName);
              }
            }
          }
          // Format 2: Array of subject IDs (strings)
          else if (typeof subject === 'string') {
            const subjectInfo = NIGERIAN_SUBJECTS.find(s => s.subjectId === subject);
            if (subjectInfo && subjectInfo.applicableGrades.includes(classData.grade)) {
              teacherSubjectsList.push({
                id: subjectInfo.subjectId,
                name: subjectInfo.subjectName
              });
              console.log('✅ Added subject (format 2):', subjectInfo.subjectName);
            }
          }
        });
      }

      // Remove duplicates
      const uniqueSubjects = Array.from(
        new Map(teacherSubjectsList.map(s => [s.id, s])).values()
      );

      console.log('✅ Total unique subjects found:', uniqueSubjects.length);
      setAvailableSubjects(uniqueSubjects);

    } catch (error) {
      console.error('❌ Error loading subjects:', error);
      setAvailableSubjects([]);
    }
  }

  function renderToolSelector() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => handleToolSelect('attendance')}
          className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 transition-all text-left group"
        >
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Record Attendance</h3>
          <p className="text-sm text-blue-700">
            Voice-based attendance marking
          </p>
          <div className="mt-4 text-xs text-blue-600 group-hover:text-blue-800">
            Click to start →
          </div>
        </button>

        <button
          onClick={() => handleToolSelect('grades')}
          className="p-6 bg-green-50 hover:bg-green-100 rounded-xl border-2 border-green-200 transition-all text-left group"
        >
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Enter Grades</h3>
          <p className="text-sm text-green-700">
            Dictate scores with read-back
          </p>
          <div className="mt-4 text-xs text-green-600 group-hover:text-green-800">
            Click to start →
          </div>
        </button>

        <button
          onClick={() => handleToolSelect('merits')}
          className="p-6 bg-purple-50 hover:bg-purple-100 rounded-xl border-2 border-purple-200 transition-all text-left group"
        >
          <div className="text-4xl mb-3">⭐</div>
          <h3 className="text-xl font-bold text-purple-900 mb-2">Award Merits</h3>
          <p className="text-sm text-purple-700">
            Give merits with voice
          </p>
          <div className="mt-4 text-xs text-purple-600 group-hover:text-purple-800">
            Click to start →
          </div>
        </button>

        <button
          onClick={() => handleToolSelect('lesson-planner')}
          className="p-6 bg-gradient-to-br from-orange-50 to-pink-50 hover:from-orange-100 hover:to-pink-100 rounded-xl border-2 border-orange-200 transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            AI ✨
          </div>
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-xl font-bold text-orange-900 mb-2">AI Lesson Planner</h3>
          <p className="text-sm text-orange-700">
            Generate plans & classworks
          </p>
          <div className="mt-4 text-xs text-orange-600 group-hover:text-orange-800">
            Click to start →
          </div>
        </button>
      </div>
    );
  }

  function renderClassSelector() {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Select a Class</h3>
          <button
            onClick={() => setActiveTool(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => handleClassSelect(cls)}
              className="p-4 bg-white border-2 border-gray-200 hover:border-blue-300 rounded-lg text-left transition-all"
            >
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
            <p className="text-sm text-gray-400 mt-2">
              Contact admin to get classes assigned to you
            </p>
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
          <button
            onClick={() => setSelectedClass(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {availableSubjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {availableSubjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className="p-4 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-left transition-all"
              >
                <h4 className="font-bold text-gray-800">{subject.name}</h4>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-gray-500">No subjects available for this class</p>
            <p className="text-sm text-gray-400 mt-2">
              You may not teach any subjects in {selectedClass?.name}
            </p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
              <p className="text-sm text-yellow-800">
                <strong>Debug Info:</strong><br/>
                Teacher Type: {teacherDoc?.teacherType}<br/>
                Total Subjects: {teacherDoc?.subjects?.length || 0}
              </p>
            </div>
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
            <p className="text-sm text-gray-600">
              {selectedClass?.name} • {selectedSubject?.name}
            </p>
          </div>
          <button
            onClick={() => setSelectedSubject(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedAssessment('ca1')}
            className="p-6 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-center transition-all"
          >
            <h4 className="font-bold text-gray-800">CA 1</h4>
            <p className="text-xs text-gray-600 mt-1">First Assessment</p>
            <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 15 marks</p>
          </button>

          <button
            onClick={() => setSelectedAssessment('ca2')}
            className="p-6 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-center transition-all"
          >
            <h4 className="font-bold text-gray-800">CA 2</h4>
            <p className="text-xs text-gray-600 mt-1">Second Assessment</p>
            <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 15 marks</p>
          </button>

          <button
            onClick={() => setSelectedAssessment('exam')}
            className="p-6 bg-white border-2 border-gray-200 hover:border-green-300 rounded-lg text-center transition-all"
          >
            <h4 className="font-bold text-gray-800">Exam</h4>
            <p className="text-xs text-gray-600 mt-1">Final Exam</p>
            <p className="text-xs text-blue-600 mt-2 font-semibold">Max: 70 marks</p>
          </button>
        </div>
      </div>
    );
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
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>

          <div className="bg-white rounded-xl p-6">
            {!activeTool && renderToolSelector()}
            
            {activeTool && !selectedClass && renderClassSelector()}
            
            {(activeTool === 'grades' || activeTool === 'lesson-planner') && selectedClass && !selectedSubject && renderSubjectSelector()}
            
            {activeTool === 'grades' && selectedClass && selectedSubject && !selectedAssessment && renderAssessmentSelector()}
          </div>
        </div>
      </div>

      {/* Tool Modals */}
      {activeTool === 'attendance' && selectedClass && (
        <AttendanceRecorder
          teacherId={teacherId}
          teacherName={teacherName}
          classId={selectedClass.id}
          className={selectedClass.name}
          totalStudents={selectedClass.students.length}
          studentList={selectedClass.students}
          term="First Term"
          session="2024/2025"
          onComplete={() => {
            setActiveTool(null);
            setSelectedClass(null);
          }}
          onCancel={() => {
            setSelectedClass(null);
          }}
        />
      )}

      {activeTool === 'grades' && selectedClass && selectedSubject && selectedAssessment && (
        <GradeEntry
          teacherId={teacherId}
          teacherName={teacherName}
          classId={selectedClass.id}
          className={selectedClass.name}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          assessmentType={selectedAssessment}
          studentList={selectedClass.students}
          term="First Term"
          session="2024/2025"
          maxScore={selectedAssessment === 'exam' ? 70 : 15}
          onComplete={() => {
            setActiveTool(null);
            setSelectedClass(null);
            setSelectedSubject(null);
            setSelectedAssessment(null);
          }}
          onCancel={() => {
            setSelectedAssessment(null);
          }}
        />
      )}

      {activeTool === 'merits' && selectedClass && (
        <MeritAward
          teacherId={teacherId}
          teacherName={teacherName}
          classId={selectedClass.id}
          className={selectedClass.name}
          studentList={selectedClass.students}
          term="First Term"
          session="2024/2025"
          onComplete={() => {
            setActiveTool(null);
            setSelectedClass(null);
          }}
          onCancel={() => {
            setSelectedClass(null);
          }}
        />
      )}

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
          onCancel={() => {
            setSelectedSubject(null);
          }}
        />
      )}
    </>
  );
}