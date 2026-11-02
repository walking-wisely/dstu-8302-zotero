import { hasKey } from './extra.mjs';

export function truncateTitle(item, words) {
  if (!words || !item.title || item['title-short'] || hasKey(item.note, 'title-short')) return;
  const parts = item.title.split(/\s+/);
  if (parts.length <= words) return;
  item['title-short'] = `${parts.slice(0, words).join(' ')} …\u00a0`;
}
