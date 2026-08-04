(() => {
  "use strict";

  if (window.FuriousAcidStartupUI) return;

  const STYLE_ID = "fa-startup-ui-style";
  const BACKGROUND_SRC = "./assets/purple-startup-counter.png";
  const iconMap = new Map([
    ["Chemicals", "⚗"],
    ["Acids", "H⁺"],
    ["Alkalis", "OH⁻"],
    ["Bases", "OH⁻"],
    ["Oxidizers", "O₂"],
    ["Organic liquids", "C"],
    ["Organic Liquids", "C"],
    ["Salts", "NaCl"],
    ["Metals", "Fe"],
    ["Gases", "Gas"],
    ["Indicators", "pH"],
    ["Solvents", "Solv"],
    ["Glassware", "◯"],
    ["Equipment", "⚙"],
    ["Heating", "Δ"],
    ["Cooling", "❄"],
    ["Safety", "!"],
    ["Tools", "⌁"]
  ]);

  const css = `
    .fa-parts-panel {
      width: min(390px, 34vw) !important;
      max-width: 390px !important;
      min-width: 286px !important;
      left: 0 !important;
      right: auto !important;
      box-shadow: 8px 0 20px rgba(0, 0, 0, .14) !important;
    }

    .fa-category-icon {
      display: inline-grid;
      place-items: center;
      flex: 0 0 auto;
      width: 28px;
      height: 28px;
      margin-right: 9px;
      border: 1px solid rgba(111, 0, 255, .30);
      border-radius: 7px;
      background: rgba(111, 0, 255, .10);
      color: #5314a8;
      font: 800 11px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      vertical-align: middle;
      letter-spacing: -.03em;
    }

    .fa-category-row {
      display: flex !important;
      align-items: center !important;
    }

    .fa-lab-background-host {
      position: relative !important;
      isolation: isolate;
      background-color: #b3bd35 !important;
      background-image: url("${BACKGROUND_SRC}") !important;
      background-repeat: no-repeat !important;
      background-position: center bottom !important;
      background-size: cover !important;
    }

    .fa-lab-background-host > canvas,
    .fa-lab-background-host > svg {
      position: relative;
      z-index: 1;
      background: transparent !important;
    }

    @media (max-width: 760px) {
      .fa-parts-panel {
        width: min(76vw, 340px) !important;
        max-width: min(76vw, 340px) !important;
        min-width: 250px !important;
      }
    }

    @media (max-width: 430px) {
      .fa-parts-panel {
        width: 72vw !important;
        max-width: 305px !important;
        min-width: 238px !important;
      }

      .fa-category-icon {
        width: 25px;
        height: 25px;
        margin-right: 7px;
        font-size: 10px;
      }
    }
  `;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function normalizedText(element) {
    return (element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function leafElementsWithText(text) {
    return Array.from(document.querySelectorAll("button, [role='button'], li, div, span, h1, h2, h3, h4, label"))
      .filter((element) => visible(element) && normalizedText(element) === text)
      .filter((element) => !Array.from(element.children).some((child) => normalizedText(child) === text));
  }

  function findPartsPanel() {
    const headings = leafElementsWithText("Parts Library");
    for (const heading of headings) {
      let node = heading;
      for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
        if (!(node instanceof HTMLElement) || node === document.body || node.id === "root") continue;
        const text = normalizedText(node);
        const rect = node.getBoundingClientRect();
        if (text.includes("Parts Library") && text.includes("Find a part") && rect.height > 230 && rect.width > 235) {
          return node;
        }
      }
    }
    return null;
  }

  function openPartsLibrary() {
    const panel = findPartsPanel();
    if (panel) {
      panel.classList.add("fa-parts-panel");
      const partsTab = Array.from(panel.querySelectorAll("button, [role='tab'], [role='button']"))
        .find((element) => visible(element) && normalizedText(element) === "Parts");
      if (partsTab && partsTab.getAttribute("aria-selected") !== "true") partsTab.click();
      return true;
    }

    const directControl = Array.from(document.querySelectorAll("button, [role='button'], [title], [aria-label]"))
      .find((element) => {
        if (!visible(element)) return false;
        const label = `${normalizedText(element)} ${element.getAttribute("title") || ""} ${element.getAttribute("aria-label") || ""}`;
        return /show\s+parts\s+library/i.test(label);
      });

    if (directControl) {
      directControl.click();
      return false;
    }

    const viewButton = leafElementsWithText("View")[0];
    if (viewButton) {
      viewButton.click();
      window.setTimeout(() => {
        const showItem = Array.from(document.querySelectorAll("button, [role='menuitem'], [role='button'], li, div"))
          .find((element) => visible(element) && /show\s+parts\s+library/i.test(normalizedText(element)));
        if (showItem) showItem.click();
      }, 90);
    }
    return false;
  }

  function addCategoryIcons(root = document) {
    const candidates = root.querySelectorAll("button, [role='button'], [role='treeitem'], li, div, span");
    for (const element of candidates) {
      if (!(element instanceof HTMLElement) || !visible(element) || element.querySelector(":scope > .fa-category-icon")) continue;
      const text = normalizedText(element);
      const icon = iconMap.get(text);
      if (!icon) continue;
      if (Array.from(element.children).some((child) => iconMap.has(normalizedText(child)))) continue;

      const badge = document.createElement("span");
      badge.className = "fa-category-icon";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = icon;
      element.prepend(badge);
      element.classList.add("fa-category-row");
    }
  }

  function labCandidateScore(element) {
    if (!(element instanceof HTMLElement) || !visible(element)) return -1;
    if (element === document.body || element === document.documentElement || element.id === "root") return -1;
    if (element.closest(".fa-parts-panel")) return -1;

    const rect = element.getBoundingClientRect();
    if (rect.width < Math.min(300, innerWidth * .42) || rect.height < 220) return -1;
    if (rect.top < 110) return -1;

    const text = normalizedText(element).slice(0, 700);
    if (/Parts Library|Find a part|Purple Rabbit Chemistry|Blank laboratory loaded/i.test(text) && element.children.length > 5) return -1;

    let score = rect.width * rect.height;
    const signature = `${element.id} ${element.className}`.toLowerCase();
    if (/lab|bench|workspace|stage|canvas|scene/.test(signature)) score *= 4;
    if (element.tagName === "CANVAS" || element.tagName === "SVG") score *= 5;
    if (rect.bottom > innerHeight * .72) score *= 1.35;
    return score;
  }

  function installLabBackground() {
    if (document.querySelector(".fa-lab-background-host")) return true;

    const selector = "canvas, svg, [class*='lab' i], [id*='lab' i], [class*='bench' i], [id*='bench' i], [class*='workspace' i], [id*='workspace' i], [class*='stage' i], [id*='stage' i], [class*='canvas' i], [id*='canvas' i], main, section";
    const candidates = Array.from(document.querySelectorAll(selector));
    candidates.sort((a, b) => labCandidateScore(b) - labCandidateScore(a));
    let target = candidates.find((element) => labCandidateScore(element) > 0);
    if (!target) return false;

    if ((target.tagName === "CANVAS" || target.tagName === "SVG") && target.parentElement) {
      const parent = target.parentElement;
      const rect = parent.getBoundingClientRect();
      if (rect.width >= target.getBoundingClientRect().width * .85 && rect.height >= target.getBoundingClientRect().height * .85) target = parent;
    }

    target.classList.add("fa-lab-background-host");
    return true;
  }

  let scheduled = false;
  function apply() {
    scheduled = false;
    installStyle();
    openPartsLibrary();
    const panel = findPartsPanel();
    if (panel) {
      panel.classList.add("fa-parts-panel");
      addCategoryIcons(panel);
    }
    installLabBackground();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function start() {
    apply();
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(apply, 250);
    window.setTimeout(apply, 900);
    window.setTimeout(apply, 2200);
    window.FuriousAcidStartupUI = { apply, openPartsLibrary, installLabBackground };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
