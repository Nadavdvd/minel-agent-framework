import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/schema.js';

test('valid object passes with zero errors', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
  const { valid, errors } = validate(schema, { a: 'x' });
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test('missing required field fails with a field-attributed error', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
  const { valid, errors } = validate(schema, {});
  assert.equal(valid, false);
  assert.ok(errors[0].includes('a'));
});

test('wrong type fails and reports both expected and actual', () => {
  const schema = { type: 'object', required: ['n'], properties: { n: { type: 'integer' } } };
  const { valid, errors } = validate(schema, { n: 'not a number' });
  assert.equal(valid, false);
  assert.ok(errors[0].includes('integer'));
  assert.ok(errors[0].includes('string'));
});

test('additionalProperties: false rejects an unexpected field', () => {
  const schema = { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false };
  const { valid, errors } = validate(schema, { a: 'x', b: 'unexpected' });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('.b')));
});

test('string minLength/maxLength are enforced', () => {
  const schema = { type: 'string', minLength: 3, maxLength: 5 };
  assert.equal(validate(schema, 'ab').valid, false);
  assert.equal(validate(schema, 'abc').valid, true);
  assert.equal(validate(schema, 'abcdef').valid, false);
});

test('array items are validated element by element', () => {
  const schema = { type: 'array', items: { type: 'string' } };
  const { valid, errors } = validate(schema, ['a', 2, 'c']);
  assert.equal(valid, false);
  assert.ok(errors[0].includes('[1]'));
});

test('enum rejects a value outside the allowed set', () => {
  const schema = { type: 'string', enum: ['a', 'b'] };
  assert.equal(validate(schema, 'a').valid, true);
  assert.equal(validate(schema, 'z').valid, false);
});
