"""Export and Printable Report Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Response
import aiosqlite
import csv
import io
from backend.app.database import get_db
from backend.app.services.analytics import AnalyticsEngine
from backend.app.services.priority_engine import PriorityEngine

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("/course/{course_id}/topics-csv")
async def export_topics_csv(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Export prioritized topics as CSV."""
    # Fetch data
    topics_query = """
        SELECT t.id, t.title, t.unit_id, t.student_mastery,
               u.unit_number, u.title as unit_title
        FROM syllabus_topics t
        JOIN syllabus_units u ON u.id = t.unit_id
        WHERE t.course_id = ?;
    """
    async with db.execute(topics_query, (course_id,)) as cursor:
        topics = [dict(r) for r in await cursor.fetchall()]

    questions_query = "SELECT id, document_id, marks, question_type, difficulty, matched_topic_id, confidence_score FROM questions WHERE course_id = ?;"
    async with db.execute(questions_query, (course_id,)) as cursor:
        questions = [dict(r) for r in await cursor.fetchall()]

    docs_query = "SELECT id, filename, exam_year, exam_type FROM documents WHERE course_id = ?;"
    async with db.execute(docs_query, (course_id,)) as cursor:
        documents = [dict(r) for r in await cursor.fetchall()]

    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    priorities = PriorityEngine.rank_study_priorities(analytics["topic_frequencies"], questions, documents)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Unit Number", "Unit Title", "Topic Title", "Priority Score (100)",
        "Marks Weightage (%)", "Total Marks", "Historical Questions Count", "Distinct Papers Count",
        "Year Trend", "Estimated Difficulty", "Student Mastery (1-5)", "Suggested Revision (Mins)",
        "Confidence", "Explanation"
    ])

    for p in priorities:
        writer.writerow([
            p["rank"], p["unit_number"], p["unit_title"], p["topic_title"], p["priority_score"],
            p["marks_weightage_pct"], p["total_marks"], p["frequency_count"], p["papers_count"],
            p["year_trend"], p["difficulty_estimate"], p["student_mastery"], p["suggested_revision_mins"],
            p["recommendation_confidence"], p["explanation"]
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ExamIQ_Topics_Priority_{course_id[:8]}.csv"}
    )

@router.get("/course/{course_id}/questions-csv")
async def export_questions_csv(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Export extracted questions and classifications as CSV."""
    query = """
        SELECT 
            q.q_number, q.sub_q, q.text, q.marks, q.question_type, q.difficulty,
            t.title as topic_title, u.unit_number, u.title as unit_title,
            q.confidence_score, q.mapping_status,
            d.exam_year, d.exam_type, d.filename
        FROM questions q
        LEFT JOIN documents d ON d.id = q.document_id
        LEFT JOIN syllabus_topics t ON t.id = q.matched_topic_id
        LEFT JOIN syllabus_units u ON u.id = t.unit_id
        WHERE q.course_id = ?
        ORDER BY d.exam_year DESC, q.q_number ASC;
    """
    async with db.execute(query, (course_id,)) as cursor:
        rows = await cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Paper Year", "Exam Type", "Source Filename", "Q. No", "Sub Q", "Question Text",
        "Marks", "Type", "Estimated Difficulty", "Matched Topic", "Unit Number",
        "Unit Title", "Mapping Confidence", "Mapping Status"
    ])

    for r in rows:
        writer.writerow([
            r["exam_year"] or "", r["exam_type"] or "", r["filename"] or "",
            r["q_number"] or "", r["sub_q"] or "", r["text"], r["marks"],
            r["question_type"], r["difficulty"], r["topic_title"] or "Unmapped",
            r["unit_number"] or "", r["unit_title"] or "", round(r["confidence_score"], 2),
            r["mapping_status"]
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ExamIQ_Questions_{course_id[:8]}.csv"}
    )

@router.get("/course/{course_id}/planner-csv")
async def export_planner_csv(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Export revision planner sessions as CSV."""
    query = """
        SELECT s.date, t.title as topic_title, u.unit_number, s.duration_mins,
               s.activity_type, s.completed, s.notes
        FROM revision_sessions s
        LEFT JOIN syllabus_topics t ON t.id = s.topic_id
        LEFT JOIN syllabus_units u ON u.id = t.unit_id
        WHERE s.course_id = ?
        ORDER BY s.date ASC, s.order_index ASC;
    """
    async with db.execute(query, (course_id,)) as cursor:
        rows = await cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Revision Date", "Topic", "Unit Number", "Duration (Mins)",
        "Activity Type", "Status", "Notes"
    ])

    for r in rows:
        writer.writerow([
            r["date"], r["topic_title"] or "Review", r["unit_number"] or "",
            r["duration_mins"], r["activity_type"],
            "Completed" if r["completed"] else "Pending", r["notes"]
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ExamIQ_RevisionPlan_{course_id[:8]}.csv"}
    )

@router.get("/course/{course_id}/report")
async def get_printable_report_data(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Generates structured payload for printable analysis report view."""
    # Fetch course
    async with db.execute("SELECT * FROM courses WHERE id = ?;", (course_id,)) as cursor:
        course = await cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    # Fetch topics, questions, documents
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
        SELECT id, document_id, marks, question_type, difficulty, matched_topic_id, confidence_score
        FROM questions WHERE course_id = ?;
    """
    async with db.execute(questions_query, (course_id,)) as cursor:
        questions = [dict(r) for r in await cursor.fetchall()]

    docs_query = """
        SELECT id, filename, doc_type, exam_year, exam_type, status, page_count
        FROM documents WHERE course_id = ?;
    """
    async with db.execute(docs_query, (course_id,)) as cursor:
        documents = [dict(r) for r in await cursor.fetchall()]

    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    priorities = PriorityEngine.rank_study_priorities(analytics["topic_frequencies"], questions, documents)

    return {
        "course": dict(course),
        "documents": documents,
        "analytics_summary": analytics["summary"],
        "priorities": priorities,
        "type_distribution": analytics["type_distribution"],
        "difficulty_distribution": analytics["difficulty_distribution"],
        "repeated_questions": analytics["repeated_questions"],
        "warnings": analytics["warnings"]
    }
