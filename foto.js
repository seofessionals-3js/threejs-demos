// Fotorealismus: an option that is offered wherever a demo shows its house in colour.
// Every demo loads this file from /threejs-demos/foto.js. It draws a small switch, "3D-Modell | Fotorealismus",
// over the house views and takes it away again when the drawing returns.
// Today the second option is a promise: choosing it changes nothing yet. Later it will show rendered pictures.
(() => {
  const Q = new URLSearchParams(location.search);
  if (Q.has('rec') || Q.has('drive') || Q.has('shot') || Q.has('p')) return;        // recordings and stills stay clean
  // where each demo shows its house, as parts of the page's scroll (0 top, 1 bottom). all: every variant,
  // a, b, c: one variant (?dir=). when: for a demo that is not driven by the scroll, a test of its own state.
  // pill, ink, dot: the colours of the demo's medium, as in portfolio.js. top: where the switch sits, under the demo's own bar.
  const VIEWS = {
    '/threejs-demo-6/': { all: [[0.37, 0.79]], pill: '#262b31', ink: '#f5f2ea', dot: '#f2a531' },                 // 1 Kartonmodell
    '/threejs-demo-4/': { all: [[0.5, 0.93]], pill: '#17191c', ink: '#f5f4ef', dot: '#ee5a48' },                   // 2 Bauzeitraffer
    '/threejs-demo-2/': { all: [[0.16, 0.8]], pill: '#1b1c1e', ink: '#f4f3ee', dot: '#f39a36' },                   // 3 Schnitt-Scan
    '/threejs-demo-5/': { when: () => { const s = window.__state; return !!s && (s.SHOT === 'inside' || s.TOUR > 0.02); },   // 4 Bauzeitenplan: the walk through the finished house
      top: 96, topPhone: 104, pill: '#231d5e', ink: '#eeedea', dot: '#ffd23c' },
    '/threejs-demo-3/': { a: [[0.14, 0.74]], c: [[0.05, 0.58]], pill: '#3b2f27', ink: '#f9f3e7', dot: '#3aa3b0' },   // 5 Offener Schnitt
    '/threejs-demo-1/': { a: [[0.85, 0.985]], b: [[0.88, 0.985]], c: [[0.9, 0.985]], pill: '#163a72', ink: '#f3f6fb', dot: '#f4b63f' }, // 6 Explosionsaxonometrie: once the colour has come
  };
  const here = location.pathname.replace(/index\.html$/, '');
  const key = Object.keys(VIEWS).find((k) => here.endsWith(k));
  if (!key) return;
  const V = VIEWS[key], spans = V[(Q.get('dir') || 'a').toLowerCase()] || V.all || [];
  if (!spans.length && !V.when) return;

  const LABEL = "var(--label, var(--mono, var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace)))";
  const css = document.createElement('style');
  css.textContent = `
  #foto-opt { position: fixed; top: ${V.top || 64}px; right: 16px; z-index: 2147481000; display: flex;
    border: 1px solid ${V.ink}40; background: ${V.pill}; box-shadow: 0 6px 18px rgba(0, 0, 0, .18);
    opacity: 0; visibility: hidden; transform: translateY(-4px); transition: opacity .35s, transform .35s, visibility 0s .35s; }
  #foto-opt.on { opacity: .97; visibility: visible; transform: none; transition: opacity .35s, transform .35s; }
  #foto-opt button { appearance: none; border: 0; margin: 0; background: transparent; color: ${V.ink}; cursor: pointer;
    display: flex; align-items: center; gap: 7px; padding: 8px 11px 7px; white-space: nowrap;
    font: 600 10px/1 ${LABEL}; letter-spacing: .14em; text-transform: uppercase; -webkit-tap-highlight-color: transparent; }
  #foto-opt button + button { border-left: 1px solid ${V.ink}40; }
  #foto-opt button i { width: 6px; height: 6px; border-radius: 50%; border: 1px solid ${V.dot}; flex: none; }
  #foto-opt button[aria-pressed="true"] { background: ${V.ink}; color: ${V.pill}; }
  #foto-opt button[aria-pressed="true"] i { background: ${V.dot}; }
  #foto-opt button:focus-visible { outline: 2px solid ${V.dot}; outline-offset: -3px; }
  @media (max-width: 700px) { #foto-opt { top: ${V.topPhone || V.top || 56}px; right: 12px; }
    #foto-opt button { font-size: 9px; letter-spacing: .1em; padding: 7px 9px 6px; gap: 6px; } }`;
  document.head.appendChild(css);

  const el = document.createElement('div');
  el.id = 'foto-opt'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Darstellung');
  el.innerHTML = '<button type="button" aria-pressed="true"><i></i>3D-Modell</button><button type="button" aria-pressed="false"><i></i>Fotorealismus</button>';
  // A press on the switch is not a press on the page: the demo behind it keeps playing.
  // Nothing else is wired to it yet, so choosing Fotorealismus changes nothing.
  for (const ev of ['pointerdown', 'touchstart', 'mousedown', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
  const mount = () => document.body.appendChild(el);
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  // shown while the scroll is inside one of the spans. Measured on scroll, on resize and twice a second
  // (a demo that plays by itself moves the scroll without the user)
  let on = false, max = 0, maxT = -1e9;
  const check = () => {
    const now = performance.now();
    if (now - maxT > 500) { max = Math.max(1, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight); maxT = now; }
    const u = scrollY / max, want = V.when ? !!V.when() : spans.some(([a, b]) => u >= a && u <= b);
    if (want !== on) { on = want; el.classList.toggle('on', on); el.setAttribute('aria-hidden', String(!on)); for (const b of el.children) b.tabIndex = on ? 0 : -1; }
  };
  el.setAttribute('aria-hidden', 'true'); for (const b of el.children) b.tabIndex = -1;
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', () => { maxT = -1e9; check(); }, { passive: true });
  setInterval(check, 500);
  check();
})();
