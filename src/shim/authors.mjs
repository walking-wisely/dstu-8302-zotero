const ET_AL = { uk: 'та ін.', ru: 'и др.', en: 'et al.' };

export function markManyAuthors(item, prefs) {
  const authors = item.author || [];
  if (authors.length < 4 || item.curator) return;
  const first = authors[0];
  const name = prefs.nameOrder === 'given-family'
    ? [first.given, first.family].filter(Boolean).join(' ')
    : [first.family, first.given].filter(Boolean).join(' ');
  const lang = (item.language || 'uk').slice(0, 2);
  item.curator = [{ literal: `${name} ${ET_AL[lang] || ET_AL.uk}` }];
}
