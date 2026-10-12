"""Extracted Questions Review and Correction Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
import aiosqlite
from typing import List, Optional
from backend.app.database import get_db
from backend.app.schemas import QuestionResponse, QuestionUpdate

router = APIRouter(prefix="/api/questions", tags=["Questions"])

@router.get("/course/{course_id}", response_model=List[QuestionResponse])
async def list_course_questions(
    course_id: str,
    document_id: Optional[str] = Query(None),
    topic_id: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    mapping_status: Optional[str] = Query(None),
    db: aiosqlite.Connection = Depends(get_db)
):
    """List questions with metadata, matched topic/unit names, and filtering options."""
    query = """
        SELECT 
            q.*,
            t.title as matched_topic_title,
            u.unit_number as matched_unit_number,
            u.title as matched_unit_title,
            d.exam_year,
            d.exam_type,
            d.filename as doc_filename
        FROM questions q
        LEFT JOIN documents d ON d.id = q.document_id
        LEFT JOIN syllabus_topics t ON t.id = q.matched_topic_id
        LEFT JOIN syllabus_units u ON u.id = t.unit_id
        WHERE q.course_id = ?
    """
    params = [course_id]

    if document_id:
        query += " AND q.document_id = ?"
        params.append(document_id)
    if topic_id:
        query += " AND q.matched_topic_id = ?"
        params.append(topic_id)
    if question_type:
        query += " AND q.question_type = ?"
        params.append(question_type)
    if difficulty:
        query += " AND q.difficulty = ?"
        params.append(difficulty)
    if mapping_status:
        query += " AND q.mapping_status = ?"
        params.append(mapping_status)

    query += " ORDER BY d.exam_year DESC, q.q_number ASC, q.sub_q ASC;"

    async with db.execute(query, tuple(params)) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

@router.put("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Update question text, marks, question type, difficulty, or topic mapping."""
    async with db.execute("SELECT * FROM questions WHERE id = ?;", (question_id,)) as cursor:
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Question not found")

    q_number = payload.q_number if payload.q_number is not None else existing["q_number"]
    sub_q = payload.sub_q if payload.sub_q is not None else existing["sub_q"]
    text = payload.text if payload.text is not None else existing["text"]
    marks = payload.marks if payload.marks is not None else existing["marks"]
    q_type = payload.question_type if payload.question_type is not None else existing["question_type"]
    difficulty = payload.difficulty if payload.difficulty is not None else existing["difficulty"]
    matched_topic_id = payload.matched_topic_id if payload.matched_topic_id is not None else existing["matched_topic_id"]
    
    # If user changed topic manually, mark as reviewed and boost confidence
    if payload.matched_topic_id is not None and payload.matched_topic_id != existing["matched_topic_id"]:
        mapping_status = "reviewed"
        confidence_score = 1.0
        mapping_explanation = "Manually assigned and confirmed by student."
    else:
        mapping_status = payload.mapping_status if payload.mapping_status is not None else existing["mapping_status"]
        confidence_score = existing["confidence_score"]
        mapping_explanation = existing["mapping_explanation"]

    await db.execute("""
        UPDATE questions
        SET q_number = ?, sub_q = ?, text = ?, marks = ?, question_type = ?,
            difficulty = ?, matched_topic_id = ?, mapping_status = ?,
            confidence_score = ?, mapping_explanation = ?
        WHERE id = ?;
    """, (
        q_number, sub_q, text, marks, q_type, difficulty,
        matched_topic_id, mapping_status, confidence_score,
        mapping_explanation, question_id
    ))
    await db.commit()

    # Return updated question with joins
    query = """
        SELECT 
            q.*,
            t.title as matched_topic_title,
            u.unit_number as matched_unit_number,
            u.title as matched_unit_title,
            d.exam_year,
            d.exam_type,
            d.filename as doc_filename
        FROM questions q
        LEFT JOIN documents d ON d.id = q.document_id
        LEFT JOIN syllabus_topics t ON t.id = q.matched_topic_id
        LEFT JOIN syllabus_units u ON u.id = t.unit_id
        WHERE q.id = ?;
    """
    async with db.execute(query, (question_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row)

@router.delete("/{question_id}")
async def delete_question(question_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Delete a question."""
    await db.execute("DELETE FROM questions WHERE id = ?;", (question_id,))
    await db.commit()
    return {"message": "Question deleted successfully", "question_id": question_id}
