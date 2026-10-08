# Muses by WYZ: context reconciliation
Snapshot: 2026-10-02. This report separates checked state from historical claims. No production data or cloud configuration was changed.

## Ground truth
- Repository: https://github.com/WYZdesign/Muse (public, main). Local canonical checkout V:/Muse.
- Refreshed origin/main: 10f657379d5338906e756823ec43e9a3a7bf3642. It includes Zod validation for /api/muse/support and the subsequent app-icon image optimization.
- Vercel CLI independently reports production READY at that exact SHA, deployment dpl_3DTkghWbQWfYj2owZkxDPkxUU7Ui, aliased to muse.wyzdesign.com. This is a dated snapshot, not a perpetual guarantee.
- Earlier audit began at 18c322893b8dee79f4c92ff8e3a4507dd5b4c579. DELIVERY_STATUS previously pointed to 65c07dbae2fb63117abecfe617333abc2e681e6a. Its header reconciliation was incorporated into the shared checkout by the other agent while work proceeded.
- Canonical new briefing: W:/WYZ_Command_Center/_STATE/AI_HANDOVER.md and AI_TASK_BOARD.md. Those describe ownership and intent; deployment and schema checks provide independent evidence.
- Production Supabase: ejbwjmzrazfgtisqsamf, ACTIVE_HEALTHY. WYZ-Design is a different project. The staging reference in the old ROADMAP was not visible in the accessible project list.

## What the product is
A full creative collaboration, networking and booking platform, including behind-camera and in-front-camera roles. Discovery, feed/BTS, briefs, network/community, portfolio, chat/calls, sessions/bookings, subscriptions and admin are parts of the intended app. It is not a dating app. The user intends full app distribution and marketing across platforms.

Stack described by the current briefing: Next.js 16, React 19, TypeScript, custom CSS, Supabase, Stripe, LiveKit, OpenRouter, moderation/media providers, Resend, Sentry and Capacitor. Runtime capabilities require verification beyond installed dependencies.

## Work confirmed in main history
The commits since the stale delivery header include:
- Waitlist corrections and promotion retry; accessibility work across dialogs, navigation, discovery, feed, network, notifications, BTS and admin.
- Demo interaction/population work and privacy protection for online status.
- Page/controller decomposition, bootstrap and persistence hooks, onboarding/auth extraction, discover-deck builder, verification banner and confetti extraction. Current handoff reports page reduction to roughly 1,222 lines.
- Admin booking refunds, community bans/rules, boost analytics and cron additions.
- Birthdate migration and derived age handling, structured availability, and server-side portfolio privacy.
- Muses branding changes and removal of heart imagery.
- Dependency audit remediation and initial shared Zod validation for waitlist; support validation shipped during this review.
These are Git-history findings. They do not certify every end-to-end feature.

Production schema_migrations has numbered entries 0001 through 0030 plus the custom-role entry. Entries 0022, 0024, 0025 and 0026 are present: the old BLK-MIG-STATE assignment is stale. Do not reapply these migrations based on old prose.
Storage buckets independently checked: muse-uploads public, 25 MiB; muse-private private, 10 MiB. All ordinary public tables inspected have RLS enabled. Enabled RLS does not establish safe policies.

## Currently being done
The new ownership board gives the other/opencode agent application source and UI ownership: the main page, hooks, screens/components, muse.css, related source and deployment hooks. Its stated next tasks are further P2 extraction, input-validation rollout, then caching/image work. A fresh pushed and deployed support-validation commit independently confirms the validation rollout is active.
ChatGPT's useful lane is infrastructure evidence, database/RLS review, operations, GitHub review, staging verification, documentation and validation inventory. Avoid overlapping source edits. Use isolated branches and reviewable changes, not direct pushes to main. See PAGE_SPLIT_AUDIT_2026-10-02.md and VISUAL_AUDIT_2026-10-02.md for the completed review evidence.

The briefing's 84 test files / 1,000 passing tests and clean typecheck/build are prior-agent reports, not freshly rerun here. Historical 349-test requirements and older ROADMAP counts are stale. No new overall readiness score is justified.

## Important open findings
1. **Broad database mutation policies.** Read-only SQL found public-role policies with unconditional mutation predicates and relevant table privileges:
   - muse_prompt_bank, muse_safety_checkins and muse_strikes: ALL with USING true and WITH CHECK true.
   - muse_blocks, muse_bookings, muse_push_subscriptions and muse_reports: INSERT with WITH CHECK true.
   - form_submissions also permits INSERT true; anonymous submission may be intentional and needs endpoint/design review.
   Other ownership policies do not override permissive policies: they combine with OR. Review effective grants, identity constraints and server-only design; prepare a focused tested migration before any production change. No exploit or mutation was performed.
2. **Supabase advisors.** Six mutable function search paths, vector extension in public, leaked-password protection disabled, and eight security-definer functions executable by anonymous/authenticated roles require review. Not every RPC is necessarily unsafe. Twenty-two RLS-enabled tables without policies may intentionally be server-only; do not add broad policies to silence the advisor.
3. **Preview/staging isolation.** Primary public Supabase URL/key and service keys are production-only in Vercel metadata, while some older Supabase, Stripe and AWS variables target preview too. Values were not read. Isolated staging configuration and test/live payment separation remain unverified.
4. **Operations evidence.** Seven Vercel crons are registered: backup, capture-bookings, checkins, claimable quests, deleted-account purge, saved-search alerts and storage cleanup. Registration is not proof of successful execution or recoverability. Check recent runs, alerting, backup integrity and a restore drill.
5. **Reporting configuration.** NCMEC endpoint variable exists, but client ID/secret names were not present in the inspected environment metadata. Provider access and transmission behavior remain unverified; do not claim compliance readiness.
6. **Old GitHub PR.** Draft PR #1 is open and currently nonmergeable, with an August dependency-remediation lockfile change. Main now has a newer audit fix. Review for supersession before merging or closing. No open issues were returned by the issue query.
7. **Build cost.** No ignored-build command appeared in the project metadata field inspected. A docs-only deployment skip should compare against the actual prior deployment commit and handle first deploys; do not copy a HEAD^ shortcut that misses batched changes.

## Browser evidence and limitations
A dedicated Chrome session reached production /api/health with 200 and status ok, and /muse displayed the Muses by WYZ login page. No pageerror events were observed. At widths 320, 375, 390, 768 and 1440, document scrollWidth equalled clientWidth.
Screenshot capture timed out even after disabling animations. Thus no screenshot-based visual acceptance is claimed, and authenticated screens were not tested.
The user explicitly selected the Codex sidebar browser. Its native runtime failed bootstrap with a trusted RPC path rejection. Do not substitute another browser for subsequent sidebar requests. Restart/reload of the host integration is a recovery candidate, not a verified fix. Preserve user-owned tabs.
The earlier curl health request was rejected because the API middleware blocks curl-like user agents. Real browser health succeeded.

## Plugins and access
- GitHub and Supabase access worked for read-only checks.
- Local Vercel CLI access worked. The original plugin failed with missing access to wyzdesigns-projects; while the user reconnected, its tool became unavailable. User reports the authorization project picker hangs. Cause unresolved; distinguish this from app deployment failure.
- User reports Stripe, TinyFish and Windsor.ai connected. Their account access has not been independently exercised in this tool session. TinyFish is not the user's signed-in sidebar or Chrome session.
- Created private Muses Operations skills-only plugin:
  https://chatgpt.com/plugins/plugins_6ac00ebabad48191a95fa15c0270b17c
  Version 0.1.0. Three validated skills: muse-evidence, muse-visual-audit, muse-launch-readiness. Account creation does not prove installation or tool access.
- Sentry is already in the app's environment metadata. Prefer its official integration for error triage; a replacement monitoring vendor is unnecessary solely for plugin availability.
- No keys, tokens or decrypted environment values should be pasted into chat.

## Branding and launch
Keep Muses by WYZ as the working brand pending an explicit decision; shorter everyday Muses and the full lockup are options, not a committed rename. Evaluate naming across spoken use, app stores, domains, social handles and advertising.
Meta's official September announcement uses Muse for a personal AI agent:
https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/
This establishes a naming collision, not trademark ownership or availability. Older handoff claims that a name is legally off limits or another is uniquely ownable are unverified. No rename was made.

## Recommended order
1. Resolve access and native-browser connection so ongoing review can use actual account and visual evidence.
2. Review and repair broad RLS/grant issues with isolated tests and a reviewable migration.
3. Establish and prove isolated staging, including payments and authenticated full user flows.
4. Verify cron runs, Sentry alerts, backups and restore.
5. Let the source owner continue Zod/P2 work; create a coverage inventory rather than duplicate changes.
6. Repeat actual screenshot and interaction audits across app screens and viewports.
7. Confirm brand and launch distribution plan, then connect marketing accounts only as needed. Publishing and spend need their own authorization.

## Document review scope
The attached new handover and canonical board were read along with the active delivery records and current strategy/operations documents. A 71-document historical corpus was collected and indexed; selected current handovers and historical audit/release sections were reviewed. This is not a claim that every historical line was independently revalidated. Huge cumulative HANDOFF/HANDOVER files contain superseded claims.
The accompanying inventory retains paths and sizes so later sessions can trace evidence without treating old prose as pending work. Historical docs were preserved. No app source was changed by this review.

# Corner-system audit

The requested cross-overlay corner review is recorded in
`CORNER_SYSTEM_AUDIT_2026-10-02.md`. The only immediate visual adjustment is
to soften the daily-login card from 20px to 24px. The broader recommendation is
to consolidate the existing modal/sheet/card values behind a semantic radius
scale; it is intentionally an implementation handoff for the active UI owner,
not a source change on this review branch.

## Closed-beta gate

`CLOSED_BETA_READINESS_2026-10-02.md` is the current evidence-based readiness
ledger. It supersedes any interpretation of the historical 1,000- or
2,000-point audits as a release sign-off: automated quality is strong, while
production security, staging, provider, native-device, recovery, and store
proof remain mandatory before launch.
