// run.js — the document-review demo. Three Stations (Drafter, Reviewer,
// Publisher), a stubbed executor per Station, zero live model calls, zero
// network calls. Runs three scenarios end to end so all three pipeline
// outcomes are visible from a fresh clone in under 5 minutes:
//   1. a clean run that completes
//   2. a run the Floor halts (Hold)
//   3. a run the Coupling rejects (a malformed handoff, hard-rejected)
// then prints a Loopback digest built from the Trail those three left behind.

import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { runPipeline } from '../../src/pipeline.js';
import { buildDigest, formatDigest } from '../../src/loopback.js';
import { loadStations } from '../../src/station.js';
import { draftExecutor, brokenDraftExecutor, reviewExecutor, publishExecutor } from './executors.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const stationsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'stations.json'), 'utf8'));
const gateRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'gate-rules.json'), 'utf8'));
const stations = loadStations(stationsRaw);

const dataDir = path.join(__dirname, '..', '..', 'data');
const trailPath = path.join(dataDir, 'demo-trail.jsonl');
const cutoffPath = path.join(dataDir, 'cutoff.json');

const executors = { Drafter: draftExecutor, Reviewer: reviewExecutor, Publisher: publishExecutor };

function gateConfigFor(stationName) {
  return gateRules[stationName] ?? {};
}

async function runScenario(label, input, executorOverrides = {}) {
  console.log(`\n=== Scenario: ${label} ===`);
  const merged = { ...executors, ...executorOverrides };
  const result = await runPipeline({
    stations,
    executors: merged,
    initialInput: input,
    trailPath,
    cutoffPath,
    gateConfigFor,
  });
  console.log(`Status: ${result.status}`);
  if (result.status === 'completed') {
    console.log('Final output:', JSON.stringify(result.finalOutput));
  } else if (result.status === 'halted') {
    console.log(`Halted at "${result.haltedAt}": ${result.verdict.reason}`);
  } else if (result.status === 'rejected') {
    console.log(`Rejected at "${result.bouncedTo}": ${result.reason}`);
    for (const e of result.errors) console.log(`  ${e}`);
  }
  return result;
}

export default async function run() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(trailPath)) fs.rmSync(trailPath);
  if (fs.existsSync(cutoffPath)) fs.rmSync(cutoffPath);

  await runScenario('clean run', {
    topic: 'Why append-only logs are boring, and that is the point',
    brief: 'A short piece arguing that boring, greppable memory beats semantic recall for an auditable system.',
  });

  await runScenario('the Floor halts a thin draft', { topic: 'x', brief: 'y' });

  await runScenario(
    'the Coupling rejects a malformed handoff',
    { topic: 'Malformed demo', brief: 'This scenario deliberately breaks its own declared contract.' },
    { Drafter: brokenDraftExecutor },
  );

  console.log('\n=== Loopback digest ===');
  console.log(formatDigest(buildDigest(trailPath)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
