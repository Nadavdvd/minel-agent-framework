// loopback.js — the Loopback: reads what happened in the Trail and turns
// it into a small, read-only digest a future run can put in its own
// context before it starts (recent pass/fail rate per Station, most
// recent failure reasons). v1 is deliberately read-only: it never rewrites
// a Station, a Coupling, or the Trail itself. A consumer who wants
// autonomous self-editing builds that layer on top of the digest this
// module already produces — that loop is not shipped here.

import { readTrail } from './trail.js';

/**
 * @param {string} trailPath
 * @param {object} [options]
 * @param {number} [options.recentFailuresPerStation]
 * @returns {{generated_at: string, stations: object}}
 */
export function buildDigest(trailPath, options = {}) {
  const { recentFailuresPerStation = 3 } = options;
  const records = readTrail(trailPath);
  const byStation = {};

  for (const record of records) {
    const name = record.station;
    if (!byStation[name]) {
      byStation[name] = { total: 0, clear: 0, flag: 0, hold: 0, failures: [] };
    }
    const bucket = byStation[name];
    bucket.total += 1;
    const tier = record.gate_verdict?.tier;
    if (tier === 'Clear') bucket.clear += 1;
    else if (tier === 'Flag') bucket.flag += 1;
    else if (tier === 'Hold') {
      bucket.hold += 1;
      bucket.failures.push({ reason: record.gate_verdict.reason, timestamp: record.timestamp });
    }
  }

  const stations = {};
  for (const [name, bucket] of Object.entries(byStation)) {
    stations[name] = {
      total: bucket.total,
      clear: bucket.clear,
      flag: bucket.flag,
      hold: bucket.hold,
      pass_rate: bucket.total ? Number(((bucket.clear + bucket.flag) / bucket.total).toFixed(3)) : null,
      recent_failures: bucket.failures.slice(-recentFailuresPerStation),
    };
  }

  return { generated_at: new Date().toISOString(), stations };
}

/**
 * @param {{stations: object}} digest
 * @returns {string}
 */
export function formatDigest(digest) {
  const lines = ['Loopback digest (read-only, derived from the Trail):'];
  const names = Object.keys(digest.stations);
  if (names.length === 0) lines.push('  (no Trail records yet)');
  for (const name of names) {
    const s = digest.stations[name];
    lines.push(`- ${name}: ${s.total} run(s), pass rate ${s.pass_rate ?? 'n/a'} (Clear ${s.clear} / Flag ${s.flag} / Hold ${s.hold})`);
    for (const f of s.recent_failures) {
      lines.push(`    last Hold: ${f.reason} (${f.timestamp})`);
    }
  }
  return lines.join('\n');
}
