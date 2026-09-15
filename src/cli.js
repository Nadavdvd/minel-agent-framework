// cli.js — command dispatch for the `minel-agents` CLI.

import path from 'node:path';
import { engage, disengage, getState } from './cutoff.js';
import { buildDigest, formatDigest } from './loopback.js';

/**
 * @param {string[]} argv
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  switch (command) {
    case 'demo':
      return runDemo();
    case 'cutoff':
      return handleCutoff(rest);
    case 'trail':
      return handleTrail(rest);
    default:
      printHelp();
  }
}

async function runDemo() {
  const mod = await import('../examples/document-review/run.js');
  await mod.default();
}

function handleCutoff([sub, ...rest]) {
  const cutoffPath = resolveCutoffPath();
  if (sub === 'on') {
    const reasonIdx = rest.indexOf('--reason');
    const reason = reasonIdx >= 0 ? rest[reasonIdx + 1] : 'manual cutoff';
    engage(cutoffPath, reason);
    console.log(`Cutoff engaged: ${reason}`);
  } else if (sub === 'off') {
    disengage(cutoffPath);
    console.log('Cutoff lifted.');
  } else if (sub === 'status') {
    console.log(JSON.stringify(getState(cutoffPath), null, 2));
  } else {
    console.log('Usage: minel-agents cutoff <on|off|status> [--reason "..."]');
  }
}

function handleTrail([sub, trailPath]) {
  if (sub === 'digest' && trailPath) {
    console.log(formatDigest(buildDigest(trailPath)));
  } else {
    console.log('Usage: minel-agents trail digest <path-to-trail.jsonl>');
  }
}

function resolveCutoffPath() {
  return path.join(process.cwd(), 'data', 'cutoff.json');
}

function printHelp() {
  console.log(`minel-agent-framework CLI

Usage:
  minel-agents demo                    run the bundled document-review demo
  minel-agents cutoff on|off|status     engage / lift / inspect the Cutoff
  minel-agents trail digest <path>      print a Loopback digest for a Trail file
`);
}
