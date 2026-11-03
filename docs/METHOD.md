# Method

**Screening-level cradle-to-gate estimate (A1–A3), with an optional A4 transport figure. Not an EN 15978 / ISO 14040/44 LCA.**

## System boundary

The total is the product stage, modules A1 to A3: raw materials, transport to the factory, manufacturing. Transport to site (A4) is worked out separately, only for lines that have a delivery leg, and is never added into the A1–A3 total. Construction, use and end of life are out of scope.

The sources do not share one boundary:

| Source | Boundary | GWP basis |
| --- | --- | --- |
| DESNZ 2026 "Material use" | Extraction, processing, manufacture and transport to the point of sale, so slightly wider than A1–A3. Biogenic CO₂ excluded. | Kyoto basket, CO₂e |
| ÖKOBAUDAT generic datasets (OBD_2024_II) | A1–A3 under EN 15804+A2, indicator GWP-total. **Includes an uncertainty penalty of 10, 20 or 30%** on purpose, so values lean conservative. | EN 15804+A2 |
| DESNZ 2026 "Freighting goods" (A4) | Direct (tank-to-wheel) emissions of the freight vehicle. Well-to-tank fuel emissions are not included. | Kyoto basket, CO₂e |
| US EPA supply chain factors v1.3.0 (spend view only) | Cradle to purchaser, including margins. | IPCC AR5, 100-year |

A total that mixes DESNZ and ÖKOBAUDAT is a screening figure. Within one line's alternatives the source, and so the boundary, is always the same.

## Calculation

`kg CO₂e = quantity in the factor's declared unit × factor value`, summed over counted lines.

A line counts when it is accepted, or when it is pending with a factor and high confidence (0.8 or more) while auto-accept is on. Rejected lines never count. An accepted line with no factor, or with a unit that cannot be converted, stays out of the total and is reported as an error on the line and on the overview: nothing is silently set to zero.

Auto-accept is on for a bill of materials, which comes from a person's own table, and off for extracted documents.

## Unit conversion

Code: `lib/engine/units.ts`, tested in `units.test.ts`.

| From | To | How |
| --- | --- | --- |
| t, kg, g | kg, t | Exact |
| m³, l | kg or t | Density: the line's if given, otherwise the factor's |
| m (cable, pipe, kerb) | kg | The line's kg per metre, which must be given |
| m² | kg | The line's kg per m², which must be given |
| kg | m³ | The factor's density |
| kg | m² | The factor's mass per m² (grammage) |
| pcs | anything | Refused |

Missing data is an error on the line, never an assumed value. DESNZ factors are per tonne, so a volume line borrows the gross density published in an ÖKOBAUDAT dataset, named in the factor's `densitySource`.

## Matching

Code: `lib/engine/match.ts`. An ordered list of English and German keyword rules, most specific first; the first that matches wins. Concrete is read by strength class, and a class between datasets rounds **up** (C35/45 is matched to C50/60) so the error is on the high side.

| Confidence | Meaning |
| --- | --- |
| High (0.9) | The line names the material or grade and the factor fits it directly |
| Medium (0.6) | A proxy, or a material with an unstated detail (steel route, insulation type, engineered timber) |
| Low (0.3) | A weak proxy (battery modules, transformers, inverters), or a material found with no real factor |

Proxy and unverified factors are capped at medium, whatever matched them. A reviewer's choice sets confidence to 1 and records that a person chose it.

## Extraction from documents

1. Text per page: unpdf (pdf.js) for PDFs, page-sized chunks for plain text. A scanned PDF has no text and is refused.
2. Page scoring: material words count 1, number-and-unit patterns count 2. Pages scoring 4 or more are sent, 12 at most. The project shows pages scanned and pages sent.
3. One call through `lib/llm`, with a strict tool whose factor id is limited to the catalogue or null. A truncated, refused or tool-less response is an error.
4. The tool input is validated again. Confidence is the lower of the model's and the rules'. When they disagree, the model's factor is used at medium confidence at most, with a note. A quote that is not on its stated page drops the line to low confidence with a visible reason.

Nothing extracted counts until a person accepts it.

## Alternatives and scenarios

A factor lists alternatives only from the same source, in the same declared unit, and lower; the build script enforces all three. A scenario is a named set of switches to those alternatives. Switches are only applied while they are still valid for the line's current factor.

## Transport (A4)

`kg CO₂e = mass in tonnes × distance in km × factor (kg CO₂e per tonne-km)`, per line with one leg. The mass comes from the same conversion as A1–A3, so a line measured in pieces, or a volume with no density, has no A4 and says so.

| Mode | kg CO₂e per tonne-km | DESNZ 2026 'Freighting goods' |
| --- | --- | --- |
| HGV, average (all diesel HGVs, average laden) | 0.10356 | D63 |
| HGV, rigid | 0.19947 | D51 |
| HGV, articulated | 0.07926 | D60 |
| Van, up to 3.5 t | 0.63511 | D35 |
| Rail freight | 0.02583 | D106 |
| Sea, bulk carrier (average) | 0.00353 | E145 |
| Sea, container ship (average) | 0.01612 | E159 |

## Data quality

Each counted line is **good** (a sourced, direct factor matched with high confidence or chosen by a person), **fair** (a proxy, or a medium-confidence match) or **poor** (a low-confidence match, or a factor that is not verified). The score is the good share of the counted total plus half the fair share, from 0 to 100, graded A (85+), B (70+), C (55+), D (40+) or E.

## Spend-based view

`kg CO₂e = EUR × 1.053 USD/EUR × factor (kg CO₂e per USD)`

- Factors: US EPA Supply Chain GHG Emission Factors v1.3.0 by NAICS-6, column "with margins", 2022 USD at purchaser prices. [doi.org/10.23719/1531143](https://doi.org/10.23719/1531143). Public domain.
- Rate: ECB reference rate, USD per EUR, annual average 2022.
- Euros are read as 2022 prices, with no inflation or purchasing-power adjustment.
- A premium multiplies a line's euros and leaves its commodity unchanged, which is the point of the comparison.

The material-to-commodity mapping is `SPEND_BY_FACTOR` in `scripts/build_factors.py`.

## Factors

All values live in `data/factors.json`, written by `scripts/build_factors.py` from the published files and APIs, with value, unit, scope, source, table and row, version, licence, URL and retrieval date. Retrieved 2 November 2026. The factor library in the app lists every one.

- **DESNZ 2026** (34 factors): 'Material use' rows for aggregates, asphalt, bricks, concrete, insulation, metals, mineral oil, plasterboard, wood, glass, large electrical items, Li-ion batteries, aluminium and plastics (HDPE, LDPE, PP, PVC), primary and the lower routes where published. Open Government Licence v3.0.
- **ÖKOBAUDAT** (23 generic datasets): ready-mix concrete C20/25 to C50/60 and their recycled-aggregate versions, CEM II and CEM III cement, cement and epoxy mortar, reinforcing steel, steel sections (blast furnace and EAF routes), aluminium section, copper sheet, crushed stone, gravel, sand, geotextile, PE-HD and PVC pipe, bitumen emulsion. Free of charge for all uses; unmodified data may be distributed if the source is named.

## Known limitations

- **Mixed boundaries.** DESNZ and ÖKOBAUDAT differ, as above. A mixed total is indicative.
- **ÖKOBAUDAT generic values are conservative by design** (10 to 30% penalty). A product EPD is often lower.
- **Proxies.** Transformers, inverters, battery modules, conductors and glazing rest on proxy factors. In the battery demo they are most of the total. Replace them with product EPDs before quoting a figure.
- **Conductor metal only.** Cable insulation and sheath are not counted.
- **Galvanised section stands in for plain structural steel**, which overstates it a little.
- **No sourced low-clinker concrete.** Concrete is often the largest hotspot and has no generic alternative in these sources.
- **UK and German averages.** Neither reflects a specific supplier.
- **A4 is one leg, tank-to-wheel.** Multi-leg journeys and fuel upstream emissions are not modelled.
- **Spend factors describe the US economy in 2022.** Read the direction, not the level.
- **Keyword matching** will mis-match unusual descriptions. That is why review exists.
