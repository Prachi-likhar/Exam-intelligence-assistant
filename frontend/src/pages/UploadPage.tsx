import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileCheck2,
  AlertCircle,
  Trash2,
  Sparkles,
  Clipboard,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { DocumentItem } from '../types';
import { Badge } from '../components/common/Badge';

export const UploadPage: React.FC = () => {
  const { activeCourse, showToast, refreshCourses } = useCourse();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<'question_paper' | 'syllabus' | 'course_material'>('question_paper');
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear());
  const [semester, setSemester] = useState<string>('5th Semester');
  const [examType, setExamType] = useState<string>('End-Sem');

  // Paste Text Form State
  const [pasteDocType, setPasteDocType] = useState<'question_paper' | 'syllabus'>('question_paper');
  const [pasteFilename, setPasteFilename] = useState('Pasted_Exam_Questions.txt');
  const [pasteText, setPasteText] = useState('');
  const [pasteYear, setPasteYear] = useState<number>(new Date().getFullYear());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    if (!activeCourse) return;
    try {
      const docs = await api.getDocuments(activeCourse.id);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeCourse]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeCourse) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('course_id', activeCourse.id);
      formData.append('doc_type', docType);
      formData.append('exam_year', examYear.toString());
      formData.append('semester', semester);
      formData.append('exam_type', examType);
      formData.append('file', selectedFile);

      const res = await api.uploadDocument(formData);
      showToast(`Document "${res.filename}" processed! Extracted ${res.question_count} questions.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error uploading: ' + (err.message || 'Processing failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim() || !activeCourse) return;

    try {
      setIsLoading(true);
      const res = await api.pasteText({
        course_id: activeCourse.id,
        filename: pasteFilename.trim() || 'Pasted_Document.txt',
        doc_type: pasteDocType,
        raw_text: pasteText,
        exam_year: pasteYear,
        semester: semester,
        exam_type: examType,
      });

      showToast(`Pasted text processed! ${res.question_count} questions extracted.`);
      setPasteText('');
      await fetchDocuments();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error processing text: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Delete this document and all associated extracted questions?')) return;
    try {
      await api.deleteDocument(docId);
      showToast('Document deleted.');
      await fetchDocuments();
      await refreshCourses();
    } catch (err: any) {
      showToast('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Upload Exam Papers & Course Materials
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ExamIQ extracts and structures questions from PDFs, scanned papers, images, or raw text using PyMuPDF and OCR.
        </p>
      </div>

      {/* Tabs: File Upload vs Text Fallback */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File (PDF / Images)</span>
        </button>

        <button
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'paste'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Paste Text Fallback</span>
        </button>
      </div>

      {/* Form Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'upload' ? (
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl cursor-pointer transition ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mb-3">
                  <UploadCloud className="w-8 h-8" />
                </div>

                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to change
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Drag & Drop Question Paper or Syllabus PDF / Image
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PDF, Scanned PDF, JPG, PNG (up to 25 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Document Category
                  </label>
                  <select
                    value={docType}
                    onChange={(e: any) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="question_paper">Question Paper</option>
                    <option value="syllabus">Syllabus Document</option>
                    <option value="course_material">Course Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Exam Year
                  </label>
                  <input
                    type="number"
                    value={examYear}
                    onChange={(e) => setExamYear(parseInt(e.target.value) || 2024)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. 5th Semester"
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="End-Sem">End-Semester</option>
                    <option value="Mid-Sem">Mid-Semester</option>
                    <option value="MST">MST Test</option>
                    <option value="Quiz">Internal Quiz</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedFile || isLoading}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Extracting & Parsing Questions via OCR/PDF Engine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Process & Extract Questions</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Paste Text Fallback Form */
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Document Category
                  </label>
                  <select
                    value={pasteDocType}
                    onChange={(e: any) => setPasteDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="question_paper">Question Paper</option>
                    <option value="syllabus">Syllabus Outline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Document Name / Title
                  </label>
                  <input
                    type="text"
                    value={pasteFilename}
                    onChange={(e) => setPasteFilename(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Exam Year
                  </label>
                  <input
                    type="number"
                    value={pasteYear}
                    onChange={(e) => setPasteYear(parseInt(e.target.value) || 2024)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Paste Exam Questions Text or Syllabus Content *
                </label>
                <textarea
                  required
                  rows={10}
                  placeholder={`Example question paper text:\n\nQ1. Explain the difference between user mode and kernel mode. [5 marks]\nQ2. Calculate the average waiting time for SRTF scheduling with processes P1-P4. [10 marks]\nQ3. State and prove Peterson's solution for the critical section problem. [10 marks]`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!pasteText.trim() || isLoading}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Parsing Text Questions...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Parse Pasted Document</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Informative Guidance Sidebar */}
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Automatic OCR & Parsing Pipeline
          </h3>

          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-3">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <span><strong>PyMuPDF & Tesseract OCR:</strong> Reads text directly from clean PDFs and automatically runs image OCR on scanned exam pages.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <span><strong>Question Boundary Detection:</strong> Automatically identifies question numbers (e.g. Q1, 1(a)), marks [5M, 10M], and question parts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <span><strong>Topic Mapping:</strong> Automatically maps questions to the closest syllabus topic using keyword and TF-IDF semantic matching.</span>
            </li>
          </ul>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Tip:</strong> If your PDF is blurry or password-protected, switch to the <em>"Paste Text Fallback"</em> tab to directly paste questions without OCR errors.
          </div>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
          Uploaded Documents in {activeCourse.code} ({documents.length})
        </h3>

        {documents.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {doc.filename}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="capitalize">{doc.doc_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{doc.exam_year || 'Year unspecified'}</span>
                      <span>•</span>
                      <span>{doc.exam_type || 'Exam'}</span>
                      <span>•</span>
                      <span>{doc.page_count} page(s)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <Badge variant={doc.status === 'completed' ? 'success' : 'warning'}>
                    {doc.question_count} Questions
                  </Badge>

                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                    title="Delete document and questions"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No documents uploaded yet. Upload past question papers or load Demo Mode.
          </div>
        )}
      </div>
    </div>
  );
};
