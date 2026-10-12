"""Pydantic schemas for request validation and API responses"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Course Schemas
class CourseCreate(BaseModel):
    code: str = Field(..., example="CS302")
    name: str = Field(..., example="Operating Systems")
    exam_date: Optional[str] = Field(None, example="2026-11-15")
    semester: Optional[str] = Field(None, example="5th Semester")
    academic_year: Optional[str] = Field(None, example="2025-2026")

class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    exam_date: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    settings_json: Optional[str] = None

class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    exam_date: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    created_at: str
    is_demo: int
    settings_json: str
    document_count: Optional[int] = 0
    question_count: Optional[int] = 0
    topic_count: Optional[int] = 0

# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    course_id: str
    filename: str
    doc_type: str
    exam_year: Optional[int] = None
    semester: Optional[str] = None
    exam_type: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    page_count: int
    extracted_text: Optional[str] = None
    warnings_json: str
    created_at: str
    question_count: Optional[int] = 0

class TextPasteUpload(BaseModel):
    course_id: str
    filename: str
    doc_type: str = "question_paper" # question_paper or syllabus
    raw_text: str
    exam_year: Optional[int] = None
    semester: Optional[str] = None
    exam_type: Optional[str] = "End-Sem"

# Syllabus Schemas
class TopicCreate(BaseModel):
    unit_id: str
    title: str
    subtopics: List[str] = []
    keywords: List[str] = []
    student_mastery: int = Field(3, ge=1, le=5)

class TopicUpdate(BaseModel):
    title: Optional[str] = None
    subtopics: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    student_mastery: Optional[int] = Field(None, ge=1, le=5)

class UnitCreate(BaseModel):
    unit_number: int
    title: str

class SyllabusTopicResponse(BaseModel):
    id: str
    unit_id: str
    course_id: str
    title: str
    subtopics: List[str]
    keywords: List[str]
    student_mastery: int
    order_index: int
    question_count: Optional[int] = 0
    total_marks: Optional[float] = 0.0

class SyllabusUnitResponse(BaseModel):
    id: str
    course_id: str
    unit_number: int
    title: str
    topics: List[SyllabusTopicResponse] = []

class SyllabusBulkImport(BaseModel):
    units: List[Dict[str, Any]] # Structured tree

# Question Schemas
class QuestionUpdate(BaseModel):
    q_number: Optional[str] = None
    sub_q: Optional[str] = None
    text: Optional[str] = None
    marks: Optional[float] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    matched_topic_id: Optional[str] = None
    mapping_status: Optional[str] = None

class QuestionResponse(BaseModel):
    id: str
    document_id: str
    course_id: str
    q_number: Optional[str] = None
    sub_q: Optional[str] = None
    text: str
    marks: float
    question_type: str
    difficulty: str
    difficulty_reason: Optional[str] = None
    matched_topic_id: Optional[str] = None
    matched_topic_title: Optional[str] = None
    matched_unit_number: Optional[int] = None
    matched_unit_title: Optional[str] = None
    confidence_score: float
    mapping_status: str
    mapping_explanation: Optional[str] = None
    page_number: int
    is_repeated: int
    repeat_cluster_id: Optional[str] = None
    exam_year: Optional[int] = None
    exam_type: Optional[str] = None
    doc_filename: Optional[str] = None

# Analytics & Priority Schemas
class ScoringWeightsConfig(BaseModel):
    frequency: float = 0.30
    weightage: float = 0.30
    trend: float = 0.15
    difficulty: float = 0.15
    weakness: float = 0.10

class StudyPriorityItem(BaseModel):
    rank: int
    topic_id: str
    topic_title: str
    unit_id: str
    unit_number: int
    unit_title: str
    priority_score: float # 0 - 100
    component_scores: Dict[str, float]
    frequency_count: int
    papers_count: int
    distinct_years_count: int
    marks_weightage_pct: float
    total_marks: float
    average_marks: float
    year_trend: str # 'Increasing', 'Consistent', 'Decreasing', 'Sporadic', 'Insufficient Data'
    year_breakdown: Dict[int, float]
    difficulty_estimate: str # 'Easy', 'Medium', 'Hard'
    student_mastery: int # 1 to 5
    suggested_revision_mins: int
    recommendation_confidence: str # 'High', 'Medium', 'Low'
    explanation: str

class RevisionPlanRequest(BaseModel):
    exam_date: str
    daily_hours: float = 3.0
    available_days: List[str] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    session_duration_mins: int = 60

class RevisionSessionResponse(BaseModel):
    id: str
    plan_id: str
    course_id: str
    date: str
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    unit_number: Optional[int] = None
    unit_title: Optional[str] = None
    duration_mins: int
    activity_type: str
    completed: int
    notes: str
    order_index: int
    relevant_questions: Optional[List[Dict[str, Any]]] = []

class RevisionPlanResponse(BaseModel):
    id: str
    course_id: str
    exam_date: str
    daily_hours: float
    available_days: List[str]
    session_duration_mins: int
    total_planned_hours: float
    completed_hours: float
    total_sessions: int
    completed_sessions: int
    coverage_percentage: float
    uncovered_topics: List[Dict[str, Any]] = []
    sessions: List[RevisionSessionResponse] = []
