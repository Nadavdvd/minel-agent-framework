// floor.js — the Floor: the cheap, deterministic checks that run before
// any judgment call. No model call, ever. Every rule is plain data (never
// hardcoded logic), so a new rule pack is a config change, not a code
// change. Rules run in order and stop at the first failure, so the Gate
// always carries exactly which rule fired and why — never a vague
// aggregate score.
//
// Shipped rule types are domain-neutral on purpose (spec §2): required-
// field presence, a length/format bound, a duplicate-detection check, and
// a boolean-must-be-true check. None of them assume what the data is
// *about* — they'd judge a code diff or a support reply exactly as well
// as a document draft.

import { createHash } from 'node:crypto';

/**
 * @param {*} output
 * @param {object[]} rules
 * @param {object} [context] - e.g. { recentHashes: string[] } for duplicate-detection
 * @returns {{pass: boolean, rule: string|null, reason: string|null}}
 */
export function runFloor(output, rules, context = {}) {
  for (const rule of rules ?? []) {
    const result = applyRule(rule, output, context);
    if (!result.pass) {
      return { pass: false, rule: rule.name ?? rule.type, reason: result.reason };
    }
  }
  return { pass: true, rule: null, reason: null };
}

function applyRule(rule, output, context) {
  switch (rule.type) {
    case 'required-fields':
      return checkRequiredFields(rule, output);
    case 'length-bound':
      return checkLengthBound(rule, output);
    case 'must-be-true':
      return checkMustBeTrue(rule, output);
    case 'duplicate-detection':
      return checkDuplicate(rule, output, context);
    default:
      throw new Error(`Unknown Floor rule type: "${rule.type}"`);
  }
}

function checkRequiredFields(rule, output) {
  for (const field of rule.fields) {
    const value = output?.[field];
    if (value === undefined || value === null || value === '') {
      return { pass: false, reason: `required field "${field}" missing or empty` };
    }
  }
  return { pass: true };
}

function checkLengthBound(rule, output) {
  const value = output?.[rule.field];
  if (typeof value !== 'string') return { pass: true }; // not applicable to a non-string field
  if (typeof rule.min === 'number' && value.length < rule.min) {
    return { pass: false, reason: `field "${rule.field}" length ${value.length} is below minimum ${rule.min}` };
  }
  if (typeof rule.max === 'number' && value.length > rule.max) {
    return { pass: false, reason: `field "${rule.field}" length ${value.length} exceeds maximum ${rule.max}` };
  }
  return { pass: true };
}

function checkMustBeTrue(rule, output) {
  const value = output?.[rule.field];
  if (value !== true) {
    return { pass: false, reason: `field "${rule.field}" must be true, got ${JSON.stringify(value)}` };
  }
  return { pass: true };
}

function checkDuplicate(rule, output, context) {
  const recentHashes = context.recentHashes || [];
  const hash = hashOutput(output, rule.field);
  if (recentHashes.includes(hash)) {
    return { pass: false, reason: `output${rule.field ? ` on field "${rule.field}"` : ''} duplicates a recent Trail entry for this Station` };
  }
  return { pass: true };
}

/**
 * @param {*} output
 * @param {string} [field]
 * @returns {string}
 */
export function hashOutput(output, field) {
  const target = field ? output?.[field] : output;
  return createHash('sha256').update(JSON.stringify(target)).digest('hex');
}
