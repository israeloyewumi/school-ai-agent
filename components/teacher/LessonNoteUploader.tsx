import React, { useState } from 'react';
import { Upload, FileText, BookOpen, ClipboardList, Loader2, Check, X, Camera, Image as ImageIcon } from 'lucide-react';
import { createLessonPlan, createClassWork } from '@/lib/firebase/lessonManagement';

interface LessonNoteUploaderProps {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface ClassWork {
  id: string;
  title: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  questions: string[];
}

interface LessonPlan {
  topic: string;
  objectives: string[];
  introduction: string;
  mainContent: string[];
  activities: string[];
  conclusion: string;
  assessment: string;
}

type Step = 'upload' | 'processing' | 'preview' | 'saving' | 'complete';

export default function LessonNoteUploader({
  teacherId,
  teacherName,
  classId,
  className,
  subjectId,
  subjectName,
  onComplete,
  onCancel
}: LessonNoteUploaderProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [noteText, setNoteText] = useState('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [classWorks, setClassWorks] = useState<ClassWork[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'plan' | 'classworks'>('plan');
  const [selectedClassWork, setSelectedClassWork] = useState<ClassWork | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file' | 'image'>('text');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Only accept text files and PDFs
      if (selectedFile.type === 'text/plain' || selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setUploadMethod('file');
        setError('');
      } else {
        setError('Please upload a text file (.txt) or PDF (.pdf)');
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validImages = selectedFiles.filter(f => 
      f.type.startsWith('image/')
    );
    
    if (validImages.length > 0) {
      setImageFiles(prev => [...prev, ...validImages]);
      setUploadMethod('image');
      setError('');
    } else {
      setError('Please upload valid image files (JPG, PNG, etc.)');
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value);
    setUploadMethod('text');
    setError('');
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processNote = async () => {
    if (!file && !noteText.trim() && imageFiles.length === 0) {
      setError('Please upload a file, paste text, or upload images of your notes');
      return;
    }

    setStep('processing');
    setError('');

    try {
      let content = noteText;
      let images: Array<{ data: string; mimeType: string }> = [];

      // If file is uploaded, read it
      if (file && uploadMethod === 'file') {
        if (file.type === 'text/plain') {
          content = await file.text();
        } else if (file.type === 'application/pdf') {
          content = noteText || 'PDF content would be extracted here';
        }
      }

      // If images are uploaded, convert to base64
      if (imageFiles.length > 0 && uploadMethod === 'image') {
        for (const imageFile of imageFiles) {
          const base64Data = await convertImageToBase64(imageFile);
          images.push({
            data: base64Data,
            mimeType: imageFile.type
          });
        }
      }

      // Call your Next.js API route (which uses Gemini)
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          images,
          className,
          subjectName
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the text from the response
      const aiResponse = data.content[0].text;

      // Parse JSON response
      const parsed = JSON.parse(aiResponse);
      
      setLessonPlan(parsed.lessonPlan);
      setClassWorks(parsed.classWorks);
      setStep('preview');

    } catch (err: any) {
      console.error('Error processing note:', err);
      setError('Failed to generate lesson plan. Please try again.');
      setStep('upload');
    }
  };

  const saveLessonAndClassworks = async () => {
    if (!lessonPlan) return;
    
    setStep('saving');

    try {
      // Get current academic session info
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 0-indexed
      
      // Determine term based on month (Nigerian school calendar)
      let term: string;
      if (currentMonth >= 9 && currentMonth <= 12) {
        term = 'First Term';
      } else if (currentMonth >= 1 && currentMonth <= 4) {
        term = 'Second Term';
      } else {
        term = 'Third Term';
      }
      
      // Determine academic session (e.g., "2024/2025")
      const session = currentMonth >= 9 
        ? `${currentYear}/${currentYear + 1}`
        : `${currentYear - 1}/${currentYear}`;

      console.log('📝 Saving lesson plan with data:', {
        teacherId,
        teacherName,
        classId,
        className,
        subjectId,
        subjectName,
        topic: lessonPlan.topic,
        term,
        session
      });

      // Save lesson plan to Firebase
      const lessonPlanId = await createLessonPlan({
        teacherId,
        teacherName,
        classId,
        className,
        subjectId,
        subjectName,
        topic: lessonPlan.topic,
        objectives: lessonPlan.objectives,
        introduction: lessonPlan.introduction,
        mainContent: lessonPlan.mainContent,
        activities: lessonPlan.activities,
        conclusion: lessonPlan.conclusion,
        assessment: lessonPlan.assessment,
        term,
        session
      });

      console.log('✅ Lesson plan saved with ID:', lessonPlanId);

      // Save all 6 classworks to Firebase
      for (const classWork of classWorks) {
        await createClassWork({
          lessonPlanId,
          teacherId,
          teacherName,
          classId,
          className,
          subjectId,
          subjectName,
          title: classWork.title,
          difficulty: classWork.difficulty,
          questions: classWork.questions,
          isPublished: false, // Start as draft/unpublished
          term,
          session
        });
      }

      console.log('✅ Saved lesson plan and classworks to Firebase!');
      
      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err: any) {
      console.error('❌ Error saving to Firebase:', err);
      console.error('Error details:', err.message);
      setError(`Failed to save: ${err.message || 'Please try again.'}`);
      setStep('preview');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen size={32} />
                AI Lesson Planner
              </h2>
              <p className="mt-2 text-purple-100">
                {className} • {subjectName}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center mb-8">
                <FileText size={64} className="mx-auto text-purple-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Upload Your Lesson Note
                </h3>
                <p className="text-gray-600">
                  AI will generate a structured lesson plan and 6 classworks (2 easy, 2 moderate, 2 hard)
                </p>
              </div>

              {/* Upload Method Tabs */}
              <div className="flex gap-2 border-b border-gray-200 mb-6">
                <button
                  onClick={() => setUploadMethod('text')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    uploadMethod === 'text'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={18} />
                    Type/Paste Text
                  </div>
                </button>
                <button
                  onClick={() => setUploadMethod('file')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    uploadMethod === 'file'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Upload size={18} />
                    Upload File
                  </div>
                </button>
                <button
                  onClick={() => setUploadMethod('image')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    uploadMethod === 'image'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Camera size={18} />
                    Handwritten Notes
                  </div>
                </button>
              </div>

              {/* Text Input */}
              {uploadMethod === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Your Lesson Note
                  </label>
                  <textarea
                    value={noteText}
                    onChange={handleTextInput}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Paste your lesson note here..."
                  />
                </div>
              )}

              {/* File Upload */}
              {uploadMethod === 'file' && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                  <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-purple-600 hover:text-purple-700 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Text files (.txt) or PDF files (.pdf)
                  </p>
                  {file && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg inline-flex items-center gap-2">
                      <Check size={20} className="text-green-600" />
                      <span className="text-green-800 font-medium">{file.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Image Upload for Handwritten Notes */}
              {uploadMethod === 'image' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors bg-purple-50">
                    <Camera size={48} className="mx-auto text-purple-600 mb-4" />
                    <label className="cursor-pointer">
                      <span className="text-purple-600 hover:text-purple-700 font-medium text-lg">
                        Upload Photos of Handwritten Notes
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-purple-700 mt-2">
                      JPG, PNG, HEIC, etc. • Multiple pages supported
                    </p>
                    <p className="text-xs text-purple-600 mt-2">
                      📱 AI will read your handwriting automatically
                    </p>
                    {imageFiles.length > 10 && (
                      <p className="text-xs text-orange-600 mt-2 font-semibold">
                        ⚠️ Maximum 10 images recommended for best performance
                      </p>
                    )}
                  </div>

                  {/* Image Previews */}
                  {imageFiles.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600">
                          {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} uploaded
                          {imageFiles.length > 10 && ' (first 10 will be processed)'}
                        </p>
                        <button
                          onClick={() => setImageFiles([])}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imageFiles.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={URL.createObjectURL(img)}
                              alt={`Note page ${idx + 1}`}
                              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                            />
                            <button
                              onClick={() => removeImage(idx)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                              Page {idx + 1}
                              {idx >= 10 && (
                                <span className="ml-1 text-orange-300">(skipped)</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={processNote}
                disabled={!file && !noteText.trim() && imageFiles.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <BookOpen size={20} />
                Generate Lesson Plan & Classworks
              </button>
            </div>
          )}

          {/* PROCESSING STEP */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={64} className="text-purple-600 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                AI is Working...
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                {uploadMethod === 'image' 
                  ? 'Reading handwritten notes and creating lesson plan...'
                  : 'Creating a comprehensive lesson plan and 6 theory-based classworks tailored for ' + className
                }
              </p>
              <div className="mt-8 space-y-2 text-sm text-gray-500">
                {uploadMethod === 'image' && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    Reading handwritten text...
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Analyzing lesson content...
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Generating learning objectives...
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                  Creating 60 theory questions...
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && lessonPlan && (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'plan'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={20} />
                    Lesson Plan
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('classworks')}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === 'classworks'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList size={20} />
                    Classworks (6)
                  </div>
                </button>
              </div>

              {/* Lesson Plan Tab */}
              {activeTab === 'plan' && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-2xl font-bold text-purple-900 mb-2">
                      {lessonPlan.topic}
                    </h3>
                    <p className="text-purple-700">
                      {className} • {subjectName}
                    </p>
                  </div>

                  <div className="grid gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                        🎯 Learning Objectives
                      </h4>
                      <ul className="space-y-2">
                        {lessonPlan.objectives.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">{idx + 1}.</span>
                            <span className="text-gray-700">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">
                        📝 Introduction
                      </h4>
                      <p className="text-gray-700">{lessonPlan.introduction}</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">
                        📚 Main Content
                      </h4>
                      <ul className="space-y-3">
                        {lessonPlan.mainContent.map((content, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="bg-purple-100 text-purple-700 font-bold rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <span className="text-gray-700">{content}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">
                        🎨 Learning Activities
                      </h4>
                      <ul className="space-y-2">
                        {lessonPlan.activities.map((activity, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-purple-600">•</span>
                            <span className="text-gray-700">{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">
                        ✅ Conclusion
                      </h4>
                      <p className="text-gray-700">{lessonPlan.conclusion}</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">
                        📊 Assessment
                      </h4>
                      <p className="text-gray-700">{lessonPlan.assessment}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Classworks Tab */}
              {activeTab === 'classworks' && (
                <div className="space-y-6">
                  {!selectedClassWork ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800">
                          <strong>6 Theory-Based Classworks</strong> • 2 Easy, 2 Moderate, 2 Hard • 10 Questions Each
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {classWorks.map((cw) => (
                          <button
                            key={cw.id}
                            onClick={() => setSelectedClassWork(cw)}
                            className={`p-6 border-2 rounded-xl text-left transition-all hover:shadow-lg ${getDifficultyColor(cw.difficulty)}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-bold text-lg">{cw.title}</h4>
                              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase">
                                {cw.difficulty}
                              </span>
                            </div>
                            <p className="text-sm opacity-75 mb-3">
                              10 theory questions
                            </p>
                            <div className="text-sm font-medium">
                              Click to view questions →
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <button
                        onClick={() => setSelectedClassWork(null)}
                        className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                      >
                        ← Back to All Classworks
                      </button>

                      <div className={`p-6 border-2 rounded-xl ${getDifficultyColor(selectedClassWork.difficulty)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold">{selectedClassWork.title}</h3>
                          <span className="px-4 py-2 rounded-full text-sm font-bold uppercase">
                            {selectedClassWork.difficulty}
                          </span>
                        </div>
                        <p className="opacity-75">10 Theory Questions</p>
                      </div>

                      <div className="space-y-4">
                        {selectedClassWork.questions.map((question, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5">
                            <div className="flex items-start gap-4">
                              <span className="bg-purple-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-gray-800 flex-1">{question}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SAVING STEP */}
          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={64} className="text-purple-600 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Saving to Firebase...
              </h3>
              <p className="text-gray-600">
                Your lesson plan and classworks will be available in your library
              </p>
            </div>
          )}

          {/* COMPLETE STEP */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <Check size={40} className="text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-2">
                All Set! 🎉
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-4">
                Your lesson plan and 6 classworks have been saved to Firebase
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <p className="text-purple-800 font-medium">
                  Lesson: {lessonPlan?.topic}
                </p>
                <p className="text-purple-600 text-sm mt-1">
                  6 classworks • 60 theory questions total
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'preview' && (
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-4">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={saveLessonAndClassworks}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Save to Firebase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}