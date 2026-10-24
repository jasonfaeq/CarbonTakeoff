// Generates public/demo/wind-spec.pdf, a synthetic procurement specification. Run: npm run demo:pdf
import { createWriteStream } from "node:fs";
import PDFDocument from "pdfkit";

const MARGIN = 56;
// Reproducible output: honour SOURCE_DATE_EPOCH for the dates written into the file.
const created = process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date();
const doc = new PDFDocument({
  size: "A4",
  margin: MARGIN,
  bufferPages: true,
  info: { Title: "Synthetic procurement specification", Author: "Carbon Takeoff demo", CreationDate: created, ModDate: created },
});
doc.pipe(createWriteStream("public/demo/wind-spec.pdf"));
const width = doc.page.width - MARGIN * 2;

const h1 = (t) => doc.font("Helvetica-Bold").fontSize(15).fillColor("#111").text(t, { paragraphGap: 8 });
const h2 = (t) => doc.moveDown(0.6).font("Helvetica-Bold").fontSize(11).fillColor("#111").text(t, { paragraphGap: 4 });
const p = (t) => doc.font("Helvetica").fontSize(10).fillColor("#222").text(t, { paragraphGap: 7, lineGap: 2 });

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const x0 = MARGIN;
  const draw = (cells, bold) => {
    const y = doc.y;
    let x = x0;
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9)
      .fillColor("#222");
    cells.forEach((cell, i) => {
      doc.text(String(cell), x + 3, y + 4, { width: (widths[i] / total) * width - 6, lineBreak: false });
      x += (widths[i] / total) * width;
    });
    doc.y = y + 18;
    doc
      .moveTo(x0, doc.y)
      .lineTo(x0 + width, doc.y)
      .strokeColor("#bbb")
      .lineWidth(0.5)
      .stroke();
    doc.x = MARGIN;
  };
  draw(headers, true);
  rows.forEach((r) => draw(r, false));
  doc.moveDown(0.8);
}

h1("Procurement Specification PS-0417 (SYNTHETIC)");
p("Balance of plant for one onshore wind turbine and a small collector substation at Example Site A.");
p(
  "This document is synthetic. It was written for the Carbon Takeoff demo. The project, the site and the parties do not exist, and all quantities are illustrative.",
);
h2("1. Purpose");
p(
  "This specification sets out what the Contractor shall supply for the civil and electrical balance of plant. It is issued for tender and does not replace the construction drawings. Where this document and the drawings disagree, the Contractor shall raise a query before ordering.",
);
h2("2. Definitions");
p(
  "Employer means the party issuing this specification. Contractor means the party appointed to carry out the works. Works means everything the Contractor must do under the contract. Site means Example Site A as shown on the location plan.",
);
h2("3. Document control");
table(
  ["Revision", "Status", "Issued for"],
  [
    ["A", "Superseded", "Internal review"],
    ["B", "Current", "Tender"],
  ],
  [1, 1, 2],
);
h2("4. General obligations");
p(
  "The Contractor shall hold all permits needed for deliveries, shall keep the Site tidy, and shall give the Employer ten working days of notice before any abnormal load movement. Insurance, payment terms and liability are set out in the contract conditions and are not repeated here.",
);

doc.addPage();
h1("5. Turbine foundation: concrete and reinforcement");
p(
  "The foundation is a circular gravity base on a prepared formation. The main body shall be cast in one continuous pour. Before the main pour the Contractor shall place 58 m3 of C20/25 blinding concrete across the formation, finished to within 10 mm of level.",
);
p(
  "The main slab requires 620 m3 of C30/37 concrete, exposure class XC4 XF1 XA1. The pedestal above it is a higher class: allow 70 m3 of C50/60 concrete for the pedestal, placed no later than 14 days after the slab.",
);
p(
  "Reinforcement shall be B500B to the bending schedules. The total reinforcing steel for the foundation is 78 t, delivered in cut and bent bundles and tagged by bar mark. Couplers are included in this figure. Spacers and tying wire are by the Contractor and need not be listed.",
);
h2("5.1 Tower anchorage");
p(
  "The anchor cage is supplied by the Contractor in structural steel grade S355, with a total mass of 13.5 t including the top and bottom flanges. Under the tower flange the Contractor shall place 3 m3 of high-strength cementitious grout. Levelling pads shall use 400 kg of epoxy levelling mortar.",
);
h2("5.2 Protection of buried surfaces");
p(
  "All buried concrete faces shall receive two coats of bitumen coating. Allow 600 kg of bitumen coating for the foundation. Do not apply in rain or below 5 degrees C.",
);

doc.addPage();
h1("6. Earthworks and drainage");
p(
  "Excavated material that does not meet the backfill specification goes off Site. Material brought in shall be tested at source. The quantities in Table 6-1 are for the foundation and crane pad together.",
);
table(
  ["Item", "Material", "Quantity", "Unit"],
  [
    ["6.1", "Crushed stone backfill 0/45", "1150", "t"],
    ["6.2", "Gravel drainage layer 2/32", "170", "t"],
    ["6.3", "Geotextile separation layer 500 g/m2", "1300", "m2"],
    ["6.4", "HDPE drainage pipe DN110", "240", "m"],
  ],
  [1, 4, 1.2, 0.8],
);
p("Table 6-1: earthworks and drainage materials.");
p(
  "HDPE drainage pipe weighs 1.1 kg/m. Falls shall be at least 1 in 100 towards the outfall. Temporary formwork for the foundation and the substation slab is expected to need about 8 t of timber formwork, to be taken back by the supplier where possible.",
);

doc.addPage();
h1("7. Cabling");
p(
  "Cables run from the turbine transformer position to the collector substation in a single trench. Electrical design is by others; the Contractor supplies and installs to the cable schedule below.",
);
table(
  ["Cable or duct", "Length (m)", "Mass (kg/m)"],
  [
    ["MV cable 3 x 1 x 240 mm2 aluminium conductor", "1750", "1.95"],
    ["LV cable 4 x 95 mm2 copper conductor", "300", "3.4"],
    ["Copper earthing tape 25 x 3 mm", "220", "0.67"],
    ["PVC cable duct DN160", "850", "2.6"],
  ],
  [4, 1, 1],
);
p(
  "Mass figures refer to conductor metal only for the cables and to the whole product for the tape and the duct. Sheath, insulation and joint kits are excluded from the mass column.",
);

doc.addPage();
h1("8. Collector substation");
p(
  "The substation stands on a reinforced slab. The slab takes 80 m3 of C25/30 concrete and 9 t of reinforcing steel B500B. Support structures for the busbars and the transformer bund shall be galvanised steel, 17 t in total, hot-dip galvanised after fabrication.",
);
p(
  "For site mortar and small repairs allow 5.5 t of cement CEM II/A 42.5. Busbars shall be aluminium busbar, 1.1 t in total, supplied with all clamps.",
);
h2("8.1 Equipment");
table(
  ["Equipment", "Quantity", "Unit", "Remark"],
  [
    ["Power transformer 25 MVA 110/20 kV", "36", "t", "Shipping mass, drained"],
    ["Transformer oil top-up", "1", "t", "Mineral oil, IEC 60296"],
    ["MV switchgear panel", "6", "pcs", "Gas-insulated, SF6-free"],
  ],
  [4, 1, 0.7, 2.3],
);
p("Factory acceptance tests shall be witnessed by the Employer. The transformer oil quantity is in addition to the oil filled at the factory.");

doc.addPage();
h1("9. Health, safety and environment");
p(
  "The Contractor shall provide a construction phase plan before starting work. All personnel shall complete the site induction. Working hours are 07:00 to 19:00 on weekdays. Spill kits shall be kept at every refuelling point and the Contractor shall report any spill to the Employer within one hour.",
);
h2("10. Documents to be returned with the tender");
p(
  "Tenderers shall return a completed price schedule, a programme, a method statement for the main pour, and environmental product declarations for the main materials where available. Declarations do not have to be third-party verified at tender stage but must be by contract award.",
);
h2("11. Queries");
p(
  "Queries shall be sent in writing through the tender portal no later than five working days before the tender return date. Answers are shared with all tenderers.",
);

const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.page.margins.bottom = 0; // otherwise the footer spills onto a new blank page
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#666")
    .text(`PS-0417 Rev B - SYNTHETIC DEMO DOCUMENT - page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - 40, {
      width,
      align: "center",
      lineBreak: false,
    });
}
doc.end();
