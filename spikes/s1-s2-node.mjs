import { makeEngine, renderSequence, engineInfo } from '../tools/harness/engine.mjs';
console.log(engineInfo());

const style = (body) => `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0" default-locale="uk-UA">
<info><title>spike</title><id>http://example.org/spike</id><updated>2026-01-01T00:00:00+00:00</updated></info>
<citation><layout>${body}</layout></citation></style>`;

const vars = ['genre','medium','available-date','container-author','reviewed-author','original-author','collection-editor','composer','number-of-pages','part-title','event-title','dimensions','note'];
const body = '<group delimiter=" | ">' + vars.map(v => {
  const t = ['available-date'].includes(v) ? `<date variable="${v}" form="numeric"/>` : (/author|editor|composer/.test(v) ? `<names variable="${v}"><name/></names>` : `<text variable="${v}"/>`);
  return `<group delimiter="="><text value="${v}"/>${t}</group>`;
}).join('') + '</group>';

function run(label, item) {
  const e = makeEngine(style(body), [item]);
  console.log('\n## ' + label);
  console.log(renderSequence(e, [[{ id: item.id }]])[0]);
}

run('S2: values only in note (what Zotero passes from Extra)', {
  id: 'a', type: 'book', title: 'T',
  note: 'genre: навч. посіб.\nmedium: електрон. опт. диск\navailable-date: 2012-08-04\ncontainer-author: Іваненко || Іван\nreviewed-author: Петренко || Петро\nnumber-of-pages: 10\nplain line stays'
});
run('S2b: Extra key that Zotero would normalise (Genre with capital, spaces)', {
  id: 'a', type: 'book', title: 'T', note: 'Genre: навч. посіб.\nAvailable Date: 2012-08-04'
});
run('S1: shim writes derived variables directly on the CSL item', {
  id: 'a', type: 'book', title: 'T', genre: 'монографія', medium: 'CD-R',
  'available-date': { 'date-parts': [[2012, 8, 4]] },
  'container-author': [{ literal: 'Перший А. та ін.' }]
});
run('S1b: note-hack does NOT override an already-set variable', {
  id: 'a', type: 'book', title: 'T', genre: 'FROM-ITEM', note: 'genre: FROM-NOTE'
});
