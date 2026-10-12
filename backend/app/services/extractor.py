"""Document Text Extraction and Question Parsing Engine"""
import re
import fitz # PyMuPDF
import io
from PIL import Image
from typing import List, Dict, Any, Tuple
import uuid

# Check if pytesseract is usable
try:
    import pytesseract
    # Quick probe
    _OCR_AVAILABLE = True
except Exception:
    _OCR_AVAILABLE = False

class DocumentExtractor:
    """Extracts clean text and individual questions from PDFs, images, and text."""

    @classmethod
    def extract_from_pdf(cls, file_path: str) -> Tuple[str, int, List[str]]:
        """
        Extract text from PDF using PyMuPDF with scanned page detection and OCR fallback.
        Returns: (full_text, page_count, warnings)
        """
        doc = fitz.open(file_path)
        full_text_parts = []
        warnings = []
        page_count = len(doc)

        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text("text").strip()

            # If page text is very sparse (< 40 characters), check if page has images (scanned PDF)
            if len(text) < 40:
                image_list = page.get_images(full=True)
                if image_list or len(text) < 10:
                    ocr_text = cls._attempt_ocr_on_page(doc, page)
                    if ocr_text:
                        text = ocr_text
                    else:
                        warnings.append(
                            f"Page {page_num + 1} appears to be scanned or image-based. "
                            "Text was extracted from OCR/embedded metadata."
                        )

            full_text_parts.append(f"\n--- PAGE {page_num + 1} ---\n" + text)

        doc.close()
        full_text = "\n".join(full_text_parts)
        return full_text, page_count, warnings

    @classmethod
    def extract_from_image(cls, file_path: str) -> Tuple[str, int, List[str]]:
        """Extract text from JPG/PNG image file using OCR."""
        warnings = []
        try:
            image = Image.open(file_path)
            if _OCR_AVAILABLE:
                try:
                    text = pytesseract.image_to_string(image)
                    return text.strip(), 1, warnings
                except Exception as ocr_err:
                    warnings.append(f"Tesseract OCR failed: {str(ocr_err)}. Please install Tesseract binary or verify image clarity.")
            else:
                warnings.append("pytesseract is not configured on system. Raw image file received.")
            return "", 1, warnings
        except Exception as e:
            return "", 1, [f"Error opening image file: {str(e)}"]

    @classmethod
    def _attempt_ocr_on_page(cls, doc: fitz.Document, page: fitz.Page) -> str:
        """Render page pixmap and apply OCR."""
        if not _OCR_AVAILABLE:
            return ""
        try:
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception:
            return ""

    @classmethod
    def clean_text(cls, raw_text: str) -> str:
        """Clean broken lines, weird spacing, and artifacts while preserving layout."""
        # Replace multiple spaces with a single space
        text = re.sub(r'[ \t]+', ' ', raw_text)
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        # Remove consecutive blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @classmethod
    def parse_questions_from_text(cls, text: str) -> List[Dict[str, Any]]:
        """
        Robustly parses questions, subquestions, marks, and estimated types from exam text.
        """
        clean = cls.clean_text(text)
        lines = clean.split('\n')
        questions = []

        # Regex patterns for question boundaries
        q_start_pattern = re.compile(
            r'^(?:(?:Question|Q\.?)\s*(\d+)|(\d+)[\.\)]|\(?([0-9]+)\))\s*(?:\(([a-zA-Z0-9]+)\))?\s*(.*)',
            re.IGNORECASE
        )
        sub_q_pattern = re.compile(r'^\s*(?:\(([a-eA-E0-9ivx]+)\)|([a-eA-E])[\.\)])\s*(.*)')
        marks_pattern = re.compile(r'\[(\d+(?:\.\d+)?)\s*(?:marks?|m)?\]|\((\d+(?:\.\d+)?)\s*(?:marks?|m)\)|(?:Marks?|M):\s*(\d+(?:\.\d+)?)', re.IGNORECASE)

        current_q = None
        current_page = 1

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            # Check page marker
            page_match = re.match(r'^---\s*PAGE\s*(\d+)\s*---', line_str, re.IGNORECASE)
            if page_match:
                current_page = int(page_match.group(1))
                continue

            # Check main question pattern
            match = q_start_pattern.match(line_str)
            if match and len(line_str) > 3:
                # Flush previous question if valid
                if current_q and len(current_q["text"].strip()) > 10:
                    cls._finalize_question(current_q)
                    questions.append(current_q)

                q_num = match.group(1) or match.group(2) or match.group(3) or "1"
                sub_q = match.group(4) or ""
                rest_text = match.group(5) or ""

                current_q = {
                    "id": str(uuid.uuid4()),
                    "q_number": str(q_num),
                    "sub_q": sub_q,
                    "text": rest_text,
                    "marks": 5.0, # default until parsed
                    "page_number": current_page,
                    "lines": [rest_text] if rest_text else []
                }
                continue

            # Check sub-question pattern inside an active question
            sub_match = sub_q_pattern.match(line_str)
            if sub_match and current_q:
                # If current question already has substantive text, could be next subquestion
                sub_label = sub_match.group(1) or sub_match.group(2)
                sub_content = sub_match.group(3) or ""
                
                # If previous text is long, start sub-question
                if len(current_q["text"].strip()) > 25:
                    cls._finalize_question(current_q)
                    questions.append(current_q)
                    current_q = {
                        "id": str(uuid.uuid4()),
                        "q_number": current_q["q_number"],
                        "sub_q": sub_label,
                        "text": sub_content,
                        "marks": 5.0,
                        "page_number": current_page,
                        "lines": [sub_content] if sub_content else []
                    }
                    continue
                else:
                    current_q["sub_q"] = sub_label
                    current_q["text"] += " " + sub_content
                    current_q["lines"].append(sub_content)
                    continue

            # Append to current question text
            if current_q:
                current_q["lines"].append(line_str)
                current_q["text"] = " ".join(current_q["lines"])
            else:
                # If lines exist before first numbered question but contain question keywords
                if any(w in line_str.lower() for w in ["explain", "define", "what is", "calculate", "prove"]):
                    current_q = {
                        "id": str(uuid.uuid4()),
                        "q_number": "1",
                        "sub_q": "",
                        "text": line_str,
                        "marks": 5.0,
                        "page_number": current_page,
                        "lines": [line_str]
                    }

        # Flush final question
        if current_q and len(current_q["text"].strip()) > 8:
            cls._finalize_question(current_q)
            questions.append(current_q)

        # Fallback if no questions detected with numbering (e.g. paragraph paste)
        if not questions and len(clean) > 20:
            para_blocks = clean.split('\n\n')
            for idx, block in enumerate(para_blocks):
                b_str = block.strip()
                if len(b_str) > 15:
                    q_item = {
                        "id": str(uuid.uuid4()),
                        "q_number": str(idx + 1),
                        "sub_q": "",
                        "text": b_str,
                        "marks": 5.0,
                        "page_number": 1,
                        "lines": [b_str]
                    }
                    cls._finalize_question(q_item)
                    questions.append(q_item)

        return questions

    @classmethod
    def _finalize_question(cls, q: Dict[str, Any]):
        """Extract marks, determine question type and difficulty."""
        raw_text = q["text"]
        # Extract marks
        marks_match = re.search(r'\[(\d+(?:\.\d+)?)\s*(?:marks?|m)?\]|\((\d+(?:\.\d+)?)\s*(?:marks?|m)?\)|(?:Marks?|M):\s*(\d+(?:\.\d+)?)', raw_text, re.IGNORECASE)
        if marks_match:
            try:
                m_val = float(marks_match.group(1) or marks_match.group(2) or marks_match.group(3))
                if 0.5 <= m_val <= 100:
                    q["marks"] = m_val
                    # Clean trailing marks string from text
                    q["text"] = re.sub(r'\[\d+(?:\.\d+)?\s*(?:marks?|m)?\]|\(\d+(?:\.\d+)?\s*(?:marks?|m)?\)|(?:Marks?|M):\s*\d+(?:\.\d+)?', '', raw_text, flags=re.IGNORECASE).strip()
            except Exception:
                q["marks"] = 5.0
        else:
            # Default reasonable marks heuristic
            if len(raw_text) < 60:
                q["marks"] = 2.0
            elif len(raw_text) > 250:
                q["marks"] = 10.0
            else:
                q["marks"] = 5.0

        # Classify Question Type
        q["question_type"] = cls._classify_question_type(q["text"])

        # Estimate Difficulty
        q["difficulty"], q["difficulty_reason"] = cls._estimate_difficulty(q["text"], q["marks"], q["question_type"])

    @classmethod
    def _classify_question_type(cls, text: str) -> str:
        """
        Classifies question into: Theory, Numerical, Derivation, Programming, Diagram, Other
        """
        t = text.lower()

        # Numerical indicators
        numerical_keywords = ["calculate", "compute", "evaluate the value", "find the current", "find the speed", 
                              "numerical", "matrix multiplication", "solve the equation", "determine the probability", 
                              "optimal scheduling order", "calculate average waiting time", "turnaround time"]
        if any(k in t for k in numerical_keywords) or (re.search(r'\b\d+\s*[\+\-\*\/\^]\s*\d+\b', t) and "calculate" in t):
            return "Numerical"

        # Derivation indicators
        derivation_keywords = ["derive", "prove that", "show that", "deduce", "mathematical proof", "expression for", "obtain an expression"]
        if any(k in t for k in derivation_keywords):
            return "Derivation"

        # Programming indicators
        prog_keywords = ["write a program", "write a code", "write a c", "write python", "algorithm", "pseudocode", 
                         "time complexity", "implement a function", "data structure", "binary tree traversal"]
        if any(k in t for k in prog_keywords):
            return "Programming"

        # Diagram indicators
        diagram_keywords = ["draw", "sketch", "diagram", "schematic", "flowchart", "architecture diagram", "block diagram"]
        if any(k in t for k in diagram_keywords):
            return "Diagram"

        # Theory / Conceptual
        theory_keywords = ["explain", "define", "describe", "discuss", "what is", "differentiate", "compare and contrast", 
                           "state and explain", "short note on", "elaborate"]
        if any(k in t for k in theory_keywords):
            return "Theory"

        return "Theory" # default conceptual baseline

    @classmethod
    def _estimate_difficulty(cls, text: str, marks: float, q_type: str) -> Tuple[str, str]:
        """
        Explainable heuristic difficulty rating: Easy, Medium, Hard
        """
        t = text.lower()
        word_count = len(text.split())

        reasons = []

        # Complex reasoning terms
        hard_triggers = ["analyze", "design", "critically evaluate", "synthesize", "prove that", "derive the general", "deadlock avoidance algorithm", "np-complete"]
        easy_triggers = ["define", "what is", "state the principle", "list advantages", "mention two", "give examples"]

        score = 0
        if marks >= 10:
            score += 3
            reasons.append("High marks allocation (≥10M)")
        elif marks >= 6:
            score += 2
            reasons.append("Moderate marks allocation (6-9M)")
        else:
            score += 1
            reasons.append("Direct marks allocation (≤5M)")

        if any(k in t for k in hard_triggers):
            score += 2
            reasons.append("Requires advanced synthesis or analytical reasoning")
        elif any(k in t for k in easy_triggers) and marks <= 5:
            score -= 1
            reasons.append("Direct recall or definitional question")

        if q_type in ["Derivation", "Programming"]:
            score += 1
            reasons.append(f"Format requires step-by-step {q_type.lower()} execution")
        elif q_type == "Numerical" and word_count > 40:
            score += 1
            reasons.append("Multi-step computational problem with parameter analysis")

        if score >= 4:
            return "Hard", " • ".join(reasons)
        elif score <= 1:
            return "Easy", " • ".join(reasons)
        else:
            return "Medium", " • ".join(reasons)

    @classmethod
    def parse_syllabus_text(cls, text: str) -> List[Dict[str, Any]]:
        """
        Parses syllabus text into Units -> Topics -> Subtopics.
        Handles Unit 1, Unit I, Module 1, Chapter 1, etc.
        """
        clean = cls.clean_text(text)
        lines = clean.split('\n')
        units = []
        current_unit = None
        current_topic = None

        unit_pattern = re.compile(r'^(?:Unit|Module|Chapter)\s*[-:]?\s*([0-9IVXLCDM]+)[\s\-:]*(.*)', re.IGNORECASE)

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            u_match = unit_pattern.match(line_str)
            if u_match:
                u_num_str = u_match.group(1).upper()
                u_title = u_match.group(2).strip() or f"Unit {u_num_str}"
                # Convert Roman if needed
                u_num = cls._roman_to_int(u_num_str) if not u_num_str.isdigit() else int(u_num_str)
                current_unit = {
                    "id": str(uuid.uuid4()),
                    "unit_number": u_num,
                    "title": u_title,
                    "topics": []
                }
                units.append(current_unit)
                current_topic = None
                continue

            if current_unit:
                # Split topic by comma, semicolon, or bullets
                if line_str.startswith(('-', '*', '•')):
                    t_title = line_str.lstrip('-*• ').strip()
                elif ':' in line_str and len(line_str.split(':')[0]) < 35:
                    parts = line_str.split(':', 1)
                    t_title = parts[0].strip()
                    sub_parts = [s.strip() for s in parts[1].split(',') if s.strip()]
                    topic_obj = {
                        "id": str(uuid.uuid4()),
                        "title": t_title,
                        "subtopics": sub_parts,
                        "keywords": [t_title.lower()] + [s.lower() for s in sub_parts[:5]],
                        "student_mastery": 3
                    }
                    current_unit["topics"].append(topic_obj)
                    continue
                else:
                    t_title = line_str

                if len(t_title) > 3:
                    # Check if contains subtopics separated by commas
                    if ',' in t_title and len(t_title) > 40:
                        parts = [p.strip() for p in t_title.split(',') if p.strip()]
                        topic_obj = {
                            "id": str(uuid.uuid4()),
                            "title": parts[0],
                            "subtopics": parts[1:],
                            "keywords": [p.lower() for p in parts[:6]],
                            "student_mastery": 3
                        }
                        current_unit["topics"].append(topic_obj)
                    else:
                        topic_obj = {
                            "id": str(uuid.uuid4()),
                            "title": t_title,
                            "subtopics": [],
                            "keywords": [t_title.lower()],
                            "student_mastery": 3
                        }
                        current_unit["topics"].append(topic_obj)

        # Fallback if no explicit Unit pattern found
        if not units and len(clean) > 20:
            default_unit = {
                "id": str(uuid.uuid4()),
                "unit_number": 1,
                "title": "General Course Topics",
                "topics": []
            }
            raw_topics = [t.strip() for t in clean.split('\n') if len(t.strip()) > 3]
            for rt in raw_topics[:15]:
                default_unit["topics"].append({
                    "id": str(uuid.uuid4()),
                    "title": rt,
                    "subtopics": [],
                    "keywords": [rt.lower()],
                    "student_mastery": 3
                })
            units.append(default_unit)

        return units

    @staticmethod
    def _roman_to_int(s: str) -> int:
        roman_map = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}
        res = 0
        val = 0
        for char in reversed(s):
            curr = roman_map.get(char, 1)
            if curr >= val:
                res += curr
                val = curr
            else:
                res -= curr
        return res if res > 0 else 1
