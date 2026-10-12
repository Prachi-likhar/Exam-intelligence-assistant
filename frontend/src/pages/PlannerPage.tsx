import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Edit2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { RevisionPlan, RevisionSession } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const PlannerPage: React.FC = () => {
  const { activeCourse, showToast } = useCourse();
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Configuration Form State
  const [examDate, setExamDate] = useState<string>(
    activeCourse?.exam_date ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dailyHours, setDailyHours] = useState<number>(3.0);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [availableDays, setAvailableDays] = useState<string[]>([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ]);

  // Session Edit State
  const [editingSession, setEditingSession] = useState<RevisionSession | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState(60);
  const [editDate, setEditDate] = useState('');

  const fetchPlan = async () => {
    if (!activeCourse) return;
    try {
      setIsLoading(true);
      const data = await api.getRevisionPlan(activeCourse.id);
      setPlan(data);
      if (data) {
        setExamDate(data.exam_date);
        setDailyHours(data.daily_hours);
        setSessionDuration(data.session_duration_mins);
        setAvailableDays(data.available_days);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [activeCourse]);

  const handleDayToggle = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    try {
      setIsGenerating(true);
      const generated = await api.generateRevisionPlan(activeCourse.id, {
        exam_date: examDate,
        daily_hours: dailyHours,
        available_days: availableDays,
        session_duration_mins: sessionDuration,
      });
      setPlan(generated);
      showToast('New personalized revision plan generated!');
    } catch (err: any) {
      showToast('Error generating plan: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleComplete = async (session: RevisionSession) => {
    const nextState = session.completed === 0;
    try {
      await api.updateSession(session.id, { completed: nextState });
      // Optimistic update
      setPlan((prev) => {
        if (!prev) return null;
        const updatedSessions = prev.sessions.map((s) =>
          s.id === session.id ? { ...s, completed: nextState ? 1 : 0 } : s
        );
        const completedSessionsCount = updatedSessions.filter((s) => s.completed === 1).length;
        const completedMinutes = updatedSessions
          .filter((s) => s.completed === 1)
          .reduce((sum, s) => sum + s.duration_mins, 0);

        return {
          ...prev,
          sessions: updatedSessions,
          completed_sessions: completedSessionsCount,
          completed_hours: Math.round((completedMinutes / 60) * 10) / 10,
        };
      });
    } catch (err: any) {
      showToast('Failed to update session: ' + err.message);
    }
  };

  const openEditSessionModal = (s: RevisionSession) => {
    setEditingSession(s);
    setEditNotes(s.notes || '');
    setEditDuration(s.duration_mins);
    setEditDate(s.date);
  };

  const handleSaveSessionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    try {
      await api.updateSession(editingSession.id, {
        notes: editNotes,
        duration_mins: editDuration,
        date: editDate,
      });
      showToast('Session updated!');
      setEditingSession(null);
      await fetchPlan();
    } catch (err: any) {
      showToast('Failed to save session: ' + err.message);
    }
  };

  // Group sessions by date
  const sessionsByDate: Record<string, RevisionSession[]> = {};
  if (plan?.sessions) {
    plan.sessions.forEach((s) => {
      if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
      sessionsByDate[s.date].push(s);
    });
  }

  const sortedDates = Object.keys(sessionsByDate).sort();

  const ACTIVITY_LABELS: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
    revising_concepts: { label: 'Revise Concepts', color: 'primary' },
    solving_numericals: { label: 'Solve Numericals', color: 'warning' },
    practicing_derivations: { label: 'Practice Derivations', color: 'primary' },
    timed_practice: { label: 'Timed Exam Practice', color: 'danger' },
    reviewing_mistakes: { label: 'Review Mistakes', color: 'success' },
  };

  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CalendarCheck2 className="w-6 h-6 text-indigo-600" />
          Personalized Revision Planner
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Constraint-based day-wise revision schedule generated from your exam date, daily available study hours, and topic priority ranks.
        </p>
      </div>

      {/* Plan Progress KPI Summary */}
      {plan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Total Planned Study</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {plan.total_planned_hours} Hours
            </div>
            <span className="text-[11px] text-slate-500">{plan.total_sessions} revision sessions</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Completed Study</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {plan.completed_hours} Hours
            </div>
            <span className="text-[11px] text-slate-500">{plan.completed_sessions} completed</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Syllabus Coverage</span>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {plan.coverage_percentage}%
            </div>
            <span className="text-[11px] text-slate-500">Of high-priority topics</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Exam Target Date</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {plan.exam_date}
            </div>
            <span className="text-[11px] text-slate-500">Day-wise countdown</span>
          </div>
        </div>
      )}

      {/* Uncovered Topics Alert if time capacity ran out */}
      {plan?.uncovered_topics && plan.uncovered_topics.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <strong className="font-semibold block">Time Capacity Notice:</strong>
            Based on {plan.daily_hours}h/day, there is insufficient time before {plan.exam_date} to cover all topics.
            The following lower-priority topics remain unscheduled:
            <ul className="list-disc list-inside mt-1">
              {plan.uncovered_topics.map((ut) => (
                <li key={ut.topic_id}>
                  <strong>{ut.topic_title}</strong> (Score {ut.priority_score})
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[11px]">
              Increase daily hours or add weekend study days below to cover remaining topics.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Form Accordion / Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Revision Constraints & Preferences
        </h3>

        <form onSubmit={handleGeneratePlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Exam Date *
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Daily Study Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                required
                value={dailyHours}
                onChange={(e) => setDailyHours(parseFloat(e.target.value) || 3.0)}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Session Duration
              </label>
              <select
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value) || 60)}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={45}>45 Minutes (Pomodoro)</option>
                <option value={60}>60 Minutes (Standard)</option>
                <option value={90}>90 Minutes (Deep Work)</option>
                <option value={120}>120 Minutes (Long Block)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{plan ? 'Regenerate Plan' : 'Generate Revision Plan'}</span>
              </button>
            </div>
          </div>

          {/* Available Study Days Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Available Study Days:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {WEEKDAYS.map((d) => {
                const isSelected = availableDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDayToggle(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                        : 'bg-slate-100 text-slate-400 border-transparent dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Day-Wise Revision Timeline */}
      <div className="space-y-6">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Day-Wise Study Timeline ({sortedDates.length} days)
        </h3>

        {sortedDates.map((dateStr) => {
          const daySessions = sessionsByDate[dateStr] || [];
          const allCompleted = daySessions.every((s) => s.completed === 1);
          const dateObj = new Date(dateStr);
          const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={dateStr}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition shadow-sm ${
                allCompleted
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold">
                    {formattedDate}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {daySessions.reduce((acc, s) => acc + s.duration_mins, 0)} mins total • {daySessions.length} session(s)
                  </span>
                </div>

                {allCompleted && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Day Completed!
                  </span>
                )}
              </div>

              {/* Sessions in this day */}
              <div className="space-y-3">
                {daySessions.map((session) => {
                  const actInfo = ACTIVITY_LABELS[session.activity_type] || {
                    label: session.activity_type,
                    color: 'neutral',
                  };

                  return (
                    <div
                      key={session.id}
                      className={`p-4 rounded-2xl border transition ${
                        session.completed
                          ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Checkbox & Topic Info */}
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(session)}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition shrink-0"
                            title={session.completed ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {session.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-indigo-500" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`text-sm font-bold ${
                                  session.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {session.topic_title || 'Formula & Mock Review'}
                              </h4>

                              {session.unit_number !== undefined && session.unit_number > 0 && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Unit {session.unit_number}
                                </span>
                              )}

                              <Badge variant={actInfo.color} size="sm">
                                {actInfo.label}
                              </Badge>

                              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {session.duration_mins}m
                              </span>
                            </div>

                            {session.notes && (
                              <p className="text-xs text-slate-500 italic">
                                {session.notes}
                              </p>
                            )}

                            {/* Attached Past Questions for Practice */}
                            {session.relevant_questions && session.relevant_questions.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Relevant Past Exam Questions to Solve:
                                </span>
                                <div className="space-y-1">
                                  {session.relevant_questions.map((rq) => (
                                    <div
                                      key={rq.id}
                                      className="text-xs p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2"
                                    >
                                      <span className="truncate">"{rq.text}"</span>
                                      <span className="font-bold shrink-0 text-indigo-600 dark:text-indigo-400">
                                        {rq.marks}M
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditSessionModal(session)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition shrink-0"
                          title="Edit session duration or reschedule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {sortedDates.length === 0 && !isLoading && (
          <div className="text-center py-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CalendarCheck2 className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">
              No Plan Generated
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Set your target exam date and daily study hours above to calculate an optimized revision timetable.
            </p>
          </div>
        )}
      </div>

      {/* Edit Session Modal */}
      {editingSession && (
        <Modal
          isOpen={!!editingSession}
          onClose={() => setEditingSession(null)}
          title="Edit Revision Session"
        >
          <form onSubmit={handleSaveSessionEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Duration (Minutes) *
              </label>
              <input
                type="number"
                min={15}
                max={300}
                step={15}
                required
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 60)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Personal Session Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Solve 2023 numerical question; check formula page 44"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
