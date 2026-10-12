import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Sparkles,
  Layers,
  Award,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';

export const ReportsPage: React.FC = () => {
  const { activeCourse } = useCourse();
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeCourse) return;
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const data = await api.getPrintableReport(activeCourse.id);
        setReportData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [activeCourse]);

  if (!activeCourse) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header - Hidden in Print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Reports & Data Export
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Download raw CSV datasets or generate an executive printable academic intelligence summary.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Report PDF</span>
        </button>
      </div>

      {/* CSV Export Cards - Hidden in Print */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Topics CSV */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-2 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 w-fit">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Prioritized Topics (CSV)
            </h3>
            <p className="text-xs text-slate-500">
              Download complete ranking table including priority scores (0-100), marks weightage, frequency, and justification text.
            </p>
          </div>

          <a
            href={api.getTopicsCsvUrl(activeCourse.id)}
            download
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Topics CSV</span>
          </a>
        </div>

        {/* Questions CSV */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-2 mb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 w-fit">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Question Bank Dataset (CSV)
            </h3>
            <p className="text-xs text-slate-500">
              Export all extracted questions with assigned marks, exam year, question type, difficulty, and matched syllabus topic.
            </p>
          </div>

          <a
            href={api.getQuestionsCsvUrl(activeCourse.id)}
            download
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Questions CSV</span>
          </a>
        </div>

        {/* Revision Plan CSV */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-2 mb-4">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Personalized Plan (CSV)
            </h3>
            <p className="text-xs text-slate-500">
              Export day-wise revision sessions, planned activity formats, duration in minutes, and personal notes.
            </p>
          </div>

          <a
            href={api.getPlannerCsvUrl(activeCourse.id)}
            download
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Revision Plan CSV</span>
          </a>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                EXAMIQ INTELLIGENCE REPORT
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeCourse.code}: {activeCourse.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Academic Year {activeCourse.academic_year || '2025-2026'} • {activeCourse.semester || '5th Semester'} • Exam Date: {activeCourse.exam_date || 'TBD'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block">Generated On</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary Stats */}
        {reportData && (
          <div className="grid grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Papers Analyzed</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {reportData.analytics_summary.total_papers}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Questions Extracted</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {reportData.analytics_summary.total_questions}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Known Marks</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {reportData.analytics_summary.total_known_marks}M
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Exam Sessions</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {reportData.analytics_summary.distinct_years.length} Years
              </span>
            </div>
          </div>
        )}

        {/* Ranked Priorities Table */}
        {reportData && (
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              1. Top Study Priority Rankings & Justifications
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 border-b">Rank</th>
                    <th className="py-2.5 px-3 border-b">Topic Title</th>
                    <th className="py-2.5 px-3 border-b">Unit</th>
                    <th className="py-2.5 px-3 border-b text-right">Score</th>
                    <th className="py-2.5 px-3 border-b text-right">Weightage</th>
                    <th className="py-2.5 px-3 border-b">Trend</th>
                    <th className="py-2.5 px-3 border-b">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.priorities.map((item: any) => (
                    <tr key={item.topic_id}>
                      <td className="py-2.5 px-3 font-extrabold text-indigo-600">
                        #{item.rank}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {item.topic_title}
                        <p className="text-[10px] text-slate-400 font-normal italic mt-0.5">
                          {item.explanation}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">Unit {item.unit_number}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {item.priority_score}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                        {item.marks_weightage_pct}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {item.year_trend}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {item.recommendation_confidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Question Type & Difficulty Breakdown */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                2. Question Type Breakdown
              </h4>
              <ul className="text-xs space-y-1.5">
                {reportData.type_distribution.map((t: any) => (
                  <li key={t.type} className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                    <span>{t.type}</span>
                    <strong className="font-semibold">{t.count} questions ({t.percentage}%)</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                3. Estimated Difficulty Profile
              </h4>
              <ul className="text-xs space-y-1.5">
                {reportData.difficulty_distribution.map((d: any) => (
                  <li key={d.difficulty} className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                    <span>{d.difficulty}</span>
                    <strong className="font-semibold">{d.count} questions ({d.percentage}%)</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Data Limitations & Confidence Explanations */}
        {reportData && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              4. Analytical Methodology & Limitations Notice
            </h4>
            <p>
              • Historical weightages are derived from uploaded university examination papers and do not constitute guaranteed exam forecasts.
            </p>
            <p>
              • Recommendation confidence is calculated independently based on sample volume and extraction fidelity.
            </p>
            {reportData.warnings && reportData.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 mt-2">
                {reportData.warnings.map((w: string, idx: number) => (
                  <p key={idx}>⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
