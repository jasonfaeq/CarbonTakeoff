# Status

Last updated 3 November 2026. Something is listed as verified only if it was actually run.

## What works

- Projects saved in the browser: a library, duplicate, delete, rename, settings, undo and redo
- Import: CSV and XLSX with column mapping, project files (.json), share links
- Extraction from PDF and text specifications, behind an API key, with page selection and quote checks
- Lines: search, filters, section filter, bulk actions, keyboard review, a detail drawer with the working and the factor's provenance
- Overview: total, intensity per functional unit, data-quality grade, carbon budget, generated insights, material and section breakdowns, treemap, section-to-material flow
- Named scenarios with a waterfall from the baseline
- Transport (A4) per line, with bulk legs per section
- Spend-based against activity-based comparison
- Compare up to four projects
- Factor library with provenance for every factor
- Printable report, CSV export
- Command palette, keyboard shortcuts, light and dark themes, phone layouts
- Nine synthetic demos: seven bills of materials and two specifications

## Verified, and how

| Check | Method | Result |
| --- | --- | --- |
| Unit tests | `npm test` | 123 passing: conversion, matching, totals, scenarios, spend, transport, quality, insights, parsing, extraction, the LLM adapter (fake client), share links, chart layouts, demo files |
| Types and lint | `npx tsc --noEmit`, `npm run lint` | Clean |
| Factor values | `npm run factors` reads each from its source and asserts labels, units and licence fields | 57 material, 7 freight and 24 spend factors; all 34 DESNZ material values found in the revised flat file |
| Demo quotes | `npm run demo:cache` | All 35 quotes found on their stated pages, in the PDF and in the text spec |
| Hand check | 640 m³ × 257.69 kg/m³ = 164.9 t for the wind foundation slab, against the drawer's working | Matches |
| Extract route without a key | `curl` against the dev server | GET reports no key; a text spec gets 503 with the page counts; a JSON file gets 415; the sixth request in a minute gets 429 |
| Share links | Encoded in the page, opened at /share, imported | Same lines, scenarios and total |
| Phone width | 375 px, all project views and the home page | No horizontal page overflow after a fix to the header and the cards |
| Browser | Every view, light and dark, in Chromium | Read by eye |

## Reference figures

Every line with a factor accepted, the rest rejected:

| Demo | A1–A3 | All lower alternatives | Quality |
| --- | --- | --- | --- |
| Wind turbine foundation | 577.7 t | −109.7 t (−19.0%), 12 lines | C |
| Wind specification (PDF) | 551.3 t | −104.4 t (−18.9%), 12 lines | C |
| Battery storage | 2,865.2 t | −478.9 t (−16.7%), 6 lines | E (mostly proxies) |
| Solar park | 3,308.7 t | −1,100.9 t (−33.3%), 11 lines | E (mostly proxies) |
| Residential, concrete frame | 1,679.8 t | −123.2 t (−7.3%), 11 lines | B |
| Residential, mass timber | 1,022.3 t | −239.4 t (−23.4%), 16 lines | B |
| Warehouse | 4,063.0 t | −1,699.6 t (−41.8%), 12 lines | C |
| Road reconstruction | 808.7 t | −276.0 t (−34.1%), 9 lines | A |
| Water main (text spec) | 325.6 t | −81.3 t (−25.0%), 3 lines | C |

Spend against activity, wind demo, the two steel section lines at a 15% premium: spend-based +15.0%, activity-based −59.9%. The wind demo's A4 is 20.0 t.

## Not verified

- **Live extraction with a real API key** has not been run. The adapter is tested against a fake client only, and the demo extractions are hand-written.
- **Deployment.** Only `next dev` and `next build` on Windows. PDF parsing has not run on a serverless host.
- **Screen readers.** Labels and roles are in place; no assistive technology was used.
- **Real phones.** Emulated widths only.
- **Long PDFs.** Page selection is unit-tested and ran on the 6-page demo only.
- **ÖKOBAUDAT redistribution terms.** Read from the dataset licence fields and the manual, not confirmed with BBSR.

## Next

1. Run one live extraction with a key and compare it with the hand extraction.
2. Find a sourced low-clinker concrete; concrete tops most demos and has no alternative.
3. Replace the proxies that carry the most: battery modules, transformers, PV modules (not counted at all yet).
4. Add cable insulation and sheath, and a plain structural steel factor.
5. Move the browser checks into an end-to-end suite in the repo.
