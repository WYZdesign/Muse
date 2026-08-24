"""Direct Supabase REST test — bypasses app API, hits DB directly."""
import json, urllib.request, urllib.error

SUPABASE_URL = "https://ejbwjmzrazfgtisqsamf.supabase.co"

env = {}
for line in open(r"V:\Muse\.env.local"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
ANON_KEY = env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
SERVICE_KEY = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SECRET_KEY")
KEY = SERVICE_KEY or ANON_KEY

results = []

def test(name, func):
    try:
        result = func()
        status = "PASS" if result else "FAIL"
        print(f"  {status}: {name}")
        results.append((name, status))
        return result
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  ERROR: {name} - {e.code} {body}")
        results.append((name, f"ERROR: {e.code}"))
        return None
    except Exception as e:
        print(f"  ERROR: {name} - {e}")
        results.append((name, f"ERROR: {e}"))
        return None

def rest_get(table, filters="", select="*"):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    if filters:
        url += f"&{filters}"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def rest_insert(table, row):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(row).encode()
    headers = {
        "apikey": KEY, "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def rest_upsert(table, rows):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    payload = json.dumps(rows).encode()
    headers = {
        "apikey": KEY, "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

def count_rows(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=0"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Prefer": "count=exact"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        cr = resp.getheader("content-range", "")
        if "/" in cr:
            return int(cr.split("/")[1].strip())
        return 0

def rest_delete(table, filter_str):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_str}"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return True

# ═══════════════════════════════════════════════════════
print("=" * 60)
print("PHASE 1: TABLE COUNTS")
print("=" * 60)

tables = [
    "muse_profiles", "muse_matches", "muse_messages", "muse_feed_posts",
    "muse_feed_comments", "muse_briefs", "muse_brief_applications",
    "muse_forum_posts", "muse_forum_comments", "muse_events",
    "muse_event_rsvps", "muse_activity_log", "muse_reports", "muse_blocks",
    "muse_forum_replies", "muse_communities", "muse_community_members",
    "muse_sessions", "muse_bookings", "muse_connections",
    "muse_notifications", "muse_push_subscriptions", "muse_error_logs",
    "muse_events_log", "muse_albums", "muse_album_photos", "muse_album_access",
    "muse_referrals", "muse_referral_rewards", "muse_stripe_connect",
    "muse_booking_payments", "muse_content_scans", "muse_safety_incidents",
    "muse_disclosures", "muse_strikes", "muse_safety_profiles",
    "muse_safety_checkins", "muse_safety_shares", "muse_admin_audit_log",
    "muse_prompt_bank", "muse_prompt_responses", "muse_profile_embeddings",
    "muse_ncmec_reports", "muse_verification_sessions", "muse_waitlist",
    "muse_landing_analytics", "muse_qr_events", "muse_rsvps",
    "muse_reviews", "muse_moments", "muse_professionals",
    "muse_rate_limits", "muse_album_likes", "muse_ai_docs",
]

existing = 0
missing = 0
for t in tables:
    try:
        count = count_rows(t)
        existing += 1
        label = f"  {t}: {count} rows"
        print(label)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            missing += 1
            print(f"  {t}: MISSING (404)")
        else:
            body = e.read().decode()[:120]
            print(f"  {t}: ERROR ({e.code}) {body}")

print(f"\n  Tables found: {existing}/{len(tables)} | Missing: {missing}")

# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("PHASE 2: SEED DATA CHECK")
print("=" * 60)

try:
    communities = rest_get("muse_communities", select="id,name,category")
    test("communities seeded", lambda: len(communities) > 0)
    print(f"    Communities: {len(communities)}")
    for c in communities[:3]:
        print(f"      - {c['name']} ({c['category']})")
except Exception as e:
    print(f"  ERROR: {e}")

# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("PHASE 3: INSERT → SELECT → VERIFY COLUMNS")
print("=" * 60)

# Clean up any leftover test data first
import time
ts = int(time.time())

# Create test profiles with unique auth_ids and emails
test_auth_a = f"00000000-0000-0000-0000-{ts:012d}"
test_auth_b = f"00000000-0000-0000-0001-{ts:012d}"

prof_a = test("insert profile A", lambda: rest_insert("muse_profiles", {
    "auth_id": test_auth_a,
    "email": f"test_a_{ts}@test.muse",
    "name": "Test User A",
    "type": "Photographer",
}))
pid_a = prof_a[0]["id"] if prof_a else None
if pid_a:
    print(f"    Profile A: {pid_a[:12]}")

prof_b = test("insert profile B", lambda: rest_insert("muse_profiles", {
    "auth_id": test_auth_b,
    "email": f"test_b_{ts}@test.muse",
    "name": "Test User B",
    "type": "Model",
}))
pid_b = prof_b[0]["id"] if prof_b else None
if pid_b:
    print(f"    Profile B: {pid_b[:12]}")

# Feed post
if pid_a:
    post = test("insert feed_post", lambda: rest_insert("muse_feed_posts", {
        "author_id": pid_a, "text": "Test post", "type": "text",
    }))

# Notification — body column
if pid_a:
    notif = test("insert notification (body col)", lambda: rest_insert("muse_notifications", {
        "user_id": pid_a, "type": "match", "body": "Test body column!", "read": False,
    }))
    if notif:
        body_val = notif[0].get("body", "MISSING")
        text_val = notif[0].get("text", "N/A")
        print(f"    body='{body_val}' | text='{text_val}'")

# Report — target_type + ai_classification
if pid_a and pid_b:
    report = test("insert report (target_type + ai_classification)", lambda: rest_insert("muse_reports", {
        "reporter_id": pid_a, "target_id": pid_b, "target_type": "match",
        "reason": "Test", "ai_classification": "test_cat",
    }))
    if report:
        tt = report[0].get("target_type", "MISSING")
        ac = report[0].get("ai_classification", "MISSING")
        print(f"    target_type='{tt}' | ai_classification='{ac}'")

# Moment
if pid_a:
    test("insert moment", lambda: rest_insert("muse_moments", {
        "author_id": pid_a, "text": "BTS test", "img": "https://x.com/t.jpg", "type": "photo",
    }))

# Community member
if pid_a and communities:
    cid = communities[0]["id"]
    test("upsert community_member", lambda: rest_upsert("muse_community_members", {
        "community_id": cid, "user_id": pid_a, "user_name": "Test User A",
    }))

# Session
if pid_a:
    test("insert session", lambda: rest_insert("muse_sessions", {
        "host_id": pid_a, "title": "Test Workshop", "description": "Auto test",
        "type": "Consultation", "rate": "$50/hr", "date": "2026-09-15",
    }))

# Brief
if pid_a:
    test("insert brief", lambda: rest_insert("muse_briefs", {
        "author_id": pid_a, "title": "Test Brief", "description": "Looking for collabs",
        "category": "vision", "paid": True, "rate": "$100",
    }))

# Forum post — body column
if pid_a:
    fp = test("insert forum_post (body col)", lambda: rest_insert("muse_forum_posts", {
        "author_id": pid_a, "title": "Test Forum", "body": "Forum body text", "category": "General",
    }))
    if fp:
        bv = fp[0].get("body", "MISSING")
        print(f"    forum_post body='{bv}'")

# AI docs
test("insert ai_doc", lambda: rest_insert("muse_ai_docs", {
    "section": "test", "title": f"Test AI Doc {ts}", "content": "RAG test content",
}))

# Event RSVP
try:
    events = rest_get("muse_events", select="id", filters="limit=1")
    if events:
        eid = events[0]["id"]
        test("insert rsvp", lambda: rest_upsert("muse_rsvps", {
            "event_id": eid, "user_id": test_auth_a,
        }))
except:
    print("  SKIP: no events to RSVP to")

# Professional
test("insert professional", lambda: rest_upsert("muse_professionals", {
    "user_id": test_auth_a,
    "name": "Test Pro A", "type": "Photographer",
}))

# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("PHASE 4: NOTIFICATION BODY VERIFICATION")
print("=" * 60)

if pid_a:
    try:
        notifs = rest_get("muse_notifications", select="body,type", filters=f"user_id=eq.{pid_a}")
        test("notifications have body column", lambda: len(notifs) > 0 and "body" in notifs[0])
        if notifs:
            print(f"    Notification: type={notifs[0]['type']}, body='{notifs[0]['body']}'")
    except Exception as e:
        print(f"  ERROR: {e}")

# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("PHASE 5: CLEANUP (delete test data)")
print("=" * 60)

if pid_a:
    test("delete test profiles + cascade", lambda: rest_delete("muse_profiles", f"email=like.test_%@test.muse"))

# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
passed = sum(1 for _, s in results if s == "PASS")
failed = sum(1 for _, s in results if "FAIL" in s or "ERROR" in s)
print(f"Total: {len(results)} | Pass: {passed} | Fail: {failed}")
if failed:
    print("\nFailed:")
    for name, status in results:
        if status != "PASS":
            print(f"  [{status}] {name}")
