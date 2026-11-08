// Balloons: he blows (or presses and holds), the balloon grows; he taps, it pops,
// and the thing inside comes out. Then the game waits for "كمان؟" (more).
import { hereLine, clipKey, sharedKey } from '../core/lines.js';
import { fillStep, HOLD_STEP } from '../core/blow.js';
import { micOpen, micClose, micRead } from './mic.js';

const COLORS = [['#ff5d73', '#c9184a'], ['#ffb020', '#d97706'], ['#4cc9f0', '#1d7fb8'], ['#8ac926', '#4d8a10'], ['#b388eb', '#7b4fc9'], ['#ff7bd5', '#c2459d']];
let made = 0;

export function start(ctx, target) {
  const [c, d] = COLORS[made++ % COLORS.length], gid = 'bg' + made;
  document.body.classList.toggle('no-sun', target.id === 'sun');
  const el = document.createElement('div');
  el.className = 'balloon'; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'balloon');
  el.innerHTML = `<svg viewBox="0 0 100 150" aria-hidden="true"><defs><radialGradient id="${gid}" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".22" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs><path d="M50 112 C 44 122, 56 130, 50 150" stroke="#8a8a8a" stroke-width="1.5" fill="none"/><path d="M44 106 L56 106 L50 114 Z" fill="${d}"/><ellipse cx="50" cy="55" rx="42" ry="52" fill="url(#${gid})"/></svg><div class="inside">${target.emoji}</div>`;
  const wind = document.createElement('div'); wind.className = 'wind'; wind.textContent = '🌬️';
  ctx.stage.appendChild(el); ctx.stage.appendChild(wind);
  el.style.setProperty('--s', 0.3);

  const b = { el, level: 0, holding: false, ready: false, popped: false, stopped: false };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (b.ready) return pop();
    b.holding = true;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { b.holding = false; });

  function pop() {
    if (b.popped) return;
    b.popped = true;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.38;
    el.remove(); ctx.sfx.noise();
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('div'); s.className = 'shred'; s.style.background = c;
      const ang = ctx.rng() * Math.PI * 2, dist = 12 + ctx.rng() * 22;
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'vmin'); s.style.setProperty('--dy', Math.sin(ang) * dist + 'vmin');
      ctx.stage.appendChild(s); ctx.later(() => s.remove(), 1000);
    }
    const out = document.createElement('div'); out.className = 'reveal'; out.textContent = target.emoji;
    out.style.left = cx + 'px'; out.style.top = cy + 'px'; ctx.stage.appendChild(out);
    ctx.finish(true);
    ctx.later(() => { ctx.setPrompt(hereLine(target)); ctx.say(clipKey(target.id, 'here'), 'cheer'); ctx.burst(out); }, 250);
    // the "more" moment: the next balloon waits for him, then for the parent's Next
    ctx.later(() => {
      ctx.setPrompt('كمان؟ 🎈');
      ctx.setHint('استنى يقول «كمان» أو يشاور — وبعدين اضغط التالي');
      ctx.say(sharedKey('more'));
    }, 2600);
  }

  ctx.setPrompt('انفخ! 🌬️');
  ctx.setHint('خليه ينفخ في الجهاز — أو يضغط على البالونة ويسيبها تكبر');
  ctx.say(sharedKey('blow'));
  micOpen(() => !b.stopped && !b.ready);

  return {
    balloon: b,
    tick(t) {
      if (b.ready || b.popped) return;
      const { rms, threshold } = micRead(t);
      const blow = threshold === null ? 0 : fillStep(rms, threshold);
      const add = blow + (b.holding ? HOLD_STEP : 0);
      b.level = Math.min(1, b.level + add);
      wind.style.opacity = add > 0 ? 1 : 0;
      if (add > 0 && ctx.rng() < 0.12) ctx.sfx.squeak(b.level);
      el.style.setProperty('--s', (0.3 + 0.7 * b.level).toFixed(3));
      if (b.level >= 1) {
        b.ready = true; b.holding = false; micClose(); wind.style.opacity = 0;
        el.classList.add('ready'); ctx.setPrompt('فرقعها! 👆'); ctx.setHint('');
        ctx.say(sharedKey('pop'));
      }
    },
    stop() { b.stopped = true; micClose(); document.body.classList.remove('no-sun'); },
  };
}
