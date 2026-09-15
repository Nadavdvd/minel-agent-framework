import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendRecord, readTrail } from '../src/trail.js';

function tmpPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'minel-trail-')), 'trail.jsonl');
}

test('readTrail on a non-existent file returns an empty array', () => {
  assert.deepEqual(readTrail(path.join(os.tmpdir(), 'does-not-exist.jsonl')), []);
});

test('appendRecord then readTrail round-trips a single record', () => {
  const p = tmpPath();
  appendRecord(p, { station: 'A', n: 1 });
  const records = readTrail(p);
  assert.equal(records.length, 1);
  assert.equal(records[0].station, 'A');
});

test('the Trail is append-only: multiple appends preserve every prior line', () => {
  const p = tmpPath();
  appendRecord(p, { station: 'A', n: 1 });
  appendRecord(p, { station: 'A', n: 2 });
  appendRecord(p, { station: 'B', n: 3 });
  const records = readTrail(p);
  assert.equal(records.length, 3);
  assert.deepEqual(records.map((r) => r.n), [1, 2, 3]);
});

test('each line is a self-contained JSON object, not a shared structure', () => {
  const p = tmpPath();
  appendRecord(p, { a: 1 });
  appendRecord(p, { b: 2 });
  const raw = fs.readFileSync(p, 'utf8').trim().split('\n');
  assert.equal(raw.length, 2);
  assert.doesNotThrow(() => raw.forEach((line) => JSON.parse(line)));
});
