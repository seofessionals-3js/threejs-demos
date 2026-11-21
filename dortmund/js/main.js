// Wohnungsfinder Dortmund: the whole city as one three.js map.
// The overview (ground, water, green, streets, every building as a flat block) is one file. Coming closer, the
// tiles around the view load their full detail in a worker and the buildings rise. Twelve invented projects stand on
// the map as violet models with a pin; a click opens their card, "Entdecken" leads to the page of the project.
import * as THREE from 'three';
import { loadPack } from './data.js';
import { low, mid, governor, visible, isTouch } from './quality.js';
import { projectGeometry, projectMaterial } from './models.js';

THREE.ColorManagement.enabled = false;                    // flat colours, written exactly as they should appear
const Q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OBJ = document.body.dataset.page === 'objekt';       // objekt.html: one project in its neighbourhood, the camera circles it
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

const COL = {
  bg: 0xcdd3d6, ground: 0xd4d4d2, off: 0xc6cbcd, wood: 0x86b27a, green: 0x9fc68f, water: 0x6fa6bc, far: 0xa7a8a8,
  road: [0x5d5f62, 0x66686b, 0x6f7174, 0x7b7d80, 0x888a8d], small: 0xa2a3a5, minor: 0x8f9193, rail: 0x77797c, bound: 0x55575b,
};

// ------------------------------------------------------------------------------------------------ text
const I18N = {
  de: { menu: 'Menü', district: 'Stadtteil', contact: 'Kontakt', projects: 'Projekte', projectsSub: 'Zwölf Neubauprojekte in Dortmund. Wählen Sie eines, die Karte fliegt hin.',
    invented: 'Alle Projekte, Preise und Daten sind erfunden.', price: 'Kaufpreis', size: 'Wohnfläche', ready: 'Fertigstellung', discover: 'Entdecken',
    contactTitle: 'Rückruf anfordern', contactText: 'Das ist eine Demo: Hier stünde das Kontaktformular des Maklers. Es wird nichts gesendet.', contactCta: 'Verstanden',
    hint: isTouch ? 'Karte ziehen · zoomen' : 'Karte bewegen', loading: 'Lädt', all: 'Ganz Dortmund', city: 'City',
    details: 'Datenblatt', units: 'Einheiten', floors: 'Geschosse', mix: 'Wohnungsmix', features: 'Besonderheiten', call: 'Rückruf anfordern', back: 'Zurück zur Karte',
    maps: 'Google Maps', spin: 'Drehen', inside: 'Innen ansehen · folgt', hintObj: 'Ziehen zum Drehen' },
  en: { menu: 'Menu', district: 'District', contact: 'Reach out', projects: 'Projects', projectsSub: 'Twelve new developments in Dortmund. Pick one and the map flies there.',
    invented: 'All projects, prices and dates are invented.', price: 'Price', size: 'Living area', ready: 'Handover', discover: 'Discover',
    contactTitle: 'Request a call', contactText: 'This is a demo: the agent\'s contact form would be here. Nothing is sent.', contactCta: 'Got it',
    hint: isTouch ? 'Drag the map · pinch to zoom' : 'Move around', loading: 'Loading', all: 'All of Dortmund', city: 'City centre',
    details: 'Data sheet', units: 'Units', floors: 'Storeys', mix: 'Unit mix', features: 'Notable features', call: 'Request a call', back: 'Return to map',
    maps: 'Google Maps', spin: 'Rotate', inside: 'View inside · soon', hintObj: 'Drag to rotate' },
};
let lang = (Q.get('lang') || localStorage.getItem('wf-lang') || 'de') === 'en' ? 'en' : 'de';
const T = (k) => I18N[lang][k] ?? k;
const pf = (p, k) => (lang === 'en' && p.en && p.en[k]) || p[k];

// ------------------------------------------------------------------------------------------------ renderer
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(COL.bg);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(COL.bg, 1000, 50000);
const camera = new THREE.PerspectiveCamera(34, 1, 10, 100000);
let VW = 1, VH = 1, dirty = true;
const invalidate = () => { dirty = true; };
function resize() {
  VW = canvas.clientWidth || innerWidth; VH = canvas.clientHeight || innerHeight;
  renderer.setSize(VW, VH, false);
  camera.aspect = VW / VH; camera.updateProjectionMatrix();
  invalidate();
}
const gov = governor({ apply: (dpr) => { renderer.setPixelRatio(dpr); resize(); } });
{ // the URL bar of a phone sliding in and out must not reallocate the canvas (its CSS height is 100lvh and stays)
  let w = innerWidth, h = innerHeight, t = 0;
  addEventListener('resize', () => {
    if (isTouch && innerWidth === w && Math.abs(innerHeight - h) < 130) return;
    clearTimeout(t); t = setTimeout(() => { w = innerWidth; h = innerHeight; gov.hold(600); gov.refit(); resize(); }, 80);
  }, { passive: true });
}
document.addEventListener('visibilitychange', invalidate);

// ------------------------------------------------------------------------------------------------ camera
// The camera looks at a point on the ground. Far away it looks almost straight down, close up it leans over.
const cam = { x: -300, z: -700, dist: 9000, az: 0 };
let goalDist = cam.dist, anchor = null, vel = { x: 0, z: 0 }, fly = null, B = { hx: 13000, hz: 11500 };
const tiltOf = (d) => THREE.MathUtils.degToRad(OBJ ? lerp(66, 52, smooth(Math.log(300), Math.log(1500), Math.log(d))) : lerp(58, 27, smooth(Math.log(450), Math.log(11000), Math.log(d))));
const maxDist = () => { if (OBJ) return 1700; const k = 2 * Math.tan(THREE.MathUtils.degToRad(17)); return Math.min(21000 / (k * Math.max(1, camera.aspect)), low ? 19000 : 34000); };
const MIN_DIST = OBJ ? 230 : 260;
let shift = { x: 0, y: 0 }, spin = true, spinHold = 0;           // objekt.html: where the model sits on screen, and its slow turn
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function placeCamera() {
  const t = tiltOf(cam.dist), s = Math.sin(t), c = Math.cos(t);
  camera.position.set(cam.x + cam.dist * s * Math.sin(cam.az), cam.dist * c, cam.z + cam.dist * s * Math.cos(cam.az));
  camera.lookAt(cam.x, 0, cam.z);
  camera.near = Math.max(6, cam.dist * 0.04); camera.far = cam.dist * 7 + 9000;
  if (shift.x || shift.y) camera.setViewOffset(VW, VH, shift.x, shift.y, VW, VH); else if (camera.view) camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  scene.fog.near = cam.dist * 1.7; scene.fog.far = cam.dist * 5.5 + 5000;
}
// the point of the ground under a screen position (null above the horizon)
function groundAt(sx, sy, out = hit) {
  ndc.set(sx / VW * 2 - 1, -(sy / VH) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(plane, out);
}
function bound() {
  cam.x = clamp(cam.x, -B.hx + 400, B.hx - 400); cam.z = clamp(cam.z, -B.hz + 400, B.hz - 400);
  cam.dist = clamp(cam.dist, MIN_DIST, maxDist()); goalDist = clamp(goalDist, MIN_DIST, maxDist());
}
function flyTo(to, dur = 1.5) {
  if (REDUCED) dur = 0.01;
  let az = to.az ?? cam.az; while (az - cam.az > Math.PI) az -= Math.PI * 2; while (az - cam.az < -Math.PI) az += Math.PI * 2;
  fly = { from: { ...cam }, to: { x: to.x ?? cam.x, z: to.z ?? cam.z, dist: clamp(to.dist ?? cam.dist, MIN_DIST, maxDist()), az }, t: 0, dur };
  vel.x = vel.z = 0; anchor = null;
}
const stopFly = () => { if (fly) { fly = null; goalDist = cam.dist; } };
function stepCamera(dt) {
  let moving = false;
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur);
    const k = ease(fly.t), f = fly.from, t = fly.to;
    // rise a little in the middle of a long flight, like a camera crane
    const far = Math.hypot(t.x - f.x, t.z - f.z), lift = 1 + Math.min(0.9, far / 9000) * Math.sin(Math.PI * k) * 0.55;
    cam.x = lerp(f.x, t.x, k); cam.z = lerp(f.z, t.z, k); cam.az = lerp(f.az, t.az, k);
    cam.dist = Math.exp(lerp(Math.log(f.dist), Math.log(t.dist), k)) * lift;
    goalDist = t.dist;
    if (fly.t >= 1) { cam.dist = t.dist; fly = null; }
    moving = true;
  } else {
    const lg = Math.log(goalDist / cam.dist);
    if (Math.abs(lg) > 0.0015) {
      placeCamera();
      const a = anchor && groundAt(anchor.x, anchor.y, new THREE.Vector3());
      cam.dist *= Math.exp(lg * (1 - Math.exp(-dt * 11)));
      if (a) { placeCamera(); const b = groundAt(anchor.x, anchor.y); if (b && a.distanceTo(b) < cam.dist * 2) { cam.x += a.x - b.x; cam.z += a.z - b.z; } }
      moving = true;
    } else if (cam.dist !== goalDist) { cam.dist = goalDist; moving = true; }
    if (OBJ && spin && !REDUCED && !ptr.size && performance.now() > spinHold) { cam.az += dt * 0.11; moving = true; }
    if (Math.abs(vel.x) + Math.abs(vel.z) > 2) {
      cam.x += vel.x * dt; cam.z += vel.z * dt;
      const d = Math.exp(-dt * 4.2); vel.x *= d; vel.z *= d; moving = true;
    }
  }
  if (moving) { bound(); placeCamera(); }
  return moving;
}

// ------------------------------------------------------------------------------------------------ input
const ptr = new Map();
let moved = 0, downAt = 0, lastTap = 0, pinch = null, rotating = false;
const interacted = () => { $('hint').classList.add('off'); spinHold = performance.now() + 3500; };
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
  stopFly(); vel.x = vel.z = 0; anchor = null; goalDist = cam.dist;
  if (ptr.size === 1) { moved = 0; downAt = performance.now(); rotating = OBJ || e.button === 2 || e.shiftKey || e.ctrlKey; canvas.classList.add('drag'); }
  if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), a: Math.atan2(b.y - a.y, b.x - a.x) }; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptr.get(e.pointerId);
  if (!p) { hover(e.clientX, e.clientY); return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y, now = performance.now();
  moved += Math.abs(dx) + Math.abs(dy);
  placeCamera();
  if (ptr.size === 1) {
    if (rotating) { cam.az -= dx * 0.006; }
    else {
      const a = groundAt(p.x, p.y, new THREE.Vector3()), b = groundAt(e.clientX, e.clientY);
      if (a && b) {
        let mx = a.x - b.x, mz = a.z - b.z; const m = Math.hypot(mx, mz), cap = cam.dist * 0.35;
        if (m > cap) { mx *= cap / m; mz *= cap / m; }
        cam.x += mx; cam.z += mz;
        const dt = Math.max(8, now - p.t) / 1000, k = 0.35;
        vel.x = lerp(vel.x, mx / dt, k); vel.z = lerp(vel.z, mz / dt, k);
      }
    }
    p.x = e.clientX; p.y = e.clientY; p.t = now;
  } else if (ptr.size === 2) {
    const other = [...ptr.entries()].find(([id]) => id !== e.pointerId)[1];
    const m0 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
    p.x = e.clientX; p.y = e.clientY;
    const m1 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
    const d = Math.hypot(p.x - other.x, p.y - other.y), a = Math.atan2(other.y - p.y, other.x - p.x);
    const g0 = groundAt(m0.x, m0.y, new THREE.Vector3());
    if (pinch && d > 10) {
      cam.dist = clamp(cam.dist * pinch.d / d, MIN_DIST, maxDist()); goalDist = cam.dist;
      let da = a - pinch.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      if (Math.abs(da) < 0.5) cam.az -= da;
      pinch.d = d; pinch.a = a;
    }
    placeCamera();
    const g1 = groundAt(m1.x, m1.y);
    if (!OBJ && g0 && g1 && g0.distanceTo(g1) < cam.dist * 2) { cam.x += g0.x - g1.x; cam.z += g0.z - g1.z; }
    vel.x = vel.z = 0;
  }
  bound(); placeCamera(); invalidate(); interacted();
});
const up = (e) => {
  const p = ptr.get(e.pointerId); if (!p) return;
  ptr.delete(e.pointerId); pinch = null;
  if (ptr.size === 0) {
    canvas.classList.remove('drag');
    const now = performance.now();
    if (now - p.t > 90) vel.x = vel.z = 0;                           // the finger rested before lifting: no throw
    if (moved < 7 && now - downAt < 450 && !OBJ) {
      if (!pick(e.clientX, e.clientY)) {
        closePopup();
        if (now - lastTap < 320) { anchor = { x: e.clientX, y: e.clientY }; goalDist = cam.dist * 0.5; }   // double tap
        lastTap = now;
      }
      vel.x = vel.z = 0;
    }
  } else { const q = [...ptr.values()][0]; q.t = performance.now(); vel.x = vel.z = 0; }
  invalidate();
};
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault(); stopFly(); interacted();
  const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
  if (e.ctrlKey) goalDist *= Math.exp(d * 0.01);                     // trackpad pinch
  else goalDist *= Math.exp(clamp(d, -240, 240) * 0.0014);
  goalDist = clamp(goalDist, MIN_DIST, maxDist());
  anchor = OBJ ? null : { x: e.clientX, y: e.clientY }; invalidate();
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const step = cam.dist * 0.22, fx = -Math.sin(cam.az), fz = -Math.cos(cam.az);
  const go = (x, z) => (OBJ ? flyTo({ az: cam.az + (x * fz - z * fx > 0 ? 0.4 : -0.4) }, 0.35) : flyTo({ x: cam.x + x, z: cam.z + z }, 0.35));
  if (e.key === 'ArrowUp') go(fx * step, fz * step);
  else if (e.key === 'ArrowDown') go(-fx * step, -fz * step);
  else if (e.key === 'ArrowLeft') go(fz * step, -fx * step);
  else if (e.key === 'ArrowRight') go(-fz * step, fx * step);
  else if (e.key === '+' || e.key === '=') zoomBy(0.6);
  else if (e.key === '-') zoomBy(1 / 0.6);
  else if (e.key === 'q' || e.key === 'Q') flyTo({ az: cam.az + 0.5 }, 0.4);
  else if (e.key === 'e' || e.key === 'E') flyTo({ az: cam.az - 0.5 }, 0.4);
  else if (e.key === 'Escape') { closePopup(); closeAll(); }
  else return;
  e.preventDefault(); interacted();
});
function zoomBy(f) { stopFly(); anchor = null; goalDist = clamp(cam.dist * f, MIN_DIST, maxDist()); invalidate(); interacted(); }

// ------------------------------------------------------------------------------------------------ the flat map
const flatMat = (color, order, extra = {}) => Object.assign(new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, side: THREE.DoubleSide, ...extra }), { userData: { order } });
function flatPositions(i16, scale) {
  const n = i16.length / 2, p = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { p[k * 3] = i16[k * 2] * scale; p[k * 3 + 2] = i16[k * 2 + 1] * scale; }
  return new THREE.BufferAttribute(p, 3);
}
// a flat layer. ranges: [start, count] pieces of the index, each drawn only when the camera sees it
function addFlat(pack, name, mat, ranges) {
  const pos = flatPositions(pack.get(name + '_pos'), 0.5), idx = new THREE.BufferAttribute(pack.get(name + '_idx'), 1);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (const [s, n] of ranges || [[0, idx.count]]) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', pos); g.setIndex(idx); g.setDrawRange(s, n);
    box.makeEmpty();
    for (let k = s; k < s + n; k++) { const i = idx.array[k]; box.expandByPoint(v.set(pos.array[i * 3], 0, pos.array[i * 3 + 2])); }
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat); m.renderOrder = mat.userData.order; scene.add(m);
  }
}
function addLines(pack, name, color, order, opacity = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', flatPositions(pack.get(name), 0.5));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: opacity < 1, opacity }));
  m.renderOrder = order; m.frustumCulled = false; scene.add(m);
  return m;
}

// ------------------------------------------------------------------------------------------------ tiles: buildings rise when you come close
let META = null, minorLines = null;
const tiles = new Map();                                         // 'tx_tz' -> { state, group, k, want, used }
const tileGroup = new THREE.Group(); tileGroup.renderOrder = 10; scene.add(tileGroup);
const bMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const sMat = flatMat(COL.small, 7);
const NEAR_DIST = low ? 2500 : 4300;                             // closer than this, full detail is shown
const NEAR_R = low ? 1150 : mid ? 2000 : 2700;
const TILE_KEEP = low ? 30 : mid ? 60 : 110;
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let inFlight = 0, reqId = 0;
const DATA = new URL('../data/', import.meta.url).href;
worker.onmessage = (e) => {
  inFlight--;
  const d = e.data, t = tiles.get(d.tx + '_' + d.tz);
  if (!t) return;
  if (d.error) { t.state = 'failed'; console.warn(d.error); return; }
  const g = new THREE.Group();
  g.position.set(-META.hx + (d.tx + 0.5) * META.tile, 0, -META.hz + (d.tz + 0.5) * META.tile);
  if (d.pos) {
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
    bg.setAttribute('color', new THREE.BufferAttribute(d.col, 3, true));
    bg.setIndex(new THREE.BufferAttribute(d.idx, 1));
    bg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 40, 0), 1100);
    const m = new THREE.Mesh(bg, bMat); m.renderOrder = 10; g.add(m); t.b = m;
  }
  if (d.spos) {
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(d.spos, 3));
    sg.setIndex(new THREE.BufferAttribute(d.sidx, 1));
    sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 800);
    const m = new THREE.Mesh(sg, sMat); m.renderOrder = 7; g.add(m); t.s = m;
  }
  t.group = g; t.state = 'ready'; t.k = 0; g.visible = false;
  tileGroup.add(g); invalidate(); pump();
};
const queue = [];
function pump() {
  while (inFlight < 2 && queue.length) {
    const t = queue.shift();
    if (!t.want || t.state !== 'queued') { if (t.state === 'queued') t.state = 'idle'; continue; }
    t.state = 'loading'; inFlight++;
    worker.postMessage({ id: ++reqId, base: DATA, cx: Math.floor(t.tx / META.ch), cz: Math.floor(t.tz / META.ch), tx: t.tx, tz: t.tz, low });
  }
}
let lastTileCheck = { x: 1e9, z: 0, dist: 0 };
function wantTiles() {
  if (!META) return;
  const near = cam.dist < NEAR_DIST;
  // the centre of interest lies a little ahead of the target, because the camera leans forward
  const ahead = cam.dist * 0.18, cx = cam.x - Math.sin(cam.az) * ahead, cz = cam.z - Math.cos(cam.az) * ahead;
  const R = clamp(cam.dist * 0.95, 900, NEAR_R);
  for (const t of tiles.values()) t.want = false;
  if (near) {
    const half = META.tile / 2, t0x = Math.floor((cx - R + META.hx) / META.tile), t1x = Math.floor((cx + R + META.hx) / META.tile);
    const t0z = Math.floor((cz - R + META.hz) / META.tile), t1z = Math.floor((cz + R + META.hz) / META.tile);
    const list = [];
    for (let tz = Math.max(0, t0z); tz <= Math.min(META.rows - 1, t1z); tz++) for (let tx = Math.max(0, t0x); tx <= Math.min(META.cols - 1, t1x); tx++) {
      const mx = -META.hx + tx * META.tile + half, mz = -META.hz + tz * META.tile + half;
      const d = Math.hypot(Math.max(0, Math.abs(mx - cx) - half), Math.max(0, Math.abs(mz - cz) - half));
      if (d > R) continue;
      const key = tx + '_' + tz;
      let t = tiles.get(key);
      if (!t) { t = { tx, tz, state: 'idle', k: 0, group: null }; tiles.set(key, t); }
      t.want = true; t.used = performance.now(); t.d = d;
      if (t.state === 'idle') list.push(t);
    }
    list.sort((a, b) => a.d - b.d);
    for (const t of list) { t.state = 'queued'; queue.push(t); }
    queue.sort((a, b) => a.d - b.d);
    pump();
  }
  // forget the tiles that have not been needed for longest
  const ready = [...tiles.values()].filter((t) => t.state === 'ready' && !t.want && t.k === 0);
  let over = [...tiles.values()].filter((t) => t.state === 'ready').length - TILE_KEEP;
  if (over > 0) for (const t of ready.sort((a, b) => a.used - b.used)) {
    if (over-- <= 0) break;
    tileGroup.remove(t.group); t.b?.geometry.dispose(); t.s?.geometry.dispose();
    tiles.delete(t.tx + '_' + t.tz);
  }
}
function stepTiles(dt) {
  let busy = false;
  for (const t of tiles.values()) {
    if (t.state !== 'ready') continue;
    const goal = t.want ? 1 : 0;
    if (t.k === goal) continue;
    t.k = clamp(t.k + (goal ? dt / 0.55 : -dt / 0.3), 0, 1); busy = true;
    const e = REDUCED ? goal : 1 - Math.pow(1 - t.k, 3);
    t.group.visible = t.k > 0;
    if (t.b) t.b.scale.y = Math.max(0.001, e);
    if (t.s) t.s.visible = t.k > 0.02;
  }
  return busy;
}

// ------------------------------------------------------------------------------------------------ names on the map
const LABELS = [
  // [name in the data or [x, z], lettering, rank]: rank 1 is read from far away, rank 2 from the middle distance
  ['Mitte', 'City', 1], ['Hörde', 0, 1], ['Aplerbeck', 0, 1], ['Brackel', 0, 1], ['Scharnhorst', 0, 1], ['Eving', 0, 1], ['Mengede', 0, 1],
  ['Huckarde', 0, 1], ['Lütgendortmund', 0, 1], ['Hombruch', 0, 1], ['Dorstfeld', 0, 1], ['Witten', 0, 1], ['Schwerte', 0, 1],
  ['Herdecke', 0, 1], ['Holzwickede', 0, 1], ['Castrop', 0, 1], ['Brambauer', 0, 1], ['Wickede', 0, 1], ['Kirchhörde', 0, 1], ['Langendreer', 0, 1],
  [[-100, -2350], 'Nordstadt', 2], ['Kreuzviertel', 0, 2], ['Kaiserstraßenviertel', 'Kaiserviertel', 2], ['Phönix-West', 'Phoenix-West', 2],
  [[2950, 1560], 'Phoenix-See', 2], [[-1950, -2950], 'Hafen', 2], [[560, 760], 'Westfalenpark', 2], [[9840, -1500], 'Flughafen', 2],
  [[-760, 10350], 'Hengsteysee', 2], ['Körne', 0, 2], ['Wambel', 0, 2], ['Asseln', 0, 2], ['Barop', 0, 2], ['Syburg', 0, 2], ['Marten', 0, 2],
  ['Kirchlinde', 0, 2], ['Bodelschwingh', 0, 2], ['Derne', 0, 2], ['Brechten', 0, 2], ['Berghofen', 0, 2], ['Sölde', 0, 2], ['Wellinghofen', 0, 2],
  ['Brünninghausen', 0, 2], ['Eichlinghofen', 0, 2], ['Oespel', 0, 2], ['Deusen', 0, 2], ['Lindenhorst', 0, 2], ['Kurl', 0, 2], ['Husen', 0, 2],
  ['Lanstrop', 0, 2], ['Nette', 0, 2], ['Westerfilde', 0, 2], ['Gartenstadt', 0, 2], ['Schüren', 0, 2], ['Benninghofen', 0, 2], ['Bittermark', 0, 2],
  ['Annen', 0, 2], ['Stockum', 0, 2], ['Kley', 0, 2], ['Bövinghausen', 0, 2], ['Massen', 0, 2], ['Westhofen', 0, 2], ['Lünen-Süd', 0, 2], ['Rahm', 0, 2],
];
const labels = [];
function makeLabel(text, x, z, rank) {
  const fs = 76, pad = 26, track = fs * 0.13, cv = document.createElement('canvas'), c = cv.getContext('2d');
  const font = `800 ${fs}px Manrope, "Helvetica Neue", Arial, sans-serif`;
  c.font = font; const chars = [...text.toUpperCase()], ws = chars.map((ch) => c.measureText(ch).width);
  const w = ws.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  cv.width = Math.ceil(w + pad * 2); cv.height = fs + pad * 2;
  c.font = font; c.textBaseline = 'middle'; c.lineJoin = 'round';
  const draw = (stroke) => { let px = pad; chars.forEach((ch, i) => { stroke ? c.strokeText(ch, px, cv.height / 2 + 3) : c.fillText(ch, px, cv.height / 2 + 3); px += ws[i] + track; }); };
  c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 15; draw(true);
  c.fillStyle = '#34363a'; draw(false);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = low ? 2 : 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const H = rank === 1 ? 400 : 165;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(H * cv.width / cv.height, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  m.position.set(x, 0, z); m.renderOrder = 30; m.userData.rank = rank; scene.add(m); labels.push(m);
}
function stepLabels() {
  const d = cam.dist;
  const o1 = smooth(3400, 5200, d) * 0.92, o2 = smooth(2100, 2900, d) * (1 - smooth(5200, 7000, d)) * 0.9;
  for (const m of labels) {
    const o = m.userData.rank === 1 ? o1 : o2;
    m.visible = o > 0.01; if (!m.visible) continue;
    m.material.opacity = o; m.rotation.set(-Math.PI / 2, cam.az, 0, 'YXZ');
  }
}

// ------------------------------------------------------------------------------------------------ the projects
let PROJECTS = [], active = null;
const projGroup = new THREE.Group(); scene.add(projGroup);
const v3 = new THREE.Vector3(), sph = new THREE.Sphere();
const projScale = () => (OBJ ? 1 : clamp(cam.dist / 2400, 1, 2.8));        // far away the models grow, so they stay findable
function buildProjects(meta) {
  const mat = projectMaterial();
  for (const p of PROJECTS) {
    const [x, z] = meta.projects[p.id];
    const g = projectGeometry(p), m = new THREE.Mesh(g, mat);
    m.position.set(x, 0, z); m.rotation.y = (p.rot || 0) * Math.PI / 180; m.renderOrder = 11;
    projGroup.add(m);
    Object.assign(p, { x, z, mesh: m, top: g.userData.top, r: g.boundingSphere.radius });
    if (OBJ) continue;
    const pin = document.createElement('button');
    pin.className = 'pin'; pin.type = 'button'; pin.tabIndex = -1;
    pin.innerHTML = `<span class="b"><i></i><span></span></span><span class="s"></span>`;
    pin.querySelector('i').textContent = p.mark; pin.querySelector('.b span').textContent = p.name;
    pin.addEventListener('click', (e) => { e.stopPropagation(); openProject(p); });
    $('pins').appendChild(pin); p.pin = pin;
  }
}
function pick(sx, sy) {
  placeCamera(); ndc.set(sx / VW * 2 - 1, -(sy / VH) * 2 + 1); ray.setFromCamera(ndc, camera);
  const s = projScale(); let best = null, bd = 1e12;
  for (const p of PROJECTS) {
    sph.center.set(p.x, p.top * s * 0.5, p.z); sph.radius = Math.max(p.r * 0.62, p.top * 0.55) * s;
    if (ray.ray.intersectSphere(sph, v3)) { const d = v3.distanceToSquared(camera.position); if (d < bd) { bd = d; best = p; } }
  }
  if (best) openProject(best);
  return !!best;
}
let hot = null;
function hover(sx, sy) {
  if (isTouch || OBJ || !PROJECTS.length) return;
  ndc.set(sx / VW * 2 - 1, -(sy / VH) * 2 + 1); ray.setFromCamera(ndc, camera);
  const s = projScale(); let h = null;
  for (const p of PROJECTS) { sph.center.set(p.x, p.top * s * 0.5, p.z); sph.radius = Math.max(p.r * 0.62, p.top * 0.55) * s; if (ray.ray.intersectsSphere(sph)) { h = p; break; } }
  if (h !== hot) { hot?.pin.classList.toggle('on', hot === active); h?.pin.classList.add('on'); hot = h; canvas.classList.toggle('hot', !!h); }
}
function openProject(p, quick = false) {
  active?.pin.classList.remove('on'); active = p; p.pin.classList.add('on');
  $('popMark').textContent = p.mark; $('popName').textContent = p.name; $('popDistrict').textContent = pf(p, 'district');
  $('popPrice').textContent = pf(p, 'price'); $('popSize').textContent = pf(p, 'size'); $('popReady').textContent = pf(p, 'ready');
  $('popLink').href = `objekt.html?id=${p.id}${lang === 'en' ? '&lang=en' : ''}`;
  $('popup').hidden = false; $('live').textContent = `${p.name}, ${pf(p, 'district')}, ${pf(p, 'price')}`;
  // fly so that the building sits in the lower half and the card has room above it
  const d = clamp(Math.min(cam.dist, 1500), 700, 1500), off = d * 0.16;
  flyTo({ x: p.x - Math.sin(cam.az) * off, z: p.z - Math.cos(cam.az) * off, dist: d }, quick ? 0.01 : 1.4);
  closeAll(); interacted(); invalidate();
}
function closePopup() { if (!active || OBJ) return; active.pin.classList.remove('on'); active = null; $('popup').hidden = true; invalidate(); }
function stepOverlay() {
  const s = projScale(), far = cam.dist > 5200;
  if (OBJ) return;
  for (const p of PROJECTS) {
    p.mesh.scale.setScalar(s);
    v3.set(p.x, (p.top + 6) * s, p.z).project(camera);
    const on = v3.z < 1 && Math.abs(v3.x) < 1.15 && v3.y > -1.2 && v3.y < 1.3;
    p.pin.style.display = on ? '' : 'none';
    if (!on) continue;
    const px = (v3.x * 0.5 + 0.5) * VW, py = (-v3.y * 0.5 + 0.5) * VH;
    p.pin.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
    p.pin.classList.toggle('far', far && p !== active && p !== hot);
    p.sx = px; p.sy = py;
  }
  if (active) {
    const pop = $('popup'), w = pop.offsetWidth, h = pop.offsetHeight;
    const x = clamp(active.sx - w / 2, 10, VW - w - 10), y = Math.max(74, active.sy - 52 - h);
    pop.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  $('north').style.setProperty('--az', (cam.az * 180 / Math.PI).toFixed(1) + 'deg');
}
on('callBtn', 'click', () => { $('contact').hidden = false; });
on('spinBtn', 'click', () => { spin = !spin; spinHold = 0; $('spinBtn').setAttribute('aria-pressed', String(spin)); invalidate(); });
on('sheetGrab', 'click', () => { const d = $('sheet').classList.toggle('down'); $('sheetGrab').setAttribute('aria-expanded', String(!d)); setTimeout(layoutObj, 340); });

// ------------------------------------------------------------------------------------------------ interface
const DISTRICTS = [['Mitte', 'city', 2600], [[-100, -2350], 'Nordstadt', 2600], [[-1950, -2950], 'Hafen', 2400], ['Kreuzviertel', 0, 2000], ['Kaiserstraßenviertel', 'Kaiserviertel', 2000],
  [[2950, 1560], 'Phoenix-See', 2400], ['Hörde', 0, 2600], ['Hombruch', 0, 2800], ['Aplerbeck', 0, 2800], ['Brackel', 0, 3000], ['Scharnhorst', 0, 3000], ['Eving', 0, 3000],
  ['Huckarde', 0, 2800], ['Mengede', 0, 3000], ['Lütgendortmund', 0, 3000], ['Dorstfeld', 0, 2600]];
const placeXZ = (ref) => { if (Array.isArray(ref)) return ref; const p = META.places.find((q) => q[0] === ref); return p ? [p[3], p[4]] : null; };
function closeAll(except) {
  if (except !== 'menu' && $('menu')) { $('menu').hidden = true; $('menuBtn').setAttribute('aria-expanded', 'false'); }
  if (except !== 'city' && $('cityList')) { $('cityList').hidden = true; $('cityBtn').setAttribute('aria-expanded', 'false'); }
  if (except !== 'contact') $('contact').hidden = true;
}
function buildUi() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T(el.dataset.i18n); });
  $('langBtn').textContent = lang === 'de' ? 'DE' : 'EN'; document.documentElement.lang = lang;
  if (OBJ) return fillSheet();
  const ul = $('cityList'); ul.innerHTML = '';
  const add = (text, fn, cls) => { const li = document.createElement('li'); li.textContent = text; li.tabIndex = 0; li.setAttribute('role', 'option'); if (cls) li.className = cls;
    const go = () => { fn(); closeAll(); closePopup(); $('cityLabel').textContent = text; interacted(); };
    li.addEventListener('click', go); li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); ul.appendChild(li); };
  for (const [ref, name, dist] of DISTRICTS) { const xz = placeXZ(ref); if (xz) add(name === 'city' ? T('city') : name || ref, () => flyTo({ x: xz[0], z: xz[1], dist, az: 0 }, 1.8)); }
  add(T('all'), () => flyTo(home(), 1.8), 'sep');
  const pl = $('projectList'); pl.innerHTML = '';
  for (const p of PROJECTS) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = `<span class="mark"></span><span class="t"><b></b><span></span></span><span class="p"></span>`;
    b.querySelector('.mark').textContent = p.mark; b.querySelector('b').textContent = p.name;
    b.querySelector('.t span').textContent = pf(p, 'district'); b.querySelector('.p').textContent = pf(p, 'price');
    b.addEventListener('click', () => openProject(p)); li.appendChild(b); pl.appendChild(li);
  }
  if (active) openProject(active, true);
}
// objekt.html: the data sheet of the one project
let THE = null;
function fillSheet() {
  const p = THE; if (!p) return;
  document.title = `${p.name} · Wohnungsfinder Dortmund`;
  $('oMark').textContent = p.mark; $('oName').textContent = p.name; $('oDistrict').textContent = pf(p, 'district');
  $('oPrice').textContent = pf(p, 'price'); $('oSize').textContent = pf(p, 'size'); $('oUnits').textContent = pf(p, 'units');
  $('oFloors').textContent = String(p.floors); $('oReady').textContent = pf(p, 'ready'); $('oMix').textContent = pf(p, 'mix');
  $('oFeatures').innerHTML = ''; for (const f of (lang === 'en' && p.features_en) || p.features) { const li = document.createElement('li'); li.textContent = f; $('oFeatures').appendChild(li); }
  const back = `./?p=${p.id}${lang === 'en' ? '&lang=en' : ''}`; $('backLink').href = back; $('homeLink').href = back;
  $('mapsLink').href = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
}
function layoutObj() {            // keep the model in the free part of the screen: left of the sheet, or above it on a phone
  const sh = $('sheet'); if (!sh) return;
  const r = sh.getBoundingClientRect(), phone = innerWidth <= 760;
  shift = phone ? { x: 0, y: Math.round((VH - r.top) * 0.42) } : { x: Math.round((VW - r.left) * 0.5), y: 20 };
  invalidate();
}
on('menuBtn', 'click', () => { const o = $('menu').hidden; closeAll(); $('menu').hidden = !o; $('menuBtn').setAttribute('aria-expanded', String(o)); });
on('menuClose', 'click', () => closeAll());
on('cityBtn', 'click', () => { const o = $('cityList').hidden; closeAll(); $('cityList').hidden = !o; $('cityBtn').setAttribute('aria-expanded', String(o)); });
on('contactBtn', 'click', () => { closeAll(); $('contact').hidden = false; });
on('contactClose', 'click', () => closeAll());
on('contactOk', 'click', () => closeAll());
on('contact', 'click', (e) => { if (e.target === $('contact')) closeAll(); });
on('popClose', 'click', closePopup);
on('langBtn', 'click', () => { lang = lang === 'de' ? 'en' : 'de'; try { localStorage.setItem('wf-lang', lang); } catch (e) {} buildUi(); });
on('zoomIn', 'click', () => zoomBy(0.55));
on('zoomOut', 'click', () => zoomBy(1 / 0.55));
on('north', 'click', () => { flyTo({ az: 0 }, 0.6); interacted(); });
const home = () => ({ x: -300, z: -500, dist: Math.min(maxDist(), camera.aspect < 0.8 ? 15000 : 9800), az: 0 });

// ------------------------------------------------------------------------------------------------ start
async function start() {
  const bar = $('ldBar'), txt = $('ldText');
  txt.textContent = T('loading');
  resize();
  const [pack, projects] = await Promise.all([
    loadPack(DATA + 'base.bin.gz', (f) => { bar.style.width = (f * 92).toFixed(0) + '%'; }),
    fetch(new URL('./projects.json', import.meta.url)).then((r) => r.json()),
    document.fonts.load('800 76px "Manrope"').then(() => document.fonts.ready).catch(() => {}),
  ]);
  META = pack.meta; B = { hx: META.hx, hz: META.hz }; PROJECTS = projects;

  // ground, and a slightly darker frame where the map ends
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(2 * META.hx, 2 * META.hz), flatMat(COL.ground, 0)); gm.rotation.x = -Math.PI / 2; gm.renderOrder = 0; scene.add(gm);
  const om = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000), flatMat(COL.off, -1)); om.rotation.x = -Math.PI / 2; om.renderOrder = -1; scene.add(om);
  addFlat(pack, 'wood', flatMat(COL.wood, 1), META.flat?.wood); addFlat(pack, 'green', flatMat(COL.green, 2), META.flat?.green); addFlat(pack, 'water', flatMat(COL.water, 3), META.flat?.water);
  addLines(pack, 'bound_seg', COL.bound, 4, 0.55);
  minorLines = addLines(pack, 'minor_seg', COL.minor, 5, 0.75);
  addLines(pack, 'rail_seg', COL.rail, 5, 0.9);
  { // the big streets: one buffer, one draw per class
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', flatPositions(pack.get('road_pos'), 0.5)); g.setIndex(new THREE.BufferAttribute(pack.get('road_idx'), 1));
    const mats = COL.road.map((c) => flatMat(c, 6));
    for (let i = META.road.length - 1; i >= 0; i--) g.addGroup(META.road[i][0], META.road[i][1], i);   // small to big: motorways lie on top
    const m = new THREE.Mesh(g, mats); m.renderOrder = 6; m.frustumCulled = false; scene.add(m);
  }
  { // every building as a flat block, one mesh per 4 km chunk so the camera only draws what it sees
    const pos = flatPositions(pack.get('far_pos'), 0.5), idx = new THREE.BufferAttribute(pack.get('far_idx'), 1), mat = flatMat(COL.far, 8);
    const size = META.tile * META.ch;
    for (const [cx, cz, s, n] of META.far) {
      if (!n) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', pos); g.setIndex(idx); g.setDrawRange(s, n);
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(-META.hx + (cx + 0.5) * size, 0, -META.hz + (cz + 0.5) * size), size * 0.78);
      const m = new THREE.Mesh(g, mat); m.renderOrder = 8; scene.add(m);
    }
  }
  bar.style.width = '96%';
  if (!OBJ) for (const [ref, text, rank] of LABELS) { const xz = placeXZ(ref); if (xz) makeLabel(text || ref, xz[0], xz[1], rank); }
  buildProjects(META);
  if (OBJ) THE = PROJECTS.find((p) => p.id === Q.get('id')) || PROJECTS[0];
  buildUi();

  const h = home(), focus = PROJECTS.find((p) => p.id === Q.get('p'));
  Object.assign(cam, h); goalDist = cam.dist; bound(); placeCamera();
  renderer.compile(scene, camera);
  bar.style.width = '100%';
  if (OBJ) {
    const d = innerWidth <= 760 ? 620 : 520;
    Object.assign(cam, { x: THE.x, z: THE.z, dist: REDUCED ? d : d * 2.4, az: 0.7 }); goalDist = d; layoutObj(); placeCamera();
    addEventListener('resize', () => setTimeout(layoutObj, 120), { passive: true });
  } else if (focus) { Object.assign(cam, { x: focus.x, z: focus.z, dist: 1400 }); goalDist = 1400; openProject(focus, true); $('hint').classList.add('off'); }
  else if (!Q.has('still') && !REDUCED) { Object.assign(cam, { dist: Math.min(maxDist(), h.dist * 2.1), az: -0.55, z: h.z + 1800 }); goalDist = cam.dist; placeCamera(); setTimeout(() => flyTo(h, 2.6), 350); }
  requestAnimationFrame(() => { $('loader').classList.add('done'); setTimeout(() => $('loader').remove(), 900); });
  gov.hold(2500);
  window.__map = { cam, flyTo, tiles, PROJECTS, renderer, get info() { return renderer.info.render; } };
  requestAnimationFrame(frame);
}

let last = performance.now(), tileTick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!visible()) { gov.frame(now, false); return; }
  const moving = stepCamera(dt);
  if (moving || dirty) {
    if (now - tileTick > 140 || Math.hypot(cam.x - lastTileCheck.x, cam.z - lastTileCheck.z) > 300) { tileTick = now; lastTileCheck = { x: cam.x, z: cam.z }; wantTiles(); }
  }
  const growing = stepTiles(dt);
  const activeNow = moving || growing || dirty;
  gov.frame(now, activeNow);
  if (!activeNow) return;
  dirty = false;
  placeCamera(); stepLabels();
  if (minorLines) minorLines.material.opacity = 0.75 * (1 - 0.5 * smooth(9000, 20000, cam.dist));
  renderer.render(scene, camera);
  stepOverlay();
}

start().catch((e) => { console.error(e); $('ldText').textContent = String(e.message || e); });
