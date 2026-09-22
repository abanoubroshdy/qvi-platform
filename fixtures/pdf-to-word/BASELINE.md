# PDF→Word Phase 0–4 — Diagnostics baseline (post Phase 4 hybrid visual)

Editable reconstruction for text/forms; dense or mixed pages also attach a **visual reference** preview.
Phase 5 covers polish / UX.

## Goals of this baseline

1. Confirm broken-font Arabic recovery ratio on the real vocal form.
2. Confirm Word XML stays free of illegal controls after normalize.
3. Confirm Phases 1–3 cleared latin corruption, tabs, and form checkbox grids.
4. Confirm Phase 4 marks dense form pages with `hybrid_visual_reference` (still editable).

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
- Checkbox glyphs: 21

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Tables | Form | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 5 | 2 | 2 | hybrid_visual_reference |
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

## Implications for later phases

| Signal | Phase | Status |
| --- | --- | --- |
| `latin_corruption` | Phase 1 — text cleanup | **done** |
| `tab_heavy_layout` | Phase 2 — columns | **done** |
| checkbox / option grids | Phase 3 — form tables | **done** |
| `hybrid_visual_reference` / mixed art | Phase 4 — hybrid visual | **done** |
| polish / UX | Phase 5 | pending |

Regenerate: `node scripts/pdf-to-word-baseline.mjs`
