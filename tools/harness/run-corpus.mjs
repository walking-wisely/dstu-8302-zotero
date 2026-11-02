import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEngine, renderSequence, renderBibliography, engineInfo } from './engine.mjs';
import { loadCorpus } from '../rules/check.mjs';
import { buildStyle } from '../../src/styles/build.mjs';
import { optsFor } from './variants.mjs';
import { shimItem } from '../../src/shim/index.mjs';
import { postCluster, postBibliography } from '../../src/post/index.mjs';
import { makeIdemWord } from '../../src/resolver/gender.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const noShim = args.includes('--no-shim');
const noPost = args.includes('--no-post');
const stylePath = args.find(a => !a.startsWith('--'));
const fixedXml = stylePath && readFileSync(stylePath, 'utf8');
const norm = s => s.replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').replace(/⁠|⁣/g, '').trim();

const FILLER = { id: '__filler', type: 'book', title: 'Філер', author: [{ family: 'Філер', given: 'Ф.' }], issued: { 'date-parts': [[1999]] } };

function renderCase(c) {
  let styleXml = fixedXml || buildStyle(optsFor(c));
  if (c.items.some(i => i['citation-number'] != null)) {
    styleXml = styleXml.replaceAll('variable="citation-number"', 'variable="number"');
    c = { ...c, items: c.items.map(i => (i['citation-number'] == null ? i : { ...i, number: String(i['citation-number']) })) };
  }
  if (c.interposed) c = { ...c, items: [...c.items, FILLER] };
  const engineOpts = { shim: noShim ? null : item => shimItem(item, c.shim) };
  const engine = makeEngine(styleXml, c.items, engineOpts);
  const post = noPost ? null : { ...c.post, idemWord: makeIdemWord(c.gender) };
  const bibOut = list => (post ? postBibliography(list, post) : list);
  const wantsBib = c.bib && !c.clusters;
  if (wantsBib && c.omit) return bibOut(renderBibliography(engine, c.bib, c.omit));
  if (wantsBib && !c.post?.complex) return bibOut(renderBibliography(engine, c.bib));
  const clusters = c.interposed ? c.clusters.flatMap((cl, i) => (i ? [[{ id: FILLER.id }], cl] : [cl])) : c.clusters;
  const raw = renderSequence(engine, clusters);
  const all = post ? raw.map(t => postCluster(t, post)) : raw;
  const out = c.interposed ? all.filter((_, i) => i % 2 === 0) : all;
  if (c.form.startsWith('bibliography+')) {
    const bib = bibOut(renderBibliography(makeEngine(styleXml, c.items, engineOpts), c.items.map(i => i.id).slice(0, 1)));
    return [bib[0], out[out.length - 1]];
  }
  return wantsBib ? [out[out.length - 1]] : out;
}

const results = [];
for (const c of loadCorpus()) {
  let got, error;
  try { got = renderCase(c); } catch (e) { error = String(e.message || e); }
  const exp = c.expected;
  const exact = got && exp.length === got.length && exp.every((e, i) => e === got[i]);
  const loose = got && exp.length === got.length && exp.every((e, i) => norm(e) === norm(got[i]));
  results.push({ id: c.id, file: c.file, needs: c.needs || [], rules: c.rules, status: error ? 'error' : exact ? 'pass' : loose ? 'pass-loose' : 'fail', expected: exp, got, error });
}

const count = k => results.filter(r => r.status === k).length;
console.log(`engine: citeproc-js ${engineInfo().citeproc} (from Zotero)  style: ${stylePath ? stylePath.replace(root + '/', '') : 'src/styles/build.mjs'}`);
console.log(`cases: ${results.length}  rendered: ${results.length - count('error')}  pass: ${count('pass') + count('pass-loose')} (loose ${count('pass-loose')})  fail: ${count('fail')}  error: ${count('error')}`);
const byNeed = {};
for (const r of results) for (const n of (r.needs.length ? r.needs : ['plain-csl'])) { const k = n.split(':')[0].split('=')[0]; (byNeed[k] ||= { total: 0, pass: 0 }).total++; if (r.status.startsWith('pass')) byNeed[k].pass++; }
console.log('by dependency:', Object.fromEntries(Object.entries(byNeed).map(([k, v]) => [k, `${v.pass}/${v.total}`])));
if (args.includes('--verbose')) for (const r of results.filter(r => !r.status.startsWith('pass'))) console.log(`\n[${r.status}] ${r.id}\n  exp: ${r.expected.join('\n       ')}\n  got: ${(r.got || [r.error]).join('\n       ')}`);
writeFileSync(join(root, '.cache', 'corpus-last-run.json'), JSON.stringify(results, null, 1));
if (strict) process.exit(results.some(r => !r.status.startsWith('pass') && !r.needs.length) ? 1 : 0);
