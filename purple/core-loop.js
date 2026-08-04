(() => {
  "use strict";

  if (window.FuriousAcidCoreLoop) return;

  const STYLE_ID = "fa-core-loop-style";
  const VESSEL_SELECTOR = [
    ".lab-object.kind-beaker",
    ".lab-object.kind-flask",
    ".lab-object.kind-test-tube",
    ".lab-object.kind-burette",
    ".lab-object.kind-gas-jar",
    ".lab-object.kind-evaporating-dish"
  ].join(",");
  const DRAG_THRESHOLD = 9;
  let libraryDrag = null;
  let benchDrag = null;
  let programmaticClick = false;
  let suppressClickUntil = 0;

  try {
    localStorage.setItem("purple-rabbit-phone-tutorial-v1", "complete");
  } catch {}

  function isDirectPointer(event) {
    return event.pointerType !== "mouse" && event.isPrimary !== false;
  }

  function pointInside(rect, x, y, padding = 0) {
    return x >= rect.left - padding && x <= rect.right + padding && y >= rect.top - padding && y <= rect.bottom + padding;
  }

  function vesselAtPoint(x, y, excluded) {
    return Array.from(document.querySelectorAll(VESSEL_SELECTOR))
      .filter((element) => element !== excluded)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          inside: pointInside(rect, x, y, 22),
          distance: Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2))
        };
      })
      .filter((candidate) => candidate.inside || candidate.distance < 94)
      .sort((a, b) => Number(b.inside) - Number(a.inside) || a.distance - b.distance)[0]?.element || null;
  }

  function clearTarget() {
    document.querySelectorAll(".fa-core-drop-target").forEach((element) => element.classList.remove("fa-core-drop-target"));
  }

  function markTarget(x, y, excluded) {
    clearTarget();
    const target = vesselAtPoint(x, y, excluded);
    if (target) target.classList.add("fa-core-drop-target");
    return target;
  }

  function makeGhost(row) {
    const ghost = document.createElement("div");
    ghost.className = "fa-core-drag-ghost";
    ghost.textContent = (row.textContent || "Part").replace(/\s+/g, " ").trim();
    document.body.appendChild(ghost);
    return ghost;
  }

  function moveGhost(ghost, x, y) {
    if (!ghost) return;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  }

  function dispatchClick(element, x, y) {
    if (!element) return;
    programmaticClick = true;
    element.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    }));
    programmaticClick = false;
  }

  function finishLibraryDrag(event) {
    const drag = libraryDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    libraryDrag = null;

    if (!drag.moved) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickUntil = performance.now() + 650;
    drag.ghost?.remove();
    clearTarget();
    document.body.classList.remove("fa-core-library-dragging");

    programmaticClick = true;
    drag.row.click();
    programmaticClick = false;

    requestAnimationFrame(() => {
      const bench = document.querySelector(".workbench");
      if (!bench) return;
      const target = drag.kind === "substance" ? vesselAtPoint(event.clientX, event.clientY) : null;
      dispatchClick(target || bench, event.clientX, event.clientY);
    });
  }

  function cancelLibraryDrag(event) {
    if (!libraryDrag || (event && libraryDrag.pointerId !== event.pointerId)) return;
    libraryDrag.ghost?.remove();
    libraryDrag = null;
    clearTarget();
    document.body.classList.remove("fa-core-library-dragging");
  }

  function rewriteInstructions(root = document) {
    const scope = root || document;
    if (!scope) return;
    const guide = scope.querySelector?.(".mobile-touch-guide");
    if (guide && !guide.classList.contains("armed")) {
      const copy = guide.classList.contains("active")
        ? "MOVE THE OBJECT · RELEASE TO PLACE"
        : "Drag any object with one finger · release to place";
      if (guide.textContent !== copy) guide.textContent = copy;
    }

    const hint = scope.querySelector?.(".library-hint");
    if (hint) {
      const copy = "Drag a part onto the bench. Drop a chemical on a vessel; drop equipment on an empty spot.";
      if (hint.textContent !== copy) hint.textContent = copy;
    }

    document.querySelectorAll(".help-body li, .status-bar span").forEach((element) => {
      if (!/double-tap/i.test(element.textContent || "")) return;
      const copy = element.matches("li")
        ? "On a phone, drag any object with one finger and release it where you want it."
        : "Phone controls ready · drag with one finger and release to place.";
      if (element.textContent !== copy) element.textContent = copy;
    });
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @media (pointer: coarse), (max-width: 760px) {
        .parts-tree .part-row { touch-action: pan-y; -webkit-user-drag: none; }
        .lab-object { touch-action: none; }
      }
      .fa-core-drag-ghost {
        position: fixed;
        z-index: 2147482000;
        max-width: min(240px, 72vw);
        transform: translate(-50%, -120%);
        pointer-events: none;
        overflow: hidden;
        padding: 7px 10px;
        border: 2px solid #6f00ff;
        border-radius: 7px;
        color: #35104e;
        background: #fff;
        box-shadow: 0 8px 24px #21063855;
        text-overflow: ellipsis;
        white-space: nowrap;
        font: 800 12px/1.2 Tahoma, "Segoe UI", sans-serif;
      }
      .workbench .lab-object.fa-core-drop-target {
        z-index: 12;
        outline: 4px solid #fdf200;
        box-shadow: 0 0 0 7px #6f00ffb8, 0 0 26px #6f00ff9c;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("pointerdown", (event) => {
    if (!isDirectPointer(event)) return;

    const row = event.target.closest?.(".parts-tree .part-row");
    if (row) {
      libraryDrag = {
        row,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        cancelled: false,
        ghost: null,
        kind: row.querySelector(".apparatus-mini") ? "apparatus" : "substance"
      };
      return;
    }

    const object = event.target.closest?.(".lab-object");
    if (object) benchDrag = { pointerId: event.pointerId, source: object };
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (libraryDrag?.pointerId === event.pointerId) {
      const dx = event.clientX - libraryDrag.startX;
      const dy = event.clientY - libraryDrag.startY;
      const distance = Math.hypot(dx, dy);

      if (!libraryDrag.moved && !libraryDrag.cancelled && distance >= DRAG_THRESHOLD) {
        if (Math.abs(dy) > Math.abs(dx) * 1.25) {
          libraryDrag.cancelled = true;
          return;
        }
        libraryDrag.moved = true;
        libraryDrag.ghost = makeGhost(libraryDrag.row);
        document.body.classList.add("fa-core-library-dragging");
      }

      if (libraryDrag.moved) {
        event.preventDefault();
        event.stopPropagation();
        moveGhost(libraryDrag.ghost, event.clientX, event.clientY);
        if (libraryDrag.kind === "substance") markTarget(event.clientX, event.clientY);
      }
      return;
    }

    if (benchDrag?.pointerId === event.pointerId) {
      const sourceIsBottle = benchDrag.source.classList.contains("kind-bottle");
      if (sourceIsBottle) markTarget(event.clientX, event.clientY, benchDrag.source);
    }
  }, { capture: true, passive: false });

  document.addEventListener("pointerup", (event) => {
    if (libraryDrag?.pointerId === event.pointerId) {
      finishLibraryDrag(event);
      return;
    }
    if (benchDrag?.pointerId === event.pointerId) {
      benchDrag = null;
      requestAnimationFrame(clearTarget);
    }
  }, true);

  document.addEventListener("pointercancel", (event) => {
    cancelLibraryDrag(event);
    if (benchDrag?.pointerId === event.pointerId) benchDrag = null;
    clearTarget();
  }, true);

  document.addEventListener("click", (event) => {
    if (!programmaticClick && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  installStyle();
  rewriteInstructions();
  const observer = new MutationObserver(() => rewriteInstructions());
  observer.observe(document.body, { childList: true, subtree: true });

  window.FuriousAcidCoreLoop = {
    apply: rewriteInstructions,
    vesselAtPoint
  };
})();
