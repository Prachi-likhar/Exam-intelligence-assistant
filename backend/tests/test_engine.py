"""Automated Test Suite for ExamIQ Analysis, Parser, and Planner Engines"""
import pytest
from backend.app.services.extractor import DocumentExtractor
from backend.app.services.syllabus_matcher import SyllabusMatcher
from backend.app.services.analytics import AnalyticsEngine
from backend.app.services.priority_engine import PriorityEngine
from backend.app.services.planner import RevisionPlannerEngine

def test_question_parsing():
    sample_text = """
    Department of Computer Science
    End Semester Examination - November 2024
    
    Q1. (a) Explain the difference between user mode and kernel mode. [5 marks]
    Q1. (b) What is a Process Control Block? Enumerate its fields. [5 marks]
    
    Question 2:
    Consider 4 processes with arrival times (0, 1, 2, 3) and bursts (8, 4, 9, 5).
    Calculate average turnaround time and waiting time using Round Robin (Q=3). [10 marks]
    
    Question 3:
    Prove that Peterson's algorithm guarantees mutual exclusion, progress, and bounded waiting. (10 marks)
    """

    questions = DocumentExtractor.parse_questions_from_text(sample_text)
    assert len(questions) >= 3

    # Check question types
    assert questions[0]["marks"] == 5.0
    assert questions[0]["question_type"] == "Theory"

    # Numerical check
    num_q = next(q for q in questions if "round robin" in q["text"].lower() or "calculate" in q["text"].lower())
    assert num_q["question_type"] == "Numerical"
    assert num_q["marks"] == 10.0
    assert num_q["difficulty"] in ["Medium", "Hard"]

    # Derivation check
    deriv_q = next(q for q in questions if "prove that" in q["text"].lower())
    assert deriv_q["question_type"] == "Derivation"
    assert deriv_q["marks"] == 10.0

def test_syllabus_matching():
    sample_units = [
        {
            "id": "u1",
            "unit_number": 1,
            "title": "Process Management",
            "topics": [
                {
                    "id": "t1",
                    "title": "CPU Scheduling Algorithms",
                    "subtopics": ["Round Robin", "SJF", "Turnaround time"],
                    "keywords": ["cpu scheduling", "round robin", "gantt chart"],
                    "student_mastery": 3
                },
                {
                    "id": "t2",
                    "title": "Deadlock Avoidance & Banker's Algorithm",
                    "subtopics": ["Resource Allocation Graph", "Safety algorithm"],
                    "keywords": ["deadlock", "banker's algorithm", "safe state"],
                    "student_mastery": 2
                }
            ]
        }
    ]

    matcher = SyllabusMatcher(sample_units)

    # Test high confidence match
    q1 = "Given allocation and maximum matrix, run Banker's Algorithm to check safe sequence."
    res1 = matcher.match_question(q1)
    assert res1["matched_topic_id"] == "t2"
    assert res1["confidence_score"] >= 0.50
    assert "Banker's Algorithm" in res1["mapping_explanation"]

    # Test numerical CPU scheduling question
    q2 = "Calculate the average waiting time for Round Robin scheduling with time quantum 4."
    res2 = matcher.match_question(q2)
    assert res2["matched_topic_id"] == "t1"
    assert res2["confidence_score"] >= 0.50

def test_analytics_and_priority_ranking():
    topics = [
        {"id": "t1", "title": "CPU Scheduling", "unit_id": "u1", "unit_number": 1, "unit_title": "Process", "student_mastery": 2},
        {"id": "t2", "title": "File Systems", "unit_id": "u2", "unit_number": 2, "unit_title": "Storage", "student_mastery": 4}
    ]
    documents = [
        {"id": "d1", "exam_year": 2023, "filename": "2023.pdf"},
        {"id": "d2", "exam_year": 2024, "filename": "2024.pdf"}
    ]
    questions = [
        {"id": "q1", "document_id": "d1", "marks": 10.0, "question_type": "Numerical", "difficulty": "Hard", "matched_topic_id": "t1"},
        {"id": "q2", "document_id": "d2", "marks": 10.0, "question_type": "Numerical", "difficulty": "Hard", "matched_topic_id": "t1"},
        {"id": "q3", "document_id": "d1", "marks": 5.0, "question_type": "Theory", "difficulty": "Easy", "matched_topic_id": "t2"}
    ]

    analytics = AnalyticsEngine.compute_all_analytics(topics, questions, documents)
    assert len(analytics["topic_frequencies"]) == 2

    # Weightage check
    # Total marks = 25. t1 = 20 (80%), t2 = 5 (20%)
    t1_freq = next(t for t in analytics["topic_frequencies"] if t["topic_id"] == "t1")
    assert t1_freq["marks_weightage_pct"] == 80.0
    assert t1_freq["distinct_papers_count"] == 2
    assert t1_freq["trend"] == "Consistently Recurring"

    # Priority Ranking check
    priorities = PriorityEngine.rank_study_priorities(analytics["topic_frequencies"], questions, documents)
    assert len(priorities) == 2
    assert priorities[0]["topic_id"] == "t1" # t1 must be top rank!
    assert priorities[0]["priority_score"] > priorities[1]["priority_score"]
    assert "component_scores" in priorities[0]

def test_revision_planner():
    prioritized_topics = [
        {
            "topic_id": "t1",
            "topic_title": "CPU Scheduling",
            "unit_number": 1,
            "unit_title": "Process",
            "priority_score": 92.0,
            "suggested_revision_mins": 90,
            "difficulty_estimate": "Hard",
            "student_mastery": 2
        },
        {
            "topic_id": "t2",
            "topic_title": "File Allocation",
            "unit_number": 2,
            "unit_title": "Storage",
            "priority_score": 50.0,
            "suggested_revision_mins": 60,
            "difficulty_estimate": "Easy",
            "student_mastery": 4
        }
    ]
    questions = [
        {"id": "q1", "matched_topic_id": "t1", "q_number": "1", "text": "Calculate turnaround time", "marks": 10.0, "question_type": "Numerical"}
    ]

    plan = RevisionPlannerEngine.generate_plan(
        course_id="c1",
        prioritized_topics=prioritized_topics,
        questions=questions,
        exam_date_str="2026-11-20",
        daily_hours=2.0,
        available_days=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        session_duration_mins=60
    )

    assert plan["total_sessions"] > 0
    assert plan["total_planned_hours"] > 0.0
    assert plan["coverage_percentage"] > 0.0
