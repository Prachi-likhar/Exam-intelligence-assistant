"""Courses API Endpoints"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite
import uuid
from typing import List
from backend.app.database import get_db
from backend.app.schemas import CourseCreate, CourseUpdate, CourseResponse
from backend.app.services.demo_data import seed_demo_data, DEMO_COURSE_ID

router = APIRouter(prefix="/api/courses", tags=["Courses"])

@router.get("", response_model=List[CourseResponse])
async def list_courses(db: aiosqlite.Connection = Depends(get_db)):
    """List all courses with summary counts."""
    query = """
        SELECT 
            c.*,
            (SELECT COUNT(*) FROM documents d WHERE d.course_id = c.id) as document_count,
            (SELECT COUNT(*) FROM questions q WHERE q.course_id = c.id) as question_count,
            (SELECT COUNT(*) FROM syllabus_topics t WHERE t.course_id = c.id) as topic_count
        FROM courses c
        ORDER BY c.created_at DESC;
    """
    async with db.execute(query) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("", response_model=CourseResponse)
async def create_course(payload: CourseCreate, db: aiosqlite.Connection = Depends(get_db)):
    """Create a new academic course/subject."""
    course_id = str(uuid.uuid4())
    await db.execute("""
        INSERT INTO courses (id, code, name, exam_date, semester, academic_year, is_demo, settings_json)
        VALUES (?, ?, ?, ?, ?, ?, 0, '{}');
    """, (course_id, payload.code, payload.name, payload.exam_date, payload.semester, payload.academic_year))
    await db.commit()

    async with db.execute("SELECT *, 0 as document_count, 0 as question_count, 0 as topic_count FROM courses WHERE id = ?;", (course_id,)) as cursor:
        row = await cursor.fetchone()
        return dict(row)

@router.post("/demo/load", response_model=CourseResponse)
@router.get("/demo/load", response_model=CourseResponse)
async def load_demo(db: aiosqlite.Connection = Depends(get_db)):
    """Seed and load the isolated CS302 Operating Systems demo course."""
    demo_id = await seed_demo_data(db)
    return await get_course(demo_id, db)

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Get single course details."""
    query = """
        SELECT 
            c.*,
            (SELECT COUNT(*) FROM documents d WHERE d.course_id = c.id) as document_count,
            (SELECT COUNT(*) FROM questions q WHERE q.course_id = c.id) as question_count,
            (SELECT COUNT(*) FROM syllabus_topics t WHERE t.course_id = c.id) as topic_count
        FROM courses c
        WHERE c.id = ?;
    """
    async with db.execute(query, (course_id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")
        return dict(row)

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(course_id: str, payload: CourseUpdate, db: aiosqlite.Connection = Depends(get_db)):
    """Update course attributes."""
    async with db.execute("SELECT * FROM courses WHERE id = ?;", (course_id,)) as cursor:
        existing = await cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Course not found")

    code = payload.code if payload.code is not None else existing["code"]
    name = payload.name if payload.name is not None else existing["name"]
    exam_date = payload.exam_date if payload.exam_date is not None else existing["exam_date"]
    semester = payload.semester if payload.semester is not None else existing["semester"]
    academic_year = payload.academic_year if payload.academic_year is not None else existing["academic_year"]
    settings = payload.settings_json if payload.settings_json is not None else existing["settings_json"]

    await db.execute("""
        UPDATE courses
        SET code = ?, name = ?, exam_date = ?, semester = ?, academic_year = ?, settings_json = ?
        WHERE id = ?;
    """, (code, name, exam_date, semester, academic_year, settings, course_id))
    await db.commit()

    return await get_course(course_id, db)

@router.delete("/{course_id}")
async def delete_course(course_id: str, db: aiosqlite.Connection = Depends(get_db)):
    """Delete a course and all associated documents, questions, and syllabus."""
    await db.execute("DELETE FROM courses WHERE id = ?;", (course_id,))
    await db.commit()
    return {"message": "Course deleted successfully", "course_id": course_id}

