import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStationConfig, loadStations } from '../src/station.js';

const minimalStation = {
  name: 'Alpha',
  purpose: 'test',
  input_contract: { type: 'object' },
  output_contract: { type: 'object' },
};

test('a Station with all required fields is valid', () => {
  assert.equal(validateStationConfig(minimalStation).valid, true);
});

test('a Station missing input_contract is invalid, named', () => {
  const { valid, errors } = validateStationConfig({ ...minimalStation, input_contract: undefined });
  assert.equal(valid, false);
  assert.ok(errors[0].includes('input_contract'));
});

test('loadStations rejects a non-array config', () => {
  assert.throws(() => loadStations({ name: 'not-an-array' }));
});

test('loadStations rejects a duplicate Station name', () => {
  assert.throws(() => loadStations([minimalStation, { ...minimalStation }]), /Duplicate Station name/);
});

test('loadStations returns the roster unchanged when valid', () => {
  const roster = [minimalStation, { ...minimalStation, name: 'Beta' }];
  assert.deepEqual(loadStations(roster), roster);
});
