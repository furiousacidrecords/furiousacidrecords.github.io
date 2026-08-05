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
const cdp = await context.newCDPSession(page);

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

async function clickButton(pattern) {
  const locator = page.getByRole("button", { name: pattern }).first();
  if (!(await locator.count()) || !(await locator.isVisible().catch(() => false))) return false;
  await locator.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(350);
  return true;
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

async function touchDrag(source, targetX, targetY) {
  await source.scrollIntoViewIfNeeded().catch(() => {});
  const box = await source.boundingBox();
  if (!box) return false;
  const startX = Math.round(box.x + box.width / 2);
  const startY = Math.round(box.y + box.height / 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: startY, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  for (let i = 1; i <= 14; i += 1) {
    const x = Math.round(startX + (targetX - startX) * (i / 14));
    const y = Math.round(startY + (targetY - startY) * (i / 14));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
    await page.waitForTimeout(18);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(900);
  return true;
}

function moved(before, after) {
  return before && after && (Math.abs(before.x - after.x) > 6 || Math.abs(before.y - after.y) > 6);
}

try {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (!response || !response.ok()) addFinding("critical", "launch", "Simulator did not return a successful page", `HTTP ${response?.status() ?? "no response"}`);
  await page.waitForTimeout(1800);
  await shot("launch", "loaded", "Initial iPhone-sized view.");

  const accessCreated = await createBetaAccess();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape").catch(() => {});
  await shot("entered-lab", accessCreated ? "entered" : "blocked", "Created a temporary browser pass and entered the real simulator.");

  const bench = page.locator(".workbench").first();
  const appVisible = await bench.isVisible().catch(() => false);
  if (!appVisible) addFinding("critical", "startup", "The workbench was not usable after signup", "No visible .workbench was found.");

  const layout = await page.evaluate(() => ({ viewportWidth: document.documentElement.clientWidth, contentWidth: document.documentElement.scrollWidth, viewportHeight: innerHeight, contentHeight: document.documentElement.scrollHeight }));
  if (layout.contentWidth > layout.viewportWidth + 3) addFinding("high", "mobile layout", "The simulator overflows horizontally", `${layout.contentWidth}px content inside ${layout.viewportWidth}px viewport`);
  if (layout.contentHeight > layout.viewportHeight + 20) {
    const before = await page.evaluate(() => scrollY);
    await page.evaluate(() => scrollTo(0, 500));
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => scrollY);
    if (after === before) addFinding("critical", "scrolling", "Vertical scrolling is blocked", `${layout.contentHeight}px content inside ${layout.viewportHeight}px viewport`);
    await page.evaluate(() => scrollTo(0, 0));
  }
  await shot("phone-layout", findings.some(f => f.area === "mobile layout" || f.area === "scrolling") ? "glitchy" : "fits", "Checked width and vertical movement on a 390×844 screen.");

  const openedParts = await clickButton(/^\+\s*part$/i) || await clickButton(/show parts library/i);
  await page.waitForTimeout(650);
  const panel = page.locator(".fa-parts-panel").first();
  const panelVisible = await panel.isVisible().catch(() => false);
  if (!openedParts && !panelVisible) addFinding("critical", "parts library", "The Parts Library would not open", "The + Part and View menu paths did not expose it.");
  if (panelVisible) {
    const panelBox = await panel.boundingBox();
    const benchBox = await bench.boundingBox();
    if (panelBox && benchBox) {
      const overlapWidth = Math.max(0, Math.min(panelBox.x + panelBox.width, benchBox.x + benchBox.width) - Math.max(panelBox.x, benchBox.x));
      const overlapHeight = Math.max(0, Math.min(panelBox.y + panelBox.height, benchBox.y + benchBox.height) - Math.max(panelBox.y, benchBox.y));
      const overlap = overlapWidth * overlapHeight;
      const benchArea = Math.max(1, benchBox.width * benchBox.height);
      if (overlap / benchArea > 0.7 || panelBox.width > 360) {
        addFinding("critical", "parts library", "Opening the Parts Library hides the bench on a phone", "The source list and drop target cannot be seen together, so drag-to-bench is not a usable phone interaction.");
      }
    }
  }
  await shot("parts-library", panelVisible ? "opens but blocks bench" : "broken", "Opened the parts panel and checked whether the bench remained reachable.");

  if (panelVisible) {
    const close = panel.getByRole("button", { name: /×|close/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
    else await clickButton(/hide parts library/i);
    await page.waitForTimeout(600);
  }
  await page.keyboard.press("Escape").catch(() => {});

  const beaker = page.locator(".workbench .lab-object.kind-beaker").first();
  let movedBeaker = false;
  if (await beaker.isVisible().catch(() => false)) {
    const before = await beaker.boundingBox();
    if (before) {
      await touchDrag(beaker, Math.min(350, before.x + before.width / 2 + 45), Math.min(730, before.y + before.height / 2 + 35));
      const after = await beaker.boundingBox();
      movedBeaker = moved(before, after);
      if (!movedBeaker) addFinding("critical", "object movement", "The beaker did not move after a one-finger drag", `Before ${JSON.stringify(before)}; after ${JSON.stringify(after)}`);
    }
  } else addFinding("critical", "object movement", "No visible beaker was available to drag", "The default scene did not expose a testable vessel.");
  await shot("move-beaker", movedBeaker ? "working" : "broken", "Dragged the existing beaker with a real touch sequence.");

  const bottle = page.locator(".workbench .lab-object.kind-bottle").first();
  let poured = false;
  if (await bottle.isVisible().catch(() => false) && await beaker.isVisible().catch(() => false)) {
    const target = await beaker.boundingBox();
    const beforeText = await beaker.innerText().catch(() => "");
    if (target) {
      await touchDrag(bottle, Math.round(target.x + target.width / 2), Math.round(target.y + target.height / 2));
      const afterText = await beaker.innerText().catch(() => "");
      poured = beforeText !== afterText;
      if (!poured) addFinding("critical", "chemical transfer", "Dropping the bottle onto the beaker caused no visible quantity or pH change", `Beaker remained: ${afterText}`);
    }
  } else addFinding("critical", "chemical transfer", "The default bottle-to-beaker action could not be attempted", "Bottle or beaker was missing or hidden.");
  await shot("pour-chemical", poured ? "working" : "broken", "Dragged the hydrochloric-acid bottle onto the beaker and checked its displayed contents.");

  const range = page.locator('input[type="range"]').first();
  let doseChanged = false;
  if (await range.isVisible().catch(() => false)) {
    const values = await range.evaluate(element => ({ before: Number(element.value), min: Number(element.min || 0), max: Number(element.max || 100) }));
    const next = Math.min(values.max, Math.max(values.min, values.before + Math.max(1, (values.max - values.min) / 5)));
    await range.evaluate((element, value) => {
      element.value = String(value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, next);
    await page.waitForTimeout(350);
    const after = Number(await range.inputValue());
    doseChanged = after !== values.before;
    if (!doseChanged) addFinding("high", "dose control", "The dose slider did not retain a changed value", `${values.before} before, ${after} after`);
  } else addFinding("high", "dose control", "No visible dose slider was found", "The real-time control could not be tested.");
  await shot("dose-control", doseChanged ? "working" : "broken", "Changed the dose control and checked that the value updated.");

  const paused = await clickButton(/^pause$/i);
  let playAppeared = false;
  if (paused) playAppeared = await page.getByRole("button", { name: /^play$/i }).first().isVisible().catch(() => false);
  if (!paused || !playAppeared) addFinding("high", "playback", "Pause did not clearly switch to Play", "The running state is not reliably visible or toggleable.");
  if (playAppeared) await clickButton(/^play$/i);
  await shot("pause-play", paused && playAppeared ? "working" : "glitchy", "Paused and resumed the real-time simulator.");

  const blank = page.getByRole("button", { name: /blank laboratory/i }).first();
  const titration = page.getByRole("button", { name: /titration/i }).first();
  let scenesChanged = false;
  if (await blank.isVisible().catch(() => false) && await titration.isVisible().catch(() => false)) {
    const before = await page.locator(".workbench .lab-object").count();
    await blank.click();
    await page.waitForTimeout(650);
    const blankCount = await page.locator(".workbench .lab-object").count();
    await titration.click();
    await page.waitForTimeout(650);
    const restored = await page.locator(".workbench .lab-object").count();
    scenesChanged = blankCount !== before || restored !== blankCount;
    if (!scenesChanged) addFinding("high", "scenes", "Scene tabs did not visibly change the laboratory", `${before} objects before, ${blankCount} blank, ${restored} restored`);
  } else addFinding("high", "scenes", "The Blank laboratory and Titration tabs were not both reachable", "Scene switching could not be completed.");
  await shot("scene-switching", scenesChanged ? "working" : "broken", "Switched to Blank laboratory and back to Titration.");

  const touchTargets = await page.evaluate(() => Array.from(document.querySelectorAll("button, [role='button'], input, select, a"))
    .filter(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 2 && rect.height > 2 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map(element => {
      const rect = element.getBoundingClientRect();
      return { label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("title") || element.tagName).trim().slice(0, 70), width: Math.round(rect.width), height: Math.round(rect.height) };
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
