import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Server,
  Database,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { ScoringWeights } from '../types';

export const SettingsPage: React.FC = () => {
  const { activeCourse, showToast, refreshCourses, loadDemoMode } = useCourse();

  // Scoring Weights State
  const [weights, setWeights] = useState<ScoringWeights>({
    frequency: 30,
    weightage: 30,
    trend: 15,
    difficulty: 15,
    weakness: 10,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [apiHealth, setApiHealth] = useState<'healthy' | 'checking' | 'error'>('checking');

  useEffect(() => {
    // Check API health
    fetch('/api/health')
      .then((res) => (res.ok ? setApiHealth('healthy') : setApiHealth('error')))
      .catch(() => setApiHealth('error'));

    if (activeCourse?.settings_json) {
      try {
        const parsed = JSON.parse(activeCourse.settings_json);
        if (parsed.weights) {
          setWeights({
            frequency: Math.round(parsed.weights.frequency * 100),
            weightage: Math.round(parsed.weights.weightage * 100),
            trend: Math.round(parsed.weights.trend * 100),
            difficulty: Math.round(parsed.weights.difficulty * 100),
            weakness: Math.round(parsed.weights.weakness * 100),
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [activeCourse]);

  const handleWeightChange = (key: keyof ScoringWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetDefaults = () => {
    setWeights({
      frequency: 30,
      weightage: 30,
      trend: 15,
      difficulty: 15,
      weakness: 10,
    });
    showToast('Reset scoring weights to default baseline (30/30/15/15/10).');
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    const total =
      weights.frequency + weights.weightage + weights.trend + weights.difficulty + weights.weakness;
    if (total !== 100) {
      showToast(`Total sum of weights must equal 100% (currently ${total}%).`);
      return;
    }

    try {
      setIsSaving(true);
      await api.updateWeights(activeCourse.id, {
        frequency: weights.frequency / 100,
        weightage: weights.weightage / 100,
        trend: weights.trend / 100,
        difficulty: weights.difficulty / 100,
        weakness: weights.weakness / 100,
      });
      showToast('Scoring weights saved! Priorities recalculated.');
      await refreshCourses();
    } catch (err: any) {
      showToast('Error updating weights: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          Settings & Algorithm Calibration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize ranking formula factor weights, inspect local system storage status, and manage sandbox demo data.
        </p>
      </div>

      {/* Configurable Priority Weights Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Transparent Priority Scoring Weights
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust how much each empirical metric influences the overall 0–100 study priority score.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <form onSubmit={handleSaveWeights} className="space-y-5">
          {/* Historical Frequency Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                1. Historical Frequency (Appearance across papers)
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weights.frequency}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={weights.frequency}
              onChange={(e) => handleWeightChange('frequency', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Marks Weightage Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                2. Marks Weightage (Score proportion in past papers)
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weights.weightage}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={weights.weightage}
              onChange={(e) => handleWeightChange('weightage', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Year Trend Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                3. Year-Wise Recurrence & Momentum Trend
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weights.trend}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={weights.trend}
              onChange={(e) => handleWeightChange('trend', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Estimated Difficulty Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                4. Estimated Analytical Difficulty
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weights.difficulty}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={weights.difficulty}
              onChange={(e) => handleWeightChange('difficulty', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Student Weakness Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 dark:text-slate-300">
                5. Self-Reported Weakness / Mastery Gap
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{weights.weakness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={5}
              value={weights.weakness}
              onChange={(e) => handleWeightChange('weakness', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500">
              Sum of Weights:{' '}
              <strong
                className={
                  weights.frequency +
                    weights.weightage +
                    weights.trend +
                    weights.difficulty +
                    weights.weakness ===
                  100
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }
              >
                {weights.frequency +
                  weights.weightage +
                  weights.trend +
                  weights.difficulty +
                  weights.weakness}
                %
              </strong>
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition"
            >
              Save Custom Weights
            </button>
          </div>
        </form>
      </div>

      {/* System Status & Privacy Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Reliability, Storage & Privacy
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">FastAPI Server</span>
            </div>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {apiHealth.toUpperCase()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">SQLite Storage</span>
            </div>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PERSISTENT LOCAL DB
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Analysis Engine</span>
            </div>
            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> DETERMINISTIC TF-IDF
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Privacy Assurance:</strong> Exam papers and syllabus documents uploaded to ExamIQ are processed locally and securely stored inside your local SQLite database in the application data folder. Documents are never exposed to external cloud endpoints without your explicit approval.
        </p>

        {/* Reload Demo Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Reset Operating Systems Demo Dataset
            </h4>
            <p className="text-[11px] text-slate-400">
              Re-initializes the pre-configured CS302 Operating Systems demo course with 4 papers and 38 questions.
            </p>
          </div>

          <button
            onClick={loadDemoMode}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition"
          >
            Reload Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};
