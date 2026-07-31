(() => {
  "use strict";

  const ROOT_ID = "fa-lab-principles";
  if (document.getElementById(ROOT_ID)) return;

  const agents = [
    {
      id: "cacl2",
      name: "Calcium chloride",
      formula: "CaCl₂",
      rating: "High capacity · fast",
      suitable: "Many hydrocarbons, halogenated solvents and selected ethers; useful in granular drying tubes.",
      avoid: "Methanol, ethanol and other alcohols/phenols; ammonia, amines and amides; many acids, ketones and esters.",
      note: "Forms hydrates up to CaCl₂·6H₂O and can also form adducts with hydroxy, amino and carbonyl compounds."
    },
    {
      id: "zncl2",
      name: "Zinc chloride",
      formula: "ZnCl₂",
      rating: "Special-purpose",
      suitable: "Hydrocarbon streams where a Lewis-acidic desiccant is chemically compatible.",
      avoid: "Ammonia, amines and alcohols; do not treat it as a universal organic-layer drying agent.",
      note: "Strong coordination and Lewis acidity make compatibility screening essential."
    },
    {
      id: "na2so4",
      name: "Sodium sulfate",
      formula: "Na₂SO₄",
      rating: "Broad · high capacity · slower",
      suitable: "A wide range of neutral organic solutions, including many oxygen- and nitrogen-containing compounds.",
      avoid: "Very small samples or situations where rapid drying is more important than capacity.",
      note: "Generally mild and inexpensive; allow enough contact time and use a free-flowing excess."
    },
    {
      id: "caso4",
      name: "Calcium sulfate (Drierite)",
      formula: "CaSO₄",
      rating: "Rapid · lower capacity",
      suitable: "Broad solvent compatibility, gas-drying columns and applications needing a fast endpoint.",
      avoid: "Large water loads unless the bed is sized accordingly.",
      note: "Fast uptake but less water capacity than several common sulfate alternatives."
    },
    {
      id: "mgso4",
      name: "Magnesium sulfate",
      formula: "MgSO₄",
      rating: "Broad · rapid · high surface area",
      suitable: "Routine drying of many neutral organic layers after extraction or washing.",
      avoid: "Situations where fine powder retention or product adsorption is a concern.",
      note: "A common general-purpose choice; the dry solid should remain loose rather than forming persistent clumps."
    }
  ];

  const compatibility = {
    hydrocarbon: {
      label: "Hydrocarbon",
      recommended: ["MgSO₄", "Na₂SO₄", "CaSO₄", "CaCl₂", "ZnCl₂"],
      avoid: "Still check substrate sensitivity; ZnCl₂ is Lewis acidic and CaCl₂ can carry basic impurities."
    },
    ether: {
      label: "Ether or halogenated solvent",
      recommended: ["MgSO₄", "Na₂SO₄", "CaSO₄", "CaCl₂ when compatible"],
      avoid: "Do not assume CaCl₂ is inert toward every dissolved solute."
    },
    alcohol: {
      label: "Alcohol or phenol present",
      recommended: ["MgSO₄", "Na₂SO₄", "CaSO₄"],
      avoid: "Avoid CaCl₂ and ZnCl₂ because they can absorb or coordinate alcohols."
    },
    amine: {
      label: "Amine, amide or ammonia present",
      recommended: ["MgSO₄", "Na₂SO₄", "CaSO₄"],
      avoid: "Avoid CaCl₂ and ZnCl₂ because complexation can remove or contaminate the compound."
    },
    carbonyl: {
      label: "Acid, ketone or ester present",
      recommended: ["MgSO₄", "Na₂SO₄", "CaSO₄"],
      avoid: "CaCl₂ can contain basic impurities and form adducts with carbonyl compounds."
    },
    unknown: {
      label: "Unknown or mixed functionality",
      recommended: ["Start with a mild sulfate after a small compatibility test"],
      avoid: "Do not choose CaCl₂ or ZnCl₂ only from drying strength; chemical compatibility controls the choice."
    }
  };

  const html = `
    <button class="fa-principles-launcher" type="button" aria-haspopup="dialog" aria-controls="fa-principles-dialog">
      <span aria-hidden="true">◇</span>
      <strong>Drying · Vacuum</strong>
    </button>
    <div class="fa-principles-backdrop" hidden>
      <section class="fa-principles-window" id="fa-principles-dialog" role="dialog" aria-modal="true" aria-labelledby="fa-principles-title">
        <header class="fa-principles-titlebar">
          <div>
            <span>FURIOUS ACID LAB PRINCIPLES</span>
            <h2 id="fa-principles-title">Drying, Vacuum & Density</h2>
          </div>
          <button class="fa-principles-close" type="button" aria-label="Close lab principles">×</button>
        </header>
        <nav class="fa-principles-tabs" aria-label="Lab principle sections">
          <button type="button" data-tab="drying" class="selected">Drying agents</button>
          <button type="button" data-tab="vacuum">Vacuum & distillation</button>
          <button type="button" data-tab="density">Density estimator</button>
        </nav>
        <div class="fa-principles-content">
          <section class="fa-principles-pane selected" data-pane="drying">
            <div class="fa-principles-hero">
              <span>HYDRATE EQUILIBRIUM</span>
              <strong>A + n H₂O ⇌ A·(H₂O)ₙ</strong>
              <p>An anhydrous salt removes dissolved water by forming a hydrate. Judge performance by <b>intensity</b> (how dry the solvent becomes), <b>capacity</b> (water held per amount of agent), and <b>velocity</b> (how quickly equilibrium is approached).</p>
            </div>
            <label class="fa-advisor-label">
              Compatibility advisor
              <select class="fa-agent-select">
                <option value="unknown">Choose the solvent or functional group…</option>
                <option value="hydrocarbon">Hydrocarbon</option>
                <option value="ether">Ether or halogenated solvent</option>
                <option value="alcohol">Alcohol or phenol present</option>
                <option value="amine">Amine, amide or ammonia present</option>
                <option value="carbonyl">Acid, ketone or ester present</option>
              </select>
            </label>
            <div class="fa-advisor-result" aria-live="polite"></div>
            <div class="fa-agent-grid">
              ${agents.map((agent) => `
                <article class="fa-agent-card">
                  <header><b>${agent.formula}</b><div><strong>${agent.name}</strong><span>${agent.rating}</span></div></header>
                  <dl>
                    <div><dt>Suitable</dt><dd>${agent.suitable}</dd></div>
                    <div><dt>Avoid</dt><dd>${agent.avoid}</dd></div>
                  </dl>
                  <p>${agent.note}</p>
                </article>
              `).join("")}
            </div>
            <p class="fa-principles-note"><b>Practical endpoint:</b> add small portions and swirl. A free-flowing solid indicates that most bulk water has been removed; persistent clumping indicates more agent or more contact time may be needed. This is a qualitative check, not an analytical water measurement.</p>
          </section>

          <section class="fa-principles-pane" data-pane="vacuum">
            <div class="fa-vacuum-flow" role="img" aria-label="Vacuum system order: apparatus, primary trap, secondary catch flask, vacuum source">
              <div><span>1</span><b>Apparatus</b><small>vapor or liquid source</small></div><i>→</i>
              <div><span>2</span><b>Primary trap</b><small>cold trap or scrubber</small></div><i>→</i>
              <div><span>3</span><b>Catch flask</b><small>overflow protection</small></div><i>→</i>
              <div><span>4</span><b>Vacuum source</b><small>pump or approved line</small></div>
            </div>
            <div class="fa-safety-grid">
              <article>
                <h3>Always trap the line</h3>
                <p>Place an appropriate trap between the apparatus and vacuum source. It protects pumps, piping and people from liquids, particles, vapors and corrosive material.</p>
              </article>
              <article>
                <h3>Volatile liquids</h3>
                <p>Use a cold trap large and cold enough to condense the vapor, followed by a secondary flask able to catch material carried out of the trap.</p>
              </article>
              <article>
                <h3>Water aspirator</h3>
                <p>Fast water flow entrains air from the side port. Aspirators can waste water, discharge volatile solvent into wastewater and cause suck-back when water pressure falls.</p>
              </article>
              <article>
                <h3>Vacuum glassware</h3>
                <p>Use thick-walled, vacuum-rated vessels and clamp them at the neck. Ordinary thin-walled Erlenmeyer flasks can implode.</p>
              </article>
              <article>
                <h3>Reactive or toxic gas</h3>
                <p>Use a compatible sorbent canister or scrubber designed for the gas. A simple empty flask or water aspirator is not an adequate control.</p>
              </article>
              <article>
                <h3>Release vacuum first</h3>
                <p>Before stopping water flow or disconnecting the source, isolate the system and admit air in a controlled way to reduce backflow risk.</p>
              </article>
            </div>
            <div class="fa-condenser-card">
              <svg viewBox="0 0 410 145" role="img" aria-label="Condenser cooling water enters at the lower port and exits at the upper port">
                <defs><linearGradient id="fa-water" x1="0" x2="1"><stop offset="0" stop-color="#c5efff"/><stop offset="1" stop-color="#68bde8"/></linearGradient></defs>
                <rect x="72" y="46" width="265" height="52" rx="22" fill="#f8fdff" stroke="#4d8fae" stroke-width="3"/>
                <rect x="91" y="58" width="227" height="28" rx="13" fill="url(#fa-water)" opacity=".72"/>
                <path d="M42 108 H104 V88" fill="none" stroke="#2287bd" stroke-width="7" stroke-linecap="round"/>
                <path d="M304 57 V31 H373" fill="none" stroke="#2287bd" stroke-width="7" stroke-linecap="round"/>
                <path d="M110 72 H300" stroke="#50666f" stroke-width="8" stroke-linecap="round"/>
                <path d="M128 72 l18 -8 v16 z M194 72 l18 -8 v16 z M260 72 l18 -8 v16 z" fill="#fff"/>
                <text x="16" y="130">COLD WATER IN · LOWER PORT</text>
                <text x="235" y="20">WARM WATER OUT · UPPER PORT</text>
              </svg>
              <div><h3>Condenser water direction</h3><p>Connect cooling water at the <b>lower</b> jacket port and let it leave from the <b>upper</b> port. Bottom-up filling displaces air and keeps the jacket full.</p></div>
            </div>
            <p class="fa-principles-note"><b>Selection rule:</b> aqueous or nonvolatile liquid may only need a room-temperature catch flask; volatile solvent requires a cold trap; corrosive, reactive or toxic gas requires a purpose-designed scrubber or sorbent.</p>
          </section>

          <section class="fa-principles-pane" data-pane="density">
            <div class="fa-density-intro">
              <span>ADDITIVE-VOLUME APPROXIMATION</span>
              <p>Estimate the water/ethanol/benzaldehyde volume fractions from measured bulk density while holding the ethanol fraction fixed.</p>
            </div>
            <form class="fa-density-form">
              <label>Sample mass (g)<input name="mass" type="number" min="0.0001" step="any" value="92.50" required></label>
              <label>Total volume (mL)<input name="volume" type="number" min="0.0001" step="any" value="100" required></label>
              <label>Ethanol (vol %)<input name="ethanolPct" type="number" min="0" max="100" step="any" value="36" required></label>
              <label>SG water<input name="rhoWater" type="number" min="0.0001" step="any" value="1.0000" required></label>
              <label>SG ethanol<input name="rhoEthanol" type="number" min="0.0001" step="any" value="0.7893" required></label>
              <label>SG benzaldehyde<input name="rhoBenzaldehyde" type="number" min="0.0001" step="any" value="1.0400" required></label>
            </form>
            <div class="fa-density-equation">
              <p>ρ<sub>mix</sub> = wρ<sub>w</sub> + eρ<sub>e</sub> + bρ<sub>b</sub>, &nbsp; w + e + b = 1</p>
              <p>b = [ρ<sub>mix</sub> − (1 − e)ρ<sub>w</sub> − eρ<sub>e</sub>] / (ρ<sub>b</sub> − ρ<sub>w</sub>)</p>
            </div>
            <div class="fa-density-results" aria-live="polite">
              <div><span>Measured density</span><strong data-result="density">—</strong></div>
              <div><span>Water</span><strong data-result="water">—</strong></div>
              <div><span>Ethanol</span><strong data-result="ethanol">—</strong></div>
              <div><span>Benzaldehyde</span><strong data-result="benzaldehyde">—</strong></div>
            </div>
            <div class="fa-density-status"></div>
            <div class="fa-density-special">
              <h3>With ethanol fixed at 36 vol %</h3>
              <p>w = 0.64 − b</p>
              <p>ρ<sub>mix</sub> = 0.924148 + 0.040000b</p>
              <p>b = (ρ<sub>mix</sub> − 0.924148) / 0.040000</p>
            </div>
            <p class="fa-principles-note"><b>Important:</b> the benzaldehyde/water density difference is only 0.04. Small errors in mass, volume, temperature or non-additive mixing create large composition errors. Treat this as a screening estimate, not a substitute for calibrated analytical measurement.</p>
          </section>
        </div>
        <footer class="fa-principles-footer">
          <span>Educational model · compatibility and vacuum safety must be verified for the actual materials and equipment.</span>
          <button class="fa-principles-close-bottom" type="button">Close</button>
        </footer>
      </section>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${ROOT_ID}{font-family:Tahoma,Segoe UI,Arial,sans-serif;font-size:12px;color:#1d1722;user-select:text}
    #${ROOT_ID} *{box-sizing:border-box}
    .fa-principles-launcher{z-index:185;position:fixed;right:12px;bottom:30px;display:flex;align-items:center;gap:7px;min-height:36px;padding:0 11px;color:#fff;background:linear-gradient(#812ee0,#4d0d96);border:1px solid #310564;border-radius:5px;box-shadow:0 5px 16px #1604245e,inset 0 1px #ffffff55;cursor:pointer}
    .fa-principles-launcher:hover,.fa-principles-launcher:focus-visible{background:linear-gradient(#923beb,#5a13a5);outline:2px solid #fdf200;outline-offset:2px}
    .fa-principles-launcher>span{color:#fdf200;font-size:18px;line-height:1}
    .fa-principles-backdrop{z-index:520;position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:#14081edb;backdrop-filter:blur(4px)}
    .fa-principles-backdrop[hidden]{display:none}
    .fa-principles-window{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;width:min(1040px,100%);height:min(760px,calc(100dvh - 32px));background:#eeedf0;border:1px solid #2e075d;border-radius:9px;overflow:hidden;box-shadow:0 24px 80px #0009}
    .fa-principles-titlebar{display:flex;align-items:center;gap:12px;padding:10px 12px;color:#fff;background:linear-gradient(90deg,#fdf20024,#0000 22%),linear-gradient(#812de0,#4d0c97);border-bottom:2px solid #2b0459}
    .fa-principles-titlebar>div{min-width:0}.fa-principles-titlebar span{display:block;color:#fff39b;letter-spacing:.1em;font-size:9px;font-weight:800}.fa-principles-titlebar h2{margin:2px 0 0;font-size:19px;line-height:1.1}
    .fa-principles-close{margin-left:auto;width:34px;height:32px;color:#fff;background:#ffffff14;border:1px solid #ffffff66;border-radius:4px;font-size:21px;cursor:pointer}
    .fa-principles-tabs{display:flex;gap:2px;padding:5px 7px 0;background:#d9d7dc;border-bottom:1px solid #8f8b94}
    .fa-principles-tabs button{min-height:34px;padding:0 15px;background:#c9c6cc;border:1px solid #99949e;border-bottom:0;border-radius:5px 5px 0 0;cursor:pointer}
    .fa-principles-tabs button.selected{position:relative;top:1px;background:#fff;color:#52118f;font-weight:800}
    .fa-principles-content{min-height:0;background:#f6f5f7;overflow:auto}
    .fa-principles-pane{display:none;padding:13px}.fa-principles-pane.selected{display:block}
    .fa-principles-hero{padding:12px 14px;color:#fff;background:radial-gradient(circle at 97% 14%,#fdf200 0 5px,#0000 6px),linear-gradient(130deg,#321052,#731ab2);border-radius:7px;margin-bottom:10px}
    .fa-principles-hero>span,.fa-density-intro>span{display:block;color:#fff28a;letter-spacing:.1em;font-size:9px;font-weight:800}.fa-principles-hero>strong{display:block;margin:5px 0 6px;font:700 18px Cambria Math,Segoe UI Symbol,serif}.fa-principles-hero p{margin:0;color:#efe4f8;line-height:1.45}
    .fa-advisor-label{display:grid;gap:4px;margin-bottom:8px;color:#4b4051;font-weight:700}.fa-agent-select{height:37px;padding:4px 8px;background:#fff;border:1px solid #90769f;border-radius:4px}
    .fa-advisor-result{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.fa-advisor-result>div{padding:8px;border:1px solid #c8bdcf;border-radius:5px;background:#fff}.fa-advisor-result b{display:block;margin-bottom:3px;color:#61179b}.fa-advisor-result .fa-avoid{background:#fff4ea;border-color:#e3b493}.fa-advisor-result .fa-avoid b{color:#8a361f}
    .fa-agent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fa-agent-card{background:#fff;border:1px solid #b7adbC;border-radius:6px;overflow:hidden;box-shadow:0 2px 5px #3511480d}.fa-agent-card>header{display:flex;align-items:center;gap:9px;padding:8px;background:linear-gradient(#fbf9fc,#ebe5ef);border-bottom:1px solid #c8bdce}.fa-agent-card>header>b{display:grid;place-items:center;min-width:60px;height:39px;color:#4c176f;background:#fff;border:1px solid #b89acb;border-radius:4px;font:700 14px Cambria Math,serif}.fa-agent-card>header div{display:grid;gap:2px}.fa-agent-card>header span{color:#736a78;font-size:9px;text-transform:uppercase}.fa-agent-card dl{display:grid;gap:5px;margin:0;padding:8px}.fa-agent-card dl>div{display:grid;grid-template-columns:54px 1fr;gap:6px}.fa-agent-card dt{color:#6e287f;font-size:9px;text-transform:uppercase;font-weight:800}.fa-agent-card dd{margin:0;line-height:1.35}.fa-agent-card>p{margin:0;padding:0 8px 9px;color:#605864;line-height:1.4}
    .fa-principles-note{margin:10px 0 0;padding:9px 10px;background:#fff9ca;border:1px solid #d5c75c;line-height:1.45}
    .fa-vacuum-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:center;gap:6px;margin-bottom:10px;padding:10px;background:#28133a;border-radius:7px;color:#fff}.fa-vacuum-flow>div{min-height:74px;padding:8px;background:#ffffff12;border:1px solid #ffffff33;border-radius:5px}.fa-vacuum-flow span{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fdf200;color:#35104e;font-weight:900}.fa-vacuum-flow b,.fa-vacuum-flow small{display:block;margin-top:4px}.fa-vacuum-flow small{color:#d9cce2;line-height:1.25}.fa-vacuum-flow>i{color:#fdf200;font-size:19px;font-style:normal}
    .fa-safety-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.fa-safety-grid article{padding:9px;background:#fff;border:1px solid #b9b0bf;border-radius:6px;border-top:4px solid #6818a1}.fa-safety-grid h3{margin:0 0 5px;color:#4b1768;font-size:12px}.fa-safety-grid p{margin:0;line-height:1.42;color:#4f4853}
    .fa-condenser-card{display:grid;grid-template-columns:minmax(300px,1.25fr) 1fr;gap:10px;align-items:center;margin-top:10px;padding:10px;background:#eef9fd;border:1px solid #8fc5dd;border-radius:6px}.fa-condenser-card svg{width:100%;height:auto;background:#fff;border:1px solid #b6d7e5;border-radius:4px}.fa-condenser-card text{fill:#26566b;font:700 11px Tahoma,sans-serif}.fa-condenser-card h3{margin:0 0 6px;color:#245d77}.fa-condenser-card p{margin:0;line-height:1.45}
    .fa-density-intro{padding:11px 13px;color:#fff;background:linear-gradient(130deg,#381056,#771ab3);border-radius:6px 6px 0 0}.fa-density-intro p{margin:5px 0 0;color:#eadcf3}.fa-density-form{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:10px;background:#fff;border:1px solid #b6acbc;border-top:0}.fa-density-form label{display:grid;gap:4px;color:#504556;font-weight:700}.fa-density-form input{height:34px;padding:4px 7px;background:#fff;border:1px solid #9d93a3;border-radius:3px;font-family:Courier New,monospace}
    .fa-density-equation{margin-top:9px;padding:9px 11px;background:#f2eafb;border:1px solid #cfb7e2;border-left:5px solid #6e18a7;font:13px Cambria Math,Segoe UI Symbol,serif}.fa-density-equation p{margin:3px 0}
    .fa-density-results{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:9px}.fa-density-results>div{display:grid;gap:3px;padding:9px;color:#fff;background:linear-gradient(135deg,#461063,#7b21b2);border-radius:5px}.fa-density-results span{color:#e7d8f0;font-size:9px;text-transform:uppercase}.fa-density-results strong{font-size:18px}
    .fa-density-status{margin-top:8px;padding:9px 10px;background:#edf9f2;border:1px solid #9acaae;color:#215f3a;line-height:1.4}.fa-density-status.invalid{background:#fff0e9;border-color:#dfa28e;color:#7a2f20}
    .fa-density-special{margin-top:9px;padding:9px 11px;background:#fff;border:1px solid #bcb3c0;border-radius:5px}.fa-density-special h3{margin:0 0 6px;color:#4b1768}.fa-density-special p{margin:3px 0;font:12px Courier New,monospace}
    .fa-principles-footer{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#d9d7dc;border-top:1px solid #99949e}.fa-principles-footer span{color:#59535e}.fa-principles-footer button{margin-left:auto;min-width:76px;min-height:30px;color:#fff;background:linear-gradient(#812de0,#4d0c97);border:1px solid #2e075d;border-radius:4px;font-weight:700;cursor:pointer}
    @media(max-width:720px){.fa-principles-launcher{right:7px;bottom:34px;min-height:40px;padding:0 9px}.fa-principles-backdrop{padding:0;backdrop-filter:none}.fa-principles-window{width:100%;height:100dvh;border:0;border-radius:0}.fa-principles-titlebar{padding:8px 10px}.fa-principles-titlebar h2{font-size:17px}.fa-principles-tabs{overflow:auto}.fa-principles-tabs button{flex:0 0 auto;min-height:42px;padding:0 11px}.fa-principles-pane{padding:9px}.fa-agent-grid,.fa-advisor-result,.fa-safety-grid,.fa-density-form,.fa-density-results{grid-template-columns:1fr}.fa-vacuum-flow{grid-template-columns:1fr}.fa-vacuum-flow>i{transform:rotate(90deg);justify-self:center}.fa-condenser-card{grid-template-columns:1fr}.fa-principles-footer span{display:none}.fa-principles-footer button{width:100%;min-height:42px;margin:0}}
  `;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = html;
  document.head.appendChild(style);
  document.body.appendChild(root);

  const launcher = root.querySelector(".fa-principles-launcher");
  const backdrop = root.querySelector(".fa-principles-backdrop");
  const dialog = root.querySelector(".fa-principles-window");
  const tabs = [...root.querySelectorAll("[data-tab]")];
  const panes = [...root.querySelectorAll("[data-pane]")];
  const advisorSelect = root.querySelector(".fa-agent-select");
  const advisorResult = root.querySelector(".fa-advisor-result");
  const densityForm = root.querySelector(".fa-density-form");
  const densityStatus = root.querySelector(".fa-density-status");
  const priorFocus = { element: null };

  function showTab(name) {
    tabs.forEach((button) => button.classList.toggle("selected", button.dataset.tab === name));
    panes.forEach((pane) => pane.classList.toggle("selected", pane.dataset.pane === name));
  }

  function openDialog() {
    priorFocus.element = document.activeElement;
    backdrop.hidden = false;
    dialog.querySelector("button,select,input")?.focus();
  }

  function closeDialog() {
    backdrop.hidden = true;
    priorFocus.element?.focus?.();
  }

  function updateAdvisor() {
    const item = compatibility[advisorSelect.value] || compatibility.unknown;
    advisorResult.innerHTML = `
      <div><b>Recommended starting choices</b>${item.recommended.join(" · ")}</div>
      <div class="fa-avoid"><b>Compatibility caution</b>${item.avoid}</div>
    `;
  }

  function number(formData, key) {
    return Number(formData.get(key));
  }

  function updateDensity() {
    const data = new FormData(densityForm);
    const mass = number(data, "mass");
    const volume = number(data, "volume");
    const e = number(data, "ethanolPct") / 100;
    const rhoW = number(data, "rhoWater");
    const rhoE = number(data, "rhoEthanol");
    const rhoB = number(data, "rhoBenzaldehyde");
    const values = [mass, volume, e, rhoW, rhoE, rhoB];
    const result = (key) => root.querySelector(`[data-result="${key}"]`);

    if (values.some((value) => !Number.isFinite(value)) || mass <= 0 || volume <= 0 || e < 0 || e > 1 || rhoW <= 0 || rhoE <= 0 || rhoB <= 0 || Math.abs(rhoB - rhoW) < 1e-12) {
      ["density", "water", "ethanol", "benzaldehyde"].forEach((key) => { result(key).textContent = "—"; });
      densityStatus.className = "fa-density-status invalid";
      densityStatus.textContent = "Enter positive mass, volume and specific-gravity values; ethanol must be between 0 and 100%.";
      return;
    }

    const density = mass / volume;
    const b = (density - (1 - e) * rhoW - e * rhoE) / (rhoB - rhoW);
    const w = 1 - e - b;
    const valid = b >= -1e-9 && w >= -1e-9 && b <= 1 - e + 1e-9;
    result("density").textContent = `${density.toFixed(6)} g/mL`;
    result("water").textContent = `${(w * 100).toFixed(2)} vol %`;
    result("ethanol").textContent = `${(e * 100).toFixed(2)} vol %`;
    result("benzaldehyde").textContent = `${(b * 100).toFixed(2)} vol %`;
    densityStatus.className = `fa-density-status${valid ? "" : " invalid"}`;
    densityStatus.textContent = valid
      ? `The three fractions sum to ${((w + e + b) * 100).toFixed(4)}%. This is mathematically consistent with the selected density model.`
      : "The calculated composition falls outside 0–100%. The measured density, fixed ethanol fraction or assumed specific gravities are inconsistent with this three-component additive-volume model.";
  }

  launcher.addEventListener("click", openDialog);
  root.querySelectorAll(".fa-principles-close,.fa-principles-close-bottom").forEach((button) => button.addEventListener("click", closeDialog));
  backdrop.addEventListener("mousedown", (event) => { if (event.target === backdrop) closeDialog(); });
  tabs.forEach((button) => button.addEventListener("click", () => showTab(button.dataset.tab)));
  advisorSelect.addEventListener("change", updateAdvisor);
  densityForm.addEventListener("input", updateDensity);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !backdrop.hidden) closeDialog();
  });

  updateAdvisor();
  updateDensity();
})();
