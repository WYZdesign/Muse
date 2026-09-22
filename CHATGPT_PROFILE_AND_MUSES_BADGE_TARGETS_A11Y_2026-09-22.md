# Profile and Muses badge target batch — 2026-09-22

## Local changes

- `MusesScreen.tsx`: Interested and Pro badge disclosures now have 44px
  minimum targets while retaining their existing keyboard handlers and card
  event isolation.
- `ProfileScreen.tsx`: Founding/Early Member and earned-badge disclosures are
  native buttons with 44px minimum heights.

## Local validation

- TypeScript syntax transpilation passed for both changed screens.
- `git diff --check HEAD` found no whitespace errors (line-ending notices
  only).

## Deployment checks

1. Confirm Muses card badges do not overlap at narrow widths.
2. Confirm all badge explanations open through keyboard activation.
3. Run elevated build and test suites before deployment.
