// Procedural chiptune: constant backing track per realm; game events play quantised notes in the current chord.
let AC, MG, LPF, mOn = true, mStep = 0, mNext = 0, mT0 = -1, mRealm = 0, mPending = null, mInten = 0, mNoise = null;
const midi = m => 440 * Math.pow(2, (m - 69) / 12), MAJ = [0, 2, 4, 7, 9], MIN = [0, 3, 5, 7, 10], TR = { M: [0, 4, 7], m: [0, 3, 7] };
const B4 = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], B8 = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const SONGS = [
  { bpm: 108, root: 60, sc: MAJ, prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']], bass: B4, lead: [4, -1, 5, -1, 7, -1, 5, 4, 2, -1, 4, -1, 5, -1, -1, -1] },
  { bpm: 96, root: 57, sc: MIN, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], bass: B4, lead: [0, -1, 2, 3, -1, 2, 0, -1, 4, -1, 3, 2, -1, 0, -1, -1] },
  { bpm: 120, root: 62, sc: MIN, prog: [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'm']], bass: B4, lead: [0, 2, 3, 2, 4, 3, 2, 0, 3, -1, 2, -1, 0, 2, -1, -1] },
  { bpm: 88, root: 55, sc: MIN, prog: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'M']], bass: B8, lead: [0, -1, -1, 2, -1, -1, 3, -1, 2, -1, -1, 0, -1, -1, -1, -1] },
  { bpm: 140, root: 52, sc: MIN, prog: [[0, 'm'], [8, 'M'], [7, 'M'], [1, 'M']], bass: B8, lead: [0, 0, 3, 0, 4, 0, 3, 2, 0, 0, 3, 0, 5, 4, 3, 2] }
];
function tone(f, t, dur, type, vol) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MG); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, vol, hp) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = mNoise; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(MG); s.start(t); s.stop(t + dur);
}
function kick(t) {
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(MG); o.start(t); o.stop(t + 0.16);
}
function playStep(s, t) {
  const S = SONGS[mRealm], spb = 60 / S.bpm, st = s & 15, ch = S.prog[(s >> 4) & 3], r = S.root + ch[0], tones = TR[ch[1]];
  if (st % 8 === 0 || (mRealm === 4 && st % 4 === 0)) kick(t);
  if (st === 4 || st === 12) noise(t, 0.1, 0.12, 1800);
  if (st % 2 === 0 || mInten >= 2) noise(t, 0.03, 0.045, 7000);
  if (S.bass[st]) tone(midi(r - 24), t, spb * 0.45, 'triangle', 0.24);
  if (mInten >= 1 && st % 2 === 1) tone(midi(r + tones[(st >> 1) % 3] + 12), t, 0.12, 'square', 0.03);
  const d = S.lead[st];
  if (d >= 0) { const m = r + S.sc[d % 5] + 12 * Math.floor(d / 5) + 12; tone(midi(m), t, spb * 0.4, 'square', mInten >= 2 ? 0.05 : 0.035); if (mInten >= 2.5) tone(midi(m + 12), t, spb * 0.3, 'square', 0.02); }
  mInten = Math.max(0, mInten - 0.025);
}
function mTick() {
  try {
    while (mNext < AC.currentTime + 0.12) {
      if (mPending !== null && mStep % 16 === 0) { mRealm = mPending; mPending = null; mStep = 0; mT0 = mNext; }
      playStep(mStep, mNext); mNext += 60 / SONGS[mRealm].bpm / 4; mStep++;
    }
  } catch (_) { /* ignore */ }
}
function audio() {
  try {
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)(); MG = AC.createGain(); MG.gain.value = mOn ? 0.55 : 0;
      LPF = AC.createBiquadFilter(); LPF.type = 'lowpass'; LPF.frequency.value = 16000; MG.connect(LPF); LPF.connect(AC.destination);
      mNoise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = mNoise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      mNext = AC.currentTime + 0.1; mT0 = mNext; setInterval(mTick, 30);
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (_) { /* Audio is optional */ }
}
// Game-event note: lands on the next 16th step, in the key/chord of the current bar.
function note(index, volume = 0.07) {
  if (!AC) return;
  try {
    const S = SONGS[mRealm], ch = S.prog[(mStep >> 4) & 3], d = index % 10, m = S.root + ch[0] + S.sc[d % 5] + 12 * Math.floor(d / 5) + 12;
    tone(midi(m), Math.max(AC.currentTime, mNext), 0.3, 'square', volume * 0.6);
  } catch (_) { /* ignore */ }
}
function musicRealm(i) { mPending = i; }
function musicHype(chain) { mInten = Math.min(3, Math.max(mInten, chain / 3)); }
function musicFilter(sec) {
  if (!AC) return; const t = AC.currentTime; LPF.frequency.cancelScheduledValues(t); LPF.frequency.setValueAtTime(450, t); LPF.frequency.setValueAtTime(450, t + sec); LPF.frequency.exponentialRampToValueAtTime(16000, t + sec + 0.6);
}
function boom() { if (AC) { noise(AC.currentTime, 0.45, 0.3, 90); kick(AC.currentTime); } }
function toggleMusic() { mOn = !mOn; if (MG) MG.gain.value = mOn ? 0.55 : 0; return mOn; }
function beatPhase() { if (!AC || mT0 < 0) return -1; const p = ((AC.currentTime - mT0) / (60 / SONGS[mRealm].bpm)) % 1; return p < 0 ? p + 1 : p; }
