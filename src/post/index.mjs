import { stripMarkers, unescapeRtfMarkers, escapeRtf, unescapeRtf } from './markers.mjs';
import { rewriteCluster, splitVolumeLocator } from './cluster.mjs';
import { rewriteBibliography } from './bibliography.mjs';

export { stripMarkers, rewriteCluster, rewriteBibliography };

function prepare(text, opts = {}) {
  if (opts.format !== 'rtf') return { text, opts };
  return { text: unescapeRtfMarkers(text), opts: { ...opts, escape: escapeRtf, decode: unescapeRtf } };
}

export function postCluster(text, opts) {
  const prepared = prepare(text, opts);
  return stripMarkers(splitVolumeLocator(rewriteCluster(prepared.text, prepared.opts), prepared.opts));
}

export function postBibliography(entries, opts) {
  const prepared = entries.map(entry => prepare(entry, opts));
  const rewritten = rewriteBibliography(prepared.map(p => p.text), prepared[0]?.opts ?? opts);
  return rewritten.map(stripMarkers);
}
