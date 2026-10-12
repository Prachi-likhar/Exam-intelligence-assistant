import asyncio
from backend.app.database import init_db, get_db
from backend.app.services.demo_data import seed_demo_data

async def main():
    await init_db()
    async for db in get_db():
        demo_id = await seed_demo_data(db)
        print("DEMO SEED SUCCESS:", demo_id)
        # Check counts
        async with db.execute("SELECT count(*) FROM courses WHERE id = ?", (demo_id,)) as cur:
            print("Course count:", (await cur.fetchone())[0])
        async with db.execute("SELECT count(*) FROM documents WHERE course_id = ?", (demo_id,)) as cur:
            print("Document count:", (await cur.fetchone())[0])
        async with db.execute("SELECT count(*) FROM syllabus_units WHERE course_id = ?", (demo_id,)) as cur:
            print("Unit count:", (await cur.fetchone())[0])
        async with db.execute("SELECT count(*) FROM syllabus_topics WHERE course_id = ?", (demo_id,)) as cur:
            print("Topic count:", (await cur.fetchone())[0])
        async with db.execute("SELECT count(*) FROM questions WHERE course_id = ?", (demo_id,)) as cur:
            print("Question count:", (await cur.fetchone())[0])
        break

if __name__ == "__main__":
    asyncio.run(main())
