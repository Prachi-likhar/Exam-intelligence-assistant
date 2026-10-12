export interface Course {
  id: string;
  code: string;
  name: string;
  exam_date?: string;
  semester?: string;
  academic_year?: string;
  created_at: string;
  is_demo: number;
  settings_json: string;
  document_count: number;
  question_count: number;
  topic_count: number;
}

export interface DocumentItem {
  id: string;
  course_id: string;
  filename: string;
  doc_type: string;
  exam_year?: number;
  semester?: string;
  exam_type?: string;
  file_path?: string;
  file_size?: number;
  status: string;
  page_count: number;
  extracted_text?: string;
  warnings_json: string;
  created_at: string;
  question_count: number;
}

export interface SyllabusTopic {
  id: string;
  unit_id: string;
  course_id: string;
  title: string;
  subtopics: string[];
  keywords: string[];
  student_mastery: number; // 1-5
  order_index: number;
  question_count?: number;
  total_marks?: number;
}

export interface SyllabusUnit {
  id: string;
  course_id: string;
  unit_number: number;
  title: string;
  topics: SyllabusTopic[];
}

export interface Question {
  id: string;
  document_id: string;
  course_id: string;
  q_number?: string;
  sub_q?: string;
  text: string;
  marks: number;
  question_type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  difficulty_reason?: string;
  matched_topic_id?: string;
  matched_topic_title?: string;
  matched_unit_number?: number;
  matched_unit_title?: string;
  confidence_score: number;
  mapping_status: 'auto' | 'reviewed' | 'uncertain';
  mapping_explanation?: string;
  page_number: number;
  is_repeated: number;
  repeat_cluster_id?: string;
  exam_year?: number;
  exam_type?: string;
  doc_filename?: string;
}

export interface TopicFrequency {
  topic_id: string;
  topic_title: string;
  unit_id: string;
  unit_number: number;
  unit_title: string;
  student_mastery: number;
  matched_questions_count: number;
  distinct_papers_count: number;
  distinct_years_count: number;
  total_marks: number;
  average_marks: number;
  percentage_of_questions: number;
  marks_weightage_pct: number;
  trend: string;
  trend_reason: string;
  year_marks: Record<number, number>;
}

export interface QuestionTypeDist {
  type: string;
  count: number;
  percentage: number;
  total_marks: number;
}

export interface DifficultyDist {
  difficulty: string;
  count: number;
  percentage: number;
  total_marks: number;
}

export interface RepeatedCluster {
  cluster_id: string;
  repetition_type: string;
  count: number;
  questions: Array<{
    id: string;
    q_number?: string;
    sub_q?: string;
    text: string;
    marks: number;
    year?: number;
    exam_type?: string;
    paper_filename: string;
  }>;
}

export interface AnalyticsSummary {
  total_papers: number;
  total_questions: number;
  total_topics: number;
  total_known_marks: number;
  distinct_years: number[];
  unmapped_questions: number;
  unmapped_marks: number;
  repeated_questions_count: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  topic_frequencies: TopicFrequency[];
  type_distribution: QuestionTypeDist[];
  difficulty_distribution: DifficultyDist[];
  repeated_questions: RepeatedCluster[];
  distinct_years: number[];
  warnings: string[];
}

export interface StudyPriorityItem {
  rank: number;
  topic_id: string;
  topic_title: string;
  unit_id: string;
  unit_number: number;
  unit_title: string;
  priority_score: number;
  component_scores: {
    historical_frequency: number;
    marks_weightage: number;
    year_trend: number;
    estimated_difficulty: number;
    student_weakness: number;
  };
  frequency_count: number;
  papers_count: number;
  distinct_years_count: number;
  marks_weightage_pct: number;
  total_marks: number;
  average_marks: number;
  year_trend: string;
  year_breakdown: Record<number, number>;
  difficulty_estimate: string;
  student_mastery: number;
  suggested_revision_mins: number;
  recommendation_confidence: 'High' | 'Medium' | 'Low';
  explanation: string;
}

export interface RevisionSession {
  id: string;
  plan_id: string;
  course_id: string;
  date: string;
  topic_id?: string;
  topic_title?: string;
  unit_number?: number;
  unit_title?: string;
  duration_mins: number;
  activity_type: string;
  completed: number;
  notes: string;
  order_index: number;
  relevant_questions?: Array<{
    id: string;
    q_number?: string;
    text: string;
    marks: number;
    type: string;
  }>;
}

export interface RevisionPlan {
  id: string;
  course_id: string;
  exam_date: string;
  daily_hours: number;
  available_days: string[];
  session_duration_mins: number;
  total_planned_hours: number;
  completed_hours: number;
  total_sessions: number;
  completed_sessions: number;
  coverage_percentage: number;
  uncovered_topics: Array<{
    topic_id: string;
    topic_title: string;
    priority_score: number;
    unit_number: number;
    reason: string;
  }>;
  sessions: RevisionSession[];
}

export interface ScoringWeights {
  frequency: number;
  weightage: number;
  trend: number;
  difficulty: number;
  weakness: number;
}
