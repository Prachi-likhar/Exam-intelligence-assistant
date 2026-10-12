"""Exam Intelligence and Statistical Analytics Engine"""
from typing import List, Dict, Any, Tuple
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class AnalyticsEngine:
    """Computes topic frequency, marks weightage, trends, question types, and duplicate detection."""

    @classmethod
    def compute_all_analytics(
        cls,
        topics: List[Dict[str, Any]],
        questions: List[Dict[str, Any]],
        documents: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Runs comprehensive analytics across all extracted questions, topics, and documents.
        """
        total_questions = len(questions)
        total_papers = len(documents)
        distinct_years = sorted(list(set(d["exam_year"] for d in documents if d.get("exam_year"))))

        total_known_marks = sum(q.get("marks", 0.0) for q in questions)
        if total_known_marks == 0:
            total_known_marks = 1.0 # prevent divide-by-zero

        # 1. Topic Frequency & Marks Weightage
        topic_stats = {}
        for t in topics:
            topic_stats[t["id"]] = {
                "topic_id": t["id"],
                "topic_title": t["title"],
                "unit_id": t.get("unit_id"),
                "unit_number": t.get("unit_number", 1),
                "unit_title": t.get("unit_title", ""),
                "student_mastery": t.get("student_mastery", 3),
                "matched_questions_count": 0,
                "distinct_papers": set(),
                "distinct_years": set(),
                "total_marks": 0.0,
                "year_marks": defaultdict(float),
                "question_types": defaultdict(int),
                "difficulties": defaultdict(int)
            }

        unmapped_count = 0
        unmapped_marks = 0.0

        for q in questions:
            t_id = q.get("matched_topic_id")
            doc_id = q.get("document_id")
            marks = float(q.get("marks", 5.0))
            doc = next((d for d in documents if d["id"] == doc_id), None)
            year = doc.get("exam_year") if doc else None

            if t_id and t_id in topic_stats:
                st = topic_stats[t_id]
                st["matched_questions_count"] += 1
                if doc_id:
                    st["distinct_papers"].add(doc_id)
                if year:
                    st["distinct_years"].add(year)
                    st["year_marks"][year] += marks
                st["total_marks"] += marks
                st["question_types"][q.get("question_type", "Theory")] += 1
                st["difficulties"][q.get("difficulty", "Medium")] += 1
            else:
                unmapped_count += 1
                unmapped_marks += marks

        # Finalize Topic Frequency List
        frequency_list = []
        for t_id, st in topic_stats.items():
            q_cnt = st["matched_questions_count"]
            tot_m = round(st["total_marks"], 1)
            weightage_pct = round((tot_m / total_known_marks) * 100, 2)
            avg_marks = round(tot_m / q_cnt, 2) if q_cnt > 0 else 0.0
            q_pct = round((q_cnt / total_questions) * 100, 2) if total_questions > 0 else 0.0
            papers_count = len(st["distinct_papers"])
            years_count = len(st["distinct_years"])

            # Year-wise Trend Analysis
            trend, trend_reason = cls._analyze_trend(st["year_marks"], distinct_years)

            frequency_list.append({
                "topic_id": t_id,
                "topic_title": st["topic_title"],
                "unit_id": st["unit_id"],
                "unit_number": st["unit_number"],
                "unit_title": st["unit_title"],
                "student_mastery": st["student_mastery"],
                "matched_questions_count": q_cnt,
                "distinct_papers_count": papers_count,
                "distinct_years_count": years_count,
                "total_marks": tot_m,
                "average_marks": avg_marks,
                "percentage_of_questions": q_pct,
                "marks_weightage_pct": weightage_pct,
                "trend": trend,
                "trend_reason": trend_reason,
                "year_marks": dict(st["year_marks"])
            })

        # Sort topics by weightage descending
        frequency_list.sort(key=lambda x: x["marks_weightage_pct"], reverse=True)

        # 2. Question Type Distribution
        q_types_count = defaultdict(int)
        q_types_marks = defaultdict(float)
        for q in questions:
            qt = q.get("question_type", "Theory")
            m = float(q.get("marks", 5.0))
            q_types_count[qt] += 1
            q_types_marks[qt] += m

        type_distribution = []
        for qt, cnt in q_types_count.items():
            pct = round((cnt / total_questions) * 100, 1) if total_questions > 0 else 0.0
            type_distribution.append({
                "type": qt,
                "count": cnt,
                "percentage": pct,
                "total_marks": round(q_types_marks[qt], 1)
            })
        type_distribution.sort(key=lambda x: x["count"], reverse=True)

        # 3. Difficulty Distribution
        diff_count = {"Easy": 0, "Medium": 0, "Hard": 0}
        diff_marks = {"Easy": 0.0, "Medium": 0.0, "Hard": 0.0}
        for q in questions:
            d = q.get("difficulty", "Medium")
            m = float(q.get("marks", 5.0))
            diff_count[d] = diff_count.get(d, 0) + 1
            diff_marks[d] = diff_marks.get(d, 0.0) + m

        difficulty_distribution = []
        for d in ["Easy", "Medium", "Hard"]:
            cnt = diff_count.get(d, 0)
            pct = round((cnt / total_questions) * 100, 1) if total_questions > 0 else 0.0
            difficulty_distribution.append({
                "difficulty": d,
                "count": cnt,
                "percentage": pct,
                "total_marks": round(diff_marks.get(d, 0.0), 1)
            })

        # 4. Repeated Questions Detection
        repeated_groups = cls.detect_repeated_questions(questions, documents)

        # 5. Data Limitations & Warning Flags
        warnings = []
        if len(distinct_years) < 2:
            warnings.append(
                "Fewer than 2 distinct exam years available. Year-wise trend analysis is preliminary and labeled as Insufficient Historical Data."
            )
        if unmapped_count > 0:
            warnings.append(
                f"{unmapped_count} question(s) ({unmapped_marks:.1f} marks) are unmapped or flagged uncertain. Review Question Bank to ensure 100% topic coverage."
            )

        return {
            "summary": {
                "total_papers": total_papers,
                "total_questions": total_questions,
                "total_topics": len(topics),
                "total_known_marks": round(total_known_marks, 1),
                "distinct_years": distinct_years,
                "unmapped_questions": unmapped_count,
                "unmapped_marks": round(unmapped_marks, 1),
                "repeated_questions_count": sum(len(g["questions"]) for g in repeated_groups)
            },
            "topic_frequencies": frequency_list,
            "type_distribution": type_distribution,
            "difficulty_distribution": difficulty_distribution,
            "repeated_questions": repeated_groups,
            "distinct_years": distinct_years,
            "warnings": warnings
        }

    @classmethod
    def _analyze_trend(cls, year_marks: Dict[int, float], all_years: List[int]) -> Tuple[str, str]:
        """Classify year-wise trend into Consistently Recurring, Gaining Prominence, Losing Prominence, Sporadic, or Insufficient Data."""
        if len(all_years) < 2:
            return "Insufficient Data", "Requires at least 2 distinct exam years for historical trend identification."

        active_years = sorted([y for y, m in year_marks.items() if m > 0])
        if not active_years:
            return "Unasked", "Has not appeared in analyzed papers."

        # Consistently recurring in all or almost all years
        if len(active_years) >= len(all_years) * 0.75:
            return "Consistently Recurring", f"Appeared in {len(active_years)} of {len(all_years)} analyzed exam years ({', '.join(map(str, active_years))})."

        # Check latest vs earlier years
        sorted_all = sorted(all_years)
        recent_half = sorted_all[len(sorted_all)//2:]
        earlier_half = sorted_all[:len(sorted_all)//2]

        recent_marks = sum(year_marks.get(y, 0) for y in recent_half)
        earlier_marks = sum(year_marks.get(y, 0) for y in earlier_half)

        if recent_marks > 0 and earlier_marks == 0:
            return "Gaining Prominence", f"Appeared in recent sessions ({', '.join(map(str, recent_half))}) after absence in earlier papers."
        elif earlier_marks > 0 and recent_marks == 0:
            return "Losing Prominence", f"Appeared in earlier years ({', '.join(map(str, earlier_half))}) but absent from latest papers."
        elif len(active_years) == 1:
            return "Sporadic / Infrequent", f"Single appearance in year {active_years[0]}."
        else:
            return "Periodic", f"Appears periodically across {len(active_years)} years."

    @classmethod
    def detect_repeated_questions(
        cls,
        questions: List[Dict[str, Any]],
        documents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detects exact repeats, near-duplicates, and same-concept questions across exam sessions.
        """
        if len(questions) < 2:
            return []

        doc_map = {d["id"]: d for d in documents}
        texts = [q.get("text", "").strip().lower() for q in questions]

        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english', min_df=1)
        try:
            tfidf_mat = vectorizer.fit_transform(texts)
            sim_matrix = cosine_similarity(tfidf_mat)
        except Exception:
            return []

        clusters = []
        visited = set()

        for i in range(len(questions)):
            if i in visited:
                continue

            current_group = [i]
            repetition_type = "Near Duplicate"

            for j in range(i + 1, len(questions)):
                if j in visited:
                    continue

                sim = sim_matrix[i, j]
                # Check exact or near repetition
                if texts[i] == texts[j] or sim >= 0.90:
                    current_group.append(j)
                    repetition_type = "Exact Duplicate" if texts[i] == texts[j] or sim >= 0.95 else "Near Duplicate"
                elif sim >= 0.72:
                    current_group.append(j)
                    if repetition_type != "Exact Duplicate":
                        repetition_type = "Near Duplicate"
                elif sim >= 0.58 and questions[i].get("matched_topic_id") == questions[j].get("matched_topic_id") and questions[i].get("matched_topic_id") is not None:
                    # Same topic and high conceptual overlap
                    current_group.append(j)
                    if repetition_type not in ["Exact Duplicate", "Near Duplicate"]:
                        repetition_type = "Same Concept"

            if len(current_group) > 1:
                for idx in current_group:
                    visited.add(idx)

                cluster_questions = []
                for idx in current_group:
                    q = questions[idx]
                    doc = doc_map.get(q.get("document_id"), {})
                    cluster_questions.append({
                        "id": q["id"],
                        "q_number": q.get("q_number"),
                        "sub_q": q.get("sub_q"),
                        "text": q["text"],
                        "marks": q.get("marks", 5.0),
                        "year": doc.get("exam_year"),
                        "exam_type": doc.get("exam_type", "Exam"),
                        "paper_filename": doc.get("filename", "Unknown Paper")
                    })

                clusters.append({
                    "cluster_id": f"repeat_{len(clusters)+1}",
                    "repetition_type": repetition_type,
                    "count": len(cluster_questions),
                    "questions": cluster_questions
                })

        return clusters
