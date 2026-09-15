import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkContract, checkCoupling } from '../src/coupling.js';

const from = { name: 'A', output_contract: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } };
const to = { name: 'B', input_contract: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } };

test('checkContract passes an output that matches the contract', () => {
  assert.equal(checkContract({ x: 'ok' }, from.output_contract).ok, true);
});

test('checkCoupling passes when the output matches the next Station input_contract', () => {
  const result = checkCoupling({ x: 'ok' }, from, to);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('checkCoupling hard-rejects a mismatch, never coerces the value', () => {
  const result = checkCoupling({ x: 42 }, from, to);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
  // Named boundary in the error, not a bare "invalid"
  assert.ok(result.errors[0].includes('"A" -> "B"'));
});

test('checkCoupling rejects a missing required field rather than defaulting it', () => {
  const result = checkCoupling({}, from, to);
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes('required field missing'));
});
