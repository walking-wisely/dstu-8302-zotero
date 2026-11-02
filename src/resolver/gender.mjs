const WORDS = { m: 'Його ж', f: 'Її ж', pl: 'Їх же' };

export function makeIdemWord(cache = {}) {
  return heading => {
    const plural = heading.includes(', ');
    const gender = plural ? 'pl' : cache[heading];
    return WORDS[gender] || null;
  };
}
