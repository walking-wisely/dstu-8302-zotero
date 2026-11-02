import { HEAD_OPEN, HEAD_CLOSE, spans } from './markers.mjs';

const SEPARATOR = ' ; ';

function runs(text, found) {
  const result = [];
  for (const span of found) {
    const prev = result[result.length - 1];
    const last = prev?.[prev.length - 1];
    const adjacent = last && span.inner === last.inner && text.slice(0, span.start).endsWith(SEPARATOR);
    if (adjacent) prev.push(span);
    else result.push([span]);
  }
  return result.filter(r => r.length > 1);
}

function splice(text, edits) {
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce((acc, e) => acc.slice(0, e.start) + e.insert + acc.slice(e.end), text);
}

function afterHeading(text, span) {
  return text.startsWith('. ', span.end) ? span.end + 2 : span.end;
}

export function rewriteCluster(text, { complex = 'off', idemWord = () => null, escape = x => x, decode = x => x } = {}) {
  if (complex === 'off') return text;
  const edits = [];
  for (const run of runs(text, spans(text, HEAD_OPEN, HEAD_CLOSE))) {
    if (complex === 'idem') {
      const word = idemWord(decode(run[0].inner));
      if (!word) continue;
      for (const span of run.slice(1)) edits.push({ start: span.start, end: span.end, insert: escape(word) });
    } else if (complex === 'numbered') {
      run.forEach((span, i) => {
        const insert = i === 0 ? `${span.inner}: 1) ` : `${i + 1}) `;
        edits.push({ start: span.start, end: afterHeading(text, span), insert });
      });
    }
  }
  return splice(text, edits);
}

const quote = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function splitVolumeLocator(text, { escape = x => x } = {}) {
  const volume = quote(escape('Т')) + '\\. ?(\\d+)';
  const pages = quote(escape('с')) + '\\. ?';
  return text.replace(new RegExp(`${volume}, ${pages}`, 'g'), (_, n) => `${escape('Т')}. ${n}. ${escape('С')}. `);
}
