const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let W, H, dpr, TOP = 76, PX = 4;
const lowCv = document.createElement('canvas'), lctx = lowCv.getContext('2d');

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  PX = Math.max(3, Math.min(6, Math.round(Math.min(W, H) / 110)));
  lowCv.width = Math.ceil(W / PX); lowCv.height = Math.ceil(H / PX);
  TOP = $('hud').offsetTop + $('hud').offsetHeight + 10;
}
window.addEventListener('resize', resize);
resize();

let best = 0;
try { best = Number(localStorage.getItem('rc_best')) || 0; } catch (_) { /* Storage may be disabled. */ }
const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#ff8fd0', '#4cc9f0', '#ffffff'];
let slots = 4, rippleId = 0, refunded = false, level = 1, score = 0;
let lives = 3, cpScore = 0, boost = 0, radiusMul = 1, echoMul = 1, speedMul = 1, scoreMul = 1, bonusTaps = 0;
let energy = 0, armed = null, vortex = null, slow = 0, mod = '', shrineDone = false, pwKey = '';
let boss = null, projs = [], fx = [], flashT = 0, overdrive = 0, beatStreak = 0, bossPops = 0, lastTapX = 0, geyser = null, geyserT = 6, zaps = [];
const relicStacks = {};
let taps = 4, popped = 0, target = 4;
let orbs = [], ripples = [], particles = [], links = [], floats = [];
let chain = 0, combo = 0, comboTimer = 0, shake = 0, freeze = 0;
let state = 'start', time = 0, lockUntil = 0;

const radius = () => Math.max(60, Math.min(110, Math.min(W, H) * 0.14)) * radiusMul;
const BOT = 96;
const ghostVis = o => Math.sin(time * 1.4 + o.phase) > -0.1;
const backEase = x => { const c = 2.70158, k = x - 1; return 1 + c * k * k * k + 1.70158 * k * k; };
function bump(id) { const element = $(id); element.classList.remove('bump'); void element.offsetWidth; element.classList.add('bump'); }

const HINTS = {
  1: 'Heaven: tap to ripple. Tap ON THE BEAT for a bonus!', 2: 'Soul orbs charge powers. Ripples light up shrines!', 3: 'Star orbs give an extra tap.',
  4: 'Limbo: halo orbs make your next ripple HUGE! VORT unlocked.', 5: 'Bomb orbs explode in a giant ripple.', 6: 'Shielded orbs take two hits.',
  7: 'Purgatory: magnets pull orbs together. PRISM unlocked.', 8: 'Splitters burst into two orbs.', 9: 'Frost orbs freeze time.',
  10: 'Abyss: ghost orbs fade. BOLT unlocked.', 11: 'Imp orbs run from your taps!', 12: 'Cursed skulls cost a tap!', 13: 'Hell: REWND unlocked. Super orbs are worth triple.'
};
const MODS = { gale: 'Gale: winds push the orbs!', lowg: 'Gravity storm!', strobe: 'Strobe: orbs show only on the beat.' };
function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.remove('show');
  void element.offsetWidth;
  element.classList.add('show');
}
function showHint() { bossInit(); if (boss) { toast(`BOSS: ${boss.name}! Ripples hurt it. Pop orbs for taps.`); return; } const t = [HINTS[level], mod && MODS[mod]].filter(Boolean).join(' '); if (t) toast(t); }

function gainTap(orb, message) {
  taps = Math.min(7, taps + 1);
  floats.push({ x: orb.x, y: orb.y - 24, text: message, color: '#ffd166', life: 1.5 });
  note(9, 0.06);
  updateHud();
}
function crack(orb) { confetti(orb.x, orb.y, '#fff'); note(3, 0.05); shake = Math.min(6, shake + 1); }

function specialKinds() {
  const kinds = [], add = (count, kind) => { for (let i = 0; i < count; i++) kinds.push(kind); };
  if (level >= 2) add(1, 'soul');
  if (level >= 3) add(1, 'star');
  if (level >= 4) add(1, 'halo');
  if (level >= 5) add(1 + Math.floor((level - 5) / 4), 'bomb');
  if (level >= 6) add(Math.min(5, level - 5), 'shield');
  if (level >= 6) add(1, 'zap');
  if (level >= 7) add(1, 'magnet');
  if (level >= 8) add(Math.min(3, 1 + Math.floor((level - 8) / 4)), 'split');
  if (level >= 9) add(1, 'frost');
  if (level >= 10) add(Math.min(4, 1 + Math.floor((level - 10) / 3)), 'ghost');
  if (level >= 11) add(Math.min(3, 1 + Math.floor((level - 11) / 3)), 'imp');
  if (level >= 12) add(Math.min(3, level - 11), 'curse');
  if (level >= 13) add(Math.min(3, 1 + Math.floor((level - 13) / 2)), 'super');
  return kinds;
}

function makeOrbs(count) {
  orbs = [];
  const kinds = specialKinds();
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speedMultiplier = (level <= 3 ? 0.6 : 1 + (level - 3) * 0.12) * speedMul;
    const speed = (12 + Math.random() * 18) * speedMultiplier;
    const kind = kinds[i] || 'normal';
    orbs.push({
      x: 30 + Math.random() * Math.max(1, W - 60),
      y: TOP + 30 + Math.random() * Math.max(60, H - TOP - BOT - 50),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: PX * (kind === 'bomb' || kind === 'magnet' || kind === 'super' ? 5 : 3.5 + Math.random() * 1.5),
      color: kind === 'super' ? '#ffd166' : COLORS[i % COLORS.length],
      phase: Math.random() * Math.PI * 2, born: time + i * 0.04,
      kind, hp: kind === 'shield' ? 2 : 1, lastRipple: 0
    });
  }
}

function setup() {
  const heaven = level <= 3;
  const count = Math.min(38, heaven ? 8 + level * 2 : 14 + level * 2);
  makeOrbs(count);
  target = heaven ? Math.ceil(count * 0.5) : Math.min(Math.ceil(count * 0.7), 5 + Math.floor(level * 1.5));
  taps = Math.min(7, (heaven ? 4 : 3) + bonusTaps);
  slots = taps;
  refunded = false;
  popped = 0;
  ripples = [];
  particles = [];
  links = [];
  floats = [];
  chain = 0;
  combo = 0;
  freeze = 0;
  state = 'play';
  boost = 0; armed = null; vortex = null; slow = 0; shrineDone = false; pwKey = ''; fx.length = 0; projs.length = 0; zaps.length = 0; geyser = null; geyserT = 6; overdrive = 0; beatStreak = 0; bossPops = 0; boss = null; bossOn = false;
  mod = level >= 3 && Math.random() < 0.6 ? ['gale', 'lowg', 'strobe'][Math.floor(Math.random() * 3)] : '';
  musicRealm(realmIdx(level));
  if ((level - 1) % 3 === 0) cpScore = score;
  loadThemeAssets(level);
  showHint();
  lockUntil = performance.now() + 250;
  updateHud();
  showOverlay(false);
}

const POWERS = [
  { id: 'slow', name: 'SLOW', cost: 35, realm: 0 }, { id: 'vortex', name: 'VORT', cost: 50, realm: 1 }, { id: 'prism', name: 'PRISM', cost: 50, realm: 2 },
  { id: 'bolt', name: 'BOLT', cost: 60, realm: 3 }, { id: 'grab', name: 'GRAB', cost: 30, realm: 1 }, { id: 'nova', name: 'NOVA', cost: 70, realm: 3 }, { id: 'rewind', name: 'REWND', cost: 80, realm: 4 }
];
const BOSS_NAMES = ['THE FALLEN SERAPH', 'STORM GATEKEEPER', 'STONE WARDEN', 'THE DEEP ONE', 'LORD OF ASH'];
function burst(x, y, n, cols, sp, g = 160, life = 0.8) {
  for (let i = 0; i < n && fx.length < 320; i++) { const a = Math.random() * 6.28, v = sp * (0.3 + Math.random() * 0.7); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.2, g, life: life * (0.5 + Math.random() * 0.5), max: life, c: cols[i % cols.length] }); }
}
function ring(x, y, c, max = 70) { fx.push({ x, y, ring: 1, r: 4, vr: max / 0.35, life: 0.35, max: 0.35, c }); }
function fxUpdate(dt) {
  flashT = Math.max(0, flashT - dt * 2.5);
  for (let i = fx.length - 1; i >= 0; i--) { const p = fx[i]; p.life -= dt; if (p.life <= 0) { fx.splice(i, 1); continue; } if (p.ring) p.r += p.vr * dt; else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; } }
}
function fxDraw(g, S) {
  for (const p of fx) {
    if (p.ring) { const R = Math.round(p.r / S); pxRing(g, Math.round(p.x / S), Math.round(p.y / S), R, Math.max(0, R - 1), p.c); continue; }
    g.fillStyle = p.c; const s = p.life / p.max > 0.5 ? 2 : 1; g.fillRect(Math.round(p.x / S), Math.round(p.y / S), s, s);
  }
  if (flashT > 0) { g.globalAlpha = Math.min(0.6, flashT); g.fillStyle = '#ffffff'; g.fillRect(0, 0, lowCv.width, lowCv.height); g.globalAlpha = 1; }
}
function arc(from, hops, range) {
  let cur = from;
  for (let n = 0; n < hops; n++) { let bi = -1, bd = range; orbs.forEach((o, i) => { const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; bi = i; } }); if (bi < 0) break; const o = orbs[bi], src = cur; cur = { x: o.x, y: o.y }; popOrb(o, bi, src); }
}
function geyserUpdate(dt) {
  if (boss || realmIdx(level) < 3) return;
  if (geyser) {
    if ((geyser.t -= dt) <= 0) { for (const o of orbs) if (Math.abs(o.x - geyser.x) < 36) o.vy = -280; burst(geyser.x, H - BOT, 28, ['#ffd166', '#ff8a1f', '#e8500f'], 260, 300, 1.1); ring(geyser.x, H - BOT, '#ff8a1f', 60); shake = 6; sfx('boom2'); geyser = null; geyserT = 5 + Math.random() * 3; }
  } else if ((geyserT -= dt) <= 0) { geyser = { x: 40 + Math.random() * (W - 80), t: 1.1 }; sfx('warn'); }
}
function bossInit() {
  boss = null; projs.length = 0; bossOn = false;
  if (level % 3 !== 0) return;
  const i = realmIdx(level), max = 8 + i * 3 + Math.max(0, level - 15), sc = Math.ceil(W / PX) >= 140 ? 2 : 1;
  boss = { i, max, hp: max, name: BOSS_NAMES[i], sc, x: W / 2, y: TOP + 90, t: 0, cd: 2.5, flash: 0, spawn: 1, rad: HALF * sc * PX * 0.7, seen: new Set() };
  bossOn = true; mod = ''; orbs.length = Math.min(orbs.length, 12); target = max; popped = 0; taps = 7; sfx('sting');
}
function bossAttack(rage) {
  const b = boss, n = rage ? 5 : 3, sp = 70 + b.i * 14, col = ['#ffffff', '#9fb0ff', '#ffb347', '#8bff6a', '#ff5d3a'][b.i];
  const shot = (vx, vy) => projs.push({ x: b.x, y: b.y + b.rad * 0.6, vx, vy, r: PX * 2.5, c: col });
  const rain = k => { for (let j = 0; j < k; j++) projs.push({ x: 20 + Math.random() * (W - 40), y: TOP, vx: 0, vy: sp * 1.3, r: PX * 2.5, c: col }); };
  if (b.i === 0 || b.i === 2) for (let k = 0; k < n; k++) shot((k - (n - 1) / 2) * 38, sp);
  else if (b.i === 1) rain(n);
  else if (b.i === 3) { const dx = lastTapX - b.x, dy = H - BOT - b.y, d = Math.hypot(dx, dy) || 1; for (let k = -1; k <= 1; k++) shot(dx / d * sp * 1.4 + k * 30, dy / d * sp * 1.4); }
  else { for (let k = 0; k < 3; k++) shot((k - 1) * 45, sp * 1.2); rain(rage ? 3 : 1); }
  sfx('shoot');
}
function bossDefeat() {
  const b = boss; boss = null; bossOn = false; projs.length = 0; sfx('win'); flashT = 0.9; shake = 14; ring(b.x, b.y, '#ffffff', 220);
  burst(b.x, b.y, 90, ['#ffffff', '#ffd166', '#ff8a1f', '#ff5d6c'], 340, 200, 1.4);
  for (const o of orbs) burst(o.x, o.y, 6, [o.color], 120);
  orbs.length = 0; lives = Math.min(5, lives + 1); score += Math.round(300 * level * scoreMul); toast('BOSS SLAIN! +1 life'); popped = target;
}
function bossUpdate(dt) {
  const b = boss; if (!b) return;
  b.t += dt; b.x = W / 2 + Math.sin(b.t * (0.6 + b.i * 0.12)) * W * 0.3; b.y = TOP + 90 + Math.sin(b.t * 1.3) * 12; b.flash = Math.max(0, b.flash - dt); musicHype(9);
  if ((b.cd -= dt) <= 0) { const rage = b.hp < b.max / 2; b.cd = (rage ? 2.2 : 3.4) - b.i * 0.25; bossAttack(rage); }
  if (orbs.length < 7 && (b.spawn -= dt) <= 0) { b.spawn = 2.2; orbs.push({ x: 30 + Math.random() * (W - 60), y: TOP + 160 + Math.random() * 100, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, r: PX * 4, color: COLORS[Math.floor(Math.random() * COLORS.length)], phase: Math.random() * 6.28, born: time, kind: Math.random() < 0.2 ? 'soul' : 'normal', hp: 1, lastRipple: 0 }); }
  for (const r of ripples) if (r.life < 0.85 && !b.seen.has(r.id) && Math.hypot(r.x - b.x, r.y - b.y) < r.r + b.rad) {
    b.seen.add(r.id); const dmg = r.big ? 2 : 1; b.hp -= dmg; b.flash = 0.3; shake = 6; sfx('hit'); popped = Math.max(0, b.max - Math.max(0, b.hp));
    burst(b.x, b.y, 16, ['#ffffff', '#ffd166', '#ff5d6c'], 200); floats.push({ x: b.x, y: b.y - b.rad, text: `-${dmg}`, color: '#ff5d6c', life: 1.2 });
    if (b.hp <= 0) { bossDefeat(); updateHud(); return; }
    updateHud();
  }
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.x += p.vx * dt; p.y += p.vy * dt; let dead = false;
    for (const r of ripples) if (r.life < 0.9 && Math.hypot(r.x - p.x, r.y - p.y) < r.r + p.r) { dead = true; score += Math.round(10 * level * scoreMul); energy = Math.min(100, energy + 3); sfx('ping'); burst(p.x, p.y, 8, [p.c, '#ffffff'], 120); break; }
    if (!dead && p.y > H - BOT - 4) { dead = true; taps = Math.max(0, taps - 1); shake = 9; flashT = 0.3; boom(); burst(p.x, p.y, 20, ['#ff5d6c', '#ffd166'], 220); floats.push({ x: p.x, y: p.y - 20, text: '-1 tap', color: '#ff5d6c', life: 1.4 }); updateHud(); }
    if (dead || p.x < -20 || p.x > W + 20) projs.splice(i, 1);
  }
}
function drawBoss(g, S, lw) {
  if (geyser) { g.fillStyle = '#ff8a1f'; for (let j = 0; j < 12; j++) if (((time * 12 | 0) + j) & 1) g.fillRect(Math.round(geyser.x / S), Math.round((H - BOT) / S) - j * 3, 1, 2); }
  if (!boss) return;
  const b = boss, sc = b.sc, fr = spriteFrames(REALMS[b.i].char)[(time * 3 | 0) & 1], bx = Math.round(b.x / S - HALF * sc), by = Math.round(b.y / S - 10 * sc) + (b.flash > 0 ? Math.round(Math.sin(time * 60)) : 0);
  g.drawImage(fr, bx, by, HALF * 2 * sc, 21 * sc);
  if (b.flash > 0) pxDither(g, Math.round(b.x / S), Math.round(b.y / S), Math.round(b.rad / S), '#ffffff', 1);
  const bw = Math.round(lw * 0.6), x0 = (lw - bw) >> 1, y0 = Math.round(TOP / S) + 26;
  g.fillStyle = '#1a1646'; g.fillRect(x0 - 1, y0 - 1, bw + 2, 5); g.fillStyle = '#4a1a5e'; g.fillRect(x0, y0, bw, 3); g.fillStyle = b.hp < b.max / 2 ? '#ff5d3a' : '#ff5d6c'; g.fillRect(x0, y0, Math.round(bw * Math.max(0, b.hp) / b.max), 3);
  for (const p of projs) { const px = Math.round(p.x / S), py = Math.round(p.y / S); pxCircle(g, px, py, 2, p.c); g.fillStyle = '#ffffff'; g.fillRect(px, py - 1, 1, 1); g.globalAlpha = 0.5; g.fillStyle = p.c; g.fillRect(px, py - 5, 1, 3); g.globalAlpha = 1; }
}
function updatePowers() {
  const r = realmIdx(level), key = `${energy | 0}|${armed}|${r}`; if (key === pwKey) return; pwKey = key;
  $('pw').innerHTML = `<div id="eb"><i style="width:${Math.round(energy)}%"></i></div>` + POWERS.filter(p => p.realm <= r).map(p => `<button type="button" data-p="${p.id}" class="${energy >= p.cost ? 'ok' : ''}${armed === p.id ? ' armed' : ''}">${p.name}<small>${p.cost}</small></button>`).join('');
}
function usePower(id) {
  const p = POWERS.find(q => q.id === id); if (!p || state !== 'play') return;
  if (armed === id) armed = null;
  else if (energy < p.cost) toast('Need more soul energy!');
  else if (id === 'slow') { energy -= p.cost; slow = 4; musicFilter(4); toast('Time crawls...'); }
  else if (id === 'grab') { energy -= p.cost; vortex = { x: W / 2, y: (TOP + H - BOT) / 2, t: 1.2 }; toast('Gathering the souls...'); sfx('power'); }
  else if (id === 'nova') { energy -= p.cost; for (const o of [...orbs].sort(() => Math.random() - 0.5).slice(0, 5)) addRipple(o.x, o.y, radius() * 0.9, 0.95, true); flashT = 0.4; toast('NOVA!'); sfx('boom2'); }
  else if (id === 'rewind') { energy -= p.cost; taps = Math.min(7, taps + 2); toast('Rewound: +2 taps'); }
  else { armed = id; toast(`${p.name} armed: tap to unleash!`); }
  updateHud();
}
function tapEffect(x, y) {
  lastTapX = x; const ph = beatPhase(), onBeat = ph >= 0 && (ph < 0.12 || ph > 0.88), big = boost; boost = 0;
  const pw = armed && POWERS.find(p => p.id === armed); armed = null;
  if (pw) energy = Math.max(0, energy - pw.cost);
  const R = radius() * (big ? 1.7 : 1) * (onBeat ? 1.25 : 1) * (overdrive > 0 ? 1.3 : 1);
  if (onBeat) { score += Math.round(15 * level * scoreMul); energy = Math.min(100, energy + 4); floats.push({ x, y: y - 30, text: 'ON BEAT!', color: '#ffd166', life: 1.3 }); sfx('ping'); if (++beatStreak % 3 === 0) { energy = Math.min(100, energy + 25); floats.push({ x, y: y - 50, text: 'GROOVE x' + beatStreak, color: '#7be0ff', life: 1.5 }); sfx('power'); } } else beatStreak = 0;
  for (const o of orbs) if (o.kind === 'imp') { const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy) || 1; if (d < 280) { o.vx = dx / d * 150; o.vy = dy / d * 150; } }
  if (pw && pw.id === 'vortex') { vortex = { x, y, t: 1.4 }; return; }
  if (pw && pw.id === 'bolt') {
    addRipple(x, y, 36, 0.4, true); let cur = { x, y };
    for (let n = 0; n < 6; n++) { let bi = -1, bd = 260; orbs.forEach((o, i) => { const d = Math.hypot(o.x - cur.x, o.y - cur.y); if (d < bd) { bd = d; bi = i; } }); if (bi < 0) break; const o = orbs[bi], src = cur; cur = { x: o.x, y: o.y }; popOrb(o, bi, src); }
    return;
  }
  addRipple(x, y, R, 1.05, true); if (big || overdrive > 0) ripples[ripples.length - 1].big = true;
  if (pw && pw.id === 'prism') for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; addRipple(Math.max(10, Math.min(W - 10, x + Math.cos(a) * R * 1.15)), Math.max(TOP, Math.min(H - 10, y + Math.sin(a) * R * 1.15)), R * 0.9, 1.05, true); }
}
function updateHud() {
  updatePowers();
  const realm = realmName(level);
  $('lv').textContent = `${realm} ${level} ♥${lives}`;
  $('sc').textContent = score + (best ? ` / ${best}` : '');
  $('pt').textContent = `${popped}/${target}`;
  slots = Math.max(slots, taps);
  $('dots').classList.toggle('boost', boost > 0);
  $('dots').innerHTML = Array.from({ length: slots }, (_, i) => `<i class="${i < taps ? '' : 'off'}"></i>`).join('');
}

function showOverlay(visible, title, description, button) {
  const overlay = $('ov');
  if (visible) {
    $('t1').textContent = title;
    $('t2').textContent = description;
    $('t3').textContent = button; $('t3').style.display = button ? '' : 'none'; $('rl').innerHTML = '';
    overlay.classList.remove('hide');
  } else overlay.classList.add('hide');
}
const RELICS = [
  { id: 'wide', name: 'Halo Ring', desc: 'Ripples 12% wider', max: 3, fn: () => radiusMul += 0.12 },
  { id: 'tap', name: 'Spare Wing', desc: '+1 tap every level', max: 3, fn: () => bonusTaps++ },
  { id: 'slow', name: 'Feather Fall', desc: 'Orbs drift 12% slower', max: 3, fn: () => speedMul *= 0.88 },
  { id: 'gold', name: 'Gilded Soul', desc: 'Score +25%', max: 4, fn: () => scoreMul += 0.25 },
  { id: 'echo', name: 'Echo', desc: 'Chain ripples 15% wider', max: 3, fn: () => echoMul += 0.15 },
  { id: 'life', name: 'Second Chance', desc: '+1 life (max 5)', max: 9, fn: () => lives = Math.min(5, lives + 1) }
];
function offerRelics() {
  let pool = RELICS.filter(r => (relicStacks[r.id] || 0) < r.max).sort(() => Math.random() - 0.5).slice(0, 3);
  if (!pool.length) pool = [RELICS[5]];
  for (const r of pool) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'relic'; b.innerHTML = `<b>${r.name}</b><span>${r.desc}</span>`;
    b.addEventListener('click', () => { r.fn(); relicStacks[r.id] = (relicStacks[r.id] || 0) + 1; level++; setup(); });
    $('rl').appendChild(b);
  }
}
function addRipple(x, y, maxRadius, duration = 0.95, isTap = false) {
  bgPoke(x / PX, y / PX, isTap ? 1.2 : 0.5);
  ripples.push({ id: ++rippleId, x, y, max: maxRadius, life: 0, duration, r: 0, isTap });
}
function confetti(x, y, color) {
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 190;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60,
      rotation: Math.random() * 6, width: 4 + Math.random() * 5, height: 8 + Math.random() * 7, color, life: 1 });
  }
}

function popOrb(orb, index, source) {
  orbs.splice(index, 1);
  if (orb.kind !== 'curse' && !boss) popped++;
  if (boss && orb.kind !== 'curse' && ++bossPops % 4 === 0) { taps = Math.min(9, taps + 1); floats.push({ x: orb.x, y: orb.y - 30, text: '+1 tap', color: '#7be0ff', life: 1.4 }); sfx('power'); }
  energy = Math.min(100, energy + (orb.kind === 'soul' ? 35 : 5 + Math.min(chain, 6)));
  const points = orb.kind === 'curse' ? 0 : Math.round(10 * (1 + chain) * (orb.kind === 'super' ? 3 : 1) * scoreMul * (overdrive > 0 ? 2 : 1));
  score += points;
  note(chain);
  chain++;
  musicHype(chain);
  const isB = orb.kind === 'bomb';
  burst(orb.x, orb.y, isB ? 34 : 9, isB ? ['#ffd166', '#ff8a1f', '#ff5d3a', '#ffffff'] : [orb.color, '#ffffff'], isB ? 280 : 130);
  ring(orb.x, orb.y, isB ? '#ffd166' : '#ffffff', isB ? 120 : 26); if (isB) flashT = 0.5; else sfx('pop');
  if (orb.kind === 'zap') zaps.push({ x: orb.x, y: orb.y });
  if (chain === 8) { overdrive = 6; toast('OVERDRIVE! x2 score, wider ripples'); sfx('power'); }
  combo = chain;
  comboTimer = 1;
  links.push({ x1: source.x, y1: source.y, x2: orb.x, y2: orb.y, life: 1 });
  const bomb = orb.kind === 'bomb';
  addRipple(orb.x, orb.y, radius() * (bomb ? 1.9 : 0.85) * echoMul, bomb ? 1.15 : 0.85);
  confetti(orb.x, orb.y, bomb ? '#ff9f1c' : orb.color);
  if (bomb) { shake = 8; boom(); }
  if (orb.kind === 'star') gainTap(orb, '+1 tap');
  if (orb.kind === 'halo') { boost = 1; toast('Next ripple is HUGE!'); note(8, 0.07); }
  if (orb.kind === 'curse') { taps = Math.max(0, taps - 1); floats.push({ x: orb.x, y: orb.y - 24, text: '-1 tap', color: '#ff5d6c', life: 1.5 }); shake = 8; note(1, 0.08); }
  if (orb.kind === 'split') for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; orbs.push({ x: orb.x, y: orb.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, r: PX * 3, color: orb.color, phase: Math.random() * 6.28, born: time + 0.35, kind: 'normal', hp: 1, lastRipple: 0 }); }
  if (orb.kind === 'frost') { freeze = 3.5; musicFilter(3.5); toast('Time Frozen!'); note(7, 0.08); }
  if (chain >= 5 && !refunded) { refunded = true; gainTap(orb, 'Chain bonus +1 tap'); }
  floats.push({ x: orb.x, y: orb.y, text: `+${points}`, color: orb.color, life: 1 });
  shake = Math.min(6, shake + 1.2);
  bump('p1');
  updateHud();
}

function handleTap(x, y) {
  if (performance.now() < lockUntil) return;
  audio();
  if (state === 'start' || state === 'lost') {
    if (state === 'lost' && lives <= 0) { level -= (level - 1) % 3; score = cpScore; lives = 3; }
    setup();
    return;
  }
  if (state !== 'play' || taps <= 0 || y < TOP) return;
  taps--;
  tapEffect(x, y);
  note(0, 0.05);
  updateHud();
}
canvas.addEventListener('pointerdown', event => {
  event.preventDefault();
  handleTap(event.clientX, event.clientY);
});
$('t3').addEventListener('click', () => handleTap(W / 2, Math.max(TOP + 1, H / 2)));

function update(dt) {
  time += dt;
  if (freeze > 0) freeze = Math.max(0, freeze - dt);
  for (const magnet of orbs) if (magnet.kind === 'magnet') {
    for (const orb of orbs) {
      if (orb === magnet) continue;
      const dx = magnet.x - orb.x, dy = magnet.y - orb.y, distance = Math.hypot(dx, dy);
      if (distance < 170 && distance > 12) {
        orb.vx += dx / distance * 120 * dt;
        orb.vy += dy / distance * 120 * dt;
        const speed = Math.hypot(orb.vx, orb.vy);
        if (speed > 85) { orb.vx *= 85 / speed; orb.vy *= 85 / speed; }
      }
    }
  }
  fxUpdate(dt); overdrive = Math.max(0, overdrive - dt);
  if (state === 'play') { bossUpdate(dt); geyserUpdate(dt); }
  for (const z of zaps.splice(0)) arc(z, 3, 200);
  slow = Math.max(0, slow - dt);
  const sp = slow > 0 ? 0.2 : 1;
  if (mod === 'gale') { const wind = Math.sin(time * 0.5) * 60; for (const o of orbs) o.vx += wind * dt; }
  if (mod === 'lowg') for (const o of orbs) o.vy += 70 * dt;
  if (mod) for (const o of orbs) { const v = Math.hypot(o.vx, o.vy); if (v > 240) { o.vx *= 240 / v; o.vy *= 240 / v; } }
  if (vortex) {
    vortex.t -= dt;
    for (const o of orbs) { const dx = vortex.x - o.x, dy = vortex.y - o.y, d = Math.hypot(dx, dy) || 1; o.vx += dx / d * 520 * dt; o.vy += dy / d * 520 * dt; const v = Math.hypot(o.vx, o.vy); if (v > 200) { o.vx *= 200 / v; o.vy *= 200 / v; } }
    if (vortex.t <= 0) { addRipple(vortex.x, vortex.y, radius() * 1.3, 1.0, true); shake = 7; note(5, 0.08); vortex = null; }
  }
  if (state === 'play') {
    const sl = shrineCheck(ripples.filter(r => r.life < 0.8), PX);
    if (sl) {
      score += Math.round(25 * level * sl * scoreMul); energy = Math.min(100, energy + 12 * sl); note(7, 0.07); toast(`Shrine lit! ${shrineLit()}/${shrineTotal()}`);
      if (!shrineDone && shrineLit() >= shrineTotal()) { shrineDone = true; gainTap({ x: W / 2, y: H / 2 }, 'Shrines awakened! +1 tap'); }
      updateHud();
    }
  }
  for (const orb of orbs) if (freeze <= 0) {
    orb.x += orb.vx * dt * sp;
    orb.y += orb.vy * dt * sp;
    if (orb.x < orb.r) { orb.x = orb.r; orb.vx *= -1; }
    if (orb.x > W - orb.r) { orb.x = W - orb.r; orb.vx *= -1; }
    if (orb.y < TOP + orb.r) { orb.y = TOP + orb.r; orb.vy *= -1; }
    if (orb.y > H - BOT - orb.r) { orb.y = H - BOT - orb.r; orb.vy *= -1; }
  }

  for (let k = ripples.length - 1; k >= 0; k--) {
    const ripple = ripples[k];
    ripple.life += dt / ripple.duration;
    if (ripple.life >= 1) { ripples.splice(k, 1); continue; }
    ripple.r = ripple.max * (1 - Math.pow(1 - ripple.life, 3));
    if (ripple.life < 0.8) for (let i = orbs.length - 1; i >= 0; i--) {
      const orb = orbs[i];
      if (time >= orb.born + 0.3 && orb.lastRipple !== ripple.id && (orb.kind !== 'ghost' || ghostVis(orb)) && Math.hypot(orb.x - ripple.x, orb.y - ripple.y) < ripple.r + orb.r) {
        if (orb.kind === 'shield' && orb.hp > 1) { orb.hp--; orb.lastRipple = ripple.id; crack(orb); }
        else popOrb(orb, i, ripple);
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 380 * dt; particle.life -= dt * 1.2;
    if (particle.life <= 0) particles.splice(i, 1);
  }
  for (let i = links.length - 1; i >= 0; i--) { links[i].life -= dt * 2.2; if (links[i].life <= 0) links.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].y -= 45 * dt; floats[i].life -= dt * 1.1; if (floats[i].life <= 0) floats.splice(i, 1); }
  if (!ripples.length) { chain = 0; refunded = false; }
  comboTimer = Math.max(0, comboTimer - dt * 1.3);
  shake *= Math.pow(0.003, dt);

  if (state === 'play' && (taps === 0 || (!orbs.length && !boss)) && !ripples.length) {
    const save = () => { if (score > best) best = score; try { localStorage.setItem('rc_best', String(best)); } catch (_) { /* optional */ } };
    lockUntil = performance.now() + 600; bossOn = false; sfx(popped >= target ? 'win' : 'lose'); boss = null; projs.length = 0;
    if (popped >= target) {
      const perfect = !orbs.length, bonus = Math.round((100 * level + taps * 30 * level + (perfect ? 150 * level : 0)) * scoreMul);
      score += bonus; save(); state = 'choose'; updateHud();
      showOverlay(true, perfect ? `PURIFIED! Lv ${level}` : `Level ${level} Cleared!`, `Popped ${popped}/${target}. Bonus +${bonus}. Choose a blessing:`, '');
      offerRelics();
    } else {
      lives--; save(); state = 'lost'; updateHud();
      showOverlay(true, lives > 0 ? 'Soul Lost' : 'Game Over', lives > 0 ? `Popped ${popped}/${target}. ${lives} ${lives === 1 ? 'life' : 'lives'} left.` : `Final score: ${score}. Back to the ${realmName(level)} gates.`, lives > 0 ? 'Retry' : 'Try Again');
    }
  }
}

function draw() {
  const g = lctx, lw = lowCv.width, lh = lowCv.height, S = PX;
  g.imageSmoothingEnabled = false; g.globalAlpha = 1;
  renderBackgroundAndSprites(g, lw, lh, frameDelta);
  const GAP = 8, ox = (lw % GAP) >> 1, oy = (lh % GAP) >> 1;
  const rs = ripples.map(r => ({ x: r.x / S, y: r.y / S, r: r.r / S, life: r.life }));
  g.fillStyle = '#ffffff';
  for (let y = oy; y < lh; y += GAP) for (let x = ox; x < lw; x += GAP) {
    let px = x, py = y, k = 0;
    for (const r of rs) { const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy), w = (d - r.r) / 3, inf = Math.exp(-w * w) * (1 - r.life);
      if (inf > 0.05) { k += inf; if (d) { px += dx / d * inf * 2; py += dy / d * inf * 2; } } }
    g.globalAlpha = k > 0.15 ? 0.9 : 0.28; const s = k > 0.5 ? 2 : 1; g.fillRect(Math.round(px), Math.round(py), s, s);
  }
  g.globalAlpha = 1; g.fillStyle = '#ffffff';
  for (const l of links) { const n = Math.max(2, Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1) / S / 3));
    for (let i = 0; i <= n; i++) if (i % 2 === 0 || l.life > 0.5) g.fillRect(Math.round((l.x1 + (l.x2 - l.x1) * i / n) / S), Math.round((l.y1 + (l.y2 - l.y1) * i / n) / S), 1, 1); }
  for (const r of ripples) {
    const cx = Math.round(r.x / S), cy = Math.round(r.y / S), R = Math.round(r.r / S); if (R < 1) continue;
    pxDither(g, cx, cy, R, r.big ? '#ffd166' : '#ffffff', r.life < 0.4 ? 1 : r.life < 0.75 ? 2 : 0);
    const th = r.life < 0.5 ? 2 : 1; pxRing(g, cx, cy, R, Math.max(0, R - th), r.big ? '#ffd166' : '#ffffff');
    if (R > 4) pxRing(g, cx, cy, R - th - 1, Math.max(0, R - th - 2), '#9fe7ff');
  }
  drawBoss(g, S, lw);
  { const ph = beatPhase(), cx = lw >> 1, cy = Math.round(TOP / S) + 9;
    if (ph >= 0) { const e = Math.round((1 - ph) * 9); pxRing(g, cx, cy, 4, 3, ph < 0.12 || ph > 0.88 ? '#ffd166' : '#ffffff'); if (e) pxRing(g, cx, cy, 4 + e, 3 + e, '#ffffff'); } }
  if (vortex) { const R2 = Math.round(radius() * 0.9 * (vortex.t / 1.4) / S) + 2, vx = Math.round(vortex.x / S), vy = Math.round(vortex.y / S); pxRing(g, vx, vy, R2, R2 - 1, '#a78bfa'); pxRing(g, vx, vy, R2 + 3, R2 + 2, '#ffffff'); }
  for (const o of orbs) {
    const b = Math.max(0, Math.min(1, (time - o.born) / 0.5)); if (b <= 0) continue;
    g.globalAlpha = Math.min(o.kind === 'ghost' && !ghostVis(o) ? 0.25 : 1, mod === 'strobe' && beatPhase() > 0.3 ? 0.12 : 1);
    drawOrb(g, Math.round(o.x / S), Math.round(o.y / S) + Math.round(Math.sin(time * 2 + o.phase) * 1.2), Math.max(1, Math.round(o.r / S * backEase(b))), o, time);
  }
  g.globalAlpha = 1;
  fxDraw(g, S);
  for (const p of particles) { g.fillStyle = p.color; const s = p.life > 0.5 ? 2 : 1; g.fillRect(Math.round(p.x / S), Math.round(p.y / S), s, s); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
  const sh = () => shake > 0.1 ? Math.round((Math.random() - 0.5) * shake / S) * S : 0;
  ctx.drawImage(lowCv, sh(), sh(), lw * S, lh * S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px "Press Start 2P", monospace';
  if (boss) { ctx.globalAlpha = 1; ctx.font = '9px "Press Start 2P", monospace'; const ny = (Math.round(TOP / S) + 26) * S + 3 * S + 12; ctx.fillStyle = '#1a1646'; ctx.fillText(boss.name, W / 2 + 1, ny + 1); ctx.fillStyle = '#ffffff'; ctx.fillText(boss.name, W / 2, ny); ctx.font = '12px "Press Start 2P", monospace'; }
  for (const f of floats) { ctx.globalAlpha = Math.min(1, f.life * 1.6); ctx.fillStyle = '#1a1646'; ctx.fillText(f.text, Math.round(f.x) + 2, Math.round(f.y) - 12); ctx.fillStyle = f.color; ctx.fillText(f.text, Math.round(f.x), Math.round(f.y) - 14); }
  if (comboTimer > 0 && combo > 1) {
    ctx.globalAlpha = comboTimer * 0.6; ctx.font = `${40 + Math.min(combo, 10) * 4}px "Press Start 2P", monospace`;
    const cy = TOP + (H - TOP) / 2; ctx.fillStyle = '#1a1646'; ctx.fillText(`x${combo}`, W / 2 + 4, cy + 4); ctx.fillStyle = '#ffffff'; ctx.fillText(`x${combo}`, W / 2, cy);
  }
  ctx.globalAlpha = 1;
}

let frameDelta = 0;
let lastFrame = performance.now();
loadThemeAssets(1);
updateHud();
function loop(now) {
  frameDelta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(frameDelta);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
$('pw').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const b = e.target.closest('button'); if (b) usePower(b.dataset.p); });
$('mu').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audio(); $('mu').textContent = toggleMusic() ? '♪' : '×'; });
