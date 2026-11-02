var dstuState = { uninstall: null };

async function installStubStyles(DSTU) {
  await Zotero.Styles.init();
  for (const [klass, { id }] of Object.entries(DSTU.CLASSES)) {
    if (Zotero.Styles.get(id)) continue;
    try {
      await Zotero.Styles.install({ string: DSTU.variantXml(klass, DSTU.DEFAULT_VARIANTS[klass]) }, `dstu-8302-${klass}.csl`, true);
    }
    catch (e) {
      Zotero.debug(`DSTU: style ${id} not installed: ${e}`);
    }
  }
}

async function startup({ rootURI }) {
  Zotero.debug('DSTU: startup called');
  let report;
  try {
    await Zotero.initializationPromise;
    Zotero.debug('DSTU: zotero initialised');
    const scope = { Zotero, Services, IOUtils, ChromeUtils };
    Services.scriptloader.loadSubScript(`${rootURI}dstu-lib.js`, scope);
    Services.scriptloader.loadSubScript(`${rootURI}hooks.js`, scope);
    Services.scriptloader.loadSubScript(`${rootURI}preview.js`, scope);
    const defaults = {};
    for (const klass of Object.keys(scope.DSTU.CLASSES)) {
      Object.defineProperty(defaults, klass, { enumerable: true, get: () => Zotero.Prefs.get(`extensions.dstu8302.variant.${klass}`, true) || undefined });
    }
    const config = { shim: {}, post: {}, gender: {}, swap: {}, defaults, variant: null };
    Zotero.DSTU8302 = {
      DSTU: scope.DSTU,
      config,
      rootURI,
      preview: (klass, variant) => scope.renderPreview(Zotero, scope.DSTU, config, klass, variant),
    };
    if (Services.env.get('DSTU_MODE') !== 'baseline') {
      dstuState.uninstall = scope.installHooks(Zotero, scope.DSTU, config);
      await installStubStyles(scope.DSTU);
    }
    try {
      Zotero.DSTU8302.paneID = await Zotero.PreferencePanes.register({
        pluginID: 'dstu-8302@local',
        src: `${rootURI}prefs.xhtml`,
        scripts: [`${rootURI}picker.js`, `${rootURI}pane.js`],
        label: 'ДСТУ 8302',
      });
      Zotero.debug(`DSTU: preference pane registered as ${Zotero.DSTU8302.paneID}`);
    }
    catch (e) {
      Zotero.debug(`DSTU: preference pane not registered: ${e}`);
    }
    const testScript = Services.env.get('DSTU_TEST_SCRIPT');
    if (!testScript) return;
    for (const file of testScript.split(',')) Services.scriptloader.loadSubScript(`${rootURI}${file}`, scope);
    report = await scope.runTests({ config, mode: Services.env.get('DSTU_MODE') || 'hooked' });
  }
  catch (e) {
    Zotero.debug(`DSTU: failed ${e}`);
    report = { fatal: String(e), stack: e.stack };
  }
  await IOUtils.writeUTF8(Services.env.get('DSTU_OUT'), JSON.stringify(report, null, 2));
  Services.startup.quit(Services.startup.eForceQuit);
}

function shutdown() {
  dstuState.uninstall?.();
  delete Zotero.DSTU8302;
}
function install() {}
function uninstall() {}
