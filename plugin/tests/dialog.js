const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, what, ms = 15000) {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() - start > ms) throw new Error(`timeout waiting for ${what}`);
    await sleep(50);
  }
}

function findWindow(url) {
  for (const win of Services.ww.getWindowEnumerator()) {
    if (win.location.href === url && win.document.readyState === 'complete') return win;
  }
  return null;
}

async function openDocPrefs(initialData) {
  const doc = new FakeDocument([], initialData);
  const app = {
    primaryFieldType: 'Field',
    secondaryFieldType: 'Bookmark',
    supportedNotes: ['footnotes', 'endnotes'],
    outputFormat: 'rtf',
    getActiveDocument: async () => doc,
  };
  const original = Zotero.Integration.getApplication;
  Zotero.Integration.getApplication = () => app;
  const done = Zotero.Integration.execCommand('Fake', 'setDocPrefs', 'doc').finally(() => { Zotero.Integration.getApplication = original; });
  const win = await waitFor(() => findWindow('chrome://zotero/content/integration/integrationDocPrefs.xhtml'), 'document preferences window');
  await waitFor(() => win.document.getElementById('dstu-variant-holder'), 'picker holder');
  return { doc, win, done };
}

function selectStyle(win, styleID) {
  const configurator = win.document.getElementById('style-configurator');
  configurator.style = styleID;
  configurator.dispatchEvent(new win.CustomEvent('select', { detail: { type: 'style' }, bubbles: true }));
}

function cardsOf(win, option) {
  return [...win.document.querySelectorAll(`#dstu-variant-holder [data-option="${option}"] .card`)];
}

function pressed(win) {
  return Object.fromEntries([...win.document.querySelectorAll('#dstu-variant-holder [data-option]')].map(section => [
    section.dataset.option,
    [...section.querySelectorAll('.card')].findIndex(b => b.getAttribute('aria-checked') === 'true'),
  ]));
}

function layoutProblems(scope) {
  const problems = [];
  const sections = [...scope.querySelectorAll('.option, .full')];
  sections.forEach((section, i) => {
    const rect = section.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) problems.push(`empty box: ${section.className}`);
    const next = sections[i + 1];
    if (next && rect.bottom > next.getBoundingClientRect().top + 1) problems.push(`overlap: ${section.dataset.option || section.className} runs into ${next.dataset.option || next.className}`);
  });
  for (const card of scope.querySelectorAll('.card')) {
    if (card.scrollHeight > card.clientHeight + 1) problems.push(`card text overflows: ${card.textContent.slice(0, 30)}`);
  }
  return problems;
}

async function accept(win, done, doc) {
  win.document.getElementById('zotero-doc-prefs-dialog').acceptDialog();
  await done;
  const data = new Zotero.Integration.DocumentData();
  data.unserialize(doc.data);
  return data;
}

async function runTests() {
  const report = { zotero: Zotero.version, mode: 'dialog', results: [] };
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

  const { CLASSES } = DSTU;
  await record('the plugin installs both styles on its own', async () => ({
    expected: [CLASSES.note.title, CLASSES['in-text'].title],
    got: [Zotero.Styles.get(CLASSES.note.id)?.title, Zotero.Styles.get(CLASSES['in-text'].id)?.title],
  }));

  await record('new document: choose in-text stub, pick options, accept', async () => {
    Zotero.Prefs.set('extensions.dstu8302.variant.in-text', 'numeric/period/short-title', true);
    const { doc, win, done } = await openDocPrefs('');
    selectStyle(win, CLASSES['in-text'].id);
    await waitFor(() => !win.document.getElementById('dstu-variant-holder').hidden && cardsOf(win, 'zone').length, 'cards');
    const initial = pressed(win);
    const dialogProblems = layoutProblems(win.document.getElementById('dstu-variant-holder'));
    cardsOf(win, 'zone')[1].click();
    cardsOf(win, 'form')[3].click();
    cardsOf(win, 'containerOnly')[1].click();
    const data = await accept(win, done, doc);
    return {
      expected: [JSON.stringify({ form: 1, zone: 0, repeat: 0, analytic: 0, containerOnly: 0, urlOnly: 0, noMedium: 0, noSeries: 0, noPublisher: 0, isbn: 0, bibSort: 0 }), CLASSES['in-text'].id, 'author-date/period-dash/short-title/containerOnly', '[]'],
      got: [JSON.stringify(initial), data.style.styleID, data.prefs.dstuVariant, JSON.stringify(dialogProblems)],
    };
  });

  await record('note stub hides the form option', async () => {
    const { doc, win, done } = await openDocPrefs('');
    selectStyle(win, CLASSES.note.id);
    await waitFor(() => !win.document.getElementById('dstu-variant-holder').hidden && cardsOf(win, 'zone').length, 'cards');
    const forms = cardsOf(win, 'form').length;
    const data = await accept(win, done, doc);
    return { expected: [0, DSTU.DEFAULT_VARIANTS.note], got: [forms, data.prefs.dstuVariant] };
  });

  await record('existing document keeps and shows its stored variant', async () => {
    const first = new Zotero.Integration.DocumentData();
    first.sessionID = 'dlg1';
    first.style = { styleID: CLASSES['in-text'].id, locale: 'uk-UA', hasBibliography: false, bibliographyStyleHasBeenSet: true };
    first.prefs = { fieldType: 'Field', noteType: 0, automaticJournalAbbreviations: false, dstuVariant: 'author/period-dash/op-cit/analytic=period/bibSort=none' };
    const { doc, win, done } = await openDocPrefs(first.serialize());
    await waitFor(() => !win.document.getElementById('dstu-variant-holder').hidden && cardsOf(win, 'zone').length, 'cards');
    const shown = pressed(win);
    const data = await accept(win, done, doc);
    return {
      expected: [JSON.stringify({ form: 2, zone: 1, repeat: 1, analytic: 1, containerOnly: 0, urlOnly: 0, noMedium: 0, noSeries: 0, noPublisher: 0, isbn: 0, bibSort: 1 }), 'author/period-dash/op-cit/analytic=period/bibSort=none'],
      got: [JSON.stringify(shown), data.prefs.dstuVariant],
    };
  });

  await record('the picker scrolls inside the dialog and the dialog fits the screen', async () => {
    Zotero.Prefs.set('extensions.dstu8302.variant.in-text', 'in-text/period/short-title', true);
    const { doc, win, done } = await openDocPrefs('');
    selectStyle(win, CLASSES['in-text'].id);
    await waitFor(() => !win.document.getElementById('dstu-variant-holder').hidden && cardsOf(win, 'zone').length, 'cards');
    await sleep(500);
    const holder = win.document.getElementById('dstu-variant-holder');
    const overflowing = holder.scrollHeight > holder.clientHeight;
    holder.scrollTop = 200;
    const scrolled = holder.scrollTop > 0;
    const fits = win.outerHeight <= win.screen.availHeight;
    await accept(win, done, doc);
    return { expected: [true, true, true], got: [overflowing, scrolled, fits] };
  });

  await record('choosing another style removes the stored variant', async () => {
    const other = Zotero.Styles.getVisible().find(s => !DSTU.stubClass(s.styleID) && s.class === 'in-text');
    if (!other) return { expected: ['skipped'], got: ['skipped'] };
    const first = new Zotero.Integration.DocumentData();
    first.sessionID = 'dlg2';
    first.style = { styleID: CLASSES['in-text'].id, locale: 'uk-UA', hasBibliography: false, bibliographyStyleHasBeenSet: true };
    first.prefs = { fieldType: 'Field', noteType: 0, automaticJournalAbbreviations: false, dstuVariant: 'numeric/period/short-title' };
    const { doc, win, done } = await openDocPrefs(first.serialize());
    selectStyle(win, other.styleID);
    const hidden = win.document.getElementById('dstu-variant-holder').hidden;
    const data = await accept(win, done, doc);
    return { expected: [true, other.styleID, 'undefined'], got: [hidden, data.style.styleID, String(data.prefs.dstuVariant)] };
  });

  await record('settings pane opens from its sidebar tab, shows both pickers and stores the choice', async () => {
    await Zotero.Utilities.Internal.openPreferences();
    const win = await waitFor(() => findWindow('chrome://zotero/content/preferences/preferences.xhtml'), 'preferences window');
    const nav = await waitFor(() => win.document.getElementById('prefs-navigation'), 'navigation');
    const item = await waitFor(() => [...nav.querySelectorAll('richlistitem')].find(i => i.value === Zotero.DSTU8302.paneID), 'sidebar item for the pane');
    nav.selectedItem = item;
    const container = await waitFor(() => {
      const c = win.Zotero_Preferences.panes.get(Zotero.DSTU8302.paneID)?.container;
      return c && !c.hidden && c.querySelectorAll('.dstu-picker').length === 2 && c;
    }, 'visible pane content');
    const heading = container.querySelector('h1')?.textContent;
    const paneProblems = layoutProblems(container);
    const noteZone = container.querySelectorAll('.dstu-picker')[0].querySelectorAll('[data-option="zone"] .card')[1];
    noteZone.click();
    const saved = Zotero.Prefs.get('extensions.dstu8302.variant.note', true);
    win.close();
    return { expected: ['ДСТУ 8302', 'footnote/period-dash/short-title', '[]'], got: [heading, saved, JSON.stringify(paneProblems)] };
  });

  return report;
}
