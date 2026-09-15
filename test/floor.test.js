import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFloor, hashOutput } from '../src/floor.js';

test('empty rule list always passes', () => {
  assert.deepEqual(runFloor({ a: 1 }, []), { pass: true, rule: null, reason: null });
});

test('required-fields fails on a missing field and names it', () => {
  const rules = [{ name: 'req', type: 'required-fields', fields: ['a', 'b'] }];
  const result = runFloor({ a: 1 }, rules);
  assert.equal(result.pass, false);
  assert.equal(result.rule, 'req');
  assert.ok(result.reason.includes('"b"'));
});

test('length-bound fails below the minimum', () => {
  const rules = [{ name: 'len', type: 'length-bound', field: 'draft', min: 10 }];
  const result = runFloor({ draft: 'short' }, rules);
  assert.equal(result.pass, false);
});

test('length-bound fails above the maximum', () => {
  const rules = [{ name: 'len', type: 'length-bound', field: 'draft', max: 3 }];
  const result = runFloor({ draft: 'toolong' }, rules);
  assert.equal(result.pass, false);
});

test('must-be-true fails on false and on a missing field', () => {
  const rules = [{ name: 'pub', type: 'must-be-true', field: 'published' }];
  assert.equal(runFloor({ published: false }, rules).pass, false);
  assert.equal(runFloor({}, rules).pass, false);
  assert.equal(runFloor({ published: true }, rules).pass, true);
});

test('duplicate-detection fails when the hash is already in recentHashes', () => {
  const rules = [{ name: 'dup', type: 'duplicate-detection', field: 'draft' }];
  const output = { draft: 'same content' };
  const priorHash = hashOutput(output, 'draft');
  const result = runFloor(output, rules, { recentHashes: [priorHash] });
  assert.equal(result.pass, false);
});

test('rules run in order and stop at the first failure', () => {
  const rules = [
    { name: 'first', type: 'required-fields', fields: ['missing'] },
    { name: 'second', type: 'must-be-true', field: 'x' },
  ];
  const result = runFloor({}, rules);
  assert.equal(result.rule, 'first');
});

test('an unknown rule type throws rather than silently passing', () => {
  const rules = [{ name: 'bad', type: 'not-a-real-rule' }];
  assert.throws(() => runFloor({}, rules));
});
