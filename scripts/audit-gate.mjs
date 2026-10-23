#!/usr/bin/env node
/**
 * Dependency audit gate with a reviewed, narrow allowlist.
 *
 * Replaces the bare `npm audit --audit-level=high` steps, which fail on
 * advisories that cannot be fixed without breaking the deploy. Every exception
 * below is a specific GHSA id, reviewed by hand. Any NEW high or critical
 * advisory still fails this gate - including a new advisory inside an
 * already-allowlisted package, because ids are matched exactly and nothing is
 * allowlisted by package name.
 *
 *   node scripts/audit-gate.mjs              # full tree (prod + dev)
 *   node scripts/audit-gate.mjs --omit-dev   # production tree only
 *   node scripts/audit-gate.mjs --selftest   # prove the FAIL path still works
 *
 * Exits 0 when only allowlisted findings remain, 1 otherwise.
 */
import { spawnSync } from "node:child_process";

/**
 * Reviewed exceptions. Each is tied to a GHSA id and a reason. Delete an entry
 * the moment its advisory stops being reported (the run prints "no longer
 * reported" for anything stale).
 *
 * Reviewed 2026-10-22. The tree is clean (0 advisories), so the allowlist is
 * empty. Keep the map and DEV_ONLY so a future reviewed exception has one
 * narrow, obvious place to live.
 */
const ALLOWLIST = new Map([]);

/** Entries that only ever appear in the dev tree. */
const DEV_ONLY = new Set([]);

const SEVERITIES = new Set(["high", "critical"]);
const GHSA_RE = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i;

/** Pure evaluation - no I/O, so it can be unit-tested with synthetic reports. */
function evaluate(report, { omitDev, allowlist = ALLOWLIST, devOnly = DEV_ONLY }) {
  const vulns = report?.vulnerabilities || {};

  /** Every GHSA id reachable from a package's `via` chain. */
  const collectGhsas = (name, seen = new Set()) => {
    if (seen.has(name)) return [];
    seen.add(name);
    const info = vulns[name];
    if (!info) return [];
    const out = [];
    for (const via of info.via || []) {
      if (typeof via === "string") out.push(...collectGhsas(via, seen));
      else if (via && via.url) {
        const id = (String(via.url).match(GHSA_RE) || [])[0];
        if (id) out.push(id.toUpperCase());
      }
    }
    return out;
  };

  const violations = [];
  const allowed = [];
  const seenAllowlisted = new Set();
  let highCritical = 0;

  for (const [name, info] of Object.entries(vulns)) {
    if (!SEVERITIES.has(info.severity)) continue;
    highCritical += 1;
    const ids = [...new Set(collectGhsas(name))];
    if (ids.length === 0) {
      violations.push({ name, severity: info.severity, ids: ["(no advisory id reported)"] });
      continue;
    }
    const blocked = ids.filter((id) => !allowlist.has(id));
    if (blocked.length > 0) {
      violations.push({ name, severity: info.severity, ids: blocked });
    } else {
      allowed.push(name);
      ids.forEach((id) => seenAllowlisted.add(id));
    }
  }

  const stale = [...allowlist.keys()].filter(
    (id) => !seenAllowlisted.has(id) && !(omitDev && devOnly.has(id)),
  );
  return { violations, allowed, seenAllowlisted, stale, highCritical };
}

function runAudit(omitDev) {
  // One string + shell avoids Node's DEP0190 warning about args + shell:true;
  // it is also the only reliable way to invoke npm.cmd on Windows.
  const cmd = `npm audit --json${omitDev ? " --omit=dev" : ""}`;
  const res = spawnSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: true });
  const raw = res.stdout || "";
  try {
    return JSON.parse(raw);
  } catch {
    console.error(`audit-gate: could not parse npm audit output (exit ${res.status})`);
    console.error(raw.slice(0, 2000) || res.stderr || "(no output)");
    process.exit(1);
  }
}

function failure(result, scope) {
  console.error(`\naudit-gate: FAIL (${scope}) - ${result.violations.length} unreviewed high/critical finding(s)`);
  for (const v of result.violations) {
    console.error(`  ${v.name} [${v.severity}] -> ${v.ids.join(", ")}`);
  }
}

function selftest() {
  const advisory = (id, severity = "high") => ({
    severity,
    via: [{ url: `https://github.com/advisories/${id}`, severity, title: id }],
  });
  const allowed = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
  // The production allowlist is empty; the selftest injects its own fixture so
  // the allowlist mechanics stay covered without leaving a stale live entry.
  const fixtureAllow = new Map([["GHSA-VFJ7-8CJW-P6XM", "selftest fixture"]]);
  const fixtureDevOnly = new Set(["GHSA-VFJ7-8CJW-P6XM"]);
  const cases = [
    {
      label: "allowlisted advisory alone -> pass",
      report: { vulnerabilities: { braces: { severity: "high", via: [{ url: allowed, severity: "high" }] } } },
      expect: 0,
    },
    {
      label: "NEW advisory on an allowlisted package -> fail",
      report: {
        vulnerabilities: {
          braces: {
            severity: "high",
            via: [{ url: allowed, severity: "high" }, { url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "high" }],
          },
        },
      },
      expect: 1,
    },
    {
      label: "NEW package high -> fail",
      report: { vulnerabilities: { somepkg: { severity: "critical", via: [{ url: "https://github.com/advisories/GHSA-dddd-eeee-ffff", severity: "critical" }] } } },
      expect: 1,
    },
    {
      label: "high reached only through a string dependency chain -> fail",
      report: {
        vulnerabilities: {
          child: { severity: "high", via: ["parent"] },
          parent: { severity: "high", via: [{ url: "https://github.com/advisories/GHSA-gggg-hhhh-iiii", severity: "high" }] },
        },
      },
      expect: 1,
    },
    {
      label: "allowlisted package pulled in transitively -> pass",
      report: {
        vulnerabilities: { child: { severity: "high", via: ["parent"] }, parent: { severity: "high", via: [{ url: allowed, severity: "high" }] } },
      },
      expect: 0,
    },
  ];

  let bad = 0;
  for (const c of cases) {
    const res = evaluate(c.report, { omitDev: false, allowlist: fixtureAllow, devOnly: fixtureDevOnly });
    const got = res.violations.length === 0 ? 0 : 1;
    const ok = got === c.expect;
    if (!ok) bad += 1;
    console.log(`  [${ok ? "ok " : "FAIL"}] ${c.label} (expected ${c.expect === 0 ? "pass" : "fail"}, got ${got === 0 ? "pass" : "fail"})`);
  }
  console.log(bad === 0 ? "\naudit-gate selftest: PASS" : `\naudit-gate selftest: FAIL (${bad})`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes("--selftest")) selftest();

const omitDev = process.argv.includes("--omit-dev");
const scope = omitDev ? "production tree" : "full tree (prod + dev)";
const result = evaluate(runAudit(omitDev), { omitDev });

console.log(`audit-gate: ${scope}`);
console.log(`  high/critical packages reported: ${result.highCritical}`);
console.log(`  covered by reviewed allowlist:   ${result.allowed.length}`);
for (const id of result.seenAllowlisted) console.log(`     allow: ${id} - ${ALLOWLIST.get(id)}`);
if (result.stale.length) {
  console.log(`\n  NOTE: allowlist entries no longer reported (remove them): ${result.stale.join(", ")}`);
}

if (result.violations.length > 0) {
  failure(result, scope);
  process.exit(1);
}
console.log("\naudit-gate: PASS - no unreviewed high/critical advisories");
