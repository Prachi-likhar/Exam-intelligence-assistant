import {
  Course,
  DocumentItem,
  SyllabusUnit,
  Question,
  AnalyticsResponse,
  StudyPriorityItem,
  RevisionPlan,
  ScoringWeights
} from '../types';
import {
  DEMO_COURSE,
  DEMO_DOCUMENTS,
  DEMO_SYLLABUS,
  DEMO_QUESTIONS,
  DEMO_ANALYTICS,
  DEMO_PRIORITIES,
  DEMO_REVISION_PLAN
} from './demoDataset';

export const LIVE_RENDER_API = 'https://exam-intelligence-assistant-2.onrender.com/api';

const getInitialApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== '/api') {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  // Default to live cloud backend to ensure standalone frontend deployments work out-of-the-box
  return LIVE_RENDER_API;
};

let activeApiBase = getInitialApiBase();

export const getApiBase = () => activeApiBase;
export const API_BASE = activeApiBase;

/**
 * Robust fetch wrapper that gracefully handles endpoint fallback
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Primary attempt with activeApiBase
  try {
    const res = await fetch(`${activeApiBase}${cleanEndpoint}`, options);
    // If primary returned 404/502/504 and activeApiBase is not live Render, try live Render
    if (!res.ok && (res.status === 404 || res.status === 502 || res.status === 504) && activeApiBase !== LIVE_RENDER_API) {
      console.warn(`Primary ${activeApiBase} returned HTTP ${res.status}. Trying live Render API.`);
      const fallbackRes = await fetch(`${LIVE_RENDER_API}${cleanEndpoint}`, options);
      if (fallbackRes.ok) {
        activeApiBase = LIVE_RENDER_API;
        return fallbackRes;
      }
    }
    return res;
  } catch (err: any) {
    // If primary failed with network error, try live Render
    if (activeApiBase !== LIVE_RENDER_API) {
      console.warn(`Primary connection to ${activeApiBase} failed (${err.message}). Trying live Render API.`);
      try {
        const fallbackRes = await fetch(`${LIVE_RENDER_API}${cleanEndpoint}`, options);
        if (fallbackRes.ok) {
          activeApiBase = LIVE_RENDER_API;
        }
        return fallbackRes;
      } catch (fallbackErr) {
        throw err;
      }
    }
    throw err;
  }
}

export const api = {
  // Courses
  async getCourses(): Promise<Course[]> {
    try {
      const res = await apiFetch('/courses');
      if (res.ok) {
        const list: Course[] = await res.json();
        // Ensure demo course is present in list if server returned empty
        if (list.length === 0) {
          return [DEMO_COURSE];
        }
        return list;
      }
    } catch (err) {
      console.warn('api.getCourses failed, using fallback demo course:', err);
    }
    // Zero-failure fallback
    return [DEMO_COURSE];
  },

  async createCourse(data: { code: string; name: string; exam_date?: string; semester?: string; academic_year?: string }): Promise<Course> {
    const res = await apiFetch('/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create course');
    return res.json();
  },

  async getCourse(id: string): Promise<Course> {
    if (id === 'demo-cs302-os') {
      try {
        const res = await apiFetch(`/courses/${id}`);
        if (res.ok) return await res.json();
      } catch {}
      return DEMO_COURSE;
    }
    const res = await apiFetch(`/courses/${id}`);
    if (!res.ok) throw new Error('Failed to get course');
    return res.json();
  },

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    const res = await apiFetch(`/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update course');
    return res.json();
  },

  async deleteCourse(id: string): Promise<void> {
    const res = await apiFetch(`/courses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete course');
  },

  async loadDemoCourse(): Promise<Course> {
    // 1. Try server endpoint
    try {
      const res = await apiFetch('/courses/demo/load', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
      const getRes = await apiFetch('/courses/demo/load');
      if (getRes.ok) {
        return await getRes.json();
      }
    } catch (err) {
      console.warn('Network call to /courses/demo/load failed:', err);
    }

    // 2. Try fetching /courses/demo-cs302-os directly from server
    try {
      const res = await apiFetch('/courses/demo-cs302-os');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 3. Guaranteed instant client-side fallback
    console.info('Activating instant built-in Operating Systems demo dataset');
    return DEMO_COURSE;
  },

  // Documents
  async getDocuments(courseId: string): Promise<DocumentItem[]> {
    try {
      const res = await apiFetch(`/documents/course/${courseId}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') return DEMO_DOCUMENTS;
    throw new Error('Failed to load documents');
  },

  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    const res = await apiFetch('/documents/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async pasteText(data: {
    course_id: string;
    filename: string;
    doc_type: string;
    raw_text: string;
    exam_year?: number;
    semester?: string;
    exam_type?: string;
  }): Promise<DocumentItem> {
    const res = await apiFetch('/documents/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to process pasted text');
    return res.json();
  },

  async deleteDocument(docId: string): Promise<void> {
    const res = await apiFetch(`/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  // Syllabus
  async getSyllabus(courseId: string): Promise<SyllabusUnit[]> {
    try {
      const res = await apiFetch(`/syllabus/course/${courseId}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') return DEMO_SYLLABUS;
    throw new Error('Failed to load syllabus');
  },

  async addUnit(courseId: string, data: { unit_number: number; title: string }): Promise<void> {
    const res = await apiFetch(`/syllabus/course/${courseId}/unit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add unit');
  },

  async addTopic(courseId: string, data: {
    unit_id: string;
    title: string;
    subtopics: string[];
    keywords: string[];
    student_mastery: number;
  }): Promise<void> {
    const res = await apiFetch(`/syllabus/course/${courseId}/topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add topic');
  },

  async updateTopic(topicId: string, data: {
    title?: string;
    subtopics?: string[];
    keywords?: string[];
    student_mastery?: number;
  }): Promise<void> {
    const res = await apiFetch(`/syllabus/topic/${topicId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update topic');
  },

  async deleteTopic(topicId: string): Promise<void> {
    const res = await apiFetch(`/syllabus/topic/${topicId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete topic');
  },

  async remapQuestions(courseId: string): Promise<{ message: string; remapped_count: number }> {
    const res = await apiFetch(`/syllabus/course/${courseId}/remap`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to remap questions');
    return res.json();
  },

  // Questions
  async getQuestions(courseId: string, params?: {
    document_id?: string;
    topic_id?: string;
    question_type?: string;
    difficulty?: string;
    mapping_status?: string;
  }): Promise<Question[]> {
    try {
      const query = new URLSearchParams();
      if (params?.document_id) query.append('document_id', params.document_id);
      if (params?.topic_id) query.append('topic_id', params.topic_id);
      if (params?.question_type) query.append('question_type', params.question_type);
      if (params?.difficulty) query.append('difficulty', params.difficulty);
      if (params?.mapping_status) query.append('mapping_status', params.mapping_status);

      const res = await apiFetch(`/questions/course/${courseId}?${query.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') {
      let filtered = [...DEMO_QUESTIONS];
      if (params?.document_id) filtered = filtered.filter(q => q.document_id === params.document_id);
      if (params?.topic_id) filtered = filtered.filter(q => q.matched_topic_id === params.topic_id);
      if (params?.question_type) filtered = filtered.filter(q => q.question_type === params.question_type);
      if (params?.difficulty) filtered = filtered.filter(q => q.difficulty === params.difficulty);
      if (params?.mapping_status) filtered = filtered.filter(q => q.mapping_status === params.mapping_status);
      return filtered;
    }
    throw new Error('Failed to load questions');
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<Question> {
    const res = await apiFetch(`/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update question');
    return res.json();
  },

  async deleteQuestion(id: string): Promise<void> {
    const res = await apiFetch(`/questions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete question');
  },

  // Analytics & Priorities
  async getAnalytics(courseId: string): Promise<AnalyticsResponse> {
    try {
      const res = await apiFetch(`/analytics/course/${courseId}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') return DEMO_ANALYTICS;
    throw new Error('Failed to load analytics');
  },

  async getPriorities(courseId: string): Promise<StudyPriorityItem[]> {
    try {
      const res = await apiFetch(`/priorities/course/${courseId}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') return DEMO_PRIORITIES;
    throw new Error('Failed to load study priorities');
  },

  async updateWeights(courseId: string, weights: ScoringWeights): Promise<void> {
    const res = await apiFetch(`/priorities/course/${courseId}/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
    if (!res.ok) throw new Error('Failed to update scoring weights');
  },

  // Revision Planner
  async getRevisionPlan(courseId: string): Promise<RevisionPlan | null> {
    try {
      const res = await apiFetch(`/planner/course/${courseId}`);
      if (res.ok) return await res.json();
    } catch {}
    if (courseId === 'demo-cs302-os') return DEMO_REVISION_PLAN;
    return null;
  },

  async generateRevisionPlan(courseId: string, data: {
    exam_date: string;
    daily_hours: number;
    available_days: string[];
    session_duration_mins: number;
  }): Promise<RevisionPlan> {
    const res = await apiFetch(`/planner/course/${courseId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Plan generation failed' }));
      throw new Error(err.detail || 'Plan generation failed');
    }
    return res.json();
  },

  async updateSession(sessionId: string, data: {
    completed?: boolean;
    duration_mins?: number;
    notes?: string;
    date?: string;
  }): Promise<void> {
    const res = await apiFetch(`/planner/session/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update session');
  },

  // Export
  getTopicsCsvUrl(courseId: string): string {
    return `${activeApiBase}/export/course/${courseId}/topics-csv`;
  },

  getQuestionsCsvUrl(courseId: string): string {
    return `${activeApiBase}/export/course/${courseId}/questions-csv`;
  },

  getPlannerCsvUrl(courseId: string): string {
    return `${activeApiBase}/export/course/${courseId}/planner-csv`;
  },

  async getPrintableReport(courseId: string): Promise<any> {
    const res = await apiFetch(`/export/course/${courseId}/report`);
    if (!res.ok) throw new Error('Failed to get printable report');
    return res.json();
  },

  async checkHealth(): Promise<boolean> {
    try {
      const res = await apiFetch('/health');
      return res.ok;
    } catch {
      return false;
    }
  },
};
