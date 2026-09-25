// Consumed by Google `@lhci/cli` (`lhci autorun`), invoked pinned from ci.yml as
// `npx --package=@lhci/cli@0.15.1 lhci autorun`.
//
// RESOLVED 2026-09-25: package.json no longer depends on the legacy third-party
// `lighthouse-ci@^1.13.1` (andreasonny83 — bin `lighthouse-ci <url>`), which was
// NOT @lhci/cli and pulled a 9-vuln DEV-only chain (cookie/raven/lodash.set/got/
// update-notifier via lighthouse@8). It was unused by every script and workflow
// and has been removed. `npm audit` is now 0 vulnerabilities for both prod and
// the full tree.
//
// Assertion thresholds below are intentional gates; do not lower them.
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/muse/landing', 'http://localhost:3000/muse'],
      numberOfRuns: 3,
      settings: {
        headful: false,
        preset: 'desktop',
        // Do NOT set staticDistDir: the job starts a live `next start` server
        // (see ci.yml lighthouse job). staticDistDir would switch LHCI to
        // static-file mode and ignore the running app.
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'categories:pwa': ['off'],
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'max-potential-fid': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      command: 'npx next start -p 3000',
      port: 3000,
    },
  },
};