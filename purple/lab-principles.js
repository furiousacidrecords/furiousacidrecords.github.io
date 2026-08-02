(() => {
  "use strict";

  const current = document.currentScript;
  const base = new URL("./", current && current.src ? current.src : location.href);
  const partUrls = [1, 2, 3, 4, 5].map((number) =>
    new URL(`realtime-lab/part-${number}.txt?v=20260802-1`, base).href
  );

  const loadingStyle = document.createElement("style");
  loadingStyle.id = "fa-realtime-loader-style";
  loadingStyle.textContent = `
    #fa-realtime-loader{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#f5f2f8;font-family:Arial,sans-serif;color:#24152e}
    #fa-realtime-loader>div{width:min(88vw,420px);padding:24px;border:2px solid #6012a9;border-radius:18px;background:#fff;box-shadow:0 18px 50px #32104733;text-align:center}
    #fa-realtime-loader strong{display:block;font-size:20px;margin-bottom:8px;color:#5e0ca5}
    #fa-realtime-loader span{display:block;font-size:14px;line-height:1.45}
    #fa-realtime-loader .bar{height:8px;margin-top:18px;border-radius:999px;background:#e7d9f3;overflow:hidden}
    #fa-realtime-loader .bar::after{content:"";display:block;width:45%;height:100%;border-radius:inherit;background:#7b16cf;animation:fa-load 1s ease-in-out infinite alternate}
    @keyframes fa-load{from{transform:translateX(-20%)}to{transform:translateX(145%)}}
  `;
  document.head.appendChild(loadingStyle);

  const loader = document.createElement("div");
  loader.id = "fa-realtime-loader";
  loader.innerHTML = `<div><strong>Opening the real-time laboratory</strong><span>Loading the apparatus and calculation engine…</span><div class="bar"></div></div>`;
  document.body.appendChild(loader);

  const showError = (error) => {
    console.error("Purple Rabbit real-time lab failed to load", error);
    const box = loader.querySelector("div");
    if (box) box.innerHTML = `<strong>Laboratory failed to load</strong><span>Refresh the page once. The old atom display has not been restored.</span>`;
  };

  const decodeGzip = async (base64) => {
    if (!("DecompressionStream" in window)) {
      throw new Error("This browser does not support the required gzip decoder.");
    }
    const binary = atob(base64.replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  };

  Promise.all(
    partUrls.map(async (url) => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
      return response.text();
    })
  )
    .then((parts) => decodeGzip(parts.join("")))
    .then((source) => {
      const runtime = document.createElement("script");
      runtime.id = "fa-realtime-runtime";
      runtime.textContent = `${source}\n//# sourceURL=purple-rabbit-realtime-lab.js`;
      document.head.appendChild(runtime);
      loader.remove();
      loadingStyle.remove();
    })
    .catch(showError);
})();