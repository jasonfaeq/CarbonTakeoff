# carbon takeoff

Side project. Idea: take a bill of materials (or a spec PDF) from a procurement package and get an embodied carbon number out of it, with the factor source shown for every single line.

Most tools I've seen either want a full LCA model or just multiply spend by an average factor. Spend-based is quick but it's backwards for low-carbon purchases: pay more for greener steel and your number goes up.

## plan

- [ ] parse a BOM (csv first, xlsx later)
- [ ] match lines to emission factors (rules first, maybe an LLM later)
- [ ] unit conversion (m3 -> t etc, density per material)
- [ ] review step, nothing counts until someone accepts it
- [ ] dashboard: total, by material, hotspots
- [ ] lower carbon alternatives (same source only!)
- [ ] spend vs activity comparison
- [ ] extraction from spec pdfs

## factors

needs open data. candidates: DESNZ conversion factors (UK, OGL), ÖKOBAUDAT (DE, generic datasets), EPA supply chain factors for the spend side. ICE would be nice but the licence isn't clear for redistribution.

placeholder numbers until I write a proper import.

## dev

```
npm install
npm run dev
```
