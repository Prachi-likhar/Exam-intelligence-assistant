import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  HelpCircle,
  BookOpen,
  Flame,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { AnalyticsResponse, StudyPriorityItem, RevisionPlan } from '../types';
import { Badge } from '../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { activeCourse, loadDemoMode } = useCourse();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [priorities, setPriorities] = useState<StudyPriorityItem[]>([]);
  const [plan, setPlan] = useState<RevisionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeCourse) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [aData, pData, planData] = await Promise.all([
          api.getAnalytics(activeCourse.id),
          api.getPriorities(activeCourse.id),
          api.getRevisionPlan(activeCourse.id)
        ]);
        setAnalytics(aData);
        setPriorities(pData);
        setPlan(planData);
      } catch (err) {
        console.error('Error loading dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeCourse]);

  if (!activeCourse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Sparkles className="w-12 h-12 text-indigo-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Subject Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Get started immediately by loading our pre-configured Operating Systems demo dataset or upload your own previous year question papers.
        </p>
        <button
          onClick={loadDemoMode}
          className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition"
        >
          Explore Demo Mode
        </button>
      </div>
    );
  }

  const highPriorityCount = priorities.filter((p) => p.priority_score >= 70).length;
  const topFive = priorities.slice(0, 5);

  const TYPE_COLORS: Record<string, string> = {
    Theory: '#4f46e5',
    Numerical: '#0ea5e9',
    Derivation: '#8b5cf6',
    Programming: '#10b981',
    Diagram: '#f59e0b',
    Other: '#94a3b8',
  };

  const DIFF_COLORS: Record<string, string> = {
    Easy: '#10b981',
    Medium: '#f59e0b',
    Hard: '#ef4444',
  };

  // Prepare topic weightage chart data
  const weightageChartData = (analytics?.topic_frequencies || [])
    .slice(0, 8)
    .map((t) => ({
      name: t.topic_title.length > 18 ? t.topic_title.slice(0, 18) + '...' : t.topic_title,
      fullName: t.topic_title,
      weightage: t.marks_weightage_pct,
      marks: t.total_marks,
      questions: t.matched_questions_count,
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome & Demo Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-950/10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Exam Intelligence Active
            </span>
            {activeCourse.is_demo === 1 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950">
                DEMO SANDBOX
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {activeCourse.code}: {activeCourse.name}
          </h1>
          <p className="text-sm text-indigo-200/90 mt-1 max-w-2xl">
            "Your syllabus. Your strategy. Your success." AI-driven question paper analytics, topic marks weightage, and personalized revision roadmap.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/upload"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs text-indigo-900 bg-white hover:bg-indigo-50 shadow-md transition"
          >
            Upload Papers
          </Link>
          <Link
            to="/priorities"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 transition"
          >
            <span>View Priorities</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Warnings & Data Caveat Alert */}
      {analytics?.warnings && analytics.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <strong className="font-semibold block">Data Quality & Classification Notice:</strong>
            {analytics.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* 6 Key Performance Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Papers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Papers Analyzed</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics?.summary.total_papers ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {analytics?.distinct_years.length || 0} exam sessions
          </span>
        </div>

        {/* Questions Extracted */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Questions Cleaned</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics?.summary.total_questions ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {analytics?.summary.total_known_marks ?? 0} total marks
          </span>
        </div>

        {/* Syllabus Topics */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Syllabus Topics</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics?.summary.total_topics ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across units</span>
        </div>

        {/* High Priority Topics */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">High Priority</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {highPriorityCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Score ≥ 70 / 100</span>
        </div>

        {/* Repeated Questions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Repeated Clones</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics?.summary.repeated_questions_count ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">High recurrence</span>
        </div>

        {/* Revision Plan Hours */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plan Progress</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {plan ? `${plan.completed_hours}/${plan.total_planned_hours}h` : '0/0h'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {plan ? `${plan.coverage_percentage}% covered` : 'Plan not created'}
          </span>
        </div>
      </div>

      {/* Main Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topic-wise Marks Weightage (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Topic Marks Weightage (%)
              </h3>
              <p className="text-xs text-slate-400">
                Proportion of total examination marks attributed to individual syllabus topics
              </p>
            </div>
            <Link
              to="/weightage"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Full Breakdown <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            {weightageChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weightageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                            <strong className="block font-semibold text-indigo-300">{data.fullName}</strong>
                            <p>Marks Weightage: <strong>{data.weightage}%</strong></p>
                            <p>Total Marks: <strong>{data.marks}M</strong></p>
                            <p>Questions: <strong>{data.questions}</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="weightage" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No topic weightage data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Question Type Distribution (1 col Donut) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Question-Type Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Heuristic classification across theory, numerical, proofs & code
            </p>
          </div>

          <div className="h-56 w-full flex-1">
            {analytics?.type_distribution && analytics.type_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.type_distribution}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {analytics.type_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={TYPE_COLORS[entry.type] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      `${value} questions (${props.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No questions classified yet.
              </div>
            )}
          </div>

          {/* Legend Badges */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {(analytics?.type_distribution || []).map((t) => (
              <div key={t.type} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[t.type] || '#6366f1' }}
                ></span>
                <span>{t.type} ({t.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Difficulty & Top Study Priorities Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Difficulty Distribution Chart (1 col) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Estimated Difficulty
            </h3>
            <p className="text-xs text-slate-400">
              Heuristic rating based on analytical depth, marks & steps
            </p>
          </div>

          <div className="h-56 w-full flex-1">
            {analytics?.difficulty_distribution && analytics.difficulty_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.difficulty_distribution}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="difficulty" type="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      `${value} questions (${props.payload.percentage}%)`,
                      'Count',
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {analytics.difficulty_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DIFF_COLORS[entry.difficulty] || '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No difficulty metrics available.
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
            Labeled as estimated difficulty. Students can override ratings in the Question Bank.
          </p>
        </div>

        {/* Top 5 Study Priorities (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                Top 5 Study Priorities
              </h3>
              <p className="text-xs text-slate-400">
                Topics calculated with highest revision urgency and marks yield
              </p>
            </div>
            <Link
              to="/priorities"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              All Topics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topFive.length > 0 ? (
              topFive.map((item) => (
                <div
                  key={item.topic_id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0">
                        #{item.rank}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          {item.topic_title}
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Unit {item.unit_number}: {item.unit_title}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                        {item.priority_score} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                      </div>
                      <Badge
                        variant={item.recommendation_confidence === 'High' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {item.recommendation_confidence} Conf.
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {item.explanation}
                  </p>

                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/50 text-[11px] text-slate-500">
                    <span>Weightage: <strong>{item.marks_weightage_pct}%</strong></span>
                    <span>•</span>
                    <span>Appeared in: <strong>{item.papers_count} papers</strong></span>
                    <span>•</span>
                    <span>Suggested: <strong>{item.suggested_revision_mins} mins</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Upload question papers and syllabus to generate priority rankings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Repeated Questions Highlights & Revision Sneak Peek */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Repeated Question Clones */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                Repeated Question Highlights
              </h3>
              <p className="text-xs text-slate-400">
                Exact or near-duplicate questions detected across multiple exam years
              </p>
            </div>
            <Link
              to="/questions"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View Bank
            </Link>
          </div>

          <div className="space-y-3">
            {analytics?.repeated_questions && analytics.repeated_questions.length > 0 ? (
              analytics.repeated_questions.slice(0, 3).map((cluster) => (
                <div
                  key={cluster.cluster_id}
                  className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="primary" size="sm">
                      {cluster.repetition_type} ({cluster.count}x Sightings)
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 italic">
                    "{cluster.questions[0].text}"
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span>Years asked:</span>
                    {cluster.questions.map((q) => (
                      <span
                        key={q.id}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                      >
                        {q.year || 'Exam'} ({q.marks}M)
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No repeated questions detected yet.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Revision Sessions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" />
                Upcoming Revision Sessions
              </h3>
              <p className="text-xs text-slate-400">
                Day-wise study schedule allocated by priority and available hours
              </p>
            </div>
            <Link
              to="/planner"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open Planner
            </Link>
          </div>

          <div className="space-y-3">
            {plan?.sessions && plan.sessions.length > 0 ? (
              plan.sessions.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {s.date.slice(5)}
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                        {s.topic_title || 'General Review'}
                      </h4>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {s.activity_type.replace('_', ' ')} • {s.duration_mins} mins
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.completed
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {s.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 mb-3">No revision plan generated yet.</p>
                <Link
                  to="/planner"
                  className="inline-block px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  Generate Plan Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
