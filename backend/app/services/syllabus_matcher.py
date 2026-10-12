"""Syllabus Matching Engine with Keyword and TF-IDF Cosine Similarity"""
import re
from typing import List, Dict, Any, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class SyllabusMatcher:
    """
    Maps questions to syllabus topics with explainable confidence scoring.
    """

    def __init__(self, units_with_topics: List[Dict[str, Any]]):
        self.units = units_with_topics
        self.topics = []
        for unit in self.units:
            unit_id = unit["id"]
            unit_num = unit.get("unit_number", 1)
            unit_title = unit.get("title", f"Unit {unit_num}")
            for t in unit.get("topics", []):
                self.topics.append({
                    "id": t["id"],
                    "unit_id": unit_id,
                    "unit_number": unit_num,
                    "unit_title": unit_title,
                    "title": t["title"],
                    "subtopics": t.get("subtopics", []),
                    "keywords": t.get("keywords", []),
                    "text_corpus": self._build_topic_corpus(t, unit_title)
                })

        # Precompute TF-IDF vectorizer if topics exist
        if self.topics:
            self.corpus = [t["text_corpus"] for t in self.topics]
            self.vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                stop_words='english',
                lowercase=True,
                token_pattern=r'(?u)\b\w+\b'
            )
            try:
                self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)
            except Exception:
                self.vectorizer = None
                self.tfidf_matrix = None
        else:
            self.vectorizer = None
            self.tfidf_matrix = None

    def _build_topic_corpus(self, topic: Dict[str, Any], unit_title: str) -> str:
        parts = [topic["title"], topic["title"], unit_title] # weigh topic title heavily
        parts.extend(topic.get("subtopics", []))
        parts.extend(topic.get("keywords", []))
        return " ".join(parts).lower()

    def match_question(self, question_text: str) -> Dict[str, Any]:
        """
        Matches a single question to the best syllabus topic.
        Returns matched topic info, confidence score, status ('auto', 'uncertain'), and explanation.
        """
        if not self.topics:
            return {
                "matched_topic_id": None,
                "confidence_score": 0.0,
                "mapping_status": "uncertain",
                "mapping_explanation": "No syllabus topics available for matching."
            }

        q_clean = question_text.lower()
        q_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', q_clean))

        best_topic = None
        best_score = -1.0
        best_matched_terms = []
        best_tfidf_score = 0.0

        # Calculate TF-IDF similarity vector if available
        tfidf_scores = [0.0] * len(self.topics)
        if self.vectorizer is not None and self.tfidf_matrix is not None:
            try:
                q_vec = self.vectorizer.transform([q_clean])
                sims = cosine_similarity(q_vec, self.tfidf_matrix)[0]
                tfidf_scores = sims.tolist()
            except Exception:
                pass

        # Evaluate combined keyword overlap and TF-IDF similarity
        for idx, t in enumerate(self.topics):
            topic_matched_terms = []
            
            # 1. Exact phrase / key term matching
            t_title_lower = t["title"].lower()
            if t_title_lower in q_clean:
                topic_matched_terms.append(t["title"])

            # Check subtopics
            for sub in t.get("subtopics", []):
                sub_low = sub.lower()
                if sub_low in q_clean and sub_low not in topic_matched_terms:
                    topic_matched_terms.append(sub)

            # Check keywords
            for kw in t.get("keywords", []):
                kw_low = kw.lower()
                if kw_low in q_clean and kw_low not in topic_matched_terms:
                    topic_matched_terms.append(kw)

            # Check word overlap
            corpus_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', t["text_corpus"]))
            common_words = q_words.intersection(corpus_words)
            overlap_ratio = len(common_words) / max(len(q_words), 1)

            # Combined score
            tfidf_sim = tfidf_scores[idx] if idx < len(tfidf_scores) else 0.0
            keyword_bonus = min(len(topic_matched_terms) * 0.35, 0.80)
            
            if topic_matched_terms:
                combined_score = (0.45 * tfidf_sim) + (0.40 * keyword_bonus) + (0.15 * overlap_ratio)
            else:
                combined_score = (0.65 * tfidf_sim) + (0.35 * overlap_ratio)

            if combined_score > best_score:
                best_score = combined_score
                best_topic = t
                best_matched_terms = topic_matched_terms or list(common_words)[:4]
                best_tfidf_score = tfidf_sim

        # Normalize confidence score between 0.0 and 1.0
        final_confidence = min(max(best_score, 0.0), 1.0)

        # Confidence categorization
        if final_confidence >= 0.60:
            status = "auto"
            confidence_level = "High"
        elif final_confidence >= 0.35:
            status = "auto"
            confidence_level = "Medium"
        else:
            status = "uncertain"
            confidence_level = "Uncertain"

        # Generate human-readable explanation
        if best_topic:
            terms_str = f"terms: {', '.join(repr(x) for x in best_matched_terms[:3])}" if best_matched_terms else "semantic similarity"
            if status == "uncertain":
                explanation = (
                    f"Low confidence ({final_confidence:.2f}) match to '{best_topic['title']}' in Unit {best_topic['unit_number']}. "
                    f"Matched on {terms_str}. Please review and verify topic mapping."
                )
            else:
                explanation = (
                    f"{confidence_level} confidence ({final_confidence:.2f}) match to '{best_topic['title']}' in Unit {best_topic['unit_number']} "
                    f"({best_topic['unit_title']}) via {terms_str} (similarity {best_tfidf_score:.2f})."
                )

            return {
                "matched_topic_id": best_topic["id"],
                "matched_topic_title": best_topic["title"],
                "matched_unit_number": best_topic["unit_number"],
                "matched_unit_title": best_topic["unit_title"],
                "confidence_score": round(final_confidence, 3),
                "mapping_status": status,
                "mapping_explanation": explanation
            }

        return {
            "matched_topic_id": None,
            "confidence_score": 0.0,
            "mapping_status": "uncertain",
            "mapping_explanation": "Unable to find a syllabus topic match."
        }
