async function startup() {
  Zotero.debug('DSTU-install-check: startup');
  const out = Services.env.get('DSTU_OUT');
  const report = { zotero: Zotero.version, mode: 'install', results: [] };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = async (fn, what, ms = 20000) => {
    const start = Date.now();
    for (;;) {
      const value = fn();
      if (value) return value;
      if (Date.now() - start > ms) throw new Error(`timeout waiting for ${what}`);
      await sleep(100);
    }
  };
  try {
    await Zotero.initializationPromise;
    await Zotero.uiReadyPromise;
    const findPrefs = () => {
      for (const w of Services.ww.getWindowEnumerator()) if (w.location.href.endsWith('preferences.xhtml') && w.document.readyState === 'complete') return w;
      return null;
    };
    if (Services.env.get('DSTU_PREOPEN')) {
      await Zotero.Utilities.Internal.openPreferences();
      await waitFor(() => findPrefs()?.document.getElementById('prefs-navigation'), 'early preferences window');
    }
    const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
    const file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
    file.initWithPath(Services.env.get('DSTU_XPI_PATH'));
    const install = await AddonManager.getInstallForFile(file);
    await install.install();
    const addon = await AddonManager.getAddonByID('dstu-8302@local');
    report.results.push({ id: 'installed', status: addon?.isActive ? 'pass' : 'fail', expected: [], got: [String(addon?.version), String(addon?.isActive)] });
    await waitFor(() => Zotero.DSTU8302?.paneID, 'plugin startup');

    if (!Services.env.get('DSTU_PREOPEN')) await Zotero.Utilities.Internal.openPreferences();
    const win = await waitFor(findPrefs, 'preferences window');
    await waitFor(() => win.Zotero_Preferences?.panes?.get('zotero-prefpane-cite')?.loaded, 'cite pane loaded');
    const nav = await waitFor(() => win.document.getElementById('prefs-navigation'), 'navigation');
    const item = await waitFor(() => [...nav.querySelectorAll('richlistitem')].find(i => i.value === Zotero.DSTU8302.paneID), 'sidebar item');
    const t0 = Date.now();
    nav.selectedItem = item;
    const container = await waitFor(() => {
      const c = win.Zotero_Preferences.panes.get(Zotero.DSTU8302.paneID)?.container;
      return c && !c.hidden && c.querySelectorAll('.dstu-picker').length === 2 && c;
    }, 'visible pane content');
    report.results.push({ id: 'pane visible', status: 'pass', expected: [], got: [container.querySelector('h1')?.textContent, `${Date.now() - t0} ms to content`] });
  }
  catch (e) {
    report.results.push({ id: 'failure', status: 'error', expected: [], got: [], error: `${e}\n${e.stack || ''}` });
  }
  await IOUtils.writeUTF8(out, JSON.stringify(report, null, 2));
  Services.startup.quit(Services.startup.eForceQuit);
}
function shutdown() {}
function install() {}
function uninstall() {}
