// The parent review: mark what he did today, see the week, record your voice,
// confirm a mastered word (a new one comes in), or swap a word by hand.
import { BANK, GROUPS, word } from '../core/words.js';
import { whereLine, hereLine, clipKey, sharedKey, SHARED } from '../core/lines.js';
import { CODES, toggleCode, hasCode, learnedReady, stalled, promote, swap, weekSummary } from '../core/progress.js';
import { putClip, clipKeys } from './store.js';
import { forgetClip, stopVoice, setSession } from './audio.js';

const CODE_NAMES = { '👆': 'فهمها', '🔁': 'قالها وراك', '⭐': 'قالها لوحده', '➕': 'قالها مع كلمة تانية', '✋': 'إشارة بس' };
const GROUP_NAMES = { food: 'أكل وشرب', animals: 'حيوانات', toys: 'لعب', home: 'البيت', outside: 'برّه', body: 'الجسم' };
const MAX_REC_MS = 5000;

let api = null, root = null, have = new Set(), rec = null;

export async function openReview(a) {
  api = a;
  root = document.getElementById('review');
  root.hidden = false;
  have = new Set(await clipKeys());
  render();
}
function close() {
  stopRecording();
  root.hidden = true;
  root.innerHTML = '';
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function clipRow(key, text) {
  return `<span class="rv-clip ${have.has(key) ? 'has' : ''}" data-key="${esc(key)}">
    <span>${esc(text)}</span>
    <button class="rec" data-act="rec" data-key="${esc(key)}" aria-label="record">🎙️</button>
    <button data-act="play" data-key="${esc(key)}" aria-label="play">▶️</button>
  </span>`;
}

function render() {
  const p = api.getProgress(), today = api.today();
  const rows = p.targets.map(t => {
    const w = word(t.id), wk = weekSummary(p, t.id, today);
    const marks = Object.entries(wk.codes).map(([c, n]) => `${c}×${n}`).join(' ') || 'لسه مفيش';
    const ready = learnedReady(p, t.id), stuck = stalled(p, t.id, today);
    return `<div class="rv-word" data-id="${w.id}">
      <div class="rv-top"><span class="rv-pic">${w.emoji}</span><span class="rv-ar">${esc(w.ar)}</span>
        ${ready ? '<span class="rv-badge">⭐ قالها لوحده ٣ أيام في أسبوع</span>' : ''}
        ${stuck ? '<span class="rv-badge stalled">واقفة من أسبوعين — جرّب طريقة تانية أو بدّلها</span>' : ''}</div>
      <div class="rv-codes">${CODES.map(c => `<button class="rv-code ${hasCode(p, w.id, today, c) ? 'on' : ''}" data-act="code" data-id="${w.id}" data-code="${c}" title="${CODE_NAMES[c]}" aria-label="${CODE_NAMES[c]}">${c}</button>`).join('')}</div>
      <div class="rv-week">الأسبوع ده: ${marks} · في الجنينة لقاها من أول مرة ${wk.firstTry} من ${wk.rounds}</div>
      <div class="rv-clips">${clipRow(clipKey(w.id, 'where'), whereLine(w))}${clipRow(clipKey(w.id, 'here'), hereLine(w))}</div>
      <div class="rv-actions">
        ${ready ? `<button class="master" data-act="master" data-id="${w.id}">اتقنها ✓</button>` : ''}
        <button data-act="swap" data-id="${w.id}">بدّلها بكلمة تانية</button>
      </div>
    </div>`;
  }).join('');
  const learned = p.learned.map(l => { const w = word(l.id); return `<span class="rv-chip">${w.emoji} ${esc(w.ar)}</span>`; }).join('') || '<span class="rv-week">لسه مفيش</span>';
  root.innerHTML = `
    <div class="rv-head"><h1>مراجعة البابا والماما</h1><button data-act="close" aria-label="close">✕ رجوع للعب</button></div>
    <div class="rv-note">اللعبة بتساعد، ومش بديل عن تقييم أخصائي تخاطب.</div>
    <div class="rv-legend">علّم اللي عمله النهارده: ${CODES.map(c => `${c} ${CODE_NAMES[c]}`).join(' · ')}</div>
    <div class="rv-legend">الكلمة بتتقفل لما يقولها لوحده (⭐ أو ➕) في ٣ أيام مختلفة جوه أسبوع. سجّل صوتك لكل جملة 🎙️ — التسجيل بيفضل على الجهاز ده بس.</div>
    <div class="rv-sec">الكلمات اللي بنتعلمها (${p.targets.length})</div>
    ${rows}
    <div class="rv-sec">اتقنها (${p.learned.length}) — بتظهر من وقت للتاني للمراجعة</div>
    <div class="rv-learned">${learned}</div>
    <div class="rv-sec">جمل مشتركة</div>
    <div class="rv-word"><div class="rv-clips">${SHARED.map(s => clipRow(sharedKey(s.key), s.text)).join('')}</div></div>`;
}

function toast(text) {
  const t = document.createElement('div'); t.className = 'rv-toast'; t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

function openPicker(oldId) {
  const p = api.getProgress();
  const used = new Set([...p.targets.map(t => t.id), ...p.learned.map(l => l.id)]);
  const box = document.createElement('div'); box.className = 'rv-pick';
  box.innerHTML = `<div><h2>بدّل ${esc(word(oldId).ar)} بـ:</h2>${GROUPS.map(g => {
    const free = BANK.filter(w => w.group === g && !used.has(w.id));
    if (!free.length) return '';
    return `<h2>${GROUP_NAMES[g]}</h2><div class="grid">${free.map(w => `<button data-new="${w.id}">${w.emoji} ${esc(w.ar)}</button>`).join('')}</div>`;
  }).join('')}<div class="rv-actions"><button data-cancel>إلغاء</button></div></div>`;
  box.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (e.target === box || (b && b.hasAttribute('data-cancel'))) return box.remove();
    if (b && b.dataset.new) {
      api.setProgress(swap(api.getProgress(), oldId, b.dataset.new, api.today()));
      box.remove(); render();
    }
  });
  root.appendChild(box);
}

// ----- recording the parent's voice (stays on this device) -----
function stopRecording() {
  if (rec && rec.mr && rec.mr.state !== 'inactive') rec.mr.stop();
}
async function record(key, btn) {
  if (rec) { if (rec.key === key) stopRecording(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('التسجيل مش متاح هنا — افتح اللعبة من Safari'); return; }
  let stream;
  setSession('play-and-record');
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { setSession('playback'); toast('محتاجين إذن الميكروفون عشان نسجّل صوتك'); return; }
  stopVoice();
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
  const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  rec = { key, mr };
  btn.classList.add('on'); btn.textContent = '⏺';
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    clearTimeout(rec && rec.timer);
    stream.getTracks().forEach(t => t.stop());
    setSession('playback');   // back to the loud speaker before playing it back
    rec = null;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
    if (blob.size) { await putClip(key, blob); forgetClip(key); have.add(key); api.say(key); }
    render();
  };
  mr.start();
  rec.timer = setTimeout(stopRecording, MAX_REC_MS);
}

document.addEventListener('click', e => {
  if (!root || root.hidden) return;
  const b = e.target.closest('#review [data-act]');
  if (!b) return;
  const { act, id, code, key } = b.dataset, p = api.getProgress(), today = api.today();
  if (act === 'close') return close();
  if (act === 'code') { api.setProgress(toggleCode(p, id, today, code)); return render(); }
  if (act === 'play') return api.say(key);
  if (act === 'rec') return record(key, b);
  if (act === 'swap') return openPicker(id);
  if (act === 'master') {
    const { progress: q, added } = promote(p, id, today);
    api.setProgress(q);
    render();
    if (added) toast(`دخلت كلمة جديدة: ${word(added).emoji} ${word(added).ar}`);
  }
});
