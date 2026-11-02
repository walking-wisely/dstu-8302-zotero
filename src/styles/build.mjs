export const FORMS = ['footnote', 'in-text', 'numeric', 'author', 'author-date'];
export const ZONES = ['period', 'period-dash'];
export const REPEATS = ['short-title', 'op-cit'];

export const DEFAULTS = { form: 'footnote', zone: 'period', repeat: 'short-title', containerOnly: false, analytic: 'slashes', urlOnly: false, bibSort: 'author', noMedium: false, noSeries: false, noPublisher: false, isbn: false };
export const ANALYTICS = ['slashes', 'period'];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const ORDINALS = {
  '01': '-ше', '02': '-ге', '03': '-тє', '04': '-те', '05': '-те', '06': '-те', '07': '-ме', '08': '-ме', '09': '-те',
};

function locale() {
  const ord = Object.entries(ORDINALS)
    .map(([k, v]) => `      <term name="ordinal-${k}" match="last-digit">${v}</term>`)
    .join('\n');
  return `  <locale xml:lang="uk">
    <terms>
      <term name="ordinal">-те</term>
${ord}
      <term name="ordinal-10" match="last-digit">-те</term>
      <term name="ibid">там само</term>
      <term name="page" form="short">с.</term>
      <term name="volume" form="short">т.</term>
      <term name="issue" form="short">вип.</term>
      <term name="edition" form="short">вид.</term>
      <term name="number-of-pages" form="short">с.</term>
      <term name="folio" form="short">арк.</term>
      <term name="page-range-delimiter">—</term>
${["січ.", "лют.", "бер.", "квіт.", "трав.", "черв.", "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."]
  .map((m, i) => `      <term name="month-${String(i + 1).padStart(2, "0")}" form="short">${m}</term>`)
  .join("\n")}
    </terms>
  </locale>`;
}

function entryBranches(o) {
  const branches = [];
  if (o.containerOnly) branches.push(['variable="container-title"', 'container-only-body']);
  if (o.urlOnly) branches.push(['type="webpage"', 'entry-url-only']);
  return branches
    .map(([cond, macro], i) => `      <${i ? 'else-' : ''}if ${cond}>\n        <text macro="${macro}"/>\n      </${i ? 'else-' : ''}if>`)
    .join('\n');
}

function entryChoose(o) {
  const branches = entryBranches(o);
  if (!branches) return '    <text macro="entry-full"/>';
  return `    <choose>\n${branches}\n      <else>\n        <text macro="entry-full"/>\n      </else>\n    </choose>`;
}

function macros(o) {
  const zs = o.zone === 'period-dash' ? '. — ' : '. ';
  return `
  <macro name="article-pages">
    <choose>
      <if variable="locator">
        <group><text macro="cap-page"/><text variable="locator"/></group>
      </if>
      <else-if variable="page">
        <group>
          <label variable="page" form="short" text-case="capitalize-first" suffix=" "/>
          <text variable="page"/>
        </group>
      </else-if>
    </choose>
  </macro>

  <macro name="day-month">
    <choose>
      <if type="article-newspaper">
        <date variable="issued" form="text" date-parts="month-day">
          <date-part name="day" suffix=" "/>
          <date-part name="month" form="short"/>
        </date>
      </if>
    </choose>
  </macro>

  <macro name="cap-page">
    <label variable="locator" form="short" text-case="capitalize-first" suffix=" "/>
  </macro>

  <macro name="heading">
    <choose>
      <if variable="curator" match="none">
        <group prefix="⁠" suffix="⁣">
          <names variable="author">
            <name name-as-sort-order="all" sort-separator=" " delimiter=", " delimiter-precedes-last="always" delimiter-precedes-et-al="never" initialize="false" et-al-min="4" et-al-use-first="3"/>
            <et-al term="et-al"/>
          </names>
        </group>
      </if>
    </choose>
  </macro>

  <macro name="heading-short">
    <choose>
      <if variable="author curator" match="none">
        <text variable="title" form="short"/>
      </if>
      <else-if variable="curator">
        <text variable="title" form="short"/>
      </else-if>
      <else>
        <names variable="author">
          <name form="short" delimiter=", " delimiter-precedes-last="always" delimiter-precedes-et-al="never" et-al-min="4" et-al-use-first="3"/>
          <et-al term="et-al"/>
        </names>
      </else>
    </choose>
  </macro>

  <macro name="year">
    <date variable="issued" form="numeric" date-parts="year"/>
  </macro>

  <macro name="volumes-note">
    <group delimiter=" ">
      <text value="у"/>
      <text variable="number-of-volumes"/>
      <text term="volume" form="short"/>
    </group>
  </macro>

  <macro name="responsibility">
    <group delimiter="; ">
      <names variable="editor">
        <name delimiter=", " initialize="false" prefix="відп. ред. "/>
      </names>
      <names variable="compiler">
        <name delimiter=", " name-as-sort-order="all" sort-separator=" " initialize="false" prefix="упоряд. "/>
      </names>
      <names variable="contributor">
        <name delimiter=", "/>
      </names>
      <names variable="curator">
        <name/>
      </names>
      <text variable="authority"/>
    </group>
  </macro>

  <macro name="title-zone">
    <group delimiter="/">
      <group delimiter=": ">
        <group delimiter=" ">
          <text variable="title"/>
          <choose>
            <if variable="references">
              <text variable="references" prefix="[" suffix="]"/>
            </if>
          </choose>
        </group>
        <choose>
          <if variable="container-title" match="none">
            <text variable="genre"/>
          </if>
        </choose>
        <choose>
          <if variable="number-of-volumes">
            <text macro="volumes-note"/>
          </if>
        </choose>
      </group>
      <text macro="responsibility"/>
    </group>
  </macro>

  <macro name="edition">
    <choose>
      <if variable="edition">
        <group delimiter=" ">
          <text term="edition" form="short" text-case="capitalize-first"/>
          <number variable="edition" form="ordinal"/>
        </group>
      </if>
    </choose>
  </macro>

  <macro name="volume-label">
    <group delimiter=" ">
      <label variable="volume" form="short" text-case="capitalize-first"/>
      <text variable="volume"/>
    </group>
  </macro>

  <macro name="volume-before-place">
    <choose>
      <if variable="locator" match="none">
        <choose>
          <if variable="number-of-pages">
            <text macro="volume-label"/>
          </if>
        </choose>
      </if>
    </choose>
  </macro>

  <macro name="issue-label">
    <choose>
      <if variable="issue">
        <group delimiter=" ">
          <label variable="issue" form="short" text-case="capitalize-first"/>
          <text variable="issue"/>
        </group>
      </if>
    </choose>
  </macro>

  <macro name="volume-after-year">
    <choose>
      <if variable="locator">
        <text macro="volume-label"/>
      </if>
      <else-if variable="number-of-pages" match="none">
        <text macro="volume-label"/>
      </else-if>
    </choose>
  </macro>

  <macro name="publication">
    <group delimiter=", ">
      <group delimiter=": ">
        <text variable="publisher-place"/>${o.noPublisher ? '' : `
        <text variable="publisher"/>`}
      </group>
      <text macro="year"/>
    </group>
  </macro>

  <macro name="extent">
    <choose>
      <if variable="locator">
        <group>
          <text macro="cap-page"/>
          <text variable="locator"/>
        </group>
      </if>
      <else>
        <group delimiter=" ">
          <text variable="number-of-pages"/>
          <text term="number-of-pages" form="short"/>
        </group>
      </else>
    </choose>
  </macro>

  <macro name="series">
    <text variable="collection-title" prefix="(" suffix=")"/>
  </macro>

  <macro name="access">
    <group delimiter=" ">
      <group delimiter=" " >
        <text value="URL:"/>
        <text variable="URL"/>
      </group>
      <group prefix="(" suffix=")" delimiter=": ">
        <text term="accessed"/>
        <date variable="accessed" delimiter=".">
          <date-part name="day" form="numeric-leading-zeros"/>
          <date-part name="month" form="numeric-leading-zeros"/>
          <date-part name="year"/>
        </date>
      </group>
    </group>
  </macro>

  <macro name="updated">
    <choose>
      <if variable="available-date">
        <group delimiter=": ">
          <text value="Дата оновлення"/>
          <date variable="available-date" delimiter=".">
            <date-part name="day" form="numeric-leading-zeros"/>
            <date-part name="month" form="numeric-leading-zeros"/>
            <date-part name="year"/>
          </date>
        </group>
      </if>
    </choose>
  </macro>

  <macro name="container-zone">
    <group delimiter="/">
      <group delimiter=": ">
        <text variable="container-title"/>
        <text variable="genre"/>
      </group>
      <text variable="authority"/>
    </group>
  </macro>

  <macro name="standard-number">
    <text variable="number"/>
  </macro>

  <macro name="body">
    <choose>
      <if variable="container-title">
        <group delimiter="${zs}">
          <group delimiter="${o.analytic === 'period' ? zs : ' // '}">
            <text variable="title"/>
            <group prefix="⁤">
              <text macro="container-zone"/>
            </group>
          </group>
          <group delimiter="${zs}">
            <text macro="year"/>
            <text macro="day-month"/>
            <group delimiter=" " suffix="⁡">
              <text value="№"/>
              <text variable="issue"/>
            </group>
            <text macro="updated"/>
            <text macro="article-pages"/>
          </group>
        </group>
      </if>
      <else-if type="patent">
        <group delimiter="${zs}">
          <group delimiter=": ">
            <text variable="title"/>
            <group delimiter=" ">
              <text variable="genre"/>
              <text variable="number"/>
              <text variable="jurisdiction"/>
            </group>
          </group>
          <text variable="dimensions"/>
          <text macro="extent"/>
        </group>
      </else-if>
      <else-if type="dstu-archive">
        <text variable="archive_location"/>
      </else-if>
      <else-if type="manuscript">
        <group delimiter="${zs}">
          <group delimiter="//">
            <text variable="title"/>
            <text variable="archive"/>
          </group>
          <text variable="archive_location"/>
        </group>
      </else-if>
      <else-if type="standard">
        <group delimiter="${zs}">
          <text macro="standard-number"/>
          <text macro="title-zone"/>
          <text macro="publication"/>
          <group delimiter=" ">
            <text macro="extent"/>${o.noSeries ? '' : `
            <text macro="series"/>`}
          </group>
        </group>
      </else-if>
      <else>
        <group delimiter="${zs}">
          <text macro="title-zone"/>
          <text variable="dimensions"/>
          <text macro="edition"/>
          <text macro="volume-before-place"/>
          <text macro="publication"/>
          <text macro="volume-after-year"/>
          <text macro="issue-label"/>
          <group delimiter=" ">
            <text macro="extent"/>${o.noMedium ? '' : `
            <text variable="medium"/>`}${o.noSeries ? '' : `
            <text macro="series"/>`}
          </group>${o.isbn ? `
          <group delimiter=" ">
            <text value="ISBN"/>
            <text variable="ISBN"/>
          </group>` : ''}
          <group delimiter="${zs}">
            <text variable="archive"/>
            <text variable="archive_location"/>
          </group>
        </group>
      </else>
    </choose>
  </macro>

  <macro name="web">
    <choose>
      <if variable="URL">
        <text macro="access"/>
      </if>
    </choose>
  </macro>

  <macro name="container-only-body">
    <group delimiter="${zs}">
      <text macro="container-zone"/>
      <text macro="year"/>
      <group delimiter=" ">
        <text value="№"/>
        <text variable="issue"/>
      </group>
      <text macro="article-pages"/>
    </group>
  </macro>

  <macro name="entry-full">
    <group delimiter=". ">
      <text macro="heading"/>
      <text macro="body"/>
      <text macro="web"/>
      <text variable="note"/>
    </group>
  </macro>

  <macro name="entry-url-only">
    <group delimiter=". ">
      <group delimiter=" ">
        <text value="URL:"/>
        <text variable="URL"/>
      </group>
      <group prefix="(" suffix=")" delimiter=": ">
        <text term="accessed"/>
        <date variable="accessed" delimiter=".">
          <date-part name="day" form="numeric-leading-zeros"/>
          <date-part name="month" form="numeric-leading-zeros"/>
          <date-part name="year"/>
        </date>
      </group>
    </group>
  </macro>

  <macro name="entry">
${entryChoose(o)}
  </macro>

  <macro name="short-title">
    <choose>
      <if type="patent">
        <group delimiter=" ">
          <text variable="genre" text-case="capitalize-first"/>
          <text variable="number"/>
          <text variable="jurisdiction"/>
        </group>
      </if>
      <else-if type="standard">
        <text variable="number"/>
      </else-if>
      <else>
        <group delimiter=": ">
          <text variable="title" form="short"/>
          <choose>
            <if variable="number-of-volumes">
              <text macro="volumes-note"/>
            </if>
          </choose>
        </group>
      </else>
    </choose>
  </macro>

  <macro name="repeat-op-cit">
    <group delimiter=" ">
      <text macro="heading"/>
      <text value="Зазнач. твір."/>
    </group>
  </macro>

  <macro name="repeat-locator">
    <group delimiter="${zs}">
      <choose>
        <if variable="volume">
          <text macro="volume-label"/>
        </if>
      </choose>
      <group><text macro="cap-page"/><text variable="locator"/></group>
    </group>
  </macro>

  <macro name="repeat-short">
    <group delimiter="${zs}">
      <text macro="heading"/>
      <text macro="short-title"/>
      <choose>
        <if variable="number-of-volumes">
          <text macro="volume-label"/>
        </if>
      </choose>
      <choose>
        <if variable="locator">
          <group><text macro="cap-page"/><text variable="locator"/></group>
        </if>
      </choose>
    </group>
  </macro>

  <macro name="repeat-opcit">
    <group delimiter="${zs}">
      <group delimiter=" ">
        <text macro="heading"/>
        <text value="Зазнач. твір"/>
      </group>
      <choose>
        <if variable="locator">
          <group><text macro="cap-page"/><text variable="locator"/></group>
        </if>
      </choose>
    </group>
  </macro>

  <macro name="ibid-text">
    <group delimiter="${zs}">
      <text term="ibid" text-case="capitalize-first"/>
      <choose>
        <if position="ibid-with-locator">
          <group><text macro="cap-page"/><text variable="locator"/></group>
        </if>
      </choose>
    </group>
  </macro>

  <macro name="note-cite">
    <choose>
      <if position="ibid-with-locator">
        <text macro="ibid-text"/>
      </if>
      <else-if position="ibid">
        <text macro="ibid-text"/>
      </else-if>
      <else-if position="subsequent">
        <text macro="${o.repeat === 'op-cit' ? 'repeat-opcit' : 'repeat-short'}"/>
      </else-if>
      <else>
        <text macro="entry"/>
      </else>
    </choose>
  </macro>

  <macro name="numeric-locator">
    <choose>
      <if variable="locator">
        <group>
          <label variable="locator" form="short" suffix=" "/>
          <text variable="locator"/>
        </group>
      </if>
    </choose>
  </macro>

  <macro name="year-if-needed">
    <choose>
      <if disambiguate="true">
        <text macro="year"/>
      </if>
    </choose>
  </macro>

  <macro name="short-volume">
    <choose>
      <if variable="volume">
        <group delimiter=" ">
          <label variable="volume" form="short"/>
          <text variable="volume"/>
        </group>
      </if>
    </choose>
  </macro>
`;
}

function citation(o) {
  switch (o.form) {
    case 'footnote':
      return `  <citation>
    <layout suffix="." delimiter=" ; ">
      <text macro="note-cite"/>
    </layout>
  </citation>`;
    case 'in-text':
      return `  <citation>
    <layout prefix="(" suffix=")" delimiter=" ; ">
      <text macro="note-cite"/>
    </layout>
  </citation>`;
    case 'numeric':
      return `  <citation collapse="citation-number">
    <layout prefix="[" suffix="]" delimiter="; ">
      <group delimiter=", ">
        <text variable="citation-number"/>
        <text macro="numeric-locator"/>
      </group>
    </layout>
  </citation>`;
    case 'author':
      return `  <citation disambiguate-add-year-suffix="false">
    <layout prefix="[" suffix="]" delimiter="; ">
      <group delimiter=", ">
        <text macro="heading-short"/>
        <text macro="year-if-needed"/>
        <text macro="short-volume"/>
        <text macro="numeric-locator"/>
      </group>
    </layout>
  </citation>`;
    case 'author-date':
      return `  <citation>
    <layout prefix="[" suffix="]" delimiter=" ; ">
      <group delimiter=", ">
        <text macro="heading-short"/>
        <text macro="year"/>
        <text macro="short-volume"/>
        <text macro="numeric-locator"/>
      </group>
    </layout>
  </citation>`;
    default:
      throw new Error(`unknown form ${o.form}`);
  }
}

function bibliography(o) {
  const num = o.form === 'numeric' ? '\n      <text variable="citation-number" suffix=". "/>' : '';
  const sort = o.form === 'numeric'
    ? '<key variable="citation-number"/>'
    : '<key macro="heading"/>\n      <key variable="title"/>';
  const sortBlock = o.bibSort === 'none' ? '' : `\n    <sort>\n      ${sort}\n    </sort>`;
  return `  <bibliography>${sortBlock}
    <layout suffix=".">${num}
      <text macro="entry"/>
    </layout>
  </bibliography>`;
}

export function styleName(o) {
  return ['dstu-8302', o.form, o.zone, o.repeat, o.analytic, o.bibSort === 'none' && 'unsorted', o.containerOnly && 'container-only', o.urlOnly && 'url-only', o.noMedium && 'no-medium', o.noSeries && 'no-series', o.noPublisher && 'no-publisher', o.isbn && 'isbn'].filter(Boolean).join('-');
}

export function buildStyle(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  if (!FORMS.includes(o.form)) throw new Error(`form: ${o.form}`);
  if (!ZONES.includes(o.zone)) throw new Error(`zone: ${o.zone}`);
  if (!REPEATS.includes(o.repeat)) throw new Error(`repeat: ${o.repeat}`);
  if (!ANALYTICS.includes(o.analytic)) throw new Error(`analytic: ${o.analytic}`);
  const cls = o.form === 'footnote' ? 'note' : 'in-text';
  const category = o.form === 'footnote' ? 'note' : o.form === 'numeric' ? 'numeric' : o.form === 'author-date' ? 'author-date' : 'author';
  return `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" class="${cls}" version="1.0" default-locale="uk-UA" page-range-format="expanded" demote-non-dropping-particle="never">
  <info>
    <title>${esc(`ДСТУ 8302:2015 (${o.form}, ${o.zone}, ${o.repeat})`)}</title>
    <id>http://www.zotero.org/styles/${styleName(o)}</id>
    <category citation-format="${category}"/>
    <updated>2026-09-29T00:00:00+00:00</updated>
  </info>
${locale()}
${macros(o)}
${citation(o)}
${bibliography(o)}
</style>
`;
}
