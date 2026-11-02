import { makeEngine } from '../tools/harness/engine.mjs';

const WJ = '\u2060', INV = '\u2063';
const style = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0" default-locale="uk-UA">
<info><title>spike</title><id>http://example.org/spike</id><updated>2026-01-01T00:00:00+00:00</updated></info>
<citation><layout delimiter=" ; ">
  <group delimiter=" ">
    <group prefix="${WJ}" suffix="${INV}"><names variable="author"><name initialize-with=". " name-as-sort-order="all"/></names></group>
    <text variable="title" suffix="."/>
  </group>
</layout></citation></style>`;

const items = [
  { id: 1, type: 'book', title: 'Педагогіка вищої школи', author: [{ family: 'Туркот', given: 'Т. І.' }] },
  { id: 2, type: 'book', title: 'Психологія і педагогіка', author: [{ family: 'Туркот', given: 'Т. І.' }] },
  { id: 3, type: 'book', title: 'Інша книга', author: [{ family: 'Інший', given: 'І.' }] },
];
const engine = makeEngine(style, items);

// Wrap the engine like a plugin wrapping Zotero.Style.prototype.getCiteProc would.
const orig = engine.processCitationCluster.bind(engine);
const sameAuthor = (a, b) => JSON.stringify(items.find(i => i.id == a).author) === JSON.stringify(items.find(i => i.id == b).author);
const marked = /\u2060(.*?)\u2063/g;
engine.processCitationCluster = function (citation, pre, post) {
  const [info, changed] = orig(citation, pre, post);
  for (const row of changed) {
    if (row[2] !== citation.citationID) { row[1] = row[1].replace(marked, '$1'); continue; }
    const ids = citation.citationItems.map(c => c.id);
    let k = 0;
    row[1] = row[1].replace(marked, (m, heading) => {
      const i = k++;
      return i > 0 && sameAuthor(ids[i - 1], ids[i]) ? 'Його ж' : heading;
    });
  }
  return [info, changed];
};

const c = { citationID: 'c0', citationItems: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 3 }], properties: { noteIndex: 1 } };
const [, changed] = engine.processCitationCluster(c, [], []);
console.log('rewritten :', changed[0][1]);

const plain = makeEngine(style, items);
const [, ch2] = plain.processCitationCluster({ ...c, citationID: 'p0' }, [], []);
console.log('no plugin :', ch2[0][1], ' <- markers are U+2060 word joiners, invisible');
console.log('marker chars in no-plugin output:', [...ch2[0][1]].filter(x => x === WJ || x === INV).length);
