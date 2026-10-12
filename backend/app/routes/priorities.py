"""Study Priority Ranking Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
import json
from typing import List
from backend.app.database import get_db
from backend.app.schemas import StudyPriorityItem, ScoringWeightsConfig
from backend.app.services.analytics import AnalyticsEngine
from backend.app.services.priority_engine import PriorityEngine

router = APIRouter(prefix="/api/priorities", tags=["Priorities"])

@router.get("/course/{course_id}", response_model=List[StudyPriorityItem])
async def get_study_priorities(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Ranks syllabus topics from highest to lowest revision priority with explainable scores."""
    # 1. Fetch course settings for custom weights
    async with db.execute("SELECT settings_json FROM courses WHERE id = ?;", (course_id,)) as cursor:
        course_row = await cursor.fetchone()
        if not course_row:
            raise HTTPException(status_code=404, detail="Course not found")

    settings = {}
    try:
        settings = json.loads(course_row["settings_json"] or "{}")
    except Exception:
        pass
    custom_weights = settings.get("weights")

    # 2. Fetch topics
    topics_query = """
        SELECT t.id, t.title, t.unit_id, t.student_mastery,
               u.unit_number, u.title as unit_title
        FROM syllabus_topics t
        JOIN syllabus_units u ON u.id = t.unit_id
        WHERE t.course_id = ?;
    """
    async with db.execute(topics_query, (course_id,)) as cursor:
        topics = [dict(r) for r in await cursor.fetchall()]

    # 3. Fetch questions
    questions_query = """
        SELECT id, document_id, course_id, q_number, sub_q, text, marks,
               question_type, difficulty, matched_topic_id, confidence_score, mapping_status
        FROM questions
        WHERE course_id = ?;
    """
    async with db.execute(questions_query, (course_id,)) as cursor:
        questions = [dict(r) for r in await cursor.fetchall()]

    # 4. Fetch documents
    docs_query = """
        SELECT id, filename, doc_type, exam_year, exam_type, warnings_json
        FROM documents
        WHERE course_id = ?;
    """
    async with db.execute(docs_query, (course_id,)) as cursor:
        documents = [dict(r) for r in await cursor.fetchall()]

    if not topics:
        return []

    # Run analytics
    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    topic_frequencies = analytics["topic_frequencies"]

    # Rank priorities
    priorities = PriorityEngine.rank_study_priorities(
        topic_frequencies, questions, documents, custom_weights
    )
    return priorities

@router.post("/course/{course_id}/weights")
async def update_scoring_weights(
    course_id: str,
    payload: ScoringWeightsConfig,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Save custom scoring weights configuration and recalculate priorities."""
    async with db.execute("SELECT settings_json FROM courses WHERE id = ?;", (course_id,)) as cursor:
        course_row = await cursor.fetchone()
        if not course_row:
            raise HTTPException(status_code=404, detail="Course not found")

    settings = {}
    try:
        settings = json.loads(course_row["settings_json"] or "{}")
    except Exception:
        pass

    settings["weights"] = payload.model_dump()

    await db.execute("""
        UPDATE courses SET settings_json = ? WHERE id = ?;
    """, (json.dumps(settings), course_id))
    await db.commit()

    return {"message": "Scoring weights updated successfully", "weights": payload.model_dump()}
