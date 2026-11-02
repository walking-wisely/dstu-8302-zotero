# ДСТУ 8302:2015 for Zotero

Citation styles and a Zotero plugin for the Ukrainian standard ДСТУ 8302:2015 (bibliographic references). CSL alone cannot express several of its rules («Там само», «Його ж», heading by one to three authors, archive records, and others), so the project has three layers: compiled CSL styles, an item shim and an output post-processor, and a Zotero plugin that ties them together and adds a style picker.

**Користувачам:** [посібник українською](docs/USER-GUIDE.uk.md).

## Install

1. Download `dstu-8302-<version>.xpi` from the [latest release](https://github.com/walking-wisely/dstu-8302-zotero/releases/latest).
2. In Zotero choose Tools → Plugins, click the gear, choose Install Plugin From File, and select the file.
3. Two styles appear: «ДСТУ 8302 — виноски» (notes) and «ДСТУ 8302 — у тексті» (in-text). Choose the remaining options in Settings → ДСТУ 8302, or per document in Word's Document Preferences.

Zotero 7 to 10 are tested. Every variant is also available as a plain `.csl` file in `dstu-8302-styles-<version>.zip`, for Pandoc, Overleaf and other CSL tools; those files lack the plugin-only rules.

## Develop

```
node --test tests/shim/ tests/post/ tests/styles/   unit tests
node tools/harness/run-corpus.mjs                    corpus against the compiled styles
node tools/styles/check-matrix.mjs                   every style variant compiles and renders
node tools/plugin/pack.mjs                           build/dstu-8302-<version>.xpi
node tools/styles/pack.mjs                           build/dstu-8302-styles-<version>.zip
tools/zotero/run.sh                                  tests inside a real Zotero (throwaway profile)
```

`PLAN.md` describes the architecture, the milestones and the testing approach; `FINDINGS.md` lists what CSL cannot express.

## What is not in this repository

The text of ДСТУ 8302:2015 and the related standards is copyrighted and is not included. `node tools/rules/check.mjs` verifies the rule quotes against `docs/dstu-8302-2015.md`; without that file the quote check is skipped. The corpus in `tests/corpus/` uses short examples from the standard.

## Licence

MIT, see `LICENSE`.
