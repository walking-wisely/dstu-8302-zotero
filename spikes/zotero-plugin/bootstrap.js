async function startup({ rootURI }) {
  await Zotero.initializationPromise;
  const out = Services.env.get('DSTU_SPIKE_OUT');
  if (!out) return;
  let report;
  try {
    const scope = { Zotero, Services, IOUtils, ChromeUtils };
    Services.scriptloader.loadSubScript(rootURI + 'spike.js', scope);
    report = await scope.run();
  }
  catch (e) {
    report = { fatal: String(e), stack: e.stack };
  }
  await IOUtils.writeUTF8(out, JSON.stringify(report, null, 2));
  Services.startup.quit(Services.startup.eForceQuit);
}

function shutdown() {}
function install() {}
function uninstall() {}
