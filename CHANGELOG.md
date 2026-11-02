# Changelog

## 0.2.0, 2026-11-02

First public release.

- Two styles, «ДСТУ 8302 — виноски» and «ДСТУ 8302 — у тексті», installed by the plugin on startup.
- A picker with rendered samples for 11 options: citation form, zone separator, repeat reference, analytic separator, container-only, URL-only, medium mark, series, publisher, ISBN and bibliography order.
- The picker appears in Settings → ДСТУ 8302 (default for new documents) and in the Document Preferences dialog of the word processor; the choice is stored in the document.
- Item shim and output post-processor for the rules CSL cannot express: «Там само», «Його ж», heading authors, archive records, patents, corporate bodies.
- The 20 compiled styles as a separate zip for tools without the plugin.
- Tested in Zotero 7.0.32, 8.0.4, 9.0.3 and 10.0.7 against a corpus of 66 cases; checked by hand in Word on macOS. LibreOffice is untested.

Not included: the heading-authors limit and the choice between total pages and locator.
