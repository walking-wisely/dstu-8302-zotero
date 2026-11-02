class FakeField {
  constructor(code, noteIndex) {
    this.code = code;
    this.text = '';
    this.noteIndex = noteIndex;
  }
  async delete() {}
  async removeCode() {}
  async select() {}
  async setText(text) { this.text = text; }
  async getText() { return this.text; }
  async setCode(code) { this.code = code; }
  async getCode() { return this.code; }
  async equals(other) { return other === this; }
  async getNoteIndex() { return this.noteIndex; }
  async isAdjacentToNextField() { return false; }
}

class FakeDocument {
  constructor(fields, data) {
    this.fields = fields;
    this.data = data;
  }
  async displayAlert(text) { this.alerts = [...(this.alerts || []), text]; return 1; }
  async activate() {}
  async canInsertField() { return true; }
  async cursorInField() { return null; }
  async getDocumentData() { return this.data; }
  async setDocumentData(data) { this.data = data; }
  async insertField() { throw new Error('insertField not supported'); }
  async getFields() { return this.fields; }
  async convert() {}
  async setBibliographyStyle() {}
  async cleanup() {}
  async complete() {}
}

function rtfToPlain(rtf) {
  return rtf
    .replace(/\\uc0\\u(-?\d+)\{\}/g, (_, n) => String.fromCharCode(n < 0 ? Number(n) + 65536 : Number(n)))
    .replace(/\\(?:\r?\n)/g, '\n')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim();
}

async function renderViaWord(c, { style, zotero }) {
  const uri = id => Zotero.URI.getItemURI(Zotero.Items.get(zotero.get(String(id))));
  const noteStyle = /class="note"/.test(c.styleXml);

  const data = new Zotero.Integration.DocumentData();
  data.sessionID = 'dstutest';
  data.style = { styleID: c.styleId, locale: 'uk-UA', hasBibliography: c.kind === 'bib' || c.withBib, bibliographyStyleHasBeenSet: true };
  data.prefs = { fieldType: 'Field', noteType: noteStyle ? 1 : 0, automaticJournalAbbreviations: false };

  const citationField = (cluster, i) => {
    const citation = {
      citationID: `c${i}`,
      properties: { noteIndex: noteStyle ? i + 1 : 0 },
      citationItems: cluster.map(({ id, ...rest }) => ({ ...rest, uris: [uri(id)] })),
      schema: 'https://github.com/citation-style-language/schema/raw/master/csl-citation.json',
    };
    return new FakeField(`ITEM CSL_CITATION ${JSON.stringify(citation)}`, noteStyle ? i + 1 : 0);
  };
  const bibField = (omitted = []) => {
    const field = new FakeField(`BIBL ${JSON.stringify({ uncited: [], omitted: omitted.map(id => [uri(id)]), custom: {} })} CSL_BIBLIOGRAPHY`, 0);
    field.text = '{Bibliography}';
    return field;
  };

  const clusters = c.kind === 'bib' ? c.bib.map(id => [{ id }]) : c.clusters;
  const fields = clusters.map(citationField);
  if (c.kind === 'bib') fields.push(bibField(c.omit));
  else if (c.withBib) fields.push(bibField());

  const doc = new FakeDocument(fields, data.serialize());
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
  const texts = fields.map(f => rtfToPlain(f.text));
  if (c.kind === 'bib') return texts[texts.length - 1].split(/\n+/).map(s => s.trim()).filter(Boolean);
  const cites = texts.slice(0, clusters.length);
  const shown = c.keep === 'even' ? cites.filter((_, i) => i % 2 === 0) : cites;
  if (c.withBib) {
    const entries = texts[texts.length - 1].split(/\n+/).map(e => e.trim()).filter(e => e && !e.startsWith('Філер'));
    return [entries[0], shown[shown.length - 1]];
  }
  return shown;
}
