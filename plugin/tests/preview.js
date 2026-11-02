async function runTests() {
  const report = { zotero: Zotero.version, mode: 'preview', results: [] };
  const api = Zotero.DSTU8302;
  const record = (id, check) => {
    const entry = { id, expected: [], got: [] };
    try {
      const { expected, got } = check();
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
  const plain = s => s.replace(/<[^>]*>/g, '').replace(/&#38;/g, '&').replace(/[⁠⁡⁣⁤]/g, '');

  for (const variant of ['footnote/period/short-title', 'footnote/period-dash/op-cit/analytic=period/containerOnly/urlOnly/bibSort=none']) {
    const p = api.preview('note', variant);
    record(`note ${variant}`, () => ({ expected: ['ok'], got: [Object.keys(p.cites).length === 6 && Object.keys(p.bib).length === 5 ? 'ok' : JSON.stringify(p)] }));
    report.results.push({ id: `dump ${variant}`, status: 'pass', expected: [], got: [...Object.entries(p.cites).map(([k, v]) => `${k}: ${plain(v)}`), ...Object.entries(p.bib).map(([k, v]) => `${k}: ${[].concat(v).map(plain).join(' | ')}`)] });
  }
  for (const form of ['in-text', 'numeric', 'author', 'author-date']) {
    const p = api.preview('in-text', `${form}/period/short-title`);
    report.results.push({ id: `dump ${form}`, status: 'pass', expected: [], got: [`first: ${plain(p.cites.first)}`, `bibAll: ${p.bib.bibAll.map(plain).join(' | ')}`] });
  }
  const base = 'footnote/period/short-title';
  const entry = (flag, key) => plain(api.preview('note', flag ? `${base}/${flag}` : base).bib[key]);
  const flagChecks = [
    ['noMedium', 'bibDisc', 'Електронний ресурс', false],
    ['noSeries', 'bibBook', 'Бібліотека історії', false],
    ['noPublisher', 'bibBook', 'Наукова думка', false],
    ['isbn', 'bibBook', 'ISBN 978-966-00-1234-5', true],
  ];
  for (const [flag, key, text, appears] of flagChecks) {
    record(`flag ${flag}`, () => ({
      expected: [!appears, appears],
      got: [entry('', key).includes(text), entry(flag, key).includes(text)],
    }));
    report.results.push({ id: `dump ${flag}`, status: 'pass', expected: [], got: [entry('', key), entry(flag, key)] });
  }
  return report;
}
