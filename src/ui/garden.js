// The moving garden: three things move on their own paths; "where is the …?"; he taps the right one.
import { whereLine, hereLine, clipKey } from '../core/lines.js';

// Each thing keeps its own lane, so two never overlap. A path gives an offset (dx, dy) in -1..1.
export const PATHS = {
  walk:   (t, a) => { const p = (t * 0.00025 + a.seed) % 2, x = p < 1 ? p * 2 - 1 : 3 - p * 2; a.flip = p < 1 ? -1 : 1; return [x, 0.5]; },
  bounce: (t, a) => [Math.sin(t * 0.0006 + a.seed) * 0.4, 0.4 - Math.abs(Math.sin(t * 0.003 + a.seed)) * 1.2],
  roll:   (t, a) => { const x = Math.sin(t * 0.0007 + a.seed); a.spin = x * 360; return [x, 0.6]; },
  float:  (t, a) => [Math.sin(t * 0.0005 + a.seed) * 0.7, -0.4 + Math.sin(t * 0.0011 + a.seed) * 0.4],
  drip:   (t, a) => [0, -1 + ((t * 0.0004 + a.seed) % 2)],
  circle: (t, a) => [Math.cos(t * 0.0009 + a.seed), Math.sin(t * 0.0009 + a.seed) * 0.6],
  fly:    (t, a) => { const x = Math.sin(t * 0.0008 + a.seed); a.flip = Math.cos(t * 0.0008 + a.seed) > 0 ? -1 : 1; return [x * 0.9, -0.6 + Math.sin(t * 0.003 + a.seed) * 0.25]; },
  swim:   (t, a) => { const x = Math.sin(t * 0.0006 + a.seed); a.flip = Math.cos(t * 0.0006 + a.seed) > 0 ? -1 : 1; return [x, 0.2 + Math.sin(t * 0.002 + a.seed) * 0.25]; },
};
const FLIPS = new Set(['walk', 'fly', 'swim']);

export function lane(i) {   // landscape: three columns; portrait: three rows
  if (innerWidth >= innerHeight) return { cx: innerWidth * (0.2 + 0.3 * i), cy: innerHeight * 0.55, ax: innerWidth * 0.045, ay: innerHeight * 0.2 };
  return { cx: innerWidth * 0.5, cy: innerHeight * (0.28 + 0.24 * i), ax: innerWidth * 0.25, ay: innerHeight * 0.02 };
}

function place(a, t) {
  const [dx, dy] = PATHS[a.w.move](t, a), L = lane(a.lane), x = L.cx + dx * L.ax, y = L.cy + dy * L.ay;
  a.x = x; a.y = y;
  const flip = FLIPS.has(a.w.move) ? a.flip : 1, rot = a.w.move === 'roll' ? a.spin : 0;
  a.el.style.transform = `translate(${x - a.el.offsetWidth / 2}px, ${y - a.el.offsetHeight / 2}px) scaleX(${flip}) rotate(${rot}deg)`;
}

export function start(ctx, target, others) {
  const all = ctx.shuffle([target, ...others]);
  document.body.classList.toggle('no-sun', all.some(w => w.id === 'sun'));
  document.body.classList.toggle('no-tree', all.some(w => w.id === 'tree'));
  let done = false, firstTry = true;
  const actors = all.map((w, i) => {
    const el = document.createElement('div');
    el.className = 'actor'; el.dataset.id = w.id; el.setAttribute('role', 'button'); el.setAttribute('aria-label', w.id);
    el.innerHTML = `<span class="face">${w.emoji}</span>`;
    ctx.stage.appendChild(el);
    const a = { w, el, lane: i, seed: i * 1.7 + ctx.rng(), flip: 1, spin: 0, frozen: false };
    el.addEventListener('pointerdown', e => { e.preventDefault(); tap(a); });
    place(a, performance.now());
    return a;
  });

  function tap(a) {
    if (done) return;
    if (a.w === target) {
      done = true; a.frozen = true;
      a.el.classList.add('found'); ctx.burst(a.el);
      actors.filter(x => x !== a).forEach(x => x.el.classList.add('dim'));
      ctx.setPrompt(hereLine(target)); ctx.setHint('');
      ctx.say(clipKey(target.id, 'here'), 'cheer');
      ctx.finish(firstTry);
    } else {
      firstTry = false;
      a.el.classList.remove('nope'); void a.el.offsetWidth; a.el.classList.add('nope');
      ctx.sfx.nope();
      ctx.later(() => { if (!done) { ctx.setPrompt(whereLine(target)); ctx.say(clipKey(target.id, 'where')); } }, 450);
    }
  }

  ctx.setPrompt(whereLine(target));
  ctx.setHint('قول الكلمة معاه واستنى يدوّر');
  ctx.say(clipKey(target.id, 'where'));

  return {
    actors,
    tick(t) { for (const a of actors) if (!a.frozen) place(a, t); },
    stop() { document.body.classList.remove('no-sun', 'no-tree'); },
  };
}
