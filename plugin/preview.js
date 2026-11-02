const previewCache = new Map();

function renderPreview(Zotero, DSTU, config, klass, variantText) {
  const key = `${klass}:${DSTU.normalizeVariant(klass, variantText)}`;
  if (previewCache.has(key)) return previewCache.get(key);

  const items = {};
  for (const sample of Object.values(DSTU.SAMPLE_ITEMS)) items[sample.id] = DSTU.shimItem(JSON.parse(JSON.stringify(sample)), {});

  const system = new Zotero.Cite.System({});
  system.retrieveItem = id => JSON.parse(JSON.stringify(items[id]));
  const engine = new Zotero.CiteProc.CSL.Engine(system, DSTU.variantXml(klass, variantText), 'uk-UA');
  engine.setOutputFormat('html');
  engine.opt.development_extensions.parse_names = false;
  patchEngine(engine, DSTU, { ...config, post: {}, gender: {} });

  const cites = {};
  const done = [];
  DSTU.SAMPLE_CLUSTERS.forEach((cluster, i) => {
    const citation = {
      citationID: `p${i}`,
      citationItems: cluster.items.map(item => ({ ...item })),
      properties: { noteIndex: klass === 'note' ? i + 1 : 0 },
    };
    const [, changed] = engine.processCitationCluster(citation, done.map(d => [d.citationID, d.properties.noteIndex]), []);
    for (const [index, text] of changed) cites[DSTU.SAMPLE_CLUSTERS[index].key] = text;
    done.push(citation);
  });

  const [meta, entries] = engine.makeBibliography();
  const bib = { bibAll: entries.map(e => e.trim()) };
  meta.entry_ids.forEach((id, i) => {
    const name = Array.isArray(id) ? id[0] : id;
    bib[`bib${name[0].toUpperCase()}${name.slice(1)}`] = bib.bibAll[i];
  });

  const result = { cites, bib };
  previewCache.set(key, result);
  return result;
}
