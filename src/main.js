import './style.css';
import Lenis from 'lenis';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const params = new URLSearchParams(location.search);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('static');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = window.matchMedia('(max-width: 760px)').matches || (!finePointer && Math.min(screen.width, screen.height) < 820);

// ---------------- loader ----------------
const loaderEl = $('#loader');
const bar = $('#loaderBar');
const pctEl = $('#loaderPct');
let target = 0, shown = 0;
const setTarget = (v) => { target = Math.max(target, Math.min(1, v)); };
function animLoader() {
  shown += (target - shown) * 0.12;
  if (target - shown < 0.004) shown = target;
  const p = Math.round(shown * 100);
  bar.style.width = p + '%';
  pctEl.textContent = p + '%';
  if (shown < 1) requestAnimationFrame(animLoader);
  else finishLoader();
}
let finished = false;
function finishLoader() {
  if (finished) return;
  finished = true;
  setTimeout(() => {
    loaderEl.classList.add('is-done');
    root.classList.add('is-ready');
    revealInView();
  }, 250);
}
requestAnimationFrame(animLoader);
setTarget(0.08);
const minTime = new Promise((r) => setTimeout(r, params.has('shot') ? 200 : 900));
const fontsReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => setTarget(0.3));

// ---------------- WebGL stage ----------------
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
let stage = null;
async function initStage() {
  if (reduced) { root.classList.add('reduced'); setTarget(1); return; }
  if (!webglOK()) { root.classList.add('no-webgl'); setTarget(1); return; }
  try {
    await fontsReady; // the tile textures draw text, so fonts first
    const { createStage } = await import('./scene.js');
    setTarget(0.45);
    stage = createStage($('#webgl'), { mobile, onProgress: (p) => setTarget(0.45 + p * 0.5) });
    window.__stage = stage;
    stage.start();
    stage.setScroll(sceneProgress());
  } catch (e) {
    console.warn('WebGL stage failed, using the static fallback', e);
    root.classList.add('no-webgl');
  }
  setTarget(0.96);
}
Promise.all([initStage(), minTime, fontsReady]).then(() => setTarget(1));
// never let the loader trap the page
setTimeout(() => setTarget(1), 8000);

document.addEventListener('visibilitychange', () => {
  if (!stage) return;
  document.hidden ? stage.stop() : stage.start();
});

// ---------------- smooth scroll ----------------
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.2 });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  window.__lenis = lenis;
}
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const el = id === '#top' ? document.body : $(id);
  if (!el) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { offset: 0, duration: 1.6 });
  else el.scrollIntoView();
  history.replaceState(null, '', id);
}));

// ---------------- scroll → camera / progress / nav ----------------
const sections = $$('[data-scene]');
let tops = [];
function measure() {
  const max = document.documentElement.scrollHeight - innerHeight;
  tops = sections.map((s) => Math.min(s.offsetTop, max));
}
const smooth = (t) => t * t * (3 - 2 * t);
function sceneProgress() {
  const y = window.scrollY;
  const n = tops.length;
  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    if (y >= tops[i]) {
      const span = Math.max(1, tops[i + 1] - tops[i]);
      idx = i + smooth(Math.min(1, (y - tops[i]) / span));
    }
  }
  return idx / (n - 1);
}
const progressBar = $('#progressBar');
const nav = $('#nav');
const navLinks = $$('.nav__links a');
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  if (stage) { stage.setScroll(sceneProgress()); stage.setVelocity((y - lastY) * 0.5); }
  nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.8);
  lastY = y;
  let current = '';
  for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.45) current = s.id;
  navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current));
}
measure();
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { measure(); stage && stage.resize(); onScroll(); });
window.addEventListener('load', () => { measure(); onScroll(); });

// ---------------- reveals + count-up ----------------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting || !root.classList.contains('is-ready')) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
    $$('[data-count]', e.target).forEach(countUp);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
function revealInView() {
  $$('.reveal:not(.is-in)').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in'); io.unobserve(el); $$('[data-count]', el).forEach(countUp); }
  });
}
function countUp(el) {
  if (reduced || el.dataset.done) return;
  el.dataset.done = '1';
  const end = +el.dataset.count, suf = el.dataset.suffix || '';
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1400);
    el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------- pointer: parallax, cursor, tilt, magnetic ----------------
window.addEventListener('pointermove', (e) => {
  const x = (e.clientX / innerWidth) * 2 - 1;
  const y = -((e.clientY / innerHeight) * 2 - 1);
  stage && stage.setMouse(x, y);
}, { passive: true });
// gentle tilt from the phone itself is not used (needs a permission prompt on iOS)

if (finePointer && !reduced) {
  root.classList.add('has-cursor');
  const cur = $('#cursor');
  const dot = $('.cursor__dot', cur);
  const ring = $('.cursor__ring', cur);
  const label = $('#cursorLabel');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; cur.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => cur.classList.add('is-down'));
  window.addEventListener('pointerup', () => cur.classList.remove('is-down'));
  const loop = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(loop);
  };
  loop();
  $$('a, button, [data-tilt], .chips li').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const l = el.dataset.cursor;
      if (l) { label.textContent = l; cur.classList.add('is-label'); } else cur.classList.add('is-hover');
    });
    el.addEventListener('pointerleave', () => cur.classList.remove('is-hover', 'is-label'));
  });

  // 3D tilt cards
  $$('[data-tilt]').forEach((el) => {
    const max = +(el.dataset.tiltMax || 10);
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
        el.style.setProperty('--mx', px * 100 + '%');
        el.style.setProperty('--my', py * 100 + '%');
      });
    });
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.transform = ''; });
  });

  // magnetic buttons
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}
