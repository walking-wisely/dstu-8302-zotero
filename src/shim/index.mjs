import { markManyAuthors } from './authors.mjs';
import { truncateTitle } from './titles.mjs';
import { assembleArchive } from './archive.mjs';
import { describePatent } from './patent.mjs';
import { moveCorporateBody } from './corporate.mjs';

export const SHIM_DEFAULTS = { nameOrder: 'family-given', truncateWords: 0, devisedTitle: 'before' };

export function shimItem(item, prefs = {}) {
  const p = { ...SHIM_DEFAULTS, ...prefs };
  const out = JSON.parse(JSON.stringify(item));
  const typed = /^type:\s*([a-z-]+)\s*$/m.exec(out.note || '');
  if (typed) out.type = typed[1];
  markManyAuthors(out, p);
  truncateTitle(out, p.truncateWords);
  assembleArchive(out, p);
  describePatent(out);
  moveCorporateBody(out);
  return out;
}
