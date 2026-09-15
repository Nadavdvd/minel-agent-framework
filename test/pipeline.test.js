import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPipeline } from '../src/pipeline.js';
import { readTrail } from '../src/trail.js';
import { engage, disengage } from '../src/cutoff.js';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'minel-pipeline-'));
}

const stationA = {
  name: 'A',
  purpose: 'produce a value',
  input_contract: { type: 'object' },
  output_contract: { type: 'object', required: ['v'], properties: { v: { type: 'integer' } } },
};

const stationB = {
  name: 'B',
  purpose: 'consume A\'s value',
  input_contract: { type: 'object', required: ['v'], properties: { v: { type: 'integer' } } },
  output_contract: { type: 'object', required: ['done'], properties: { done: { type: 'boolean' } } },
};

test('a two-Station pipeline completes when every output honors its contracts', async () => {
  const dir = tmpDir();
  const result = await runPipeline({
    stations: [stationA, stationB],
    executors: { A: () => ({ v: 1 }), B: (input) => ({ done: input.v === 1 }) },
    initialInput: {},
    trailPath: path.join(dir, 'trail.jsonl'),
  });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.finalOutput, { done: true });
});

test('a Coupling mismatch hard-rejects the run, it never coerces the bad output through', async () => {
  const dir = tmpDir();
  const result = await runPipeline({
    stations: [stationA, stationB],
    // A's own output_contract requires v: integer; this executor returns a string.
    executors: { A: () => ({ v: 'not-an-integer' }), B: () => ({ done: true }) },
    initialInput: {},
    trailPath: path.join(dir, 'trail.jsonl'),
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.bouncedTo, 'A');
  assert.ok(result.errors.some((e) => e.includes('integer')));
  // B's executor must never have been reached with the bad value.
});

test('a Floor Hold halts the pipeline before the next Station runs', async () => {
  const dir = tmpDir();
  let bCalled = false;
  const result = await runPipeline({
    stations: [stationA, stationB],
    executors: {
      A: () => ({ v: 1 }),
      B: () => {
        bCalled = true;
        return { done: true };
      },
    },
    initialInput: {},
    trailPath: path.join(dir, 'trail.jsonl'),
    gateConfigFor: (name) => (name === 'A' ? { floorRules: [{ name: 'always-fail', type: 'must-be-true', field: 'nope' }] } : {}),
  });
  assert.equal(result.status, 'halted');
  assert.equal(result.haltedAt, 'A');
  assert.equal(bCalled, false);
});

test('an engaged Cutoff halts every Station\'s Gate, network-wide, regardless of a valid output', async () => {
  const dir = tmpDir();
  const cutoffPath = path.join(dir, 'cutoff.json');
  engage(cutoffPath, 'halt for the test');
  try {
    const result = await runPipeline({
      stations: [stationA],
      executors: { A: () => ({ v: 1 }) },
      initialInput: {},
      trailPath: path.join(dir, 'trail.jsonl'),
      cutoffPath,
    });
    assert.equal(result.status, 'halted');
    assert.equal(result.verdict.reason, 'the Cutoff is engaged');
  } finally {
    disengage(cutoffPath);
  }
});

test('every step — pass or fail — writes exactly one record to the Trail', async () => {
  const dir = tmpDir();
  const trailPath = path.join(dir, 'trail.jsonl');
  await runPipeline({
    stations: [stationA, stationB],
    executors: { A: () => ({ v: 'bad' }), B: () => ({ done: true }) },
    initialInput: {},
    trailPath,
  });
  const records = readTrail(trailPath);
  assert.equal(records.length, 1); // halted at A before B ever ran
  assert.equal(records[0].station, 'A');
  assert.ok(records[0].run_id);
  assert.ok(records[0].timestamp);
});

test('throws a clear error when a Station has no registered executor', async () => {
  await assert.rejects(
    () =>
      runPipeline({
        stations: [stationA],
        executors: {},
        initialInput: {},
      }),
    /No executor registered for Station "A"/,
  );
});
