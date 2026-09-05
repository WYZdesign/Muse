# Agent Notes

## User Preferences
- Always open `.sql` files in VS Code when creating or referencing them:
  `& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" "<file>.sql"`
- Windows box; PowerShell 7. `npm install` can be slow/flaky — if optional-dep
  errors appear in vitest (`rolldown` binding), run:
  `npm i --no-save "@rolldown/binding-win32-x64-msvc"`
- Local tsc shows ~34 pre-existing `SupabaseAuthClient`/rekognition type-drift
  errors unrelated to code changes; compare against baseline before blaming new work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
