# Live Deployment Verification — 2026-09-22

## Result: not ready for revalidation pass

After the local direct remediation changes recorded in
`CHATGPT_DIRECT_FIXES_2026-09-22.md`, live `https://muse.wyzdesign.com/muse`
was checked again in the rendered production DOM. The changes are **not
deployed** as of this check.

| Check | Required production outcome | Observed live value |
|---|---|---|
| Authenticated-route robots | `noindex, nofollow` | `index, follow` |
| Authenticated-route canonical | omitted/private-safe | `https://www.wyzdesign.com/muse` |
| Pinch zoom | no `user-scalable=no` / no restrictive max scale | `maximum-scale=5, user-scalable=no` |
| Main landmark | one `main` or `[role=main]` | absent |
| Async status primitive | appropriate live/status/alert region | zero regions |

The same sensitive metadata defect was independently observed on
`/muse/admin` during the Admin audit.

## Required wyzmind action

1. Review the local changes, run the required typecheck/test/build suite, and
   deploy them with the related landmark/status work.
2. Record commit SHA and deployed SHA/URL.
3. Request a fresh live verification. Local source edits, a local commit, or a
   successful build do not prove deployment.

## Gate status

**Blocked from demo-ready/open-beta approval** until a deployed build proves
the required metadata and mobile viewport behavior, along with the remaining
functional and safety release items in the master ledger.

## Live keyboard verification: skip link is a broken navigation promise

The live **Skip to main content** link changes the URL to `#muse-main`, but
the rendered DOM has no element with `id="muse-main"`; focus remains on the
skip link after activation. There is also no `main`/`role="main"` landmark.

**Required remediation**: render exactly one durable `<main id="muse-main"
tabIndex={-1}>` around the active application content (or an equivalent
semantic target), then verify activation moves keyboard focus into it across
every mounted screen and overlay transition.
