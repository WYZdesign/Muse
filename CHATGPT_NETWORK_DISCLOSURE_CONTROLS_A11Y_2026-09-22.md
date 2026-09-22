# Network disclosure controls accessibility batch — 2026-09-22

## Local changes ready for review

`src/app/(muse)/muse/screens/NetworkScreen.tsx`

- Forum-post category disclosure is a native 44px-minimum button.
- Professional skill disclosures are native 44px-minimum buttons.
- Professional badge disclosures are native 44px-minimum buttons.

These replace focusable `span role="button"` controls that did not implement
keyboard activation. Native buttons provide correct semantics and Enter/Space
behavior.

## Local validation

- TypeScript syntax transpilation passed.
- `git diff --check HEAD` found no whitespace errors (line-ending notices only).

## Deployment checks

1. Confirm badge wrapping stays readable at narrow mobile widths.
2. Verify keyboard activation opens the informational disclosure without
   triggering surrounding navigation.
3. Run elevated build and test suites before commit/deploy.
