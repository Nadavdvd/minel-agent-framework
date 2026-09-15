// index.js — public library entry point.

export { validate } from './schema.js';
export { validateStationConfig, loadStations } from './station.js';
export { checkContract, checkCoupling } from './coupling.js';
export { runFloor, hashOutput } from './floor.js';
export { runGate } from './gate.js';
export { isEngaged, getState, engage, disengage } from './cutoff.js';
export { appendRecord, readTrail } from './trail.js';
export { buildDigest, formatDigest } from './loopback.js';
export { runPipeline } from './pipeline.js';
