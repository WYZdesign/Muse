// Lighthouse CI config for Muse — consumed by Google `@lhci/cli` (`lhci autorun`).
//
// KNOWN DEBT (Priority D — never weaken asserts to go green):
// - package.json still depends on legacy third-party `lighthouse-ci@^1.13.1`
//   (andreasonny83 — bin `lighthouse-ci <url>`), which is NOT @lhci/cli and
//   pulls a 9-vuln DEV-only chain (cookie/raven/lodash.set/got/update-notifier
//   via lighthouse@8). `npm audit --omit=dev` is 0 vulns.
// - package.json change is outside Priority D exclusive set → ci.yml invokes
//   pinned `npx --package=@lhci/cli@0.15.1 lhci autorun` so these asserts run.
// - Owner decision pending: replace `lighthouse-ci` with `@lhci/cli` in
//   package.json, then simplify the CI step back to `npx lhci autorun`.
// - Assertion thresholds below are intentional gates; do not lower them.
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