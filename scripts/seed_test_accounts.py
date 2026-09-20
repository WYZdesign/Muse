#!/usr/bin/env python3
"""Seed the two Muse test accounts (idempotent).

The auth users already exist:
  torree.marcel+musetest1@gmail.com  (host — gets a bookable session)
  torree.marcel+musetest2@gmail.com  (booker/creative)

This gives each a `muse_profiles` row (pre-verified, 100% complete) and gives the
host one bookable session, so every user-to-user interaction can be exercised.
Re-runnable: skips anything that already exists.

Connection: DATABASE_URL (or SUPABASE_DB_URL / MUSE_DATABASE_URL).
Usage: python scripts/seed_test_accounts.py
"""
from __future__ import annotations

import os
import sys

ACCOUNTS = [
    {
        "email": "torree.marcel+musetest1@gmail.com",
        "name": "Test Host Nova",
        "type": "Photographer",
        "styles": ["Portrait", "Fashion", "Editorial"],
        "looking": ["Models", "Collaborators"],
        "city": "Los Angeles",
        "loc": "Los Angeles, CA",
        "bio": "Test host account for end-to-end booking flows. Portrait + fashion photographer.",
    },
    {
        "email": "torree.marcel+musetest2@gmail.com",
        "name": "Test Muse Kai",
        "type": "Model",
        "styles": ["Editorial", "Runway", "Beauty"],
        "looking": ["Photographers", "Creatives"],
        "city": "Los Angeles",
        "loc": "Los Angeles, CA",
        "bio": "Test booker account for end-to-end booking + messaging flows.",
    },
]

SESSION = {
    "title": "Test Portrait Session",
    "description": "Automated test session for end-to-end booking verification.",
    "type": "Photography",
    "rate": "$150",
    "duration": "60 min",
    "skills": ["Portrait", "Studio", "Lighting"],
    "date": "2026-10-15",
    "location": "Los Angeles, CA",
    "available": True,
    "rating": 5.0,
}

# Discover (/api/muse/match) only surfaces candidates with an avatar OR photos
# (route.ts candidate filter), so test accounts need visuals or they never
# appear in each other's deck. Unsplash is already allowed by the CSP img-src.
AVATARS = {
    "torree.marcel+musetest1@gmail.com": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80",
    "torree.marcel+musetest2@gmail.com": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80",
}


def dsn() -> str | None:
    for n in ("DATABASE_URL", "SUPABASE_DB_URL", "MUSE_DATABASE_URL"):
        if os.environ.get(n):
            return os.environ[n]
    return None


def main() -> int:
    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed", file=sys.stderr)
        return 1

    url = dsn()
    if not url:
        print("ERROR: set DATABASE_URL (or SUPABASE_DB_URL / MUSE_DATABASE_URL)", file=sys.stderr)
        return 1

    conn = psycopg2.connect(url, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()

    created: dict[str, str] = {}
    for a in ACCOUNTS:
        cur.execute("SELECT id FROM auth.users WHERE email = %s", (a["email"],))
        row = cur.fetchone()
        if not row:
            print(f"SKIP  {a['email']} — no auth user")
            continue
        auth_id = row[0]

        cur.execute("SELECT id FROM muse_profiles WHERE email = %s OR auth_id = %s", (a["email"], auth_id))
        existing = cur.fetchone()
        if existing:
            print(f"SKIP  {a['email']} — profile exists ({existing[0]})")
            created[a["email"]] = existing[0]
            continue

        cur.execute(
            """
            INSERT INTO muse_profiles
              (auth_id, email, name, type, styles, looking, city, loc, bio, avatar,
               age_verified, age_verified_at, profile_completion_pct, prompt_completed_at,
               audience, tier, status, availability_status)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, '',
               true, now(), 100, now(),
               'creative', 'free', 'Test account — safe to modify', 'available')
            RETURNING id
            """,
            (auth_id, a["email"], a["name"], a["type"], a["styles"], a["looking"],
             a["city"], a["loc"], a["bio"]),
        )
        pid = cur.fetchone()[0]
        created[a["email"]] = pid
        print(f"OK    {a['email']} -> profile {pid}")

    # Ensure the test accounts have visuals (existing rows included).
    for email, pid in created.items():
        cur.execute("SELECT avatar, photos FROM muse_profiles WHERE id = %s", (pid,))
        row = cur.fetchone()
        avatar = (row[0] or "").strip() if row else ""
        photos = row[1] if row and isinstance(row[1], list) else []
        if not avatar and email in AVATARS:
            url = AVATARS[email]
            cur.execute(
                "UPDATE muse_profiles SET avatar = %s, photos = %s WHERE id = %s",
                (url, photos + [url] if url not in photos else photos, pid),
            )
            print(f"OK    avatar + photo set for {email}")

    host_id = created.get(ACCOUNTS[0]["email"])
    if host_id:
        cur.execute("SELECT id FROM muse_sessions WHERE host_id = %s AND title = %s", (host_id, SESSION["title"]))
        if cur.fetchone():
            print("SKIP  test session already exists")
        else:
            cur.execute(
                """
                INSERT INTO muse_sessions
                  (host_id, title, description, type, rate, duration, skills, date, location, img, available, rating)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, '', %s, %s)
                RETURNING id
                """,
                (host_id, SESSION["title"], SESSION["description"], SESSION["type"], SESSION["rate"],
                 SESSION["duration"], SESSION["skills"], SESSION["date"], SESSION["location"],
                 SESSION["available"], SESSION["rating"]),
            )
            print(f"OK    test session -> {cur.fetchone()[0]}")

    cur.close()
    conn.close()
    print("\ndone")
    return 0


if __name__ == "__main__":
    sys.exit(main())
