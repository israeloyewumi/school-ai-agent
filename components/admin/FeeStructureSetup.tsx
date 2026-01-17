// components/admin/FeeStructureSetup.tsx - Setup Fee Structure for Classes

'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { setFeeStructure, getFeeStructure } from '@/lib/firebase/feeManagement';
import { Class, FeeStructure, FeeItem, FeeCategory } from '@/types/database';

interface FeeStructureSetupProps {
  currentTerm: string;
  currentSession: string;
  currentAcademicYear: string;
  adminUserId: string;
}

const feeCategories: { value: FeeCategory; label: string }[] = [
  { value: 'tuition', label: 'Tuition' },
  { value: 'development', label: 'Development Levy' },
  { value: 'sports', label: 'Sports' },
  { value: 'library', label: 'Library' },
  { value: 'exam', label: 'Examination' },
  { value: 'transport', label: 'Transport' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'books', label: 'Books' },
  { value: 'pta', label: 'PTA Levy' },
  { value: 'excursion', label: 'Excursion' },
  { value: 'other', label: 'Other' },
];

export default function FeeStructureSetup({
  currentTerm,
  currentSession,
  currentAcademicYear,
  adminUserId,
}: FeeStructureSetupProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [existingStructure, setExistingStructure] = useState<FeeStructure | null>(null);
  
  // Fee items
  const [feeItems, setFeeItems] = useState<FeeItem[]>([
    { category: 'tuition', description: 'Tuition Fee', amount: 0, isMandatory: true },
  ]);
  
  const [dueDate, setDueDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadExistingStructure();
    }
  }, [selectedClass, currentTerm, currentSession]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classesQuery = query(collection(db, 'classes'));
      const snapshot = await getDocs(classesQuery);
      const classesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Class[];
      
      // Sort by grade and section
      classesList.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.section.localeCompare(b.section);
      });
      
      setClasses(classesList);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingStructure = async () => {
    if (!selectedClass) return;
    
    try {
      const structure = await getFeeStructure(selectedClass.id, currentTerm, currentSession);
      if (structure) {
        setExistingStructure(structure);
        setFeeItems(structure.items);
        setDueDate(new Date(structure.dueDate).toISOString().split('T')[0]);
      } else {
        setExistingStructure(null);
        setFeeItems([
          { category: 'tuition', description: 'Tuition Fee', amount: 0, isMandatory: true },
        ]);
        setDueDate('');
      }
    } catch (err) {
      console.error('Error loading existing structure:', err);
    }
  };

  const handleAddFeeItem = () => {
    setFeeItems([
      ...feeItems,
      { category: 'development', description: '', amount: 0, isMandatory: false },
    ]);
  };

  const handleRemoveFeeItem = (index: number) => {
    setFeeItems(feeItems.filter((_, i) => i !== index));
  };

  const handleFeeItemChange = (
    index: number,
    field: keyof FeeItem,
    value: string | number | boolean
  ) => {
    const newItems = [...feeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFeeItems(newItems);
  };

  const calculateTotal = () => {
    return feeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      setError('Please select a class');
      return;
    }

    if (!dueDate) {
      setError('Please set a due date');
      return;
    }

    if (feeItems.length === 0) {
      setError('Please add at least one fee item');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      setError('Total fee amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const result = await setFeeStructure({
        classId: selectedClass.id,
        className: selectedClass.className,
        term: currentTerm,
        session: currentSession,
        academicYear: currentAcademicYear,
        items: feeItems,
        dueDate: new Date(dueDate),
        createdBy: adminUserId,
      });

      if (result.success) {
        setSuccess(true);
        setError('');
        await loadExistingStructure();
      } else {
        setError(result.error || 'Failed to set fee structure');
      }
    } catch (err: any) {
      console.error('Error setting fee structure:', err);
      setError(err.message || 'Failed to set fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Setup Fee Structure</h2>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-green-800">Fee Structure Saved Successfully!</p>
                <p className="text-sm text-green-700">Students in this class can now make payments.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Class Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedClass?.id || ''}
            onChange={(e) => {
              const cls = classes.find((c) => c.id === e.target.value);
              setSelectedClass(cls || null);
              setSuccess(false);
              setError('');
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.className} ({cls.level})
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Class</p>
                  <p className="text-blue-900 font-bold">{selectedClass.className}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Term</p>
                  <p className="text-blue-900 font-bold">{currentTerm}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Session</p>
                  <p className="text-blue-900 font-bold">{currentSession}</p>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Fee Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Fee Items <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddFeeItem}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  + Add Fee Item
                </button>
              </div>

              <div className="space-y-4">
                {feeItems.map((item, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Category */}
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleFeeItemChange(index, 'category', e.target.value as FeeCategory)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {feeCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="col-span-4">
                        <label className="block text-xs text-gray-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleFeeItemChange(index, 'description', e.target.value)}
                          placeholder="e.g., First term tuition"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      {/* Amount */}
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-600 mb-1">Amount (₦)</label>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleFeeItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      {/* Mandatory Checkbox */}
                      <div className="col-span-1 flex items-end">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isMandatory}
                            onChange={(e) => handleFeeItemChange(index, 'isMandatory', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="ml-2 text-xs text-gray-600">Req</span>
                        </label>
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 flex items-end justify-end">
                        {feeItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFeeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-green-900">Total Fee Amount:</span>
                <span className="text-2xl font-bold text-green-900">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving...' : existingStructure ? 'Update Fee Structure' : 'Save Fee Structure'}
              </button>

              {existingStructure && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass(null);
                    setSuccess(false);
                    setError('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Select Another Class
                </button>
              )}
            </div>

            {/* Existing Structure Notice */}
            {existingStructure && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This class already has a fee structure for {currentTerm}. 
                  Submitting this form will update the existing structure.
                </p>
              </div>
            )}
          </form>
        )}

        {/* Instructions */}
        {!selectedClass && (
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Select the class you want to set up fees for</li>
              <li>Set the payment due date</li>
              <li>Add fee items (tuition, development, etc.)</li>
              <li>Enter the amount for each fee</li>
              <li>Mark items as mandatory if required</li>
              <li>Review the total and save</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}