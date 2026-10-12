import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  ArrowUpDown,
  AlertCircle,
  HelpCircle,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { AnalyticsResponse, TopicFrequency } from '../types';
import { Badge } from '../components/common/Badge';

export const WeightagePage: React.FC = () => {
  const { activeCourse } = useCourse();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<keyof TopicFrequency>('marks_weightage_pct');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!activeCourse) return;
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await api.getAnalytics(activeCourse.id);
        setAnalytics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeCourse]);

  const distinctYears = analytics?.distinct_years || [];

  // Sort topics
  const sortedTopics = [...(analytics?.topic_frequencies || [])].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const toggleSort = (field: keyof TopicFrequency) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Prepare trend line chart data for top 4 recurring topics
  const topTrendTopics = (analytics?.topic_frequencies || []).slice(0, 4);
  const trendLineData = distinctYears.map((yr) => {
    const entry: any = { year: yr.toString() };
    topTrendTopics.forEach((t) => {
      entry[t.topic_title] = t.year_marks[yr] || 0;
    });
    return entry;
  });

  const TREND_COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Topic Weightage & Historical Exam Trends
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed marks yield calculations, frequency analytics, and year-by-year syllabus prominence patterns.
        </p>
      </div>

      {/* Insufficient Data Warning Banner if < 2 distinct exam years */}
      {distinctYears.length < 2 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <strong className="font-semibold block">Trend Analysis Limitation:</strong>
            Fewer than two distinct exam years are currently available ({distinctYears.join(', ') || '0'}).
            Historical trajectory lines require at least 2 distinct exam years for confirmed momentum modeling.
          </div>
        </div>
      )}

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Frequency Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
            Top Topics by Marks Weightage (%)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Percentage contribution to overall paper scores
          </p>

          <div className="h-64 w-full">
            {sortedTopics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedTopics.slice(0, 7).map((t) => ({
                    name: t.topic_title.length > 15 ? t.topic_title.slice(0, 15) + '...' : t.topic_title,
                    fullName: t.topic_title,
                    weightage: t.marks_weightage_pct,
                    marks: t.total_marks,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                            <strong className="block text-indigo-300 font-semibold">{data.fullName}</strong>
                            <p>Marks Weightage: <strong>{data.weightage}%</strong></p>
                            <p>Attributed Marks: <strong>{data.marks}M</strong></p>
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
                No topic data available.
              </div>
            )}
          </div>
        </div>

        {/* Year-by-Year Marks Dynamics Line Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
            Year-Wise Topic Marks Trend
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Marks allotted to top topics across past exam sessions
          </p>

          <div className="h-64 w-full">
            {distinctYears.length >= 2 && topTrendTopics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendLineData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis unit="M" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {topTrendTopics.map((t, idx) => (
                    <Line
                      key={t.topic_id}
                      type="monotone"
                      dataKey={t.topic_title}
                      stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 text-center p-4">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span>Upload past papers from at least 2 distinct years to render historical trend trajectories.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Statistical Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Syllabus Topic Frequency & Marks Breakdown Table
            </h3>
            <p className="text-xs text-slate-400">
              Click any column header to sort ascending or descending
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Unit</th>
                <th
                  onClick={() => toggleSort('topic_title')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Topic Title</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('marks_weightage_pct')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Weightage</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('total_marks')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Marks</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('matched_questions_count')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Questions</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('distinct_papers_count')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Papers</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Trend Status</th>
                {distinctYears.map((yr) => (
                  <th key={yr} className="py-3 px-2 text-right">
                    {yr} (M)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedTopics.map((topic) => (
                <tr
                  key={topic.topic_id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="py-3 px-3 font-semibold text-slate-500">
                    U{topic.unit_number}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {topic.topic_title}
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold text-indigo-600 dark:text-indigo-400">
                    {topic.marks_weightage_pct}%
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                    {topic.total_marks}M
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                    {topic.matched_questions_count}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                    {topic.distinct_papers_count}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={
                        topic.trend === 'Consistently Recurring'
                          ? 'success'
                          : topic.trend === 'Gaining Prominence'
                          ? 'primary'
                          : topic.trend === 'Losing Prominence'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {topic.trend}
                    </Badge>
                  </td>
                  {distinctYears.map((yr) => (
                    <td key={yr} className="py-3 px-2 text-right text-slate-600 dark:text-slate-400 font-mono">
                      {topic.year_marks[yr] ? `${topic.year_marks[yr]}M` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
