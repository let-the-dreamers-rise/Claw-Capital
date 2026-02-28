import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', '..', 'data');

/**
 * Read a JSON file from the /data directory.
 * @param {string} filename - e.g. 'treasury.json'
 * @returns {object} Parsed JSON data
 */
export function readJSON(filename) {
  if (!filename.endsWith('.json')) filename += '.json';
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    throw new Error(`Data file not found: ${filename}`);
  }
  const raw = readFileSync(filepath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Write data to a JSON file in the /data directory.
 * @param {string} filename - e.g. 'treasury.json'
 * @param {object} data - Data to write
 */
export function writeJSON(filename, data) {
  if (!filename.endsWith('.json')) filename += '.json';
  const filepath = join(DATA_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Append an item to an array inside a JSON file.
 * @param {string} filename - JSON file name
 * @param {string} arrayKey - Key of the array in the JSON
 * @param {object} item - Item to append
 */
export function appendToArray(filename, arrayKey, item) {
  const data = readJSON(filename);
  if (!Array.isArray(data[arrayKey])) {
    data[arrayKey] = [];
  }
  data[arrayKey].push(item);
  writeJSON(filename, data);
  return data;
}
