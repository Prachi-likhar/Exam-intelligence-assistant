import React, { useState, useEffect } from 'react';
import {
  Flame,
  Star,
  Clock,
  HelpCircle,
  Filter,
  Info,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { StudyPriorityItem } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const PrioritiesPage: React.FC = () => {
  const { activeCourse, showToast } = useCourse();
  const [priorities, setPriorities] = useState<StudyPriorityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [diffFilter, setDiffFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');

  // Breakdown Modal
  const [selectedTopic, setSelectedTopic] = useState<StudyPriorityItem | null>(null);

  const fetchPriorities = async () => {
    if (!activeCourse) return;
    try {
      setIsLoading(true);
      const data = await api.getPriorities(activeCourse.id);
      setPriorities(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, [activeCourse]);

  // Extract distinct units
  const distinctUnits = Array.from(new Set(priorities.map((p) => p.unit_number))).sort();

  // Filter items
  const filteredPriorities = priorities.filter((p) => {
    const matchesUnit = unitFilter === 'ALL' || p.unit_number.toString() === unitFilter;
    const matchesDiff = diffFilter === 'ALL' || p.difficulty_estimate === diffFilter;
    const matchesTier =
      tierFilter === 'ALL' ||
      (tierFilter === 'High' && p.priority_score >= 70) ||
      (tierFilter === 'Medium' && p.priority_score >= 45 && p.priority_score < 70) ||
      (tierFilter === 'Low' && p.priority_score < 45);
    return matchesUnit && matchesDiff && matchesTier;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Flame className="w-6 h-6 text-rose-500" />
          Study Priority Rankings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Topics ranked using a transparent 5-factor heuristic scoring algorithm (Frequency 30%, Weightage 30%, Trend 15%, Difficulty 15%, Mastery Weakness 10%).
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Unit Filter */}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Units</option>
            {distinctUnits.map((u) => (
              <option key={u} value={u.toString()}>
                Unit {u}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={diffFilter}
            onChange={(e) => setDiffFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Priority Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <option value="ALL">All Priority Tiers</option>
            <option value="High">High Priority (≥70)</option>
            <option value="Medium">Medium Priority (45-69)</option>
            <option value="Low">Low Priority (&lt;45)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filteredPriorities.length}</strong> of {priorities.length} topics
        </div>
      </div>

      {/* Ranked Priority Cards List */}
      <div className="space-y-4">
        {filteredPriorities.map((item) => {
          const isHighTier = item.priority_score >= 70;
          const isMediumTier = item.priority_score >= 45 && item.priority_score < 70;

          return (
            <div
              key={item.topic_id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all shadow-sm ${
                isHighTier
                  ? 'border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-white via-indigo-50/20 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left Info Column */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex items-center justify-center px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold">
                      RANK #{item.rank}
                    </span>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Unit {item.unit_number}: {item.unit_title}
                    </span>

                    <Badge
                      variant={
                        item.difficulty_estimate === 'Hard'
                          ? 'danger'
                          : item.difficulty_estimate === 'Medium'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {item.difficulty_estimate}
                    </Badge>

                    <Badge
                      variant={
                        item.recommendation_confidence === 'High'
                          ? 'success'
                          : item.recommendation_confidence === 'Medium'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {item.recommendation_confidence} Confidence
                    </Badge>
                  </div>

                  {/* Topic Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.topic_title}
                  </h3>

                  {/* Natural Language Justification */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    {item.explanation}
                  </p>

                  {/* Quick Metrics Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      Weightage: <strong className="text-slate-800 dark:text-slate-200">{item.marks_weightage_pct}% ({item.total_marks}M)</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Sightings: <strong className="text-slate-800 dark:text-slate-200">{item.frequency_count} questions in {item.papers_count} papers</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Trend: <strong className="text-slate-800 dark:text-slate-200">{item.year_trend}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Mastery: <strong className="text-slate-800 dark:text-slate-200">{item.student_mastery}/5</strong>
                    </span>
                  </div>
                </div>

                {/* Right Action & Score Column */}
                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 lg:w-48 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Priority Score
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        {item.priority_score}
                      </span>
                      <span className="text-xs text-slate-400">/ 100</span>
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Suggested Revision
                    </span>
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{item.suggested_revision_mins} mins</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTopic(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Score Breakdown</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPriorities.length === 0 && !isLoading && (
          <div className="text-center py-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No topics match the selected filters.
          </div>
        )}
      </div>

      {/* Component Score Breakdown Modal */}
      {selectedTopic && (
        <Modal
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          title={`Score Breakdown: ${selectedTopic.topic_title}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Total Priority Score
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {selectedTopic.priority_score} / 100
                </div>
              </div>
              <Badge variant="primary" size="md">
                Rank #{selectedTopic.rank}
              </Badge>
            </div>

            {/* 5 Component Progress Bars */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Formula Weights & Normalized Component Scores
              </h4>

              {/* Historical Frequency */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Historical Frequency (Weight: 30%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTopic.component_scores.historical_frequency} / 100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${selectedTopic.component_scores.historical_frequency}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Based on appearance in {selectedTopic.papers_count} papers ({selectedTopic.frequency_count} questions).
                </p>
              </div>

              {/* Marks Weightage */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Marks Weightage (Weight: 30%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTopic.component_scores.marks_weightage} / 100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${selectedTopic.component_scores.marks_weightage}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Accounts for {selectedTopic.marks_weightage_pct}% of total exam marks ({selectedTopic.total_marks}M).
                </p>
              </div>

              {/* Year Trend */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Year-Wise Trend (Weight: 15%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTopic.component_scores.year_trend} / 100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${selectedTopic.component_scores.year_trend}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Trend category: {selectedTopic.year_trend}.
                </p>
              </div>

              {/* Estimated Difficulty */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Estimated Difficulty (Weight: 15%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTopic.component_scores.estimated_difficulty} / 100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${selectedTopic.component_scores.estimated_difficulty}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Categorized as {selectedTopic.difficulty_estimate} based on question complexity and steps.
                </p>
              </div>

              {/* Student Weakness */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Student Weakness / Mastery Gap (Weight: 10%)
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedTopic.component_scores.student_weakness} / 100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${selectedTopic.component_scores.student_weakness}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Self-reported mastery is {selectedTopic.student_mastery}/5 (higher weakness score indicates lower student mastery).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <strong>Recommendation Confidence:</strong> {selectedTopic.recommendation_confidence}. Recommendation confidence evaluates document sample volume and extraction quality independently from the priority score itself.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
