import { makeEngine, renderSequence, renderBibliography } from '../tools/harness/engine.mjs';
const CSL = (await import('../tools/harness/engine.mjs')).loadCSL();
console.log('NAME_VARIABLES:', CSL.NAME_VARIABLES.join(' '));
console.log('DATE_VARIABLES has available-date:', CSL.DATE_VARIABLES.includes('available-date'));

const style = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0" default-locale="uk-UA">
<info><title>spike</title><id>http://example.org/spike</id><updated>2026-01-01T00:00:00+00:00</updated></info>
<citation><layout><choose>
 <if variable="script-writer"><text variable="title"/><text value=" / "/><names variable="script-writer"><name/></names></if>
 <else><names variable="author"><name/></names><text prefix=". " variable="title"/></else>
</choose></layout></citation>
<bibliography><layout><text variable="title"/></layout></bibliography></style>`;
const authors = n => Array.from({ length: n }, (_, i) => ({ family: 'А' + i, given: 'Б.' }));
for (const withMarker of [false, true]) {
  const item = { id: 'x', type: 'book', title: 'Назва', author: authors(4), ...(withMarker ? { 'script-writer': [{ literal: 'А0 Б. та ін.' }] } : {}) };
  const e = makeEngine(style, [item]);
  console.log(withMarker ? 'shim marker present  :' : 'no plugin (no marker) :', renderSequence(e, [[{ id: 'x' }]])[0]);
}
