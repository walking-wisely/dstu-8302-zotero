var DSTUPicker = (() => {
  const NS = 'http://www.w3.org/1999/xhtml';

  const CSS = `
    .dstu-picker { font: message-box; display: flex; flex-direction: column; gap: 18px; margin: 8px 0 24px; max-width: 100%; }
    .dstu-picker, .dstu-picker * { box-sizing: border-box; }
    .dstu-picker h4 { margin: 0 0 6px; font-size: 1em; font-weight: 600; }
    .dstu-picker .rule { margin-inline-start: 6px; opacity: .6; font-weight: normal; }
    .dstu-picker .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 8px; align-items: stretch; }
    .dstu-picker .card { display: block; height: auto; text-align: start; padding: 8px 10px; border-radius: 6px; cursor: pointer;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent); }
    .dstu-picker .card:focus-visible { outline: 2px solid AccentColor; outline-offset: 1px; }
    .dstu-picker .card[aria-checked="true"] { border-color: AccentColor; background: color-mix(in srgb, AccentColor 14%, transparent); }
    .dstu-picker .card-label { font-weight: 600; margin-bottom: 4px; }
    .dstu-picker .card-sample { font-size: .92em; opacity: .85; overflow-wrap: anywhere; line-height: 1.35; }
    .dstu-picker .full { border: 1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius: 6px; padding: 10px 12px; }
    .dstu-picker .full h4 { margin-bottom: 4px; }
    .dstu-picker .full .row { margin: 2px 0 8px; overflow-wrap: anywhere; line-height: 1.35; }
    .dstu-picker .full .caption { opacity: .6; font-size: .85em; margin-top: 6px; }
  `;

  function el(doc, tag, attrs = {}, children = []) {
    const node = doc.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) if (child) node.append(child);
    return node;
  }

  function htmlNodes(doc, html) {
    const parsed = new doc.defaultView.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    return [...parsed.body.childNodes].map(n => doc.importNode(n, true));
  }

  function sampleHtml(preview, key) {
    return preview.cites[key] ?? preview.bib[key] ?? '';
  }

  function createVariantPicker(doc, { klass, value, onChange }) {
    const api = Zotero.DSTU8302;
    const { DSTU } = api;
    const root = el(doc, 'div', { class: 'dstu-picker' });
    let currentClass = klass;
    let opts = DSTU.parseVariant(klass, value) || DSTU.parseVariant(klass, DSTU.DEFAULT_VARIANTS[klass]);

    const variantOf = changes => DSTU.formatVariant({ ...opts, ...changes });

    function card(option, choice) {
      const selected = opts[option.key] === choice.value;
      const preview = api.preview(currentClass, variantOf({ ...option.sampleOverrides, [option.key]: choice.value }));
      const node = el(doc, 'div', { class: 'card', role: 'radio', tabindex: '0', 'aria-checked': String(selected) }, [
        el(doc, 'div', { class: 'card-label', text: choice.label }),
        el(doc, 'div', { class: 'card-sample' }, htmlNodes(doc, sampleHtml(preview, option.sample))),
      ]);
      const choose = () => {
        opts = { ...opts, [option.key]: choice.value };
        render();
        onChange?.(DSTU.formatVariant(opts));
      };
      node.addEventListener('click', choose);
      node.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        choose();
      });
      return node;
    }

    function section(option) {
      return el(doc, 'div', { class: 'option', 'data-option': option.key }, [
        el(doc, 'h4', { text: option.title }, option.rule ? el(doc, 'span', { class: 'rule', text: option.rule }) : null),
        el(doc, 'div', { class: 'cards', role: 'radiogroup' }, option.choices.map(choice => card(option, choice))),
      ]);
    }

    function full() {
      const preview = api.preview(currentClass, DSTU.formatVariant(opts));
      const labels = DSTU.PREVIEW_LABELS;
      const rows = [];
      for (const key of ['first', 'article', 'web', 'repeat', 'ibid']) {
        rows.push(el(doc, 'div', { class: 'caption', text: labels[key] }));
        rows.push(el(doc, 'div', { class: 'row' }, htmlNodes(doc, preview.cites[key] ?? '')));
      }
      rows.push(el(doc, 'div', { class: 'caption', text: 'Список літератури' }));
      for (const entry of preview.bib.bibAll) rows.push(el(doc, 'div', { class: 'row' }, htmlNodes(doc, entry)));
      return el(doc, 'div', { class: 'full', 'data-part': 'full' }, [el(doc, 'h4', { text: 'Повний приклад' }), ...rows]);
    }

    function render() {
      root.replaceChildren(
        el(doc, 'style', { text: CSS }),
        ...DSTU.OPTIONS.filter(o => !o.classes || o.classes.includes(currentClass)).map(section),
        full(),
      );
    }

    render();
    return {
      element: root,
      getValue: () => DSTU.formatVariant(opts),
      setClass(next, nextValue) {
        currentClass = next;
        opts = DSTU.parseVariant(next, nextValue) || DSTU.parseVariant(next, DSTU.DEFAULT_VARIANTS[next]);
        render();
      },
    };
  }

  return { createVariantPicker };
})();
