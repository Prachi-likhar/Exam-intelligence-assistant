"""Syllabus Management and Topic Hierarchy Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
import uuid
import json
from typing import List, Dict, Any
from backend.app.database import get_db
from backend.app.schemas import (
    SyllabusUnitResponse, SyllabusTopicResponse,
    UnitCreate, TopicCreate, TopicUpdate
)
from backend.app.services.syllabus_matcher import SyllabusMatcher

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

@router.get("/course/{course_id}", response_model=List[SyllabusUnitResponse])
async def get_course_syllabus(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get full structured syllabus tree (Units -> Topics) with question stats."""
    # Fetch units
    units_query = """
        SELECT * FROM syllabus_units 
        WHERE course_id = ? 
        ORDER BY unit_number ASC;
    """
    async with db.execute(units_query, (course_id,)) as cursor:
        units_rows = await cursor.fetchall()

    # Fetch topics with question count and total marks
    topics_query = """
        SELECT 
            t.*,
            COUNT(q.id) as question_count,
            COALESCE(SUM(q.marks), 0.0) as total_marks
        FROM syllabus_topics t
        LEFT JOIN questions q ON q.matched_topic_id = t.id
        WHERE t.course_id = ?
        GROUP BY t.id
        ORDER BY t.order_index ASC;
    """
    async with db.execute(topics_query, (course_id,)) as cursor:
        topics_rows = await cursor.fetchall()

    topic_by_unit = {}
    for tr in topics_rows:
        u_id = tr["unit_id"]
        if u_id not in topic_by_unit:
            topic_by_unit[u_id] = []
        
        try:
            subtopics = json.loads(tr["subtopics_json"] or "[]")
            keywords = json.loads(tr["keywords_json"] or "[]")
        except Exception:
            subtopics, keywords = [], []

        topic_by_unit[u_id].append({
            "id": tr["id"],
            "unit_id": tr["unit_id"],
            "course_id": tr["course_id"],
            "title": tr["title"],
            "subtopics": subtopics,
            "keywords": keywords,
            "student_mastery": tr["student_mastery"],
            "order_index": tr["order_index"],
            "question_count": tr["question_count"],
            "total_marks": round(tr["total_marks"], 1)
        })

    result = []
    for ur in units_rows:
        u_id = ur["id"]
        result.append({
            "id": u_id,
            "course_id": ur["course_id"],
            "unit_number": ur["unit_number"],
            "title": ur["title"],
            "topics": topic_by_unit.get(u_id, [])
        })

    return result

@router.post("/course/{course_id}/unit")
async def add_unit(course_id: str, payload: UnitCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Add a new syllabus unit."""
    unit_id = str(uuid.uuid4())
    await db.execute("""
        INSERT INTO syllabus_units (id, course_id, unit_number, title)
        VALUES (?, ?, ?, ?);
    """, (unit_id, course_id, payload.unit_number, payload.title))
    await db.commit()
    return {"message": "Unit created", "unit_id": unit_id}

@router.post("/course/{course_id}/topic")
async def add_topic(course_id: str, payload: TopicCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Add a new syllabus topic under a unit."""
    topic_id = str(uuid.uuid4())
    await db.execute("""
        INSERT INTO syllabus_topics (
            id, unit_id, course_id, title, subtopics_json, keywords_json, student_mastery, order_index
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 99);
    """, (
        topic_id, payload.unit_id, course_id, payload.title,
        json.dumps(payload.subtopics), json.dumps(payload.keywords),
        payload.student_mastery
    ))
    await db.commit()
    return {"message": "Topic created", "topic_id": topic_id}

@router.put("/topic/{topic_id}")
async def update_topic(topic_id: str, payload: TopicUpdate, db: aiosqlite.Connection = Depends(get_db)):
    """Update topic details including title, subtopics, keywords, or student mastery."""
    async with db.execute("SELECT * FROM syllabus_topics WHERE id = ?;", (topic_id,)) as cursor:
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Topic not found")

    title = payload.title if payload.title is not None else existing["title"]
    subtopics_json = json.dumps(payload.subtopics) if payload.subtopics is not None else existing["subtopics_json"]
    keywords_json = json.dumps(payload.keywords) if payload.keywords is not None else existing["keywords_json"]
    mastery = payload.student_mastery if payload.student_mastery is not None else existing["student_mastery"]

    await db.execute("""
        UPDATE syllabus_topics
        SET title = ?, subtopics_json = ?, keywords_json = ?, student_mastery = ?
        WHERE id = ?;
    """, (title, subtopics_json, keywords_json, mastery, topic_id))
    await db.commit()
    return {"message": "Topic updated successfully", "topic_id": topic_id}

@router.delete("/topic/{topic_id}")
async def delete_topic(topic_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Delete a topic and reset matched question references."""
    await db.execute("UPDATE questions SET matched_topic_id = NULL, mapping_status = 'uncertain' WHERE matched_topic_id = ?;", (topic_id,))
    await db.execute("DELETE FROM syllabus_topics WHERE id = ?;", (topic_id,))
    await db.commit()
    return {"message": "Topic deleted successfully"}

@router.delete("/unit/{unit_id}")
async def delete_unit(unit_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Delete a unit and all nested topics."""
    await db.execute("DELETE FROM syllabus_units WHERE id = ?;", (unit_id,))
    await db.commit()
    return {"message": "Unit deleted successfully"}

@router.post("/course/{course_id}/remap")
async def remap_course_questions(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Re-runs syllabus matcher on all questions for a course using current syllabus topics."""
    # Get current units and topics
    units = await get_course_syllabus(course_id, db)
    matcher = SyllabusMatcher(units)

    # Get all questions
    async with db.execute("SELECT id, text FROM questions WHERE course_id = ?;", (course_id,)) as cursor:
        questions = await cursor.fetchall()

    remapped_count = 0
    for q in questions:
        match_res = matcher.match_question(q["text"])
        await db.execute("""
            UPDATE questions
            SET matched_topic_id = ?, confidence_score = ?, mapping_status = ?, mapping_explanation = ?
            WHERE id = ?;
        """, (
            match_res["matched_topic_id"], match_res["confidence_score"],
            match_res["mapping_status"], match_res["mapping_explanation"],
            q["id"]
        ))
        remapped_count += 1

    await db.commit()
    return {"message": f"Successfully remapped {remapped_count} questions to syllabus.", "remapped_count": remapped_count}
