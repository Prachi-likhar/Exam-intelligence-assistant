import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Plus,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useCourse } from '../../context/CourseContext';
import { Modal } from '../common/Modal';

export const Navbar: React.FC = () => {
  const {
    courses,
    activeCourse,
    setActiveCourse,
    loadDemoMode,
    createCourse,
    darkMode,
    toggleDarkMode,
    toastMessage,
    refreshCourses,
    isLoading
  } = useCourse();

  const [isNewSubjectModalOpen, setIsNewSubjectModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');

  // Calculate exam countdown days
  const getExamCountdown = () => {
    if (!activeCourse?.exam_date) return null;
    try {
      const exam = new Date(activeCourse.exam_date);
      const today = new Date();
      const diffTime = exam.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const countdownDays = getExamCountdown();

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    await createCourse({
      code: newCode.trim(),
      name: newName.trim(),
      exam_date: newExamDate || undefined,
    });
    setNewCode('');
    setNewName('');
    setNewExamDate('');
    setIsNewSubjectModalOpen(false);
  };

  return (
    <>
      <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        {/* Subject Selector & New Subject */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={activeCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) setActiveCourse(found);
              }}
              className="appearance-none pl-3.5 pr-8 py-1.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} {c.is_demo === 1 ? '(Demo)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsNewSubjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
        </div>

        {/* Right Section: Exam Countdown, Demo Mode, Theme & Refresh */}
        <div className="flex items-center gap-3">
          {/* Exam Countdown Pill */}
          {countdownDays !== null && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {countdownDays > 0 ? (
                  <>
                    <strong className="font-bold">{countdownDays}</strong> days until exam
                  </>
                ) : countdownDays === 0 ? (
                  'Exam is today!'
                ) : (
                  'Exam concluded'
                )}
              </span>
            </div>
          )}

          {/* Demo Mode Button */}
          <button
            onClick={loadDemoMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeCourse?.is_demo === 1
                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
            title="Load ready-made demo with 4 exam papers & 38 questions"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Demo Mode</span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            onClick={() => refreshCourses()}
            disabled={isLoading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh active course data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xl border border-slate-700/50 dark:border-slate-300/50 animate-in slide-in-from-bottom-5 duration-200">
          <Sparkles className="w-4 h-4 text-indigo-400 dark:text-indigo-600 shrink-0" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* New Subject Modal */}
      <Modal
        isOpen={isNewSubjectModalOpen}
        onClose={() => setIsNewSubjectModalOpen(false)}
        title="Create New Subject"
      >
        <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Course / Subject Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CS401 or MATH202"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Course Full Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Database Management Systems"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Upcoming Exam Date (Optional)
            </label>
            <input
              type="date"
              value={newExamDate}
              onChange={(e) => setNewExamDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewSubjectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition"
            >
              Create Subject
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
