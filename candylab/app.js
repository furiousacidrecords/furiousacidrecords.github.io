const equipment = [
  ["01", "Mixing tank", "Heavy wet base", 25, 43],
  ["02", "Extruder A", "Forming line", 80, 13],
  ["03", "Storage tank", "Main hold tank", 67, 18],
  ["04", "Extruder B", "Second forming line", 85, 30],
  ["5.1", "Tray stack", "Cooling trays", 8, 23],
  ["5.2", "Spiral rack", "Drying rack", 93, 75],
  ["5.3", "Ingredient bins", "Dry package shelf", 42, 18],
  ["05", "Packaging line", "Wrap + seal", 29, 17],
  ["06", "Conveyor", "Transfer belt", 76, 34],
  ["07", "Kettle", "Cook + stir", 8, 47],
  ["08", "Dryer", "Moisture control", 86, 55],
  ["09", "Tray bank", "Mesh trays", 8, 74],
  ["10", "Mobile rack", "Finished bars", 95, 72],
  ["5.5", "Control panel", "Line controls", 20, 30],
  ["5.4", "Drum tank", "Secondary hold", 72, 40]
].map(([code, label, detail, x, y], index) => ({ id: `equipment-${index}`, code, label, detail, x, y }));

const bottles = [
  ["star-dried-apples", "Dried apples", 21.6, "Mixture", "biological mixture", "Fruit solids + fiber + residual moisture.", "fruit", "group-1"],
  ["star-apple-concentrate", "Apple concentrate · 75° Brix", 18.76, "Mixture", "fruit concentrate", "14.07 lb soluble fruit solids + 4.69 lb water.", "fruit", "group-1"],
  ["star-sorbitol", "70% sorbitol solution", 37.48, "C₆H₁₄O₆ + H₂O", "solution", "26.236 lb sorbitol + 11.244 lb water.", "wet", "group-1"],
  ["star-corn-syrup", "Corn syrup · 34% maltose", 150.84, "Mixture", "saccharide mixture", "Water, glucose, maltose, maltotriose, and larger saccharides.", "wet", "group-1"],
  ["star-glycerin", "96% glycerin solution", 7.32, "C₃H₈O₃ + H₂O", "solution", "7.0272 lb glycerol + 0.2928 lb water.", "wet", "group-1"],
  ["star-water", "Water", 15.48, "H₂O", "exact compound", "Hydrates the starch system; most later evaporates.", "wet", "group-2"],
  ["star-sodium-citrate", "Sodium citrate hydrate", .8, "C₆H₅Na₃O₇·2H₂O", "hydrated salt", "Dissolves to sodium ions and citrate species.", "dry", "group-2"],
  ["star-caramel", "Caramel color", .2, "Mixture", "complex mixture", "Complex products of sugar heating; no single formula.", "dry", "group-2"],
  ["star-oil", "Vegetable oil", 28.04, "Mixture", "triglyceride mixture", "Representative triolein: C₅₇H₁₀₄O₆.", "fat", "group-3"],
  ["star-emulsifier", "Emulsifier", 3.28, "Mixture", "commercial blend", "Purchased commercial blend; not made in the kettle.", "fat", "group-3"],
  ["star-sucrose", "Sucrose", 28, "C₁₂H₂₂O₁₁", "exact compound", "Partial acid-catalyzed inversion during heating.", "dry", "group-4"],
  ["star-citric-acid", "Anhydrous citric acid", 3.24, "C₆H₈O₇", "exact compound", "Triprotic acid; tartness and buffer equilibrium.", "dry", "group-4"],
  ["star-dextrin", "Tapioca dextrin", 69.04, "(C₆H₁₀O₅)ₙ", "variable polymer", "Partially hydrolyzed starch chains.", "dry", "group-4"],
  ["star-flour", "All-purpose flour", 15.08, "Mixture", "biological mixture", "Starch, proteins, lipids, minerals, and moisture.", "dry", "group-4"],
  ["star-cinnamon", "Baker's special cinnamon", .84, "Mixture", "spice mixture", "Cinnamaldehyde C₉H₈O is representative.", "dry", "group-4"]
].map(([id, name, target, formula, classification, detail, tone, groupId]) => ({ id, name, target, formula, classification, detail, tone, groupId }));

const groups = {
  "group-1": { label: "Group 1", short: "Heavy wet base", detail: "Build the fruit/syrup matrix first.", temp: "MIX" },
  "group-2": { label: "Group 2", short: "Minor wet additions", detail: "Dissolve water, citrate, and color.", temp: "AQUEOUS" },
  "group-3": { label: "Group 3", short: "Heated fat phase", detail: "Heat oil + emulsifier to 150°F.", temp: "150°F" },
  "group-4": { label: "Group 4", short: "Dry structure package", detail: "Premix the dry structure and acid.", temp: "DRY BLEND" }
};
const groupOrder = ["group-1", "group-2", "group-3", "group-4"];
const moisture = {
  5: { finalBatch: 354.326021, evaporated: 45.673979, rate: 3.044932 },
  7.5: { finalBatch: 363.9024, evaporated: 36.0976, rate: 2.406507 },
  10: { finalBatch: 374.0108, evaporated: 25.9892, rate: 1.732613 }
};

const selectedParts = new Set();
let selectedPartId = null;
const values = {};
const correctBottles = new Set();
const bottleStates = {};
let selectedGroup = "group-1";
let temperature = 70;
let minutes = 0;
let moistureTarget = 7.5;
let released = false;

const $ = (id) => document.getElementById(id);
const equipmentList = $("equipment-list");
const targetBays = $("target-bays");
const assemblyBoard = $("assembly-board");
const assemblyMessage = $("assembly-message");
const bottleRack = $("bottle-rack");
const groupTabs = $("group-tabs");
const labMessage = $("lab-message");

function renderEquipment() {
  equipmentList.innerHTML = equipment.map((part) => `
    <button class="equipment-card${selectedPartId === part.id ? " selected" : ""}${selectedParts.has(part.id) ? " secured" : ""}" type="button" draggable="true" data-part="${part.id}" aria-pressed="${selectedPartId === part.id}">
      <span class="equipment-icon" aria-hidden="true">${part.code}</span><span class="equipment-card-copy"><strong>${part.label}</strong><span>${part.detail}</span></span>
    </button>`).join("");
  equipmentList.querySelectorAll("[data-part]").forEach((card) => {
    card.addEventListener("click", () => { selectedPartId = card.dataset.part; renderEquipment(); setAssemblyMessage("Selected " + equipment.find((part) => part.id === selectedPartId).label + ". Choose its glowing bay."); });
    card.addEventListener("dragstart", (event) => { selectedPartId = card.dataset.part; event.dataTransfer.setData("text/plain", selectedPartId); });
  });
}

function renderBays() {
  targetBays.innerHTML = equipment.map((part) => `
    <button class="target-bay${selectedParts.has(part.id) ? " secured" : ""}" type="button" data-bay="${part.id}" style="left:${part.x}%;top:${part.y}%" aria-label="Bay ${part.code}: ${part.label}${selectedParts.has(part.id) ? ", secured" : ", place here"}">
      <strong>${selectedParts.has(part.id) ? "✓" : part.code}</strong><span>${selectedParts.has(part.id) ? "SECURED" : part.label}</span>
    </button>`).join("");
  targetBays.querySelectorAll("[data-bay]").forEach((bay) => {
    bay.addEventListener("click", () => placePart(selectedPartId, bay.dataset.bay));
    bay.addEventListener("dragover", (event) => { event.preventDefault(); bay.classList.add("over"); });
    bay.addEventListener("dragleave", () => bay.classList.remove("over"));
    bay.addEventListener("drop", (event) => { event.preventDefault(); bay.classList.remove("over"); placePart(event.dataTransfer.getData("text/plain") || selectedPartId, bay.dataset.bay); });
  });
}

function setAssemblyMessage(message, success = false) {
  assemblyMessage.textContent = message;
  assemblyMessage.classList.toggle("success", success);
}

function placePart(partId, bayId) {
  if (!partId) { setAssemblyMessage("Pick an equipment card first."); return; }
  if (partId !== bayId) { setAssemblyMessage("That machine belongs on a different bay. Try the matching code."); return; }
  selectedParts.add(partId);
  selectedPartId = null;
  renderEquipment();
  renderBays();
  $("assembly-count").textContent = `${String(selectedParts.size).padStart(2, "0")} / 15`;
  if (selectedParts.size === equipment.length) setAssemblyMessage("Workspace secured. Level 02 is unlocked — weigh the Starburst batch.", true);
  else setAssemblyMessage(`${equipment.find((part) => part.id === partId).label} secured. Keep going.`);
}

$("reset-assembly").addEventListener("click", () => { selectedParts.clear(); selectedPartId = null; $("assembly-count").textContent = "00 / 15"; renderEquipment(); renderBays(); setAssemblyMessage("Pick a part, then place it on its matching bay."); });

function groupComplete(groupId) { return bottles.filter((bottle) => bottle.groupId === groupId).every((bottle) => correctBottles.has(bottle.id)); }
function activeGroupIndex() { return groupOrder.findIndex((groupId) => !groupComplete(groupId)); }
function allCorrect() { return correctBottles.size === bottles.length; }
function currentGroupForBottle(bottle) { return groupOrder.indexOf(bottle.groupId); }

function renderGroups() {
  const active = activeGroupIndex();
  groupTabs.innerHTML = groupOrder.map((groupId, index) => {
    const done = groupComplete(groupId);
    const locked = active !== -1 && index > active;
    return `<button class="group-tab${selectedGroup === groupId ? " selected" : ""}${locked ? " locked" : ""}" type="button" data-group="${groupId}" aria-pressed="${selectedGroup === groupId}"><span><strong>${groups[groupId].label}</strong><small>${groups[groupId].short}</small></span><b>${done ? "DONE" : locked ? "LOCKED" : groups[groupId].temp}</b></button>`;
  }).join("");
  groupTabs.querySelectorAll("[data-group]").forEach((button) => button.addEventListener("click", () => { selectedGroup = button.dataset.group; setLabMessage(`${groups[selectedGroup].label}: ${groups[selectedGroup].detail}`); renderGroups(); renderBottles(); }));
}

function renderBottles() {
  const active = activeGroupIndex();
  bottleRack.innerHTML = groupOrder.map((groupId) => {
    const groupIndex = groupOrder.indexOf(groupId);
    const locked = active !== -1 && groupIndex > active;
    const cards = bottles.filter((bottle) => bottle.groupId === groupId).map((bottle) => {
      const state = bottleStates[bottle.id] || "idle";
      const entered = values[bottle.id] ?? "";
      return `<article class="bottle-card tone-${bottle.tone}${state === "correct" ? " correct" : state === "wrong" ? " wrong" : ""}${locked ? " locked" : ""}">
        <button class="bottle-image-button" type="button" data-inspect="${bottle.id}" aria-label="Inspect ${bottle.name} placeholder bottle"><span class="bottle-placeholder" aria-hidden="true"><span class="bottle-cap"></span><span class="bottle-liquid"></span><span class="bottle-label-mark">FA</span></span></button>
        <div class="bottle-copy"><div class="bottle-name-row"><h4>${bottle.name}</h4><span class="bottle-status">${state === "correct" ? "✓" : state === "wrong" ? "!" : "·"}</span></div><span class="bottle-formula">${bottle.formula}</span><span class="bottle-classification">${bottle.classification}</span><label class="bottle-target">Target mass <strong>${bottle.target.toFixed(2)} lb</strong></label><div class="bottle-entry"><input data-bottle-input="${bottle.id}" inputmode="decimal" type="number" step="0.01" min="0" value="${entered}" placeholder="0.00" aria-label="${bottle.name} mass in pounds"${locked || state === "correct" ? " disabled" : ""}><button class="weigh-button" type="button" data-weigh="${bottle.id}"${locked || state === "correct" ? " disabled" : ""}>${state === "correct" ? "Weighed" : "Weigh in"}</button></div></div>
      </article>`;
    }).join("");
    return `<section class="bottle-group${selectedGroup === groupId ? " active" : ""}"><div class="bottle-group-title"><strong>${groups[groupId].label} · ${groups[groupId].short}</strong><span>${groups[groupId].detail}</span></div><div class="bottle-group-grid">${cards}</div></section>`;
  }).join("");
  bottleRack.querySelectorAll("[data-bottle-input]").forEach((input) => input.addEventListener("input", () => { values[input.dataset.bottleInput] = input.value; }));
  bottleRack.querySelectorAll("[data-weigh]").forEach((button) => button.addEventListener("click", () => weigh(button.dataset.weigh)));
  bottleRack.querySelectorAll("[data-inspect]").forEach((button) => button.addEventListener("click", () => { const bottle = bottles.find((item) => item.id === button.dataset.inspect); selectedGroup = bottle.groupId; setLabMessage(`${bottle.name}: ${bottle.formula} · ${bottle.classification}. ${bottle.detail}`); renderGroups(); renderBottles(); }));
}

function setLabMessage(message, success = false) { labMessage.textContent = message; labMessage.classList.toggle("success", success); }

function weigh(id) {
  const bottle = bottles.find((item) => item.id === id);
  const entered = Number(values[id]);
  const active = activeGroupIndex();
  const bottleGroup = currentGroupForBottle(bottle);
  if (bottleGroup > active) { bottleStates[id] = "wrong"; setLabMessage(`Not yet: complete ${groups[groupOrder[active]].label} before weighing ${bottle.name}.`); renderBottles(); return; }
  if (bottle.groupId === "group-3" && temperature !== 150) { bottleStates[id] = "wrong"; setLabMessage("Group 3 requires the 150°F fat-phase working point before weighing the oil and emulsifier."); renderBottles(); return; }
  if (!Number.isFinite(entered) || Math.abs(entered - bottle.target) > .005) { bottleStates[id] = "wrong"; setLabMessage(`${bottle.name}: target is ${bottle.target.toFixed(2)} lb. Enter the exact batch amount within ±0.005 lb.`); renderBottles(); return; }
  correctBottles.add(id); bottleStates[id] = "correct";
  selectedGroup = bottle.groupId;
  const nextActive = activeGroupIndex();
  if (allCorrect()) setLabMessage("All 15 bottles are accurate. Set 242°F and 15.0 minutes to release the Starbursts.", true);
  else if (nextActive !== active) setLabMessage(`${groups[bottle.groupId].label} complete. Continue with ${groups[groupOrder[nextActive]].label}.`, true);
  else setLabMessage(`${bottle.name} accepted at ${bottle.target.toFixed(2)} lb.`);
  updateReadouts();
  renderGroups();
  renderBottles();
}

function batchMass() { return bottles.filter((bottle) => correctBottles.has(bottle.id)).reduce((sum, bottle) => sum + bottle.target, 0); }
function pH() { if (!groupComplete("group-1")) return 7; if (!groupComplete("group-2")) return 3.65; if (!groupComplete("group-3")) return 4.988417; return groupComplete("group-4") ? 3.083247 : 4.988417; }
function conversion() { return temperature === 242 ? 1 - Math.exp(-0.005206565 * minutes * 60) : 0; }

function updateReadouts() {
  const count = correctBottles.size;
  const mass = batchMass();
  $("bottle-count").textContent = `${String(count).padStart(2, "0")} / 15`;
  $("bottle-progress").textContent = `${count} / 15`;
  $("bottle-progress-bar").style.width = `${count / bottles.length * 100}%`;
  $("kettle-mass").textContent = `${mass.toFixed(3)} / 400.000 lb`;
  $("batch-readout").textContent = `${mass.toFixed(3)} lb`;
  $("ph-readout").textContent = pH().toFixed(6);
  const status = $("kettle-status");
  status.textContent = released ? "RELEASED" : allCorrect() ? "READY TO COOK" : "LOADING";
  status.className = `kettle-status${allCorrect() ? " ready" : ""}${released ? " released" : ""}`;
  const profile = moisture[moistureTarget];
  $("moisture-readout").innerHTML = `<strong>${moistureTarget}% moisture</strong>${profile.finalBatch.toFixed(6)} lb final batch · ${profile.evaporated.toFixed(6)} lb water evaporated · ${profile.rate.toFixed(6)} lb/min`;
  $("finish-button").classList.toggle("ready", allCorrect() && temperature === 242 && minutes === 15);
  updateCookReadout();
}

function updateCookReadout() {
  const percent = conversion() * 100;
  $("temp-readout").textContent = `${temperature}°F`;
  $("timer-readout").textContent = `${minutes.toFixed(1)} min`;
  $("reaction-meter").hidden = !(temperature === 242 && minutes > 0);
  $("conversion-readout").textContent = `${percent.toFixed(6)}%`;
  $("conversion-bar").style.width = `${percent}%`;
  const consumedSucrose = 28 * conversion();
  $("sucrose-left").textContent = `Sucrose left ${(28 - consumedSucrose).toFixed(6)} lb`;
  $("glucose-made").textContent = `Glucose ${(consumedSucrose * 342.2965 / 180.156).toFixed(6)} lb`;
  $("water-used").textContent = `Water consumed ${(consumedSucrose * 18.0153 / 342.2965).toFixed(6)} lb`;
  $("kettle-placeholder").hidden = released;
  $("kettle-candy").hidden = !released;
  $("kettle-caption").textContent = released ? "finished chew · cool → form → cut" : "mix · dissolve · emulsify · cook";
}

$("temperature-buttons").innerHTML = [70, 150, 180, 200, 220, 242].map((item) => `<button type="button" data-temp="${item}"${item === temperature ? " class=selected" : ""}>${item}°</button>`).join("");
$("temperature-buttons").querySelectorAll("[data-temp]").forEach((button) => button.addEventListener("click", () => { temperature = Number(button.dataset.temp); released = false; setLabMessage(temperature === 150 ? "150°F selected: Group 3 fat phase is ready." : temperature === 242 ? "242°F selected: cook endpoint model is available." : `${temperature}°F selected.`); $("temperature-buttons").querySelectorAll("button").forEach((item) => item.classList.toggle("selected", item === button)); updateReadouts(); renderBottles(); }));

$("cook-timer").addEventListener("input", (event) => { minutes = Number(event.target.value); released = false; updateReadouts(); });
$("moisture-buttons").innerHTML = [5, 7.5, 10].map((item) => `<button type="button" data-moisture="${item}"${item === moistureTarget ? " class=selected" : ""}>${item}%</button>`).join("");
$("moisture-buttons").querySelectorAll("[data-moisture]").forEach((button) => button.addEventListener("click", () => { moistureTarget = Number(button.dataset.moisture); released = false; $("moisture-buttons").querySelectorAll("button").forEach((item) => item.classList.toggle("selected", item === button)); updateReadouts(); }));

$("finish-button").addEventListener("click", () => {
  if (!allCorrect()) { setLabMessage(`Accuracy check: ${15 - correctBottles.size} bottle${15 - correctBottles.size === 1 ? " is" : "s are"} still missing or incorrect.`); return; }
  if (temperature !== 242) { setLabMessage("Set the kettle to the 242°F patent endpoint before finishing."); return; }
  if (minutes !== 15) { setLabMessage("Run the cook timer to exactly 15.0 minutes before finishing."); return; }
  released = true;
  setLabMessage(`Starbursts released at ${moistureTarget}% modeled moisture. Cool, form, cut, and package the finished chew.`, true);
  updateReadouts();
});

$("chemistry-toggle").addEventListener("click", () => { const panel = $("chemistry"); const open = panel.hidden; panel.hidden = !open; $("chemistry-toggle").textContent = open ? "Hide ICE / chemistry readout" : "Open ICE / chemistry readout"; $("chemistry-toggle").setAttribute("aria-expanded", String(open)); });

renderEquipment();
renderBays();
renderGroups();
renderBottles();
updateReadouts();
