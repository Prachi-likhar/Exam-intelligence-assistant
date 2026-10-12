"""Study Priority Ranking Engine with Configurable Heuristic Formula and Explainable Breakdown"""
from typing import List, Dict, Any, Tuple, Optional
from backend.app.config import DEFAULT_WEIGHTS

class PriorityEngine:
    """Calculates prioritized study list, score components, and natural language justifications."""

    @classmethod
    def rank_study_priorities(
        cls,
        topic_frequencies: List[Dict[str, Any]],
        questions: List[Dict[str, Any]],
        documents: List[Dict[str, Any]],
        weights_config: Dict[str, float] = None
    ) -> List[Dict[str, Any]]:
        weights = weights_config or DEFAULT_WEIGHTS
        total_papers = max(len(documents), 1)
        total_questions = max(len(questions), 1)

        # Max values for normalization
        max_questions_count = max([t["matched_questions_count"] for t in topic_frequencies] or [1])
        max_weightage_pct = max([t["marks_weightage_pct"] for t in topic_frequencies] or [1.0])
        if max_questions_count == 0:
            max_questions_count = 1
        if max_weightage_pct == 0:
            max_weightage_pct = 1.0

        ranked_items = []

        # Check overall confidence baseline from documents and unmapped questions
        overall_confidence, conf_caveat = cls._determine_overall_confidence(documents, questions)

        for item in topic_frequencies:
            t_id = item["topic_id"]
            q_cnt = item["matched_questions_count"]
            weight_pct = item["marks_weightage_pct"]
            papers_cnt = item["distinct_papers_count"]
            years_cnt = item["distinct_years_count"]
            trend = item["trend"]
            mastery = item.get("student_mastery", 3)

            # 1. Frequency Score (0-100)
            # Combines paper presence ratio and question count ratio
            paper_ratio = (papers_cnt / total_papers) * 100
            q_ratio = (q_cnt / max_questions_count) * 100
            freq_score = min(max((paper_ratio * 0.6 + q_ratio * 0.4), 0.0), 100.0)

            # 2. Weightage Score (0-100)
            weight_score = min(max((weight_pct / max_weightage_pct) * 100.0, 0.0), 100.0)

            # 3. Year-wise Trend Score (0-100)
            trend_scores = {
                "Consistently Recurring": 95.0,
                "Gaining Prominence": 90.0,
                "Periodic": 65.0,
                "Sporadic / Infrequent": 40.0,
                "Losing Prominence": 30.0,
                "Insufficient Data": 50.0, # neutral, does not penalize or artificially inflate
                "Unasked": 10.0
            }
            trend_score = trend_scores.get(trend, 50.0)

            # 4. Difficulty Score (0-100)
            # Derive topic's dominant difficulty
            topic_questions = [q for q in questions if q.get("matched_topic_id") == t_id]
            diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}
            for q in topic_questions:
                d = q.get("difficulty", "Medium")
                diff_counts[d] = diff_counts.get(d, 0) + 1

            if diff_counts["Hard"] > diff_counts["Medium"] and diff_counts["Hard"] > diff_counts["Easy"]:
                dominant_diff = "Hard"
                diff_score = 90.0
            elif diff_counts["Easy"] > diff_counts["Medium"]:
                dominant_diff = "Easy"
                diff_score = 35.0
            else:
                dominant_diff = "Medium"
                diff_score = 65.0

            # 5. Student Weakness Score (0-100)
            # Mastery 1 -> Weakness 100
            # Mastery 2 -> Weakness 75
            # Mastery 3 -> Weakness 50 (neutral)
            # Mastery 4 -> Weakness 25
            # Mastery 5 -> Weakness 0
            weakness_score = (5 - mastery) * 25.0

            # Combined Priority Score
            w_freq = weights.get("frequency", 0.30)
            w_weight = weights.get("weightage", 0.30)
            w_trend = weights.get("trend", 0.15)
            w_diff = weights.get("difficulty", 0.15)
            w_weak = weights.get("weakness", 0.10)

            total_weight = w_freq + w_weight + w_trend + w_diff + w_weak
            if total_weight <= 0:
                total_weight = 1.0

            raw_priority = (
                (freq_score * w_freq) +
                (weight_score * w_weight) +
                (trend_score * w_trend) +
                (diff_score * w_diff) +
                (weakness_score * w_weak)
            ) / total_weight

            final_priority = round(min(max(raw_priority, 0.0), 100.0), 1)

            # Recommendation Confidence for this specific topic
            topic_conf = cls._calculate_topic_confidence(overall_confidence, topic_questions, q_cnt, papers_cnt)

            # Suggested Revision Time in minutes (45 min - 240 min)
            base_mins = 45
            priority_factor = (final_priority / 100.0) * 120 # up to 120 mins
            diff_factor = 45 if dominant_diff == "Hard" else (20 if dominant_diff == "Medium" else 0)
            mastery_factor = (5 - mastery) * 15 # up to 60 mins
            suggested_mins = int(round((base_mins + priority_factor + diff_factor + mastery_factor) / 15) * 15)

            # Natural Language Explanation
            explanation = cls._generate_explanation(
                final_priority,
                item,
                papers_cnt,
                total_papers,
                weight_pct,
                trend,
                dominant_diff,
                mastery,
                topic_conf,
                conf_caveat
            )

            ranked_items.append({
                "topic_id": t_id,
                "topic_title": item["topic_title"],
                "unit_id": item["unit_id"],
                "unit_number": item["unit_number"],
                "unit_title": item["unit_title"],
                "priority_score": final_priority,
                "component_scores": {
                    "historical_frequency": round(freq_score, 1),
                    "marks_weightage": round(weight_score, 1),
                    "year_trend": round(trend_score, 1),
                    "estimated_difficulty": round(diff_score, 1),
                    "student_weakness": round(weakness_score, 1)
                },
                "frequency_count": q_cnt,
                "papers_count": papers_cnt,
                "distinct_years_count": years_cnt,
                "marks_weightage_pct": weight_pct,
                "total_marks": item["total_marks"],
                "average_marks": item["average_marks"],
                "year_trend": trend,
                "year_breakdown": item["year_marks"],
                "difficulty_estimate": dominant_diff,
                "student_mastery": mastery,
                "suggested_revision_mins": suggested_mins,
                "recommendation_confidence": topic_conf,
                "explanation": explanation
            })

        # Rank items by priority score descending
        ranked_items.sort(key=lambda x: x["priority_score"], reverse=True)
        for idx, item in enumerate(ranked_items):
            item["rank"] = idx + 1

        return ranked_items

    @classmethod
    def _determine_overall_confidence(
        cls,
        documents: List[Dict[str, Any]],
        questions: List[Dict[str, Any]]
    ) -> Tuple[str, Optional[str]]:
        """Evaluates document quantity and extraction fidelity."""
        doc_count = len(documents)
        has_warnings = any(len(d.get("warnings_json", "[]")) > 4 for d in documents)
        uncertain_count = sum(1 for q in questions if q.get("mapping_status") == "uncertain")

        if doc_count >= 3 and not has_warnings and uncertain_count == 0:
            return "High", None
        elif doc_count >= 2 and uncertain_count <= 2:
            return "Medium", "Historical sample spans 2 papers with minor unmapped elements."
        else:
            caveats = []
            if doc_count < 2:
                caveats.append("only 1 past paper uploaded")
            if uncertain_count > 0:
                caveats.append(f"{uncertain_count} unverified topic mappings")
            return "Low", f"Confidence is limited due to {', '.join(caveats)}."

    @classmethod
    def _calculate_topic_confidence(
        cls,
        base_confidence: str,
        topic_questions: List[Dict[str, Any]],
        q_count: int,
        papers_count: int
    ) -> str:
        if not topic_questions or q_count == 0:
            return "Medium" if base_confidence != "Low" else "Low"

        avg_q_conf = sum(q.get("confidence_score", 0.5) for q in topic_questions) / len(topic_questions)
        if avg_q_conf < 0.45:
            return "Low"

        if papers_count >= 2 and avg_q_conf >= 0.65 and base_confidence == "High":
            return "High"
        elif papers_count >= 1 and avg_q_conf >= 0.50:
            return "Medium"
        return "Low"

    @classmethod
    def _generate_explanation(
        cls,
        priority_score: float,
        item: Dict[str, Any],
        papers_cnt: int,
        total_papers: int,
        weight_pct: float,
        trend: str,
        diff: str,
        mastery: int,
        confidence: str,
        conf_caveat: Optional[str]
    ) -> str:
        priority_tier = "High" if priority_score >= 70 else ("Medium" if priority_score >= 45 else "Low")
        mastery_labels = {1: "very low", 2: "low", 3: "moderate", 4: "good", 5: "mastered"}
        mastery_text = mastery_labels.get(mastery, "moderate")

        reasons = []
        if papers_cnt > 0:
            reasons.append(f"appeared in {papers_cnt} of {total_papers} analyzed papers ({weight_pct}% of total marks)")
        else:
            reasons.append("has not appeared in past papers but remains on syllabus")

        if trend in ["Consistently Recurring", "Gaining Prominence"]:
            reasons.append(f"shows a {trend.lower()} pattern")

        if diff == "Hard":
            reasons.append("features complex problem formulations requiring in-depth preparation")

        if mastery <= 2:
            reasons.append(f"your self-reported mastery is {mastery_text}")

        base_explanation = f"This topic is {priority_tier.lower()} priority because it " + ", and ".join(reasons) + "."

        conf_explanation = f" Recommendation confidence is {confidence.lower()}"
        if conf_caveat:
            conf_explanation += f" ({conf_caveat})."
        else:
            conf_explanation += " based on multiple confirmed question sightings."

        return base_explanation + conf_explanation
