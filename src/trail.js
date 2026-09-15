// trail.js — the Trail: an append-only JSON Lines log of every Station
// invocation (role, input hash, output, Gate verdict, timestamp, run ID).
// Never rewritten, never truncated — only appended to. Append is atomic
// on POSIX filesystems, so this needs no lock: a concurrent reader always
// sees either the old file or the file plus one whole new line, never a
// torn write. This is the raw material the Loopback reads; the Trail
// itself has no opinions and nothing else ever mutates a written line.

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} trailPath
 * @param {object} record
 */
export function appendRecord(trailPath, record) {
  fs.mkdirSync(path.dirname(trailPath), { recursive: true });
  fs.appendFileSync(trailPath, `${JSON.stringify(record)}\n`, 'utf8');
}

/**
 * @param {string} trailPath
 * @returns {object[]}
 */
export function readTrail(trailPath) {
  if (!fs.existsSync(trailPath)) return [];
  const raw = fs.readFileSync(trailPath, 'utf8');
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}
