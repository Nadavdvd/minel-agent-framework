// state.js — small filesystem helpers shared by the Cutoff and anything
// else that needs a durable JSON file. Writes go to a temp file in the
// same directory, then an atomic rename: a reader never observes a
// half-written file, only the old version or the new one.

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} filePath
 * @param {*} fallback
 * @returns {*}
 */
export function readJSON(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * @param {string} filePath
 * @param {*} data
 */
export function writeJSONAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}.${Date.now()}`);
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(data, null, 2), 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}
