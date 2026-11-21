// three.js Portfolio: one continuous show. When a demo (or one of its variants) has played to its end, the next
// one loads and plays by itself, and after the last demo the show starts again with Demo 1.
// Demos 2 to 7 load this file from /threejs-demos/portfolio.js. Demo 1 runs its own three sheets and hands over to
// Demo 2 itself.
//
//   ?autoplay=1   arrived from the demo before: show its card, then play this page by itself
//   any wheel, touch, click or key takes over; the pill at the bottom hands it back
(() => {
  // every stop of the show, in order. path is from the site root (works on GitHub Pages and locally).
  // dur: seconds to play the page from top to bottom, start: seconds to let the page's own intro run first.
  // A demo with its own play button (btn) is started with that button and keeps its own pace; on() says whether it
  // is running, weeks: the end is the last week of Demo 5's programme (38) rather than the bottom of the page.
  // Demo 4 and Demo 5 (both Projekt Steininger) share the same Abspielen button.
  const D4 = { btn: '#playBtn', on: b => b.getAttribute('aria-pressed') === 'true' };
  const D5 = { ...D4, weeks: 38, pillTop: 140 };
  const SHOW = [
    { demo: 1, path: '/threejs-demo-1/', q: 'dir=a&chain=1&play=1', name: 'Planblatt' },
    { demo: 2, path: '/threejs-demo-2/', name: 'Das Haus im Schnitt', dur: 88, start: 4 },
    { demo: 3, path: '/threejs-demo-3/', q: 'dir=a', name: 'Objektiv öffnen', dur: 48, start: 5 },
    { demo: 3, path: '/threejs-demo-3/', q: 'dir=c', name: 'Die Treppe hinab', dur: 40, start: 5 },
    { demo: 4, path: '/threejs-demo-4/', name: 'Projekt Steininger', start: 4, ...D4 },
    { demo: 5, path: '/threejs-demo-5/', q: 'dir=a&wk=0', name: 'Der Bauzeitenplan', start: 3, ...D5 },
    { demo: 5, path: '/threejs-demo-5/', q: 'dir=b&wk=0', name: 'Plan im Maßstab 1:1', start: 3, ...D5 },
    { demo: 5, path: '/threejs-demo-5/', q: 'dir=c&wk=0', name: 'Baustellenkamera', start: 3, ...D5 },
    { demo: 6, path: '/threejs-demo-6/', name: 'Es beginnt auf dem Tisch', dur: 62, start: 4 },
    { demo: 7, path: '/threejs-demo-7/a-one-door/', name: 'Eine Tür', dur: 34, start: 4 },
    { demo: 7, path: '/threejs-demo-7/b-the-row/', name: 'Die Reihe', dur: 30, start: 4 },
    { demo: 7, path: '/threejs-demo-7/c-the-face/', name: 'Die Fassade', dur: 26, start: 4 },
  ];
  const Q = new URLSearchParams(location.search);
  if (Q.has('rec') || Q.has('drive') || Q.has('shot') || Q.has('noshow')) return;     // recordings and stills stay still
  // which stop is this? the path names the repo (and the page in Demo 7); a dir in the query picks the variant
  const here = location.pathname.replace(/index\.html$/, '');
  const repo = (here.match(/threejs-demo-\d+\/(?:[a-z-]+\/)?/) || [''])[0];
  const cands = SHOW.map((s, i) => [s, i]).filter(([s]) => repo && s.path.endsWith(repo));
  if (!cands.length) return;
  const dir = Q.get('dir');
  const [ST, SI] = cands.find(([s]) => s.q && dir && s.q.includes('dir=' + dir)) || cands[0];
  const NX = SHOW[(SI + 1) % SHOW.length];
  const nextUrl = NX.path + '?' + (NX.q ? NX.q + (NX.demo === 1 ? '' : '&') : '') + (NX.demo === 1 ? '' : 'autoplay=1');
  const AUTO = Q.has('autoplay');
  const pad = n => String(n).padStart(2, '0');

  // ---- the hand-over card and the pill. Every demo is drawn in its own plan medium, and the card that announces a
  // demo is a cover sheet in that medium: its sheet, its line colour and its one accent. So the card that closes
  // one demo already has the colours of the page that loads behind it.
  //   sheet / ink: the cover sheet and its lettering, chip / on: the number, pill: the small control over the scene
  const MEDIA = {
    1: { medium: 'Blaupause', sheet: '#1e4a8c', ink: '#f3f6fb', chip: '#f4b63f', on: '#163a72', pill: '#163a72', pillInk: '#f3f6fb', dot: '#f4b63f' },
    2: { medium: 'Tusche auf Transparentpapier', sheet: '#e9e7e0', ink: '#1b1c1e', chip: '#e07a12', on: '#1b1c1e', pill: '#1b1c1e', pillInk: '#f4f3ee', dot: '#f39a36' },
    3: { medium: 'Aquarell auf Bütten', sheet: '#f3ebdb', ink: '#3b2f27', chip: '#1b7a8c', on: '#f9f3e7', pill: '#3b2f27', pillInk: '#f9f3e7', dot: '#3aa3b0' },
    4: { medium: 'Bauzeichnung nach Norm', sheet: '#f5f4ef', ink: '#17191c', chip: '#d43a2a', on: '#fbfaf7', pill: '#17191c', pillInk: '#f5f4ef', dot: '#ee5a48' },
    5: { medium: 'Lichtpause mit Textmarker', sheet: '#eeedea', ink: '#3d3492', chip: '#ffd23c', on: '#231d5e', pill: '#231d5e', pillInk: '#eeedea', dot: '#ffd23c' },
    6: { medium: 'Kartonmodell auf der Schneidematte', sheet: '#323841', ink: '#f5f2ea', chip: '#f2a531', on: '#262b31', pill: '#262b31', pillInk: '#f5f2ea', dot: '#f2a531' },
    7: { medium: 'Trois crayons auf Tonpapier', sheet: '#dfd2ba', ink: '#2a2522', chip: '#a5432b', on: '#fcf9f2', pill: '#2a2522', pillInk: '#eadfcb', dot: '#c65e42' },
  };
  const HERE = MEDIA[ST.demo];
  // the fonts are the ones of the page the card lies on: every demo names its own display and label face
  const DISPLAY = "var(--display, var(--font-display, 'Chakra Petch', 'Arial Narrow', sans-serif))";
  const LABEL = "var(--label, var(--mono, var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace)))";
  const css = document.createElement('style');
  css.textContent = `
  #pf-card { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; opacity: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
    background: var(--pf-sheet); color: var(--pf-ink); text-transform: uppercase; transition: none; }
  #pf-card::before { content: ''; position: absolute; inset: 14px; border: 1px solid var(--pf-ink); opacity: .28; }
  #pf-card .k { font: 500 10px ${LABEL}; letter-spacing: .24em; opacity: .66; }
  #pf-card .n { font: 700 15px ${LABEL}; letter-spacing: .3em; text-indent: .3em; color: var(--pf-on); background: var(--pf-chip); padding: 5px 11px 4px; }
  #pf-card .t { font: 600 clamp(34px, 5vw, 64px)/1 ${DISPLAY}; letter-spacing: .02em; text-align: center; padding: 0 22px; }
  #pf-card .s { font: 600 11px ${LABEL}; letter-spacing: .2em; text-align: center; padding: 0 22px; }
  #pf-card .m { font: 500 10px ${LABEL}; letter-spacing: .2em; opacity: .66; text-align: center; padding: 8px 22px 0; }
  #pf-card .m::before { content: ''; display: block; width: 44px; height: 1px; margin: 0 auto 12px; background: var(--pf-ink); }
  #pf-pill { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 2147482000;
    display: flex; align-items: center; gap: 8px; padding: 7px 12px 7px 10px; border: 1px solid ${HERE.pillInk}33;
    background: ${HERE.pill}; color: ${HERE.pillInk}; font: 600 10px ${LABEL};
    letter-spacing: .16em; text-transform: uppercase; cursor: pointer; opacity: 0; visibility: hidden;
    transition: opacity .4s, visibility 0s .4s; white-space: nowrap; -webkit-tap-highlight-color: transparent; }
  #pf-pill.on { opacity: .96; visibility: visible; transition: opacity .4s; }
  #pf-pill i { width: 7px; height: 7px; border-radius: 50%; background: ${HERE.dot}; flex: none; }
  #pf-pill.paused i { background: transparent; border: 1px solid ${HERE.dot}; width: 5px; height: 5px; }
  #pf-pill b { position: absolute; left: 0; bottom: -1px; height: 2px; background: ${HERE.dot}; width: 100%; transform: scaleX(0); transform-origin: 0 50%; }
  @media (max-width: 700px) { #pf-pill { bottom: 8px; font-size: 9px; letter-spacing: .1em; } #pf-card::before { inset: 9px; } }`;
  document.head.appendChild(css);
  const card = document.createElement('div'); card.id = 'pf-card'; card.setAttribute('aria-hidden', 'true');
  card.innerHTML = '<span class="k"></span><span class="n"></span><span class="t"></span><span class="s"></span><span class="m"></span>';
  const pill = document.createElement('button'); pill.id = 'pf-pill'; pill.type = 'button';
  const ST_PILL = () => ST.pillTop;
  pill.innerHTML = '<i></i><span></span><b></b>';
  const setCard = (s, k) => {
    card.querySelector('.k').textContent = k;
    card.querySelector('.n').textContent = pad(s.demo);
    card.querySelector('.t').textContent = 'three.js Demo ' + s.demo;
    card.querySelector('.s').textContent = s.name;
    const M = MEDIA[s.demo];
    card.querySelector('.m').textContent = M.medium;
    card.style.setProperty('--pf-sheet', M.sheet); card.style.setProperty('--pf-ink', M.ink);
    card.style.setProperty('--pf-chip', M.chip); card.style.setProperty('--pf-on', M.on);
  };
  if (ST_PILL()) Object.assign(pill.style, { top: ST_PILL() + 'px', bottom: 'auto' });   // Demo 5 keeps its plan at the bottom, the pill goes under its toolbar
  const mount = () => { document.body.appendChild(card); document.body.appendChild(pill); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  // ---- state
  let playing = AUTO, u = null, endT = -1, goT = -1, gone = false, t0 = performance.now(), last = t0, built = false, bar = null;
  const say = (txt, paused) => { const sp = pill.querySelector('span'); if (sp.textContent !== txt) sp.textContent = txt; pill.classList.toggle('paused', !!paused); };
  // the scroll range is measured twice a second and on resize, not every frame: reading scrollHeight forces layout
  let maxYv = 0, maxYt = -1e9;
  const measure = () => { maxYv = Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight); maxYt = performance.now(); return maxYv; };
  const maxY = () => (performance.now() - maxYt > 500 ? measure() : maxYv);
  addEventListener('resize', () => { maxYt = -1e9; }, { passive: true });
  // style writes only when the value changes
  const put = (el, prop, v) => { if (el.__pf !== undefined && el.__pf[prop] === v) return; (el.__pf || (el.__pf = {}))[prop] = v; el.style[prop] = v; };
  const st5 = () => window.__state;
  const atEnd = () => ST.weeks ? !!st5() && st5().WK >= ST.weeks - 0.002 : maxY() > 50 && scrollY >= maxY() - 3;
  const setPlaying = v => {
    playing = v;
    if (v && !ST.btn) { u = maxY() > 0 ? scrollY / maxY() : 0; }
    if (v && ST.btn) pressPlay();
  };
  function pressPlay() {
    // the demo's own play button: press it if it isn't running yet
    const b = document.querySelector(ST.btn);
    if (b && !ST.on(b)) b.click();
  }
  const takeOver = e => {
    if (e.target instanceof Element && e.target.closest('#pf-pill')) return;
    if (goT >= 0) return;
    if (playing) setPlaying(false);
  };
  addEventListener('wheel', takeOver, { passive: true, capture: true });
  addEventListener('touchstart', takeOver, { passive: true, capture: true });
  addEventListener('pointerdown', takeOver, { capture: true });
  addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) takeOver(e); }, { capture: true });
  pill.addEventListener('click', e => { e.stopPropagation(); if (goT < 0) setPlaying(!playing); });

  if (AUTO) { setCard(ST, 'three.js Portfolio'); put(card, 'opacity', '1'); }

  function tick(now) {
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;   // wall clock, so a slow machine keeps the pace
    const T = (now - t0) / 1000;
    // arriving: this demo's own card lifts off the page
    if (AUTO && goT < 0) put(card, 'opacity', (1 - Math.min(1, Math.max(0, (T - 0.35) / 0.7))).toFixed(3));
    const started = T > (ST.start ?? 4);
    // play: an even glide down the page, easing in over the first two seconds
    if (playing && started && endT < 0) {
      if (ST.btn) { if (!built) { built = true; pressPlay(); } }
      else {
        if (u == null) u = maxY() > 0 ? scrollY / maxY() : 0;
        const ramp = Math.min(1, (T - (ST.start ?? 4)) / 2);
        u = Math.min(1, u + dt / (ST.dur ?? 60) * ramp);
        const y = Math.round(u * maxY());
        if (Math.abs(y - scrollY) >= 1) scrollTo(0, y);
      }
    }
    // the end of the page: hold a moment (a little longer if you scrolled there yourself), then hand over
    if (endT < 0 && started && atEnd()) endT = 0;
    if (endT >= 0 && goT < 0) {
      if (!atEnd() && endT < 1.1) endT = -1;                                   // scrolled back up: stay
      else { endT += dt; if (endT > (playing ? 1.0 : 2.2)) { goT = 0; setCard(NX, 'three.js Portfolio · Weiter mit'); } }
    }
    if (goT >= 0) {
      goT += dt;
      put(card, 'opacity', Math.min(1, goT / 0.55).toFixed(3));
      if (goT > 0.75 && !gone) { gone = true; location.href = nextUrl; }
    }
    // the pill: what is happening and what comes next
    const showPill = AUTO || endT >= 0 || !playing && u != null;
    pill.classList.toggle('on', showPill && goT < 0 && T > 1.2);
    if (endT >= 0) say(`Weiter: Demo ${NX.demo} · ${NX.name}`);
    else if (playing) say('Portfolio läuft · Scrollen übernimmt');
    else say('▶ Portfolio abspielen', true);
    if (!bar) bar = pill.querySelector('b');
    put(bar, 'transform', endT >= 0 ? `scaleX(${Math.min(1, endT / (playing ? 1.0 : 2.2)).toFixed(3)})` : 'scaleX(0)');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // for checking without watching: run the show clock forward
  window.__portfolio = { ST, NX, nextUrl, get playing() { return playing; }, get endT() { return endT; }, get goT() { return goT; } };
})();
