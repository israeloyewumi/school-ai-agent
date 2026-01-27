// app/register/page.tsx - ULTRA SAFE VERSION - ALL .length calls protected
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterData, UserRole } from '@/types/auth';
import { TeacherType, AdminDepartment, getDepartmentDisplayName, AcademicTrack } from '@/types/database';
import { registerUser } from '@/lib/auth/authService';
import { validateTeacherRegistration } from '@/lib/firebase/validationHelpers';
import TeacherRoleSelector from '@/components/teacher/TeacherRoleSelector';
import ClassTeacherForm from '@/components/teacher/ClassTeacherForm';
import SubjectTeacherForm from '@/components/teacher/SubjectTeacherForm';
import ParentChildrenForm from '@/components/parent/ParentChildrenForm';

type RegistrationStep = 
  | 'basic' 
  | 'admin-department' 
  | 'teacher-role' 
  | 'teacher-details' 
  | 'parent-details'
  | 'parent-children'
  | 'review' 
  | 'success';

interface Child {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  age: number;
  classId: string;
  className: string;
  grade: number;
  subjects?: string[];
  academicTrack?: AcademicTrack;
  tradeSubject?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'student'
  });

  const [adminDepartment, setAdminDepartment] = useState<AdminDepartment | null>(null);
  const [teacherType, setTeacherType] = useState<TeacherType | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ classId: string; className: string } | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<{
    subjectId: string;
    subjectName: string;
    classes: string[];
  }[]>([]);

  const [parentRelationship, setParentRelationship] = useState<'father' | 'mother' | 'guardian' | 'other'>('father');
  const [parentOccupation, setParentOccupation] = useState('');
  const [parentWorkplace, setParentWorkplace] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentChildren, setParentChildren] = useState<Child[]>([]);

  function handleBasicInfoChange(field: keyof RegisterData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  function handleBasicInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (formData.role === 'admin') {
      setStep('admin-department');
    } else if (formData.role === 'teacher') {
      setStep('teacher-role');
    } else if (formData.role === 'parent') {
      setStep('parent-details');
    } else {
      handleSubmit();
    }
  }

  function handleAdminDepartmentSelected(dept: AdminDepartment) {
    setAdminDepartment(dept);
    setStep('review');
  }

  function handleTeacherRoleSelected(type: TeacherType) {
    setTeacherType(type);
    setStep('teacher-details');
  }

  function handleClassSelected(classId: string, className: string) {
    setSelectedClass({ classId, className });
    setValidationWarnings([]);
  }

  function handleSubjectsSelected(subjects: typeof selectedSubjects) {
    setSelectedSubjects(subjects || []);
    setValidationWarnings([]);
  }

  async function handleTeacherDetailsComplete() {
    setError('');
    setValidationWarnings([]);
    setLoading(true);

    try {
      if (teacherType === 'class_teacher' || teacherType === 'both') {
        if (!selectedClass) {
          setError('Please select a class');
          setLoading(false);
          return;
        }
      }

      if (teacherType === 'subject_teacher' || teacherType === 'both') {
        const subjectsArray = Array.isArray(selectedSubjects) ? selectedSubjects : [];
        if (subjectsArray.length === 0) {
          setError('Please select at least one subject');
          setLoading(false);
          return;
        }
        
        const subjectWithoutClasses = subjectsArray.find(s => {
          const classesArray = Array.isArray(s?.classes) ? s.classes : [];
          return classesArray.length === 0;
        });
        
        if (subjectWithoutClasses) {
          setError(`Please assign classes for ${subjectWithoutClasses.subjectName}`);
          setLoading(false);
          return;
        }
      }

      console.log('🔍 Validating teacher assignment availability...');
      const subjectsArray = Array.isArray(selectedSubjects) ? selectedSubjects : [];
      
      const validation = await validateTeacherRegistration({
        teacherType: teacherType!,
        requestedClass: selectedClass || undefined,
        requestedSubjects: subjectsArray.length > 0 ? subjectsArray : undefined
      });

      if (!validation.isValid) {
        setError('Cannot proceed with registration:');
        setValidationWarnings(validation.errors || []);
        setLoading(false);
        return;
      }

      console.log('✅ Validation passed!');
      setStep('review');
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Failed to validate teacher assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleParentDetailsComplete() {
    setError('');

    if (!parentAddress.trim()) {
      setError('Home address is required');
      return;
    }

    setStep('parent-children');
  }

  function handleParentChildrenComplete() {
    setError('');

    const childrenArray = Array.isArray(parentChildren) ? parentChildren : [];
    
    if (childrenArray.length === 0) {
      setError('Please add at least one child');
      return;
    }

    const childrenWithoutSubjects = childrenArray.filter(child => {
      const subjectsArray = Array.isArray(child?.subjects) ? child.subjects : [];
      return subjectsArray.length === 0;
    });

    if (childrenWithoutSubjects.length > 0) {
      setError('Please ensure all children have selected their subjects');
      return;
    }

    setStep('review');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const subjectsArray = Array.isArray(selectedSubjects) ? selectedSubjects : [];
      const childrenArray = Array.isArray(parentChildren) ? parentChildren : [];
      
      const registrationData: RegisterData = {
        ...formData,
        adminDepartment: adminDepartment || undefined,
        teacherType: teacherType || undefined,
        requestedClass: selectedClass || undefined,
        requestedSubjects: subjectsArray.length > 0 ? subjectsArray : undefined,
        relationship: parentRelationship,
        occupation: parentOccupation || undefined,
        workplace: parentWorkplace || undefined,
        address: parentAddress || undefined,
        children: childrenArray.length > 0 ? childrenArray.map(child => ({
          firstName: child.firstName,
          lastName: child.lastName,
          gender: child.gender,
          dateOfBirth: child.dateOfBirth,
          age: child.age,
          classId: child.classId,
          className: child.className,
          grade: child.grade,
          subjects: Array.isArray(child.subjects) ? child.subjects : [],
          academicTrack: child.academicTrack || null,
          tradeSubject: child.tradeSubject || null
        })) : undefined
      };

      console.log('🔍 Submitting registration with children:', registrationData.children);

      await registerUser(registrationData);
      
      setSuccess('Registration successful!');
      setStep('success');
      setLoading(false);
      
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.message || 'Registration failed. Please try again.';
      const errorLines = errorMessage.split('\n');
      
      if (errorLines.length > 1) {
        setError('Registration failed:');
        setValidationWarnings(errorLines);
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  }

  const adminDepartments: { value: AdminDepartment; icon: string; description: string }[] = [
    { value: 'ceo', icon: '👑', description: 'Full system access and control' },
    { value: 'principal', icon: '🎓', description: 'School-wide management authority' },
    { value: 'vice_principal', icon: '📋', description: 'Deputy administrative role' },
    { value: 'hod', icon: '📚', description: 'Department head responsibilities' },
    { value: 'admin_staff', icon: '💼', description: 'Administrative support tasks' }
  ];

  function renderStepContent() {
    switch (step) {
      case 'basic':
        return (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'teacher', 'parent', 'admin'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleBasicInfoChange('role', role)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === role
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">
                      {role === 'student' && '🎓'}
                      {role === 'teacher' && '👨‍🏫'}
                      {role === 'parent' && '👨‍👩‍👧'}
                      {role === 'admin' && '👑'}
                    </div>
                    <div className="font-medium capitalize">{role}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleBasicInfoChange('firstName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleBasicInfoChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleBasicInfoChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john.doe@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleBasicInfoChange('phoneNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+234 800 000 0000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleBasicInfoChange('password', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleBasicInfoChange('confirmPassword', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400"
            >
              {formData.role === 'teacher' || formData.role === 'admin' || formData.role === 'parent' ? 'Continue' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:underline">
                Login here
              </Link>
            </p>
          </form>
        );

      case 'admin-department':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Select Department</h2>
              <button
                onClick={() => setStep('basic')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Choose your administrative role in the school:
            </p>

            <div className="space-y-3">
              {adminDepartments.map((dept) => (
                <button
                  key={dept.value}
                  onClick={() => handleAdminDepartmentSelected(dept.value)}
                  className="w-full p-4 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{dept.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">
                        {getDepartmentDisplayName(dept.value)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                    </div>
                    <div className="text-blue-500">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'teacher-role':
        return (
          <TeacherRoleSelector
            onRoleSelected={handleTeacherRoleSelected}
            onBack={() => setStep('basic')}
          />
        );

      case 'teacher-details':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Teaching Assignment</h2>
              <button
                onClick={() => setStep('teacher-role')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            {(teacherType === 'class_teacher' || teacherType === 'both') && (
              <ClassTeacherForm
                selectedClass={selectedClass}
                onClassSelected={handleClassSelected}
              />
            )}

            {(teacherType === 'subject_teacher' || teacherType === 'both') && (
              <SubjectTeacherForm
                selectedSubjects={selectedSubjects}
                onSubjectsChanged={handleSubjectsSelected}
              />
            )}

            {error && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">{error}</p>
                    {(validationWarnings?.length || 0) > 0 && (
                      <ul className="text-sm text-red-700 space-y-1 mt-2">
                        {validationWarnings.map((warning, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleTeacherDetailsComplete}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Validating...
                </>
              ) : (
                'Continue to Review'
              )}
            </button>
          </div>
        );

      case 'parent-details':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Parent Information</h2>
              <button
                onClick={() => setStep('basic')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Please provide additional information about yourself.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship to Child(ren) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['father', 'mother', 'guardian', 'other'] as const).map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    onClick={() => setParentRelationship(rel)}
                    className={`p-3 rounded-lg border-2 transition-all capitalize ${
                      parentRelationship === rel
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupation (Optional)
              </label>
              <input
                type="text"
                value={parentOccupation}
                onChange={(e) => setParentOccupation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Engineer, Teacher, Business Owner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workplace (Optional)
              </label>
              <input
                type="text"
                value={parentWorkplace}
                onChange={(e) => setParentWorkplace(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ABC Company Ltd"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home Address *
              </label>
              <textarea
                value={parentAddress}
                onChange={(e) => setParentAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full home address"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleParentDetailsComplete}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Continue to Add Children
            </button>
          </div>
        );

      case 'parent-children':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Add Your Children</h2>
              <button
                onClick={() => setStep('parent-details')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Add information for each of your children/wards who will be enrolled in the school.
            </p>

            <ParentChildrenForm
              children={parentChildren}
              onChildrenChanged={setParentChildren}
            />

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mt-4">
                {error}
              </div>
            )}

            <button
              onClick={handleParentChildrenComplete}
              disabled={(parentChildren?.length || 0) === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Continue to Review
            </button>
          </div>
        );

      case 'review':
        const subjectsArray = Array.isArray(selectedSubjects) ? selectedSubjects : [];
        const childrenArray = Array.isArray(parentChildren) ? parentChildren : [];
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Review & Submit</h2>
              <button
                onClick={() => {
                  if (formData.role === 'admin') {
                    setStep('admin-department');
                  } else if (formData.role === 'teacher') {
                    setStep('teacher-details');
                  } else if (formData.role === 'parent') {
                    setStep('parent-children');
                  }
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Personal Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{formData.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Role:</span>
                  <span className="font-medium capitalize">{formData.role}</span>
                </div>
              </div>
            </div>

            {adminDepartment && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-purple-900">Admin Department</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {adminDepartments.find(d => d.value === adminDepartment)?.icon}
                  </span>
                  <div>
                    <p className="font-medium text-purple-900">
                      {getDepartmentDisplayName(adminDepartment)}
                    </p>
                    <p className="text-sm text-purple-700">
                      {adminDepartments.find(d => d.value === adminDepartment)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {teacherType && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-900">Teacher Assignment</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-600">Role:</span>
                    <span className="ml-2 font-medium">
                      {teacherType === 'class_teacher' && 'Class Teacher Only'}
                      {teacherType === 'subject_teacher' && 'Subject Teacher Only'}
                      {teacherType === 'both' && 'Both (Class + Subject Teacher)'}
                    </span>
                  </div>

                  {selectedClass && (
                    <div>
                      <span className="text-blue-600">Class:</span>
                      <span className="ml-2 font-medium">{selectedClass.className}</span>
                    </div>
                  )}

                  {subjectsArray.length > 0 && (
                    <div>
                      <span className="text-blue-600">Subjects:</span>
                      <ul className="mt-1 ml-4 space-y-1">
                        {subjectsArray.map((subject) => {
                          const classesArray = Array.isArray(subject?.classes) ? subject.classes : [];
                          return (
                            <li key={subject.subjectId}>
                              <strong>{subject.subjectName}</strong> - {classesArray.length} classes
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.role === 'parent' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-green-900">Parent & Children Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-green-600">Relationship:</span>
                    <span className="ml-2 font-medium capitalize">{parentRelationship}</span>
                  </div>
                  {parentOccupation && (
                    <div>
                      <span className="text-green-600">Occupation:</span>
                      <span className="ml-2 font-medium">{parentOccupation}</span>
                    </div>
                  )}
                  {parentWorkplace && (
                    <div>
                      <span className="text-green-600">Workplace:</span>
                      <span className="ml-2 font-medium">{parentWorkplace}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-green-600">Address:</span>
                    <span className="ml-2 font-medium">{parentAddress}</span>
                  </div>
                  <div className="pt-2 border-t border-green-300">
                    <span className="text-green-600 font-semibold">Children ({childrenArray.length}):</span>
                    <ul className="mt-2 space-y-2">
                      {childrenArray.map((child, index) => {
                        const childSubjects = Array.isArray(child?.subjects) ? child.subjects : [];
                        return (
                          <li key={index} className="bg-white rounded p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                              <div className="flex-1">
                                <p className="font-medium">{child.firstName} {child.lastName}</p>
                                <p className="text-xs text-gray-600">
                                  {child.className} • Age {child.age} • {child.gender === 'male' ? 'Male' : 'Female'}
                                </p>
                              </div>
                            </div>
                            {childSubjects.length > 0 && (
                              <div className="mt-2 text-xs bg-blue-50 rounded p-2">
                                <p className="font-medium text-blue-900">
                                  📚 {childSubjects.length} subjects selected
                                </p>
                                {child.academicTrack && (
                                  <p className="text-blue-700 mt-1">
                                    Track: {child.academicTrack}
                                  </p>
                                )}
                                {child.tradeSubject && (
                                  <p className="text-blue-700">
                                    Trade: {child.tradeSubject}
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'teacher' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Admin Approval Required</p>
                    <p>Your teacher registration will be reviewed by the school admin. You will receive an email notification once your account is approved and activated.</p>
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'parent' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Admin Approval Required</p>
                    <p>Your parent registration will be reviewed by the school admin. Your account and your children's accounts will be created once approved. You will receive an email notification when your registration is reviewed.</p>
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'admin' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Immediate Access</p>
                    <p>Your admin account will be activated immediately. You can login right after registration.</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-xl">❌</span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">{error}</p>
                    {(validationWarnings?.length || 0) > 0 && (
                      <ul className="text-sm text-red-700 space-y-1 mt-2">
                        {validationWarnings.map((warning, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </>
              ) : (
                formData.role === 'teacher' || formData.role === 'parent' ? 'Submit for Approval' : 'Create Account'
              )}
            </button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-3">
              Registration {formData.role === 'teacher' || formData.role === 'parent' ? 'Submitted' : 'Complete'}!
            </h2>
            
            {formData.role === 'teacher' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Your teacher registration has been submitted for admin approval.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <p className="font-semibold text-blue-900 mb-2">What happens next?</p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Admin will review your registration</li>
                    <li>You'll receive an email notification</li>
                    <li>Once approved, you can login to your account</li>
                  </ol>
                </div>
                <p className="text-sm text-gray-500">
                  This usually takes 1-2 business days.
                </p>
              </div>
            ) : formData.role === 'admin' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Your admin account has been created successfully!
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
                  <p className="font-semibold text-purple-900 mb-2">You can now:</p>
                  <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                    <li>Login to your admin account</li>
                    <li>Access the admin dashboard</li>
                    <li>Manage teachers, students, and school operations</li>
                  </ul>
                </div>
              </div>
            ) : formData.role === 'parent' ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Your parent registration has been submitted for admin approval.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                  <p className="font-semibold text-yellow-900 mb-2">⚠️ Approval Required</p>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Admin will review your registration</li>
                    <li>Your children's accounts will be created upon approval</li>
                    <li>You'll receive an email notification</li>
                    <li>Once approved, you can login to your account</li>
                  </ol>
                </div>
                <p className="text-sm text-gray-500">
                  This usually takes 1-2 business days.
                </p>
              </div>
            ) : (
              <p className="text-gray-600 mb-4">
                Your account has been created successfully!
              </p>
            )}

            <button
              onClick={() => router.push('/login')}
              className="mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Go to Login
            </button>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">School AI Agent</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {step !== 'success' && step !== 'basic' && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {formData.role === 'teacher' && ['teacher-role', 'teacher-details', 'review'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? 'bg-blue-500 text-white'
                        : ['teacher-role', 'teacher-details', 'review'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className="w-12 h-1 bg-gray-300 mx-1" />}
                </div>
              ))}
              {formData.role === 'admin' && ['admin-department', 'review'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? 'bg-blue-500 text-white'
                        : ['admin-department', 'review'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 1 && <div className="w-12 h-1 bg-gray-300 mx-1" />}
                </div>
              ))}
              {formData.role === 'parent' && ['parent-details', 'parent-children', 'review'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s
                        ? 'bg-blue-500 text-white'
                        : ['parent-details', 'parent-children', 'review'].indexOf(step) > i
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className="w-12 h-1 bg-gray-300 mx-1" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {renderStepContent()}
      </div>
    </div>
  );
}