"""Pre-seeded High Quality Realistic Demo Dataset for ExamIQ

Subject: CS302 - Operating Systems & Systems Programming
Includes 4 Exam Papers (2022-2025), 5 Syllabus Units, 38 Categorized Questions,
Real Numerical & Derivation Problems, and Repeated Questions.
"""
import uuid
import json
from datetime import datetime, timedelta
import aiosqlite

DEMO_COURSE_ID = "demo-cs302-os"

async def seed_demo_data(db: aiosqlite.Connection) -> str:
    """Seeds or refreshes the isolated demo course in SQLite."""
    # Explicitly clear any existing demo records to prevent primary key conflicts
    await db.execute("DELETE FROM questions WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM revision_sessions WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM revision_plans WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM syllabus_topics WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM syllabus_units WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM documents WHERE course_id = ?;", (DEMO_COURSE_ID,))
    await db.execute("DELETE FROM courses WHERE id = ?;", (DEMO_COURSE_ID,))

    exam_date = (datetime.now().date() + timedelta(days=21)).strftime("%Y-%m-%d")

    # 1. Insert Course
    await db.execute("""
        INSERT OR REPLACE INTO courses (id, code, name, exam_date, semester, academic_year, is_demo, settings_json)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?);
    """, (
        DEMO_COURSE_ID,
        "CS302",
        "Operating Systems & Systems Programming",
        exam_date,
        "5th Semester",
        "2025-2026",
        json.dumps({
            "target_gpa": "A+",
            "weights": {"frequency": 0.30, "weightage": 0.30, "trend": 0.15, "difficulty": 0.15, "weakness": 0.10}
        })
    ))

    # 2. Insert Syllabus Units & Topics
    units_data = [
        {
            "num": 1,
            "title": "System Structures & OS Overview",
            "topics": [
                {
                    "title": "OS Services & System Calls",
                    "subtopics": ["fork() vs exec()", "System call execution flow", "User mode vs Kernel mode"],
                    "keywords": ["system call", "fork", "exec", "kernel mode", "user mode", "trap", "interrupt"],
                    "mastery": 4
                },
                {
                    "title": "Monolithic vs Microkernel Architecture",
                    "subtopics": ["Microkernel design advantages", "Modular kernels", "Mach & Linux comparison"],
                    "keywords": ["microkernel", "monolithic", "kernel architecture", "layered approach"],
                    "mastery": 3
                }
            ]
        },
        {
            "num": 2,
            "title": "Process Management & CPU Scheduling",
            "topics": [
                {
                    "title": "Process States & Context Switching",
                    "subtopics": ["PCB fields", "Context switch overhead", "Process state transitions"],
                    "keywords": ["pcb", "context switch", "process states", "ready queue", "process control block"],
                    "mastery": 4
                },
                {
                    "title": "CPU Scheduling Algorithms",
                    "subtopics": ["FCFS scheduling", "SJF & SRTF", "Round Robin with time quantum", "Priority scheduling"],
                    "keywords": ["cpu scheduling", "round robin", "sjf", "srtf", "turnaround time", "waiting time", "gantt chart"],
                    "mastery": 2 # weak
                },
                {
                    "title": "Inter-Process Communication & Threads",
                    "subtopics": ["Message passing vs Shared memory", "User vs Kernel threads", "POSIX threads"],
                    "keywords": ["ipc", "shared memory", "message passing", "threads", "pthreads"],
                    "mastery": 3
                }
            ]
        },
        {
            "num": 3,
            "title": "Process Synchronization & Deadlocks",
            "topics": [
                {
                    "title": "Critical Section Problem & Semaphores",
                    "subtopics": ["Peterson's solution", "Binary & Counting semaphores", "Mutex locks", "TestAndSet"],
                    "keywords": ["critical section", "semaphore", "mutex", "peterson", "race condition"],
                    "mastery": 2 # weak
                },
                {
                    "title": "Classical Synchronization Problems",
                    "subtopics": ["Producer-Consumer bounded buffer", "Dining Philosophers", "Readers-Writers problem"],
                    "keywords": ["producer consumer", "dining philosophers", "readers writers", "synchronization problem"],
                    "mastery": 2 # weak
                },
                {
                    "title": "Deadlock Avoidance & Banker's Algorithm",
                    "subtopics": ["Resource Allocation Graph", "Deadlock 4 conditions", "Banker's safety algorithm", "Resource-request algorithm"],
                    "keywords": ["deadlock", "banker's algorithm", "rag", "safety algorithm", "resource allocation graph", "circular wait"],
                    "mastery": 1 # very weak
                }
            ]
        },
        {
            "num": 4,
            "title": "Memory Management & Virtual Memory",
            "topics": [
                {
                    "title": "Paging & Segmentation Architecture",
                    "subtopics": ["Page table lookup", "TLB hit ratio & EAT", "Internal vs External fragmentation", "Segmentation with paging"],
                    "keywords": ["paging", "segmentation", "tlb", "effective access time", "page table", "fragmentation"],
                    "mastery": 3
                },
                {
                    "title": "Page Replacement Algorithms",
                    "subtopics": ["FIFO & Belady's Anomaly", "LRU stack implementation", "Optimal (OPT) replacement", "Page fault calculation"],
                    "keywords": ["page replacement", "lru", "fifo", "belady anomaly", "optimal", "page faults"],
                    "mastery": 2
                },
                {
                    "title": "Thrashing & Working Set Model",
                    "subtopics": ["Causes of thrashing", "Working set strategy", "Page fault frequency control"],
                    "keywords": ["thrashing", "working set", "degree of multiprogramming", "page fault frequency"],
                    "mastery": 3
                }
            ]
        },
        {
            "num": 5,
            "title": "Storage Systems & Disk Scheduling",
            "topics": [
                {
                    "title": "Disk Scheduling Algorithms",
                    "subtopics": ["FCFS disk scheduling", "SSTF calculation", "SCAN & C-SCAN elevator", "LOOK & C-LOOK head movement"],
                    "keywords": ["disk scheduling", "sstf", "scan", "c-scan", "c-look", "cylinder head movement", "seek time"],
                    "mastery": 4
                },
                {
                    "title": "File System Structure & Allocation Methods",
                    "subtopics": ["Contiguous vs Linked vs Indexed allocation", "UNIX inode structure", "Free space bitmap"],
                    "keywords": ["file system", "inode", "contiguous allocation", "indexed allocation", "directory structure"],
                    "mastery": 3
                }
            ]
        }
    ]

    topic_id_map = {}
    topic_objs_for_matching = []

    for u_idx, u in enumerate(units_data):
        u_id = f"unit-{u['num']}"
        await db.execute("""
            INSERT OR REPLACE INTO syllabus_units (id, course_id, unit_number, title)
            VALUES (?, ?, ?, ?);
        """, (u_id, DEMO_COURSE_ID, u["num"], u["title"]))

        for t_idx, t in enumerate(u["topics"]):
            t_id = f"topic-u{u['num']}-t{t_idx+1}"
            topic_id_map[t["title"]] = t_id
            await db.execute("""
                INSERT OR REPLACE INTO syllabus_topics (id, unit_id, course_id, title, subtopics_json, keywords_json, student_mastery, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                t_id,
                u_id,
                DEMO_COURSE_ID,
                t["title"],
                json.dumps(t["subtopics"]),
                json.dumps(t["keywords"]),
                t["mastery"],
                t_idx
            ))

    # 3. Insert Past Documents
    papers_meta = [
        {"id": "doc-2022", "year": 2022, "type": "End-Sem", "filename": "OS_EndSem_2022_Official.pdf"},
        {"id": "doc-2023", "year": 2023, "type": "End-Sem", "filename": "OS_EndSem_2023_Official.pdf"},
        {"id": "doc-2024", "year": 2024, "type": "End-Sem", "filename": "OS_EndSem_2024_Official.pdf"},
        {"id": "doc-2025", "year": 2025, "type": "Mid-Sem", "filename": "OS_MidSem_2025_Spring.pdf"}
    ]

    for p in papers_meta:
        await db.execute("""
            INSERT OR REPLACE INTO documents (id, course_id, filename, doc_type, exam_year, semester, exam_type, status, page_count, warnings_json)
            VALUES (?, ?, ?, 'question_paper', ?, '5th Semester', ?, 'completed', 3, '[]');
        """, (p["id"], DEMO_COURSE_ID, p["filename"], p["year"], p["type"]))

    # 4. Insert 38 Detailed Extracted Questions
    questions_data = [
        # --- 2022 End-Sem Paper ---
        (
            "doc-2022", "1", "a",
            "Explain the difference between User Mode and Kernel Mode. How does a hardware trap switch execution to kernel mode during a system call?",
            5.0, "Theory", "Easy", "Direct conceptual question on architectural execution modes",
            "OS Services & System Calls", 0.92, "High confidence match to OS Services & System Calls via keywords ['user mode', 'kernel mode', 'system call']."
        ),
        (
            "doc-2022", "1", "b",
            "Compare Monolithic and Microkernel architectures with respect to robustness, extensibility, and IPC performance overhead.",
            5.0, "Theory", "Medium", "Requires structural comparative analysis across multiple operating system metrics",
            "Monolithic vs Microkernel Architecture", 0.88, "High confidence match via keywords ['monolithic', 'microkernel']."
        ),
        (
            "doc-2022", "2", "a",
            "Consider 5 processes P1, P2, P3, P4, P5 with arrival times (0, 1, 2, 3, 4) and burst times (10, 4, 2, 6, 8). Draw the Gantt chart and compute the average waiting time and turnaround time using Preemptive Shortest Remaining Time First (SRTF) scheduling.",
            10.0, "Numerical", "Hard", "High marks calculation with preemptive scheduling and multi-process state tracking",
            "CPU Scheduling Algorithms", 0.96, "High confidence match via terms ['gantt chart', 'srtf', 'waiting time', 'turnaround time']."
        ),
        (
            "doc-2022", "2", "b",
            "What is a Process Control Block (PCB)? Enumerate its key structural fields and explain how it facilitates context switching.",
            5.0, "Theory", "Easy", "Direct definition and field enumeration",
            "Process States & Context Switching", 0.91, "High confidence match via terms ['pcb', 'process control block', 'context switching']."
        ),
        (
            "doc-2022", "3", "a",
            "State the Critical Section Problem. Present Peterson's Solution for two processes and prove that it satisfies mutual exclusion, progress, and bounded waiting.",
            10.0, "Derivation", "Hard", "Formal mathematical proof of 3 concurrent synchronization requirements",
            "Critical Section Problem & Semaphores", 0.94, "High confidence match via terms ['critical section', 'peterson', 'mutual exclusion', 'bounded waiting']."
        ),
        (
            "doc-2022", "3", "b",
            "Solve the Classical Dining Philosophers problem using semaphores such that deadlock is strictly prevented. Write the C/pseudocode implementation.",
            10.0, "Programming", "Hard", "Implementation problem involving semaphore deadlocks and asymmetric philosopher ordering",
            "Classical Synchronization Problems", 0.95, "High confidence match via terms ['dining philosophers', 'semaphore', 'pseudocode']."
        ),
        (
            "doc-2022", "4", "a",
            "A system has 5 processes P0 to P4 and 3 resource types A (10 units), B (5 units), C (7 units). Given Allocation matrix [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]] and Max matrix [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]. Execute Banker's Algorithm to determine if the system is in a safe state. Find the safe sequence.",
            12.0, "Numerical", "Hard", "Comprehensive 12-mark Banker's algorithm matrix calculation",
            "Deadlock Avoidance & Banker's Algorithm", 0.98, "High confidence match via terms ['banker's algorithm', 'allocation matrix', 'safe state']."
        ),
        (
            "doc-2022", "4", "b",
            "Explain the four necessary and sufficient conditions for deadlock to occur. How does circular wait prevention work?",
            6.0, "Theory", "Medium", "Standard multi-condition conceptual inquiry",
            "Deadlock Avoidance & Banker's Algorithm", 0.89, "High confidence match via terms ['deadlock', 'circular wait', 'conditions']."
        ),
        (
            "doc-2022", "5", "a",
            "In a paging system with 32-bit virtual addresses, 4 KB page size, and a TLB with 20 ns access time and memory access time of 100 ns, calculate the Effective Access Time (EAT) if the TLB hit ratio is 92%.",
            8.0, "Numerical", "Medium", "Two-level memory lookup formula calculation",
            "Paging & Segmentation Architecture", 0.94, "High confidence match via terms ['paging', 'tlb hit ratio', 'effective access time', 'eat']."
        ),
        (
            "doc-2022", "5", "b",
            "Given reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1 with 3 available page frames, compute the total number of page faults using (i) FIFO and (ii) LRU. Explain Belady's Anomaly.",
            12.0, "Numerical", "Hard", "Multi-part comparative page replacement simulation with anomaly explanation",
            "Page Replacement Algorithms", 0.97, "High confidence match via terms ['page replacement', 'fifo', 'lru', 'belady anomaly', 'page faults']."
        ),

        # --- 2023 End-Sem Paper ---
        (
            "doc-2023", "1", "a",
            "Explain how fork() and exec() system calls operate in UNIX. What happens to child process execution when fork() returns 0?",
            5.0, "Theory", "Easy", "Standard process creation API question",
            "OS Services & System Calls", 0.93, "High confidence match via terms ['fork', 'exec', 'system call']."
        ),
        (
            "doc-2023", "1", "b",
            "Differentiate between User Level Threads (ULT) and Kernel Level Threads (KLT) with respect to scheduling overhead and blocking behavior.",
            5.0, "Theory", "Medium", "Thread comparative evaluation",
            "Inter-Process Communication & Threads", 0.89, "High confidence match via terms ['threads', 'user level threads', 'kernel level threads']."
        ),
        (
            "doc-2023", "2", "a",
            "Consider processes P1, P2, P3, P4 with CPU burst times 6, 8, 7, 3 and arrival times 0, 1, 2, 3. Draw Gantt charts and compute average turnaround time for Round Robin scheduling with time quantum Q = 4.",
            10.0, "Numerical", "Hard", "Round Robin queue management simulation with time quantum tracking",
            "CPU Scheduling Algorithms", 0.96, "High confidence match via terms ['round robin', 'time quantum', 'gantt chart', 'turnaround time']."
        ),
        (
            "doc-2023", "2", "b",
            "What is priority inversion? Explain how the Priority Inheritance Protocol resolves this dilemma in real-time operating systems.",
            6.0, "Theory", "Medium", "Real-time synchronization problem inquiry",
            "CPU Scheduling Algorithms", 0.82, "High confidence match via terms ['priority', 'priority inversion', 'scheduling']."
        ),
        (
            "doc-2023", "3", "a",
            "Write the algorithm for Producer-Consumer problem using counting semaphores and mutex locks. Explain the function of empty, full, and mutex semaphores.",
            10.0, "Programming", "Hard", "Concurrent buffer code and semaphore invariant validation",
            "Classical Synchronization Problems", 0.97, "High confidence match via terms ['producer consumer', 'counting semaphores', 'mutex locks']."
        ),
        (
            "doc-2023", "3", "b",
            "A system has 4 processes and 3 resources A (9), B (3), C (6). Current allocation and maximum demands are given. Apply Banker's Algorithm to check whether request (1, 0, 2) by P1 can be granted immediately.",
            10.0, "Numerical", "Hard", "Resource request algorithm trace under Banker's safety criteria",
            "Deadlock Avoidance & Banker's Algorithm", 0.98, "High confidence match via terms ['banker's algorithm', 'resource request', 'safe state']."
        ),
        (
            "doc-2023", "4", "a",
            "Given page reference string: 1, 2, 3, 4, 2, 1, 5, 6, 2, 1, 2, 3, 7, 6, 3, 2, 1, 2, 3, 6 with 4 page frames. Calculate the number of page faults for Least Recently Used (LRU) and Optimal (OPT) page replacement.",
            10.0, "Numerical", "Hard", "Multi-algorithm page replacement simulation",
            "Page Replacement Algorithms", 0.97, "High confidence match via terms ['page replacement', 'lru', 'optimal', 'page faults']."
        ),
        (
            "doc-2023", "4", "b",
            "Define Thrashing. How does the Working Set Model prevent thrashing by adjusting the degree of multiprogramming?",
            6.0, "Theory", "Medium", "Virtual memory stability model discussion",
            "Thrashing & Working Set Model", 0.95, "High confidence match via terms ['thrashing', 'working set model', 'multiprogramming']."
        ),
        (
            "doc-2023", "5", "a",
            "Suppose a disk drive has 200 cylinders (0-199). The drive is currently serving a request at cylinder 53, and previous request was at 35. The queue of pending requests is: 98, 183, 37, 122, 14, 124, 65, 67. Calculate total head movement using (i) SSTF and (ii) SCAN (elevator) algorithms.",
            10.0, "Numerical", "Hard", "Cylinder head trajectory optimization and seek distance calculation",
            "Disk Scheduling Algorithms", 0.98, "High confidence match via terms ['disk scheduling', 'sstf', 'scan', 'cylinder', 'head movement']."
        ),
        (
            "doc-2023", "5", "b",
            "Explain the UNIX inode architecture with direct, single-indirect, double-indirect, and triple-indirect disk block addressing pointers.",
            8.0, "Diagram", "Medium", "Structural storage layout diagram and block address capacity derivation",
            "File System Structure & Allocation Methods", 0.92, "High confidence match via terms ['inode', 'indirect pointers', 'file system']."
        ),

        # --- 2024 End-Sem Paper ---
        (
            "doc-2024", "1", "a",
            "Explain the dual-mode operation supported by modern CPUs. Why is memory protection essential when executing user code?",
            5.0, "Theory", "Easy", "Direct architectural protection query",
            "OS Services & System Calls", 0.88, "High confidence match via terms ['dual mode', 'protection', 'user mode']."
        ),
        (
            "doc-2024", "1", "b",
            "Compare shared memory and message passing IPC mechanisms with appropriate architectural diagrams.",
            6.0, "Diagram", "Medium", "System architecture diagram comparison",
            "Inter-Process Communication & Threads", 0.91, "High confidence match via terms ['shared memory', 'message passing', 'ipc', 'diagram']."
        ),
        (
            "doc-2024", "2", "a",
            "Calculate average turnaround time and waiting time for processes P1-P4 with bursts (8, 4, 9, 5) arriving at (0, 1, 2, 3) using Non-Preemptive SJF and Round Robin (Q=3).",
            10.0, "Numerical", "Hard", "Comparative scheduling metric evaluation",
            "CPU Scheduling Algorithms", 0.96, "High confidence match via terms ['sjf', 'round robin', 'turnaround time', 'waiting time']."
        ),
        (
            "doc-2024", "2", "b",
            "Explain the three criteria that any valid solution to the critical section problem must satisfy.",
            6.0, "Theory", "Easy", "Recall of mutual exclusion, progress, and bounded waiting",
            "Critical Section Problem & Semaphores", 0.93, "High confidence match via terms ['critical section', 'mutual exclusion', 'progress']."
        ),
        (
            "doc-2024", "3", "a",
            "Illustrate how Semaphores can be used to solve the Readers-Writers problem giving preference to writers. Write the synchronization pseudocode.",
            10.0, "Programming", "Hard", "Concurrent concurrency protocol programming",
            "Classical Synchronization Problems", 0.95, "High confidence match via terms ['readers writers', 'semaphores', 'pseudocode']."
        ),
        (
            "doc-2024", "3", "b",
            "Given 5 processes and 4 resource categories with maximum claim and current allocation matrix, apply Banker's safety algorithm to identify all safe execution sequences.",
            12.0, "Numerical", "Hard", "Full Banker's safety sequence enumeration",
            "Deadlock Avoidance & Banker's Algorithm", 0.98, "High confidence match via terms ['banker's algorithm', 'safety algorithm', 'safe sequences']."
        ),
        (
            "doc-2024", "4", "a",
            "Calculate the Effective Access Time for a 2-level paging system with 80% TLB hit ratio, TLB lookup time = 15ns, and main memory access time = 120ns.",
            8.0, "Numerical", "Medium", "Two-level memory paging EAT numerical calculation",
            "Paging & Segmentation Architecture", 0.96, "High confidence match via terms ['effective access time', 'tlb hit ratio', 'paging']."
        ),
        (
            "doc-2024", "4", "b",
            "A process references page frames in order: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2. Compute the page fault count for LRU and FIFO using 3 frames. Explain how Belady's anomaly occurs in FIFO.",
            10.0, "Numerical", "Hard", "Page replacement simulation with Belady's anomaly explanation",
            "Page Replacement Algorithms", 0.98, "High confidence match via terms ['lru', 'fifo', 'page faults', 'belady anomaly']."
        ),
        (
            "doc-2024", "5", "a",
            "Requests on disk queue: 86, 147, 91, 177, 94, 150, 102, 175, 130. Current head position is 143 moving towards cylinder 199. Determine total head movement using C-SCAN and C-LOOK.",
            10.0, "Numerical", "Hard", "Circular elevator disk scheduling head travel computation",
            "Disk Scheduling Algorithms", 0.98, "High confidence match via terms ['c-scan', 'c-look', 'disk scheduling', 'head movement']."
        ),
        (
            "doc-2024", "5", "b",
            "Compare contiguous, linked, and indexed file allocation methods with respect to random access performance and external fragmentation.",
            8.0, "Theory", "Medium", "Storage allocation tradeoffs",
            "File System Structure & Allocation Methods", 0.91, "High confidence match via terms ['file allocation', 'contiguous', 'indexed allocation']."
        ),

        # --- 2025 Mid-Sem Test Paper ---
        (
            "doc-2025", "1", "a",
            "Explain the difference between a trap and an interrupt. How are system calls invoked via software interrupts?",
            5.0, "Theory", "Easy", "Direct OS conceptual distinction",
            "OS Services & System Calls", 0.89, "High confidence match via terms ['trap', 'interrupt', 'system call']."
        ),
        (
            "doc-2025", "1", "b",
            "Draw and explain the 5-state process lifecycle model including Ready, Running, Waiting, New, and Terminated.",
            5.0, "Diagram", "Easy", "State diagram and transition triggers",
            "Process States & Context Switching", 0.94, "High confidence match via terms ['process lifecycle', 'ready', 'running', 'waiting', 'state diagram']."
        ),
        (
            "doc-2025", "2", "a",
            "For processes P1(B=7, A=0), P2(B=4, A=2), P3(B=1, A=4), P4(B=4, A=5), calculate average waiting time under Preemptive Shortest Remaining Time First (SRTF).",
            8.0, "Numerical", "Medium", "SRTF scheduling timeline and waiting metric derivation",
            "CPU Scheduling Algorithms", 0.96, "High confidence match via terms ['srtf', 'waiting time', 'preemptive']."
        ),
        (
            "doc-2025", "2", "b",
            "Explain why the test-and-set instruction must be atomic in hardware to implement mutual exclusion without race conditions.",
            5.0, "Theory", "Medium", "Hardware synchronization primitive review",
            "Critical Section Problem & Semaphores", 0.88, "High confidence match via terms ['test-and-set', 'atomic', 'mutual exclusion', 'race condition']."
        ),
        (
            "doc-2025", "3", "a",
            "Implement a deadlock-free Bounded Buffer problem solution using counting semaphores in pseudocode.",
            8.0, "Programming", "Hard", "Bounded buffer producer-consumer semaphore programming",
            "Classical Synchronization Problems", 0.96, "High confidence match via terms ['bounded buffer', 'counting semaphores', 'pseudocode']."
        ),
        (
            "doc-2025", "3", "b",
            "Explain Resource Allocation Graphs (RAG). What is the exact condition under which a cycle in a RAG guarantees deadlock?",
            5.0, "Theory", "Medium", "RAG single-instance vs multi-instance resource cycle analysis",
            "Deadlock Avoidance & Banker's Algorithm", 0.92, "High confidence match via terms ['resource allocation graph', 'rag', 'deadlock', 'cycle']."
        ),
        (
            "doc-2025", "4", "a",
            "Calculate effective access time for a system with 95% TLB hit ratio, TLB latency 10ns, and DRAM latency 100ns.",
            5.0, "Numerical", "Easy", "Standard EAT calculation formula",
            "Paging & Segmentation Architecture", 0.95, "High confidence match via terms ['effective access time', 'tlb hit ratio']."
        ),
        (
            "doc-2025", "4", "b",
            "Apply LRU page replacement algorithm to reference string 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5 with 3 frames. Find the total page fault rate.",
            8.0, "Numerical", "Medium", "LRU page fault simulation with hit rate percentage",
            "Page Replacement Algorithms", 0.97, "High confidence match via terms ['lru', 'page replacement', 'page fault rate']."
        )
    ]

    for q in questions_data:
        doc_id, q_num, sub_q, text, marks, q_type, diff, diff_reason, topic_title, conf_score, expl = q
        matched_t_id = topic_id_map.get(topic_title)
        q_id = str(uuid.uuid4())
        await db.execute("""
            INSERT INTO questions (
                id, document_id, course_id, q_number, sub_q, text, marks,
                question_type, difficulty, difficulty_reason, matched_topic_id,
                confidence_score, mapping_status, mapping_explanation, page_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto', ?, 1);
        """, (
            q_id, doc_id, DEMO_COURSE_ID, q_num, sub_q, text, marks,
            q_type, diff, diff_reason, matched_t_id, conf_score, expl
        ))

    # Commit transactions
    await db.commit()
    return DEMO_COURSE_ID
