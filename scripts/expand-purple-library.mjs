import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../purple/index.html", import.meta.url);
let html = await readFile(path, "utf8");

const substances = [
  { id: "phosphoric-acid", name: "Phosphoric acid", formula: "H₃PO₄(aq)", category: "Acids", unit: "mL", molarMass: 97.994, concentration: 1, acidEq: 3, density: 1.06 },
  { id: "calcium-hydroxide", name: "Calcium hydroxide", formula: "Ca(OH)₂(aq)", category: "Alkalis", unit: "mL", molarMass: 74.093, concentration: 0.1, baseEq: 2, density: 1 },
  { id: "barium-hydroxide", name: "Barium hydroxide", formula: "Ba(OH)₂(aq)", category: "Alkalis", unit: "mL", molarMass: 171.34, concentration: 0.1, baseEq: 2, density: 1.01 },

  { id: "copper-ii-oxide", name: "Copper(II) oxide", formula: "CuO", category: "Oxides", unit: "g", molarMass: 79.545, color: "#272429" },
  { id: "magnesium-oxide", name: "Magnesium oxide", formula: "MgO", category: "Oxides", unit: "g", molarMass: 40.304, color: "#f2f2ef" },
  { id: "calcium-oxide", name: "Calcium oxide", formula: "CaO", category: "Oxides", unit: "g", molarMass: 56.077, color: "#ecebe4" },
  { id: "zinc-oxide", name: "Zinc oxide", formula: "ZnO", category: "Oxides", unit: "g", molarMass: 81.38, color: "#f3f1e6" },
  { id: "iron-iii-oxide", name: "Iron(III) oxide", formula: "Fe₂O₃", category: "Oxides", unit: "g", molarMass: 159.687, color: "#9f452c" },
  { id: "aluminum-oxide", name: "Aluminum oxide", formula: "Al₂O₃", category: "Oxides", unit: "g", molarMass: 101.96, color: "#e9e9e7" },
  { id: "manganese-iv-oxide", name: "Manganese(IV) oxide", formula: "MnO₂", category: "Oxides", unit: "g", molarMass: 86.94, color: "#302d31" },

  { id: "kcl", name: "Potassium chloride", formula: "KCl", category: "Halides", unit: "g", molarMass: 74.55 },
  { id: "sodium-bromide", name: "Sodium bromide", formula: "NaBr", category: "Halides", unit: "g", molarMass: 102.89 },
  { id: "sodium-iodide", name: "Sodium iodide", formula: "NaI", category: "Halides", unit: "g", molarMass: 149.89 },
  { id: "ammonium-chloride", name: "Ammonium chloride", formula: "NH₄Cl", category: "Halides", unit: "g", molarMass: 53.49 },
  { id: "copper-ii-chloride", name: "Copper(II) chloride", formula: "CuCl₂", category: "Halides", unit: "mL", molarMass: 134.45, concentration: 0.5, color: "#51a680" },
  { id: "iron-iii-chloride", name: "Iron(III) chloride", formula: "FeCl₃", category: "Halides", unit: "mL", molarMass: 162.2, concentration: 0.5, color: "#c48b35" },
  { id: "calcium-fluoride", name: "Calcium fluoride", formula: "CaF₂", category: "Halides", unit: "g", molarMass: 78.07 },

  { id: "iron-ii-sulfide", name: "Iron(II) sulfide", formula: "FeS", category: "Sulfides", unit: "g", molarMass: 87.91, color: "#454247" },
  { id: "zinc-sulfide", name: "Zinc sulfide", formula: "ZnS", category: "Sulfides", unit: "g", molarMass: 97.44 },
  { id: "copper-ii-sulfide", name: "Copper(II) sulfide", formula: "CuS", category: "Sulfides", unit: "g", molarMass: 95.61, color: "#262329" },
  { id: "sodium-sulfide-solution", name: "Sodium sulfide solution", formula: "Na₂S(aq)", category: "Sulfides", unit: "mL", molarMass: 78.04, concentration: 0.5, color: "#fff0a6" },

  { id: "sodium-nitrate", name: "Sodium nitrate", formula: "NaNO₃", category: "Nitrates", unit: "g", molarMass: 84.995 },
  { id: "potassium-nitrate", name: "Potassium nitrate", formula: "KNO₃", category: "Nitrates", unit: "g", molarMass: 101.103 },
  { id: "calcium-nitrate", name: "Calcium nitrate", formula: "Ca(NO₃)₂", category: "Nitrates", unit: "mL", molarMass: 164.088, concentration: 0.5 },
  { id: "copper-ii-nitrate", name: "Copper(II) nitrate", formula: "Cu(NO₃)₂", category: "Nitrates", unit: "mL", molarMass: 187.56, concentration: 0.5, color: "#5ca5d9" },
  { id: "ammonium-nitrate", name: "Ammonium nitrate", formula: "NH₄NO₃", category: "Nitrates", unit: "g", molarMass: 80.043 },

  { id: "magnesium-sulfate", name: "Magnesium sulfate", formula: "MgSO₄", category: "Sulfates", unit: "g", molarMass: 120.366 },
  { id: "zinc-sulfate", name: "Zinc sulfate", formula: "ZnSO₄", category: "Sulfates", unit: "mL", molarMass: 161.44, concentration: 0.5 },
  { id: "iron-ii-sulfate", name: "Iron(II) sulfate", formula: "FeSO₄", category: "Sulfates", unit: "mL", molarMass: 151.91, concentration: 0.5, color: "#9fc69c" },
  { id: "aluminum-sulfate", name: "Aluminum sulfate", formula: "Al₂(SO₄)₃", category: "Sulfates", unit: "mL", molarMass: 342.15, concentration: 0.25 },
  { id: "ammonium-sulfate", name: "Ammonium sulfate", formula: "(NH₄)₂SO₄", category: "Sulfates", unit: "g", molarMass: 132.14 },
  { id: "potassium-sulfate", name: "Potassium sulfate", formula: "K₂SO₄", category: "Sulfates", unit: "g", molarMass: 174.26 },

  { id: "gas-carbon-dioxide", name: "Carbon dioxide", formula: "CO₂(g)", category: "Gases", unit: "mmol", molarMass: 44.01, color: "#dff6ff" },
  { id: "gas-oxygen", name: "Oxygen", formula: "O₂(g)", category: "Gases", unit: "mmol", molarMass: 31.998, color: "#d9f4ff" },
  { id: "gas-nitrogen", name: "Nitrogen", formula: "N₂(g)", category: "Gases", unit: "mmol", molarMass: 28.014, color: "#edf7ff" },
  { id: "gas-chlorine", name: "Chlorine", formula: "Cl₂(g)", category: "Gases", unit: "mmol", molarMass: 70.9, color: "#d7e78a" },
  { id: "gas-ammonia", name: "Ammonia", formula: "NH₃(g)", category: "Gases", unit: "mmol", molarMass: 17.031, color: "#e6f5ff" },
  { id: "gas-sulfur-dioxide", name: "Sulfur dioxide", formula: "SO₂(g)", category: "Gases", unit: "mmol", molarMass: 64.066, color: "#e7edf0" },
  { id: "gas-hydrogen", name: "Hydrogen", formula: "H₂(g)", category: "Gases", unit: "mmol", molarMass: 2.016, color: "#f0fbff" },

  { id: "potassium-carbonate", name: "Potassium carbonate", formula: "K₂CO₃", category: "Carbonates", unit: "g", molarMass: 138.205 },
  { id: "magnesium-carbonate", name: "Magnesium carbonate", formula: "MgCO₃", category: "Carbonates", unit: "g", molarMass: 84.313 },
  { id: "sodium-hydrogen-carbonate", name: "Sodium hydrogen carbonate", formula: "NaHCO₃", category: "Carbonates", unit: "g", molarMass: 84.007 }
];

const anchor = "],ne=[{id:`beaker`,label:`Beaker`}";
const markerStart = "/*PURPLE_EXPANDED_LIBRARY_START*/";
const markerEnd = "/*PURPLE_EXPANDED_LIBRARY_END*/";
const legacyStart = ',{"id":"phosphoric-acid","name":"Phosphoric acid"';
const legacyEnd = '{"id":"sodium-hydrogen-carbonate","name":"Sodium hydrogen carbonate","formula":"NaHCO₃","category":"Carbonates","unit":"g","molarMass":84.007}';

function removeBlock(source, startToken, endToken) {
  let result = source;
  while (true) {
    const start = result.indexOf(startToken);
    if (start < 0) return result;
    const end = result.indexOf(endToken, start);
    if (end < 0) throw new Error("Purple expanded library block is incomplete.");
    result = result.slice(0, start) + result.slice(end + endToken.length);
  }
}

const original = html;
html = removeBlock(html, `,${markerStart}`, markerEnd);
html = removeBlock(html, legacyStart, legacyEnd);
if (!html.includes(anchor)) throw new Error("Purple chemical library anchor did not match the expected app bundle.");
const source = substances.map((substance) => JSON.stringify(substance)).join(",");
html = html.replace(anchor, `,${markerStart}${source}${markerEnd}],ne=[{id:\`beaker\`,label:\`Beaker\`}`);

const originalCategories = '[`Acids`,`Alkalis`,`Oxidizers`,`Organic liquids`,`Salts`,`Metals`,`Carbonates`,`Indicators`,`Reduction substrates`,`Reduction catalysts`,`Reduction reagents`,`Reduction products`]';
const expandedCategories = '[`Acids`,`Alkalis`,`Oxidizers`,`Oxides`,`Halides`,`Sulfides`,`Nitrates`,`Sulfates`,`Carbonates`,`Gases`,`Organic liquids`,`Salts`,`Metals`,`Indicators`,`Reduction substrates`,`Reduction catalysts`,`Reduction reagents`,`Reduction products`]';
if (html.includes(originalCategories)) html = html.replace(originalCategories, expandedCategories);
else if (!html.includes(expandedCategories)) throw new Error("Purple rendered category menu did not match the expected app bundle.");

if (html !== original) await writeFile(path, html);
