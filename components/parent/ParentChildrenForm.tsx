// components/parent/ParentChildrenForm.tsx - Fixed for Standard Nigerian Curriculum
"use client";

import { useState } from 'react';
import { 
  ALL_CLASSES,
  getCoreSubjectsForGrade,
  getElectiveSubjectsForGrade,
  getSubjectsByTrack,
  requiresTrackSelection,
  getJSSElectiveRequirements,
  AcademicTrack,
  SubjectInfo
} from '@/lib/config/schoolData';

interface Child {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  age: number;
  classId: string;
  className: string;
  grade: number;
  // Subject selection
  subjects?: string[];
  academicTrack?: AcademicTrack;
}

interface ParentChildrenFormProps {
  children: Child[];
  onChildrenChanged: (children: Child[]) => void;
}

export default function ParentChildrenForm({
  children,
  onChildrenChanged
}: ParentChildrenFormProps) {
  const [editingChild, setEditingChild] = useState<Child>({
    firstName: '',
    lastName: '',
    gender: 'male',
    dateOfBirth: new Date(),
    age: 0,
    classId: '',
    className: '',
    grade: 0,
    subjects: [],
    academicTrack: null
  });
  const [isAdding, setIsAdding] = useState(false);
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'Primary' | 'Junior Secondary' | 'Senior Secondary' | 'All'>('All');
  
  // Subject selection state
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);

  // Filter classes by level
  const filteredClasses = levelFilter === 'All' 
    ? ALL_CLASSES 
    : ALL_CLASSES.filter(c => c.level === levelFilter);

  function calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  function handleDateChange(dateString: string) {
    const date = new Date(dateString);
    const age = calculateAge(date);
    
    setEditingChild(prev => ({
      ...prev,
      dateOfBirth: date,
      age
    }));
  }

  function handleClassSelect(classId: string, className: string, grade: number) {
    setEditingChild(prev => ({
      ...prev,
      classId,
      className,
      grade,
      subjects: [],
      academicTrack: null
    }));
    setSelectedElectives([]);
  }

  function proceedToSubjectSelection() {
    if (!editingChild.firstName || !editingChild.lastName || !editingChild.classId) {
      alert('Please fill all required fields');
      return;
    }
    setShowSubjectSelection(true);
  }

  function handleSelectAllCoreSubjects() {
    const coreSubjects = getCoreSubjectsForGrade(editingChild.grade);
    const coreIds = coreSubjects.map(s => s.subjectId);
    
    setEditingChild(prev => ({
      ...prev,
      subjects: [...coreIds]
    }));
  }

  function handleTrackSelection(track: AcademicTrack) {
    setEditingChild(prev => ({
      ...prev,
      academicTrack: track,
      subjects: []
    }));
  }

  function handleSelectAllTrackCore() {
    if (!editingChild.academicTrack) return;
    
    const ssCore = getCoreSubjectsForGrade(editingChild.grade).map(s => s.subjectId);
    const trackSubjects = getSubjectsByTrack(editingChild.academicTrack);
    const trackCoreSubjects = trackSubjects.filter(s => !s.isElective).map(s => s.subjectId);
    
    setEditingChild(prev => ({
      ...prev,
      subjects: [...ssCore, ...trackCoreSubjects]
    }));
  }

  function handleElectiveToggle(subjectId: string) {
    const requirements = getJSSElectiveRequirements();
    
    if (selectedElectives.includes(subjectId)) {
      setSelectedElectives(prev => prev.filter(id => id !== subjectId));
    } else {
      if (selectedElectives.length >= requirements.max) {
        alert(`You can only select up to ${requirements.max} elective subjects`);
        return;
      }
      setSelectedElectives(prev => [...prev, subjectId]);
    }
  }

  function handleSSElectiveToggle(subjectId: string) {
    const currentElectives = editingChild.subjects?.filter(id => {
      const trackSubjects = getSubjectsByTrack(editingChild.academicTrack!);
      return trackSubjects.find(s => s.subjectId === id && s.isElective);
    }) || [];
    
    if (currentElectives.includes(subjectId)) {
      setEditingChild(prev => ({
        ...prev,
        subjects: prev.subjects?.filter(id => id !== subjectId) || []
      }));
    } else {
      if (currentElectives.length >= 2) {
        alert('You can select up to 2 elective subjects for your track');
        return;
      }
      setEditingChild(prev => ({
        ...prev,
        subjects: [...(prev.subjects || []), subjectId]
      }));
    }
  }

function finalizeJSSSubjects() {
    const requirements = getJSSElectiveRequirements();
    if (selectedElectives.length < requirements.min) {
      alert(`Please select at least ${requirements.min} elective subjects`);
      return;
    }
    
    const coreSubjects = getCoreSubjectsForGrade(editingChild.grade).map(s => s.subjectId);
    const allSubjects = [...coreSubjects, ...selectedElectives];
    
    console.log('🎓 Finalizing JSS subjects:', {
      coreCount: coreSubjects.length,
      electivesCount: selectedElectives.length,
      totalCount: allSubjects.length,
      core: coreSubjects,
      electives: selectedElectives,
      combined: allSubjects
    });
    
    // Update child with combined subjects BEFORE adding
    const updatedChild = {
      ...editingChild,
      subjects: allSubjects
    };
    
    // Add the child with the updated subjects
    onChildrenChanged([...children, updatedChild]);
    
    // Reset form
    setEditingChild({
      firstName: '',
      lastName: '',
      gender: 'male',
      dateOfBirth: new Date(),
      age: 0,
      classId: '',
      className: '',
      grade: 0,
      subjects: [],
      academicTrack: null
    });
    setSelectedElectives([]);
    setIsAdding(false);
    setShowSubjectSelection(false);
  }

  function finalizeSSSubjects() {
    const allSubjects = editingChild.subjects || [];
    
    if (allSubjects.length < 6) {
      alert('Please complete your subject selection (minimum 6 subjects)');
      return;
    }
    
    addChild();
  }

  function addChild() {
    const finalChild = { ...editingChild };
    onChildrenChanged([...children, finalChild]);
    
    // Reset form
    setEditingChild({
      firstName: '',
      lastName: '',
      gender: 'male',
      dateOfBirth: new Date(),
      age: 0,
      classId: '',
      className: '',
      grade: 0,
      subjects: [],
      academicTrack: null
    });
    setSelectedElectives([]);
    setIsAdding(false);
    setShowSubjectSelection(false);
  }

  function removeChild(index: number) {
    const updated = children.filter((_, i) => i !== index);
    onChildrenChanged(updated);
  }

  // Render subject selection based on grade
  function renderSubjectSelection() {
    const grade = editingChild.grade;
    
    // PRIMARY (Grades 1-6): All subjects are compulsory
    if (grade >= 1 && grade <= 6) {
      const coreSubjects = getCoreSubjectsForGrade(grade);
      const allSelected = editingChild.subjects?.length === coreSubjects.length;
      
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Primary Level - All Subjects Compulsory</h4>
            <p className="text-sm text-blue-700 mb-4">
              For grades 1-6, all subjects are required and will be automatically selected.
            </p>
            
            <button
              onClick={handleSelectAllCoreSubjects}
              disabled={allSelected}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                allSelected
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {allSelected ? '✓ All Core Subjects Selected' : 'Select All Core Subjects'}
            </button>
            
            {allSelected && (
              <div className="mt-4 bg-white rounded p-3">
                <p className="font-medium text-sm mb-2">Selected Subjects ({coreSubjects.length}):</p>
                <ul className="text-xs space-y-1">
                  {coreSubjects.map(subject => (
                    <li key={subject.subjectId} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>{subject.subjectName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {allSelected && (
            <button
              onClick={addChild}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Complete Registration
            </button>
          )}
        </div>
      );
    }
    
    // JUNIOR SECONDARY (Grades 7-9): Core + Electives
    if (grade >= 7 && grade <= 9) {
      const coreSubjects = getCoreSubjectsForGrade(grade);
      const electiveSubjects = getElectiveSubjectsForGrade(grade);
      const requirements = getJSSElectiveRequirements();
      const coreSelected = editingChild.subjects?.length === coreSubjects.length;
      
      return (
        <div className="space-y-4">
          {/* Step 1: Core Subjects */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Step 1: Core Subjects (Compulsory)</h4>
            <button
              onClick={handleSelectAllCoreSubjects}
              disabled={coreSelected}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                coreSelected
                  ? 'bg-green-500 text-white cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {coreSelected ? `✓ ${coreSubjects.length} Core Subjects Selected` : 'Select All Core Subjects'}
            </button>
          </div>
          
          {/* Step 2: Elective Subjects */}
{coreSelected && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <h4 className="font-semibold text-green-900 mb-2">
      Step 2: Elective Subjects (Select {requirements.min}-{requirements.max})
    </h4>
    <p className="text-sm text-green-700 mb-3">
      Selected: {selectedElectives.length} / {requirements.max}
    </p>
    
    {/* ✅ Add religious studies options */}
    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-xs font-semibold text-blue-900 mb-2">Religious Studies (Choose ONE):</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            // Remove IRS if CRS is selected
            const newElectives = selectedElectives.filter(id => id !== 'islamic_studies');
            if (!newElectives.includes('christian_religious_studies')) {
              setSelectedElectives([...newElectives, 'christian_religious_studies']);
            }
          }}
          className={`p-2 rounded-lg border-2 text-left transition-all text-sm ${
            selectedElectives.includes('christian_religious_studies')
              ? 'border-green-500 bg-green-100'
              : 'border-gray-300 hover:border-green-300 bg-white'
          }`}
        >
          {selectedElectives.includes('christian_religious_studies') && <span className="text-green-500">✓ </span>}
          CRS
        </button>
        <button
          type="button"
          onClick={() => {
            // Remove CRS if IRS is selected
            const newElectives = selectedElectives.filter(id => id !== 'christian_religious_studies');
            if (!newElectives.includes('islamic_studies')) {
              setSelectedElectives([...newElectives, 'islamic_studies']);
            }
          }}
          className={`p-2 rounded-lg border-2 text-left transition-all text-sm ${
            selectedElectives.includes('islamic_studies')
              ? 'border-green-500 bg-green-100'
              : 'border-gray-300 hover:border-green-300 bg-white'
          }`}
        >
          {selectedElectives.includes('islamic_studies') && <span className="text-green-500">✓ </span>}
          Islamic Studies
        </button>
      </div>
    </div>
    
    <p className="text-xs font-semibold text-gray-700 mb-2">Other Electives:</p>
    <div className="grid grid-cols-2 gap-2">
      {electiveSubjects.map(subject => (
                  <button
                    key={subject.subjectId}
                    onClick={() => handleElectiveToggle(subject.subjectId)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedElectives.includes(subject.subjectId)
                        ? 'border-green-500 bg-green-100'
                        : 'border-gray-300 hover:border-green-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedElectives.includes(subject.subjectId) && (
                        <span className="text-green-500">✓</span>
                      )}
                      <span className="text-sm font-medium">{subject.subjectName}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {selectedElectives.length >= requirements.min && (
                <button
                  onClick={finalizeJSSSubjects}
                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Complete Registration ({coreSubjects.length + selectedElectives.length} subjects)
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
    
// SENIOR SECONDARY (Grades 10-12): Track Selection + Core + Electives + Trade
if (grade >= 10 && grade <= 12) {
  const ssCore = getCoreSubjectsForGrade(grade);
  
  // Define trade subjects
  const tradeSubjects = [
    { id: 'trade_welding', name: 'Welding & Fabrication' },
    { id: 'trade_carpentry', name: 'Carpentry & Joinery' },
    { id: 'trade_electrical', name: 'Electrical Installation' },
    { id: 'trade_plumbing', name: 'Plumbing & Pipe Fitting' },
    { id: 'trade_auto', name: 'Auto Mechanics' },
    { id: 'trade_tailoring', name: 'Tailoring & Fashion Design' },
    { id: 'trade_catering', name: 'Catering & Hotel Management' },
    { id: 'trade_computer', name: 'Computer Hardware Maintenance' }
  ];
  
  return (
    <div className="space-y-4">
      {/* Step 1: Select Academic Track */}
      {!editingChild.academicTrack && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-3">Step 1: Choose Academic Track</h4>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleTrackSelection('Science')}
              className="p-4 bg-white border-2 border-purple-300 hover:border-purple-500 rounded-lg transition-all"
            >
              <div className="text-3xl mb-2">🔬</div>
              <div className="font-semibold">Science</div>
              <div className="text-xs text-gray-600 mt-1">Biology, Chemistry, Physics</div>
            </button>
            <button
              onClick={() => handleTrackSelection('Arts')}
              className="p-4 bg-white border-2 border-purple-300 hover:border-purple-500 rounded-lg transition-all"
            >
              <div className="text-3xl mb-2">📚</div>
              <div className="font-semibold">Arts</div>
              <div className="text-xs text-gray-600 mt-1">Literature, History, Government</div>
            </button>
            <button
              onClick={() => handleTrackSelection('Commercial')}
              className="p-4 bg-white border-2 border-purple-300 hover:border-purple-500 rounded-lg transition-all"
            >
              <div className="text-3xl mb-2">💼</div>
              <div className="font-semibold">Commercial</div>
              <div className="text-xs text-gray-600 mt-1">Economics, Accounting, Commerce</div>
            </button>
          </div>
        </div>
      )}
      
      {/* Step 2: Select Core Subjects */}
      {editingChild.academicTrack && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900">
              Step 2: {editingChild.academicTrack} Track - Core Subjects
            </h4>
            <button
              onClick={() => handleTrackSelection(null)}
              className="text-sm text-blue-600 hover:underline"
            >
              Change Track
            </button>
          </div>
          
          <button
            onClick={handleSelectAllTrackCore}
            disabled={editingChild.subjects && editingChild.subjects.length > 0}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              editingChild.subjects && editingChild.subjects.length > 0
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {editingChild.subjects && editingChild.subjects.length > 0
              ? '✓ Core Subjects Selected'
              : 'Select All Core Subjects'}
          </button>
        </div>
      )}
      
      {/* Step 3: Elective Subjects (optional) */}
      {editingChild.subjects && editingChild.subjects.length > 0 && !editingChild.tradeSubject && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-3">
            Step 3: Elective Subjects (Optional - up to 2)
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            {getSubjectsByTrack(editingChild.academicTrack!)
              .filter(s => s.isElective)
              .map(subject => {
                const isSelected = editingChild.subjects?.includes(subject.subjectId);
                return (
                  <button
                    key={subject.subjectId}
                    onClick={() => handleSSElectiveToggle(subject.subjectId)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-100'
                        : 'border-gray-300 hover:border-green-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <span className="text-green-500">✓</span>}
                      <span className="text-sm font-medium">{subject.subjectName}</span>
                    </div>
                  </button>
                );
              })}
          </div>
          
          <button
            onClick={() => {
              // Move to trade subject selection
              // Don't add child yet - need trade subject first
            }}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Next: Select Trade Subject →
          </button>
        </div>
      )}
      
      {/* Step 4: Trade Subject Selection (REQUIRED) */}
      {editingChild.subjects && editingChild.subjects.length > 0 && !editingChild.tradeSubject && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-orange-900 mb-2">
            Step 4: Select Trade Subject (Required) *
          </h4>
          <p className="text-sm text-orange-700 mb-3">
            All Senior Secondary students must select a vocational/trade subject
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {tradeSubjects.map(trade => (
              <button
                key={trade.id}
                onClick={() => {
                  setEditingChild(prev => ({
                    ...prev,
                    tradeSubject: trade.id,
                    // Add trade subject to subjects array if not already there
                    subjects: prev.subjects?.includes(trade.id) 
                      ? prev.subjects 
                      : [...(prev.subjects || []), trade.id]
                  }));
                }}
                className="p-3 rounded-lg border-2 border-orange-300 hover:border-orange-500 bg-white text-left transition-all"
              >
                <span className="text-sm font-medium">{trade.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Final Step: Complete Registration */}
      {editingChild.tradeSubject && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">✓ All Requirements Complete!</h4>
          <div className="text-sm text-green-700 space-y-1 mb-4">
            <p>• Academic Track: <strong>{editingChild.academicTrack}</strong></p>
            <p>• Academic Subjects: <strong>{editingChild.subjects?.length || 0}</strong></p>
            <p>• Trade Subject: <strong>{tradeSubjects.find(t => t.id === editingChild.tradeSubject)?.name}</strong></p>
          </div>
          
          <button
            onClick={finalizeSSSubjects}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Complete Registration
          </button>
        </div>
      )}
    </div>
  );
}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Children/Wards ({children.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Child
          </button>
        )}
      </div>

      {/* Existing Children List */}
      {children.length > 0 && (
        <div className="space-y-2">
          {children.map((child, index) => (
            <div
              key={index}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">
                    {child.gender === 'male' ? '👦' : '👧'}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {child.className} • Age {child.age} • {child.gender === 'male' ? 'Male' : 'Female'}
                    </p>
                    {child.subjects && child.subjects.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {child.subjects.length} subjects selected
                        {child.academicTrack && ` • ${child.academicTrack} Track`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeChild(index)}
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Child Form */}
      {isAdding && !showSubjectSelection && (
        <div className="bg-white border-2 border-blue-300 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Add New Child</h4>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editingChild.firstName}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ahmed"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editingChild.lastName}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Bello"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={editingChild.gender}
                  onChange={(e) => setEditingChild(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={editingChild.dateOfBirth.toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {editingChild.age > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Age:</strong> {editingChild.age} years old
                </p>
              </div>
            )}

            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class *
              </label>

              <div className="flex gap-2 mb-3">
                {(['All', 'Primary', 'Junior Secondary', 'Senior Secondary'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setLevelFilter(level)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      levelFilter === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {filteredClasses.map((cls) => (
                  <button
                    key={cls.classId}
                    type="button"
                    onClick={() => handleClassSelect(cls.classId, cls.className, cls.grade)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      editingChild.classId === cls.classId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-sm">{cls.className}</div>
                    <div className="text-xs text-gray-500 mt-1">{cls.level}</div>
                  </button>
                ))}
              </div>

              {editingChild.classId && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Selected: <strong>{editingChild.className}</strong>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingChild({
                    firstName: '',
                    lastName: '',
                    gender: 'male',
                    dateOfBirth: new Date(),
                    age: 0,
                    classId: '',
                    className: '',
                    grade: 0,
                    subjects: [],
                    academicTrack: null
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedToSubjectSelection}
                disabled={!editingChild.classId}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
              >
                Next: Select Subjects →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Selection Screen */}
      {isAdding && showSubjectSelection && (
        <div className="bg-white border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800">
              Subject Selection - {editingChild.firstName} {editingChild.lastName} ({editingChild.className})
            </h4>
            <button
              onClick={() => setShowSubjectSelection(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
          </div>
          
          {renderSubjectSelection()}
        </div>
      )}

      {/* Empty State */}
      {children.length === 0 && !isAdding && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-2">👶</div>
          <p className="text-gray-600 mb-4">No children added yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Add Your First Child
          </button>
        </div>
      )}

      {/* Minimum Requirement Notice */}
      {children.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Note:</strong> You must add at least one child to complete registration.
          </p>
        </div>
      )}
    </div>
  );
}