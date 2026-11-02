const BOOK = {
  type: 'book',
  title: 'Українська мова',
  author: [{ family: 'Шевченко', given: 'Т.' }, { family: 'Франко', given: 'І.' }],
  publisher: 'Наукова думка',
  'publisher-place': 'Київ',
  issued: { 'date-parts': [[2019]] },
  'number-of-pages': '320',
};

async function makeItem() {
  const item = new Zotero.Item();
  item.libraryID = Zotero.Libraries.userLibraryID;
  Zotero.Utilities.Item.itemFromCSLJSON(item, BOOK);
  await item.saveTx();
  return item;
}

async function refreshDocument({ klass, variant, sessionID, item, fields }) {
  const uri = Zotero.URI.getItemURI(item);
  const note = klass === 'note';
  const data = new Zotero.Integration.DocumentData();
  data.sessionID = sessionID;
  data.style = { styleID: DSTU.CLASSES[klass].id, locale: 'uk-UA', hasBibliography: true, bibliographyStyleHasBeenSet: true };
  data.prefs = { fieldType: 'Field', noteType: note ? 1 : 0, automaticJournalAbbreviations: false };
  if (variant) data.prefs.dstuVariant = variant;

  const cite = i => new FakeField(`ITEM CSL_CITATION ${JSON.stringify({
    citationID: `c${i}`,
    properties: { noteIndex: note ? i + 1 : 0 },
    citationItems: [{ uris: [uri], locator: '5', label: 'page' }],
    schema: 'https://github.com/citation-style-language/schema/raw/master/csl-citation.json',
  })}`, note ? i + 1 : 0);
  const bib = new FakeField(`BIBL ${JSON.stringify({ uncited: [], omitted: [], custom: {} })} CSL_BIBLIOGRAPHY`, 0);
  bib.text = '{Bibliography}';
  const all = fields ?? [cite(0), cite(1), bib];

  const doc = new FakeDocument(all, data.serialize());
  const app = {
    primaryFieldType: 'Field',
    secondaryFieldType: 'Bookmark',
    supportedNotes: ['footnotes', 'endnotes'],
    outputFormat: 'rtf',
    getActiveDocument: async () => doc,
  };
  const original = Zotero.Integration.getApplication;
  Zotero.Integration.getApplication = () => app;
  try {
    await Zotero.Integration.execCommand('Fake', 'refresh', 'doc');
  }
  finally {
    Zotero.Integration.getApplication = original;
  }
  if (doc.alerts) throw new Error(`integration alert: ${doc.alerts.join(' | ')}`);
  return all.map(f => rtfToPlain(f.text));
}

async function expectedFor(klass, text, item) {
  const xml = DSTU.variantXml(klass, text).replace(/<id>[^<]*<\/id>/, `<id>http://example.org/ref-${klass}-${text.replace(/\W/g, '')}</id>`);
  const id = /<id>([^<]*)<\/id>/.exec(xml)[1];
  await Zotero.Styles.install({ string: xml }, `ref-${id.length}-${text.replace(/\W/g, '')}.csl`, true);
  const engine = Zotero.Styles.get(id).getCiteProc('uk-UA', 'text');
  const out = [];
  const done = [];
  [0, 1].forEach(i => {
    const citation = {
      citationID: `r${i}`,
      citationItems: [{ id: item.id, locator: '5', label: 'page' }],
      properties: { noteIndex: klass === 'note' ? i + 1 : 0 },
    };
    const [, changed] = engine.processCitationCluster(citation, done.map(d => [d.citationID, d.properties.noteIndex]), []);
    for (const [idx, t] of changed) out[idx] = t;
    done.push(citation);
  });
  engine.updateItems([String(item.id)]);
  const bib = engine.makeBibliography();
  return [...out, bib[1].map(s => s.trim()).join('\n')];
}

async function runTests() {
  const report = { zotero: Zotero.version, mode: 'perdoc', results: [] };
  const record = async (id, fn) => {
    const entry = { id, expected: [], got: [] };
    try {
      const { expected, got } = await fn();
      entry.expected = expected;
      entry.got = got;
      entry.status = JSON.stringify(expected) === JSON.stringify(got) ? 'pass' : 'fail';
    }
    catch (e) {
      entry.status = 'error';
      entry.error = `${e}\n${e.stack || ''}`;
    }
    report.results.push(entry);
  };

  for (const klass of Object.keys(DSTU.CLASSES)) {
    await Zotero.Styles.install({ string: DSTU.variantXml(klass, DSTU.DEFAULT_VARIANTS[klass]) }, `stub-${klass}.csl`, true);
  }
  const item = await makeItem();

  const variants = {
    note: ['footnote/period/short-title', 'footnote/period-dash/op-cit'],
    'in-text': ['numeric/period/short-title', 'author-date/period-dash/short-title'],
  };

  for (const [klass, [a, b]] of Object.entries(variants)) {
    const expectA = await expectedFor(klass, a, item);
    const expectB = await expectedFor(klass, b, item);
    await record(`${klass}: variant A`, async () => ({ expected: expectA, got: await refreshDocument({ klass, variant: a, sessionID: 'docA', item }) }));
    await record(`${klass}: variant B`, async () => ({ expected: expectB, got: await refreshDocument({ klass, variant: b, sessionID: 'docB', item }) }));
    await record(`${klass}: A again after B`, async () => ({ expected: expectA, got: await refreshDocument({ klass, variant: a, sessionID: 'docA', item }) }));
    await record(`${klass}: same session switches to B`, async () => ({ expected: expectB, got: await refreshDocument({ klass, variant: b, sessionID: 'docA', item }) }));
    await record(`${klass}: variants differ`, async () => ({ expected: [true], got: [JSON.stringify(expectA) !== JSON.stringify(expectB)] }));
  }

  await record('no variant uses the default', async () => ({
    expected: await expectedFor('note', DSTU.DEFAULT_VARIANTS.note, item),
    got: await refreshDocument({ klass: 'note', variant: null, sessionID: 'docC', item }),
  }));
  return report;
}
