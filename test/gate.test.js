import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runGate } from '../src/gate.js';
import { engage, disengage } from '../src/cutoff.js';

function tmpCutoffPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'minel-gate-')), 'cutoff.json');
}

test('Floor failure forces Hold even with no scorer configured', () => {
  const rules = [{ name: 'req', type: 'required-fields', fields: ['x'] }];
  const verdict = runGate({}, { name: 'S' }, { floorRules: rules });
  assert.equal(verdict.tier, 'Hold');
  assert.equal(verdict.scorer, null);
});

test('Floor pass + no scorer defaults to Clear', () => {
  const verdict = runGate({ x: 1 }, { name: 'S' }, { floorRules: [] });
  assert.equal(verdict.tier, 'Clear');
});

test('a scorer above the clear threshold yields Clear', () => {
  const scorer = () => ({ score: 0.9, reason: 'looks good' });
  const verdict = runGate({}, { name: 'S' }, { floorRules: [], scorer });
  assert.equal(verdict.tier, 'Clear');
});

test('a scorer in the middle band yields Flag', () => {
  const scorer = () => ({ score: 0.6, reason: 'middling' });
  const verdict = runGate({}, { name: 'S' }, { floorRules: [], scorer });
  assert.equal(verdict.tier, 'Flag');
});

test('a scorer below the flag threshold yields Hold', () => {
  const scorer = () => ({ score: 0.1, reason: 'bad' });
  const verdict = runGate({}, { name: 'S' }, { floorRules: [], scorer });
  assert.equal(verdict.tier, 'Hold');
});

test('the scorer never runs when the Floor already failed', () => {
  let scorerCalled = false;
  const scorer = () => {
    scorerCalled = true;
    return { score: 1, reason: 'irrelevant' };
  };
  const rules = [{ name: 'req', type: 'required-fields', fields: ['missing'] }];
  runGate({}, { name: 'S' }, { floorRules: rules, scorer });
  assert.equal(scorerCalled, false);
});

test('an engaged Cutoff forces Hold network-wide, overriding a perfect Floor and scorer', () => {
  const cutoffPath = tmpCutoffPath();
  engage(cutoffPath, 'test cutoff');
  try {
    const scorer = () => ({ score: 1, reason: 'would have been perfect' });
    const verdict = runGate({ x: 1 }, { name: 'S' }, { floorRules: [], scorer, cutoffPath });
    assert.equal(verdict.tier, 'Hold');
    assert.equal(verdict.scorer, null); // never reached
  } finally {
    disengage(cutoffPath);
  }
});

test('a lifted Cutoff no longer forces Hold', () => {
  const cutoffPath = tmpCutoffPath();
  engage(cutoffPath, 'temp');
  disengage(cutoffPath);
  const verdict = runGate({ x: 1 }, { name: 'S' }, { floorRules: [], cutoffPath });
  assert.equal(verdict.tier, 'Clear');
});
