const norm = s => s.replace(/[‐-―]/g, '-').replace(/\s+/g, ' ').replace(/[⁠⁡⁣⁤]/g, '').trim();

async function runTests({ config, mode }) {
  const report = {
    zotero: Zotero.version,
    mode,
    citeproc: Zotero.CiteProc?.CSL?.PROCESSOR_VERSION ?? null,
    citeprocRs: Zotero.Prefs.get('cite.useCiteprocRs'),
    results: [],
  };
  const cases = JSON.parse(await IOUtils.readUTF8(Services.env.get('DSTU_CASES')));
  const only = Services.env.get('DSTU_ONLY');

  for (const c of cases) {
    if (only && !new RegExp(only).test(c.id)) continue;
    const entry = { id: c.id, needs: c.needs, expected: c.expected };
    try {
      entry.got = await renderCase(c, config);
      const exact = entry.got.length === c.expected.length && c.expected.every((e, i) => e === entry.got[i]);
      const loose = entry.got.length === c.expected.length && c.expected.every((e, i) => norm(e) === norm(entry.got[i]));
      entry.status = exact ? 'pass' : loose ? 'pass-loose' : 'fail';
    }
    catch (e) {
      entry.status = 'error';
      entry.error = `${e}\n${e.stack || ''}`;
    }
    report.results.push(entry);
  }
  return report;
}

async function renderCase(c, config) {
  config.shim = c.shim;
  config.post = c.post;
  config.gender = c.gender;
  if (Services.env.get('DSTU_VIA') === 'word') return renderViaWord(c, await createCaseItems(c, config));
  return renderDirect(c, await createCaseItems(c, config));
}

async function createCaseItems(c, config) {
  let installed = c.styleXml;
  if (Services.env.get('DSTU_STUB') && config.swap !== undefined) {
    const klass = /class="(note|in-text)"/.exec(c.styleXml)[1];
    installed = `<?xml version="1.0" encoding="utf-8"?><style xmlns="http://purl.org/net/xbiblio/csl" class="${klass}" version="1.0" default-locale="uk-UA"><info><id>${c.styleId}</id><title>stub</title><updated>2026-01-01T00:00:00+00:00</updated></info><citation><layout><text value="stub"/></layout></citation><bibliography><layout><text value="stub"/></layout></bibliography></style>`;
    config.swap[c.styleId] = c.styleXml;
  }
  await Zotero.Styles.install({ string: installed }, `${c.id}.csl`, true);
  const style = Zotero.Styles.get(c.styleId);
  if (!style) throw new Error(`style ${c.styleId} not installed`);

  const zotero = new Map();
  for (const csl of c.items) {
    const item = new Zotero.Item();
    item.libraryID = Zotero.Libraries.userLibraryID;
    Zotero.Utilities.Item.itemFromCSLJSON(item, { ...csl, id: undefined });
    addLostFieldsToExtra(item, csl);
    await item.saveTx();
    zotero.set(String(csl.id), item.id);
  }
  return { style, zotero };
}

function renderDirect(c, { style, zotero }) {
  const engine = style.getCiteProc('uk-UA', 'text');

  if (c.kind === 'bib') return bibliography(engine, c.bib.map(id => zotero.get(id)), (c.omit || []).map(id => zotero.get(id)));

  const done = [];
  const out = [];
  c.clusters.forEach((cluster, i) => {
    const citation = {
      citationID: `c${i}`,
      citationItems: cluster.map(ci => ({ ...ci, id: zotero.get(String(ci.id)) })),
      properties: { noteIndex: i + 1 },
    };
    const pre = done.map(d => [d.citationID, d.properties.noteIndex]);
    const [, changed] = engine.processCitationCluster(citation, pre, []);
    for (const [idx, text] of changed) out[idx] = text;
    done.push(citation);
  });
  const shown = c.keep === 'even' ? out.filter((_, i) => i % 2 === 0) : out;
  if (c.withBib) {
    const first = zotero.get(String(c.items[0].id));
    const bib = bibliography(style.getCiteProc('uk-UA', 'text'), [first]);
    return [bib[0], shown[shown.length - 1]];
  }
  return shown;
}

function bibliography(engine, ids, omitted = []) {
  engine.updateItems(ids.map(String));
  const bib = engine.makeBibliography();
  if (bib && omitted.length) Zotero.Cite.removeFromBibliography(bib, new Set(omitted.map(String)));
  return bib ? bib[1].map(s => s.trim()) : [];
}

function datePartsToString(date) {
  const parts = date?.['date-parts']?.[0];
  return parts ? parts.map((p, i) => (i ? String(p).padStart(2, '0') : String(p))).join('-') : null;
}

function nameToExtra(name) {
  return name.literal ?? [name.family, name.given].filter(Boolean).join(' || ');
}

function extraLinesFor(key, value) {
  if (Array.isArray(value)) return value.map(n => `${key}: ${nameToExtra(n)}`);
  if (value && typeof value === 'object') {
    const text = datePartsToString(value);
    return text ? [`${key}: ${text}`] : [];
  }
  return [`${key}: ${value}`];
}

function addLostFieldsToExtra(item, csl) {
  const roundTrip = Zotero.Utilities.Item.itemToCSLJSON(item);
  const skip = new Set(['id', 'type', 'note', 'language']);
  const lines = [];
  for (const [key, value] of Object.entries(csl)) {
    if (skip.has(key) || value === '' || (Array.isArray(value) && !value.length)) continue;
    if (JSON.stringify(roundTrip[key]) === JSON.stringify(value)) continue;
    lines.push(...extraLinesFor(key, value));
  }
  const own = (item.getField('extra') || '').split('\n').filter(Boolean);
  item.setField('extra', [...lines, ...own].join('\n'));
}
