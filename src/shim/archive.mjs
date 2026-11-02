import { takeKeys } from './extra.mjs';

const KEY_RE = /^(fund|inventory|file|sheet|box|storage-unit|sheets-total|file-number|file-title|archive-note|fund-name|title-devised|date-text)(-\d+)?$/;
export const COMPOSED = 'dstu-archive';
const KEYS = { has: k => KEY_RE.test(k) };

const LANGS = {
  uk: { fund: 'Ф.', inventory: 'Оп.', file: 'Спр.', box: 'К.', unit: 'Од. зб.', sheet: 'Арк.', total: 'арк.', fundName: 'paren' },
  ru: { fund: 'Ф.', inventory: 'Оп.', file: 'Д.', box: 'К.', unit: 'Ед. хр.', sheet: 'Л.', total: 'л.', fundName: 'sentence' },
  pl: { fund: '', inventory: '', file: '', box: '', unit: '', sheet: 'K.', total: 'k.', fundName: 'sentence' },
};

function joinZones(parts) {
  return parts.filter(Boolean).reduce((acc, p) => (acc ? `${acc}${acc.endsWith('.') ? ' ' : '. '}${p}` : p), '');
}

const range = v => v.replace(/(\d)-(\d)/g, '$1—$2');
const labelled = (label, value) => (value ? [label, value].filter(Boolean).join(' ') : '');

function group(t, L, suffix, withNote) {
  const fund = t[`fund${suffix}`];
  const fundName = t[`fund-name${suffix}`];
  const fundPart = L.fundName === 'paren' && fund && fundName
    ? `${labelled(L.fund, fund)} (${fundName})`
    : labelled(L.fund, fund);
  const parts = [
    fundPart,
    L.fundName === 'sentence' || !fund ? fundName : '',
    labelled(L.inventory, t[`inventory${suffix}`]),
    labelled(L.file, range(t[`file${suffix}`] || '')),
    labelled(L.box, t[`box${suffix}`]),
    labelled(L.unit, t[`storage-unit${suffix}`]),
    t[`file-number${suffix}`] ? `№ ${t[`file-number${suffix}`]}` : '',
    labelled(L.sheet, range(t[`sheet${suffix}`] || '')),
    t[`sheets-total${suffix}`] ? `${t[`sheets-total${suffix}`]} ${L.total}` : '',
    t[`file-title${suffix}`] ? `(${t[`file-title${suffix}`]})` : '',
    withNote ? t[`archive-note${suffix}`] : '',
  ];
  return parts.filter(Boolean);
}

export function assembleArchive(item, prefs = {}) {
  const { taken, rest } = takeKeys(item.note, KEYS);
  if (!Object.keys(taken).length) return;
  item.note = rest;
  if (item.archive_location) return;
  const lang = (item.language || 'uk').slice(0, 2);
  const L = LANGS[lang] || LANGS.uk;
  const suffixes = ['', ...Object.keys(taken).map(k => /-(\d+)$/.exec(k)?.[1]).filter(Boolean).map(n => `-${n}`)];
  const unique = [...new Set(suffixes)];
  const groups = unique.map(s => group(taken, L, s, true));
  const location = groups.map(joinZones).join('; ');
  const title = item.title || '';
  const devised = taken['title-devised'] === 'true';
  const devisedTitle = devised && title ? `[${title}]` : title;

  if (!item.archive && taken.file) {
    const fileLead = labelled(L.file, range(taken.file));
    const tail = [taken['date-text'], taken['sheets-total'] ? `${taken['sheets-total']} ${L.total}` : ''].filter(Boolean);
    item.type = COMPOSED;
    item.archive_location = joinZones([fileLead, devisedTitle, ...tail]);
    return;
  }

  if (lang === 'ru') {
    const g = groups[0];
    const inv = g.findIndex(p => p.startsWith(L.file));
    const lead = g.slice(0, inv + 1);
    const tail = g.slice(inv + 1);
    item.type = COMPOSED;
    item.archive_location = joinZones([item.archive, ...lead, title, ...tail]);
    return;
  }

  if (devised && prefs.devisedTitle === 'after') {
    item.type = COMPOSED;
    item.archive_location = `${[item.archive, location].filter(Boolean).join('. ')} [${title}]`;
    return;
  }

  item.archive_location = location;
  if (devised) item.title = devisedTitle;
}
