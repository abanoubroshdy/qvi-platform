# PDF→Word Phase 0 — Baseline diagnostics

Measurement only. No layout/converter behavior changes in this phase.

## Goals of this baseline

1. Confirm broken-font Arabic recovery ratio on the real vocal form.
2. Confirm Word XML stays free of illegal controls after normalize.
3. Record layout debt: **0 tables**, tab/checkbox-heavy pages → `partial_broken`.
4. Freeze page classes: `clean` | `partial_broken` | `needs_visual` for later phases.

---
# vocal_assessment_form.pdf

Generated: 2026-09-22

## Summary

- Pages: 4
- Overall class: **partial_broken**
- Clean / partial_broken / needs_visual: 1 / 3 / 0
- XML valid (no illegal controls in normalized text): true
- Mean recovery ratio: 1.000
- Garbage leftovers (font garbage + PUA): 0
- Tables detected: 0
- Tabs in output: 51
- Checkbox glyphs: 21

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Blocks | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | partial_broken | 1.000 | 0 | 4 | 5 | 10t/0i | tab_heavy_layout, form_controls_without_tables, likely_lost_table_structure |
| 2 | partial_broken | 1.000 | 0 | 23 | 0 | 23t/0i | latin_corruption, tab_heavy_layout |
| 3 | partial_broken | 1.000 | 0 | 24 | 16 | 23t/0i | latin_corruption, tab_heavy_layout, form_controls_without_tables, likely_lost_table_structure |
| 4 | clean | 1.000 | 0 | 0 | 0 | 2t/0i | healthy_text |

## Notes

- `tableCount` is always 0 in the current converter (Y-line → paragraph path; no table reconstruction yet).
- `partial_broken` with `tab_heavy_layout` / `form_controls_without_tables` flags layout debt for later phases (columns / tables).
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
- Tabs in output: 2
- Checkbox glyphs: 2

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Blocks | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | partial_broken | 1.000 | 0 | 2 | 2 | 2t/0i | form_controls_without_tables |

## Notes

- `tableCount` is always 0 in the current converter (Y-line → paragraph path; no table reconstruction yet).
- `partial_broken` with `tab_heavy_layout` / `form_controls_without_tables` flags layout debt for later phases (columns / tables).
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
- Tabs in output: 0
- Checkbox glyphs: 0

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Blocks | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 0 | 3t/0i | healthy_text |

## Notes

- `tableCount` is always 0 in the current converter (Y-line → paragraph path; no table reconstruction yet).
- `partial_broken` with `tab_heavy_layout` / `form_controls_without_tables` flags layout debt for later phases (columns / tables).
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
- Tabs in output: 7
- Checkbox glyphs: 4

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Blocks | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | partial_broken | 1.000 | 0 | 7 | 4 | 1t/0i | tab_heavy_layout, form_controls_without_tables, likely_lost_table_structure |

## Notes

- `tableCount` is always 0 in the current converter (Y-line → paragraph path; no table reconstruction yet).
- `partial_broken` with `tab_heavy_layout` / `form_controls_without_tables` flags layout debt for later phases (columns / tables).
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
- Tabs in output: 0
- Checkbox glyphs: 0

## Per-page

| Page | Class | Recovery | Garbage left | Tabs | ☐ | Blocks | Reasons |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | clean | 1.000 | 0 | 0 | 0 | 3t/0i | healthy_text |

## Notes

- `tableCount` is always 0 in the current converter (Y-line → paragraph path; no table reconstruction yet).
- `partial_broken` with `tab_heavy_layout` / `form_controls_without_tables` flags layout debt for later phases (columns / tables).
- `recoveryRatio` = (raw font-garbage chars removed) / (raw font-garbage chars); 1.0 means full strip or no garbage.

---

## Implications for later phases

| Signal | Phase |
| --- | --- |
| `latin_corruption`, leftover `%asic` / `7echnical` | Phase 1 — text cleanup |
| `tab_heavy_layout` | Phase 2 — columns |
| `form_controls_without_tables` / `likely_lost_table_structure` | Phase 3 — tables |
| `needs_visual` pages | Phase 4 — hybrid visual |
| polish / UX | Phase 5 |

Regenerate: `node scripts/pdf-to-word-baseline.mjs`
