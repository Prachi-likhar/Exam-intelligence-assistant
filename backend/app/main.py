"""ExamIQ - AI-Powered Exam Intelligence Assistant
Main FastAPI Application Entrypoint
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.database import init_db
from backend.app.routes import courses, documents, syllabus, questions, analytics, priorities, planner, export

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    await init_db()
    yield

app = FastAPI(
    title="ExamIQ API — Exam Intelligence Assistant",
    description="Backend API for previous exam question parsing, syllabus mapping, statistical weightage, study prioritization, and revision planning.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow frontend Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(courses.router)
app.include_router(documents.router)
app.include_router(syllabus.router)
app.include_router(questions.router)
app.include_router(analytics.router)
app.include_router(priorities.router)
app.include_router(planner.router)
app.include_router(export.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ExamIQ Engine",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to ExamIQ API. Documentation available at /docs",
        "tagline": "Your syllabus. Your strategy. Your success."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
