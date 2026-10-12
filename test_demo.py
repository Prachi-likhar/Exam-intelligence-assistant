import urllib.request
import json

base = "https://exam-intelligence-assistant-2.onrender.com/api"
course_id = "demo-cs302-os"

endpoints = [
    f"/courses",
    f"/courses/{course_id}",
    f"/analytics/course/{course_id}",
    f"/priorities/course/{course_id}",
    f"/planner/course/{course_id}",
    f"/documents/course/{course_id}",
    f"/syllabus/course/{course_id}",
    f"/questions/course/{course_id}"
]

for ep in endpoints:
    url = base + ep
    req = urllib.request.Request(url)
    req.add_header("Origin", "http://localhost:5173")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"SUCCESS {resp.status}: {ep}")
    except Exception as e:
        print(f"FAILED: {ep} -> {e}")
        if hasattr(e, "read"):
            print("  Body:", e.read().decode())
