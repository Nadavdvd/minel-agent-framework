import { test } from 'node:test';
import assert from 'node:assert/strict';

// Poison global fetch before the demo module tree loads, so any executor
// that tried to make a live network call would throw immediately. The
// demo is required to prove itself with zero live model or network calls
// (spec §3, out of scope for v1) — this makes that claim falsifiable
// instead of taking the code's comments on faith.
const originalFetch = globalThis.fetch;
globalThis.fetch = () => {
  throw new Error('demo made a network call — it must run entirely offline');
};

const run = (await import('../examples/document-review/run.js')).default;

test('the demo runs end to end with zero network calls and produces the three documented outcomes', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await run();
  } finally {
    console.log = originalLog;
    globalThis.fetch = originalFetch;
  }

  const output = logs.join('\n');
  assert.ok(output.includes('Status: completed'), 'clean-run scenario should complete');
  assert.ok(output.includes('Status: halted'), 'thin-draft scenario should be halted by the Floor');
  assert.ok(output.includes('Status: rejected'), 'malformed-handoff scenario should be rejected by the Coupling');
  assert.ok(output.includes('Loopback digest'), 'the run should print a digest built from the Trail it just wrote');
});
