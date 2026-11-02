(() => {
  const PREF = klass => `extensions.dstu8302.variant.${klass}`;

  function build() {
    try {
      return render();
    }
    catch (e) {
      Zotero.debug(`DSTU: pane failed: ${e}\n${e.stack || ''}`);
      const root = document.getElementById('dstu-pane-root');
      if (root && !root.dataset.failed) {
        root.dataset.failed = '1';
        root.append(Object.assign(document.createElementNS('http://www.w3.org/1999/xhtml', 'pre'), { textContent: `${e}\n${e.stack || ''}` }));
      }
      return true;
    }
  }

  function render() {
    const root = document.getElementById('dstu-pane-root');
    if (!root || root.dataset.built || !Zotero.DSTU8302) return false;
    root.dataset.built = '1';
    const api = Zotero.DSTU8302;
    const heading = (tag, text) => Object.assign(document.createElementNS('http://www.w3.org/1999/xhtml', tag), { textContent: text });

    root.append(
      heading('p', 'Ці параметри діють для нових документів. У кожному документі свій варіант можна змінити у вікні «Параметри документа» в текстовому редакторі.'),
    );
    for (const klass of Object.keys(api.DSTU.CLASSES)) {
      const stored = Zotero.Prefs.get(PREF(klass), true);
      const picker = DSTUPicker.createVariantPicker(document, {
        klass,
        value: stored,
        onChange: value => Zotero.Prefs.set(PREF(klass), value, true),
      });
      root.append(heading('h3', api.DSTU.CLASSES[klass].title), picker.element);
    }
    return true;
  }

  Zotero.debug('DSTU: pane script loaded');
  if (!build()) {
    const timer = setInterval(() => { if (build()) clearInterval(timer); }, 100);
    setTimeout(() => clearInterval(timer), 10000);
  }
})();
