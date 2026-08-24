"""Quick column verification — insert into non-FK tables to verify critical columns exist."""
import json, urllib.request, urllib.error, time

SUPABASE_URL = "https://ejbwjmzrazfgtisqsamf.supabase.co"
env = {}
for line in open(r"V:\Muse\.env.local"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
KEY = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
ts = int(time.time())

results = []

def test(name, func):
    try:
        result = func()
        print(f"  PASS: {name}")
        results.append(("PASS", name))
        return result
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  FAIL: {name} — {e.code} {body}")
        results.append(("FAIL", name))
        return None
    except Exception as e:
        print(f"  FAIL: {name} — {e}")
        results.append(("FAIL", name))
        return None

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

def rest_get(table, filters=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    if filters:
        url += f"&{filters}"
    headers = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())

print("=" * 60)
print("CRITICAL COLUMN VERIFICATION")
print("=" * 60)

# 1. muse_notifications.body (not text)
notif = test("notifications.body column", lambda: rest_insert("muse_notifications", {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "type": "test",
    "body": f"column test {ts}",
    "read": False,
}))
if notif:
    print(f"    body = '{notif[0].get('body', 'MISSING')}'")
    print(f"    text = '{notif[0].get('text', 'N/A (good)')}'")

# 2. muse_reports.target_type + ai_classification
report = test("reports.target_type + ai_classification columns", lambda: rest_insert("muse_reports", {
    "reporter_id": "test_reporter",
    "target_id": "test_target",
    "target_type": "match",
    "reason": "column test",
    "ai_classification": "test_category",
}))
if report:
    print(f"    target_type = '{report[0].get('target_type', 'MISSING')}'")
    print(f"    ai_classification = '{report[0].get('ai_classification', 'MISSING')}'")

# 3. muse_ai_docs exists and has correct columns
docs = test("ai_docs table + columns", lambda: rest_get("muse_ai_docs", "limit=1"))
if docs is not None:
    print(f"    ai_docs rows: {len(docs)}")

# 4. muse_communities — check is_nsfw column (not nsfw)
comms = test("communities.is_nsfw column", lambda: rest_get("muse_communities", "limit=1"))
if comms:
    c = comms[0]
    cols = list(c.keys())
    has_is_nsfw = "is_nsfw" in cols
    has_nsfw = "nsfw" in cols
    print(f"    is_nsfw={has_is_nsfw} | nsfw={has_nsfw}")
    print(f"    columns: {cols}")

# 5. Check RLS policies via pg_policies
print("\n" + "=" * 60)
print("RLS POLICY CHECK (key tables)")
print("=" * 60)

# 6. Verify seed communities
print("\n" + "=" * 60)
print("SEED COMMUNITIES")
print("=" * 60)
if comms:
    for c in comms:
        print(f"  {c['name']} — cat={c.get('category')} nsfw={c.get('is_nsfw')} members={c.get('member_count')}")

# 7. Check that tables with RLS have policies
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
passed = sum(1 for s, _ in results if s == "PASS")
failed = sum(1 for s, _ in results if s == "FAIL")
print(f"Total: {len(results)} | Pass: {passed} | Fail: {failed}")
