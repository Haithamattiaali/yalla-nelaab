// The moving garden: three things move slowly on their own paths; "where is the …?"; he taps the right one.
// A tap counts for the nearest thing, so a small hand does not have to be precise.
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
export const SPEED = 0.5;          // half the speed of the first version: easier to catch
export const REACH = 1.5;          // a tap counts up to 1.5 × the thing's half-size from its centre
const IDLE_MS = 5000;              // no find for 5 s → the right one glows and the hand shows it

export function lane(i) {   // landscape: three columns; portrait: three rows
  if (innerWidth >= innerHeight) return { cx: innerWidth * (0.2 + 0.3 * i), cy: innerHeight * 0.55, ax: innerWidth * 0.045, ay: innerHeight * 0.2 };
  return { cx: innerWidth * 0.5, cy: innerHeight * (0.28 + 0.24 * i), ax: innerWidth * 0.25, ay: innerHeight * 0.02 };
}

function place(a, t) {
  const [dx, dy] = PATHS[a.w.move](t * SPEED, a), L = lane(a.lane), x = L.cx + dx * L.ax, y = L.cy + dy * L.ay;
  a.x = x; a.y = y;
  const flip = FLIPS.has(a.w.move) ? a.flip : 1, rot = a.w.move === 'roll' ? a.spin : 0;
  a.el.style.transform = `translate(${x - a.el.offsetWidth / 2}px, ${y - a.el.offsetHeight / 2}px) scaleX(${flip}) rotate(${rot}deg)`;
}

export function start(ctx, target, others) {
  const all = ctx.shuffle([target, ...others]);
  document.body.classList.toggle('no-sun', all.some(w => w.id === 'sun'));
  let done = false, firstTry = true;
  const actors = all.map((w, i) => {
    const el = document.createElement('div');
    el.className = 'actor'; el.dataset.id = w.id; el.setAttribute('aria-label', w.id);
    el.innerHTML = `<span class="face">${w.emoji}</span>`;
    ctx.stage.appendChild(el);
    const a = { w, el, lane: i, seed: i * 1.7 + ctx.rng(), flip: 1, spin: 0, frozen: false };
    place(a, performance.now());
    return a;
  });
  const goal = actors.find(a => a.w === target);

  function showHim() {   // the right one glows and the hand points at it
    if (done) return;
    goal.el.classList.add('pulse');
    ctx.guide(() => (done ? null : { x: goal.x, y: goal.y + goal.el.offsetHeight * 0.15 }));
  }
  const ask = () => { ctx.setPrompt(whereLine(target), ctx.pictureCue ? target.emoji : ''); ctx.say(clipKey(target.id, 'where')); };

  function choose(a) {
    if (a === goal) {
      done = true; a.frozen = true;
      ctx.unguide(); a.el.classList.remove('pulse');
      a.el.classList.add('found'); ctx.burst(a.el);
      actors.filter(x => x !== a).forEach(x => x.el.classList.add('dim'));
      ctx.setPrompt(hereLine(target), target.emoji); ctx.setHint('سمّي الحاجة تاني، واستنى يقولها — وبعدين اضغط مطوّل ثانية على أي مكان');
      ctx.say(clipKey(target.id, 'here'), 'cheer');
      ctx.finish(firstTry);
    } else {
      firstTry = false;
      a.el.classList.remove('nope'); void a.el.offsetWidth; a.el.classList.add('nope');
      ctx.sfx.nope();
      showHim();
      ctx.later(() => { if (!done) ask(); }, 450);
    }
  }

  ask();
  ctx.setHint('قول الكلمة معاه واستنى يدوّر');
  ctx.later(showHim, IDLE_MS);

  return {
    actors,
    tap(x, y) {
      if (done) return false;
      let best = null, bestD = Infinity;
      for (const a of actors) {
        const r = a.el.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (d <= (Math.max(r.width, r.height) / 2) * REACH && d < bestD) { best = a; bestD = d; }
      }
      if (!best) return false;
      choose(best);
      return true;
    },
    tick(t) { for (const a of actors) if (!a.frozen) place(a, t); },
    stop() { document.body.classList.remove('no-sun'); },
  };
}
