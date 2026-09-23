# Muse agent collaboration protocol

This is the standing operating procedure for every AI, model, or human agent working in Muse. Read it before changing code, reporting status, or writing a handoff. `HANDOFF.md` is the current queue; this file is the durable process contract.

## 1. Objective and scope

Build and audit Muse completely, surgically, and realistically while it remains in **demo mode** until the owner explicitly authorizes a production change. Aim for a genuinely excellent product, not an attractive claim of completion.

## 2. Truth and reporting

1. Do not say “10/10,” “complete,” “production ready,” “deployed successfully,” or “green” without the exact revision, scope, commands, and outputs that prove it.
2. A focused failure overrides a broad success claim. A build passing does not prove lint, accessibility, privacy, migrations, visual behavior, or deployment configuration.
3. Report what is verified, what is inferred, and what remains unverified separately. State regressions plainly.
4. Never reduce, hide, ignore, downgrade, or exclude a test/source file merely to obtain a passing result. Replace weak coverage with meaningful coverage.
5. Do not invent facts about live deployments, providers, migrations, secrets, accounts, or browser behavior. Verify them or say they are unverified.

## 3. Ownership and coordination

1. Read `HANDOFF.md`, this protocol, current `git status`, and relevant recent commits before editing.
2. Wyzmind owns commits, pushes, migrations, Vercel configuration, and deployment verification unless the owner explicitly changes that.
3. Every other agent owns only its declared, non-overlapping files/tasks. Avoid active work in a concurrently edited file unless a reproducible regression requires coordination first.
4. Add findings, task bundles, acceptance criteria, and verification evidence to `HANDOFF.md`; keep the queue specific and deduplicated.
5. Before handoff, write: changed files, behavior changed, tests run with exact outcome, deploy/migration state, known risks, and next owner/action.
6. The next agent reviews the actual diff and reruns the affected gate. It does not accept a prior agent’s summary as proof.

## 4. Implementation discipline

1. Make the smallest safe, maintainable change that solves the demonstrated issue. Avoid fashionable dependencies, broad rewrites, and premature infrastructure.
2. Do not modify production behavior, send external messages, invoke paid services, change billing, or deploy outside the owner’s stated scope.
3. Preserve demo mode: demo mutations must be safe/no-op or explicitly simulated, must not call real providers, and must clearly communicate demo behavior.
4. Validate server-side authorization, privacy, consent, age gating, rate limits, storage access, and deletion lifecycle at the trust boundary—not only in the UI.
5. High-risk media is fail-closed: no unmoderated media becomes publicly accessible. No unreviewed local/open-source classifier counts as production-grade moderation evidence.
6. Prefer open-source/self-hostable tools where practical. Assess maintenance, license, data flow, operational cost, removal plan, and user value before adoption.

## 5. Required quality gates

Run the relevant gates on the exact worktree/revision. A skipped/blocked command is not a pass.

1. Cache-free TypeScript: `tsc --noEmit --incremental false`.
2. Truthful ESLint: TypeScript/TSX must be parsed and included. Focused lint on modified files plus intended full lint; no blanket exclusions to manufacture green.
3. Relevant unit/route tests, including failure and authorization paths.
4. Relevant browser tests: primary action, cancel/back/escape, empty/error/loading state, and repeat/idempotency behavior.
5. Production build.
6. For migrations/storage/cron: local/disposable integration evidence plus migration/configuration proof before production claims.
7. For deploys: exact SHA, deployment URL/state, environment/migration prerequisites, and a live smoke result.

## 6. Mobile, visual, and accessibility standard

1. Every changed route and overlay must be checked at 390px (iPhone 13), 375px, and 320px when dense. No clipping, horizontal page overflow, overlay collision, hidden critical action, or fixed banner/nav obstruction.
2. Test the actual controls as a user: primary action, secondary action, cancel/close, back, tabs/filters, forms, and empty/error states.
3. Controls need an accessible name, visible focus, keyboard path, and sensible touch target. Modal/drawer behavior needs focus trap, Escape/close, and focus restoration.
4. Baseline accessibility is never a settings toggle. Preferences may offer reduced motion, theme/contrast, and font scale, but not semantic labels/focus/keyboard access.
5. Respect the established visual direction: simplify excessive glass/ornamental circles; retain visual hierarchy and readable contrast over media.

## 7. What not to do

- Do not claim a score or completion level without evidence.
- Do not treat warnings/errors as solved because a different script passed.
- Do not silently change user policy/retention/safety copy or behavior.
- Do not point destructive/security probes at production.
- Do not include secrets, service-role keys, credentials, or user data in code, logs, tests, handoffs, or screenshots.
- Do not combine unrelated upgrades with a targeted bug fix.
- Do not replace a real safety/privacy/authorization boundary with a cosmetic client-side check.

## 8. Required handoff footer

Every substantive handoff must include:

```md
## Verification record
- Revision/worktree:
- Files changed:
- Commands actually run + exact result:
- Browser/mobile widths and flows verified:
- Migration/environment/deploy state:
- Known failures or unverified assumptions:
- Next concrete owner/action:
```

If a field is unknown, write `UNVERIFIED`—never omit it or imply success.

## 9. Model-agnostic symbiotic delivery protocol

This section applies to every future Muse task and every model. It is designed
to make the workflow reliable across Codex, Claude, Wyzmind, and any successor
agent; it does not depend on a model's memory, preferred tools, or claims.

### Stable roles

1. **Owner** sets product decisions and risk authority only.
2. **Wyzmind is the sole integrator**: it creates the integration baseline,
   reviews all incoming diffs, resolves conflicts, commits, pushes, applies
   migrations, changes deployment configuration, deploys, and records live
   evidence.
3. **Implementation agents** own one bounded bundle at a time. They may edit
   only their declared worktree/branch and must not stage, commit, push,
   migrate, deploy, or alter cloud configuration.
4. **Audit agents** independently reproduce a stated claim on the exact
   revision/URL. They do not accept another agent's summary as proof.

### Worktree contract

1. Before coding, Wyzmind creates a clean integration baseline and records its
   SHA in `HANDOFF.md`.
2. Every parallel agent gets a separately named branch/worktree from that SHA,
   for example `agent/media-safety` or `agent/mobile-header`. The declared file
   manifest must not overlap another active bundle unless Wyzmind explicitly
   serializes the work.
3. A bundle has one measurable outcome, one risk area, a file manifest,
   acceptance tests, and an explicit stop condition. Broad mechanical rewrite
   scripts are forbidden on shared product files.
4. Agents return a diff and evidence; Wyzmind cherry-picks/recreates it only
   after reviewing the actual diff. Integration is one bundle at a time.
5. If a bundle depends on an unmerged change, record the dependency and wait or
   rebase from the next named integration SHA. Never copy/paste an agent's
   changes over an unknown concurrent worktree.

### Shared queue and evidence format

Each active bundle in `HANDOFF.md` must state: owner, base SHA, branch/worktree,
exclusive files, problem evidence, intended behavior, tests, migration/env
needs, integration order, and acceptance criteria. A bundle is `READY FOR
REVIEW`, `INTEGRATED`, `DEPLOYED-VERIFIED`, `PARTIAL`, or `BLOCKED`; it is never
described as complete without the required verification record.

### Execution loop

1. **Observe:** reproduce with source, command, or rendered runtime evidence.
2. **Reserve:** claim a non-overlapping bundle in the handoff before edits.
3. **Implement:** make the smallest safe change; preserve demo mode and trust
   boundaries.
4. **Verify locally:** run the changed-file lint, relevant route/unit tests,
   cache-free TypeScript, and any applicable browser checks. State every blocked
   command exactly.
5. **Integrate:** Wyzmind independently reviews the diff and reruns affected
   gates on its integration worktree.
6. **Release:** Wyzmind alone runs migration/config/deploy work, records SHA and
   URL, then an independent agent re-tests the deployed behavior.
7. **Learn:** update the handoff with regression evidence and the next smallest
   unblocked bundle.

### Non-negotiable collaboration safeguards

- A model's confidence, test count, or prose summary is not evidence.
- No agent edits another active agent's file. Urgent fixes are coordinated by
  Wyzmind, which serializes or reassigns ownership first.
- No bulk formatting, automated catch-block rewriting, mass lint suppression,
  or broad ignore change may be merged without semantic diff review and the
  affected quality gates.
- Every external side effect remains integrator-controlled.
- The protocol is intentionally tool-agnostic: if an agent lacks a tool, it
  records the exact gap and hands over a reproducible command, rather than
  guessing or fabricating a pass.
