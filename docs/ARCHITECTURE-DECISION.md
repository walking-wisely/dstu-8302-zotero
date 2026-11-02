# Architecture decision (P1 exit) and P0 decisions

Date: 2026-09-29. Evidence: Zotero 10.0.4 source (unpacked read-only from `/Applications/Zotero.app` omni.ja, plus `ref/`), Zotero's bundled citeproc-js 1.4.61 run in Node (`spikes/*.mjs`, `tools/harness/engine.mjs`), and the standard.

## What was not verified

No spike ran inside the Zotero application, Word or LibreOffice. I tried to start an isolated Zotero profile with a spike plugin exposing an "evaluate JS" endpoint; the permission classifier refused it as a remote-code-execution surface, and I did not work around that. Everything below is therefore from source reading and from the same citeproc-js engine running in Node. Items marked **verify in Zotero** need a run in the real application. A safer variant that needs the user's go-ahead: a plugin with no listener that runs one checked-in script at startup and writes a result file.

## Spike results

### S1. Does a value written in `retrieveItem` reach the style?

**Yes for any CSL variable; add, never remove.**

- `Zotero.Cite.System.prototype.retrieveItem` (`cite.js`, same in the installed 10.0.4) builds the item with `Zotero.Utilities.Item.itemToCSLJSON` and returns it to citeproc-js. citeproc-js reads any CSL variable on that object. Node run: `genre`, `medium`, `available-date`, name variables (`container-author`, `script-writer`, …) all print (`spikes/s1-s2-node.mjs`).
- `cs:choose` `variable="X"` works on a name variable, so a shim-written marker can switch the layout (`spikes/s1-names-and-choose.mjs`). Without the marker the same style still renders sanely.
- **Embedded branch:** for items already stored in a Word document, `retrieveItem` returns the stored object (`embeddedItems`, `cite.js:637`). The stored object is itself the output of `retrieveItem` (`integration.js:3508`: `itemData = style.sys.retrieveItem(citationItem.id)`). Consequences: (a) a wrapper sees both branches and must work on CSL JSON (the `note` field), not on `Zotero.Item`; (b) whatever the shim writes is baked into the document; a colleague without the plugin renders from that baked data.
- **Decision D-shim:** the shim only **adds** derived variables (for example a marker variable for "4+ authors") and never deletes `author`, so documents rendered without the plugin degrade to the stated fallback rather than losing data.
- **Verify in Zotero:** that wrapping the prototype method at plugin startup takes effect for the word-processor session, and which spare name variable is safe as the 4+ marker (candidates: `script-writer`, `series-creator`; not used by book/article layouts here).

### S2. Can `Extra` alone carry `genre`, `medium`, `available-date`?

**Yes, without a plugin, for CSL variable names.**

- `itemToCSLJSON` maps Extra to the `note` variable after `extraToCSL` has normalised known field names (`utilities_item.js`). citeproc-js then runs `parseNoteFieldHacks` (`citeproc.js:440`), which turns leading lines `variable: value` into variables: text, dates (`available-date` is in `DATE_VARIABLES`), and names (`Family || Given`). It does not overwrite a variable the item already has (`spikes/s1-s2-node.mjs`, case S1b).
- `extraToCSL` does not know `available-date`, so it must be typed lower-case with a hyphen. `Available Date:` is left alone and printed as plain note text.
- Custom keys that are not CSL variables (`fund`, `inventory`, `file`, `sheet`, `box`, `title-devised`, `application-number`) are ignored by the style. Only a shim can read them.
- **Effect on scope:** G8 (Дата оновлення), the type-of-data and medium text in G9, `genre` in G12 and the role names in G12 (`compiler`, `chair`, `editor`) need **no shim**. They are manual data entry, then automatic rendering. The shim is left with: G1, G4, G7, G13 and the non-CSL parts of G9. FINDINGS row 12's claim that Zotero has no way to carry roles is corrected: CSL name variables through Extra do it.
- Correction to `FINDINGS.md`: the Zotero 10 schema (v44) **does** have a `standard` item type (and `dataset`, `preprint`), mapped to CSL `standard`. §5.5.8 short forms need no workaround type.

### S3. Can rendered clusters and bibliography entries be rewritten after the fact?

**Feasible by source; proof of concept works in Node; not proven in Zotero. P6 stays conditional.**

- The word-processor integration calls `this.style.processCitationCluster(citation, citationsPre, citationsPost)` and stores the returned text (`integration.js` `_updateCitations`), and `citeproc.makeBibliography()` for the bibliography (`getCiteprocBibliography`). Both are methods on a `CSL.Engine` returned by `Zotero.Style.prototype.getCiteProc`. A plugin can wrap that function and patch the two methods on the engine it returns. Preview and Quick Copy go through `previewCitationCluster` and `makeBibliography` on the same engine.
- Cross-cite state is available: `citationsPre` lists the earlier clusters, so "same author as the previous cite" (G2) and "same container as the previous entry" (G5) can be decided.
- Option (b), per-cite virtual items through `retrieveItem`, is **rejected**: `retrieveItem` receives only an item id, no cite context, and virtual ids would break `position` detection and the bibliography.
- **Chosen option (a′): the style marks the strings, the plugin rewrites them.** The style wraps the author heading in two invisible characters (U+2060 … U+2063). The plugin finds the marked span and substitutes it. Without the plugin the markers stay in the text (invisible, but present in search and copy) and the heading is repeated, which is compliant. `spikes/s3-postprocess-node.mjs` shows the rewrite («Його ж» on the second same-author work in a cluster) and the plain output.
- Risks: Zotero caches engines (`_cachedEngines`); Zotero 10 has an optional citeproc-rs engine (`cite.useCiteprocRs`, default **false**, `style.js`) that we do not support (it has no `layout locale`); the integration compares stored text to detect manually edited citations.
- **Verify in Zotero:** the wrapper survives the engine cache; edits by hand are still detected; Word and LibreOffice round trip. Until then G2, G3, G5 and G11 are labelled "post-processor, conditional" in `docs/FUNCTIONALITY.md`, each with its manual fallback.

### S4. Does Zotero's local API render through the same path as the word processor?

**Same item path; not the same cluster path. Tests run in Node against Zotero's own engine.**

- Quick Copy, the local API and bibliography export use `Zotero.Cite.makeFormattedBibliographyOrCitationList`, which calls `previewCitationCluster` for cites. It goes through `retrieveItem`, so item-level features (S1, S2) are testable there. It does **not** exercise `processCitationCluster` with `citationsPre`, which is where `position` (ibid, subsequent) and the post-processor live.
- **Decision D-test:** the harness (`tools/harness/`) extracts `citeproc.js` and the Ukrainian and English locale files from the installed Zotero and feeds them CSL JSON that includes the `note` field, using the same call sequence as the integration (`processCitationCluster`, `makeBibliography`). This gives engine parity (citeproc-js 1.4.61) without the application. Zotero-side glue (`itemToCSLJSON`, `extraToCSL`) is covered only by the CSL JSON inputs; a parity run in real Zotero is future work and needs the user's go-ahead (see top).
- The npm `citeproc` package (2.4.63) is a different major version from Zotero's and is not used.

## Consequences for the plan

- G2, G3, G5, G11 are **kept as conditional** rather than declared manual now, because S3 is feasible by source. Their manual fallback is documented.
- P4 (shim) shrinks: G8 and G12 and most of G9 move to "data entry in Extra, no plugin". Shim: G1, G4, G7, G13, non-CSL parts of G9.
- Every shim feature is add-only and has a stated no-plugin fallback (see `docs/FUNCTIONALITY.md`).

## P0 decisions

**D1. Variant matrix: which options are separate files and which are plugin preferences.** A static `.csl` has no preferences, so anything the style decides is a compiled file. Plugin preferences exist only for shim behaviours: abbreviations on/off, title-truncation N, resolver on/off.

Style axes, compiled from one source:

| Axis | Values | Published by default |
|---|---|---|
| Citation form | footnote, in-text `( )`, numeric `[2, с. 28]`, author `[Автор]`, author-date | all five |
| Zone separator (§4.4) | period, period-dash | both |
| Repeat form (§5.5.12 vs §5.5.2) | short title, «Зазнач. твір» | both |
| Ibid language (D3) | uk, ru, en | uk only; others on request |
| Other §4.4 omissions (GMD, publisher, series/ISBN, pages, URL label, container-only, analytic separator) | with / without | **fixed defaults**: nothing is omitted that data provides; other values are build flags, compiled on request |

So the published set is 5 × 2 × 2 = 20 files. Every combination of every axis must compile in CI (the "compiled styles" test), but only the default subset is released.

**D2. Default punctuation set:** period only (§4.4 says «рекомендовано»); period-dash is the variant. In-text cites always use the period (§5.2.4).

**D3. Ibid language (G16):** the language of the **citing document**, not of the cited item (§4.8 covers data about the cited document only). Implementation: the style's own locale (`default-locale`, or the language chosen in the word-processor dialog) supplies «Там само» / «Там же» / «Ibid». The `layout locale` per-item switch applies to the item's own data (С., P.), not to ibid.

**D4. Extra convention (provisional, frozen at P8):** use CSL variable names verbatim wherever a CSL variable exists; non-CSL keys use lower-case hyphenated names and are read only by the shim. Names: `Family || Given`. The cookbook is in `docs/FUNCTIONALITY.md`.

**D5. Open conventions** (no CSL variable; needed before P4): patent application number and bulletin reference (§5.5.7 example), several fund groups in one archive cite (§8.2.1 example), corporate body that is not an author (`corporate` vs `contributor` in the corpus inputs). The corpus uses placeholder keys for these and marks them.

**D6. Engine support:** citeproc-js only. citeproc-rs is unsupported.

**D7. Test oracle:** hand-transcribed strings, page-image verified, annotated where the standard is inconsistent (`tests/corpus/`); traced to rule IDs in `rules/rules.jsonl`.

## Standards fetched

- `docs/dstu-gost-7.1-7.80.md` from `source/dstu-gost-7.1-7.80-dnpb-2010.pdf`: a 98-page annotated publication (Державна науково-педагогічна бібліотека України, 2010) reproducing ДСТУ ГОСТ 7.1:2006 (section 1) and ДСТУ ГОСТ 7.80:2007 (section 6). Not the official edition; text extraction is unverified against page images.
- `docs/gost-7.12-93.md` from `source/gost-7.12-93.pdf` (Госстандарт Украины edition, 1995).
- **Not fetched:** ДСТУ 6095:2009 and ДСТУ 7093:2009. Their rules stay manual (`8302:4.5.c`).
- The per-type layouts in P2 depend on 7.1; it is now in `docs/` but has not been read into the rule registry yet.
