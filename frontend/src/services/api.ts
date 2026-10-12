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

export const LIVE_RENDER_API = 'https://exam-intelligence-assistant-2.onrender.com/api';

const getInitialApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return import.meta.env.PROD ? LIVE_RENDER_API : '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

let activeApiBase = getInitialApiBase();

export const getApiBase = () => activeApiBase;
export const API_BASE = activeApiBase;

/**
 * Robust fetch wrapper that gracefully falls back between local backend
 * and live Render cloud backend if one is unavailable or waking up.
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Primary attempt
  try {
    const res = await fetch(`${activeApiBase}${cleanEndpoint}`, options);
    // If local proxy returned 502/504 Bad Gateway, attempt live Render
    if (!res.ok && (res.status === 502 || res.status === 504) && activeApiBase !== LIVE_RENDER_API) {
      console.warn(`Primary ${activeApiBase} returned ${res.status}. Falling back to live Render backend.`);
      const fallbackRes = await fetch(`${LIVE_RENDER_API}${cleanEndpoint}`, options);
      if (fallbackRes.ok) {
        activeApiBase = LIVE_RENDER_API;
      }
      return fallbackRes;
    }
    return res;
  } catch (err: any) {
    // If local backend is down (connection refused / timeout)
    if (activeApiBase !== LIVE_RENDER_API) {
      console.warn(`Primary connection to ${activeApiBase} failed (${err.message}). Retrying with live Render backend.`);
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
    const res = await apiFetch('/courses');
    if (!res.ok) throw new Error(`Failed to load courses (HTTP ${res.status})`);
    return res.json();
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
    let lastError: any = null;

    // 1. Try POST to /courses/demo/load
    try {
      const res = await apiFetch('/courses/demo/load', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        return await res.json();
      }
      // If POST wasn't ok, try GET
      const getRes = await apiFetch('/courses/demo/load');
      if (getRes.ok) {
        return await getRes.json();
      }
      const errJson = await res.json().catch(() => null);
      if (errJson?.detail) lastError = new Error(errJson.detail);
    } catch (err) {
      lastError = err;
    }

    // 2. Fallback: check if demo course already exists in GET /courses
    try {
      const list = await api.getCourses();
      const demo = list.find((c) => c.is_demo === 1 || c.id === 'demo-cs302-os');
      if (demo) return demo;
    } catch {}

    // 3. Fallback: direct GET /courses/demo-cs302-os
    try {
      const res = await apiFetch('/courses/demo-cs302-os');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    throw new Error(
      lastError?.message ||
      'Server unreachable. If using free-tier cloud backend, it may be waking up from sleep. Please try again in 15 seconds.'
    );
  },

  // Documents
  async getDocuments(courseId: string): Promise<DocumentItem[]> {
    const res = await apiFetch(`/documents/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
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
    const res = await apiFetch(`/syllabus/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to load syllabus');
    return res.json();
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
    const query = new URLSearchParams();
    if (params?.document_id) query.append('document_id', params.document_id);
    if (params?.topic_id) query.append('topic_id', params.topic_id);
    if (params?.question_type) query.append('question_type', params.question_type);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.mapping_status) query.append('mapping_status', params.mapping_status);

    const res = await apiFetch(`/questions/course/${courseId}?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load questions');
    return res.json();
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
    const res = await apiFetch(`/analytics/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  async getPriorities(courseId: string): Promise<StudyPriorityItem[]> {
    const res = await apiFetch(`/priorities/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to load study priorities');
    return res.json();
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
    const res = await apiFetch(`/planner/course/${courseId}`);
    if (!res.ok) return null;
    return res.json();
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
