# PDF→Word Phase 0–6 — Diagnostics baseline (post layout density)

Layout stack complete; Phase 6 densifies editable Word output (compressed gaps, drop emptyish blocks, no blank table spacers).

## Goals of this baseline

1. Confirm broken-font Arabic recovery ratio on the real vocal form.
2. Confirm Word XML stays free of illegal controls after normalize.
3. Confirm Phases 1–4: latin cleanup, columns, form tables, hybrid visual reference.
4. Phase 5 ships UX polish; Phase 6 densifies layout so pages are not mostly blank.
5. Metrics below stay the conversion quality baseline (density is spacing, not recovery counts).

---
# vocal_assessment_form.pdf

Generated: 2026-09-22

## Summary

- Pages: 4
- Overall class: **clean**
- Clean / partial_broken / needs_visual: 4 / 0 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 21
- Form tables (checkbox grids): 9
- Tabs in output: 0
- Checkbox glyphs: 20

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 4 | 2 | 2 | hybrid_visual_reference |
| 2 | clean | 1.000 | 0 | 0 | 0 | 10 | 0 | hybrid_visual_reference |
| 3 | clean | 1.000 | 0 | 0 | 16 | 9 | 7 | hybrid_visual_reference |
| 4 | clean | 1.000 | 0 | 0 | 0 | 0 | 0 | healthy_text |

## Notes

- `tableCount` includes Phase 2 column grids and Phase 3 form tables.
- `formTableCount` counts bordered checkbox/option grids (`role: form`).
- `hybrid_visual_reference` means editable text plus a page preview image (Phase 4).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

# broken-font-arabic (broken-font-arabic.json)

Generated: 2026-09-22

## Summary

- Pages: 1
- Overall class: **partial_broken**
- Clean / partial_broken / needs_visual: 0 / 1 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 0
- Form tables (checkbox grids): 0
- Tabs in output: 2
- Checkbox glyphs: 2

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | partial_broken | 1.000 | 0 | 2 | 2 | 0 | 0 | form_controls_without_tables |

## Notes

- `tableCount` includes Phase 2 column grids and Phase 3 form tables.
- `formTableCount` counts bordered checkbox/option grids (`role: form`).
- `hybrid_visual_reference` means editable text plus a page preview image (Phase 4).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

_Visual-order Arabic mixed with Canadian Aboriginal / Armenian ToUnicode garbage_

---

# clean-arabic-logical (clean-arabic.json)

Generated: 2026-09-22

## Summary

- Pages: 1
- Overall class: **clean**
- Clean / partial_broken / needs_visual: 1 / 0 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 0
- Form tables (checkbox grids): 0
- Tabs in output: 0
- Checkbox glyphs: 0

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 0 | 0 | 0 | healthy_text |

## Notes

- `tableCount` includes Phase 2 column grids and Phase 3 form tables.
- `formTableCount` counts bordered checkbox/option grids (`role: form`).
- `hybrid_visual_reference` means editable text plus a page preview image (Phase 4).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

_Logical-order Arabic paragraphs with no font garbage_

---

# form-checkboxes-tabs (form-checkboxes-tabs.json)

Generated: 2026-09-22

## Summary

- Pages: 1
- Overall class: **partial_broken**
- Clean / partial_broken / needs_visual: 0 / 1 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 0
- Form tables (checkbox grids): 0
- Tabs in output: 7
- Checkbox glyphs: 4

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | partial_broken | 1.000 | 0 | 7 | 4 | 0 | 0 | tab_heavy_layout, form_controls_without_tables, likely_lost_table_structure |

## Notes

- `tableCount` includes Phase 2 column grids and Phase 3 form tables.
- `formTableCount` counts bordered checkbox/option grids (`role: form`).
- `hybrid_visual_reference` means editable text plus a page preview image (Phase 4).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

_Form-like layout with checkboxes and tabs (no tables in converter)_

---

# simple-english-form.pdf

Generated: 2026-09-22

## Summary

- Pages: 1
- Overall class: **clean**
- Clean / partial_broken / needs_visual: 1 / 0 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 0
- Form tables (checkbox grids): 0
- Tabs in output: 0
- Checkbox glyphs: 0

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 0 | 0 | 0 | healthy_text |

## Notes

- `tableCount` includes Phase 2 column grids and Phase 3 form tables.
- `formTableCount` counts bordered checkbox/option grids (`role: form`).
- `hybrid_visual_reference` means editable text plus a page preview image (Phase 4).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

## Phase status

| Signal | Phase | Status |
| --- | --- | --- |
| `latin_corruption` | Phase 1 — text cleanup | **done** |
| `tab_heavy_layout` | Phase 2 — columns | **done** |
| checkbox / option grids | Phase 3 — form tables | **done** |
| `hybrid_visual_reference` | Phase 4 — hybrid visual | **done** |
| progress / summary / copy | Phase 5 — polish | **done** |
| empty-looking Word / huge gaps | Phase 6 — layout density | **done** |

Regenerate: `node scripts/pdf-to-word-baseline.mjs`
