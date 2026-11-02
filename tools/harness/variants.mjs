export function optsFor(c) {
  const needs = c.needs || [];
  const has = n => needs.includes(n);
  const val = key => needs.find(n => n.startsWith(`variant:${key}=`))?.split('=')[1];
  const opts = {};
  if (has('variant:container-only')) opts.containerOnly = true;
  if (has('variant:analytic-separator')) opts.analytic = 'period';
  if (has('variant:url-only-footnote')) opts.urlOnly = true;
  if (val('zone-separator')) opts.zone = val('zone-separator');
  if (val('repeat-form')) opts.repeat = val('repeat-form');
  if (has('variant:author-date')) opts.form = 'author-date';
  else if (has('variant:author')) opts.form = 'author';
  else if (has('variant:numeric-marker')) opts.form = 'numeric';
  else if (c.form === 'in-text') opts.form = c.expected[0].startsWith('[') ? (c.items.some(i => i['citation-number'] != null) ? 'numeric' : 'author') : 'in-text';
  else opts.form = 'footnote';
  return { ...opts, ...(c.style || {}) };
}
