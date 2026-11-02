import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildStyle, FORMS, ZONES, REPEATS, ANALYTICS } from '../../src/styles/build.mjs';
import { makeEngine, renderSequence, renderBibliography } from '../harness/engine.mjs';

const items = [
  { id: 'a', type: 'book', title: 'Книга', author: [{ family: 'Автор', given: 'А. А.' }], publisher: 'Вид-во', 'publisher-place': 'Київ', issued: { 'date-parts': [[2020]] }, language: 'uk' },
  { id: 'b', type: 'article-journal', title: 'Стаття', 'container-title': 'Журнал', issued: { 'date-parts': [[2021]] }, page: '1-2', URL: 'http://x.y', accessed: { 'date-parts': [[2022, 1, 2]] }, language: 'uk' },
];

const dir = mkdtempSync(join(tmpdir(), 'dstu-matrix-'));
const bools = [false, true];
let total = 0;
const failures = [];
for (const form of FORMS) for (const zone of ZONES) for (const repeat of REPEATS) for (const analytic of ANALYTICS) for (const containerOnly of bools) for (const urlOnly of bools) {
  const opts = { form, zone, repeat, analytic, containerOnly, urlOnly };
  const label = JSON.stringify(opts);
  total++;
  try {
    const xml = buildStyle(opts);
    const file = join(dir, 'style.csl');
    writeFileSync(file, xml);
    execFileSync('xmllint', ['--noout', file], { stdio: 'pipe' });
    const cites = renderSequence(makeEngine(xml, items), [[{ id: 'a', locator: '5', label: 'page' }], [{ id: 'a', locator: '5', label: 'page' }], [{ id: 'b' }], [{ id: 'a' }]]);
    const bib = renderBibliography(makeEngine(xml, items), ['a', 'b']);
    const all = [...cites, ...bib].join('\n');
    if (!cites.every(Boolean) || bib.length !== 2 || /CSL STYLE ERROR/.test(all)) failures.push(`${label}: bad output\n${all}`);
  } catch (e) {
    failures.push(`${label}: ${String(e.stderr || e.message).split('\n')[0]}`);
  }
}
console.log(`style matrix: ${total - failures.length}/${total} compile and render`);
if (failures.length) {
  console.log(failures.slice(0, 5).join('\n---\n'));
  process.exit(1);
}
