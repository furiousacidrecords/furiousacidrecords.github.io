(() => {
  const launch = document.getElementById("launch-lab");
  const frame = document.getElementById("running-lab");
  const glassware = document.getElementById("flask-chart");

  launch.addEventListener("click", (event) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!frame.hasAttribute("src")) frame.src = launch.getAttribute("href") + "?guide=1";
    launch.hidden = true;
    frame.hidden = false;
    document.querySelector(".rc-tools").hidden = true;
    frame.focus({preventScroll: true});
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data !== "rabbit:open-charts") return;
    if (location.hash !== "#flask-chart") location.hash = "flask-chart";
    glassware.scrollIntoView();
    glassware.focus({preventScroll: true});
  });
})();
