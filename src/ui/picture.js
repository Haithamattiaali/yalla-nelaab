// Complete the picture: one part is in place, three float around; he taps a part and it
// flies home; when the picture is whole it comes alive and says what it is.
// A tap counts for the nearest floating part; after a few quiet seconds a hand shows one.
import { hereLine, clipKey, sharedKey } from '../core/lines.js';

const clipFor = (qx, qy) => `inset(${qy ? 50 : 0}% ${qx ? 0 : 50}% ${qy ? 0 : 50}% ${qx ? 50 : 0}%)`;

export function start(ctx, target) {
  document.body.classList.toggle('no-sun', target.id === 'sun');
  const W = innerWidth, H = innerHeight, land = W >= H;
  const S = Math.round(Math.min(Math.min(W, H) * 0.56, W * 0.7));
  const fl = Math.round((W - S) / 2), ft = Math.round(land ? (H - S) / 2 + H * 0.04 : H * 0.16);
  const frame = document.createElement('div'); frame.className = 'frame';
  Object.assign(frame.style, { left: fl + 'px', top: ft + 'px', width: S + 'px', height: S + 'px' });
  ctx.stage.appendChild(frame);
  const spots = land
    ? [[fl - S * 0.36, ft + S * 0.22], [fl - S * 0.36, ft + S * 0.8], [fl + S + S * 0.36, ft + S * 0.5]]
    : [[W * 0.2, ft + S + S * 0.38], [W * 0.5, ft + S + S * 0.38], [W * 0.8, ft + S + S * 0.38]];
  const setIdx = Math.floor(ctx.rng() * 4);
  let k = 0, done = false;

  const pieces = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([qx, qy], i) => {
    const w = document.createElement('div'); w.className = 'pw';
    Object.assign(w.style, { left: fl + 'px', top: ft + 'px', width: S + 'px', height: S + 'px', transformOrigin: `${(qx * 0.5 + 0.25) * 100}% ${(qy * 0.5 + 0.25) * 100}%` });
    const c = document.createElement('div'); c.className = 'pc';
    c.style.fontSize = Math.round(S * 0.78) + 'px';
    c.style.clipPath = c.style.webkitClipPath = clipFor(qx, qy);
    c.textContent = target.emoji; c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'piece');
    w.appendChild(c); ctx.stage.appendChild(w);
    const p = { w, c, ox: 0, oy: 0, hx: 0, hy: 0, rot: 0, seed: ctx.rng() * 6, placed: i === setIdx, flying: false };
    if (!p.placed) {
      const qc = [fl + S * (qx * 0.5 + 0.25), ft + S * (qy * 0.5 + 0.25)], sp = spots[k++];
      p.hx = sp[0] - qc[0]; p.hy = sp[1] - qc[1]; p.ox = p.hx; p.oy = p.hy;
      w.classList.add('loose');
      p.qc = qc;
    }
    return p;
  });

  function draw(p, t) {
    if (!p.placed && !p.flying) {
      p.ox = p.hx + Math.sin(t * 0.0012 + p.seed) * innerHeight * 0.015;
      p.oy = p.hy + Math.cos(t * 0.001 + p.seed) * innerHeight * 0.015;
      p.rot = Math.sin(t * 0.0009 + p.seed) * 7;
    }
    p.w.style.transform = `translate(${p.ox}px, ${p.oy}px) rotate(${p.rot}deg)`;
  }
  function whole() {
    if (done || !pieces.every(p => p.placed)) return;
    done = true;
    pieces.forEach(p => p.w.remove()); frame.style.display = 'none';
    const el = document.createElement('div'); el.className = 'whole';
    Object.assign(el.style, { left: fl + 'px', top: ft + 'px', width: S + 'px', height: S + 'px', fontSize: Math.round(S * 0.78) + 'px' });
    el.textContent = target.emoji; ctx.stage.appendChild(el);
    ctx.burst(el); ctx.setPrompt(hereLine(target)); ctx.setHint('');
    ctx.say(clipKey(target.id, 'here'), 'cheer');
    ctx.finish(true);
  }

  const IDLE_MS = 3500;
  let idle = null;
  function waitThenShow() {
    clearTimeout(idle);
    idle = setTimeout(() => {
      const p = pieces.find(q => !q.placed && !q.flying);
      if (!p || done) return;
      p.w.classList.add('pulse');
      ctx.guide(() => (p.placed || p.flying || done ? null : spot(p)));
    }, IDLE_MS);
  }
  const spot = p => ({ x: p.qc[0] + p.ox, y: p.qc[1] + p.oy });
  waitThenShow();

  ctx.setPrompt('إيه ده؟ 🤔');
  ctx.setHint('اسأله «إيه ده؟» وسيبه يكمّل الصورة');
  ctx.say(sharedKey('what'));
  pieces.forEach(p => draw(p, performance.now()));

  return {
    pieces,
    tap(x, y) {
      if (done) return false;
      let best = null, bestD = Infinity;
      for (const p of pieces) {
        if (p.placed || p.flying) continue;
        const c = spot(p), d = Math.hypot(x - c.x, y - c.y);
        if (d <= S * 0.42 && d < bestD) { best = p; bestD = d; }   // a quarter is S/2 wide; reach a bit beyond it
      }
      if (!best) return false;
      best.flying = true; best.w.classList.remove('pulse'); ctx.unguide(); ctx.sfx.whoosh();
      waitThenShow();
      return true;
    },
    tick(t) {
      for (const p of pieces) {
        if (p.flying) {
          p.ox *= 0.82; p.oy *= 0.82; p.rot *= 0.8;
          if (Math.hypot(p.ox, p.oy) < 1.5) {
            p.ox = p.oy = p.rot = 0; p.flying = false; p.placed = true;
            p.w.classList.remove('loose'); ctx.sfx.click(); whole();
          }
        }
        if (p.w.isConnected) draw(p, t);
      }
    },
    stop() { clearTimeout(idle); document.body.classList.remove('no-sun'); },
  };
}
