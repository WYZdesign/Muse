# Muse — Handover: Phase 2 Discover Image Curation

**Date:** 2026-08-20
**Committed:** `641512a` (pushed, git clean)
**Build:** `tsc --noEmit` passes (0 errors)
**Scope:** Claude's Phase 2 multi-image curation — 3-6 curated images per Discover profile, portrait-first.

---

## What was done

### 1. Sourced 80 images from Google Drive
- Drive root: `G:\My Drive\Pictures\Models (Old)\` (92 model folders, mounted locally).
- Copied 80 files across 24 model folders (including `Retouched`, `RETOUCHED`, `Retouched (Marshawna)` subfolders).
- Converted `.jpg`/`.JPG` → `.webp` via PIL (`ImageOps.exif_transpose` for correct orientation, RGB, quality 82).
- **Verified:** all 80 files present, all >1KB (no zero/corrupt files).

### 2. Updated 66 profiles in `types.ts`
`src/app/(muse)/muse/components/types.ts` — for each profile, set `img` (top card) to the first curated image and reordered `photos[]` to Claude's portrait-first list (3-6 images).
- 41 pool-only profiles (reorder existing hosted files)
- 25 Drive-sourced profiles (now reference the newly-converted `.webp` files)

### 3. Regenerated `photoOrientation.ts`
`src/app/(muse)/muse/components/photoOrientation.ts` — all 1059 model images re-measured (EXIF-aware). 404 portrait, 655 landscape. All 80 new files have correct entries.

### 4. Verification results
- **637** unique `/models/*.webp` references in `types.ts` → **0 missing** on disk.
- **1059** orientation entries → all 80 new files present.
- `tsc --noEmit` → clean.
- git → clean, synced with origin.

---

## Caveats / decisions (read before testing)

### 18 top-cards are landscape *orientation* (not portrait)
Claude described these as "portrait shots," but the actual source files are landscape (wider than tall). Subjects are centered per Claude's visual review, so they crop fine in the phone-shaped card via `objectFit: cover`, but they are NOT portrait-orientation:

AUDREY, JEREMY, MARISSA, ADRIENNE, AECH DOT, BROCK, BROOK, CLAUDIA, CRISTINA, DARRYL, DOT, HANNAH, JANELLE, KAYLEN, LORIE, MAYA, RANISHA, REBECCA.

This is a terminology mismatch (Claude meant "portrait photo" = photo of a person, not "portrait orientation" = taller-than-wide). If you want *true* portrait-orientation top cards on these 18, they'd need new source files — flag for a follow-up or just eyeball them in the app first, since centered crops usually look fine.

### CITLALI — kept safe
Kept `Bodypaint-25.webp` as the top card. The `Bodypaint-120.webp` (flagged as nudity in Phase 1) sits 3rd in the array, not the lead. Claude's Phase 2 said nudity is no longer disqualifying, but I went conservative pending your explicit call.

### DOT — one substitution
Claude's "Video Shoot (9 of 171).jpg" doesn't exist in Drive. Used "Video Shoot (9 of 39).jpg" instead (same shoot/session).

### AECH_DOT — unresolvable
100% landscape pool, no Drive folder exists. Left as-is. Needs a new photoshoot or removal from the deck.

---

## Files changed (this session)

- `public/models/*/` — 80 new `.webp` files (24 folders)
- `src/app/(muse)/muse/components/types.ts` — 66 profile edits
- `src/app/(muse)/muse/components/photoOrientation.ts` — regenerated (1059 entries)

## Remaining owner items (unchanged)

- Attorney review of Terms/Privacy
- NCMEC ESP registration (post-launch)
- AWS Rekognition — keys configured, uploads work
- Facebook OAuth — live
- Counter — counts `muse_profiles` (7 real accounts after junk purge)

## How to re-run orientation if images change

```bash
# Any time model images are added/removed, regenerate:
python -c "exec(open('muse_gen_orientation.py').read())"  # or run the regen script
```
(Note: the canonical `muse_gen_orientation.py` referenced in `photoOrientation.ts` header is not committed to the repo — the logic is: measure each `public/models/**/*.webp`, EXIF-transpose, `h > w` = portrait. Ask wyzmind to re-run if needed.)
