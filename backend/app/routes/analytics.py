"""Exam Intelligence Analytics API Route"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
import json
from backend.app.database import get_db
from backend.app.services.analytics import AnalyticsEngine

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/course/{course_id}")
async def get_course_analytics(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Computes comprehensive exam analytics, topic frequency, weightage, trends, types, and repeats."""
    # 1. Fetch topics
    topics_query = """
        SELECT t.id, t.title, t.unit_id, t.student_mastery,
               u.unit_number, u.title as unit_title
        FROM syllabus_topics t
        JOIN syllabus_units u ON u.id = t.unit_id
        WHERE t.course_id = ?;
    """
    async with db.execute(topics_query, (course_id,)) as cursor:
        topics_rows = await cursor.fetchall()
        topics = [dict(r) for r in topics_rows]

    # 2. Fetch questions
    questions_query = """
        SELECT id, document_id, course_id, q_number, sub_q, text, marks,
               question_type, difficulty, matched_topic_id, confidence_score, mapping_status
        FROM questions
        WHERE course_id = ?;
    """
    async with db.execute(questions_query, (course_id,)) as cursor:
        questions_rows = await cursor.fetchall()
        questions = [dict(r) for r in questions_rows]

    # 3. Fetch documents
    docs_query = """
        SELECT id, filename, doc_type, exam_year, exam_type, warnings_json
        FROM documents
        WHERE course_id = ?;
    """
    async with db.execute(docs_query, (course_id,)) as cursor:
        docs_rows = await cursor.fetchall()
        documents = [dict(r) for r in docs_rows]

    if not topics and not questions:
        return {
            "summary": {
                "total_papers": len(documents),
                "total_questions": 0,
                "total_topics": 0,
                "total_known_marks": 0.0,
                "distinct_years": [],
                "unmapped_questions": 0,
                "unmapped_marks": 0.0,
                "repeated_questions_count": 0
            },
            "topic_frequencies": [],
            "type_distribution": [],
            "difficulty_distribution": [],
            "repeated_questions": [],
            "distinct_years": [],
            "warnings": ["No syllabus topics or exam questions have been added yet."]
        }

    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    return analytics
