function zoteroItemFrom(Zotero, arg) {
  if (arg && typeof arg === 'object' && typeof arg.getField === 'function') return arg;
  try { return Zotero.Items.get(arg) || null; }
  catch (e) { return null; }
}

function restoreAccessInfo(Zotero, out, source) {
  if (!source || (out.URL && out.accessed)) return;
  const full = Zotero.Utilities.Item.itemToCSLJSON(source);
  if (!out.URL && full.URL) out.URL = full.URL;
  if (!out.accessed && full.accessed) out.accessed = full.accessed;
}

function installHooks(Zotero, DSTU, config) {
  const patched = { retrieveItem: null, getCiteProc: null };
  const engines = [];

  const cite = Zotero.Cite;
  patched.removeFromBibliography = cite.removeFromBibliography;
  cite.removeFromBibliography = function (bib, ...rest) {
    const result = patched.removeFromBibliography.call(this, bib, ...rest);
    const state = bib?.__dstu;
    if (state) {
      const kept = new Set(bib[0].entry_ids);
      bib[1] = DSTU.postBibliography(state.raw.filter((_, i) => kept.has(state.ids[i])), state.opts);
    }
    return result;
  };

  if (Zotero.Prefs.get('cite.useCiteprocRs')) {
    Zotero.debug('DSTU: cite.useCiteprocRs is enabled; the style post-processing is bypassed');
  }

  const proto = Zotero.Cite.System.prototype;
  patched.retrieveItem = proto.retrieveItem;
  proto.retrieveItem = function (...args) {
    const item = patched.retrieveItem.apply(this, args);
    if (!item || typeof item !== 'object') return item;
    try { restoreAccessInfo(Zotero, item, zoteroItemFrom(Zotero, args[0])); }
    catch (e) { Zotero.debug(`DSTU: access info not restored: ${e}`); }
    return DSTU.shimItem(item, config.shim);
  };

  const styleProto = Zotero.Style.prototype;
  patched.getXML = styleProto.getXML;
  styleProto.getXML = function (...args) {
    const swapped = config.swap?.[this.styleID];
    if (swapped) return swapped;
    const klass = DSTU.stubClass(this.styleID);
    if (klass) return DSTU.variantXml(klass, config.variant ?? config.defaults?.[klass]);
    return patched.getXML.apply(this, args);
  };

  const sessionProto = Zotero.Integration?.Session?.prototype;
  if (sessionProto) {
    patched.setData = sessionProto.setData;
    sessionProto.setData = async function (data, resetStyle) {
      const chosen = config.docPrefs;
      if (chosen?.active && chosen.pending !== undefined && data?.prefs) {
        if (chosen.pending) data.prefs.dstuVariant = chosen.pending;
        else delete data.prefs.dstuVariant;
      }
      const variant = data?.prefs?.dstuVariant ?? null;
      const changed = this.dstuVariant !== variant;
      config.variant = variant;
      try {
        const result = await patched.setData.call(this, data, resetStyle || changed);
        this.dstuVariant = variant;
        return result;
      }
      finally {
        config.variant = null;
      }
    };

    patched.setDocPrefs = sessionProto.setDocPrefs;
    sessionProto.setDocPrefs = async function (...args) {
      config.docPrefs = { active: true, current: this.data?.prefs?.dstuVariant ?? null, pending: undefined };
      try {
        return await patched.setDocPrefs.apply(this, args);
      }
      finally {
        config.docPrefs = null;
      }
    };
  }

  const stopWatching = watchDocPrefsWindows(Zotero, DSTU, config);

  patched.getCiteProc = styleProto.getCiteProc;
  styleProto.getCiteProc = function (...args) {
    const klass = DSTU.stubClass(this.styleID);
    if (klass) {
      const key = DSTU.normalizeVariant(klass, config.variant ?? config.defaults?.[klass]);
      if (this.dstuVariant !== key) {
        this.clearEngineCache?.();
        this.dstuVariant = key;
      }
    }
    const engine = patched.getCiteProc.apply(this, args);
    const restore = patchEngine(engine, DSTU, config);
    if (restore) engines.push(restore);
    return engine;
  };

  return function uninstall() {
    stopWatching();
    proto.retrieveItem = patched.retrieveItem;
    styleProto.getCiteProc = patched.getCiteProc;
    styleProto.getXML = patched.getXML;
    if (sessionProto) {
      sessionProto.setData = patched.setData;
      sessionProto.setDocPrefs = patched.setDocPrefs;
    }
    cite.removeFromBibliography = patched.removeFromBibliography;
    for (const restore of engines.splice(0)) restore();
  };
}

function patchEngine(engine, DSTU, config) {
  if (!engine || engine.__dstuPatched || typeof engine.processCitationCluster !== 'function') return null;
  engine.__dstuPatched = true;
  const options = engine => ({ ...config.post, format: engine.opt?.mode, idemWord: DSTU.makeIdemWord(config.gender) });

  const processCluster = engine.processCitationCluster;
  engine.processCitationCluster = function (...args) {
    const result = processCluster.apply(this, args);
    const opts = options(this);
    if (typeof result[1] === 'string') result[1] = DSTU.postCluster(result[1], opts);
    else for (const row of result[1]) row[1] = DSTU.postCluster(row[1], opts);
    return result;
  };

  const makeBibliography = engine.makeBibliography;
  engine.makeBibliography = function (...args) {
    const bib = makeBibliography.apply(this, args);
    if (bib && bib[1]) {
      const opts = options(this);
      Object.defineProperty(bib, '__dstu', { value: { raw: bib[1].slice(), ids: bib[0].entry_ids.slice(), opts } });
      bib[1] = DSTU.postBibliography(bib[1], opts);
    }
    return bib;
  };

  return function restore() {
    engine.processCitationCluster = processCluster;
    engine.makeBibliography = makeBibliography;
    delete engine.__dstuPatched;
  };
}

const DOC_PREFS_URL = 'chrome://zotero/content/integration/integrationDocPrefs.xhtml';
const XHTML = 'http://www.w3.org/1999/xhtml';

function watchDocPrefsWindows(Zotero, DSTU, config) {
  const observer = {
    observe(subject, topic) {
      if (topic !== 'domwindowopened') return;
      let tries = 0;
      const timer = subject.setInterval(() => {
        if (++tries > 200) return subject.clearInterval(timer);
        if (subject.location.href !== DOC_PREFS_URL || subject.document.readyState !== 'complete') return;
        subject.clearInterval(timer);
        addVariantPicker(Zotero, DSTU, config, subject).catch(e => Zotero.debug(`DSTU: picker not added: ${e}`));
      }, 50);
    },
  };
  Services.ww.registerNotification(observer);
  return () => Services.ww.unregisterNotification(observer);
}

async function addVariantPicker(Zotero, DSTU, config, win) {
  const doc = win.document;
  for (let i = 0; i < 40 && !doc.getElementById('style-configurator')?.style; i++) await new Promise(r => win.setTimeout(r, 50));
  const configurator = doc.getElementById('style-configurator');
  const container = doc.getElementById('zotero-bibliography-container');
  const state = config.docPrefs;
  if (!configurator || !container || !state) {
    Zotero.debug(`DSTU: picker skipped (configurator ${!!configurator}, container ${!!container}, state ${!!state})`);
    return;
  }

  Services.scriptloader.loadSubScript(`${Zotero.DSTU8302.rootURI}picker.js`, win);

  const holder = doc.createElementNS(XHTML, 'div');
  holder.id = 'dstu-variant-holder';
  holder.hidden = true;
  holder.style.overflowY = 'auto';
  holder.style.maxHeight = `${Math.round(win.screen.availHeight * 0.42)}px`;
  holder.style.paddingInlineEnd = '6px';
  container.insertBefore(holder, configurator.nextSibling);

  let picker = null;
  let shown = null;
  const sync = () => {
    const klass = DSTU.stubClass(configurator.style);
    shown = klass;
    holder.hidden = !klass;
    if (klass) {
      const initial = state.current ?? Zotero.Prefs.get(`extensions.dstu8302.variant.${klass}`, true);
      if (!picker) {
        picker = win.DSTUPicker.createVariantPicker(doc, { klass, value: initial });
        holder.append(picker.element);
      }
      else if (picker.klass !== klass) picker.setClass(klass, initial);
      picker.klass = klass;
    }
    win.sizeToContent?.();
  };
  configurator.addEventListener('select', sync);
  win.addEventListener('dialogaccept', () => {
    state.pending = shown && picker ? picker.getValue() : null;
  });
  sync();
}
