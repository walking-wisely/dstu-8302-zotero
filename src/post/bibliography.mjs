import { CONT_OPEN, CONT_CLOSE, spans } from './markers.mjs';

export function rewriteBibliography(entries, { ibidWord = 'Там само', escape = x => x } = {}) {
  let previous = null;
  return entries.map(entry => {
    const [span] = spans(entry, CONT_OPEN, CONT_CLOSE);
    if (!span) {
      previous = null;
      return entry;
    }
    const repeated = previous === span.inner;
    previous = span.inner;
    return repeated ? entry.slice(0, span.start) + escape(ibidWord) + entry.slice(span.end) : entry;
  });
}
