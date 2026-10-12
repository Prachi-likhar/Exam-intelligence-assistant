"""Document Upload, OCR Processing, and Parsing Endpoints"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import aiosqlite
import uuid
import os
import json
from pathlib import Path
from typing import List, Optional
from backend.app.database import get_db
from backend.app.config import UPLOADS_DIR
from backend.app.schemas import DocumentResponse, TextPasteUpload
from backend.app.services.extractor import DocumentExtractor
from backend.app.services.syllabus_matcher import SyllabusMatcher

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 25 * 1024 * 1024 # 25 MB

async def _get_course_topics_for_matching(course_id: str, db: aiosqlite.Connection) -> List[dict]:
    """Helper to fetch structured units and topics for mapping questions."""
    async with db.execute("""
        SELECT u.id as unit_id, u.unit_number, u.title as unit_title,
               t.id as topic_id, t.title as topic_title, t.subtopics_json, t.keywords_json, t.student_mastery
        FROM syllabus_units u
        LEFT JOIN syllabus_topics t ON t.unit_id = u.id
        WHERE u.course_id = ?
        ORDER BY u.unit_number ASC, t.order_index ASC;
    """, (course_id,)) as cursor:
        rows = await cursor.fetchall()
        
    unit_map = {}
    for r in rows:
        u_id = r["unit_id"]
        if u_id not in unit_map:
            unit_map[u_id] = {
                "id": u_id,
                "unit_number": r["unit_number"],
                "title": r["unit_title"],
                "topics": []
            }
        if r["topic_id"]:
            try:
                subtopics = json.loads(r["subtopics_json"] or "[]")
                keywords = json.loads(r["keywords_json"] or "[]")
            except Exception:
                subtopics, keywords = [], []

            unit_map[u_id]["topics"].append({
                "id": r["topic_id"],
                "title": r["topic_title"],
                "subtopics": subtopics,
                "keywords": keywords,
                "student_mastery": r["student_mastery"]
            })
    return list(unit_map.values())

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    course_id: str = Form(...),
    doc_type: str = Form("question_paper"), # question_paper, syllabus, course_material
    exam_year: Optional[int] = Form(None),
    semester: Optional[str] = Form(None),
    exam_type: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Upload PDF or Image file, extract text, and parse questions or syllabus."""
    # Verify course exists
    async with db.execute("SELECT id FROM courses WHERE id = ?;", (course_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Course not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: PDF, PNG, JPG, JPEG"
        )

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    saved_path = UPLOADS_DIR / safe_filename

    # Save to disk
    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 25 MB limit")

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # Extract text based on file type
    warnings = []
    page_count = 1
    extracted_text = ""

    try:
        if ext == ".pdf":
            extracted_text, page_count, warnings = DocumentExtractor.extract_from_pdf(str(saved_path))
        else:
            extracted_text, page_count, warnings = DocumentExtractor.extract_from_image(str(saved_path))
    except Exception as extract_err:
        warnings.append(f"Extraction error: {str(extract_err)}")

    if not extracted_text.strip():
        warnings.append("Document text was empty. Please check if file is readable or use text paste fallback.")

    # Save document record
    await db.execute("""
        INSERT INTO documents (
            id, course_id, filename, doc_type, exam_year, semester, exam_type,
            file_path, file_size, status, extracted_text, page_count, warnings_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        doc_id, course_id, file.filename, doc_type, exam_year, semester, exam_type,
        str(saved_path), file_size, "completed", extracted_text, page_count, json.dumps(warnings)
    ))

    # If syllabus document, extract and populate syllabus tree
    if doc_type == "syllabus" and extracted_text.strip():
        parsed_units = DocumentExtractor.parse_syllabus_text(extracted_text)
        for u in parsed_units:
            u_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO syllabus_units (id, course_id, unit_number, title)
                VALUES (?, ?, ?, ?);
            """, (u_id, course_id, u["unit_number"], u["title"]))

            for idx, t in enumerate(u.get("topics", [])):
                t_id = str(uuid.uuid4())
                await db.execute("""
                    INSERT INTO syllabus_topics (
                        id, unit_id, course_id, title, subtopics_json, keywords_json, student_mastery, order_index
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    t_id, u_id, course_id, t["title"],
                    json.dumps(t.get("subtopics", [])),
                    json.dumps(t.get("keywords", [])),
                    t.get("student_mastery", 3), idx
                ))

    # If question paper, parse and map questions
    elif doc_type == "question_paper" and extracted_text.strip():
        parsed_questions = DocumentExtractor.parse_questions_from_text(extracted_text)
        units_with_topics = await _get_course_topics_for_matching(course_id, db)
        matcher = SyllabusMatcher(units_with_topics)

        for q in parsed_questions:
            match_res = matcher.match_question(q["text"])
            await db.execute("""
                INSERT INTO questions (
                    id, document_id, course_id, q_number, sub_q, text, marks,
                    question_type, difficulty, difficulty_reason, matched_topic_id,
                    confidence_score, mapping_status, mapping_explanation, page_number
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                q["id"], doc_id, course_id, q.get("q_number"), q.get("sub_q"), q["text"],
                q.get("marks", 5.0), q.get("question_type", "Theory"),
                q.get("difficulty", "Medium"), q.get("difficulty_reason"),
                match_res["matched_topic_id"], match_res["confidence_score"],
                match_res["mapping_status"], match_res["mapping_explanation"],
                q.get("page_number", 1)
            ))

    await db.commit()

    # Query created document with question count
    async with db.execute("""
        SELECT d.*, (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count
        FROM documents d WHERE d.id = ?;
    """, (doc_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row)

@router.post("/paste", response_model=DocumentResponse)
async def upload_pasted_text(payload: TextPasteUpload, db: aiosqlite.Connection = Depends(get_db)):
    """Process pasted text as a question paper or syllabus document fallback."""
    # Verify course exists
    async with db.execute("SELECT id FROM courses WHERE id = ?;", (payload.course_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Course not found")

    doc_id = str(uuid.uuid4())
    cleaned_text = DocumentExtractor.clean_text(payload.raw_text)

    await db.execute("""
        INSERT INTO documents (
            id, course_id, filename, doc_type, exam_year, semester, exam_type,
            file_path, file_size, status, extracted_text, page_count, warnings_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'completed', ?, 1, '[]');
    """, (
        doc_id, payload.course_id, payload.filename, payload.doc_type, payload.exam_year,
        payload.semester, payload.exam_type, len(cleaned_text), cleaned_text
    ))

    if payload.doc_type == "syllabus":
        parsed_units = DocumentExtractor.parse_syllabus_text(cleaned_text)
        for u in parsed_units:
            u_id = str(uuid.uuid4())
            await db.execute("""
                INSERT INTO syllabus_units (id, course_id, unit_number, title)
                VALUES (?, ?, ?, ?);
            """, (u_id, payload.course_id, u["unit_number"], u["title"]))

            for idx, t in enumerate(u.get("topics", [])):
                t_id = str(uuid.uuid4())
                await db.execute("""
                    INSERT INTO syllabus_topics (
                        id, unit_id, course_id, title, subtopics_json, keywords_json, student_mastery, order_index
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    t_id, u_id, payload.course_id, t["title"],
                    json.dumps(t.get("subtopics", [])),
                    json.dumps(t.get("keywords", [])),
                    t.get("student_mastery", 3), idx
                ))

    elif payload.doc_type == "question_paper":
        parsed_questions = DocumentExtractor.parse_questions_from_text(cleaned_text)
        units_with_topics = await _get_course_topics_for_matching(payload.course_id, db)
        matcher = SyllabusMatcher(units_with_topics)

        for q in parsed_questions:
            match_res = matcher.match_question(q["text"])
            await db.execute("""
                INSERT INTO questions (
                    id, document_id, course_id, q_number, sub_q, text, marks,
                    question_type, difficulty, difficulty_reason, matched_topic_id,
                    confidence_score, mapping_status, mapping_explanation, page_number
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                q["id"], doc_id, payload.course_id, q.get("q_number"), q.get("sub_q"), q["text"],
                q.get("marks", 5.0), q.get("question_type", "Theory"),
                q.get("difficulty", "Medium"), q.get("difficulty_reason"),
                match_res["matched_topic_id"], match_res["confidence_score"],
                match_res["mapping_status"], match_res["mapping_explanation"],
                q.get("page_number", 1)
            ))

    await db.commit()

    async with db.execute("""
        SELECT d.*, (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count
        FROM documents d WHERE d.id = ?;
    """, (doc_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row)

@router.get("/course/{course_id}", response_model=List[DocumentResponse])
async def list_course_documents(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """List all documents for a course."""
    query = """
        SELECT d.*, (SELECT COUNT(*) FROM questions q WHERE q.document_id = d.id) as question_count
        FROM documents d
        WHERE d.course_id = ?
        ORDER BY d.created_at DESC;
    """
    async with db.execute(query, (course_id,)) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Delete a document and cascade remove extracted questions."""
    async with db.execute("SELECT file_path FROM documents WHERE id = ?;", (doc_id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        if row["file_path"] and os.path.exists(row["file_path"]):
            try:
                os.remove(row["file_path"])
            except Exception:
                pass

    await db.execute("DELETE FROM documents WHERE id = ?;", (doc_id,))
    await db.commit()
    return {"message": "Document and questions deleted successfully", "document_id": doc_id}
