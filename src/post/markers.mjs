export const HEAD_OPEN = '⁠';
export const HEAD_CLOSE = '⁣';
export const CONT_OPEN = '⁤';
export const CONT_CLOSE = '⁡';

const MARKS = '⁠⁡⁣⁤';

export const stripMarkers = text => text
  .replace(new RegExp(`\\.([${MARKS}]+)\\.`, 'g'), '.$1')
  .replace(new RegExp(`[${MARKS}]`, 'g'), '');

export function spans(text, open, close) {
  const found = [];
  let from = 0;
  for (;;) {
    const start = text.indexOf(open, from);
    if (start < 0) break;
    const end = text.indexOf(close, start + 1);
    if (end < 0) break;
    found.push({ start, end: end + 1, inner: text.slice(start + 1, end) });
    from = end + 1;
  }
  return found;
}

const MARK_CODES = [...MARKS].map(c => c.charCodeAt(0));
const RTF_MARK = new RegExp(`\\\\uc0\\\\u(${MARK_CODES.join('|')})\\{\\}`, 'g');

export const unescapeRtfMarkers = text => text.replace(RTF_MARK, (_, code) => String.fromCharCode(Number(code)));

export const escapeRtf = text => [...text].map(c => (c.charCodeAt(0) > 127 ? `\\uc0\\u${c.charCodeAt(0)}{}` : c)).join('');

export const unescapeRtf = text => text.replace(/\\uc0\\u(\d+)\{\}/g, (_, code) => String.fromCharCode(Number(code)));
