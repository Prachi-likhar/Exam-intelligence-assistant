import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { Question, SyllabusUnit } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const QuestionsPage: React.FC = () => {
  const { activeCourse, showToast, refreshCourses } = useCourse();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDiff, setFilterDiff] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editText, setEditText] = useState('');
  const [editMarks, setEditMarks] = useState<number>(5.0);
  const [editType, setEditType] = useState('Theory');
  const [editDiff, setEditDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [editTopicId, setEditTopicId] = useState<string>('');

  const fetchQuestionsAndSyllabus = async () => {
    if (!activeCourse) return;
    try {
      setIsLoading(true);
      const [qs, syl] = await Promise.all([
        api.getQuestions(activeCourse.id),
        api.getSyllabus(activeCourse.id),
      ]);
      setQuestions(qs);
      setSyllabus(syl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsAndSyllabus();
  }, [activeCourse]);

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditText(q.text);
    setEditMarks(q.marks);
    setEditType(q.question_type);
    setEditDiff(q.difficulty);
    setEditTopicId(q.matched_topic_id || '');
    setIsEditModalOpen(true);
  };

  const handleSaveQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      await api.updateQuestion(editingQuestion.id, {
        text: editText,
        marks: editMarks,
        question_type: editType,
        difficulty: editDiff,
        matched_topic_id: editTopicId || undefined,
        mapping_status: 'reviewed',
      });
      showToast('Question details and topic mapping updated!');
      setIsEditModalOpen(false);
      await fetchQuestionsAndSyllabus();
      await refreshCourses();
    } catch (err: any) {
      showToast('Failed to update question: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Delete this question from question bank?')) return;
    try {
      await api.deleteQuestion(qId);
      showToast('Question deleted.');
      await fetchQuestionsAndSyllabus();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error deleting question: ' + err.message);
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.matched_topic_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || q.question_type === filterType;
    const matchesDiff = filterDiff === 'ALL' || q.difficulty === filterDiff;
    const matchesStatus = filterStatus === 'ALL' || q.mapping_status === filterStatus;
    return matchesSearch && matchesType && matchesDiff && matchesStatus;
  });

  const uncertainCount = questions.filter((q) => q.mapping_status === 'uncertain').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Question Bank & Topic Mapping Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review parsed questions, verify assigned marks, inspect semantic matching confidence, and adjust topic classifications.
          </p>
        </div>

        {uncertainCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{uncertainCount} question(s) flagged for manual review</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions by text or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Question Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="Theory">Theory</option>
            <option value="Numerical">Numerical</option>
            <option value="Derivation">Derivation</option>
            <option value="Programming">Programming</option>
            <option value="Diagram">Diagram</option>
          </select>

          {/* Difficulty Filter */}
          <select
            value={filterDiff}
            onChange={(e) => setFilterDiff(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="auto">Auto-Matched</option>
            <option value="reviewed">Reviewed / Confirmed</option>
            <option value="uncertain">Uncertain Flagged</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const isHighConfidence = q.confidence_score >= 0.65;
          const isMediumConfidence = q.confidence_score >= 0.40 && q.confidence_score < 0.65;
          const isUncertain = q.mapping_status === 'uncertain' || q.confidence_score < 0.40;

          return (
            <div
              key={q.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                isUncertain
                  ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  {/* Top Tags Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Q{q.q_number}{q.sub_q ? `(${q.sub_q})` : ''} • {q.marks} Marks
                    </span>

                    <Badge variant={q.question_type === 'Numerical' ? 'primary' : q.question_type === 'Derivation' ? 'warning' : 'neutral'} size="sm">
                      {q.question_type}
                    </Badge>

                    <Badge
                      variant={q.difficulty === 'Hard' ? 'danger' : q.difficulty === 'Medium' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {q.difficulty}
                    </Badge>

                    {q.exam_year && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {q.exam_year} ({q.exam_type || 'Exam'})
                      </span>
                    )}

                    {q.mapping_status === 'reviewed' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Reviewed
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                    {q.text}
                  </p>

                  {/* Matched Topic Information */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 text-[11px] block sm:inline mr-2 font-medium">Mapped Topic:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                        {q.matched_topic_title ? (
                          <>
                            {q.matched_topic_title}{' '}
                            <span className="text-slate-400 font-normal">
                              (Unit {q.matched_unit_number || '?'})
                            </span>
                          </>
                        ) : (
                          <span className="text-rose-500 font-medium">Unmapped — Assign Topic</span>
                        )}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-400">Confidence:</span>
                      <Badge
                        variant={isHighConfidence ? 'success' : isMediumConfidence ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {isHighConfidence ? 'High' : isMediumConfidence ? 'Medium' : 'Uncertain'}{' '}
                        ({(q.confidence_score * 100).toFixed(0)}%)
                      </Badge>
                    </div>
                  </div>

                  {/* Mapping Explanation */}
                  {q.mapping_explanation && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      💡 {q.mapping_explanation}
                    </p>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
                    title="Correct marks, question type, or topic assignment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border border-slate-200 dark:border-slate-700 transition"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredQuestions.length === 0 && !isLoading && (
          <div className="text-center py-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No questions match your selected search or filters.
          </div>
        )}
      </div>

      {/* Edit Question Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Review & Correct Question"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveQuestionSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Question Text *
            </label>
            <textarea
              required
              rows={4}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Marks Allocation *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                required
                value={editMarks}
                onChange={(e) => setEditMarks(parseFloat(e.target.value) || 5.0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Question Type
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Theory">Theory / Conceptual</option>
                <option value="Numerical">Numerical / Calculation</option>
                <option value="Derivation">Derivation / Proof</option>
                <option value="Programming">Programming / Algorithm</option>
                <option value="Diagram">Diagram / Design</option>
                <option value="Other">Other / Unclassified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Estimated Difficulty
              </label>
              <select
                value={editDiff}
                onChange={(e: any) => setEditDiff(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Mapped Syllabus Topic
            </label>
            <select
              value={editTopicId}
              onChange={(e) => setEditTopicId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Syllabus Topic --</option>
              {syllabus.map((u) => (
                <optgroup key={u.id} label={`Unit ${u.unit_number}: ${u.title}`}>
                  {u.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
            >
              Confirm & Save Correction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
