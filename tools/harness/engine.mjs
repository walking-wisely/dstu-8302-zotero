import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cacheDir = join(root, '.cache', 'zotero-engine');
const omniCandidates = [
  process.env.ZOTERO_OMNI,
  '/Applications/Zotero.app/Contents/Resources/app/omni.ja',
].filter(Boolean);
const P = 'chrome/content/zotero';

function fromOmni(inner, dest) {
  const out = join(cacheDir, dest);
  if (existsSync(out)) return readFileSync(out, 'utf8');
  const omni = omniCandidates.find(existsSync);
  if (!omni) throw new Error('Zotero omni.ja not found; set ZOTERO_OMNI');
  const data = execFileSync('unzip', ['-p', omni, inner], { maxBuffer: 64 << 20 });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, data);
  return data.toString('utf8');
}

let CSL;
export function loadCSL() {
  if (CSL) return CSL;
  const src = fromOmni(`${P}/xpcom/citeproc.js`, 'citeproc.js');
  CSL = vm.runInNewContext(`${src}\n;CSL`, {});
  return CSL;
}

export function engineInfo() {
  return { citeproc: loadCSL().PROCESSOR_VERSION, source: 'Zotero omni.ja' };
}

const localeCache = new Map();
function localeXml(lang) {
  if (localeCache.has(lang)) return localeCache.get(lang);
  let xml = false;
  try { xml = fromOmni(`${P}/locale/csl/locales-${lang}.xml`, `locales-${lang}.xml`); } catch {}
  localeCache.set(lang, xml);
  return xml;
}

export function makeEngine(styleXml, items, { lang = 'uk-UA', format = 'text', shim = null } = {}) {
  const CSL = loadCSL();
  const byId = new Map(items.map(i => [String(i.id), i]));
  const sys = {
    retrieveLocale: localeXml,
    retrieveItem: id => {
      const item = structuredClone(byId.get(String(id)));
      return shim ? shim(item) : item;
    },
  };
  const engine = new CSL.Engine(sys, styleXml, lang, false);
  engine.setOutputFormat(format);
  engine.opt.development_extensions.wrap_url_and_doi = true;
  engine.opt.development_extensions.parse_names = false;
  return engine;
}

/** Feed clusters in order like the word-processor integration does. Returns one string per cluster. */
export function renderSequence(engine, clusters) {
  const done = [];
  const out = [];
  clusters.forEach((cluster, i) => {
    const citation = { citationID: `c${i}`, citationItems: cluster.map(ci => ({ ...ci })), properties: { noteIndex: i + 1 } };
    const pre = done.map(c => [c.citationID, c.properties.noteIndex]);
    const [, changed] = engine.processCitationCluster(citation, pre, []);
    for (const [idx, text] of changed) out[idx] = text;
    done.push(citation);
  });
  return out;
}

export function renderBibliography(engine, ids, omitted = []) {
  engine.updateItems(ids.map(String));
  const bib = engine.makeBibliography();
  if (!bib) return [];
  return bib[1].filter((_, i) => !bib[0].entry_ids[i].some(id => omitted.includes(String(id)))).map(s => s.trim());
}
