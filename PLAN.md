# Plan: full ДСТУ 8302:2015 support for Zotero

Companion to `FINDINGS.md` (what CSL cannot express). This file says where each gap is solved, in what order to build, how it is tested, and when a gap counts as closed. G1–G13 are rows 1–13 of table A in `FINDINGS.md` (its row 14, electronic-resource extras, is folded into G9 here). G14–G17 are section B items of `FINDINGS.md` promoted to numbered gaps in this plan. § numbers refer to `docs/dstu-8302-2015.md`.

## Status (2026-11-02)

- **P0 done** except items marked open: rule registry (`rules/rules.jsonl`, 86 rules, quotes checked verbatim by `tools/rules/check.mjs`), corpus (`tests/corpus/`, 66 cases, from the standard's examples transcribed from page images, plus two added regression cases), harness (`tools/harness/`, Zotero's own citeproc-js 1.4.61), decisions D1–D7 in `docs/ARCHITECTURE-DECISION.md`. **Open:** ДСТУ 6095 and 7093 not fetched; 7.1 not yet read into the registry; 23 rules have no corpus case yet (synthetic tests).
- **P1 done.** S1–S4 answered in `docs/ARCHITECTURE-DECISION.md` and since confirmed in a running Zotero.
- **P2 mostly done.** `src/styles/build.mjs` compiles every style from one source: 5 citation forms × zone separator × repeat form (20 default styles in `build/`), plus container-only, analytic-separator, url-only and bibliography-sort flags (160 variants, all rendered by `tools/styles/check-matrix.mjs`). D5 conventions: `references: Електронний ресурс` prints `[Електронний ресурс]`; `dimensions` holds the e-data type; `medium` the physical description; free text lines in Extra print as the entry note; archive data is composed by the shim from Extra keys. Not done: per-type layouts from ДСТУ ГОСТ 7.1, `layout locale`, synthetic tests for the 23 rules without a corpus case, the sequence tests.
- **P4 shim built** (`src/shim/`): author count and heading marker (`curator`), titles, archive composition (`dstu-archive` type, add-only), patents, corporate body (`corporate:` key), an Extra `type:` line. Tested in Node and in Zotero.
- **P6 post-processor built** (`src/post/`): marker characters in the rendered text (U+2060/2061/2063/2064) are rewritten for «Його ж», cross-entry «Там само» for containers, and the volume change inside «Там само» (locator `7, с. 18` becomes «Т. 7. С. 18»). Handles plain text, HTML and RTF. The gender resolver (`src/resolver/gender.mjs`) exists but is not wired to any UI.
- **Plugin** (`plugin/`, bundled from `src/` by `tools/plugin/bundle.mjs`, packed by `tools/plugin/pack.mjs` into `build/dstu-8302-<version>.xpi`): wraps `retrieveItem` (shim, and restores URL/accessed that Zotero drops for journal articles with pages), `getCiteProc` (post-processing), `Zotero.Cite.removeFromBibliography` (omitted entries), `Style.getXML` (stub styles, below) and `Integration.Session.setData` (per-document variant).
- **In-Zotero runner** (`tools/zotero/run.sh`, throwaway profile, never touches the user's profile): corpus 66/66 on Zotero 7.0.32, 8.0.4, 9.0.3 and 10.0.7, directly (`Zotero.Style.getCiteProc`) and through the word-processor path (`DSTU_VIA=word`: `Zotero.Integration.execCommand('refresh')` with a fake document, RTF output). With the hooks off: 23/66. With the stub-style swap (`DSTU_STUB=1`): 66/66 in direct mode on Zotero 10 and 7, in Word mode on Zotero 10 and 7. Per-document variants (`DSTU_TEST_SCRIPT=tests/word.js,tests/perdoc.js`): 11/11 on Zotero 7–10. Node: shim and RTF tests pass, registry OK, matrix 160/160.
- **Unverified:** real Word and LibreOffice (only a fake document is driven), Zotero 6 (out of scope), the citeproc-rs engine (unsupported; the plugin only logs a debug line when `cite.useCiteprocRs` is on), stale cross-cluster rewrites (judged a non-issue by reading the code, never run).
- **Known limits:** without the plugin citeproc ignores Extra keys with digits such as `fund-2`; the type `dstu-archive` is baked into Word documents; the plugin id is `dstu-8302@local`.
- **Released as 0.2.0 (2026-11-02)** at github.com/walking-wisely/dstu-8302-zotero: `update_url` points at `updates.json` on `main`, written by `tools/release/updates.mjs`; the public tree is made by `tools/release/export.sh` (no standards, no `ref/`, no history). User guide: `docs/USER-GUIDE.uk.md`.
- **Product shape (section 9), now built.** The user cannot be asked to pick among 20+ styles. The decision is two visible styles plus a plugin picker; its mechanism is proven, its UI is not built.
- Commands: `node tools/rules/check.mjs`, `node tools/harness/run-corpus.mjs [style.csl] [--verbose]`, `node tools/rules/report.mjs`, `node tools/styles/compile.mjs`, `node tools/styles/check-matrix.mjs`, `node --test tests/shim/ tests/post/`, `tools/zotero/run.sh` (env: `ZOTERO_APP`, `DSTU_VIA=word`, `DSTU_STUB=1`, `DSTU_MODE=baseline`, `DSTU_ONLY=<regex>`, `DSTU_TEST_SCRIPT`).

Naming: the standards ДСТУ 8302 cites are the Ukrainian adoptions **ДСТУ ГОСТ 7.1:2006** and **ДСТУ ГОСТ 7.80:2007** (identical adoptions of ГОСТ 7.1-2003 and ГОСТ 7.80-2000, §2 and §4.4). Neither is in `docs/` yet, so nothing in this plan may assume their content.

## 1. Two rules that are hard to explain, in detail

### «Там само» (ibid), §5.5.9–5.5.11

Replaces a repeated reference to the same document when it directly follows the first one.

| Situation | Rendered | CSL |
|---|---|---|
| Same document, same page(s) (§5.5.9) | `Там само.` | `position="ibid"` |
| Same document, other page (§5.5.9.1) | `Там само. С. 92.` | `position="ibid-with-locator"` |
| Other volume (§5.5.10) | `Там само. Т. 7. С. 18.` | ibid-with-locator plus a volume locator |
| Two adjacent entries are different articles of the same periodical (§5.5.11) | `Афонін О. Українська книга 2011 // Там само. С. 6–8.` | not possible: CSL compares items, not containers |

The first three rows are plain CSL. The fourth is a cross-entry rule and needs an output post-processor (layer L3).

Related but different: §5.5.12 «Зазнач. твір» / «Цит. твір» / Op. cit. is the repeat form when the earlier cite is **not** adjacent. It is plain `position="subsequent"`. It competes with the §5.5.2 short-title repeat form (`Захара І. Лекції з історії філософії. С. 86`), so the two ship as separate style variants.

### «Його ж / її ж / їх же» (idem), §6.5.1

Inside one complex reference (several works separated by `;`), when a work has the same author as the previous one, the author heading is replaced:

`Туркот Т. І. Педагогіка вищої школи … С. 128 ; Його ж. Психологія і педагогіка … С. 230.`

- The standard says «**можна**» (may). Replacement is optional, so **when gender is unknown the heading is simply repeated, which is compliant**. The renderer never guesses.
- «Їх же» (several authors) needs no gender.
- The §6.5.2 numbered form (`Автор: 1) … ; 2) …`) is gender-neutral. It is the alternative when gender is unknown, which raises G3's priority.
- Gender belongs to the person, not the item, and bibliographic names are usually initials (`Туркот Т. І.`). It cannot be read from the rendered heading. Resolver tiers are in §5 (P7).
- It works across the cites of one citation cluster, which the item-level hook cannot see (see L3).

## 2. Layers

| Layer | What | Touches Zotero internals? |
|---|---|---|
| L0 Data conventions | Which Zotero fields and `Extra` keys hold DSTU data | no |
| L1 Static CSL | Standard-valid style files, compiled from one shared source | no |
| L2 Item shim | Zotero 7 plugin wrapping `Zotero.Cite.System.prototype.retrieveItem` (`ref/zotero-cite.js:633`) to rewrite each item before rendering | yes |
| L3 Output post-processor | Rewrites rendered clusters and bibliography entries where neighbours matter | yes, fragile |
| L4 Requirements manifest and linter | Says what each source needs for ДСТУ; runs in Zotero or as a CLI | no (CLI) / light (pane) |
| L5 Resolver | Proposes values into L0 for user confirmation (name dictionary, search, optional model) | no |

Principle: rendering must be deterministic. Search and models never run at render time. They propose values that are written into data (L0) after the user confirms, and the renderer only reads data.

Every feature that needs L2 or L3 must define its **no-plugin fallback** (what Pandoc, Better BibTeX, zotero.org, mobile and a colleague without the plugin see). The fallback must be sane, not broken, and is tested.

Shim scope stays as small as possible. First check whether Zotero's own `Extra` handling already carries `genre`, `medium`, `available-date` and similar CSL variables (spike S2). Only what `Extra` cannot carry goes into the shim.

## 3. Gap-to-layer map

| Gap | Solved in | Approach | Closed at |
|---|---|---|---|
| G1 author count (1–3 vs 4+), heading and short in-text cite | L2 + L1 | Shim **adds** a marker name variable holding "Перший А. та ін." for 4+ authors and keeps `author` (S1: embedded documents bake in the shim output). Style tests `variable=` on the marker: title first and marker in the responsibility; without it, author heading. Marker variable: `curator` (Zotero maps `script-writer` and `source` from its own fields, per the Opus review). | P4 |
| G2 Його ж | L3 + L5 | Cluster post-processor swaps the heading. Unknown gender repeats the name. | P6, gender P7 |
| G3 numbered complex refs | L3 | Same cluster rewriting. | P6 |
| G4 title truncation «…» | L2 | Truncate to N words (configurable) or use `Short Title`. DSTU gives no N. | P4 |
| G5 «Там само» across articles | L3 | Bibliography post-processor on consecutive entries with equal container, year, volume, issue. | P6 |
| G6 Цит. за | L0 | Per-cite prefix in the word-processor dialog. Documented, no code. | never (manual) |
| G7 abbreviations (ДСТУ 3582, 6095, 7093, ГОСТ 7.12) | L2 (+ L5) | Dictionaries built from the standards. Skips main title and one-word title info (§4.5). On/off preference. Case endings by morphology library. | P4 |
| G8 Дата оновлення | L0 + L1 | `available-date: YYYY-MM-DD` in `Extra`, applied natively by citeproc-js. **No shim** (S2 confirmed). | P2 |
| G9 electronic-resource notes, version/level, «Також доступний», local vs remote | L0 + L1 | Free text and CSL variables (`medium`, `genre`, `edition`, `version`) in `Extra`; local vs remote inferred from url/medium. **No shim** except optional non-CSL keys. | P4 |
| G10 per-chapter numbering | none | Out of scope; document-wide is allowed by §5.4.1.1. | never (out) |
| G11 serial repeats, only differing elements (§5.5.5) | L3 | Compare with the previous cite. Approximation until then: always print title, year, issue, page. | P6 |
| G12 responsibility roles (упоряд., відп. ред., ред. рада, corporate body) and book genre (навч. посіб.) | L0 + L1 | CSL name variables (`compiler`, `editor`, `chair`, `contributor`) and `genre` in `Extra` (`Family \|\| Given`). **No shim** (S2). Corporate body that is not an author: convention open (D5). | P2 |
| G13 archives: structured fund/inventory/file/sheet/box, `[ ]` devised title, fund name, foreign-language abbreviations (§8) | L0 + L2 + L1 | Structured `Extra` keys assembled by the shim, per-language abbreviation table (uk, pl, ru). Locale override «Арк.» for folio. | P4 |
| G14 container-only cite and `//`→period+italic (§4.9, 4.9.1) | L1 | Style modes. | P2 |
| G15 optional omissions and punctuation sets (§4.4) | L1 | Compile-time variant matrix. | P2 |
| G16 ibid language | L1 | Decision in P0: language of the citing document, not the item. | P2 |
| G17 no-plugin fallback | all | Per-feature fallback and tests. | P4 |

Cheap in P2, not gaps: §5.5.12 «Зазнач. твір»; §5.5.7 and §5.5.8 short forms for patents and standards; DOI over URL (§7.4.4.3.1); year added on same-author disambiguation (§5.4.6.2).

Items from section B of `FINDINGS.md`:

| Item | Layer |
|---|---|
| Per-language layouts (`layout locale`) | L1, non-standard, so validated by our own tests, not the CSL schema |
| Ibid capitalisation, locale term overrides, neuter ordinals «2-ге / 3-тє» | L1 |
| Several citation forms (numeric, author, author-date, in-text, footnote) | L1 compiled from shared macros |
| Footnote markers (superscript, `*`, spacing) and numbering | word processor, documented, out of scope |
| Cyrillic-first sorting | L1 |

## 4. Repository layout to build

```
docs/                     reference material (exists)
rules/                    rule registry: one record per normative statement
manifest/                 L4: requirements as data (JSON), one file per item type family
data/                     abbreviation dictionaries (3582, 6095, 7093, 7.12), archive abbreviations
src/styles/               L1: shared source + compiler
build/                    generated .csl files
plugin/                   L2/L3: Zotero 7 plugin
resolver/                 L5: gender/name resolver
tools/lint/               L4: CLI linter
tests/corpus/             every "Приклад" in the standard: CSL JSON input + expected string
tests/synthetic/          boundary cases per rule
tests/sequences/          cite-sequence scenarios
tests/library/            ~150 real items
```

## 5. Milestones

### P0. Foundations
- **Rule registry.** One record per normative statement: ID (`8302:5.5.9.1`), quote, force (обов'язково / рекомендовано / можна), status (CSL, shim, post-processor, manual, out of scope), linked tests. Coverage is measured per rule. Every «можна» option gets a test per branch.
- **Corpus.** About 51 «Приклад» blocks. `pdftotext` output is damaged (dropped periods, Latin `C.` in Cyrillic, inconsistent spacing around `:`, `/`, `//`, dash types), and the standard calls its examples «умовні». Render the PDF pages to images and hand-transcribe each expected string. Deviations from the standard's own rules are annotated, not silently fixed.
- **Fetch** ДСТУ ГОСТ 7.1:2006, ДСТУ ГОСТ 7.80:2007 and ГОСТ 7.12 into `docs/`. Do not assume their content before that.
- **Harness:** `citeproc` npm package, headless. Not identical to Zotero, so Zotero checks remain (S4).
- **Decisions:** which options are separate style files and which plugin preferences (variant matrix); ibid language (G16); default punctuation set.
- **Exit:** every rule has a status; the corpus renders through the harness, even if output is still wrong.

### P1. Risk spikes (small, throwaway)
- **S1:** does a value written by a `retrieveItem` wrapper reach the style, and which variables survive? Decides G1, G8, G9, G13. Include the embedded-item branch (`ref/zotero-cite.js:637`).
- **S2:** can `Extra` alone carry `genre`, `medium`, `available-date`?
- **S3:** can Zotero 7 rewrite rendered clusters and bibliography entries after the fact? Decides G2, G3, G5, G11. Options: (a) rewrite strings after rendering, (b) cite-specific virtual items through the embedded-item mechanism.
- **S4:** does Zotero's local API (`?format=bib&style=`) render through the same path as the word-processor plugin? Decides whether tests can run in real Zotero.
- **Exit:** a written architecture decision. If S3 fails, G2, G3, G5 and G11 become documented manual workarounds now.

### P2. Pure-CSL core
- Bibliography styles per item type; start from `ref/existing-KY-v20250209.csl`; shared-source compiler; variant matrix (G15).
- Citation forms: footnote, in-text `( … )`, numeric `[2, с. 28]`, author `[Автор]`, author-date; each in full and short form; container-only mode (G14).
- Positions: `ibid`, `ibid-with-locator`, `subsequent` (§5.5.12 and §5.5.2 variants), per-type short forms for patents and standards.
- Locale overrides: Т., Вип., «Арк.», neuter ordinals, «Там само» capitalisation, range delimiter.
- Access date, DOI over URL, year on same-author disambiguation.
- Per-type layouts only after ДСТУ ГОСТ 7.1 is in `docs/`; inventory the item types first (statute, patent, standard, thesis, multi-volume, encyclopedia, statistical collection, newspaper, e-journal, database, forum, archive).
- **Exit:** the corpus passes for every rule not tagged shim or post-processor.

### P3. Requirements manifest and linter (L4)
Independent of P2; can run in parallel. Ships first to users because it needs no patching.
- Manifest schema: item type, language, online or not, required and recommended fields, conditional rules (4+ authors, multi-volume, patent, archive, etc.).
- CLI over CSL JSON exports, then over the Zotero local API if enabled.
- Output: per-item list of missing fields in plain Ukrainian.
- Also flags `Language` values that are not normalisable.
- Fixtures: one positive and one negative per manifest rule.

### P4. Item shim (L2), the MVP
Only after S1 and S2.
- Zotero 7 plugin scaffold; wrapper on `retrieveItem`, including the embedded-item branch.
- G1 (heading and short in-text cite), G4, G7, G13, and non-CSL parts of G9. (G8 and G12 moved to P2 after S2.)
- No-plugin fallback per feature (G17); every shim test runs with the shim on and off.
- **Exit (MVP):** every gap whose fix depends on a single item is closed.

### P5. Word-processor check
Word and LibreOffice: refresh, copy between documents, colleague without the plugin (documented degradation).
- **Done:** the refresh path through Zotero's integration code with a fake document (Zotero 7–10), including bibliography fields, RTF escaping and omitted entries.
- **Open, needs the user:** install `build/dstu-8302-0.1.0.xpi` and a style in the real Zotero, insert the sample citations (a book, the same book again for «Там само», an article with pages and a URL, an item with 4+ authors; the sample items carry the tag `dstu-test`), and report how Word renders footnotes and the bibliography. Then the same in LibreOffice, and a colleague's Zotero without the plugin.

### P6. Output post-processor (L3)
Only if S3 passed.
- G5 first (deterministic, bibliography only), then G11.
- Then G3 (gender-neutral).
- Then G2, with unknown gender repeating the name.
- Cut whatever proves too fragile; it stays manual.

### P7. Gender resolver (L5, optional)
Off by default; every suggestion needs user confirmation; results cached **per person** (not per item, since one person appears on many items). Tiers, cheapest first:
1. Full first name or patronymic in the item. A name dictionary beats a classifier here: patronymics (-ович, -івна) are unambiguous.
2. Surname morphology (-ська, -ова) with a confidence score. -енко and -ук are ambiguous.
3. Search: OpenAlex, Crossref, ORCID, Wikidata (P21) or library catalogs by surname and title. Returns full names for published works.
4. Ask the user once.

Privacy: send only surname and title, and only for items with a public identifier (DOI, ISBN or URL); never whole items, `Extra`, notes or abstracts. Libraries can hold unpublished manuscripts. Also usable for morphology in G7, field normalisation ("3 вид." → edition) and language detection.

Model note: a classifier such as Jev (returns typed choices and scores) fits gender, language detection and field classification, but cannot search or generate text, so search plus a model that reads the results is a different design. Before use, check Ukrainian support, API status and privacy policy. Everything sits behind an interface so any resolver can be swapped in. The MVP does not depend on it.

### P8. Release
- Run the real-library set through all styles.
- Expert review of the rule registry (ideally a librarian). Tests trace to rule IDs so the reviewer reads rules, not thousands of strings.
- Freeze the `Extra` conventions.

## 6. When a gap is closed

| Gap | Closed at | "Closed" means |
|---|---|---|
| Ibid, §5.5.12, §5.5.7 and §5.5.8 short forms, DOI, ordinals, «Арк.», G14–G16 | P2 | corpus tests pass |
| G1, G4, G7, G13 (G8, G12, most of G9 at P2) | P4 | tests pass with the shim on; no-plugin fallback verified |
| G5, G11 | P6 | tests pass |
| G3, then G2 | P6, gender P7 | tests pass; unknown gender repeats the author |
| G6, footnote markers, G10 | never | listed as manual or out of scope |

The project is done when the rule registry has no rule marked "unassigned" and every rule is passing, documented as a manual workaround, or documented as out of scope. MVP is the end of P4.

## 7. Testing

The oracle problem: nobody can machine-verify «correct ДСТУ». Expected strings are hand-authored, so tests trace to rule IDs and humans review rules.

| Level | What |
|---|---|
| Corpus | The standard's own examples, verified against PDF page images |
| Synthetic | 0, 1, 3, 4 authors; corporate author; multi-volume; page ranges; missing place or publisher; uk, ru, en, pl items |
| Sequences | A A same page; A A other page; A B A; volume 9 then 7; multi-cite clusters; serial articles; «Цит. за» prefix |
| Real library | About 150 items from translators, catalogs, CrossRef, RIS. Real data has initials only, single-field names, missing `Language` |
| Second opinions | Diff against `existing-KY`; other DSTU 8302 styles or generators if they exist. Never the oracle |
| Engines | `citeproc` in node for speed; Zotero (local API, or a harness inside the plugin) for parity |
| Shim on/off | Each shim feature tested both ways, differences listed |
| Linter | One positive and one negative fixture per rule |
| Compiled styles | Every variant-matrix combination compiles. `layout locale` is outside the CSL schema, so validate with our own checks |

## 8. Risks

- Patching Zotero internals can break on Zotero updates; keep the patch surface to one function and pin a tested Zotero version.
- Documents rendered without the plugin change appearance; document, warn, and test the fallback.
- The `layout locale` extension is outside CSL 1.0.2; the styles cannot go to the official CSL repository as is.
- Abbreviating with case endings (ДСТУ 3582) is linguistically messy; start with a small curated list.
- Extra-field conventions need to be stable early because users' data will depend on them.
- The standard's examples are «умовні» and internally inconsistent; the corpus can be wrong in ways only PDF checking and expert review catch.
- Per-type layouts depend on ДСТУ ГОСТ 7.1, which is not yet read.

## 9. Product shape: choosing a style

### Problem
The compiler yields 20 default styles and 160 variants. A user cannot be expected to know which one to install, and `Document Preferences` in Word lists every installed style.

### Decision (2026-11-02)
- Ship **two visible styles**: «ДСТУ 8302 — виноски» (class `note`) and «ДСТУ 8302 — у тексті» (class `in-text`). Zotero fixes a style's class at install time, so footnote versus in-text must be a visible choice. Numeric, author and author-date share the in-text stub.
- Everything else is a **variant** chosen in the plugin: form (for in-text), zone separator (`.` or `. –`), repeat form (short title or «Там само» in the op-cit style). A variant is the string `form/zone/repeat`, for example `author-date/period-dash/short-title`.
- The user chooses among **a few fixed options, each shown rendered**; there is no inference. Rejected: choosing by matching the user's example references (nobody will go through sample references), training a model (the choice is not a classification problem without a reference point), and deviations from the standard (different feature, needs human or AI judgement).
- The 20 compiled `.csl` files are still built and published for people who cannot run the plugin (Pandoc, Overleaf, Zotero without the plugin). The plugin is the primary path.

### Mechanism (proven by spikes)
1. The plugin installs the two stub styles. Their content is a complete, compliant default variant, so a document opened without the plugin still renders sanely.
2. `Style.prototype.getXML` is wrapped. For a stub it returns the compiled variant, by the current document's variant, else by the global default, else the built-in default. (`src/styles/stubs.mjs`, `plugin/hooks.js`)
3. The variant string is stored in the document itself as `prefs.dstuVariant` inside Zotero's document data. Zotero writes unknown `prefs` keys back unchanged (checked in the source of Zotero 7 and 10 and by the test). It travels with the .docx.
4. `Integration.Session.setData` is wrapped: it reads the document's variant, forces a style rebuild when it changed, and exposes the variant while the engine is built.
5. Zotero 7 caches engines per style across sessions; `getCiteProc` clears the stub's cache whenever the variant differs from the one that built the cached engine. Zotero 10 does not cache in the integration path (read from its source); 8 and 9 pass the same tests.
6. Tested (`plugin/tests/perdoc.js`, 11 cases on Zotero 7–10): two variants in two documents, A then B then A with no contamination, a same-session switch, and no variant meaning the default. The test fails 6/11 with the hooks off.

### Consequences to state in the UI and the docs
- The global default is only for new documents; a document with a stored variant keeps it. Changing the default does not rewrite existing documents.
- A document with a stored variant and no plugin shows the stub's default variant, and the stored value is ignored.
- Other citation clients that build engines from the style (the quick-copy, the citation dialog preview, Zotero's own bibliography export) show the global default, not the document's variant.

### Steps, in order
1. **Variant model.** Fix the variant grammar and keep it backward compatible: `form/zone/repeat` now; optional flags (container-only, analytic, url-only, bibliography sort) appended later as `+flag`. Decide which flags are user-visible at all. Validate on read, fall back to the default for unknown values.
2. **Settings pane** (Zotero 7+ preference panes). A page under *Settings → ДСТУ 8302* with the default for each stub: choices as cards, each with a live-rendered sample (a footnote, a repeat, a bibliography entry) produced by compiling the variant and running a temporary engine over built-in sample items, plus a full preview. Store in Zotero prefs; the hooks read the prefs into `config.defaults` on change. Ukrainian strings via the plugin's locale files. Verify the pane API on 7, 8, 9, 10.
3. **Per-document picker.** Open question: where to put it. Candidates, spike each on 7–10 before choosing:
   - a control injected into Zotero's *Document Preferences* dialog (`chrome://zotero/content/integration/integrationDocPrefs.xhtml`), observed through a window listener; most natural, most fragile across versions;
   - our own small dialog opened by the plugin when a document is first set up with a DSTU stub;
   - a custom integration command, if Zotero lets a plugin register one (unverified);
   - fallback: no per-document picker, only the global default, plus a documented way to set the variant (a copyable string).
   The picker must show the same rendered cards as the pane, write `prefs.dstuVariant`, and trigger a refresh.
4. **Migration and safety.** What happens when a stored variant is invalid, when the plugin is updated and the compiler output changes, and when the stub IDs are installed by an older plugin version.
5. **Real Word and LibreOffice** (P5, needs the user). Also check that Word keeps `dstuVariant` after Save and reopen.
6. **Docs for users** in Ukrainian: install, which of the two styles to pick, the variant options, the Extra conventions cheat sheet (`corporate:`, `curator`, archive keys, `type:`, «Електронний ресурс»), what happens without the plugin.
7. **Release** (P8): real `update_url`, a stable add-on ID, a signed or documented unsigned install, a changelog, and a published copy of the 20 compiled styles.

### Decisions (2026-11-02)
- Everything ships in v1: the settings pane, the per-document picker, and all options.
- Every option the compiler implements is visible: form, zone separator, repeat form, analytic separator, container-only, URL-only, bibliography order, and the §4.4 flags for omitting the medium mark [Електронний ресурс], the series and the publisher and for adding the ISBN. Two §4.4 options are still not shown: the heading-authors limit (the shim already turns four or more authors into a curator, so the compiler cannot change it alone) and pages total versus locator (it would drop the cited page from notes).
- Style names stay «ДСТУ 8302 — виноски» and «ДСТУ 8302 — у тексті». Option names are in `src/styles/variant.mjs`.
- The compiled `.csl` files ship as a secondary download: `node tools/styles/pack.mjs` builds `build/dstu-8302-styles-<version>.zip` with a Ukrainian README.

### Built and tested (2026-11-02)
- Variant grammar `form/zone/repeat[/analytic=period][/bibSort=none][/containerOnly][/urlOnly]` with validation and fallback (`src/styles/variant.mjs`, `tests/styles/variant.test.mjs`).
- Preview renderer: compiles a variant, runs a temporary engine over three sample items and returns rendered citations and bibliography entries (`plugin/preview.js`, `src/styles/samples.mjs`).
- Picker component: one card per choice with its own rendered sample, plus a full example (`plugin/picker.js`). Used in the settings pane (`plugin/pane.js`, `plugin/prefs.xhtml`; stores defaults in `extensions.dstu8302.variant.<class>`) and injected into Zotero's Document Preferences dialog (`plugin/hooks.js`), where it appears when one of the two styles is selected and writes `prefs.dstuVariant` into the document.
- `plugin/tests/dialog.js` opens the real dialog with a fake document, selects the style, clicks cards, accepts and checks the stored data; it also opens the settings pane. 5/5 on Zotero 7.0.32, 8.0.4, 9.0.3 and 10.0.7. Not driven with real mouse clicks.

The plugin installs the two stub styles on startup, so the user installs only the xpi.

### Still to do
- Real Word and LibreOffice check (needs the user) and the user documentation in Ukrainian.
- Decide whether the heading-authors limit and pages total versus locator are worth a shim change; they are the only §4.4 options not in the picker.
- Visual check of the pane and the dialog layout (window height, dark mode); the tests check content, not appearance.
- Release: real `update_url`, changelog.
