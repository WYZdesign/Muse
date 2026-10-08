# page.tsx split audit — 2026-10-02

Scope: read-only review of the merged controller decomposition through `origin/main` `10f657379d5338906e756823ec43e9a3a7bf3642`. The only commit after the reviewed split work is an app-icon image optimization; it does not touch `page.tsx` or the extracted modules.

## Result

No release-blocking defect was found in the reviewed split. The page-size ratchet is holding, the selected behavioral tests pass, and the extraction commit series has no whitespace errors. This is a behavior-preserving decomposition, not a completed type-safety refactor.

## Evidence

- Page reduction is traceable commit-by-commit: Phases A–G changed `page.tsx` from 4,134 to 1,915 lines, then P2 extraction brought it to 1,221 lines.
- Current budget is 1,224 lines. The merged page has 1,221 content lines; `page-size-budget.test.ts` keeps the controller from regrowing.
- P2 modules confirmed present and imported by the controller: `useBootstrapData`, `useMusePersistence`, `OnboardingFlow`, `AuthScreen`, `buildFilteredProfiles`, `VerificationBanner`, and `makeConfettiPieces`.
- No later `origin/main` change modifies those split files.
- `git diff --check bffd6ee^..8d2417b -- src/app/(muse)/muse` completed cleanly.
- Existing focused tests passed: `page-size-budget`, `page-helpers`, `useMusePersistence`, and `discover-deck`: 4 files, 25 tests, 0 failures.
- A full TypeScript command completed without emitted diagnostics in this environment. The project has historical type-drift caveats recorded in `AGENTS.md`; this review does not erase that baseline.

## Design check

The split direction is sound:

- Screen rendering, modals and domain effects are outside the main controller.
- Stateful API/bootstrap behavior stays in hooks; persistence and deck construction expose pure functions for testability.
- The deck builder preserves its intended ordering: ranked live profiles lead, demo profiles are gated, card order is stable per mount, and target distance privacy is honored.
- Persistence has pure payload/hydration helpers and guards stale/future schemas. Its parity coverage is the strongest extraction-specific coverage in this group.

## Follow-up work for the source owner

These are maintainability items, not a request to change behavior during the current rollout.

1. Replace broad `any` contracts. `AuthScreen` accepts 21 props and `OnboardingFlow` 32; both use `any` heavily. The focused lint run reports 296 warnings across the controller and selected P2 modules, dominated by these contracts.
2. Introduce small view-model/action objects before additional prop drilling. The current controller still imports a large number of hooks and passes large bags of state into screens/modals.
3. Add direct component tests for authentication, onboarding, and the verification banner. Their extraction is currently covered mainly by compile/lint/runtime paths rather than targeted behavior tests.
4. Add one bootstrap-data test covering feed normalization and the dedup guard, since it contains a documented regression fix and coordinates several parallel requests.
5. Resolve the `useMemo` exhaustive-dependency warning around the persistence setter bag deliberately. React state setters are stable, but an explicit local rationale or a typed factory would make the intended invariant clearer.

## Review boundary

No application source, test, deployment, database, or user data was changed by this audit. Follow-up implementation belongs to the current source owner to avoid overlapping work.
