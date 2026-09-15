// gate.js — the Gate: the Floor runs first, mandatory, for every Station —
// it cannot be skipped by forgetting to wire it in. Only if the Floor
// passes does an optional pluggable scorer run (a second model call, a
// heuristic, or nothing at all). The Rungs (Clear / Flag / Hold) is the
// verdict vocabulary either path returns. The Cutoff is checked first of
// all: when engaged, every Gate returns Hold, network-wide, regardless of
// what the Floor or the scorer would otherwise have said.

import { runFloor } from './floor.js';
import { isEngaged } from './cutoff.js';

const DEFAULT_THRESHOLDS = { clear: 0.8, flag: 0.5 };

/**
 * @param {*} output
 * @param {object} station
 * @param {object} [options]
 * @param {object[]} [options.floorRules]
 * @param {(output: *, station: object) => {score: number, reason: string}} [options.scorer]
 * @param {{clear: number, flag: number}} [options.thresholds]
 * @param {string} [options.cutoffPath]
 * @param {object} [options.floorContext]
 * @returns {{tier: 'Clear'|'Flag'|'Hold', floor: object, scorer: object|null, reason: string}}
 */
export function runGate(output, station, options = {}) {
  const {
    floorRules = [],
    scorer = null,
    thresholds = DEFAULT_THRESHOLDS,
    cutoffPath = null,
    floorContext = {},
  } = options;

  if (cutoffPath && isEngaged(cutoffPath)) {
    return {
      tier: 'Hold',
      floor: { pass: false, rule: 'cutoff', reason: 'the Cutoff is engaged; every Gate returns Hold until it is lifted' },
      scorer: null,
      reason: 'the Cutoff is engaged',
    };
  }

  const floorResult = runFloor(output, floorRules, floorContext);
  if (!floorResult.pass) {
    return {
      tier: 'Hold',
      floor: floorResult,
      scorer: null,
      reason: `Floor rule "${floorResult.rule}" failed: ${floorResult.reason}`,
    };
  }

  if (!scorer) {
    return {
      tier: 'Clear',
      floor: floorResult,
      scorer: null,
      reason: 'the Floor passed and no scorer is configured for this Station, which defaults to Clear',
    };
  }

  const scoreResult = scorer(output, station);
  const tier = scoreResult.score >= thresholds.clear ? 'Clear' : scoreResult.score >= thresholds.flag ? 'Flag' : 'Hold';
  return {
    tier,
    floor: floorResult,
    scorer: scoreResult,
    reason: `scorer returned ${scoreResult.score} (${scoreResult.reason}) -> ${tier}`,
  };
}
