export function takeKeys(note, keys) {
  const taken = {};
  if (!note) return { taken, rest: note };
  const rest = [];
  for (const line of String(note).split('\n')) {
    const m = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
    if (m && keys.has(m[1])) taken[m[1]] = m[2].trim();
    else rest.push(line);
  }
  return { taken, rest: rest.join('\n') };
}

export function hasKey(note, key) {
  return new RegExp(`^${key}:`, 'm').test(note || '');
}
