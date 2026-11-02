import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const HANDLING = ['csl', 'csl-variant', 'data', 'shim', 'post', 'manual', 'ai-assist', 'wp', 'out', 'info'];
const FORCE = ['must', 'should', 'may', 'info'];
const NEEDS_FALLBACK = ['shim', 'post', 'manual', 'ai-assist', 'data'];
const norm = s => s.replace(/\s+/g, ' ').trim();

export function loadRules() {
  return readFileSync(join(root, 'rules/rules.jsonl'), 'utf8').split('\n').filter(Boolean)
    .map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`rules.jsonl:${i + 1}: ${e.message}`); } });
}

export function loadCorpus() {
  const dir = join(root, 'tests/corpus');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    .flatMap(f => JSON.parse(readFileSync(join(dir, f), 'utf8')).cases.map(c => ({ ...c, file: f })));
}

export function check() {
  const errors = [];
  const rules = loadRules();
  const standard = join(root, 'docs/dstu-8302-2015.md');
  const text = existsSync(standard) ? norm(readFileSync(standard, 'utf8')) : null;
  if (!text) console.log('quote check skipped: docs/dstu-8302-2015.md is not in this checkout');
  const ids = new Set();
  for (const r of rules) {
    const at = r.id;
    if (ids.has(r.id)) errors.push(`${at}: duplicate id`);
    ids.add(r.id);
    if (!HANDLING.includes(r.handling)) errors.push(`${at}: bad handling "${r.handling}"`);
    if (!FORCE.includes(r.force)) errors.push(`${at}: bad force "${r.force}"`);
    if (text && !text.includes(norm(r.quote))) errors.push(`${at}: quote not found verbatim in docs/dstu-8302-2015.md`);
    if (r.handling !== 'info' && r.handling !== 'wp' && r.handling !== 'out' && !r.phase) errors.push(`${at}: missing phase`);
    if (NEEDS_FALLBACK.includes(r.handling) && !r.fallback) errors.push(`${at}: ${r.handling} needs a fallback description`);
    if (r.force === 'may' && ['csl-variant', 'shim', 'post', 'ai-assist'].includes(r.handling) && !r.variant) errors.push(`${at}: optional rule without variant (needs a test per branch)`);
  }
  const corpus = loadCorpus();
  for (const c of corpus) for (const rid of c.rules || []) if (!ids.has(rid)) errors.push(`corpus ${c.id}: unknown rule ${rid}`);
  return { errors, rules, corpus };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, rules, corpus } = check();
  const covered = new Set(corpus.flatMap(c => c.rules || []));
  const by = {};
  for (const r of rules) by[r.handling] = (by[r.handling] || 0) + 1;
  console.log(`rules: ${rules.length}`, by);
  console.log(`corpus cases: ${corpus.length}; rules with at least one corpus case: ${rules.filter(r => covered.has(r.id)).length}`);
  const untested = rules.filter(r => !covered.has(r.id) && !['info', 'wp', 'out'].includes(r.handling));
  console.log(`rules without corpus case (${untested.length}): ${untested.map(r => r.id).join(', ')}`);
  if (errors.length) { console.error('\nERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('registry OK');
}
