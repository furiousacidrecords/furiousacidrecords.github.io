import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const url = process.env.PURPLE_AUDIT_URL || "http://127.0.0.1:4173/purple/";
const outputDir = path.resolve("audit-output");
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const findings = [];
const steps = [];
const addFinding = (severity, area, message, detail = "") => findings.push({ severity, area, message, detail });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 PurpleRabbitAudit/1.0"
});
const page = await context.newPage();

page.on("pageerror", error => addFinding("critical", "runtime", "Uncaught page error", error.message));
page.on("console", message => {
  if (message.type() === "error") addFinding("high", "console", "Browser console error", message.text());
});
page.on("requestfailed", request => {
  const detail = `${request.method()} ${request.url()} — ${request.failure()?.errorText || "unknown"}`;
  if (/\.mp4(?:$|\?)/i.test(request.url()) && /ERR_ABORTED/i.test(detail)) addFinding("low", "media", "A video request was aborted", detail);
  else addFinding("high", "network", "Resource failed to load", detail);
});

async function shot(name, health, note) {
  const file = `${String(steps.length + 1).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: path.join(outputDir, file), fullPage: true });
  steps.push({ step: steps.length + 1, name, health, note, screenshot: file });
}

async function clickFirst(patterns) {
  for (const pattern of patterns) {
    const locator = page.getByRole("button", { name: pattern }).first();
    if (await locator.count() && await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
      return true;
    }
  }
  return false;
}

async function createBetaAccess() {
  const gate = page.locator("#fa-beta-access.fa-open");
  if (!(await gate.isVisible().catch(() => false))) return true;
  try {
    await gate.locator('input[name="name"]').fill("Mobile Play Tester");
    await gate.locator('input[name="email"]').fill("mobile-audit@example.com");
    await gate.locator('input[name="consent"]').check();
    await gate.getByRole("button", { name: /create beta access/i }).click();
    await page.waitForFunction(() => document.documentElement.dataset.betaAccess === "ready", null, { timeout: 5000 });
    return true;
  } catch (error) {
    addFinding("critical", "beta access", "Could not enter the simulator through the required signup gate", error.message);
    return false;
  }
}

async function dismissStartup() {
  for (let i = 0; i < 8; i += 1) {
    const clicked = await clickFirst([
      /start/i,
      /continue/i,
      /enter/i,
      /open (?:the )?(?:lab|simulator)/i,
      /skip/i,
      /got it/i,
      /close/i,
      /try lab simulator/i
    ]);
    if (!clicked) break;
  }
}

async function visibleText(pattern) {
  return page.getByText(pattern).first().isVisible().catch(() => false);
}

async function dragBetween(source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) return false;
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  return true;
}

try {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!response || !response.ok()) addFinding("critical", "launch", "Simulator did not return a successful page", `HTTP ${response?.status() ?? "no response"}`);
  await page.waitForTimeout(1800);
  await shot("launch", findings.some(f => f.area === "launch") ? "broken" : "loaded", "Initial phone-sized view before interaction.");

  const accessCreated = await createBetaAccess();
  await page.waitForTimeout(800);
  await shot("beta-access", accessCreated ? "entered" : "blocked", "Filled the temporary browser-pass form and entered the actual simulator.");

  await dismissStartup();
  await page.waitForTimeout(700);
  const appVisible = await page.locator(".workbench, .window-titlebar, #root").first().isVisible().catch(() => false);
  if (!appVisible) addFinding("critical", "startup", "The simulator interface did not become visible after signup", "No workbench, window title bar, or visible app root was found.");
  await shot("startup-cleared", appVisible ? "usable" : "blocked", "Dismissed any additional splash or tutorial overlays.");

  const layout = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    contentHeight: document.documentElement.scrollHeight
  }));
  if (layout.contentWidth > layout.viewportWidth + 3) addFinding("high", "mobile layout", "Page has horizontal overflow on a 390px phone", `${layout.contentWidth}px content inside ${layout.viewportWidth}px viewport`);
  const scrollStart = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, Math.min(500, document.documentElement.scrollHeight)));
  await page.waitForTimeout(200);
  const scrollEnd = await page.evaluate(() => window.scrollY);
  if (layout.contentHeight > layout.viewportHeight + 20 && scrollEnd === scrollStart) addFinding("critical", "scrolling", "Vertical scrolling is blocked despite content extending below the phone", `scrollY remained ${scrollEnd}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("scroll-test", scrollEnd > scrollStart || layout.contentHeight <= layout.viewportHeight + 20 ? "working" : "broken", "Checked page scrolling and horizontal overflow after entering the lab.");

  let openedParts = await clickFirst([/^\+\s*part$/i, /show parts library/i, /parts library/i, /^parts$/i]);
  if (!openedParts && await visibleText(/Parts Library/i)) openedParts = true;
  if (!openedParts) addFinding("critical", "parts library", "Could not open the Parts Library", "No visible + Part, Parts Library, Show Parts Library, or Parts control responded.");
  await page.waitForTimeout(700);
  await shot("parts-library", openedParts ? "opened" : "broken", "Opened the library used to build a scene.");

  const bench = page.locator(".workbench").first();
  const rows = page.locator(".parts-tree .part-row");
  const benchVisible = await bench.isVisible().catch(() => false);
  const rowCount = await rows.count();
  if (!benchVisible) addFinding("critical", "workbench", "No usable workbench was visible", "The expected .workbench surface was absent or hidden.");
  if (!rowCount) addFinding("critical", "parts library", "The Parts Library contained no draggable rows", "No .parts-tree .part-row controls were found after opening the library.");

  let placedPart = false;
  if (benchVisible && rowCount) {
    const before = await page.locator(".workbench .lab-object").count();
    if (await dragBetween(rows.first(), bench)) {
      const after = await page.locator(".workbench .lab-object").count();
      placedPart = after > before;
      if (!placedPart) addFinding("critical", "drag and drop", "Dragging the first library item onto the bench added nothing", `${before} lab objects before, ${after} after`);
    } else {
      addFinding("critical", "drag and drop", "Could not obtain drag coordinates", "The library row or workbench had no measurable box.");
    }
  }
  await shot("place-part", placedPart ? "working" : "broken", "Dragged a real library item to the workbench and checked whether a lab object appeared.");

  let addedChemical = false;
  const vessel = page.locator(".workbench .lab-object.kind-beaker, .workbench .lab-object.kind-flask, .workbench .lab-object.kind-test-tube, .workbench .lab-object.kind-burette, .workbench .lab-object.kind-gas-jar, .workbench .lab-object.kind-evaporating-dish").first();
  const chemicalRows = rows.filter({ hasNot: page.locator(".apparatus-mini") });
  if (await vessel.isVisible().catch(() => false) && await chemicalRows.count()) {
    const beforeText = await vessel.innerText().catch(() => "");
    if (await dragBetween(chemicalRows.first(), vessel)) {
      const afterText = await vessel.innerText().catch(() => "");
      addedChemical = beforeText !== afterText || await vessel.locator(".liquid, .contents, [class*='content']").count() > 0;
      if (!addedChemical) addFinding("critical", "chemicals", "Dropping a chemical on a vessel produced no visible change", "The vessel text and visible contents did not change.");
    }
  } else {
    addFinding("high", "chemicals", "Could not test adding a chemical", "A placed vessel or chemical row was not available after the first drag.");
  }
  await shot("add-chemical", addedChemical ? "working" : "not working", "Dropped a chemical into a vessel and checked for a visible result.");

  const validateClicked = await clickFirst([/validate scene/i, /^validate$/i]);
  if (!validateClicked) addFinding("high", "validation", "Validate Scene was unavailable or unresponsive", "No visible validation control could be activated.");
  await shot("validate", validateClicked ? "responded" : "missing", "Tried the required validation step from the manual.");

  const runClicked = await clickFirst([/^run$/i, /run experiment/i, /start reaction/i]);
  if (!runClicked) addFinding("critical", "simulation", "Run was unavailable or unresponsive", "No visible Run, Run experiment, or Start reaction control could be activated.");
  await page.waitForTimeout(1000);
  await shot("run", runClicked ? "responded" : "broken", "Tried to start the simulation after building the scene.");

  const reportClicked = await clickFirst([/^report$/i, /open report/i, /results/i]);
  if (!reportClicked) addFinding("high", "report", "No usable report or results view opened", "The result-reading step could not be reached.");
  await page.waitForTimeout(600);
  await shot("report", reportClicked ? "opened" : "missing", "Tried to inspect the result after running.");

  const touchTargets = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role='button'], input, select, a"))
    .filter(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 2 && rect.height > 2 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map(element => {
      const rect = element.getBoundingClientRect();
      return { label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("title") || element.tagName).trim().slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) };
    })
    .filter(target => target.width < 44 || target.height < 44));
  if (touchTargets.length) addFinding("medium", "touch targets", `${touchTargets.length} visible controls are smaller than 44×44px`, JSON.stringify(touchTargets.slice(0, 20)));

  const critical = findings.filter(f => f.severity === "critical");
  const report = {
    testedUrl: url,
    viewport: "390×844 iPhone-sized touch context",
    verdict: critical.length ? "DO NOT DEPLOY" : findings.some(f => ["high", "medium"].includes(f.severity)) ? "DEPLOY ONLY AFTER FIXES" : "CORE FLOW PASSED",
    steps,
    findings
  };
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = [
    "# Purple Rabbit mobile play audit",
    "",
    `**Verdict:** ${report.verdict}`,
    "",
    "## Steps",
    ...steps.map(step => `${step.step}. **${step.name} — ${step.health}**: ${step.note} (${step.screenshot})`),
    "",
    "## Findings",
    ...(findings.length ? findings.map((finding, index) => `${index + 1}. **${finding.severity.toUpperCase()} — ${finding.area}:** ${finding.message}${finding.detail ? ` — ${finding.detail}` : ""}`) : ["No failures recorded."])
  ].join("\n");
  await fs.writeFile(path.join(outputDir, "report.md"), `${markdown}\n`);
  console.log(markdown);
  if (critical.length) process.exitCode = 1;
} catch (error) {
  addFinding("critical", "audit", "The play audit itself crashed", error.stack || error.message);
  await fs.writeFile(path.join(outputDir, "report.json"), `${JSON.stringify({ verdict: "DO NOT DEPLOY", steps, findings }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
