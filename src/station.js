// station.js — the Station: a configured post in a pipeline. Not a person,
// not a fixed persona — a data record declaring what it's for, what it
// needs handed to it, and what it must hand out. The framework ships zero
// built-in Stations; a project defines however many it needs (3, 5, 12 —
// nothing here assumes a fixed count or fixed identities).
//
// A Station is plain data:
//   { name, purpose, input_contract, output_contract, prompt_template? }
// `prompt_template` is optional and purely documentary in v1 — the
// framework never executes it. Execution is supplied by the caller as an
// executor function (see pipeline.js), which may or may not call a model.

const REQUIRED_FIELDS = ['name', 'purpose', 'input_contract', 'output_contract'];

/**
 * @param {object} station
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateStationConfig(station) {
  const errors = [];
  if (!station || typeof station !== 'object') {
    return { valid: false, errors: ['Station config must be an object'] };
  }
  for (const field of REQUIRED_FIELDS) {
    if (station[field] === undefined || station[field] === null) {
      errors.push(`Station is missing required field "${field}"`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Validates and returns a list of Station configs. Throws on the first
 * structural problem — a malformed Station roster is a build-time error,
 * not something a pipeline should discover mid-run.
 * @param {object[]} rawConfig
 * @returns {object[]}
 */
export function loadStations(rawConfig) {
  if (!Array.isArray(rawConfig)) {
    throw new Error('Station config must be an array of Station definitions');
  }
  const seen = new Set();
  for (const station of rawConfig) {
    const { valid, errors } = validateStationConfig(station);
    if (!valid) {
      throw new Error(`Invalid Station config: ${errors.join('; ')}`);
    }
    if (seen.has(station.name)) {
      throw new Error(`Duplicate Station name "${station.name}"`);
    }
    seen.add(station.name);
  }
  return rawConfig;
}
