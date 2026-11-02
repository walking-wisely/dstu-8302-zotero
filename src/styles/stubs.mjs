import { buildStyle } from './build.mjs';
import { CLASSES, DEFAULT_VARIANTS, parseVariant, normalizeVariant } from './variant.mjs';

const cache = new Map();

export function variantXml(klass, text) {
  const key = `${klass}:${normalizeVariant(klass, text)}`;
  if (!cache.has(key)) {
    const { id, title } = CLASSES[klass];
    const opts = parseVariant(klass, text) || parseVariant(klass, DEFAULT_VARIANTS[klass]);
    cache.set(key, buildStyle(opts)
      .replace(/<id>[^<]*<\/id>/, `<id>${id}</id>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`));
  }
  return cache.get(key);
}
