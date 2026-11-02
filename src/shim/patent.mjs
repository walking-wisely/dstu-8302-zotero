import { takeKeys } from './extra.mjs';

const KEYS = { has: k => k === 'application-number' || k === 'issue-note' };

function dotted(date) {
  const parts = date?.['date-parts']?.[0];
  if (!parts || parts.length < 3) return '';
  const [y, m, d] = parts;
  return [String(d).padStart(2, '0'), String(m).padStart(2, '0'), y].join('.');
}

export function describePatent(item) {
  if (item.type !== 'patent') return;
  const { taken, rest } = takeKeys(item.note, KEYS);
  if (!Object.keys(taken).length) return;
  item.note = rest;
  const submitted = dotted(item.submitted);
  const published = dotted(item.issued);
  const issue = taken['issue-note'];
  const published2 = published ? `опубл. ${published}${issue ? `, ${issue}` : ''}` : '';
  item.dimensions = [
    taken['application-number'] && `№ ${taken['application-number']}`,
    submitted && `заявл. ${submitted}`,
    published2,
  ].filter(Boolean).join(' ; ');
}
