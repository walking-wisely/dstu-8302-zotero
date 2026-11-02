# ДСТУ 8302:2015 vs Zotero CSL: what cannot be expressed

Basis: `docs/dstu-8302-2015.md` (official text, sections cited as §) checked against `docs/csl-specification.md` (CSL 1.0.2) and Zotero's CSL mapping (`ref/z2csl-typeMap.xml`). Nothing here was run in Zotero itself; behaviours marked "verify" need a test. Update 2026-09-29: rows 8, 9 and 12 and the `standard` type are corrected in `docs/ARCHITECTURE-DECISION.md` (S2): `Extra` carries CSL variables (`available-date`, `genre`, `medium`, role names such as `compiler`, `chair`) natively without a plugin, and the Zotero 10 schema has a `standard` item type.

## Scope warning

ДСТУ 8302 does not define per-type entry layout. §4.4 says elements come from ДСТУ ГОСТ 7.80:2007 and ДСТУ ГОСТ 7.1:2006 (identical adoptions of ГОСТ 7.80-2000 and ГОСТ 7.1-2003, §2) with a list of relaxations. §4.5 also allows abbreviations per ДСТУ 3582, ДСТУ 6095, ДСТУ 7093 and ГОСТ 7.12. Those standards, except 3582, are not in `docs/` yet, and nothing here may assume their content. Full support needs them.

## A. Cannot be done in CSL/Zotero (true gaps)

| # | DSTU requirement | Why CSL cannot do it | Best workaround |
|---|---|---|---|
| 1 | 1–3 authors: author heading. 4+ authors: title first, `/ Перший А. та ін.` (§4.4, 5.4.6.1.1–2, 5.5.2, 5.5.2.1) | `cs:choose` conditions are only `disambiguate`, `is-numeric`, `is-uncertain-date`, `locator`, `position`, `type`, `variable`. No test on number of names. Name count is usable only as a sort key (`form="count"`). | `et-al-min="4" et-al-use-first="3"` gives "A, B, C та ін." in the heading, which is wrong for 4+. Exact behaviour needs the count in the data, e.g. a custom `Extra` marker tested with `variable=`. |
| 2 | «Його ж / її ж / їх же» for the same author in a complex reference (§6.5.1) | Names carry no gender. `subsequent-author-substitute` works only in the bibliography, not between cites. | None. Type by hand via the per-cite prefix. |
| 3 | Complex reference with a shared heading and numbered items: `Автор: 1) …; 2) …` (§6.5.2) | No construct merges cites by author or numbers items inside a cite. `cite-group-delimiter` and `collapse` don't do this. | None. Type by hand. |
| 4 | Title truncated with «…» in repeated references (§5.4.6.3, 5.5.3) | No text-truncation function. | Store a hand-made short title in `Short Title` and use `title-short`. |
| 5 | «Там само» replacing the journal title when adjacent cites are different articles of the same journal (§5.5.11) | `position="ibid"` compares items, not their container. | None. |
| 6 | «Цит. за: / Наведено за:» secondary citation (§4.6) | No relation "cited via" between items. | Per-cite prefix in the word-processor dialog. |
| 7 | Word abbreviation per ДСТУ 3582 in publisher, responsibility and place: «нац. ун-т», «Держ. вид-во» (§4.5) | No word-abbreviation dictionary. Abbreviation lists in Zotero cover journal titles only. | Enter abbreviated text in the data. |
| 8 | «Дата оновлення» (§7.4.4.2) | No CSL variable or Zotero field for "date updated". | Free text through `Extra`/`note`, or misuse `available-date` (verify). |
| 9 | Electronic resource notes: system requirements, licensed-database access, `1 електрон. опт. диск (CD-R)` (§7.4.3, 7.4.4, 7.4.4.1) | No structured fields. | Free text in `Extra`, printed via `note`. |
| 10 | Per-chapter restart of out-of-text reference numbering (§5.4.1.1, optional) | `citation-number` is document-wide and Zotero builds one bibliography per document. | Use document-wide numbering (also allowed). |
| 11 | Serial repeat prints only the elements that differ from the primary cite (§5.5.5) | CSL cannot compare a cite with the previous one. | Approximate: always print title, year, issue, page. |
| 12 | Responsibility roles «упоряд.», «відп. ред.», «ред. рада: … (голова)», corporate body that is not an author («Держ. ком. статистики України»); book genre «навч. посіб.», «монографія» (§5.3.5, 5.4.3, 5.5.10) | Zotero has no compiler or chief-editor creator types, no non-author corporate body, and Book has no genre field. | Role keys and `genre` in `Extra` (verify what Zotero passes through). |
| 13 | Archive references (§8): fund, inventory, file, sheet, box as separate data; `[ ]` around a title devised by the researcher (§8.6); fund name in `( )` (§8.3.1.2); file title in `( )` (§8.7); foreign archives in their own language (§8.10: `Sygn.`, `K.`, `Д.`, `л.`) | Zotero has only `archive` and `archive_location`. `uk-UA.xml:342` gives folio short as «ф.», the standard wants «Арк.». | Structured `Extra` keys assembled by a shim; per-language abbreviation table; locale override for folio. |
| 14 | Electronic resources beyond 9: DOI in place of URL (§7.4.4.3.1), «Також доступний» (§7.4.4.3.4), version/level/modification (§7.4.1), local vs remote access (§7.1), «[Електронний ресурс]» and type of e-data (§7.4.2) | No structured fields; DOI over URL is expressible, the rest is not. | `Extra` keys, same mechanism as 9. |

## B. Works, but only with non-standard or manual setup

- **Language-dependent output** (§4.8, «С.» vs «P.», «Там само» vs «Ibid»): `<layout locale="uk en">` is a citeproc-js/CSL-M extension. It is not in the CSL 1.0.2 spec, so it will not validate against the schema or be accepted into the CSL repository. Zotero honours it. Every item needs a correct `Language` field. The existing `ref/existing-KY-v20250209.csl` already does this.
- **Ibid** (§5.5.9, 5.5.9.1): `position="ibid"` and `"ibid-with-locator"` map to «Там само» and «Там само. С. 92». The uk-UA locale gives «там само» in lower case, so the style needs `text-case="capitalize-first"`.
- **Zotero fields for archives** (§8): Zotero maps only `archive` and `archive_location`. Ф./Оп./Спр./Арк. go into `archive_location` as one string, and the `//` separator and «зв.» are typed by hand. Item type: Manuscript.
- **Locale terms that differ from ДСТУ**: uk-UA has `page` short «С.» (correct), `volume` short «т.» (DSTU uses «Т.»), `issue` short «вип.» (DSTU «Вип.»), `ordinal` only «е». Editions need «2-ге», «3-тє», «4-те». Override with a `cs:locale` in the style and `match="last-digit"` ordinals; neuter is the un-gendered term.
- **One style file per citation form**: numeric `[2, с. 28]`, author `[Кушнаренко, Удалова]`, author-date `[Іванченко, 1995, с. 52]`, in-text `( … )`, footnote. A style has one `citation-format`, so expect several `.csl` files (or dependent styles) sharing macros by copy.
- **Footnote numbering and markers** (§5.3.2, 5.3.3, 5.4.5: per page, per chapter, running; superscript, `*`, spacing): a word-processor setting, not CSL.
- **Non-adjacent repeat** (§5.5.12 «Зазнач. твір» / «Цит. твір» / Op. cit., with «Указ. соч.» in Russian): `position="subsequent"`. It competes with the §5.5.2 short-title repeat form, so ship both as variants.
- **Per-type repeat forms** (§5.5.7 patents `Пат. 76509 Україна. С. 3`; §5.5.8 standards `ДСТУ 7152:2010. С. 6`): expressible per type. Zotero 7's item type list in `ref/z2csl-typeMap.xml` has no `standard` type, so standards ride on another type.
- **Container-only cite and `//` replaced by period plus italics** (§4.9, 4.9.1): style modes.
- **Short in-text cite** (§5.4.6.1.2, 5.4.6.2): 4+ authors show only the title (same count problem as gap 1); year appears only when the same author has several works (`disambiguate`).
- **Option explosion** (§4.4 optional omissions: `. —` vs `.`, general material designation, publisher, ISBN, series, total pages vs page): decide which are separate style files and which are plugin preferences.
- **Ibid language** (§5.5.9: «Там само» / «Там же» / Ibid): depends on the language of the citing document, not the cited item (§4.8 covers only data about the cited document), while `layout locale` switches on item language. Open decision.
- **No-plugin rendering** (Pandoc, Better BibTeX, zotero.org, mobile): every shim-dependent feature needs a defined degraded output.
- **Abbreviation sources** (§4.5): ДСТУ 3582, 6095, 7093, ГОСТ 7.12. Main title and one-word title info are excluded from abbreviation.
- **Access date** `(дата звернення: 15.09.2002)`: the `accessed` date with `numeric-leading-zeros` parts plus the `accessed` term. Works.
- **Bibliography order** (Cyrillic before Latin): not stated in ДСТУ 8302, and not testable by value in CSL. Sorting by `language` descending is a hack. Set `default-locale="uk-UA"` so ї, є, ґ collate correctly.

## C. Fully supported

Punctuation and spacing (` : `, ` ; `, `//`, `/`), URL/URI/DOI, brackets, multi-cite delimiters `;`, locators «с.», volume in cites, first/subsequent positions, `note`/`in-text`/numeric classes, `et-al` term «та ін.» (§4.4–5.5 basic forms).

## Next steps

1. Fetch ДСТУ ГОСТ 7.1:2006, ДСТУ ГОСТ 7.80:2007 and ГОСТ 7.12 into `docs/`.
2. Decide the Extra-field convention for gaps 1, 8, 9, 12, 13 and 14 (after spikes S1 and S2 in `PLAN.md`).
3. Build on `ref/existing-KY-v20250209.csl` (bibliography only; no `position` logic yet).
