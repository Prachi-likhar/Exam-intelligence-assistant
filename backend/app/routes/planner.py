"""Personalized Revision Planner Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Body
import aiosqlite
import json
from datetime import datetime, timedelta
from typing import List, Optional
from backend.app.database import get_db
from backend.app.schemas import (
    RevisionPlanRequest, RevisionPlanResponse, RevisionSessionResponse
)
from backend.app.services.analytics import AnalyticsEngine
from backend.app.services.priority_engine import PriorityEngine
from backend.app.services.planner import RevisionPlannerEngine

router = APIRouter(prefix="/api/planner", tags=["Planner"])

@router.post("/course/{course_id}/generate", response_model=RevisionPlanResponse)
async def generate_revision_plan(
    course_id: str,
    payload: RevisionPlanRequest,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Generate and persist an interactive day-wise revision plan."""
    # 1. Fetch course
    async with db.execute("SELECT * FROM courses WHERE id = ?;", (course_id,)) as cursor:
        course = await cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    # Update exam date in course if provided
    if payload.exam_date:
        await db.execute("UPDATE courses SET exam_date = ? WHERE id = ?;", (payload.exam_date, course_id))

    # 2. Fetch topics & questions
    topics_query = """
        SELECT t.id, t.title, t.unit_id, t.student_mastery,
               u.unit_number, u.title as unit_title
        FROM syllabus_topics t
        JOIN syllabus_units u ON u.id = t.unit_id
        WHERE t.course_id = ?;
    """
    async with db.execute(topics_query, (course_id,)) as cursor:
        topics = [dict(r) for r in await cursor.fetchall()]

    questions_query = """
        SELECT id, document_id, course_id, q_number, sub_q, text, marks,
               question_type, difficulty, matched_topic_id, confidence_score, mapping_status
        FROM questions
        WHERE course_id = ?;
    """
    async with db.execute(questions_query, (course_id,)) as cursor:
        questions = [dict(r) for r in await cursor.fetchall()]

    docs_query = """
        SELECT id, filename, doc_type, exam_year, exam_type, warnings_json
        FROM documents
        WHERE course_id = ?;
    """
    async with db.execute(docs_query, (course_id,)) as cursor:
        documents = [dict(r) for r in await cursor.fetchall()]

    if not topics:
        raise HTTPException(status_code=400, detail="Cannot generate plan: course has no syllabus topics yet.")

    # Calculate priorities
    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    priorities = PriorityEngine.rank_study_priorities(analytics["topic_frequencies"], questions, documents)

    # Generate plan
    plan_data = RevisionPlannerEngine.generate_plan(
        course_id=course_id,
        prioritized_topics=priorities,
        questions=questions,
        exam_date_str=payload.exam_date,
        daily_hours=payload.daily_hours,
        available_days=payload.available_days,
        session_duration_mins=payload.session_duration_mins
    )

    # Clean old plan for this course
    await db.execute("DELETE FROM revision_plans WHERE course_id = ?;", (course_id,))

    # Save plan
    await db.execute("""
        INSERT INTO revision_plans (
            id, course_id, exam_date, daily_hours, available_days_json,
            session_duration_mins, total_planned_hours
        )
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (
        plan_data["id"], course_id, plan_data["exam_date"], plan_data["daily_hours"],
        json.dumps(plan_data["available_days"]), plan_data["session_duration_mins"],
        plan_data["total_planned_hours"]
    ))

    # Save individual sessions
    for s in plan_data["sessions"]:
        await db.execute("""
            INSERT INTO revision_sessions (
                id, plan_id, course_id, date, topic_id, unit_id, duration_mins,
                activity_type, completed, notes, order_index
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            s["id"], plan_data["id"], course_id, s["date"], s["topic_id"],
            None, s["duration_mins"], s["activity_type"], 0, s["notes"], s["order_index"]
        ))

    await db.commit()
    return plan_data

@router.get("/course/{course_id}", response_model=Optional[RevisionPlanResponse])
async def get_revision_plan(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Fetch the latest saved revision plan with session details and completion stats."""
    async with db.execute("SELECT * FROM revision_plans WHERE course_id = ? ORDER BY created_at DESC LIMIT 1;", (course_id,)) as cursor:
        plan_row = await cursor.fetchone()
        if not plan_row:
            return None

    # Fetch sessions joined with topic details
    sessions_query = """
        SELECT 
            s.*,
            t.title as topic_title,
            u.unit_number,
            u.title as unit_title
        FROM revision_sessions s
        LEFT JOIN syllabus_topics t ON t.id = s.topic_id
        LEFT JOIN syllabus_units u ON u.id = t.unit_id
        WHERE s.plan_id = ?
        ORDER BY s.date ASC, s.order_index ASC;
    """
    async with db.execute(sessions_query, (plan_row["id"],)) as cursor:
        sessions_rows = await cursor.fetchall()

    # Fetch questions for context
    async with db.execute("SELECT id, matched_topic_id, q_number, text, marks, question_type FROM questions WHERE course_id = ?;", (course_id,)) as cursor:
        all_qs = [dict(r) for r in await cursor.fetchall()]

    qs_by_topic = {}
    for q in all_qs:
        t_id = q["matched_topic_id"]
        if t_id not in qs_by_topic:
            qs_by_topic[t_id] = []
        if len(qs_by_topic[t_id]) < 3:
            qs_by_topic[t_id].append({
                "id": q["id"],
                "q_number": q["q_number"],
                "text": q["text"][:120] + "..." if len(q["text"]) > 120 else q["text"],
                "marks": q["marks"],
                "type": q["question_type"]
            })

    sessions = []
    completed_mins = 0
    completed_sessions = 0
    covered_topic_ids = set()

    for r in sessions_rows:
        s_dict = dict(r)
        if s_dict["completed"]:
            completed_mins += s_dict["duration_mins"]
            completed_sessions += 1
        if s_dict["topic_id"]:
            covered_topic_ids.add(s_dict["topic_id"])
        s_dict["relevant_questions"] = qs_by_topic.get(s_dict["topic_id"], [])
        sessions.append(s_dict)

    # Fetch total topic count
    async with db.execute("SELECT COUNT(*) as cnt FROM syllabus_topics WHERE course_id = ?;", (course_id,)) as cursor:
        t_cnt_row = await cursor.fetchone()
        total_topics = t_cnt_row["cnt"] if t_cnt_row else 1

    try:
        available_days = json.loads(plan_row["available_days_json"] or "[]")
    except Exception:
        available_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    coverage_pct = round((len(covered_topic_ids) / max(total_topics, 1)) * 100, 1)

    return {
        "id": plan_row["id"],
        "course_id": plan_row["course_id"],
        "exam_date": plan_row["exam_date"],
        "daily_hours": plan_row["daily_hours"],
        "available_days": available_days,
        "session_duration_mins": plan_row["session_duration_mins"],
        "total_planned_hours": plan_row["total_planned_hours"],
        "completed_hours": round(completed_mins / 60.0, 1),
        "total_sessions": len(sessions),
        "completed_sessions": completed_sessions,
        "coverage_percentage": coverage_pct,
        "uncovered_topics": [],
        "sessions": sessions
    }

@router.patch("/session/{session_id}")
async def update_revision_session(
    session_id: str,
    payload: dict = Body(...),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Toggle completed, update notes, duration, or date of a revision session."""
    fields = []
    params = []

    if "completed" in payload:
        fields.append("completed = ?")
        params.append(1 if payload["completed"] else 0)
    if "duration_mins" in payload:
        fields.append("duration_mins = ?")
        params.append(int(payload["duration_mins"]))
    if "notes" in payload:
        fields.append("notes = ?")
        params.append(str(payload["notes"]))
    if "date" in payload:
        fields.append("date = ?")
        params.append(str(payload["date"]))

    if not fields:
        return {"message": "No fields to update"}

    params.append(session_id)
    await db.execute(f"UPDATE revision_sessions SET {', '.join(fields)} WHERE id = ?;", tuple(params))
    await db.commit()
    return {"message": "Session updated successfully", "session_id": session_id}
