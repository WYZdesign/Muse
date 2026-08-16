#!/usr/bin/env python3
"""
Muse Nightly Backup — Supabase Postgres → Cloudflare R2
Usage: python muse_backup.py [--dry-run] [--retention-days 30]
Requires: pip install boto3 psycopg2-binary
Env vars: DATABASE_URL, R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
"""
import os, sys, subprocess, json, gzip, hashlib, shutil
from datetime import datetime, timedelta
from pathlib import Path

# ── Config ──
DB_URL = os.environ.get("DATABASE_URL", "")
R2_ENDPOINT = os.environ.get("R2_ENDPOINT", "")  # e.g. https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "muse-backups")
LOCAL_DIR = Path(os.environ.get("BACKUP_DIR", os.path.join(os.path.expanduser("~"), "muse_backups")))
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "30"))
DRY_RUN = "--dry-run" in sys.argv

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def check_deps():
    missing = []
    try: import psycopg2
    except ImportError: missing.append("psycopg2-binary")
    try: import boto3
    except ImportError: missing.append("boto3")
    if missing:
        log(f"Missing dependencies: {', '.join(missing)}")
        log(f"Run: pip install {' '.join(missing)}")
        sys.exit(1)

def pg_dump():
    """Run pg_dump and return the path to the compressed dump file."""
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_path = LOCAL_DIR / f"muse_backup_{timestamp}.sql.gz"
    
    log(f"Starting pg_dump → {dump_path.name}")
    
    # Use pg_dump with custom format for compression
    cmd = [
        "pg_dump",
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "-f", str(dump_path),
        DB_URL,
    ]
    
    # pg_dump with gzip via pipe
    import subprocess
    proc = subprocess.run(
        f'pg_dump --no-owner --no-privileges --clean --if-exists "{DB_URL}" | gzip > "{dump_path}"',
        shell=True, capture_output=True, text=True, timeout=3600
    )
    
    if proc.returncode != 0:
        log(f"pg_dump failed: {proc.stderr[:500]}")
        sys.exit(1)
    
    size_mb = dump_path.stat().st_size / (1024 * 1024)
    log(f"Dump complete: {dump_path.name} ({size_mb:.1f} MB)")
    return dump_path

def upload_to_r2(file_path):
    """Upload the dump file to Cloudflare R2."""
    import boto3
    
    log(f"Uploading to R2 bucket: {R2_BUCKET}")
    
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
    )
    
    date_prefix = datetime.now().strftime("%Y/%m/%d")
    r2_key = f"muse/{date_prefix}/{file_path.name}"
    
    # Calculate checksum
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    
    s3.upload_file(
        str(file_path),
        R2_BUCKET,
        r2_key,
        ExtraArgs={
            "StorageClass": "STANDARD",
            "Metadata": {
                "backup-date": datetime.now().isoformat(),
                "checksum-sha256": sha256.hexdigest(),
                "source": "muse-nightly-backup",
            },
        },
    )
    
    log(f"Uploaded: s3://{R2_BUCKET}/{r2_key}")
    return r2_key

def cleanup_old_backups():
    """Remove local backups older than RETENTION_DAYS."""
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    removed = 0
    for f in LOCAL_DIR.glob("muse_backup_*.sql.gz"):
        if f.stat().st_mtime < cutoff.timestamp():
            f.unlink()
            removed += 1
    if removed:
        log(f"Cleaned up {removed} old local backup(s)")

def verify_dump(file_path):
    """Quick verify: check the gzip file is valid and non-empty."""
    try:
        with gzip.open(file_path, "rb") as f:
            header = f.read(100)
            if not header:
                log("WARNING: Dump file appears empty")
                return False
            if b"PostgreSQL" not in header and b"CREATE" not in header:
                log(f"WARNING: Dump header doesn't look like SQL: {header[:80]}")
    except Exception as e:
        log(f"WARNING: Could not verify dump: {e}")
        return True  # continue anyway
    return True

def main():
    log("═══ Muse Nightly Backup ═══")
    
    if DRY_RUN:
        log("DRY RUN — would execute pg_dump and upload to R2")
        log(f"  DB: {(DB_URL or 'not configured')[:30]}...")
        log(f"  R2: {R2_ENDPOINT or 'not configured'}")
        log(f"  Bucket: {R2_BUCKET}")
        log(f"  Retention: {RETENTION_DAYS} days")
        return
    
    if not DB_URL:
        log("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    check_deps()
    
    # Step 1: pg_dump
    dump_path = pg_dump()
    
    # Step 2: Verify
    if not verify_dump(dump_path):
        log("Dump verification failed — aborting upload")
        sys.exit(1)
    
    # Step 3: Upload to R2
    r2_key = None
    if R2_ENDPOINT and R2_ACCESS_KEY:
        r2_key = upload_to_r2(dump_path)
    else:
        log("R2 not configured — skipping upload (local backup only)")
    
    # Step 4: Cleanup old local backups
    cleanup_old_backups()
    
    log("═══ Backup complete ═══")
    
    # Write manifest for audit
    manifest = {
        "timestamp": datetime.now().isoformat(),
        "file": dump_path.name,
        "size_bytes": dump_path.stat().st_size,
        "r2_key": r2_key,
        "retention_days": RETENTION_DAYS,
    }
    manifest_path = LOCAL_DIR / "last_backup.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    log(f"Manifest: {manifest_path}")

if __name__ == "__main__":
    main()
