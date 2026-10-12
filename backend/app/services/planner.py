"""Personalized Revision Planner Engine"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import uuid

class RevisionPlannerEngine:
    """Generates day-wise constrained revision plans based on topic priority, difficulty, and exam deadline."""

    @classmethod
    def generate_plan(
        cls,
        course_id: str,
        prioritized_topics: List[Dict[str, Any]],
        questions: List[Dict[str, Any]],
        exam_date_str: str,
        daily_hours: float = 3.0,
        available_days: List[str] = None,
        session_duration_mins: int = 60
    ) -> Dict[str, Any]:
        if available_days is None:
            available_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

        # Parse dates
        today = datetime.now().date()
        try:
            exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        except Exception:
            # Fallback 14 days from now if invalid
            exam_date = today + timedelta(days=14)

        days_until_exam = (exam_date - today).days
        if days_until_exam <= 0:
            # Minimum 3 days planning window if exam is today or passed
            study_dates = [today + timedelta(days=i) for i in range(1, 4)]
        else:
            study_dates = [today + timedelta(days=i) for i in range(0, days_until_exam)]

        # Filter study dates by student's available weekdays
        weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        valid_dates = [d for d in study_dates if weekday_names[d.weekday()] in available_days]
        if not valid_dates:
            valid_dates = study_dates # fallback to all if filtered empty

        sessions_per_day = max(int(daily_hours * 60 / max(session_duration_mins, 30)), 1)
        total_available_session_slots = len(valid_dates) * sessions_per_day
        total_available_hours = (total_available_session_slots * session_duration_mins) / 60.0

        plan_id = str(uuid.uuid4())
        generated_sessions = []
        covered_topic_ids = set()
        uncovered_topics = []

        date_idx = 0
        current_day_session_count = 0

        # Sort topics: highest priority first
        sorted_topics = list(prioritized_topics)

        # Allocate high-priority topics
        for topic in sorted_topics:
            t_id = topic["topic_id"]
            suggested_mins = topic.get("suggested_revision_mins", 60)
            sessions_needed = max(int(round(suggested_mins / session_duration_mins)), 1)

            # Check if slots remain before final revision days
            for s_idx in range(sessions_needed):
                if date_idx >= len(valid_dates):
                    # Out of time slots
                    break

                target_date = valid_dates[date_idx]
                is_near_exam = (exam_date - target_date).days <= 2

                # Select best revision activity based on topic questions and timeline
                topic_qs = [q for q in questions if q.get("matched_topic_id") == t_id]
                activity = cls._choose_activity(topic, topic_qs, s_idx, is_near_exam)

                # Format relevant questions summary
                rel_questions = [
                    {
                        "id": q["id"],
                        "q_number": q.get("q_number"),
                        "text": q["text"][:120] + "..." if len(q["text"]) > 120 else q["text"],
                        "marks": q.get("marks", 5.0),
                        "type": q.get("question_type", "Theory")
                    }
                    for q in topic_qs[:3]
                ]

                session_obj = {
                    "id": str(uuid.uuid4()),
                    "plan_id": plan_id,
                    "course_id": course_id,
                    "date": target_date.strftime("%Y-%m-%d"),
                    "topic_id": t_id,
                    "topic_title": topic["topic_title"],
                    "unit_number": topic.get("unit_number", 1),
                    "unit_title": topic.get("unit_title", ""),
                    "duration_mins": session_duration_mins,
                    "activity_type": activity,
                    "completed": 0,
                    "notes": f"Focus on {topic['difficulty_estimate']} questions from Unit {topic.get('unit_number', 1)}.",
                    "order_index": len(generated_sessions),
                    "relevant_questions": rel_questions
                }
                generated_sessions.append(session_obj)
                covered_topic_ids.add(t_id)

                current_day_session_count += 1
                if current_day_session_count >= sessions_per_day:
                    current_day_session_count = 0
                    date_idx += 1

            if t_id not in covered_topic_ids:
                uncovered_topics.append({
                    "topic_id": t_id,
                    "topic_title": topic["topic_title"],
                    "priority_score": topic["priority_score"],
                    "unit_number": topic.get("unit_number", 1),
                    "reason": "Insufficient daily study hours before exam date to schedule dedicated session."
                })

        # Add a final mock/review session if date_idx still has space on the day before exam
        if valid_dates and (date_idx < len(valid_dates)):
            final_date = valid_dates[-1]
            generated_sessions.append({
                "id": str(uuid.uuid4()),
                "plan_id": plan_id,
                "course_id": course_id,
                "date": final_date.strftime("%Y-%m-%d"),
                "topic_id": sorted_topics[0]["topic_id"] if sorted_topics else None,
                "topic_title": "Comprehensive Mock & Formula Sheet Review",
                "unit_number": 0,
                "unit_title": "All Units",
                "duration_mins": session_duration_mins,
                "activity_type": "timed_practice",
                "completed": 0,
                "notes": "Timed 1-hour practice with repeated questions and quick mistake review.",
                "order_index": len(generated_sessions),
                "relevant_questions": []
            })

        total_planned_hours = round(len(generated_sessions) * session_duration_mins / 60.0, 1)
        total_topics = len(sorted_topics) if sorted_topics else 1
        coverage_pct = round((len(covered_topic_ids) / total_topics) * 100, 1)

        return {
            "id": plan_id,
            "course_id": course_id,
            "exam_date": exam_date_str,
            "daily_hours": daily_hours,
            "available_days": available_days,
            "session_duration_mins": session_duration_mins,
            "total_planned_hours": total_planned_hours,
            "completed_hours": 0.0,
            "total_sessions": len(generated_sessions),
            "completed_sessions": 0,
            "coverage_percentage": coverage_pct,
            "uncovered_topics": uncovered_topics,
            "sessions": generated_sessions
        }

    @staticmethod
    def _choose_activity(topic: Dict[str, Any], topic_qs: List[Dict[str, Any]], session_idx: int, is_near_exam: bool) -> str:
        if is_near_exam:
            return "timed_practice" if session_idx % 2 == 0 else "reviewing_mistakes"

        mastery = topic.get("student_mastery", 3)
        if session_idx == 0 and mastery <= 2:
            return "revising_concepts"

        # Check question types for this topic
        types = [q.get("question_type") for q in topic_qs]
        if "Numerical" in types:
            return "solving_numericals"
        elif "Derivation" in types:
            return "practicing_derivations"
        elif "Programming" in types:
            return "solving_numericals"

        activities = ["revising_concepts", "reviewing_mistakes", "timed_practice"]
        return activities[session_idx % len(activities)]
