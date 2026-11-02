import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpus } from '../rules/check.mjs';
import { buildStyle } from '../../src/styles/build.mjs';
import { optsFor } from '../harness/variants.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FILLER = { id: '__filler', type: 'book', title: 'Філер', author: [{ family: 'Філер', given: 'Ф.' }], issued: { 'date-parts': [[1999]] } };

function prepare(c) {
  let styleXml = buildStyle(optsFor(c));
  let items = c.items;
  if (items.some(i => i['citation-number'] != null)) {
    styleXml = styleXml.replaceAll('variable="citation-number"', 'variable="number"');
    items = items.map(i => (i['citation-number'] == null ? i : { ...i, number: String(i['citation-number']) }));
  }
  if (c.interposed) items = [...items, FILLER];
  const hash = createHash('sha1').update(styleXml).digest('hex').slice(0, 10);
  styleXml = styleXml.replace(/<id>([^<]*)<\/id>/, `<id>$1-${hash}</id>`);

  const kind = c.bib && !c.clusters ? 'bib' : 'clusters';
  const clusters = kind === 'bib' ? null
    : c.interposed ? c.clusters.flatMap((cl, i) => (i ? [[{ id: FILLER.id }], cl] : [cl])) : c.clusters;
  return {
    id: c.id,
    kind,
    keep: c.interposed ? 'even' : 'all',
    withBib: c.form.startsWith('bibliography+'),
    needs: c.needs || [],
    styleId: /<id>([^<]*)<\/id>/.exec(styleXml)[1],
    styleXml,
    items,
    clusters,
    bib: c.bib || null,
    omit: c.omit || [],
    shim: c.shim || {},
    post: c.post || {},
    gender: c.gender || {},
    expected: c.expected,
  };
}

const cases = loadCorpus().map(prepare);
const dir = join(root, '.cache', 'zotero');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'cases.json'), JSON.stringify(cases));
console.log(`prepared ${cases.length} cases`);
