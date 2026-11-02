import assert from 'node:assert/strict';
import { buildStyle } from '../../src/styles/build.mjs';
import { makeEngine, renderSequence } from '../../tools/harness/engine.mjs';
import { postCluster } from '../../src/post/index.mjs';
import { makeIdemWord } from '../../src/resolver/gender.mjs';

const book = (id, title) => ({ id, type: 'book', title, author: [{ family: 'Туркот', given: 'Т. І.' }], 'publisher-place': 'Київ', issued: { 'date-parts': [[2011]] }, language: 'uk' });
const items = [book('a', 'Перша'), book('b', 'Друга')];
const clusters = [[{ id: 'a', locator: '1', label: 'page' }, { id: 'b', locator: '2', label: 'page' }]];
const opts = { complex: 'idem', idemWord: makeIdemWord({ 'Туркот Т. І.': 'm' }) };

for (const format of ['html', 'rtf']) {
  const engine = makeEngine(buildStyle({ form: 'footnote' }), items, { format });
  const [raw] = renderSequence(engine, clusters);
  const out = postCluster(raw, { ...opts, format });
  assert.ok(!/[⁠⁡⁣⁤]/.test(out), `${format}: markers left`);
  assert.ok(!/uc0\\u(8288|8291|8292|8289)/.test(out), `${format}: escaped markers left`);
  const word = format === 'rtf' ? '\\uc0\\u1049' : 'Його ж';
  assert.ok(out.includes(format === 'rtf' ? word : 'Його ж'), `${format}: idem word missing\n${out}`);
  assert.ok(!/\.\./.test(out.replace(/\\u[0-9]+/g, '')), `${format}: double period\n${out}`);
}
console.log('rtf/html post-processing ok');
