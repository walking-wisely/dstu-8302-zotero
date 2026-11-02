import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { errors, rules, corpus } = check();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const covered = new Map();
for (const c of corpus) for (const r of c.rules || []) covered.set(r, (covered.get(r) || 0) + 1);
const esc = s => (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const groups = [
  ['csl', 'Automatic in the .csl alone', 'Works with no plugin, in Zotero, and in any citeproc-js/CSL consumer.'],
  ['csl-variant', 'Automatic, but you choose a style variant', 'Optional rules (§4.4 omissions and the like). Each option is a separate compiled .csl file or a build flag; the standard says «можна», so the choice is yours.'],
  ['data', 'Automatic once you type the data in the agreed place (Extra)', 'The style prints it; nothing computes it. See the Extra cookbook above.'],
  ['shim', 'Automatic only with the Zotero plugin (item shim)', 'Without the plugin the fallback column is what you and any colleague see.'],
  ['post', 'Automatic only with the plugin, and only if the output post-processor is confirmed in Zotero (S3)', 'Conditional. Until confirmed, treat the fallback / manual column as the real behaviour.'],
  ['ai-assist', 'AI-assisted (optional; off by default; you confirm every suggestion)', 'A resolver proposes a value that is written into your data. Rendering never calls it. Without it, the manual path applies.'],
  ['manual', 'Manual', 'No automation is planned. The user does it, usually through the per-cite prefix/suffix in the word-processor dialog or by typing data.'],
  ['wp', 'Word-processor setting', 'Not a citation-style matter.'],
  ['out', 'Out of scope', 'Not expressible; the standard allows the alternative we ship.'],
  ['info', 'No behaviour', 'Scope and definitions.'],
];

let md = `# What is automatic, what is manual, what is AI-assisted

Generated from \`rules/rules.jsonl\` by \`tools/rules/report.mjs\`. Do not edit the tables below; edit the registry. The summary above the tables is hand-written and lives in \`tools/rules/report.mjs\`.

Status of the evidence: the classification rests on the source of Zotero 10.0.4, on runs of Zotero's own bundled citeproc-js 1.4.61 in Node (\`spikes/\`), and on the standard text. Nothing has been run inside the Zotero application or Word/LibreOffice yet (see \`docs/ARCHITECTURE-DECISION.md\`, "What was not verified").

## Summary

There are five kinds of behaviour. Anything not in "Automatic in the .csl alone" needs either a choice, typed data, the plugin, or the user's hands.

| Kind | Meaning | DSTU 8302 functionality |
|---|---|---|
| **A. Automatic (.csl only)** | Any Zotero, no plugin | Full and short forms; footnote, in-text, numeric, author, author-date cites; «Там само» / «Там само. С. 92» / «Там само. Т. 7. С. 18»; «Зазнач. твір» and the short-title repeat forms; year on same-author disambiguation; volume in cites; \`;\` between cites; container-only cite; «//» vs period+italic; DOI over URL; access date; «Дата оновлення» (from \`available-date\` in Extra); patent and standard short forms; archive «//» separator and note; Т., Вип., «Арк.», neuter ordinals (2-ге); ibid language by style locale. |
| **B. Plugin (item shim)** | Zotero plugin rewrites the item before rendering; no plugin gives a stated fallback | 4+ authors: title-first entry and title-only short cite (G1); title truncation «…» (G4); abbreviation from the ДСТУ 3582 dictionary (G7); structured archive data → «Ф. 1061. Оп. 1. Спр. 8—12» and fund name, file title, devised title in [ ] (G13); per-language archive abbreviations (pl, ru). |
| **C. Plugin post-processor (conditional)** | Rewrites rendered cites/entries; feasible by source, not yet proven in Zotero | «Там само» across different articles of one periodical (G5); serial repeat printing only differing elements (G11); numbered complex reference «Автор: 1) … ; 2) …» (G3); «Його ж / її ж / їх же» (G2). |
| **D. AI-assisted (optional resolver)** | Proposes; you confirm; result stored as data; never at render time | Gender for «його ж» vs «її ж» (G2); abbreviation of inflected forms and unlisted phrases (G7); language detection for items with empty Language (§4.8). |
| **E. Manual** | You do it | «Цит. за:» / «Наведено за:» (G6); order of works inside a complex reference (§6.2); extra elements in a repeat cite (§5.5.1.2); archive abbreviation list in the document (§8.3.1.1); ДСТУ 6095 and 7093 abbreviations (standards not in \`docs/\`); free-text electronic-resource notes (system requirements, licensed-database access, «Також доступний», «1 електрон. опт. диск (CD-R)»); footnote markers and numbering (word processor); per-chapter numbering (out of scope). |

Two rules that look automatic but are not:

- **«Його ж / її ж».** The standard says «можна» (may). Without the post-processor, or when gender is unknown, the author heading is simply repeated, which is compliant. The renderer never guesses gender. The gender-neutral form «Автор: 1) … ; 2) …» (§6.5.2) is the alternative.
- **«Цит. за».** CSL has no "cited via" relation, so this is always typed by hand.

### What each kind of user sees without the plugin

| Feature | Without plugin |
|---|---|
| 4+ authors | Heading prints three authors and «та ін.» (not the title-first form) |
| Title truncation | Full title, or Short Title if you typed one |
| Abbreviation | Words in full, or as typed |
| Archive structure | \`archive_location\` as you typed it |
| «Там само» across articles | Container printed again |
| Serial repeat | Title, year, issue and page all printed |
| «Його ж» | Heading repeated |
| Numbered complex reference | Each work with its full heading |

The post-processor marks author headings with two invisible characters (U+2060 and U+2063) so it can find them; without the plugin they stay in the text. They are invisible but appear in search and copy (spike S3).

### Extra cookbook (confirmed by spike S2)

Zotero passes Extra to citeproc-js as the CSL \`note\` variable, and citeproc-js turns lines of the form \`variable: value\` into real CSL variables, unless the item already has a value for that variable. You need no plugin for this.

- Use the CSL variable name in lower case with hyphens: \`genre: навч. посіб.\`, \`medium: 1 електрон. опт. диск (CD-R)\`, \`available-date: 2012-08-04\`.
- Names: \`compiler: Любченко || П. М.\` (family, \`||\`, given). CSL name variables available: chair, compiler, editor, editorial-director, collection-editor, organizer, contributor, container-author, reviewed-author, original-author, translator, and more.
- A line that Zotero already fills from a field (for example \`genre\` on a type that has it) is not overridden.
- Zotero rewrites only the field names it knows; \`available-date\` is not among them, so type it exactly as shown, not as "Available Date".
- Keys that are not CSL variables (\`fund\`, \`inventory\`, \`file\`, \`sheet\`, \`box\`, \`fund-name\`, \`title-devised\`, …) are ignored by the style. Only the plugin reads them. The convention is provisional until P8.

`;

const counts = {};
for (const r of rules) counts[r.handling] = (counts[r.handling] || 0) + 1;
md += `## Rule counts\n\n${rules.length} rules from ДСТУ 8302:2015. ` + groups.map(([k]) => `${k}: ${counts[k] || 0}`).join(', ') + `.\n\n`;

for (const [key, title, blurb] of groups) {
  const rs = rules.filter(r => r.handling === key);
  if (!rs.length) continue;
  md += `## ${title}\n\n${blurb}\n\n`;
  const withFallback = ['shim', 'post', 'ai-assist', 'manual', 'data'].includes(key);
  md += withFallback
    ? '| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |\n|---|---|---|---|---|---|---|---|\n'
    : '| Rule | § | Force | What it is | Gap | Phase | Corpus cases |\n|---|---|---|---|---|---|---|\n';
  for (const r of rs) {
    const n = covered.get(r.id) || 0;
    const base = `| ${r.id} | ${r.sec} | ${r.force} | ${esc(r.note || r.quote)} |`;
    md += withFallback
      ? `${base} ${esc(r.fallback)} | ${r.gap || ''} | ${r.phase || ''} | ${n} |\n`
      : `${base} ${r.gap || ''} | ${r.phase || ''} | ${n} |\n`;
  }
  md += '\n';
}
writeFileSync(join(root, 'docs/FUNCTIONALITY.md'), md);
console.log(`wrote docs/FUNCTIONALITY.md (${rules.length} rules)`);
