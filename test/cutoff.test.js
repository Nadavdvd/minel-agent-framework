import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isEngaged, getState, engage, disengage } from '../src/cutoff.js';

function tmpPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'minel-cutoff-')), 'cutoff.json');
}

test('a fresh Cutoff path defaults to not engaged', () => {
  assert.equal(isEngaged(tmpPath()), false);
});

test('engage persists to disk and isEngaged reads it back true', () => {
  const p = tmpPath();
  engage(p, 'reason A');
  assert.equal(isEngaged(p), true);
  assert.equal(getState(p).reason, 'reason A');
});

test('disengage clears the state back to default', () => {
  const p = tmpPath();
  engage(p, 'reason B');
  disengage(p);
  assert.equal(isEngaged(p), false);
  assert.equal(getState(p).reason, null);
});

test('state survives being read by a second, separate call (process-invocation independence)', () => {
  const p = tmpPath();
  engage(p, 'persisted');
  // Simulate a second CLI invocation reading state fresh from disk.
  const stateFromDisk = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(stateFromDisk.engaged, true);
});
