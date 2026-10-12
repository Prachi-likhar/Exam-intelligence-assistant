import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Star,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Hash,
  Tag
} from 'lucide-react';
import { useCourse } from '../context/CourseContext';
import { api } from '../services/api';
import { SyllabusUnit, SyllabusTopic } from '../types';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const SyllabusPage: React.FC = () => {
  const { activeCourse, showToast, refreshCourses } = useCourse();
  const [syllabus, setSyllabus] = useState<SyllabusUnit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemapping, setIsRemapping] = useState(false);

  // Unit Modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitNum, setNewUnitNum] = useState<number>(1);
  const [newUnitTitle, setNewUnitTitle] = useState('');

  // Topic Modal
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<SyllabusTopic | null>(null);
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [topicTitle, setTopicTitle] = useState('');
  const [subtopicsStr, setSubtopicsStr] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [mastery, setMastery] = useState<number>(3);

  const fetchSyllabus = async () => {
    if (!activeCourse) return;
    try {
      setIsLoading(true);
      const units = await api.getSyllabus(activeCourse.id);
      setSyllabus(units);
      if (units.length > 0 && !targetUnitId) {
        setTargetUnitId(units[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabus();
  }, [activeCourse]);

  const handleAddUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !newUnitTitle.trim()) return;
    try {
      await api.addUnit(activeCourse.id, {
        unit_number: newUnitNum,
        title: newUnitTitle.trim(),
      });
      showToast(`Unit ${newUnitNum}: "${newUnitTitle}" added!`);
      setNewUnitTitle('');
      setIsUnitModalOpen(false);
      await fetchSyllabus();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error adding unit: ' + err.message);
    }
  };

  const handleSaveTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !topicTitle.trim()) return;

    const subtopics = subtopicsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const keywords = keywordsStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (editingTopic) {
        // Update existing
        await api.updateTopic(editingTopic.id, {
          title: topicTitle.trim(),
          subtopics,
          keywords,
          student_mastery: mastery,
        });
        showToast(`Topic "${topicTitle}" updated!`);
      } else {
        // Add new
        await api.addTopic(activeCourse.id, {
          unit_id: targetUnitId || syllabus[0]?.id,
          title: topicTitle.trim(),
          subtopics,
          keywords,
          student_mastery: mastery,
        });
        showToast(`Topic "${topicTitle}" created!`);
      }

      setIsTopicModalOpen(false);
      setEditingTopic(null);
      setTopicTitle('');
      setSubtopicsStr('');
      setKeywordsStr('');
      setMastery(3);
      await fetchSyllabus();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error saving topic: ' + err.message);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!window.confirm('Delete this topic from syllabus?')) return;
    try {
      await api.deleteTopic(topicId);
      showToast('Topic deleted.');
      await fetchSyllabus();
      await refreshCourses();
    } catch (err: any) {
      showToast('Error deleting topic: ' + err.message);
    }
  };

  const handleRemapAll = async () => {
    if (!activeCourse) return;
    try {
      setIsRemapping(true);
      const res = await api.remapQuestions(activeCourse.id);
      showToast(res.message);
      await fetchSyllabus();
    } catch (err: any) {
      showToast('Remap failed: ' + err.message);
    } finally {
      setIsRemapping(false);
    }
  };

  const openAddTopicModal = (unitId: string) => {
    setEditingTopic(null);
    setTargetUnitId(unitId);
    setTopicTitle('');
    setSubtopicsStr('');
    setKeywordsStr('');
    setMastery(3);
    setIsTopicModalOpen(true);
  };

  const openEditTopicModal = (topic: SyllabusTopic) => {
    setEditingTopic(topic);
    setTargetUnitId(topic.unit_id);
    setTopicTitle(topic.title);
    setSubtopicsStr(topic.subtopics.join(', '));
    setKeywordsStr(topic.keywords.join(', '));
    setMastery(topic.student_mastery || 3);
    setIsTopicModalOpen(true);
  };

  const handleQuickMasteryChange = async (topic: SyllabusTopic, newRating: number) => {
    try {
      await api.updateTopic(topic.id, { student_mastery: newRating });
      // Optimistic update
      setSyllabus((prev) =>
        prev.map((u) => ({
          ...u,
          topics: u.topics.map((t) => (t.id === topic.id ? { ...t, student_mastery: newRating } : t)),
        }))
      );
      showToast(`Mastery for "${topic.title}" set to ${newRating}/5.`);
    } catch (err: any) {
      showToast('Failed to update mastery: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Syllabus Hierarchy & Topic Mapping
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize course units, define topic keywords, rate your personal mastery, and match past exam questions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRemapAll}
            disabled={isRemapping}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition"
            title="Re-run semantic matcher on all questions with updated keywords"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRemapping ? 'animate-spin' : ''}`} />
            <span>Remap Questions</span>
          </button>

          <button
            onClick={() => {
              setNewUnitNum(syllabus.length + 1);
              setIsUnitModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Unit</span>
          </button>
        </div>
      </div>

      {/* Syllabus Tree by Units */}
      <div className="space-y-6">
        {syllabus.map((unit) => (
          <div
            key={unit.id}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
          >
            {/* Unit Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                  {unit.unit_number}
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Unit {unit.unit_number}: {unit.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {unit.topics.length} topics • {unit.topics.reduce((acc, t) => acc + (t.question_count || 0), 0)} questions mapped
                  </span>
                </div>
              </div>

              <button
                onClick={() => openAddTopicModal(unit.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </div>

            {/* Topics List */}
            <div className="space-y-3">
              {unit.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                          {topic.title}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {topic.question_count || 0} Questions ({topic.total_marks || 0}M)
                        </Badge>
                      </div>

                      {/* Subtopics */}
                      {topic.subtopics && topic.subtopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {topic.subtopics.map((sub, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Keywords */}
                      {topic.keywords && topic.keywords.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 text-[10px] text-slate-400">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>Keywords: {topic.keywords.slice(0, 5).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Mastery Rating & Action Buttons */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Mastery Stars (1-5) */}
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          My Mastery
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleQuickMasteryChange(topic, star)}
                              className={`p-0.5 rounded transition ${
                                star <= topic.student_mastery
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                              title={`Rate mastery: ${star}/5`}
                            >
                              <Star className={`w-4 h-4 ${star <= topic.student_mastery ? 'fill-amber-400 text-amber-500' : ''}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                        <button
                          onClick={() => openEditTopicModal(topic)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="Edit topic & keywords"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Delete topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {unit.topics.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No topics in this unit yet. Click "Add Topic" above to create one.
                </div>
              )}
            </div>
          </div>
        ))}

        {syllabus.length === 0 && !isLoading && (
          <div className="text-center py-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <BookOpen className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">
              No Syllabus Defined Yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Add your syllabus units and topics or upload a syllabus document in the "Upload Papers" tab to automatically extract them.
            </p>
            <button
              onClick={() => setIsUnitModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
            >
              Add First Unit
            </button>
          </div>
        )}
      </div>

      {/* Add Unit Modal */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title="Add Syllabus Unit"
      >
        <form onSubmit={handleAddUnitSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Unit Number *
            </label>
            <input
              type="number"
              required
              min={1}
              value={newUnitNum}
              onChange={(e) => setNewUnitNum(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Unit Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Memory Management & Virtual Memory"
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsUnitModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
            >
              Add Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Topic Modal */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={editingTopic ? 'Edit Syllabus Topic' : 'Add New Topic'}
      >
        <form onSubmit={handleSaveTopicSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Topic Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Page Replacement Algorithms"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Subtopics (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. FIFO, LRU, Optimal, Belady's Anomaly"
              value={subtopicsStr}
              onChange={(e) => setSubtopicsStr(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Keywords & Synonyms for Question Matching (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. page faults, reference string, hit ratio"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Self-Reported Mastery (1 = Weak, 5 = Mastered)
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setMastery(val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    mastery === val
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {val} {val === 1 ? '⚠️' : val === 5 ? '🏆' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
            >
              Save Topic
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
