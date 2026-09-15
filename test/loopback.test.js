import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendRecord } from '../src/trail.js';
import { buildDigest } from '../src/loopback.js';

function tmpPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'minel-loopback-')), 'trail.jsonl');
}

test('digest on an empty Trail returns an empty stations map, not an error', () => {
  const digest = buildDigest(tmpPath());
  assert.deepEqual(digest.stations, {});
});

test('digest counts exactly match a hand-built Trail fixture', () => {
  const p = tmpPath();
  const rec = (station, tier, reason) => ({
    station,
    gate_verdict: { tier, reason },
    timestamp: '2026-09-15T00:00:00.000Z',
  });
  appendRecord(p, rec('A', 'Clear'));
  appendRecord(p, rec('A', 'Clear'));
  appendRecord(p, rec('A', 'Hold', 'floor failed once'));
  appendRecord(p, rec('B', 'Flag'));

  const digest = buildDigest(p);
  assert.deepEqual(digest.stations.A, {
    total: 3,
    clear: 2,
    flag: 0,
    hold: 1,
    pass_rate: Number((2 / 3).toFixed(3)),
    recent_failures: [{ reason: 'floor failed once', timestamp: '2026-09-15T00:00:00.000Z' }],
  });
  assert.deepEqual(digest.stations.B, {
    total: 1,
    clear: 0,
    flag: 1,
    hold: 0,
    pass_rate: 1,
    recent_failures: [],
  });
});

test('recent_failures is capped at recentFailuresPerStation, keeping the most recent', () => {
  const p = tmpPath();
  for (let i = 0; i < 5; i++) {
    appendRecord(p, {
      station: 'A',
      gate_verdict: { tier: 'Hold', reason: `fail-${i}` },
      timestamp: `t${i}`,
    });
  }
  const digest = buildDigest(p, { recentFailuresPerStation: 2 });
  assert.deepEqual(
    digest.stations.A.recent_failures.map((f) => f.reason),
    ['fail-3', 'fail-4'],
  );
});

test('the digest reflects the Trail\'s real current contents, not a cached read', () => {
  const p = tmpPath();
  appendRecord(p, { station: 'A', gate_verdict: { tier: 'Clear' }, timestamp: 't0' });
  const first = buildDigest(p);
  assert.equal(first.stations.A.total, 1);

  appendRecord(p, { station: 'A', gate_verdict: { tier: 'Clear' }, timestamp: 't1' });
  const second = buildDigest(p);
  assert.equal(second.stations.A.total, 2);
});
