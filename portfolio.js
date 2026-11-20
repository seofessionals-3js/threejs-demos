// three.js Portfolio: one continuous show. When a demo (or one of its variants) has played to its end, the next
// one loads and plays by itself, and after the last demo the show starts again with Demo 1.
// The same file sits in every demo repo. Demo 1 runs its own three sheets and hands over to Demo 2 itself.
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

  // ---- the hand-over card and the pill, in the house style of the demos (dark paper, cyan accent)
  const css = document.createElement('style');
  css.textContent = `
  #pf-card { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; opacity: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: #050506; color: #f1eeea; text-transform: uppercase; transition: none; }
  #pf-card .k { font: 500 10px 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .24em; color: #96938f; }
  #pf-card .n { font: 600 15px 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .3em; color: #43c4d2; padding: 3px 10px; border: 1px solid #43c4d2; }
  #pf-card .t { font: 600 clamp(36px, 5vw, 64px)/1 'Chakra Petch', sans-serif; letter-spacing: .02em; text-align: center; padding: 0 16px; }
  #pf-card .s { font: 500 11px 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .2em; color: #96938f; }
  #pf-pill { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 2147482000;
    display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px; border: 1px solid rgba(67,196,210,.55);
    background: rgba(8,8,10,.86); color: #f1eeea; font: 600 10px 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .16em; text-transform: uppercase; cursor: pointer; opacity: 0; transition: opacity .4s;
    -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); white-space: nowrap; }
  #pf-pill.on { opacity: 1; }
  #pf-pill i { width: 7px; height: 7px; border-radius: 50%; background: #43c4d2; flex: none; }
  #pf-pill.paused i { background: transparent; border: 1px solid #43c4d2; width: 5px; height: 5px; }
  #pf-pill b { position: absolute; left: 0; bottom: -1px; height: 2px; background: #43c4d2; width: 0; }
  @media (max-width: 700px) { #pf-pill { bottom: 8px; font-size: 9px; letter-spacing: .1em; } }`;
  document.head.appendChild(css);
  const card = document.createElement('div'); card.id = 'pf-card'; card.setAttribute('aria-hidden', 'true');
  card.innerHTML = '<span class="k"></span><span class="n"></span><span class="t"></span><span class="s"></span>';
  const pill = document.createElement('button'); pill.id = 'pf-pill'; pill.type = 'button';
  const ST_PILL = () => ST.pillTop;
  pill.innerHTML = '<i></i><span></span><b></b>';
  const setCard = (s, k) => {
    card.querySelector('.k').textContent = k;
    card.querySelector('.n').textContent = pad(s.demo);
    card.querySelector('.t').textContent = 'three.js Demo ' + s.demo;
    card.querySelector('.s').textContent = s.name;
  };
  if (ST_PILL()) Object.assign(pill.style, { top: ST_PILL() + 'px', bottom: 'auto' });   // Demo 5 keeps its plan at the bottom, the pill goes under its toolbar
  const mount = () => { document.body.appendChild(card); document.body.appendChild(pill); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  // ---- state
  let playing = AUTO, u = null, endT = -1, goT = -1, gone = false, t0 = performance.now(), last = t0, built = false;
  const say = (txt, paused) => { const sp = pill.querySelector('span'); if (sp.textContent !== txt) sp.textContent = txt; pill.classList.toggle('paused', !!paused); };
  const maxY = () => Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - innerHeight);
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

  if (AUTO) { setCard(ST, 'three.js Portfolio'); card.style.opacity = '1'; }

  function tick(now) {
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;   // wall clock, so a slow machine keeps the pace
    const T = (now - t0) / 1000;
    // arriving: this demo's own card lifts off the page
    if (AUTO && goT < 0) card.style.opacity = String(1 - Math.min(1, Math.max(0, (T - 0.35) / 0.7)));
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
      card.style.opacity = String(Math.min(1, goT / 0.55));
      if (goT > 0.75 && !gone) { gone = true; location.href = nextUrl; }
    }
    // the pill: what is happening and what comes next
    const showPill = AUTO || endT >= 0 || !playing && u != null;
    pill.classList.toggle('on', showPill && goT < 0 && T > 1.2);
    if (endT >= 0) say(`Weiter: Demo ${NX.demo} · ${NX.name}`);
    else if (playing) say('Portfolio läuft · Scrollen übernimmt');
    else say('▶ Portfolio abspielen', true);
    const bar = pill.querySelector('b');
    bar.style.width = endT >= 0 ? `${Math.min(100, endT / (playing ? 1.0 : 2.2) * 100)}%` : '0';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // for checking without watching: run the show clock forward
  window.__portfolio = { ST, NX, nextUrl, get playing() { return playing; }, get endT() { return endT; }, get goT() { return goT; } };
})();
