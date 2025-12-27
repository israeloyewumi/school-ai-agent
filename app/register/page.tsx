// app/register/page.tsx - Enhanced Multi-Step Registration (Admin, Teacher & Parent)
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterData, UserRole } from '@/types/auth';
import { TeacherType, AdminDepartment, getDepartmentDisplayName } from '@/types/database';
import { registerUser } from '@/lib/auth/authService';
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

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegistrationStep>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic registration data
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'student'
  });

  // Admin-specific data
  const [adminDepartment, setAdminDepartment] = useState<AdminDepartment | null>(null);

  // Teacher-specific data
  const [teacherType, setTeacherType] = useState<TeacherType | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ classId: string; className: string } | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<{
    subjectId: string;
    subjectName: string;
    classes: string[];
  }[]>([]);

  // Parent-specific data
  const [parentRelationship, setParentRelationship] = useState<'father' | 'mother' | 'guardian' | 'other'>('father');
  const [parentOccupation, setParentOccupation] = useState('');
  const [parentWorkplace, setParentWorkplace] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [parentChildren, setParentChildren] = useState<{
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    dateOfBirth: Date;
    age: number;
    classId: string;
    className: string;
  }[]>([]);

  function handleBasicInfoChange(field: keyof RegisterData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  function handleBasicInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
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

    // Route based on role
    if (formData.role === 'admin') {
      setStep('admin-department');
    } else if (formData.role === 'teacher') {
      setStep('teacher-role');
    } else if (formData.role === 'parent') {
      setStep('parent-details');
    } else {
      // For student role, submit directly
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
  }

  function handleSubjectsSelected(subjects: typeof selectedSubjects) {
    setSelectedSubjects(subjects);
  }

  function handleTeacherDetailsComplete() {
    // Validate teacher details
    if (teacherType === 'class_teacher' || teacherType === 'both') {
      if (!selectedClass) {
        setError('Please select a class');
        return;
      }
    }

    if (teacherType === 'subject_teacher' || teacherType === 'both') {
      if (selectedSubjects.length === 0) {
        setError('Please select at least one subject');
        return;
      }
      
      // Check if all subjects have classes assigned
      const subjectWithoutClasses = selectedSubjects.find(s => s.classes.length === 0);
      if (subjectWithoutClasses) {
        setError(`Please assign classes for ${subjectWithoutClasses.subjectName}`);
        return;
      }
    }

    setStep('review');
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

    if (parentChildren.length === 0) {
      setError('Please add at least one child');
      return;
    }

    setStep('review');
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const registrationData: RegisterData = {
        ...formData,
        adminDepartment: adminDepartment || undefined,
        teacherType: teacherType || undefined,
        requestedClass: selectedClass || undefined,
        requestedSubjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        relationship: parentRelationship,
        occupation: parentOccupation || undefined,
        workplace: parentWorkplace || undefined,
        address: parentAddress || undefined,
        children: parentChildren.length > 0 ? parentChildren : undefined
      };

      await registerUser(registrationData);
      setStep('success');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  }

  // Admin department options
  const adminDepartments: { value: AdminDepartment; icon: string; description: string }[] = [
    { value: 'ceo', icon: '👑', description: 'Full system access and control' },
    { value: 'principal', icon: '🎓', description: 'School-wide management authority' },
    { value: 'vice_principal', icon: '📋', description: 'Deputy administrative role' },
    { value: 'hod', icon: '📚', description: 'Department head responsibilities' },
    { value: 'admin_staff', icon: '💼', description: 'Administrative support tasks' }
  ];

  // Render step content
  function renderStepContent() {
    switch (step) {
      case 'basic':
        return (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>

            {/* Role Selection */}
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
                      {role === 'admin' && '👔'}
                    </div>
                    <div className="font-medium capitalize">{role}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
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

            {/* Email */}
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

            {/* Phone */}
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

            {/* Password */}
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

            {/* Confirm Password */}
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
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleTeacherDetailsComplete}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Continue to Review
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

            {/* Relationship */}
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

            {/* Occupation */}
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

            {/* Workplace */}
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

            {/* Address */}
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
              disabled={parentChildren.length === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Continue to Review
            </button>
          </div>
        );

      case 'review':
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

            {/* Personal Information */}
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

            {/* Admin Department */}
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

            {/* Teacher Assignment */}
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

                  {selectedSubjects.length > 0 && (
                    <div>
                      <span className="text-blue-600">Subjects:</span>
                      <ul className="mt-1 ml-4 space-y-1">
                        {selectedSubjects.map((subject) => (
                          <li key={subject.subjectId}>
                            <strong>{subject.subjectName}</strong> - {subject.classes.length} classes
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parent Information */}
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
                    <span className="text-green-600 font-semibold">Children ({parentChildren.length}):</span>
                    <ul className="mt-2 space-y-2">
                      {parentChildren.map((child, index) => (
                        <li key={index} className="flex items-center gap-2 bg-white rounded p-2">
                          <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                          <div>
                            <p className="font-medium">{child.firstName} {child.lastName}</p>
                            <p className="text-xs text-gray-600">
                              {child.className} • Age {child.age} • {child.gender === 'male' ? 'Male' : 'Female'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Important Notice for Teachers */}
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

            {/* Success Notice for Admins & Parents */}
            {(formData.role === 'admin' || formData.role === 'parent') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Immediate Access</p>
                    <p>
                      {formData.role === 'admin' && 'Your admin account will be activated immediately. You can login right after registration.'}
                      {formData.role === 'parent' && `Your parent account and ${parentChildren.length} student account(s) will be created immediately. You can login right after registration.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
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
                formData.role === 'teacher' ? 'Submit for Approval' : 'Create Account'
              )}
            </button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-3">
              Registration {formData.role === 'teacher' ? 'Submitted' : 'Complete'}!
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
                  Your parent account and {parentChildren.length} student account(s) have been created successfully!
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                  <p className="font-semibold text-green-900 mb-2">Your children have been enrolled:</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {parentChildren.map((child, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span>{child.gender === 'male' ? '👦' : '👧'}</span>
                        <span>{child.firstName} {child.lastName} - {child.className}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mt-4">
                  <p className="font-semibold text-blue-900 mb-2">What you can do:</p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>View your children's attendance and grades</li>
                    <li>Check fee payment status</li>
                    <li>Receive school notifications</li>
                    <li>Communicate with teachers</li>
                  </ul>
                </div>
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">School AI Agent</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {/* Step Indicator */}
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

        {/* Content */}
        {renderStepContent()}
      </div>
    </div>
  );
}