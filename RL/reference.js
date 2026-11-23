(() => {
  const link = document.getElementById("lab-reference-link");
  const sheet = document.getElementById("lab-reference");
  const frame = document.getElementById("lab-reference-frame");
  const grip = sheet.querySelector(".reference-grip");

  link.addEventListener("click", (event) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (new URLSearchParams(location.search).get("guide") === "1" && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage("rabbit:open-charts", location.origin);
    } else if (typeof sheet.showModal === "function") {
      event.preventDefault();
      if (!frame.hasAttribute("src")) frame.src = "/rabbitchemistry/?view=charts#flask-chart";
      sheet.showModal();
    }
  });

  let startY;
  grip.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.target.closest("button")) return;
    startY = event.clientY;
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener("pointerup", (event) => {
    if (startY !== undefined && event.clientY - startY > 48) sheet.close();
    startY = undefined;
  });
  grip.addEventListener("pointercancel", () => { startY = undefined; });
  sheet.addEventListener("close", () => link.focus({preventScroll: true}));
})();
