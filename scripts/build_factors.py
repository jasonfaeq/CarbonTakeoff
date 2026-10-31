"""Build data/factors.json, data/spend-factors.json and data/transport-factors.json from the sources.

Every value is read from the published file or API, never typed in. The script stops if a label,
a unit or a licence field is not what it expects, so a changed source can't slip in quietly.

Run: python scripts/build_factors.py [--refresh]
Needs: openpyxl. Downloads are cached in .cache/sources (gitignored); --refresh downloads again.
The retrieval date written into the data is the date the cached files were downloaded.
"""
import csv
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "sources"
DATA = ROOT / "data"

DESNZ_URL = "https://assets.publishing.service.gov.uk/media/6a29392bade52dc0882218a8/ghg-conversion-factors-2026-full-set.xlsx"
DESNZ_FLAT_URL = "https://assets.publishing.service.gov.uk/media/6a6c9748862aaf18d9c62ac9/ghg-conversion-factors-2026-flat-format-revised.xlsx"
DESNZ_PAGE = "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026"
DESNZ_NAME = "UK Government GHG Conversion Factors for Company Reporting (DESNZ)"
DESNZ_LICENCE = "Open Government Licence v3.0"
DESNZ_SCOPE = "Cradle to point of sale (A1-A3 plus transport to point of sale); biogenic CO2 excluded"
DESNZ_VERSION = "2026, version 1.0 (full set)"

OBD_STOCK = "cc64f7e1-14d8-4a57-b11b-2cf03d200c82"  # OBD_2024_II, release of 22.07.2026
OBD_API = f"https://oekobaudat.de/OEKOBAU.DAT/resource/datastocks/{OBD_STOCK}/processes"
OBD_LICENCE = "ÖKOBAUDAT: free of charge for all users and uses; unmodified data may be distributed if the source is named (BMI/BBSR, Manual 2020, s.3.4.2)"
OBD_SCOPE = "A1-A3 (EN 15804+A2, GWP-total); generic dataset, includes a 10-30% uncertainty penalty"

EPA_URL = "https://pasteur.epa.gov/uploads/10.23719/1531143/SupplyChainGHGEmissionFactors_v1.3.0_NAICS_CO2e_USD2022.csv"
EPA_PAGE = "https://doi.org/10.23719/1531143"
EPA_LICENCE = "US Government work, public domain (EPA Science Hub)"

ECB_URL = "https://data-api.ecb.europa.eu/service/data/EXR/A.USD.EUR.SP00.A?format=csvdata&startPeriod=2022&endPeriod=2022"

# Sheet 'Material use' columns: D primary production, E re-used, F open-loop, G closed-loop.
COLUMNS = {"D": "Primary material production", "E": "Re-used", "F": "Open-loop source", "G": "Closed-loop source"}

PROXY_ALUMINIUM = "Published for cans and foil, excluding forming. Used as a proxy for the metal in conductors and busbars."
PROXY_METALS = "Mixed-metals construction average; use only when the metal is not specified."

# id, name, group, row, label in column B, column, alternatives, applicability, note
DESNZ = [
    ("aggregates-primary", "Aggregates, primary", "Aggregates", 22, "Aggregates", "D", ["aggregates-recycled", "aggregates-reused"], "direct", None),
    ("aggregates-recycled", "Aggregates, closed-loop recycled", "Aggregates", 22, "Aggregates", "G", [], "direct", None),
    ("aggregates-reused", "Aggregates, re-used", "Aggregates", 22, "Aggregates", "E", [], "direct", None),
    ("construction-average", "Construction materials, average", "Other", 23, "Average construction", "D", [], "proxy",
     "An average across construction materials. Only for a line nothing better fits."),
    ("asphalt-primary", "Asphalt, primary", "Aggregates", 25, "Asphalt", "D", ["asphalt-recycled", "asphalt-reused"], "direct", None),
    ("asphalt-recycled", "Asphalt, closed-loop recycled", "Aggregates", 25, "Asphalt", "G", [], "direct", None),
    ("asphalt-reused", "Asphalt, re-used", "Aggregates", 25, "Asphalt", "E", [], "direct",
     "Material re-used as it is, such as planings re-laid in a lower layer."),
    ("bricks", "Bricks", "Masonry", 26, "Bricks", "D", [], "direct", None),
    ("concrete-average", "Concrete, primary (UK average)", "Concrete & cement", 27, "Concrete", "D", [], "direct",
     "The closed-loop figure in this row (3.2 kg/t) describes crushed concrete used as aggregate, so it is not offered as a replacement for new concrete."),
    ("concrete-blocks", "Concrete blocks (UK average concrete)", "Masonry", 27, "Concrete", "D", [], "proxy",
     "No block dataset in the sources: the UK average for concrete stands in for blockwork."),
    ("insulation", "Insulation, primary", "Insulation", 28, "Insulation", "D", ["insulation-recycled"], "direct", None),
    ("insulation-recycled", "Insulation, closed-loop recycled", "Insulation", 28, "Insulation", "G", [], "direct", None),
    ("metals-average", "Metals, construction average, primary", "Steel", 29, "Metals", "D", ["metals-average-recycled"], "proxy", PROXY_METALS),
    ("metals-average-recycled", "Metals, construction average, closed-loop", "Steel", 29, "Metals", "G", [], "proxy", PROXY_METALS),
    ("mineral-oil-primary", "Mineral oil, primary", "Other", 31, "Mineral oil", "D", ["mineral-oil-recycled"], "direct", None),
    ("mineral-oil-recycled", "Mineral oil, closed-loop recycled", "Other", 31, "Mineral oil", "G", [], "direct", None),
    ("plasterboard", "Plasterboard, primary", "Finishes", 32, "Plasterboard", "D", ["plasterboard-recycled"], "direct", None),
    ("plasterboard-recycled", "Plasterboard, closed-loop recycled", "Finishes", 32, "Plasterboard", "G", [], "direct", None),
    ("wood-primary", "Wood, primary", "Timber", 34, "Wood", "D", ["wood-reused"], "direct", None),
    ("wood-reused", "Wood, re-used", "Timber", 34, "Wood", "E", [], "direct", None),
    ("glass", "Glass, primary", "Glass", 40, "Glass", "D", ["glass-recycled"], "proxy",
     "General glass, mostly containers. Used as a proxy for flat glazing."),
    ("glass-recycled", "Glass, closed-loop recycled", "Glass", 40, "Glass", "G", [], "proxy",
     "General glass, mostly containers. Used as a proxy for flat glazing."),
    ("electrical-large", "Electrical items, large", "Electrical equipment", 54, "Electrical items - large", "D", [], "proxy",
     "A category built for large household appliances. A weak proxy for transformers and inverters; replace it with a product EPD."),
    ("batteries-li-ion", "Batteries, Li-ion", "Electrical equipment", 58, "Batteries - Li ion", "D", [], "proxy",
     "Portable Li-ion batteries. A weak proxy for grid-scale modules; replace it with the supplier's EPD."),
    ("aluminium-primary", "Aluminium, primary (cans and foil, excl. forming)", "Aluminium", 64, "Metal: aluminium cans and foil (excl. forming)", "D",
     ["aluminium-recycled"], "proxy", PROXY_ALUMINIUM),
    ("aluminium-recycled", "Aluminium, closed-loop recycled (cans and foil, excl. forming)", "Aluminium", 64,
     "Metal: aluminium cans and foil (excl. forming)", "G", [], "proxy", PROXY_ALUMINIUM),
    ("hdpe-primary", "HDPE, primary (incl. forming)", "Plastics", 75, "Plastics: HDPE (incl. forming)", "D", ["hdpe-recycled"], "direct", None),
    ("hdpe-recycled", "HDPE, closed-loop recycled (incl. forming)", "Plastics", 75, "Plastics: HDPE (incl. forming)", "G", [], "direct", None),
    ("ldpe-primary", "LDPE and LLDPE, primary (incl. forming)", "Plastics", 76, "Plastics: LDPE and LLDPE (incl. forming)", "D", ["ldpe-recycled"], "direct", None),
    ("ldpe-recycled", "LDPE and LLDPE, closed-loop recycled (incl. forming)", "Plastics", 76, "Plastics: LDPE and LLDPE (incl. forming)", "G", [], "direct", None),
    ("pp-primary", "PP, primary (incl. forming)", "Plastics", 78, "Plastics: PP (incl. forming)", "D", ["pp-recycled"], "direct", None),
    ("pp-recycled", "PP, closed-loop recycled (incl. forming)", "Plastics", 78, "Plastics: PP (incl. forming)", "G", [], "direct", None),
    ("pvc-primary", "PVC, primary (incl. forming)", "Plastics", 80, "Plastics: PVC (incl. forming)", "D", ["pvc-recycled"], "direct", None),
    ("pvc-recycled", "PVC, closed-loop recycled (incl. forming)", "Plastics", 80, "Plastics: PVC (incl. forming)", "G", [], "direct", None),
]

# id, name, group, dataset uuid, alternatives, applicability, note
OBD = [
    ("concrete-c20-25", "Ready-mix concrete C20/25", "Concrete & cement", "e3d7a045-ee91-43ac-8fb4-a5216c65ba0b", [], "direct", None),
    ("concrete-c25-30", "Ready-mix concrete C25/30", "Concrete & cement", "a71e60a5-b64b-4715-ae8a-c8c8819149d2", ["concrete-rc-c25-30"], "direct", None),
    ("concrete-c30-37", "Ready-mix concrete C30/37", "Concrete & cement", "d6f982e3-beda-49f0-a298-694fcbf3ba38", [], "direct",
     "The recycled-aggregate dataset for this class is higher, and the sources have no generic low-clinker concrete, so no alternative is offered."),
    ("concrete-c50-60", "Ready-mix concrete C50/60", "Concrete & cement", "0a1fa7f9-ad49-4942-a173-cb8c4ad99c9b", ["concrete-rc-c50-60"], "direct", None),
    ("concrete-rc-c25-30", "Recycled-aggregate concrete C25/30", "Concrete & cement", "61c0c795-7116-407d-8635-68fe422f76a9", [], "direct", None),
    ("concrete-rc-c30-37", "Recycled-aggregate concrete C30/37", "Concrete & cement", "3e15eb88-e824-4a81-972a-45e06930aa19", [], "direct", None),
    ("concrete-rc-c50-60", "Recycled-aggregate concrete C50/60", "Concrete & cement", "732a4fb1-1017-4682-ac12-49a256354964", [], "direct", None),
    ("cement-cem2", "Cement CEM II 42,5", "Concrete & cement", "1f9e860b-307b-47c3-8cb7-83aff71b0494", ["cement-cem3"], "direct", None),
    ("cement-cem3", "Cement CEM III 42,5 (lower clinker)", "Concrete & cement", "8f4e4fdb-fa6c-46b3-8680-57120c4bee5e", [], "direct", None),
    ("mortar-cement", "Cement mortar", "Concrete & cement", "96171066-34d9-4b33-b1e6-3af1ea11db61", [], "proxy",
     "Standard cement mortar, used as a proxy for high-strength grout and screed."),
    ("mortar-epoxy", "Epoxy resin mortar", "Other", "625ab4fe-4c34-4f60-8259-3bc8ebdd119a", [], "direct", None),
    ("rebar", "Reinforcing steel (German EAF route)", "Steel", "f6861618-5a92-4c3a-94ba-9f7329b29662", [], "direct",
     "This dataset already models scrap-based electric arc furnace steel, so no lower generic alternative exists."),
    ("steel-section-bof", "Galvanised steel section, blast furnace route", "Steel", "755a481d-a74b-4ba0-b417-cc26767b2d50", ["steel-section-eaf"], "direct", None),
    ("steel-section-eaf", "Galvanised steel section, EAF route, high scrap", "Steel", "42de525f-7c48-4722-b503-6f423b39b4f4", [], "direct", None),
    ("aluminium-section", "Aluminium section", "Aluminium", "3feca796-791b-46d3-8160-95ef243ffb9d", [], "direct", None),
    ("copper-sheet", "Copper sheet", "Copper", "e5a4ebf9-0e5c-4fd8-bb04-1acb5497312f", [], "proxy",
     "Used as a proxy for the metal in conductors and earthing tape. Insulation and sheath are not counted."),
    ("crushed-stone", "Crushed stone 16/32", "Aggregates", "f4461491-586a-4770-9a04-716565e58c24", [], "direct", None),
    ("gravel", "Gravel 2/32", "Aggregates", "d35a5f2a-d72c-41a3-9f64-ea1b1ec066d1", [], "direct", None),
    ("sand", "Sand 0/2", "Aggregates", "286b0072-1001-4e5f-baa2-282230755243", [], "direct", None),
    ("geotextile", "PE/PP fleece (geotextile)", "Plastics", "42d6f768-fb28-4105-ad21-078cc7af27a6", [], "direct", None),
    ("pipe-pehd", "Sewer pipe PE-HD", "Plastics", "db7d83d8-6a14-48a1-8fc7-2fa442e4ec87", [], "direct", None),
    ("pipe-pvc", "Sewer pipe PVC", "Plastics", "d3f0a22a-a93b-471b-ae73-67e8646d2f7d", [], "direct", None),
    ("bitumen-emulsion", "Bitumen emulsion (40% bitumen)", "Other", "88c0f648-2316-4bbc-99b3-dbc636580088", [], "direct", None),
]

# DESNZ factors are per tonne, so a volume line needs a density: borrowed from the gross density
# published in the named ÖKOBAUDAT dataset.
DENSITY_FROM = {
    "aggregates-primary": "crushed-stone",
    "aggregates-recycled": "crushed-stone",
    "aggregates-reused": "crushed-stone",
    "concrete-average": "concrete-c30-37",
    "concrete-blocks": "concrete-c30-37",
    "metals-average": "rebar",
    "metals-average-recycled": "rebar",
    "aluminium-primary": "aluminium-section",
    "aluminium-recycled": "aluminium-section",
    "hdpe-primary": "pipe-pehd",
    "hdpe-recycled": "pipe-pehd",
}

# The NAICS commodity each material is bought as, for the spend-based estimate. Longest prefix wins.
SPEND_BY_FACTOR = {
    "aggregates": "212321", "crushed-stone": "212321", "gravel": "212321", "sand": "212321",
    "asphalt": "324121", "bitumen": "324122", "mineral-oil": "324191",
    "concrete": "327320", "concrete-blocks": "327331", "cement-": "327310", "mortar-cement": "327390", "mortar-epoxy": "325520",
    "bricks": "327120", "glass": "327211", "plasterboard": "327420", "insulation": "327993",
    "rebar": "331110", "steel-section": "332312", "metals-average": "332312",
    "aluminium-section": "331318", "aluminium-": "335929", "copper": "335929",
    "hdpe": "326122", "pvc": "326122", "pp-": "326122", "pipe-": "326122", "ldpe": "326113", "geotextile": "313230",
    "wood": "321999", "electrical-large": "335311", "batteries": "335911",
}
# Commodities for lines that have a price but no activity factor.
EXTRA_NAICS = ["335313"]

# Sheet 'Freighting goods': id, name, aliases, row, expected (A, B, C) labels, value column.
FREIGHT = [
    ("hgv-average", "HGV, average (all diesel HGVs, average laden)", ["hgv", "truck", "lorry", "road", "lkw"], 63,
     (None, "Average non-refrigerated HGVs", "tonne.km"), "D"),
    ("hgv-rigid", "HGV, rigid (average laden)", ["rigid"], 51, (None, "Average non-refrigerated rigids", "tonne.km"), "D"),
    ("hgv-articulated", "HGV, articulated (average laden)", ["artic", "articulated", "semi", "sattelzug"], 60,
     (None, "Average non-refrigerated artics", "tonne.km"), "D"),
    ("van", "Van, up to 3.5 t (diesel)", ["van", "transporter"], 35, (None, "Average (up to 3.5 tonnes)", "tonne.km"), "D"),
    ("rail", "Rail freight", ["rail", "train", "bahn"], 106, ("Rail", "Freight train", "tonne.km"), "D"),
    ("sea-bulk", "Sea, bulk carrier (average)", ["sea", "ship", "bulk", "bulk carrier", "schiff"], 145, (None, None, "Average"), "E"),
    ("sea-container", "Sea, container ship (average)", ["container", "container ship", "containership"], 159, (None, None, "Average"), "E"),
]
FREIGHT_HEADS = {145: (139, "Bulk carrier"), 159: (153, "Container ship")}


def download(url, name, refresh):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if refresh or not path.exists():
        print("downloading", url)
        with urllib.request.urlopen(url, timeout=180) as r:
            path.write_bytes(r.read())
    return path


def retrieved_on(path):
    return date.fromtimestamp(path.stat().st_mtime).isoformat()


def spend_key(fid):
    for key in sorted(SPEND_BY_FACTOR, key=len, reverse=True):
        if fid.startswith(key):
            return SPEND_BY_FACTOR[key]
    raise KeyError(fid)


def build_desnz(refresh):
    path = download(DESNZ_URL, "desnz-full.xlsx", refresh)
    retrieved = retrieved_on(path)
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Material use"]
    assert ws["D20"].value == COLUMNS["D"] and ws["G20"].value == COLUMNS["G"], "Material use header moved"
    factors = []
    for fid, name, group, row, label, col, alts, applicability, note in DESNZ:
        assert ws[f"B{row}"].value == label, (fid, ws[f"B{row}"].value)
        assert ws[f"C{row}"].value == "tonnes", fid
        value = ws[f"{col}{row}"].value
        assert isinstance(value, (int, float)) and value > 0, (fid, value)
        factors.append({
            "id": fid, "name": name, "group": group, "value": value, "unit": "kg CO2e/t", "declaredUnit": "t",
            "scope": DESNZ_SCOPE, "source": "DESNZ 2026", "sourceName": DESNZ_NAME,
            "tableRow": f"Sheet 'Material use', cell {col}{row}: {label}, {COLUMNS[col]}", "versionYear": DESNZ_VERSION,
            "licence": DESNZ_LICENCE, "url": DESNZ_PAGE, "retrieved": retrieved, "status": "VERIFIED",
            "applicability": applicability, "alternatives": alts, "note": note,
        })
    crosscheck_flat(factors, refresh)
    return factors, build_freight(wb, retrieved)


def build_freight(wb, retrieved):
    ws = wb["Freighting goods"]
    modes = []
    for mid, name, aliases, row, (a, b, c), col in FREIGHT:
        got = (ws[f"A{row}"].value, ws[f"B{row}"].value, ws[f"C{row}"].value)
        assert got == (a, b, c), (mid, got)
        if row in FREIGHT_HEADS:
            head_row, head = FREIGHT_HEADS[row]
            assert ws[f"B{head_row}"].value == head, (mid, ws[f"B{head_row}"].value)
            assert ws[f"D{row}"].value == "tonne.km", mid
        value = ws[f"{col}{row}"].value
        assert isinstance(value, (int, float)) and value > 0, (mid, value)
        where = f"{FREIGHT_HEADS[row][1]}, Average" if row in FREIGHT_HEADS else f"{b}"
        modes.append({
            "id": mid, "name": name, "value": value, "unit": "kg CO2e/tonne.km", "aliases": aliases,
            "source": "DESNZ 2026", "sourceName": DESNZ_NAME,
            "tableRow": f"Sheet 'Freighting goods', cell {col}{row}: {where}", "versionYear": DESNZ_VERSION,
            "licence": DESNZ_LICENCE, "url": DESNZ_PAGE, "retrieved": retrieved, "status": "VERIFIED",
        })
    return {"scope": "Direct (tank-to-wheel) emissions of the freight leg, A4. Well-to-tank emissions of the fuel are not included.", "modes": modes}


def crosscheck_flat(factors, refresh):
    """The flat file was revised after the full set. Stop if any value we use differs from it."""
    wb = openpyxl.load_workbook(download(DESNZ_FLAT_URL, "desnz-flat.xlsx", refresh), read_only=True, data_only=True)
    ws = next(wb[n] for n in wb.sheetnames if "actor" in n)
    rows = ws.iter_rows(values_only=True)
    header = None
    for r in rows:
        if r and "Scope" in r and any(isinstance(c, str) and c.startswith("GHG Conversion Factor") for c in r):
            header = list(r)
            break
    assert header, "flat file header not found"
    ghg_col = next(i for i, c in enumerate(header) if isinstance(c, str) and c.startswith("GHG Conversion Factor"))
    level1 = header.index("Level 1")
    flat = [r for r in rows if r[level1] == "Material use"]
    for f in factors:
        hits = [r for r in flat if isinstance(r[ghg_col], (int, float)) and abs(r[ghg_col] - f["value"]) < 1e-6]
        assert hits, f"{f['id']} value {f['value']} not found in the revised flat file"
    print(f"flat-file cross-check: {len(factors)} DESNZ values match")


def build_obd(refresh):
    factors = []
    for fid, name, group, uuid, alts, applicability, note in OBD:
        path = download(f"{OBD_API}/{uuid}?format=json&view=extended", f"obd-{uuid}.json", refresh)
        d = json.loads(path.read_text(encoding="utf-8"))
        value = next(
            float(a["value"])
            for l in d["LCIAResults"]["LCIAResult"]
            if "GWP-tot" in str(l["referenceToLCIAMethodDataSet"]["shortDescription"])
            for a in l["other"]["anies"] if a.get("module") == "A1-A3"
        )
        ref = d["processInformation"]["quantitativeReference"]["referenceToReferenceFlow"]
        ref = ref if isinstance(ref, list) else [ref]
        ex = next(e for e in d["exchanges"]["exchange"] if e.get("dataSetInternalID") in ref)
        declared = next(p for p in ex["flowProperties"] if p.get("referenceFlowProperty"))
        unit = {"m3": "m3", "kg": "kg", "qm": "m2", "m": "m"}[declared["referenceUnit"]]
        density = None
        kg_per_unit = None
        for m in ex.get("materialProperties") or []:
            if m.get("name") == "gross density":
                density = float(m["value"])
            if m.get("name") == "grammage":
                kg_per_unit = float(m["value"])
        pub = d["administrativeInformation"]["publicationAndOwnership"]
        assert "Free of charge" in pub["licenseType"], fid
        assert d["modellingAndValidation"]["LCIMethodAndAllocation"]["other"]["anies"][0]["value"] == "generic dataset", fid
        factors.append({
            "id": fid, "name": name, "group": group, "value": value, "unit": f"kg CO2e/{unit}", "declaredUnit": unit,
            "scope": OBD_SCOPE, "source": "ÖKOBAUDAT 2024-II", "sourceName": "ÖKOBAUDAT (BMWSB/BBSR), dataset owner Sphera Solutions",
            "tableRow": f"Dataset {uuid}, GWP-total, module A1-A3",
            "versionYear": f"Release OBD_2024_II (22.07.2026), dataset {pub['dataSetVersion']}",
            "licence": OBD_LICENCE, "url": f"https://oekobaudat.de/OEKOBAU.DAT/datasetdetail/process.xhtml?uuid={uuid}",
            "retrieved": retrieved_on(path), "status": "VERIFIED", "applicability": applicability, "alternatives": alts, "note": note,
            **({"densityKgM3": density, "densitySource": f"Gross density in ÖKOBAUDAT dataset {uuid}"} if density else {}),
            **({"kgPerDeclaredUnit": kg_per_unit} if kg_per_unit else {}),
        })
    return factors


def build_spend(factors, refresh):
    path = download(EPA_URL, "epa-co2e.csv", refresh)
    rows = {r["2017 NAICS Code"]: r for r in csv.DictReader(path.open(encoding="utf-8-sig"))}
    mapping = {}
    for f in factors:
        try:
            mapping[f["id"]] = spend_key(f["id"])
        except KeyError:
            continue  # a material with no sensible commodity simply has no spend estimate
    codes = sorted(set(mapping.values()) | set(EXTRA_NAICS))
    spend = []
    for code in codes:
        r = rows[code]
        assert r["Unit"] == "kg CO2e/2022 USD, purchaser price", code
        spend.append({
            "naics": code, "title": r["2017 NAICS Title"], "value": float(r["Supply Chain Emission Factors with Margins"]),
            "unit": "kg CO2e/USD (2022, purchaser price)", "useeioCode": r["Reference USEEIO Code"],
        })
    ecb_path = download(ECB_URL, "ecb-usd-eur-2022.csv", refresh)
    ecb = ecb_path.read_text(encoding="utf-8").splitlines()
    head, row = ecb[0].split(","), next(csv.reader([ecb[1]]))
    usd_per_eur = float(row[head.index("OBS_VALUE")])
    return {
        "source": {
            "sourceName": "US EPA Supply Chain Greenhouse Gas Emission Factors v1.3.0 by NAICS-6 (built on USEEIO)",
            "tableRow": "Column 'Supply Chain Emission Factors with Margins'",
            "versionYear": "v1.3.0 (2024), GHG data and prices for 2022, AR5 GWP-100",
            "licence": EPA_LICENCE, "url": EPA_PAGE, "retrieved": retrieved_on(path),
        },
        "fx": {
            "usdPerEur": round(usd_per_eur, 4), "year": 2022, "sourceName": "ECB euro reference exchange rate, US dollar/Euro, annual average 2022",
            "url": "https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A", "retrieved": retrieved_on(ecb_path),
        },
        "factorToNaics": mapping,
        "factors": spend,
    }


def check_alternatives(factors):
    """An alternative must come from the same source, in the same unit, and be lower."""
    by_id = {f["id"]: f for f in factors}
    for f in factors:
        for alt in f["alternatives"]:
            a = by_id[alt]
            assert a["source"] == f["source"], (f["id"], alt)
            assert a["declaredUnit"] == f["declaredUnit"], (f["id"], alt)
            assert a["value"] < f["value"], (f["id"], alt, f["value"], a["value"])


def write(name, payload):
    (DATA / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    refresh = "--refresh" in sys.argv
    desnz, freight = build_desnz(refresh)
    factors = desnz + build_obd(refresh)
    by_id = {f["id"]: f for f in factors}
    for fid, src in DENSITY_FROM.items():
        by_id[fid]["densityKgM3"] = by_id[src]["densityKgM3"]
        by_id[fid]["densitySource"] = f"{by_id[src]['densitySource']} ({by_id[src]['name']})"
    check_alternatives(factors)
    spend = build_spend(factors, refresh)
    DATA.mkdir(exist_ok=True)
    write("factors.json", {"factors": factors})
    write("spend-factors.json", spend)
    write("transport-factors.json", freight)
    print(f"wrote {len(factors)} activity factors, {len(spend['factors'])} spend factors, {len(freight['modes'])} freight factors, "
          f"{spend['fx']['usdPerEur']} USD/EUR")


if __name__ == "__main__":
    main()
