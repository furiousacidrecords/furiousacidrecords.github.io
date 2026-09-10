import * as THREE from "three";

const carry = (() => {
  const q = new URLSearchParams(location.search);
  const score = Number(q.get("score") || sessionStorage.getItem("acid-l2-score") || sessionStorage.getItem("acid-l1-score") || 0) || 0;
  const timeSec = Number(q.get("time") || sessionStorage.getItem("acid-l2-time") || 0) || 0;
  const stageQ = q.get("stage") || "mantle";
  return { score, timeSec, stageQ };
})();

const root = document.getElementById("root");
const canvas = document.getElementById("view");
const toastEl = document.getElementById("toast");
const rankEl = document.getElementById("rankName");
const hpFill = document.getElementById("hpFill");
const scoreEl = document.getElementById("scoreVal");
const timeEl = document.getElementById("timeVal");
const depthEl = document.getElementById("depthVal");
const missionsEl = document.getElementById("missions");
const escapeFill = document.getElementById("escapeFill");
const stickEl = document.getElementById("stick");
const stickKnob = stickEl.querySelector("i");
const boostBtn = document.getElementById("boost");
const touchEl = document.getElementById("touch");
const mini = document.getElementById("minimap");
const miniCtx = mini.getContext("2d");
const titleOv = root.querySelector(".acid-title");
const pauseOv = root.querySelector(".acid-pause");
const deadOv = root.querySelector(".acid-dead");
const endOv = root.querySelector(".acid-end");
const titleH1 = titleOv.querySelector("h1");
const titleKicker = titleOv.querySelector(".acid-kicker");
const titleLead = titleOv.querySelector(".acid-lead");
const startBtn = titleOv.querySelector("[data-act=start]");

const RANKS = [
  { min: 0, name: "Ice Fry" },
  { min: 1.6, name: "Ammonia Pup" },
  { min: 2.8, name: "Diamond Maw" },
  { min: 4.4, name: "Mantle King" },
  { min: 6.2, name: "Corebound" },
];

const KINDS = {
  krill: { mass: 0.42, r: 0.42, score: 12, col: "#ff7ab6", layer: [8, 28] },
  minnow: { mass: 0.85, r: 0.7, score: 22, col: "#7dffd4", layer: [0, 22] },
  jelly: { mass: 1.5, r: 1.15, score: 36, col: "#c9f24a", layer: [-18, 12] },
  crab: { mass: 2.3, r: 1.35, score: 50, col: "#e8f4ff", layer: [-40, -6] },
  eel: { mass: 3.6, r: 1.9, score: 80, col: "#3d8bff", layer: [-58, -22] },
  levi: { mass: 7.4, r: 3.4, score: 140, col: "#10222a", layer: [-68, -40] },
};

function makeAudio() {
  let ctx = null, drone = null, droneG = null;
  const unlock = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    droneG = ctx.createGain();
    droneG.gain.value = 0.0;
    droneG.connect(ctx.destination);
    drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 46;
    drone.connect(droneG);
    drone.start();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const blip = (f, t, type = "sine", g = 0.08) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    gain.gain.setValueAtTime(g, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + t);
    o.connect(gain);
    gain.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + t);
  };
  return {
    unlock,
    eat() { blip(420, 0.08, "sine", 0.09); setTimeout(() => blip(640, 0.1, "sine", 0.07), 50); },
    hurt() { blip(90, 0.22, "sawtooth", 0.07); },
    boost() { blip(180, 0.12, "square", 0.04); },
    warn() { blip(220, 0.18, "triangle", 0.06); blip(110, 0.3, "sine", 0.05); },
    swell(v) { if (droneG && ctx) droneG.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.25); },
    holeDrone(r) {
      if (!drone || !ctx) return;
      drone.frequency.setTargetAtTime(38 + Math.max(0, 40 - r), ctx.currentTime, 0.2);
      droneG.gain.setTargetAtTime(0.04 + Math.max(0, (18 - r) * 0.004), ctx.currentTime, 0.3);
    },
  };
}
const sfx = makeAudio();

function paintTex(draw, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function krillDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "#ff7ab6";
  g.beginPath();
  g.ellipse(0, 4, 22, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#7dffd4";
  g.beginPath();
  g.ellipse(10, 2, 10, 7, 0.3, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#ffd0ea";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-16, 0);
  g.quadraticCurveTo(-28, -16, -22, -28);
  g.moveTo(-16, 6);
  g.quadraticCurveTo(-30, 8, -26, 20);
  g.stroke();
  g.fillStyle = "#041018";
  g.beginPath();
  g.arc(14, -2, 3, 0, Math.PI * 2);
  g.fill();
}

function minnowDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "#7dffd4";
  g.beginPath();
  g.ellipse(0, 0, 34, 16, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c9f24a";
  g.beginPath();
  g.ellipse(4, 6, 18, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#3aa890";
  g.beginPath();
  g.moveTo(-32, 0);
  g.lineTo(-48, -14);
  g.lineTo(-48, 14);
  g.closePath();
  g.fill();
  g.fillStyle = "#041018";
  g.beginPath();
  g.arc(18, -4, 3.5, 0, Math.PI * 2);
  g.fill();
}

function jellyDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "rgba(201,242,74,0.85)";
  g.beginPath();
  g.ellipse(0, -8, 28, 22, 0, Math.PI, 0);
  g.ellipse(0, -2, 28, 10, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = "rgba(125,255,212,0.7)";
  g.beginPath();
  g.ellipse(0, -10, 14, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(201,242,74,0.8)";
  g.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(i * 7, 6);
    g.quadraticCurveTo(i * 7 + 6, 28, i * 6, 48);
    g.stroke();
  }
}

function crabDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "#d7f0ff";
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * 26, y = Math.sin(a) * 20;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = "#7dffd4";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "#f5e000";
  g.beginPath();
  g.arc(0, 0, 6, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#b8d4e8";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(18, -8);
  g.lineTo(40, -22);
  g.lineTo(34, -4);
  g.moveTo(-18, -8);
  g.lineTo(-40, -22);
  g.lineTo(-34, -4);
  g.stroke();
}

function eelDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.strokeStyle = "#3d8bff";
  g.lineWidth = 14;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(40, 0);
  g.quadraticCurveTo(10, -22, -10, 0);
  g.quadraticCurveTo(-30, 20, -48, 4);
  g.stroke();
  g.strokeStyle = "#7dffd4";
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = "#f5e000";
  g.beginPath();
  g.arc(32, -4, 4, 0, Math.PI * 2);
  g.fill();
}

function leviDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "#16303a";
  g.beginPath();
  g.ellipse(0, 4, 50, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#7dffd4";
  g.beginPath();
  g.moveTo(-10, -16);
  g.lineTo(0, -34);
  g.lineTo(10, -16);
  g.closePath();
  g.fill();
  g.fillStyle = "#b44cff";
  g.beginPath();
  g.arc(28, -2, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#041018";
  g.beginPath();
  g.arc(28, -2, 2.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#e8f4ff";
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(-8 + i * 10, -8);
    g.lineTo(-4 + i * 10, -20);
    g.lineTo(2 + i * 10, -8);
    g.fill();
  }
}

function gemDraw(g, s) {
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = "#e8f4ff";
  g.beginPath();
  g.moveTo(0, -28);
  g.lineTo(18, -8);
  g.lineTo(12, 22);
  g.lineTo(-12, 22);
  g.lineTo(-18, -8);
  g.closePath();
  g.fill();
  g.fillStyle = "#7dffd4";
  g.beginPath();
  g.moveTo(0, -28);
  g.lineTo(8, -6);
  g.lineTo(0, 8);
  g.lineTo(-8, -6);
  g.closePath();
  g.fill();
  g.fillStyle = "#f5e000";
  g.beginPath();
  g.arc(0, 0, 5, 0, Math.PI * 2);
  g.fill();
}

const tex = {};
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

function cropSquare(tex, zoom = 1) {
  const img = tex.image;
  if (!img) return tex;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const side = Math.min(img.width, img.height) / zoom;
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  g.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function loadTex(url) {
  return new Promise((res, rej) => {
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    }, undefined, () => rej(new Error(url)));
  });
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
renderer.setClearColor(0x041018, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const camera = new THREE.PerspectiveCamera(62, 1, 0.35, 280);
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _quat = new THREE.Quaternion();

let scene = new THREE.Scene();
let mantleBuilt = false, rainBuilt = false, holeBuilt = false;
let mantleRoot, rainRoot, holeRoot;
let iceCeiling, coreWell, holeSphere, diskMesh, spiralMesh, photonRing;
let starsMantle, starsHole, diskPts, streakPts;
let ventLights = [];

const player = {
  group: new THREE.Group(),
  yaw: 0,
  pitch: -0.12,
  vx: 0, vy: 0, vz: 0,
  speed: 0,
  mass: 1,
  hp: 100,
  iframes: 0,
  boostT: 0,
  stam: 1,
  biteT: 0,
  shake: 0,
};
let rabbitSprite = null;
let bodyMesh = null;
let tailMesh = null;

const keys = new Set();
let keyOverride = null;
let stickX = 0, stickY = 0, stickId = null;
let boostHeld = false;
let phase = "title";
let stage = "mantle";
let score = carry.score;
let timeSec = 0;
let toastT = 0;
let last = 0;
let running = true;
let eaten = { krill: 0, minnow: 0, jelly: 0, crab: 0, eel: 0, gem: 0 };
let almost = 0;
let escape = 0;
let swallow = 0;
let holeGM = 520;
let holeRs = 3.8;
let particles = [];
let creatures = [];
let gems = [];
let shards = [];
let bubbles = [];
let camFov = 62;

function held() {
  return keyOverride ?? keys;
}

function heading(out) {
  const cp = Math.cos(player.pitch);
  out.set(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
  return out;
}

function toast(msg, t = 1.6) {
  toastEl.textContent = msg;
  toastEl.classList.add("is-on");
  toastT = t;
}

function formatTime(t) {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function rankName() {
  let n = RANKS[0].name;
  for (const r of RANKS) if (player.mass >= r.min) n = r.name;
  return n;
}

function playerRadius() {
  return 0.72 * Math.pow(player.mass, 0.42);
}

function setPhase(p) {
  phase = p;
  root.dataset.phase = p === "holeplay" ? "play" : p;
  titleOv.hidden = p !== "title";
  pauseOv.hidden = p !== "pause";
  deadOv.hidden = p !== "dead";
  endOv.hidden = p !== "end";
  const play = p === "play" || p === "holeplay";
  touchEl.classList.toggle("is-on", play && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
}

function setStage(s) {
  stage = s;
  root.dataset.stage = s === "hole" ? "hole" : "mantle";
  sessionStorage.setItem("acid-stage", s);
}

function hud() {
  rankEl.textContent = rankName();
  hpFill.style.transform = `scaleX(${Math.max(0, player.hp / 100)})`;
  scoreEl.textContent = String(score);
  timeEl.textContent = formatTime(timeSec);
  if (stage === "mantle") {
    const km = Math.max(0, Math.round((22 - player.group.position.y) * 3.2));
    depthEl.textContent = `${km} km`;
  } else if (stage === "rain") {
    depthEl.textContent = "RAIN";
  } else {
    depthEl.textContent = "HOLE";
  }
  escapeFill.style.width = `${Math.round(escape * 100)}%`;
  const need = [
    { on: eaten.krill >= 10, t: `Krill ${Math.min(10, eaten.krill)}/10` },
    { on: eaten.jelly >= 5, t: `Jellies ${Math.min(5, eaten.jelly)}/5` },
    { on: eaten.crab >= 3, t: `Crabs ${Math.min(3, eaten.crab)}/3` },
    { on: player.mass >= 4.8, t: player.mass >= 4.8 ? "Core unlocked" : "Grow to Mantle King" },
    { on: stage !== "mantle", t: "Enter the well" },
  ];
  if (stage === "rain") {
    need.length = 0;
    need.push({ on: eaten.gem >= 16, t: `Diamonds ${Math.min(16, eaten.gem)}/16` });
    need.push({ on: false, t: "Dodge the ice. Fall to the crack." });
  }
  if (stage === "hole") {
    need.length = 0;
    need.push({ on: false, t: almost === 0 ? "Burn out" : almost === 1 ? "Horizon moved" : "You were so close" });
  }
  missionsEl.innerHTML = need.map((m) => `<li class="${m.on ? "is-on" : ""}"><i></i>${m.t}</li>`).join("");
}

function burst(x, y, z, col, n = 10) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      vz: (Math.random() - 0.5) * 8,
      life: 0.45 + Math.random() * 0.3,
      col,
      r: 0.08 + Math.random() * 0.1,
    });
  }
}

function makeSprite(map, w, h) {
  const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, alphaTest: 0.12 });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(w, h, 1);
  return sp;
}

function buildPlayer(rabbitMap) {
  const g = player.group;
  g.clear();
  const mat = new THREE.MeshLambertMaterial({ color: 0xb08cff });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mat);
  torso.scale.set(0.75, 0.58, 2.05);
  g.add(torso);
  bodyMesh = torso;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.15, 7), mat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -1.45;
  g.add(tail);
  tailMesh = tail;
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), mat);
  fin.position.set(0, 0.42, -0.15);
  g.add(fin);
  rabbitSprite = makeSprite(rabbitMap, 0.85, 1.08);
  rabbitSprite.position.set(0, 0.38, 0.95);
  g.add(rabbitSprite);
  scene.add(g);
}

function spawnCreature(kind, x, y, z) {
  const def = KINDS[kind];
  const map = tex[kind];
  const sp = makeSprite(map, def.r * 2.4, def.r * 2.1);
  sp.position.set(x, y, z);
  const c = {
    kind, mass: def.mass * (0.85 + Math.random() * 0.3), r: def.r,
    x, y, z,
    yaw: Math.random() * Math.PI * 2,
    spd: 1.6 + Math.random() * 2.2,
    turn: (Math.random() - 0.5) * 0.6,
    alive: true,
    sprite: sp,
    school: 0,
  };
  if (kind === "eel" || kind === "levi") c.spd *= 0.85;
  if (kind === "levi") c.spd = 3.2;
  creatures.push(c);
  scene.add(sp);
  return c;
}

function scatterMantle() {
  for (const c of creatures) scene.remove(c.sprite);
  creatures.length = 0;
  const add = (kind, n) => {
    const [y0, y1] = KINDS[kind].layer;
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;
      const y = y0 + Math.random() * (y1 - y0);
      spawnCreature(kind, x, y, z);
    }
  };
  add("krill", 14);
  add("minnow", 10);
  add("jelly", 7);
  add("crab", 9);
  add("eel", 8);
  add("levi", 6);
  spawnCreature("levi", 4, -62, 4);
  spawnCreature("levi", -6, -60, -5);
}

function buildMantle() {
  if (mantleRoot) scene.remove(mantleRoot);
  mantleRoot = new THREE.Group();
  scene.add(mantleRoot);
  scene.background = new THREE.Color(0x082028);
  scene.fog = new THREE.FogExp2(0x082028, 0.018);
  const hemi = new THREE.HemisphereLight(0x7ec8c4, 0x1a1030, 1.15);
  mantleRoot.add(hemi);
  const dir = new THREE.DirectionalLight(0xb8fff0, 0.45);
  dir.position.set(12, 40, 8);
  mantleRoot.add(dir);
  const coreL = new THREE.PointLight(0xb44cff, 4, 40);
  coreL.position.set(0, -66, 0);
  mantleRoot.add(coreL);

  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(90, 32),
    new THREE.MeshLambertMaterial({ color: 0xbfeff2, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 38;
  mantleRoot.add(ceil);
  iceCeiling = ceil;
  for (let i = 0; i < 18; i++) {
    const ic = new THREE.Mesh(
      new THREE.ConeGeometry(0.6 + Math.random(), 3 + Math.random() * 5, 5),
      new THREE.MeshLambertMaterial({ color: 0xd7fbff, transparent: true, opacity: 0.7 })
    );
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 70;
    ic.position.set(Math.cos(a) * r, 36.5, Math.sin(a) * r);
    ic.rotation.x = Math.PI;
    mantleRoot.add(ic);
  }

  const well = new THREE.Mesh(
    new THREE.TorusGeometry(6.5, 1.1, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x140818 })
  );
  well.rotation.x = Math.PI / 2;
  well.position.set(0, -66, 0);
  mantleRoot.add(well);
  const wellDark = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 24),
    new THREE.MeshBasicMaterial({ color: 0x020104, side: THREE.DoubleSide })
  );
  wellDark.rotation.x = Math.PI / 2;
  wellDark.position.set(0, -66.2, 0);
  mantleRoot.add(wellDark);
  coreWell = well;

  const starGeo = new THREE.BufferGeometry();
  const st = [];
  for (let i = 0; i < 260; i++) {
    st.push((Math.random() - 0.5) * 160, -20 + Math.random() * 50, (Math.random() - 0.5) * 160);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(st, 3));
  starsMantle = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x7dffd4, size: 0.18, transparent: true, opacity: 0.55 }));
  mantleRoot.add(starsMantle);

  ventLights = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const v = new THREE.PointLight(0x7dffd4, 1.6, 18);
    v.position.set(Math.cos(a) * 28, -8 - (i % 3) * 10, Math.sin(a) * 28);
    mantleRoot.add(v);
    ventLights.push(v);
  }
  mantleBuilt = true;
}

function buildRain() {
  if (rainRoot) scene.remove(rainRoot);
  rainRoot = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x1a1030, 1.4);
  rainRoot.add(hemi);
  const l = new THREE.PointLight(0x7dffd4, 6, 80);
  l.position.set(0, 20, 0);
  rainRoot.add(l);
  const l2 = new THREE.PointLight(0xf5e000, 3, 50);
  l2.position.set(0, -20, 0);
  rainRoot.add(l2);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x1c4a58, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 160, 20, 1, true), wallMat);
  tube.position.y = 0;
  rainRoot.add(tube);
  rainBuilt = true;
}

function buildHole() {
  if (holeRoot) scene.remove(holeRoot);
  holeRoot = new THREE.Group();
  const amb = new THREE.AmbientLight(0x221008, 0.8);
  holeRoot.add(amb);

  const starGeo = new THREE.BufferGeometry();
  const st = [];
  for (let i = 0; i < 1400; i++) {
    const r = 40 + Math.random() * 90;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    st.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.55, r * Math.sin(ph) * Math.sin(th));
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(st, 3));
  starsHole = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22 }));
  holeRoot.add(starsHole);

  holeSphere = new THREE.Mesh(
    new THREE.SphereGeometry(holeRs, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  holeRoot.add(holeSphere);

  const diskMat = new THREE.MeshBasicMaterial({
    map: tex.disk,
    color: 0xffc090,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  diskMesh = new THREE.Mesh(new THREE.CircleGeometry(18, 64), diskMat);
  diskMesh.rotation.x = Math.PI / 2.25;
  holeRoot.add(diskMesh);
  const glow = new THREE.PointLight(0xff5a1a, 12, 70);
  holeRoot.add(glow);
  const glow2 = new THREE.PointLight(0xffc878, 5, 40);
  glow2.position.set(6, 1, 0);
  holeRoot.add(glow2);

  if (tex.spiral) {
    spiralMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 16),
      new THREE.MeshBasicMaterial({ map: tex.spiral, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    spiralMesh.rotation.x = -0.72;
    spiralMesh.position.set(0, -1.2, 0);
    holeRoot.add(spiralMesh);
  }

  photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(holeRs * 1.55, 0.12, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffc878 })
  );
  photonRing.rotation.x = Math.PI / 2.15;
  holeRoot.add(photonRing);

  const dPos = [];
  const dCol = [];
  const col = new THREE.Color();
  for (let i = 0; i < 900; i++) {
    const rad = holeRs * 1.6 + Math.random() * 14;
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.7 * (rad / 8);
    dPos.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
    col.setHSL(0.05 + Math.random() * 0.04, 0.95, 0.45 + Math.random() * 0.25);
    dCol.push(col.r, col.g, col.b);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.Float32BufferAttribute(dPos, 3));
  dg.setAttribute("color", new THREE.Float32BufferAttribute(dCol, 3));
  diskPts = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.9 }));
  holeRoot.add(diskPts);

  const sPos = [];
  for (let i = 0; i < 500; i++) {
    const rad = 6 + Math.random() * 28;
    const a = Math.random() * Math.PI * 2;
    sPos.push(Math.cos(a) * rad, (Math.random() - 0.5) * 10, Math.sin(a) * rad);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sPos, 3));
  streakPts = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf2f2f2, size: 0.16, transparent: true, opacity: 0.7 }));
  holeRoot.add(streakPts);

  holeBuilt = true;
}

function showOnly(which) {
  if (mantleRoot) mantleRoot.visible = which === "mantle";
  if (rainRoot) rainRoot.visible = which === "rain";
  if (holeRoot) holeRoot.visible = which === "hole";
  if (which === "hole") {
    scene.background = new THREE.Color(0x000000);
    scene.fog = null;
    sfx.swell(0.04);
  } else if (which === "rain") {
    scene.background = new THREE.Color(0x06141c);
    scene.fog = new THREE.FogExp2(0x06141c, 0.02);
    if (!scene.children.includes(rainRoot) && rainRoot) scene.add(rainRoot);
  } else {
    scene.background = new THREE.Color(0x082028);
    scene.fog = new THREE.FogExp2(0x082028, 0.018);
    sfx.swell(0.0);
  }
}

function resetPlayerMantle() {
  player.group.position.set(0, 18, 32);
  player.yaw = 0;
  player.pitch = -0.18;
  player.vx = player.vy = player.vz = 0;
  player.mass = 1;
  player.hp = 100;
  player.iframes = 0;
  player.boostT = 0;
  player.stam = 1;
  player.speed = 0;
  eaten.krill = eaten.minnow = eaten.jelly = eaten.crab = eaten.eel = eaten.gem = 0;
  almost = 0;
  escape = 0;
  swallow = 0;
  scaleBody();
}

function scaleBody() {
  const s = Math.pow(player.mass, 0.38);
  player.group.scale.setScalar(s);
}

function enterRain() {
  if (!rainBuilt) buildRain();
  if (rainRoot && !scene.children.includes(rainRoot)) scene.add(rainRoot);
  setStage("rain");
  showOnly("rain");
  for (const c of creatures) { c.sprite.visible = false; c.alive = false; }
  gems.forEach((g) => scene.remove(g.sprite));
  gems.length = 0;
  for (let i = 0; i < 40; i++) {
    const sp = makeSprite(tex.gem, 0.9, 1.15);
    const g = {
      sprite: sp,
      x: (Math.random() - 0.5) * 18,
      y: -40 + Math.random() * 110,
      z: (Math.random() - 0.5) * 18,
      vy: -6 - Math.random() * 10,
      got: false,
      spin: Math.random() * 6,
    };
    sp.position.set(g.x, g.y, g.z);
    scene.add(sp);
    gems.push(g);
  }
  for (let i = 0; i < 10; i++) {
    const sp = makeSprite(tex.gem, 1.1, 1.35);
    const g = {
      sprite: sp,
      x: (Math.random() - 0.5) * 8,
      y: 48 + Math.random() * 16,
      z: (Math.random() - 0.5) * 8,
      vy: -7 - Math.random() * 6,
      got: false,
      spin: Math.random() * 6,
    };
    sp.position.set(g.x, g.y, g.z);
    scene.add(sp);
    gems.push(g);
  }
  shards.forEach((s) => scene.remove(s.mesh));
  shards.length = 0;
  for (let i = 0; i < 18; i++) {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 1.1, 5),
      new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.9 })
    );
    mesh.rotation.x = Math.PI;
    const s = {
      mesh,
      x: (Math.random() - 0.5) * 18,
      y: 20 + Math.random() * 70,
      z: (Math.random() - 0.5) * 18,
      vy: -14 - Math.random() * 10,
    };
    mesh.position.set(s.x, s.y, s.z);
    scene.add(mesh);
    shards.push(s);
  }
  player.group.position.set(0, 62, 0);
  player.yaw = 0;
  player.pitch = -0.55;
  player.vx = player.vy = player.vz = 0;
  titleKicker.textContent = "Furious Acid · Level 4 of 5";
  titleH1.textContent = "Diamond Rain";
  titleLead.textContent = "Carbon raining through the ice giant. Catch sixteen while ice tries to cut you. The crack at the bottom is the last door.";
  startBtn.textContent = "Fall in";
  setPhase("title");
  toast("Diamond rain.");
  hud();
}

function enterHole() {
  if (!holeBuilt) buildHole();
  if (holeRoot && !scene.children.includes(holeRoot)) scene.add(holeRoot);
  setStage("hole");
  showOnly("hole");
  gems.forEach((g) => { scene.remove(g.sprite); g.got = true; });
  shards.forEach((s) => scene.remove(s.mesh));
  shards.length = 0;
  player.group.position.set(0, 2.8, 16);
  player.yaw = 0;
  player.pitch = 0.05;
  player.vx = 4.8;
  player.vy = 0.2;
  player.vz = 0;
  escape = 0.12;
  almost = 0;
  swallow = 0;
  holeGM = 520;
  holeRs = 3.8;
  camFov = 62;
  titleKicker.textContent = "Furious Acid · Level 5 of 5 — last";
  titleH1.textContent = "Event Horizon";
  titleLead.textContent = "You will almost leave. You will not. That's the last one.";
  startBtn.textContent = "Fall in";
  setPhase("title");
  toast("The core collapsed.");
  hud();
}

function startStagePlay() {
  sfx.unlock();
  setPhase("play");
  root.dataset.phase = "play";
  titleOv.hidden = true;
  heading(_fwd);
  const p = player.group.position;
  const dist = stage === "hole" ? 21 : stage === "rain" ? 13.5 : 10.5;
  const h = stage === "hole" ? 5.8 : stage === "rain" ? 3.4 : 2.6;
  camera.position.copy(p).addScaledVector(_up, h).addScaledVector(_fwd, -dist);
  camera.lookAt(_tmp.copy(p).addScaledVector(_fwd, 7).addScaledVector(_up, 0.45));
}

function input() {
  const k = held();
  let steer = 0, pitch = 0, thrust = 0;
  if (k.has("KeyA") || k.has("ArrowLeft")) steer += 1;
  if (k.has("KeyD") || k.has("ArrowRight")) steer -= 1;
  if (k.has("KeyW") || k.has("ArrowUp")) thrust += 1;
  if (k.has("KeyS") || k.has("ArrowDown")) thrust -= 0.55;
  if (k.has("KeyR")) pitch += 1;
  if (k.has("KeyF")) pitch -= 1;
  const sm = Math.hypot(stickX, stickY);
  if (sm > 0.12) {
    steer += -stickX * 1.4;
    pitch += -stickY * 1.2;
    thrust += Math.min(1, sm);
  }
  const boosting = (boostHeld || k.has("Space") || k.has("ShiftLeft")) && player.stam > 0.08;
  return { steer, pitch, thrust: Math.max(-1, Math.min(1, thrust)), boosting };
}

function applyMove(dt) {
  const inp = input();
  const turn = stage === "hole" ? 1.7 : 2.15;
  player.yaw += inp.steer * turn * dt;
  player.pitch += inp.pitch * 1.5 * dt;
  player.pitch = Math.max(-1.15, Math.min(1.05, player.pitch));
  heading(_fwd);
  _right.set(_fwd.z, 0, -_fwd.x).normalize();

  const boost = inp.boosting && player.stam > 0;
  if (boost) {
    player.stam = Math.max(0, player.stam - dt * 0.45);
    player.boostT = 0.15;
  } else {
    player.stam = Math.min(1, player.stam + dt * 0.22);
  }
  const accel = (stage === "hole" ? 18 : 26) * (boost ? 1.7 : 1);
  player.vx += _fwd.x * inp.thrust * accel * dt;
  player.vy += _fwd.y * inp.thrust * accel * dt;
  player.vz += _fwd.z * inp.thrust * accel * dt;

  if (stage === "mantle") {
    player.vy -= 2.8 * dt;
    const drag = Math.pow(0.22, dt);
    player.vx *= drag;
    player.vy *= drag;
    player.vz *= drag;
  } else if (stage === "rain") {
    player.vy -= 12.8 * dt;
    const drag = Math.pow(0.28, dt);
    player.vx *= drag;
    player.vy *= drag;
    player.vz *= drag;
  } else {
    const p = player.group.position;
    const r = Math.max(0.4, p.length());
    const g = holeGM / (r * r);
    player.vx -= (p.x / r) * g * dt;
    player.vy -= (p.y / r) * g * dt;
    player.vz -= (p.z / r) * g * dt;
  }

  const cap = (stage === "hole" ? 22 : 16) * (boost ? 1.25 : 1);
  const spd = Math.hypot(player.vx, player.vy, player.vz);
  if (spd > cap) {
    const k = cap / spd;
    player.vx *= k; player.vy *= k; player.vz *= k;
  }
  player.speed = Math.hypot(player.vx, player.vy, player.vz);
  player.group.position.x += player.vx * dt;
  player.group.position.y += player.vy * dt;
  player.group.position.z += player.vz * dt;

  if (stage === "mantle") {
    const p = player.group.position;
    p.y = Math.min(35.2, p.y);
    const xz = Math.hypot(p.x, p.z);
    if (xz > 78) {
      p.x *= 78 / xz;
      p.z *= 78 / xz;
      player.vx *= -0.3;
      player.vz *= -0.3;
    }
    if (p.y < -69) p.y = -69;
  }
  if (stage === "rain") {
    const p = player.group.position;
    const xz = Math.hypot(p.x, p.z);
    if (xz > 11.2) {
      p.x *= 11.2 / xz;
      p.z *= 11.2 / xz;
    }
    p.y = Math.min(72, p.y);
  }
}

function orientPlayer(t) {
  heading(_fwd);
  const p = player.group.position;
  _tmp.copy(p).add(_fwd);
  player.group.lookAt(_tmp);
  if (tailMesh) tailMesh.rotation.z = Math.sin(t * 10 + player.speed) * 0.35;
  if (rabbitSprite) rabbitSprite.position.y = 0.42 + Math.sin(t * 6) * 0.03;
}

function updateCreatures(dt) {
  const p = player.group.position;
  const pr = playerRadius();
  for (const c of creatures) {
    if (!c.alive) continue;
    c.yaw += c.turn * dt;
    if (Math.random() < 0.01) c.turn = (Math.random() - 0.5) * 0.8;
    const bigger = c.mass > player.mass * 1.08;
    const smaller = c.mass < player.mass * 0.9;
    const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    if (bigger && dist < 36) {
      c.yaw = Math.atan2(-dx, -dz);
      c.spd = c.kind === "levi" ? 6.4 : 5.1;
    } else if (smaller && dist < 14) {
      c.yaw = Math.atan2(dx, dz);
    }
    const fx = -Math.sin(c.yaw);
    const fz = -Math.cos(c.yaw);
    c.x += fx * c.spd * dt;
    c.z += fz * c.spd * dt;
    c.y += Math.sin(timeSec * 1.3 + c.x) * 0.4 * dt;
    if (Math.hypot(c.x, c.z) > 76) {
      c.x *= 0.96; c.z *= 0.96; c.yaw += Math.PI;
    }
    const [y0, y1] = KINDS[c.kind].layer;
    if (c.y > y1) c.y = y1;
    if (c.y < y0) c.y = y0;
    c.sprite.position.set(c.x, c.y, c.z);
    const hitR = pr + c.r;
    if (dist < hitR) {
      if (smaller) {
        c.alive = false;
        c.sprite.visible = false;
        player.mass += c.mass * 0.13;
        score += KINDS[c.kind].score;
        eaten[c.kind] = (eaten[c.kind] || 0) + 1;
        player.biteT = 0.18;
        sfx.eat();
        burst(c.x, c.y, c.z, KINDS[c.kind].col, 14);
        scaleBody();
        toast(`+${KINDS[c.kind].score}`);
        if (player.hp < 100) player.hp = Math.min(100, player.hp + 4);
      } else if (bigger && player.iframes <= 0) {
        player.hp -= 36;
        player.iframes = 0.85;
        player.shake = 0.4;
        player.mass = Math.max(1, player.mass * 0.92);
        sfx.hurt();
        toast("Too big.");
        scaleBody();
        const k = 10 / dist;
        player.vx -= dx * k;
        player.vy -= dy * k;
        player.vz -= dz * k;
        if (player.hp <= 0) {
          document.getElementById("deadStats").textContent = `Score ${score} · ${rankName()}`;
          setPhase("dead");
        }
      }
    }
  }
}

function updateGems(dt) {
  const p = player.group.position;
  const pr = playerRadius();
  for (const g of gems) {
    if (g.got) continue;
    g.y += g.vy * dt;
    g.spin += dt * 3;
    if (g.y < -48) {
      g.got = true;
      g.sprite.visible = false;
      continue;
    }
    g.sprite.position.set(g.x, g.y, g.z);
    g.sprite.material.rotation = g.spin;
    const d = Math.hypot(p.x - g.x, p.y - g.y, p.z - g.z);
    if (d < pr + 0.8) {
      g.got = true;
      g.sprite.visible = false;
      eaten.gem++;
      score += 30;
      player.mass += 0.08;
      sfx.eat();
      burst(g.x, g.y, g.z, "#e8f4ff", 12);
      scaleBody();
      toast("+30 diamond");
    }
  }
}

function updateMantle(dt) {
  applyMove(dt);
  orientPlayer(timeSec);
  updateCreatures(dt);
  const p = player.group.position;
  const depth = THREE.MathUtils.clamp((-p.y + 8) / 70, 0, 1);
  if (scene.fog) {
    scene.fog.color.setRGB(0.03 + 0.12 * (1 - depth), 0.1 + 0.14 * (1 - depth), 0.14 + 0.08 * (1 - depth));
    scene.fog.density = 0.014 + depth * 0.028;
    scene.background.copy(scene.fog.color).multiplyScalar(0.55);
  }
  if (Math.random() < 0.4) {
    bubbles.push({
      x: p.x + (Math.random() - 0.5) * 40,
      y: -60 + Math.random() * 80,
      z: p.z + (Math.random() - 0.5) * 40,
      vy: 2 + Math.random() * 3,
      life: 3,
      r: 0.05 + Math.random() * 0.08,
    });
  }
  const wellDist = Math.hypot(p.x, p.y + 66, p.z);
  if (player.mass >= 4.8 && wellDist < 8.5) {
    sessionStorage.setItem("acid-l3-score", String(score));
    enterRain();
    return;
  }
  if (wellDist < 10 && player.mass < 4.8) {
    toast("Too small. The well will swallow you first.");
    player.vy += 8 * dt;
  }
}

function updateRain(dt) {
  applyMove(dt);
  orientPlayer(timeSec);
  updateGems(dt);
  const p = player.group.position;
  const pr = playerRadius();
  for (const s of shards) {
    s.y += s.vy * dt;
    if (s.y < -48) {
      s.y = 74;
      s.x = (Math.random() - 0.5) * 18;
      s.z = (Math.random() - 0.5) * 18;
    }
    s.mesh.position.set(s.x, s.y, s.z);
    const d = Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z);
    if (d < pr + 0.55 && player.iframes <= 0) {
      player.hp -= 22;
      player.iframes = 0.7;
      player.shake = 0.35;
      sfx.hurt();
      toast("Ice.");
      if (player.hp <= 0) {
        document.getElementById("deadStats").textContent = `Score ${score} · diamonds ${eaten.gem}`;
        setPhase("dead");
      }
    }
  }
  if (p.y < -36 && eaten.gem >= 16) {
    sessionStorage.setItem("acid-l4-score", String(score));
    enterHole();
    return;
  }
  if (p.y < -36 && eaten.gem < 16) {
    toast(`Need diamonds. ${eaten.gem}/16`);
    p.y = -34;
    player.vy = 6;
  }
}

function updateHole(dt) {
  if (swallow > 0) {
    swallow += dt;
    holeRs += dt * 2.4;
    holeSphere.scale.setScalar(1 + swallow * 0.8);
    camFov = Math.min(110, camFov + dt * 18);
    camera.fov = camFov;
    camera.updateProjectionMatrix();
    player.group.position.multiplyScalar(1 - dt * 0.55);
    sfx.holeDrone(0.5);
    if (swallow > 3.2) {
      document.getElementById("endStats").textContent =
        `Score ${score} · Time ${formatTime(timeSec)} · You were never going to win.`;
      setPhase("end");
      localStorage.setItem("acid-l5-seen", "1");
    }
    return;
  }
  applyMove(dt);
  orientPlayer(timeSec);
  const p = player.group.position;
  const r = Math.max(0.2, p.length());
  const vr = (p.x * player.vx + p.y * player.vy + p.z * player.vz) / r;
  const want = THREE.MathUtils.clamp((r - 10) / 28, 0, 1) * THREE.MathUtils.clamp(vr / 6, 0, 1);
  escape += (want - escape) * Math.min(1, dt * 0.85);
  if (escape > 0.97) escape = 0.97;
  sfx.holeDrone(r);

  if (diskPts) {
    const arr = diskPts.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = arr[i], z = arr[i + 2];
      const rad = Math.hypot(x, z);
      const a = Math.atan2(z, x) + dt * (3.2 / Math.max(2, rad));
      arr[i] = Math.cos(a) * rad;
      arr[i + 2] = Math.sin(a) * rad;
    }
    diskPts.geometry.attributes.position.needsUpdate = true;
  }
  if (streakPts) {
    const arr = streakPts.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      let x = arr[i], y = arr[i + 1], z = arr[i + 2];
      const rad = Math.max(0.4, Math.hypot(x, z));
      const a = Math.atan2(z, x) + dt * (5 / rad);
      const nr = rad - dt * 3.5;
      if (nr < holeRs + 0.4) {
        const R = 8 + Math.random() * 24;
        const A = Math.random() * Math.PI * 2;
        arr[i] = Math.cos(A) * R;
        arr[i + 1] = (Math.random() - 0.5) * 8;
        arr[i + 2] = Math.sin(A) * R;
      } else {
        arr[i] = Math.cos(a) * nr;
        arr[i + 1] = y * 0.995;
        arr[i + 2] = Math.sin(a) * nr;
      }
    }
    streakPts.geometry.attributes.position.needsUpdate = true;
  }
  if (diskMesh) diskMesh.rotation.z += dt * 0.15;
  if (spiralMesh) spiralMesh.rotation.z -= dt * 0.22;
  if (photonRing) photonRing.rotation.z += dt * 0.4;
  holeSphere.scale.setScalar(1);

  if (escape > 0.88 && almost === 0) {
    almost = 1;
    holeGM *= 1.65;
    escape = 0.42;
    player.shake = 0.7;
    sfx.warn();
    toast("Almost. The well noticed you.");
  } else if (escape > 0.91 && almost === 1) {
    almost = 2;
    holeRs *= 1.35;
    holeSphere.scale.setScalar(1.35);
    holeGM *= 1.4;
    escape = 0.33;
    player.shake = 0.8;
    sfx.warn();
    toast("The horizon moved.");
  } else if (escape > 0.93 && almost === 2) {
    almost = 3;
    swallow = 0.01;
    sfx.warn();
    toast("You were so close.");
  }
  if (r < holeRs + 0.85) {
    swallow = 0.01;
    toast("In.");
  }
}

function updateCam(dt) {
  heading(_fwd);
  const p = player.group.position;
  const dist = stage === "hole" ? 21 : stage === "rain" ? 13.5 : 10.5;
  const h = stage === "hole" ? 5.8 : stage === "rain" ? 3.4 : 2.6;
  _desired.copy(p).addScaledVector(_up, h).addScaledVector(_fwd, -dist);
  const k = 1 - Math.exp(-5.2 * dt);
  camera.position.lerp(_desired, k);
  _look.copy(p).addScaledVector(_fwd, 7).addScaledVector(_up, 0.45);
  camera.lookAt(_look);
  if (player.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * player.shake;
    camera.position.y += (Math.random() - 0.5) * player.shake;
    player.shake = Math.max(0, player.shake - dt);
  }
}

function drawMinimap() {
  const w = mini.width, h = mini.height;
  miniCtx.clearRect(0, 0, w, h);
  miniCtx.fillStyle = "rgba(4,16,24,0.2)";
  miniCtx.fillRect(0, 0, w, h);
  if (stage === "hole") return;
  const p = player.group.position;
  if (stage === "mantle") {
    miniCtx.fillStyle = "#7dffd4";
    const px = (p.x / 80) * 0.5 + 0.5;
    const pz = (p.z / 80) * 0.5 + 0.5;
    const py = 1 - (p.y + 70) / 110;
    miniCtx.beginPath();
    miniCtx.arc(px * w, pz * (h * 0.55), 3, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.fillStyle = "#b44cff";
    miniCtx.fillRect(w / 2 - 2, h * 0.55 + py * h * 0.4, 4, 4);
    miniCtx.fillStyle = "#f5e000";
    miniCtx.fillRect(w / 2 - 3, h - 8, 6, 6);
  } else {
    miniCtx.fillStyle = "#e8f4ff";
    const py = 1 - (p.y + 48) / 120;
    miniCtx.fillRect(w / 2 - 3, py * h, 6, 6);
  }
}

let pPool = [];
function drawParticles(dt) {
  if (!pPool.length) {
    const geo = new THREE.SphereGeometry(1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.visible = false;
      scene.add(m);
      pPool.push(m);
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.z += q.vz * dt;
    if (q.life <= 0) particles.splice(i, 1);
  }
  for (let i = 0; i < pPool.length; i++) {
    const m = pPool[i];
    const q = particles[i];
    if (!q) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(q.x, q.y, q.z);
    m.scale.setScalar(q.r);
    m.material.color.set(q.col);
  }
}

function resize() {
  const w = root.clientWidth || innerWidth;
  const h = Math.max(1, root.clientHeight || innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function frame(now) {
  if (!running) return;
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) toastEl.classList.remove("is-on");
  }
  if (player.iframes > 0) player.iframes -= dt;
  if (phase === "play") {
    timeSec += dt;
    if (stage === "mantle") updateMantle(dt);
    else if (stage === "rain") updateRain(dt);
    else updateHole(dt);
    if (phase === "play") {
      updateCam(dt);
      hud();
    }
  } else if (phase === "title") {
    const t = now / 1000;
    if (stage === "hole") {
      camera.position.set(Math.sin(t * 0.18) * 24, 9, Math.cos(t * 0.18) * 24);
      camera.lookAt(0, 0, 0);
    } else {
      player.yaw += dt * 0.15;
      heading(_fwd);
      const p = player.group.position;
      camera.position.set(p.x + 6, p.y + 3.2, p.z + 12);
      camera.lookAt(p.x, p.y + 0.4, p.z);
    }
  }
  drawParticles(dt);
  drawMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function wire() {
  addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Escape") {
      if (phase === "play") setPhase("pause");
      else if (phase === "pause") { setPhase("play"); last = performance.now(); }
    }
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => keys.clear());
  stickEl.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    const r = stickEl.getBoundingClientRect();
    stickX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.5)));
    stickY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.5)));
    stickKnob.style.transform = `translate(${stickX * 22}px, ${stickY * 22}px)`;
  });
  stickEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== stickId) return;
    const r = stickEl.getBoundingClientRect();
    stickX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.5)));
    stickY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.5)));
    stickKnob.style.transform = `translate(${stickX * 22}px, ${stickY * 22}px)`;
  });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    stickX = stickY = 0;
    stickKnob.style.transform = "";
  };
  stickEl.addEventListener("pointerup", endStick);
  stickEl.addEventListener("pointercancel", endStick);
  boostBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); boostHeld = true; sfx.boost(); });
  boostBtn.addEventListener("pointerup", () => { boostHeld = false; });
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "start") startStagePlay();
    if (act === "resume") { setPhase("play"); last = performance.now(); }
    if (act === "restart") {
      gems.forEach((g) => scene.remove(g.sprite));
      gems.length = 0;
      shards.forEach((s) => scene.remove(s.mesh));
      shards.length = 0;
      setStage("mantle");
      showOnly("mantle");
      scatterMantle();
      resetPlayerMantle();
      timeSec = 0;
      titleKicker.textContent = "Furious Acid · Level 3 of 5";
      titleH1.textContent = "Uranus Mantle";
      titleLead.textContent = "Same rabbit. Superionic ocean of water, ammonia, methane. Eat smaller, flee bigger, grow.";
      startBtn.textContent = "Dive him in";
      setPhase("title");
      hud();
    }
    if (act === "hole-again") {
      enterHole();
      startStagePlay();
    }
  });
  addEventListener("resize", resize);
  window.__controlsTest = {
    getYaw: () => player.yaw,
    getSpeed: () => player.speed,
    setKeys(codes) { keyOverride = codes.length ? new Set(codes) : null; },
  };
}

async function boot() {
  tex.krill = paintTex(krillDraw);
  tex.minnow = paintTex(minnowDraw);
  tex.jelly = paintTex(jellyDraw);
  tex.crab = paintTex(crabDraw);
  tex.eel = paintTex(eelDraw);
  tex.levi = paintTex(leviDraw);
  tex.gem = paintTex(gemDraw);
  let rabbitMap;
  try {
    rabbitMap = await loadTex("../sprites/hero.png");
    rabbitMap.magFilter = THREE.LinearFilter;
  } catch {
    rabbitMap = paintTex((g, s) => {
      g.fillStyle = "#b08cff";
      g.beginPath();
      g.ellipse(s / 2, s * 0.6, s * 0.28, s * 0.32, 0, 0, Math.PI * 2);
      g.fill();
    });
  }
  try { tex.disk = cropSquare(await loadTex("./hole-disk.jpg"), 1.35); } catch { tex.disk = null; }
  try { tex.spiral = cropSquare(await loadTex("./hole-spiral.jpg"), 1.15); } catch { tex.spiral = null; }

  buildMantle();
  buildPlayer(rabbitMap);
  scatterMantle();
  resetPlayerMantle();
  wire();
  resize();
  hud();

  if (carry.stageQ === "rain") enterRain();
  else if (carry.stageQ === "hole") enterHole();
  else {
    setStage("mantle");
    showOnly("mantle");
  }
  requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  root.appendChild(document.createTextNode(String(err)));
});
