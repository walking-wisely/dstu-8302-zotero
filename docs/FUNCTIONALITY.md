# What is automatic, what is manual, what is AI-assisted

Generated from `rules/rules.jsonl` by `tools/rules/report.mjs`. Do not edit the tables below; edit the registry. The summary above the tables is hand-written and lives in `tools/rules/report.mjs`.

Status of the evidence: the classification rests on the source of Zotero 10.0.4, on runs of Zotero's own bundled citeproc-js 1.4.61 in Node (`spikes/`), and on the standard text. Nothing has been run inside the Zotero application or Word/LibreOffice yet (see `docs/ARCHITECTURE-DECISION.md`, "What was not verified").

## Summary

There are five kinds of behaviour. Anything not in "Automatic in the .csl alone" needs either a choice, typed data, the plugin, or the user's hands.

| Kind | Meaning | DSTU 8302 functionality |
|---|---|---|
| **A. Automatic (.csl only)** | Any Zotero, no plugin | Full and short forms; footnote, in-text, numeric, author, author-date cites; «Там само» / «Там само. С. 92» / «Там само. Т. 7. С. 18»; «Зазнач. твір» and the short-title repeat forms; year on same-author disambiguation; volume in cites; `;` between cites; container-only cite; «//» vs period+italic; DOI over URL; access date; «Дата оновлення» (from `available-date` in Extra); patent and standard short forms; archive «//» separator and note; Т., Вип., «Арк.», neuter ordinals (2-ге); ibid language by style locale. |
| **B. Plugin (item shim)** | Zotero plugin rewrites the item before rendering; no plugin gives a stated fallback | 4+ authors: title-first entry and title-only short cite (G1); title truncation «…» (G4); abbreviation from the ДСТУ 3582 dictionary (G7); structured archive data → «Ф. 1061. Оп. 1. Спр. 8—12» and fund name, file title, devised title in [ ] (G13); per-language archive abbreviations (pl, ru). |
| **C. Plugin post-processor (conditional)** | Rewrites rendered cites/entries; feasible by source, not yet proven in Zotero | «Там само» across different articles of one periodical (G5); serial repeat printing only differing elements (G11); numbered complex reference «Автор: 1) … ; 2) …» (G3); «Його ж / її ж / їх же» (G2). |
| **D. AI-assisted (optional resolver)** | Proposes; you confirm; result stored as data; never at render time | Gender for «його ж» vs «її ж» (G2); abbreviation of inflected forms and unlisted phrases (G7); language detection for items with empty Language (§4.8). |
| **E. Manual** | You do it | «Цит. за:» / «Наведено за:» (G6); order of works inside a complex reference (§6.2); extra elements in a repeat cite (§5.5.1.2); archive abbreviation list in the document (§8.3.1.1); ДСТУ 6095 and 7093 abbreviations (standards not in `docs/`); free-text electronic-resource notes (system requirements, licensed-database access, «Також доступний», «1 електрон. опт. диск (CD-R)»); footnote markers and numbering (word processor); per-chapter numbering (out of scope). |

Two rules that look automatic but are not:

- **«Його ж / її ж».** The standard says «можна» (may). Without the post-processor, or when gender is unknown, the author heading is simply repeated, which is compliant. The renderer never guesses gender. The gender-neutral form «Автор: 1) … ; 2) …» (§6.5.2) is the alternative.
- **«Цит. за».** CSL has no "cited via" relation, so this is always typed by hand.

### What each kind of user sees without the plugin

| Feature | Without plugin |
|---|---|
| 4+ authors | Heading prints three authors and «та ін.» (not the title-first form) |
| Title truncation | Full title, or Short Title if you typed one |
| Abbreviation | Words in full, or as typed |
| Archive structure | `archive_location` as you typed it |
| «Там само» across articles | Container printed again |
| Serial repeat | Title, year, issue and page all printed |
| «Його ж» | Heading repeated |
| Numbered complex reference | Each work with its full heading |

The post-processor marks author headings with two invisible characters (U+2060 and U+2063) so it can find them; without the plugin they stay in the text. They are invisible but appear in search and copy (spike S3).

### Extra cookbook (confirmed by spike S2)

Zotero passes Extra to citeproc-js as the CSL `note` variable, and citeproc-js turns lines of the form `variable: value` into real CSL variables, unless the item already has a value for that variable. You need no plugin for this.

- Use the CSL variable name in lower case with hyphens: `genre: навч. посіб.`, `medium: 1 електрон. опт. диск (CD-R)`, `available-date: 2012-08-04`.
- Names: `compiler: Любченко || П. М.` (family, `||`, given). CSL name variables available: chair, compiler, editor, editorial-director, collection-editor, organizer, contributor, container-author, reviewed-author, original-author, translator, and more.
- A line that Zotero already fills from a field (for example `genre` on a type that has it) is not overridden.
- Zotero rewrites only the field names it knows; `available-date` is not among them, so type it exactly as shown, not as "Available Date".
- Keys that are not CSL variables (`fund`, `inventory`, `file`, `sheet`, `box`, `fund-name`, `title-devised`, …) are ignored by the style. Only the plugin reads them. The convention is provisional until P8.

## Rule counts

86 rules from ДСТУ 8302:2015. csl: 26, csl-variant: 21, data: 9, shim: 12, post: 4, ai-assist: 3, manual: 5, wp: 4, out: 1, info: 1.

## Automatic in the .csl alone

Works with no plugin, in Zotero, and in any citeproc-js/CSL consumer.

| Rule | § | Force | What it is | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|
| 8302:4.8 | 4.8 | must | layout locale by item language (citeproc-js extension). Language detection for items with empty Language is ai-assist (8302:4.8.b). |  | P2 | 0 |
| 8302:5.1.1 | 5.1.1 | must | Full and short forms of each cite. |  | P2 | 0 |
| 8302:5.2.3 | 5.2.3 | must | Внутрішньотекстове бібліографічне посилання подають у круглих дужках |  | P2 | 3 |
| 8302:5.4.1.1.a | 5.4.1.1 | must | citation-number, document-wide. |  | P2 | 0 |
| 8302:5.4.3 | 5.4.3 | must | повторюють бібліографічні відомості про об’єкт посилання |  | P2 | 1 |
| 8302:5.4.6.a | 5.4.6 | may | [2, с. 28] |  | P2 | 2 |
| 8302:5.4.6.1.1 | 5.4.6.1.1 | must | [Кушнаренко, Удалова] |  | P2 | 1 |
| 8302:5.4.6.2 | 5.4.6.2 | must | Year added on same-author disambiguation. |  | P2 | 1 |
| 8302:5.4.6.4 | 5.4.6.4 | must | потрібно зазначати номер тому (частини) або випуску видання |  | P2 | 2 |
| 8302:5.4.6.5 | 5.4.6.5 | must | Delimiter '; ' vs ' ; ' follows the corpus. |  | P2 | 2 |
| 8302:5.5.1 | 5.5.1 | must | position=subsequent short forms. |  | P2 | 1 |
| 8302:5.5.4 | 5.5.4 | must | номер тому, сторінки |  | P2 | 1 |
| 8302:5.5.6 | 5.5.6 | must | складають відповідно до 5.5.2, 5.5.2.1, 5.5.3 |  | P2 | 0 |
| 8302:5.5.7 | 5.5.7 | must | Per-type short form for patent. |  | P2 | 1 |
| 8302:5.5.8 | 5.5.8 | must | Per-type short form for standard. Zotero 10 schema has a standard item type. |  | P2 | 1 |
| 8302:5.5.9 | 5.5.9 | must | position=ibid. Language of the word: see decision D3 (language of the citing document). |  | P2 | 1 |
| 8302:5.5.9.1 | 5.5.9.1 | must | position=ibid-with-locator. |  | P2 | 1 |
| 8302:5.5.10 | 5.5.10 | must | ibid-with-locator plus volume. |  | P2 | 1 |
| 8302:6.4 | 6.4 | must | розділяють між собою знаком «крапка з комою» |  | P2 | 1 |
| 8302:7.4.1 | 7.4.1 | must | Edition, version, level, modification: CSL edition and version variables; user types the words. | G9 | P2 | 0 |
| 8302:7.4.4.3.1 | 7.4.4.3.1 | should | DOI in place of URL. |  | P2 | 1 |
| 8302:7.4.4.3.3 | 7.4.4.3.3 | should | Style never inserts breaks; wrapping is the word processor's. |  | P2 | 1 |
| 8302:7.4.4.4 | 7.4.4.4 | must | (дата звернення: 15.09.2002) from accessed, leading zeros. |  | P2 | 4 |
| 8302:8.2.1 | 8.2.1 | must | Separator between the object and the search data in archive cites. | G13 | P2 | 2 |
| 8302:8.5.a | 8.5 | should | Full archive entry in footnote and external cites. | G13 | P2 | 1 |
| 8302:8.8 | 8.8 | may | Note variable after the search data. | G13 | P2 | 3 |

## Automatic, but you choose a style variant

Optional rules (§4.4 omissions and the like). Each option is a separate compiled .csl file or a build flag; the standard says «можна», so the choice is yours.

| Rule | § | Force | What it is | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|
| 8302:4.4.b | 4.4 | may | Option for позатекстове heading. Static variant: heading prints all authors. | G15 | P2 | 0 |
| 8302:4.4.c | 4.4 | may | Period vs period-dash between zones; unified within one document, so one style file per choice. | G15 | P2 | 1 |
| 8302:4.4.d | 4.4 | may | CSL has no notion of information source; brackets are not produced at all unless data carries them. Variant is trivially satisfied. | G15 | P2 | 0 |
| 8302:4.4.e | 4.4 | may | [Електронний ресурс] after title: with or without. | G15 | P2 | 1 |
| 8302:4.4.f | 4.4 | may | у складі вихідних даних дозволено не подавати найменування (ім’я) видавця | G15 | P2 | 0 |
| 8302:4.4.g | 4.4 | may | Total pages vs page of the cited part. | G15 | P2 | 0 |
| 8302:4.4.h | 4.4 | may | дозволено не наводити відомостей про серію та Міжнародний стандартний номер | G15 | P2 | 0 |
| 8302:4.9 | 4.9 | may | Container-only cite: «Вісник Книжкової палати. 2012. № 4. С. 18—20.» | G14 | P2 | 1 |
| 8302:4.9.1 | 4.9.1 | may | «//» vs period plus italic container. | G14 | P2 | 1 |
| 8302:5.2.4 | 5.2.4 | must | In-text cites always use the period, even in the period-dash style. | G15 | P2 | 0 |
| 8302:5.2.5 | 5.2.5 | should | Рекомендовано складати внутрішньотекстове бібліографічне посилання в короткій формі |  | P2 | 5 |
| 8302:5.3.5 | 5.3.5 | may | Підрядкове бібліографічне посилання можна наводити у повній або короткій формі |  | P2 | 4 |
| 8302:5.3.6 | 5.3.6 | may | URL-only cite when the text already identifies the source. |  | P2 | 1 |
| 8302:5.4.5 | 5.4.5 | may | Bracketed marker in text; bibliography number without brackets. Superscript alternative is wp. |  | P2 | 2 |
| 8302:5.5.2 | 5.5.2 | must | Competes with 5.5.12; ships as separate variant. |  | P2 | 2 |
| 8302:5.5.12 | 5.5.12 | must | position=subsequent; shipped as separate variant from 5.5.2. |  | P2 | 1 |
| 8302:7.4.2 | 7.4.2 | may | Type of e-data (електрон. текст. дані) shown from medium, or omitted. | G9 | P2 | 1 |
| 8302:7.4.4.3 | 7.4.4.3 | may | застосовувати абревіатури «URI» |  | P2 | 2 |
| 8302:7.4.4.5 | 7.4.4.5 | may | можна не подавати відомостей про джерело назви |  | P2 | 0 |
| 8302:8.4 | 8.4 | may | зазвичай містить тільки пошукові дані цього документа | G13 | P2 | 3 |
| 8302:8.5.b | 8.5 | may | Проте можна наводити у підрядкових і позатекстових посиланнях на архівний документ тільки пошукові дані | G13 | P2 | 0 |

## Automatic once you type the data in the agreed place (Extra)

The style prints it; nothing computes it. See the Extra cookbook above.

| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|---|
| 8302:7.1 | 7.1 | must | Item carries either url or a medium; no new field needed. | Inferred from URL present (remote) or medium present (local); linter flags ambiguity. | G9 | P4 | 0 |
| 8302:7.4.3 | 7.4.3 | must | Free text is accepted; structured units are not worth a shim. | User types «1 електрон. опт. диск (CD-R)» into a medium key in Extra; style prints it verbatim. | G9 | P4 | 1 |
| 8302:7.4.4.a | 7.4.4 | must | Order of the note elements (requirements, access, update date, address, access date) is fixed by the style. | Free text in Extra (note), printed by the style in the note position. | G9 | P4 | 1 |
| 8302:7.4.4.1 | 7.4.4.1 | must | Which resources need it (licensed databases) is a judgment; the linter can flag database-type items. | Free text in Extra, e.g. «Доступ із інформ.-правової системи «ЛІГА-ЗАКОН»». | G9 | P4 | 1 |
| 8302:7.4.4.2 | 7.4.4.2 | must | Term «Дата оновлення» from the style locale. | User writes available-date in Extra; citeproc-js applies it natively, no plugin needed (spike S2). | G8 | P2 | 1 |
| 8302:7.4.4.3.4 | 7.4.4.3.4 | may | Alternative location or format of the resource. | Free text in Extra. | G9 | P4 | 0 |
| 8302:8.3.1.1.b | 8.3.1.1 | may | Повну або скорочену назву архіву можна подавати після абревіатури | Typed into the archive field. | G13 | P4 | 0 |
| 8302:8.3.1.2.b | 8.3.1.2 | must | Fund name without number. | Typed into archive_location. | G13 | P4 | 1 |
| 8302:8.9 | 8.9 | must | Text data; nothing to compute. | User types «64 зв.» in the sheet value. | G13 | P4 | 1 |

## Automatic only with the Zotero plugin (item shim)

Without the plugin the fallback column is what you and any colleague see.

| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|---|
| 8302:4.4.a | 4.4 | must | CSL cannot test the number of names; shim adds a marker variable, never removes author. | No plugin: heading prints up to 3 authors then «та ін.» (et-al-min 4, use-first 3); title-first form for 4+ is not produced. | G1 | P4 | 4 |
| 8302:4.5.a | 4.5 | may | Dictionary lookup (data/ from ДСТУ 3582 and others) applied to publisher, responsibility, place. Preference on/off. | No plugin: words are printed in full, or as typed in the data. Compliant, since abbreviation is optional. | G7 | P4 | 0 |
| 8302:4.5.b | 4.5 | must | Exclusion rule is trivial when the shim only abbreviates listed fields. | Shim never touches title or one-word title info. | G7 | P4 | 0 |
| 8302:5.4.6.1.2 | 5.4.6.1.2 | must | Needs author count. | No plugin: first three authors then «та ін.» in brackets. | G1 | P4 | 1 |
| 8302:5.4.6.3 | 5.4.6.3 | may | Truncate to N words (configurable; the standard gives no N) or use Short Title. The shim never guesses a meaningful cut. | No plugin: uses Short Title if the user typed one, else the full title. | G4 | P4 | 1 |
| 8302:5.5.2.1 | 5.5.2.1 | must | Needs author count. | No plugin: repeat cite prints the first three authors and «та ін.» before the title. | G1 | P4 | 2 |
| 8302:5.5.3 | 5.5.3 | may | дозволено застосовувати скорочування довгих назв | See 8302:5.4.6.3. | G4 | P4 | 1 |
| 8302:8.2.2 | 8.2.2 | must | Structured keys (fund, inventory, file, sheet, box) assembled by the shim. Locale override «Арк.» for folio. | No plugin: archive_location printed as typed. User types «Ф. 1061. Оп. 1. Спр. 8—12» by hand. | G13 | P4 | 3 |
| 8302:8.3.1.2.a | 8.3.1.2 | may | Після номера архівного фонду в круглих дужках може бути зазначено його назву | User types the fund name in parentheses inside archive_location. | G13 | P4 | 2 |
| 8302:8.6 | 8.6 | must | Flag for a title devised by the researcher; brackets before or after the search data. | User types the brackets into the title. | G13 | P4 | 2 |
| 8302:8.7 | 8.7 | may | ці відомості подають після пошукових даних у круглих дужках | User types the parenthesised text into archive_location. | G13 | P4 | 1 |
| 8302:8.10 | 8.10 | must | Per-language abbreviation table (uk, pl, ru). | User types the foreign abbreviations (Sygn., K., Д., л.) by hand. | G13 | P4 | 3 |

## Automatic only with the plugin, and only if the output post-processor is confirmed in Zotero (S3)

Conditional. Until confirmed, treat the fallback / manual column as the real behaviour.

| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|---|
| 8302:5.5.5 | 5.5.5 | must | Needs comparison with the previous cite; unverified in Zotero (see S3). | No plugin (and until P6): always print title, year, issue, page. Compliant in content, longer than necessary. | G11 | P6 | 1 |
| 8302:5.5.11 | 5.5.11 | must | Cross-entry rule; CSL compares items, not containers. | No plugin: the container is printed in full again. Compliant except for the optional shortening. | G5 | P6 | 1 |
| 8302:6.5.1.a | 6.5.1 | may | Cluster-level rewrite; unverified in Zotero (see S3). | No plugin: the heading is repeated. Compliant (replacement is optional). | G2 | P6 | 1 |
| 8302:6.5.2 | 6.5.2 | may | Gender-neutral alternative to «Його ж». | No plugin: each work carries its full heading. Manual: type the numbered form by hand. | G3 | P6 | 1 |

## AI-assisted (optional; off by default; you confirm every suggestion)

A resolver proposes a value that is written into your data. Rendering never calls it. Without it, the manual path applies.

| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|---|
| 8302:4.5.d | 4.5 | may | Abbreviating inflected forms (Національний → нац., Національного → нац.) and unlisted phrases: optional resolver proposes, user confirms; result written to data, not computed at render time. | Manual: type the abbreviated text into the field. | G7 | P7 | 0 |
| 8302:4.8.b | 4.8 | must | Optional language detection for empty or non-normalisable Language values. | Manual: set the Language field; linter lists items without it. |  | P7 | 0 |
| 8302:6.5.1.b | 6.5.1 | may | Choosing його/її needs the person's gender, which initials do not give. Resolver proposes, user confirms, cached per person. «Їх же» needs no gender. | Gender unknown: heading repeated (compliant). Manual: user types «Його ж» in the per-cite prefix. | G2 | P7 | 1 |

## Manual

No automation is planned. The user does it, usually through the per-cite prefix/suffix in the word-processor dialog or by typing data.

| Rule | § | Force | What it is | Without it / what you do | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|---|
| 8302:4.5.c | 4.5 | may | Case-ending forms (нац. → нац., держ.) need morphology: see 8302:4.5.d. | Title-word abbreviation (ДСТУ 6095) and foreign-language abbreviation (ДСТУ 7093, ГОСТ 7.12): ДСТУ 6095 and 7093 are not in docs/; only a curated ДСТУ 3582 list is automated. | G7 | P4 | 0 |
| 8302:4.6 | 4.6 | must | CSL has no 'cited via' relation. Documented workflow, no code. | User types «Цит. за:» in the per-cite prefix box of the word-processor dialog. | G6 | never | 1 |
| 8302:5.5.1.2 | 5.5.1.2 | may | Judgment call, no rule to automate. | User edits the cite text or prefix/suffix in the dialog. |  | never | 0 |
| 8302:6.2 | 6.2 | must | Alphabetical or chronological or per-script ordering; the author picks. | User orders the cites inside the cluster; CSL sorts by its own rule. |  | never | 0 |
| 8302:8.3.1.1.a | 8.3.1.1 | must | The abbreviation list is a document part, not a citation feature. | User types the archive abbreviation in the archive field and keeps a list of abbreviations in the document. | G13 | never | 1 |

## Word-processor setting

Not a citation-style matter.

| Rule | § | Force | What it is | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|
| 8302:4.7 | 4.7 | must | Footnote/endnote markers are a word-processor feature. |  | never | 0 |
| 8302:5.3.1.1 | 5.3.1.1 | info | Footnote placement is the word processor's. |  | never | 0 |
| 8302:5.3.2 | 5.3.2 | must | Superscript, spacing and marker style (`*`) are word-processor settings. |  | never | 0 |
| 8302:5.3.3 | 5.3.3 | may | Footnote numbering scope is a word-processor setting. |  | never | 0 |

## Out of scope

Not expressible; the standard allows the alternative we ship.

| Rule | § | Force | What it is | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|
| 8302:5.4.1.1.b | 5.4.1.1 | may | Per-chapter restart is not expressible; document-wide numbering is allowed by the same clause. | G10 | never | 0 |

## No behaviour

Scope and definitions.

| Rule | § | Force | What it is | Gap | Phase | Corpus cases |
|---|---|---|---|---|---|---|
| 8302:1.2 | 1.2 | info | Scope; nothing to render. |  |  | 0 |

