#!/usr/bin/env node
// bin/minel.js — thin CLI shim.

import { main } from '../src/cli.js';

main(process.argv.slice(2)).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
