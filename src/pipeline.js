// pipeline.js — wires a run: for each Station in order, run its executor,
// check the output through the Gate, confirm the output honors the
// Station's own declared output_contract, and — if it isn't the last
// Station — check the Coupling to the next Station before handing off.
// Every step writes one record to the Trail, pass or fail, so the run's
// full history is on disk even when it halts partway through.

import crypto from 'node:crypto';
import { checkContract, checkCoupling } from './coupling.js';
import { runGate } from './gate.js';
import { appendRecord } from './trail.js';

/**
 * @param {object} config
 * @param {object[]} config.stations
 * @param {Record<string, (input: *, station: object) => (Promise<*>|*)>} config.executors
 * @param {*} config.initialInput
 * @param {string} [config.trailPath]
 * @param {string} [config.cutoffPath]
 * @param {object} [config.gateConfig] - applied to every Station uniformly
 * @param {(stationName: string) => object} [config.gateConfigFor] - per-Station override; takes precedence over gateConfig
 * @param {string} [config.runId]
 * @returns {Promise<{status: 'completed'|'halted'|'rejected', records: object[], [key: string]: *}>}
 */
export async function runPipeline(config) {
  const {
    stations,
    executors,
    initialInput,
    trailPath,
    cutoffPath,
    gateConfig = {},
    gateConfigFor,
    runId = crypto.randomUUID(),
  } = config;

  let currentInput = initialInput;
  const records = [];

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const executor = executors[station.name];
    if (typeof executor !== 'function') {
      throw new Error(`No executor registered for Station "${station.name}"`);
    }

    const inputHash = hash(currentInput);
    const output = await executor(currentInput, station);

    const gateOptions = typeof gateConfigFor === 'function' ? gateConfigFor(station.name) : gateConfig;
    const verdict = runGate(output, station, { ...gateOptions, cutoffPath });

    const record = {
      run_id: runId,
      station: station.name,
      input_hash: inputHash,
      output,
      gate_verdict: verdict,
      timestamp: new Date().toISOString(),
    };
    if (trailPath) appendRecord(trailPath, record);
    records.push(record);

    if (verdict.tier === 'Hold') {
      return { status: 'halted', haltedAt: station.name, verdict, records };
    }

    // Did the Station honor its own declared output_contract? Checked
    // before the Coupling to the next Station, so a self-contract breach
    // is attributed to the Station that made the promise, not the
    // boundary that happened to notice it.
    const selfCheck = checkContract(output, station.output_contract);
    if (!selfCheck.ok) {
      return {
        status: 'rejected',
        bouncedTo: station.name,
        reason: `"${station.name}" violated its own declared output_contract`,
        errors: selfCheck.errors,
        records,
      };
    }

    const nextStation = stations[i + 1];
    if (nextStation) {
      const couplingResult = checkCoupling(output, station, nextStation);
      if (!couplingResult.ok) {
        return {
          status: 'rejected',
          bouncedTo: station.name,
          reason: `the Coupling from "${station.name}" to "${nextStation.name}" rejected this output`,
          errors: couplingResult.errors,
          records,
        };
      }
    }

    currentInput = output;
  }

  return { status: 'completed', finalOutput: currentInput, records };
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
