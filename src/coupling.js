// coupling.js — the Coupling: the shape an output must match to connect to
// the next Station. Checked at the boundary, and bounced back rather than
// forced through if it doesn't fit. A Coupling mismatch is a hard
// rejection — never a silent coercion, never a dropped field.

import { validate } from './schema.js';

/**
 * Checks a Station's actual output against a declared contract (its own
 * output_contract, or the next Station's input_contract).
 * @param {*} output
 * @param {object} contract
 * @returns {{ok: boolean, errors: string[]}}
 */
export function checkContract(output, contract) {
  const { valid, errors } = validate(contract, output);
  return { ok: valid, errors };
}

/**
 * Checks the boundary between two Stations: does `fromStation`'s actual
 * output satisfy `toStation`'s declared input_contract?
 * @param {*} output
 * @param {object} fromStation
 * @param {object} toStation
 * @returns {{ok: boolean, errors: string[]}}
 */
export function checkCoupling(output, fromStation, toStation) {
  const result = checkContract(output, toStation.input_contract);
  if (!result.ok) {
    return {
      ok: false,
      errors: result.errors.map((e) => `"${fromStation.name}" -> "${toStation.name}": ${e}`),
    };
  }
  return { ok: true, errors: [] };
}
