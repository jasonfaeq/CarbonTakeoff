# Decisions

The calls made while building this, and why. Numbered so the other docs can point at them.

1. **Factors come from a script, never from a keyboard.** `scripts/build_factors.py` reads the DESNZ workbook by cell, ÖKOBAUDAT by dataset UUID and the EPA file by NAICS code, asserts every label, unit and licence field it relies on, and writes `data/*.json`. Until it existed the app ran on synthetic values marked `PLACEHOLDER`, with a warning on every screen.

2. **Stable ids, sources as metadata.** A factor id names the material (`concrete-c30-37`, `steel-section-eaf`), not the source. Projects, demos and rules kept working when the placeholders were replaced, and a source can change later without touching them.

3. **DESNZ 2026 full set, cross-checked.** It was the newest set on the retrieval date. The revised flat file came out later, so the script checks every value it uses also appears there. All 34 do.

4. **ÖKOBAUDAT generic datasets only, bundled with attribution.** Each dataset's licence type reads "free of charge for all users and uses", and the ÖKOBAUDAT manual allows unmodified distribution if the source is named. Manufacturer EPDs are left out: each has its own owner, and using them would put real company names into demos. Confirm the terms with BBSR before any use beyond a demo.

5. **Alternatives: same source, same unit, lower.** Comparing across DESNZ and ÖKOBAUDAT would mostly measure their different boundaries. The build stops if an alternative breaks any of the three rules.

6. **Not every lower number is an alternative.** DESNZ's closed-loop concrete (3.2 kg/t) describes crushed concrete used as aggregate, and its re-used asphalt (1.7 kg/t) describes planings laid again as they are. Offering either as a replacement for new material would claim savings of over 95%, so neither is offered. Re-used asphalt is still the factor for a line that *is* re-used planings.

7. **C30/37 has no alternative.** In ÖKOBAUDAT the recycled-aggregate C30/37 dataset is higher than the ordinary one (279 against 258 kg/m³), and there is no generic low-clinker concrete. The overview says so when concrete is the top hotspot, rather than inventing a saving. The low-clinker option offered is at cement level, CEM II to CEM III.

8. **Rebar has no alternative either.** The ÖKOBAUDAT rebar dataset already models scrap-based EAF steel. The spend-vs-activity default switches structural steel sections instead, blast furnace to EAF route.

9. **A class between datasets rounds up, an unstated steel route means blast furnace.** Both put the error on the high side, and both are visible in the match reason.

10. **A separate Proxy badge, and a cap.** A verified number can still be a poor fit: copper sheet for a cable, cans and foil for an aluminium conductor, household appliances for a transformer, portable batteries for grid storage. Proxies are badged, capped at medium confidence and count as "fair" or worse in the quality score.

11. **Review before anything counts.** Auto-accept is on for a BOM, which comes from someone's own table, and off for extraction. Extracted lines start at zero until a person accepts them.

12. **Strict tool, auto tool choice.** The model is asked for one strict tool call whose factor id can only be a catalogue id or null. Some current models refuse a forced tool choice and `LLM_MODEL` can name any model, so the prompt asks for the tool instead. A response cut off at the token limit is refused, because a partial list looks complete in review.

13. **Quotes are checked against their page.** A quote that is not on the stated page drops the line to low confidence with a reason. It costs nothing and works with any model.

14. **The demo extractions are written by hand and say so.** No live extraction had been run when the demos were made. `npm run demo:cache` fails if any quote is not on its page, so the caches can't drift from the documents.

15. **Projects live in the browser.** localStorage, no accounts, no database. A BOM upload never leaves the machine; only a PDF or text upload for live extraction reaches the server. Share links carry the project in the URL fragment, which browsers do not send to a server.

16. **Undo history is in memory.** A reload keeps the projects but not their history. Slider moves are not undo steps.

17. **Named scenarios instead of one set of switches.** Comparing "everything possible" with "only the steel" needs both at once. Old projects are migrated into a single scenario.

18. **A4 is kept apart from A1–A3.** It needs a leg per line, most BOMs don't have one, and adding a partial A4 into the headline total would make projects incomparable. It is shown next to the total instead.

19. **The data-quality grade only covers counted lines.** It answers "how much of this number to trust", not "how complete is the review"; the review progress says that.

20. **Charts are drawn by hand.** Small SVG components can use the material hatches and the theme tokens, print well, and keep the bundle small. The treemap and the sankey layouts are pure functions with tests.

21. **Spend-based view: EPA v1.3.0 "with margins", EUR 2022 at 1.053.** Purchaser prices are what a buyer pays. The premium applies to money only; green and conventional steel share one NAICS code, which is the whole point of the comparison.

22. **Rate limit and size limit on extraction.** 5 requests a minute per IP, in memory, and 4 MB per file, under common hosting body limits. In-memory limits are per instance, so a real deployment with a paid key needs a shared store.

23. **Tailwind through the Turbopack loader.** Next 16.4's template switched to it from PostCSS, and the app followed.
