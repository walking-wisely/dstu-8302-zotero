const WJ = '⁠';
const INV = '⁣';
const STYLE_ID = 'http://example.org/dstu-spike';
const MARKED = /⁠(.*?)⁣/g;

const STYLE = `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0" default-locale="uk-UA">
<info><title>dstu spike</title><id>${STYLE_ID}</id><updated>2026-01-01T00:00:00+00:00</updated></info>
<citation><layout delimiter=" ; ">
  <group delimiter=" ">
    <choose>
      <if variable="script-writer"><text value="[4+]"/></if>
      <else><text value="[&lt;4]"/></else>
    </choose>
    <group prefix="${WJ}" suffix="${INV}"><names variable="author"><name initialize-with=". " name-as-sort-order="all"/></names></group>
    <text variable="title" suffix="."/>
    <text variable="genre"/>
    <date variable="available-date" form="numeric"/>
  </group>
</layout></citation>
<bibliography><layout><text variable="title"/></layout></bibliography>
</style>`;

const results = {};

async function step(name, fn) {
  try {
    results[name] = { ok: true, value: await fn() };
  }
  catch (e) {
    results[name] = { ok: false, error: String(e), stack: e.stack };
  }
}

async function makeBook(title, authors, extra) {
  const item = new Zotero.Item('book');
  item.setField('title', title);
  item.setCreators(authors.map(([lastName, firstName]) => ({ lastName, firstName, creatorType: 'author' })));
  if (extra) item.setField('extra', extra);
  await item.saveTx();
  return item;
}

function cluster(id, ids) {
  return { citationID: id, citationItems: ids.map(i => ({ id: i })), properties: { noteIndex: 1 } };
}

async function run() {
  results.zoteroVersion = Zotero.version;
  results.citeprocRs = Zotero.Prefs.get('cite.useCiteprocRs');

  let style;
  await step('install-style', async () => {
    await Zotero.Styles.install({ string: STYLE }, 'dstu-spike.csl', true);
    style = Zotero.Styles.get(STYLE_ID);
    return { path: style.path };
  });
  if (!style) return results;

  const four = await makeBook('Чотири автори', [['А', 'А'], ['Б', 'Б'], ['В', 'В'], ['Г', 'Г']], 'genre: підручник\navailable-date: 2012-08-04');
  const same1 = await makeBook('Перша', [['Туркот', 'Т. І.']]);
  const same2 = await makeBook('Друга', [['Туркот', 'Т. І.']]);
  const other = await makeBook('Інша', [['Інший', 'І.']]);

  const render = (engine, id, ids, pre = []) => engine.processCitationCluster(cluster(id, ids), pre, [])[1];

  await step('baseline-no-wrapper', () => {
    const engine = style.getCiteProc('uk-UA', 'text');
    return render(engine, 'b0', [four.id, same1.id]);
  });

  const origRetrieve = Zotero.Cite.System.prototype.retrieveItem;
  const seen = [];
  Zotero.Cite.System.prototype.retrieveItem = function (item) {
    const csl = origRetrieve.call(this, item);
    seen.push({ id: csl.id, embedded: typeof item === 'string', authors: (csl.author || []).length });
    if ((csl.author || []).length >= 4) csl['script-writer'] = [{ literal: 'marker' }];
    return csl;
  };
  await step('s1-retrieveItem-wrapper', () => {
    const engine = style.getCiteProc('uk-UA', 'text');
    return { rendered: render(engine, 's1', [four.id, same1.id]), seen };
  });

  const origGet = Zotero.Style.prototype.getCiteProc;
  const patchCalls = { n: 0 };
  Zotero.Style.prototype.getCiteProc = function (...args) {
    const engine = origGet.apply(this, args);
    if (engine.__dstuPatched) return engine;
    engine.__dstuPatched = true;
    const orig = engine.processCitationCluster.bind(engine);
    engine.processCitationCluster = function (citation, pre, post) {
      patchCalls.n++;
      const [info, changed] = orig(citation, pre, post);
      const ids = citation.citationItems.map(c => c.id);
      for (const row of changed) {
        let k = 0;
        row[1] = row[1].replace(MARKED, (m, heading) => {
          const i = k++;
          if (row[2] !== citation.citationID || i === 0) return heading;
          const a = Zotero.Items.get(ids[i - 1]).getCreatorsJSON();
          const b = Zotero.Items.get(ids[i]).getCreatorsJSON();
          return JSON.stringify(a) === JSON.stringify(b) ? 'Його ж' : heading;
        });
      }
      return [info, changed];
    };
    return engine;
  };

  await step('s3-cluster-rewrite', () => {
    const engine = style.getCiteProc('uk-UA', 'text');
    return {
      rendered: render(engine, 's3', [same1.id, same2.id, other.id]),
      markersLeft: [...JSON.stringify(render(engine, 's3b', [other.id]))].filter(c => c === WJ || c === INV).length,
      patchCalls: patchCalls.n,
    };
  });

  await step('s3-engine-cache', () => {
    const opts = { cache: true };
    const e1 = style.getCiteProc('uk-UA', 'text', opts);
    const e2 = style.getCiteProc('uk-UA', 'text', opts);
    const before = patchCalls.n;
    const out = render(e2, 'c1', [same1.id, same2.id]);
    return { sameInstance: e1 === e2, patchedCallsForCachedEngine: patchCalls.n - before, out };
  });

  await step('s3-quickcopy-path', async () => {
    const items = [same1, same2];
    const text = Zotero.Cite.makeFormattedBibliographyOrCitationList(
      Zotero.Styles.get(STYLE_ID), items, 'text', true
    );
    return { text, patchCalls: patchCalls.n };
  });

  await step('s3-integration-uses-getCiteProc', () => {
    const src = Zotero.Integration.Session.prototype.setData.toString();
    return { callsGetCiteProc: src.includes('getCiteProc'), passesCache: /cache\s*:/.test(src) };
  });

  await step('s3-integration-cluster-call', () => {
    const src = Zotero.Integration.Session.prototype.updateUncitedItems
      ? Object.getOwnPropertyNames(Zotero.Integration.Session.prototype)
      : [];
    return { sessionMethods: src };
  });

  Zotero.Style.prototype.getCiteProc = origGet;
  Zotero.Cite.System.prototype.retrieveItem = origRetrieve;
  return results;
}
