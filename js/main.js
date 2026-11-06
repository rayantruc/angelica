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
const relicStacks = {};
let taps = 4, popped = 0, target = 4;
let orbs = [], ripples = [], particles = [], links = [], floats = [];
let chain = 0, combo = 0, comboTimer = 0, shake = 0, freeze = 0;
let state = 'start', time = 0, lockUntil = 0;

const radius = () => Math.max(60, Math.min(110, Math.min(W, H) * 0.14)) * radiusMul;
const ghostVis = o => Math.sin(time * 1.4 + o.phase) > -0.1;
const backEase = x => { const c = 2.70158, k = x - 1; return 1 + c * k * k * k + 1.70158 * k * k; };
function bump(id) { const element = $(id); element.classList.remove('bump'); void element.offsetWidth; element.classList.add('bump'); }

const HINTS = {
  1: 'Heaven: tap to send ripples. Catch the orbs!', 2: 'Chain pops for bigger combo points.', 3: 'Star orbs give you an extra tap.',
  4: 'Limbo: halo orbs make your next ripple HUGE!', 5: 'Bomb orbs explode in a giant ripple.', 6: 'Purgatory: shielded orbs take two hits.',
  7: 'Magnet orbs pull the others together.', 8: 'Frost orbs freeze time.', 9: 'Abyss: ghost orbs fade. Hit them while visible!',
  11: 'Hell: cursed skulls cost you a tap!', 12: 'Super orbs are worth triple.', 13: 'Endless descent. Good luck.'
};
function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.remove('show');
  void element.offsetWidth;
  element.classList.add('show');
}
function showHint() { if (HINTS[level]) toast(HINTS[level]); }

function gainTap(orb, message) {
  taps = Math.min(7, taps + 1);
  floats.push({ x: orb.x, y: orb.y - 24, text: message, color: '#ffd166', life: 1.5 });
  note(9, 0.06);
  updateHud();
}
function crack(orb) { confetti(orb.x, orb.y, '#fff'); note(3, 0.05); shake = Math.min(6, shake + 1); }

function specialKinds() {
  const kinds = [], add = (count, kind) => { for (let i = 0; i < count; i++) kinds.push(kind); };
  if (level >= 3) add(1, 'star');
  if (level >= 4) add(1, 'halo');
  if (level >= 5) add(1 + Math.floor((level - 5) / 4), 'bomb');
  if (level >= 6) add(Math.min(5, level - 5), 'shield');
  if (level >= 7) add(1, 'magnet');
  if (level >= 8) add(1, 'frost');
  if (level >= 9) add(Math.min(4, 1 + Math.floor((level - 9) / 3)), 'ghost');
  if (level >= 11) add(Math.min(3, level - 10), 'curse');
  if (level >= 12) add(Math.min(3, 1 + Math.floor((level - 12) / 2)), 'super');
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
      y: TOP + 30 + Math.random() * Math.max(60, H - TOP - 60),
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
  boost = 0;
  if ((level - 1) % 3 === 0) cpScore = score;
  loadThemeAssets(level);
  showHint();
  lockUntil = performance.now() + 250;
  updateHud();
  showOverlay(false);
}

function updateHud() {
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
  if (orb.kind !== 'curse') popped++;
  const points = orb.kind === 'curse' ? 0 : Math.round(10 * (1 + chain) * (orb.kind === 'super' ? 3 : 1) * scoreMul);
  score += points;
  note(chain);
  chain++;
  combo = chain;
  comboTimer = 1;
  links.push({ x1: source.x, y1: source.y, x2: orb.x, y2: orb.y, life: 1 });
  const bomb = orb.kind === 'bomb';
  addRipple(orb.x, orb.y, radius() * (bomb ? 1.9 : 0.85) * echoMul, bomb ? 1.15 : 0.85);
  confetti(orb.x, orb.y, bomb ? '#ff9f1c' : orb.color);
  if (bomb) shake = 8;
  if (orb.kind === 'star') gainTap(orb, '+1 tap');
  if (orb.kind === 'halo') { boost = 1; toast('Next ripple is HUGE!'); note(8, 0.07); }
  if (orb.kind === 'curse') { taps = Math.max(0, taps - 1); floats.push({ x: orb.x, y: orb.y - 24, text: '-1 tap', color: '#ff5d6c', life: 1.5 }); shake = 8; note(1, 0.08); }
  if (orb.kind === 'frost') { freeze = 3.5; toast('Time Frozen!'); note(7, 0.08); }
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
  const big = boost; boost = 0;
  addRipple(x, y, radius() * (big ? 1.7 : 1), 1.05, true);
  if (big) ripples[ripples.length - 1].big = true;
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
  for (const orb of orbs) if (freeze <= 0) {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    if (orb.x < orb.r) { orb.x = orb.r; orb.vx *= -1; }
    if (orb.x > W - orb.r) { orb.x = W - orb.r; orb.vx *= -1; }
    if (orb.y < TOP + orb.r) { orb.y = TOP + orb.r; orb.vy *= -1; }
    if (orb.y > H - orb.r) { orb.y = H - orb.r; orb.vy *= -1; }
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

  if (state === 'play' && (taps === 0 || !orbs.length) && !ripples.length) {
    const save = () => { if (score > best) best = score; try { localStorage.setItem('rc_best', String(best)); } catch (_) { /* optional */ } };
    lockUntil = performance.now() + 600;
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
  for (const o of orbs) {
    const b = Math.max(0, Math.min(1, (time - o.born) / 0.5)); if (b <= 0) continue;
    g.globalAlpha = o.kind === 'ghost' && !ghostVis(o) ? 0.25 : 1;
    drawOrb(g, Math.round(o.x / S), Math.round(o.y / S) + Math.round(Math.sin(time * 2 + o.phase) * 1.2), Math.max(1, Math.round(o.r / S * backEase(b))), o, time);
  }
  g.globalAlpha = 1;
  for (const p of particles) { g.fillStyle = p.color; const s = p.life > 0.5 ? 2 : 1; g.fillRect(Math.round(p.x / S), Math.round(p.y / S), s, s); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1;
  const sh = () => shake > 0.1 ? Math.round((Math.random() - 0.5) * shake / S) * S : 0;
  ctx.drawImage(lowCv, sh(), sh(), lw * S, lh * S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '12px "Press Start 2P", monospace';
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
