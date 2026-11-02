import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVariant, formatVariant, normalizeVariant, stubClass, DEFAULT_VARIANTS, CLASSES, OPTIONS } from '../../src/styles/variant.mjs';
import { variantXml } from '../../src/styles/stubs.mjs';

test('round trip of every default', () => {
  for (const klass of Object.keys(CLASSES)) {
    assert.equal(formatVariant(parseVariant(klass, DEFAULT_VARIANTS[klass])), DEFAULT_VARIANTS[klass]);
  }
});

test('optional tokens are written only when they differ from the default', () => {
  const opts = parseVariant('in-text', 'author-date/period-dash/op-cit/analytic=period/bibSort=none/containerOnly/urlOnly');
  assert.deepEqual(opts, { form: 'author-date', zone: 'period-dash', repeat: 'op-cit', analytic: 'period', bibSort: 'none', containerOnly: true, urlOnly: true, noMedium: false, noSeries: false, noPublisher: false, isbn: false });
  assert.equal(formatVariant(opts), 'author-date/period-dash/op-cit/analytic=period/bibSort=none/containerOnly/urlOnly');
});

test('invalid values fall back to the default and unknown tokens are ignored', () => {
  assert.equal(parseVariant('note', 'numeric/period/short-title'), null);
  assert.equal(parseVariant('in-text', 'bogus'), null);
  assert.equal(normalizeVariant('note', 'garbage'), DEFAULT_VARIANTS.note);
  assert.equal(normalizeVariant('in-text', 'numeric/period/op-cit/future=1/analytic=nope'), 'numeric/period/op-cit');
});

test('stub styles are recognised by id', () => {
  assert.equal(stubClass(CLASSES.note.id), 'note');
  assert.equal(stubClass(CLASSES['in-text'].id), 'in-text');
  assert.equal(stubClass('http://example.org/x'), null);
});

test('every combination compiles with the stub id, title and class', () => {
  for (const [klass, def] of Object.entries(CLASSES)) {
    for (const form of def.forms) for (const zone of ['period', 'period-dash']) for (const repeat of ['short-title', 'op-cit']) {
      for (const extra of ['', '/analytic=period/bibSort=none/containerOnly/urlOnly/noMedium/noSeries/noPublisher/isbn']) {
        const xml = variantXml(klass, `${form}/${zone}/${repeat}${extra}`);
        assert.ok(xml.includes(`<id>${def.id}</id>`));
        assert.ok(xml.includes(`<title>${def.title}</title>`));
        assert.ok(xml.includes(`class="${klass}"`));
      }
    }
  }
});

test('every option offers distinct choices', () => {
  for (const option of OPTIONS) {
    const values = option.choices.map(c => c.value);
    assert.equal(new Set(values).size, values.length);
  }
});

test('each §4.4 flag changes the compiled style', () => {
  const base = variantXml('note', 'footnote/period/short-title');
  assert.ok(base.includes('variable="medium"') && base.includes('macro="series"') && base.includes('variable="publisher"'));
  assert.ok(!base.includes('variable="ISBN"'));
  assert.ok(!variantXml('note', 'footnote/period/short-title/noMedium').includes('variable="medium"'));
  assert.ok(!variantXml('note', 'footnote/period/short-title/noSeries').includes('<text macro="series"/>'));
  assert.ok(!variantXml('note', 'footnote/period/short-title/noPublisher').includes('variable="publisher"'));
  assert.ok(variantXml('note', 'footnote/period/short-title/isbn').includes('variable="ISBN"'));
});
