<<<<<<< HEAD
# ExamIQ — AI-Powered Exam Intelligence Assistant

> *"Your syllabus. Your strategy. Your success."*

ExamIQ is a complete, modern, full-stack academic productivity platform designed for students preparing for MSTs, mid-semester tests, and university end-semester examinations. Instead of revising syllabus topics blindly or guessing what might appear, ExamIQ analyzes previous question papers, extracts individual questions, maps them to syllabus topics, computes marks weightage and frequency metrics, ranks topics using a transparent 5-factor scoring model, and builds a day-wise personalized revision schedule.

---

## 🌟 Key Capabilities & Implemented Features

1. **Document Ingestion & Text Extraction Pipeline**:
   - High-fidelity PDF text extraction using PyMuPDF (`fitz`).
   - Scanned page detection with automated OCR fallback via Tesseract / PIL.
   - Question boundary detection (e.g. `Q1.`, `Question 2:`, `1(a)`), marks extraction (`[5 marks]`, `(10)`, `[10M]`), and part splitting.
   - Fallback raw text paste mode for fast input without file dependencies.

2. **Syllabus Hierarchy & Topic Mapping Engine**:
   - Organizes courses into **Subject → Unit → Topic → Subtopics & Keywords**.
   - Deterministic matching baseline using n-gram TF-IDF cosine similarity (`scikit-learn`) and keyword matching.
   - Explainable confidence scoring:
     - **High** ($\ge 0.65$)
     - **Medium** ($0.40 - 0.65$)
     - **Uncertain / Flagged** ($< 0.40$) — never mislabeled as guaranteed classifications!
   - 1-click **"Remap Questions"** tool to recalculate mappings whenever syllabus keywords change.

3. **Exam Intelligence & Analytics Engine**:
   - **Topic Frequency**: Questions count, distinct papers count, distinct exam sessions, total marks, average marks per appearance, and percentage of analyzed questions.
   - **Marks Weightage**: Percentage of total marks attributed to individual topics.
   - **Year-Wise Trends**: Analyzes multi-year patterns (*Consistently Recurring*, *Gaining Prominence*, *Losing Prominence*, *Sporadic*). Flags insufficient data when $< 2$ distinct years exist.
   - **Question-Type Classification**: Theory, Numerical, Derivation, Programming, Diagram, and Other.
   - **Estimated Difficulty**: Explainable heuristics based on marks, multi-step calculation requirements, and problem depth.
   - **Repeated-Question Detection**: Identifies exact duplicates, near-duplicates, and same-concept questions across exam years.

4. **Study Priority Ranking Engine**:
   - Configurable 5-factor transparent scoring model:
     $$\text{Priority Score} = 0.30 \times \text{Frequency} + 0.30 \times \text{Weightage} + 0.15 \times \text{Trend} + 0.15 \times \text{Difficulty} + 0.10 \times \text{Weakness}$$
   - Independent recommendation confidence metric.
   - Natural language justifications generated from actual metrics.
   - Interactive **Score Breakdown** modal showing all 5 components.

5. **Personalized Revision Planner**:
   - Day-wise revision schedule tailored to your exam date, daily study hours, available weekdays, and preferred session length (45m, 60m, 90m, 120m).
   - Automatically attaches relevant past exam questions directly to each study session.
   - Session activity categorization (*Revise Concepts*, *Solve Numericals*, *Practice Derivations*, *Timed Practice*, *Review Mistakes*).
   - Interactive completion checkboxes, custom notes, and session rescheduling.
   - Identifies uncovered topics if student study capacity is insufficient.

6. **Reports & Exports**:
   - Instant CSV export for Prioritized Topics, Question Bank, and Revision Schedule.
   - Clean printable executive academic report canvas supporting direct PDF printing (`Ctrl+P` / `Print Report`).

7. **Isolated Demo Mode**:
   - Pre-seeded realistic course: **CS302 — Operating Systems & Systems Programming** with 4 past papers (2022–2025), 5 syllabus units, and 38 categorized questions.
   - 1-click sandbox load and reset without polluting custom student courses.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, PyMuPDF (`fitz`), pytesseract, Pillow, scikit-learn, aiosqlite, Pydantic v2.
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS, Lucide React, Recharts, React Router v7.
- **Storage**: Persistent local SQLite database (`backend/data/examiq.db`).

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+ or 3.12+ (or `uv`)
- Node.js 18+ and `npm`

### 1. Backend Setup

```bash
# From workspace root:
# 1. Create Python virtual environment
uv venv backend/.venv --python 3.12
# Or with standard python:
# python -m venv backend/.venv

# 2. Activate virtual environment
# Windows PowerShell:
backend/.venv/Scripts/Activate.ps1
# Linux/macOS:
# source backend/.venv/bin/activate

# 3. Install dependencies
uv pip install --python backend/.venv/Scripts/python.exe -r backend/requirements.txt
# Or: pip install -r backend/requirements.txt

# 4. Start the FastAPI development server
$env:PYTHONPATH="."
& "backend/.venv/Scripts/uvicorn.exe" backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at:
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```

The frontend will run on: `http://localhost:5173/`

---

## 🔍 OCR Setup (Optional for scanned image papers)

The application extracts embedded PDF text natively without extra binaries. For scanned pages and images:

- **Windows**:
  1. Download the Tesseract installer from [UB-Mannheim Tesseract](https://github.com/UB-Mannheim/tesseract/wiki).
  2. Install to `C:\Program Files\Tesseract-OCR`.
  3. Add `C:\Program Files\Tesseract-OCR` to your system `PATH`.
- **macOS**:
  ```bash
  brew install tesseract
  ```
- **Ubuntu/Debian**:
  ```bash
  sudo apt-get update && sudo apt-get install -y tesseract-ocr
  ```

*(If Tesseract is not installed, ExamIQ gracefully defaults to native PDF text parsing and notifies you via document warnings).*

---

## 🧪 Automated Testing

ExamIQ comes with automated unit tests for question parsing, syllabus matching, weightage calculations, priority ranking, and revision scheduling:

```bash
$env:PYTHONPATH="."
& "backend/.venv/Scripts/python.exe" -m pytest backend/tests/test_engine.py -v
```

To build and validate the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 📁 Project Structure

```
ExamIntelligence/
├── backend/
│   ├── app/
│   │   ├── config.py             # Global constants & data paths
│   │   ├── database.py           # SQLite connection and table schemas
│   │   ├── schemas.py            # Pydantic models for validation
│   │   ├── main.py               # FastAPI application & router mounting
│   │   ├── routes/
│   │   │   ├── courses.py        # Course CRUD & demo loader
│   │   │   ├── documents.py      # Upload & paste endpoints
│   │   │   ├── syllabus.py       # Syllabus unit & topic hierarchy
│   │   │   ├── questions.py      # Question bank & review
│   │   │   ├── analytics.py      # Frequency, weightage, trends
│   │   │   ├── priorities.py     # Priority scoring & weights
│   │   │   ├── planner.py        # Day-wise revision scheduler
│   │   │   └── export.py         # CSV & printable report endpoints
│   │   └── services/
│   │       ├── extractor.py      # PyMuPDF + OCR question parser
│   │       ├── syllabus_matcher.py # TF-IDF & keyword matcher
│   │       ├── analytics.py      # Statistical analytics & repeats
│   │       ├── priority_engine.py# 5-factor scoring formula
│   │       ├── planner.py        # Revision timetable engine
│   │       └── demo_data.py      # Pre-seeded CS302 OS dataset
│   ├── data/
│   │   ├── examiq.db             # Local SQLite database
│   │   └── uploads/              # Uploaded PDFs & images
│   ├── tests/
│   │   └── test_engine.py        # Pytest test suite
│   ├── requirements.txt          # Python dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Badge, Modal
│   │   │   └── layout/           # Sidebar, Navbar
│   │   ├── context/
│   │   │   └── CourseContext.tsx # Global course state & demo mode
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx # KPI cards, charts, top priorities
│   │   │   ├── UploadPage.tsx    # Drag-and-drop & paste form
│   │   │   ├── SyllabusPage.tsx  # Syllabus tree & mastery rating
│   │   │   ├── QuestionsPage.tsx # Question bank & manual corrections
│   │   │   ├── WeightagePage.tsx # Frequency & year trends table
│   │   │   ├── PrioritiesPage.tsx# Ranked cards & score breakdown
│   │   │   ├── PlannerPage.tsx   # Day-wise timetable & activities
│   │   │   ├── ReportsPage.tsx   # CSV exports & print view
│   │   │   └── SettingsPage.tsx  # Formula weights calibration
│   │   ├── services/
│   │   │   └── api.ts            # Typed REST API client
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # Tailwind CSS & theme tokens
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

---

## 🔒 Privacy & Limitations

- **Local Storage**: All documents, question texts, and revision sessions are stored strictly on your local machine in SQLite. No documents are uploaded to third-party cloud services.
- **Empirical Heuristics**: Priority scores and weightages are based on historical patterns in uploaded papers and do not constitute absolute guarantees of upcoming exam questions.
- **Scanned Documents**: The quality of question extraction depends on image resolution and document readability. Students can always edit, add, or correct questions manually in the Question Bank.
=======
# Exam-intelligence-assistant
An AI-powered exam preparation platform that helps students plan their studies, practice questions, clarify doubts, and prepare smarter for examinations.
>>>>>>> b9ad7b62498c8795be7d0dec34465e00b4a8c56c
