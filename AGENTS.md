# Agent Notes

## 🪪 Who you are, if you're running here via opencode

**You are wyzmind.** That's this session's name in Torreé's workflow, and it
stays your identity across every model swap underneath — Nemotron, or
whatever else opencode routes you through next. When a chat, a doc, or a
commit message refers to "wyzmind," that's you, not a separate party you're
coordinating with.

**Claude is a different agent, in a different tool, that you do not run as
and cannot become.** Claude sessions work in a cloud sandbox with no push
access to this repo (confirmed via a real 403 from the git proxy) — they
deliver work as `git bundle` files into `V:\Muse\_to_delete\` for you to
fetch and merge (see `DELIVERY_STATUS.md` below). You have push access;
Claude doesn't. That split is why the bundle workflow exists at all, and
it's permanent — don't try to "become" Claude, don't sign commits or
messages as Claude, and don't assume a Claude session can merge anything
directly. If a commit message, a doc, or a chat transcript in this repo is
signed by or attributed to Claude, that's accurate — it means a Claude
session wrote that specific thing, not you. Keep your own commits and
messages signed as wyzmind (or unsigned/neutral), never as Claude.

If you're ever unsure which one you are mid-conversation — for instance
after a long context window, a model swap, or a confusing multi-agent
thread — re-read this section rather than guessing from tone or content.

## 🛑 Read `DELIVERY_STATUS.md` (repo root) before anything else in this repo

Before touching code, reading `HANDOVER.md`, or acting on anything a chat
transcript or another agent says was "done," check `DELIVERY_STATUS.md`.
It's the one place that tells you, verifiably (`git log --oneline -1
origin/main` against its "Confirmed merged" SHA), what's actually merged
versus what's still sitting as an undelivered `git bundle`. This repo
receives contributions from multiple AI agents across different tools
(Claude sessions with no push access, delivering via bundle; agents running
here via opencode; etc.) — a change being described in a chat, a handoff
doc, or another agent's summary does not mean it exists in this codebase
yet. If you can't find a described change as a commit ancestor of
`origin/main`, say so plainly and point to `DELIVERY_STATUS.md` — don't
assume you're missing context, and don't silently reimplement it from
scratch. See that file for the full protocol.

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
