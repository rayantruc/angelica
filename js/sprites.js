// ---------- Pixel-art toolkit: everything is drawn on a tiny canvas, then scaled up without smoothing ----------
const HALF = 14;
const half = s => s[0] === '<' ? s.slice(1).padEnd(HALF, '.') : s.padStart(HALF, '.');
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const BAYER = [[0, 2], [3, 1]];
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

function pxCircle(g, cx, cy, r, col) {
  g.fillStyle = col; const R = (r + .5) * (r + .5);
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(R - dy * dy)); g.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
}
function pxRing(g, cx, cy, ro, ri, col) {
  g.fillStyle = col; const A = (ro + .5) ** 2, B = (ri + .5) ** 2;
  for (let dy = -ro; dy <= ro; dy++) {
    const wo = Math.floor(Math.sqrt(A - dy * dy));
    if (Math.abs(dy) > ri) g.fillRect(cx - wo, cy + dy, 2 * wo + 1, 1);
    else { const wi = Math.floor(Math.sqrt(B - dy * dy)); g.fillRect(cx - wo, cy + dy, wo - wi, 1); g.fillRect(cx + wi + 1, cy + dy, wo - wi, 1); }
  }
}
function pxDither(g, cx, cy, r, col, mode) {
  if (!mode) return; g.fillStyle = col; const R = (r + .5) * (r + .5);
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(R - dy * dy));
    for (let x = -w; x <= w; x++) { const X = cx + x, Y = cy + dy; if (mode === 1 ? ((X + Y) & 1) === 0 : ((X & 1) === 0 && (Y & 1) === 0)) g.fillRect(X, Y, 1, 1); } }
}

// ---------- Orbs ----------
const ICONS = { zap: ['..#..', '.##..', '####.', '..##.', '..#..'], soul: ['.#.#.', '#####', '.###.', '..#..'], split: ['#...#', '.#.#.', '..#..'], imp: ['#...#', '#####', '#.#.#'], halo: ['.###.', '#...#', '.###.'], ghost: ['.###.', '#.#.#', '#####', '#.#.#'], curse: ['.###.', '#.#.#', '.###.', '.#.#.'], star: ['..#..', '#####', '.###.', '.#.#.', '#...#'], super: ['..#..', '#####', '.###.', '.#.#.', '#...#'],
  magnet: ['#...#', '#...#', '#.#.#', '.###.'], frost: ['.#.#.', '..#..', '#####', '..#..', '.#.#.'] };
const ORB_BASE = { zap: '#ffe45e', soul: '#ff8fd0', split: '#06d6a0', imp: '#ff7a3a', halo: '#fff1a8', ghost: '#c8d0ff', curse: '#4a1a5e', bomb: '#2a2d6e', star: '#ffd166', super: '#ffd166', magnet: '#a78bfa', frost: '#4cc9f0' };
function drawOrb(g, x, y, r, o, t) {
  const base = ORB_BASE[o.kind] || o.color, dark = mix(base, '#000000', .35), lite = mix(base, '#ffffff', .55);
  pxCircle(g, x, y, r + 1, '#1a1646'); pxCircle(g, x, y, r, dark); pxCircle(g, x - 1, y - 1, Math.max(1, r - 2), base);
  const hx = x - Math.round(r * .5), hy = y - Math.round(r * .6);
  g.fillStyle = lite; g.fillRect(hx, hy, 2, 1); g.fillRect(hx, hy + 1, 1, 1);
  const ic = ICONS[o.kind];
  if (ic) { g.fillStyle = (o.kind === 'super' && Math.sin(t * 10) > 0) || o.kind === 'halo' ? '#ff9f1c' : o.kind === 'curse' ? '#ff5d6c' : (o.kind === 'ghost' || o.kind === 'zap') ? '#3a3a7a' : '#ffffff';
    ic.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') g.fillRect(x - 2 + i, y - (ic.length >> 1) + j, 1, 1); })); }
  if (o.kind === 'bomb') { pxRing(g, x, y, r + 1, r, '#ffffff'); g.fillStyle = '#ffffff'; g.fillRect(x + 1, y - r - 2, 1, 1); g.fillRect(x + 2, y - r - 3, 1, 1);
    g.fillStyle = Math.sin(t * 14) > 0 ? '#ffd166' : '#ff6b6b'; g.fillRect(x + 3, y - r - 4, 1, 1); }
  if (o.kind === 'shield' && o.hp > 1) pxRing(g, x, y, r + 3, r + 2, '#ffffff');
}

// ---------- Characters: left half is drawn, the right half is mirrored. '<' = left-aligned row, otherwise aligned to the centre ----------
const WING_G = [{ y: 0, r: ['<o', '<oo', '<ogo', '<ogGo', '<oggGo', '<ogGggGo', '<oGoGgGGo', '<oo.oGGGGo', '<....ooGGGo', '<......oGGo', '<.......ooo'] },
                { y: 8, r: ['<o', '<oo', '<ogo', '<ogGo', '<oggGo', '<ogGggGo', '<oGoGgGGo', '<oo.oGGGo', '<....ooGGo', '<......ooo'] }];
const CHARS = {
  angel: { pal: { o: '#2d2250', y: '#ffe066', h: '#ffd25e', H: '#e0a030', s: '#ffd9b3', S: '#e8a98a', e: '#2d2250', p: '#ff9ea8', m: '#c4515c', d: '#ffffff', D: '#bcc8f5', w: '#ffffff', W: '#b9cdf5' },
    body: ['ooooo', 'oyyyyy', 'ooooo', 'ooHhhh', 'ohhhhhh', 'ohhssss', 'ohsssss', 'ohssess', 'ohssess', 'ohsppss', 'ohssssm', 'ooSSSS', 'oddddd', 'oddddddd', 'oyyyyyyy', 'odddddddd', 'oDDDDDDDDD', 'oooooooooo', 'osso.'],
    wings: [{ y: 2, r: ['<o', '<oo', '<owo', '<owwo', '<owwwo', '<owwWwo', '<.owwWwo', '<..owwwwo', '<..owwWwwo', '<...owwwwwo', '<....owwwwwo', '<.....owwwwo', '<......oooo'] },
            { y: 7, r: ['<o', '<owo', '<owwo', '<owwwo', '<owwWwo', '<.owwwWwo', '<.owwwwwwo', '<..owwwwwo', '<...owwwwo', '<....oooo'] }] },
  gargoyle: { pal: { o: '#1b1830', g: '#8a8fa8', G: '#5d6283', l: '#b9bdd4', r: '#ff4a3d', t: '#ffffff', h: '#d8cfa8' },
    body: ['....ho.....', '....hho....', '....ohhoooo', '...ogggggll', '...oggggggg', '...ogGGrrgg', '...oggggggg', '....ooooooo', '....ogtgtgg', '.....oooooo', '....ogggggg', '...oggllggg', '...ogggGGGg', '...ogggGGGG', '....ogGGGGG', '....ogggo..', '....ogggo..', '...oggggo..', '...oooooo..'],
    wings: WING_G },
  demon: { pal: { o: '#2a0a14', r: '#e0364a', R: '#a01c34', l: '#ff6a5e', y: '#ffe45e', t: '#ffffff', h: '#f2e6c0', g: '#b02a42', G: '#7a1830' },
    body: ['....h......', '....hh.....', '....ohhoooo', '...orrrrrrr', '...orRRrrrr', '...orRyyrrr', '...orrrrrrr', '...orrroooo', '....orttttt', '.....orrrrr', '.....oooooo', '....orrrrrr', '...orrlrrrr', '...orrlrRRR', '...orrrRRRR', '....orRRRRR', '....orro...', '....orro...', '...ooooo...'],
    wings: WING_G }
};
const SPR = {};
function spriteFrames(name) {
  if (SPR[name]) return SPR[name];
  const d = CHARS[name];
  SPR[name] = [0, 1].map(f => {
    const c = document.createElement('canvas'); c.width = HALF * 2; c.height = 21; const g = c.getContext('2d');
    const put = (rows, y0) => rows.forEach((row, j) => { if (!row) return; const h = half(row);
      for (let x = 0; x < HALF; x++) { if (h[x] === '.') continue; g.fillStyle = d.pal[h[x]]; g.fillRect(x, y0 + j, 1, 1); g.fillRect(HALF * 2 - 1 - x, y0 + j, 1, 1); } });
    put(d.wings[f].r, d.wings[f].y); put(d.body, f);
    return c;
  });
  return SPR[name];
}

// ---------- Backgrounds (dithered colour bands, ridges, clouds) ----------
function bands(g, w, top, bot, cols) {
  const n = cols.length, bh = (bot - top) / n;
  for (let y = top; y < bot; y++) { const t = (y - top) / bh, i = Math.min(n - 1, Math.floor(t)), f = t - i;
    for (let x = 0; x < w; x++) { g.fillStyle = cols[i + (f > .7 && i < n - 1 && BAYER[y & 1][x & 1] / 4 < (f - .7) / .3 ? 1 : 0)]; g.fillRect(x, y, 1, 1); } }
}
function ridge(g, w, h, base, amp, col, r) {
  let y = base; g.fillStyle = col;
  for (let x = 0; x < w; x++) { y = Math.max(base - amp * 3, Math.min(base + amp * 3, y + (r() - .5) * amp)); g.fillRect(x, Math.round(y), 1, h); }
}
function makeCloud(a, b) {
  const c = document.createElement('canvas'); c.width = 44; c.height = 18; const g = c.getContext('2d');
  const d = [[10, 11, 6], [19, 8, 8], [29, 10, 7], [36, 12, 5], [22, 12, 6]];
  d.forEach(([x, y, r]) => pxCircle(g, x, y + 1, r, b)); d.forEach(([x, y, r]) => pxCircle(g, x, y - 1, r, a));
  g.clearRect(0, 16, 44, 2); return c;
}
function teeth(g, w, h, col, r, top, gap, max) {
  g.fillStyle = col;
  for (let x = 2; x < w; x += gap + Math.floor(r() * gap)) { const len = 3 + Math.floor(r() * max);
    for (let j = 0; j < len; j++) { const wd = Math.max(1, Math.round(6 * (1 - j / len))); g.fillRect(x - (wd >> 1), top ? j : h - 1 - j, wd, 1); } }
}

// ---------- Realms: palette, guardian, animated props, ambient particles ----------
const FL = { w: 14, top: '#ffffff', rock: '#c8d8f5', col: '#e8e4f5' }, FD = { w: 14, top: '#6a6f95', rock: '#454a6e', col: '#8a8fb0' }, FP = { w: 12, top: '#5a2a78', rock: '#35204e', col: '#b04f7a' };
const REALMS = [
  { name: 'Heaven', char: 'angel', at: [[.12, .28], [.84, .25]], cloud: ['#ffffff', '#b7d0f2'], amb: ['#ffffff', 'spark'],
    cols: ['#2f6fcf', '#3f86dd', '#58a0e8', '#7cbcf2', '#a6d4f7', '#cfe9fb', '#ffeccf'],
    props: [['rays', .2, 0], ['float', .15, .5, FL], ['float', .84, .62, { ...FL, col: '#ffe066' }], ['flyer', .1, .22, { s: 7, c: '#ffffff' }], ['flyer', .6, .38, { s: 5, c: '#e8f2ff' }]] },
  { name: 'Limbo', char: 'fallen', at: [[.15, .3], [.85, .28]], cloud: ['#7a7fa5', '#4d5278'], amb: ['#b8b8d8', 'drift'],
    cols: ['#2b3350', '#3d4468', '#555b80', '#737898', '#9a9bb4', '#bdb7c8', '#d9c9c0'],
    props: [['bolt', .3, .5], ['float', .2, .5, FD], ['float', .8, .6, FD], ['flyer', .2, .25, { s: 9, c: '#14162a' }], ['flyer', .7, .4, { s: 6, c: '#14162a' }]] },
  { name: 'Purgatory', char: 'gargoyle', at: [[.18, .34], [.8, .68]], amb: ['#cbb8d8', 'fall'],
    cols: ['#241345', '#3a1d63', '#5a2a78', '#823a80', '#b04f7a', '#dc7466', '#f5a46a'],
    props: [['lamp', .2, .3, { c: '#ffb347' }], ['lamp', .55, .2, { c: '#ffb347' }], ['lamp', .88, .36, { c: '#ffb347' }], ['float', .32, .64, FP], ['wisp', .5, .5, { c: '#9fe7ff' }], ['flyer', .3, .3, { s: 12, c: '#120a24' }], ['flyer', .8, .18, { s: 9, c: '#120a24' }]] },
  { name: 'Abyss', char: 'wraith', at: [[.12, .55], [.86, .4]], amb: ['#6dffb0', 'rise'],
    cols: ['#050a14', '#0a1424', '#10243a', '#173a4a', '#1d4f55'],
    props: [['crystal', .12, .9, { c: '#4cc9f0', hs: [9, 14, 7] }], ['crystal', .55, .94, { c: '#a78bfa', hs: [7, 11, 8] }], ['crystal', .88, .91, { c: '#4cc9f0', hs: [8, 13, 9] }], ['lamp', .3, .34, { c: '#8bff6a', cage: 1 }], ['lamp', .72, .26, { c: '#8bff6a', cage: 1 }], ['wisp', .3, .5, { c: '#6dffb0' }], ['wisp', .7, .62, { c: '#6dffb0' }]] },
  { name: 'Hell', char: 'demon', at: [[.16, .62], [.82, .7]], amb: ['#ffd166', 'rise'],
    cols: ['#12030c', '#2a0716', '#4a0b1c', '#7a1218', '#b02a12'],
    props: [['flame', .1, .92, { h: 14 }], ['flame', .3, .94, { h: 10 }], ['flame', .62, .93, { h: 16 }], ['flame', .9, .92, { h: 12 }], ['bubble', .2, .96], ['lamp', .25, .3, { c: '#ff5d3a', cage: 1 }], ['lamp', .76, .24, { c: '#ff5d3a', cage: 1 }], ['flyer', .2, .3, { s: 14, c: '#2a0a14' }], ['flyer', .6, .18, { s: 10, c: '#2a0a14' }]] }
];
CHARS.fallen = { ...CHARS.angel, pal: { ...CHARS.angel.pal, y: '#8f8fb8', h: '#6a5a8a', H: '#4a3a6a', s: '#c9bfd6', S: '#9a8fb0', d: '#6a6a9a', D: '#4a4a7a', w: '#8a8ab5', W: '#5a5a8a', p: '#b07a9a', e: '#1a1030' } };
CHARS.wraith = { ...CHARS.gargoyle, pal: { ...CHARS.gargoyle.pal, g: '#5a8a8a', G: '#2f5a63', l: '#8fc4b8', r: '#8bff6a', h: '#c8d8b0' } };
REALMS[0].props.push(['comet', .1, .12]);
REALMS[1].props.push(['rain', 0, 0], ['tree', .08, .86, { c: '#14162a' }], ['tree', .92, .84, { c: '#14162a' }], ['lamp', .5, .25, { c: '#9fb0ff' }]);
REALMS[2].props.push(['comet', .3, .1], ['tree', .46, .87, { c: '#241638' }]);
REALMS[3].props.push(['eye', .5, .16, { c: '#8bff6a' }]);
REALMS[4].props.push(['eye', .5, .14, { c: '#ff3a2a' }]);
CHARS.hero = { pal: { o: '#2d2250', y: '#ffe066', h: '#ff7a3a', H: '#c4501c', s: '#ffd9b3', S: '#e8a98a', e: '#2d2250', p: '#ff9ea8', m: '#c4515c', d: '#7be0ff', D: '#3fa5d0', w: '#ffffff', W: '#b9cdf5' },
  body: ['oooo', 'oyyy', 'oooo', 'ohhhh', 'ohhhh', 'ohsss', 'ohsess', 'ohsppm', 'ooSSS', 'oddd', 'odddd', 'oyyyy', 'oddddd', 'oDDDDD', 'oooooo', 'oso.'],
  wings: [{ y: 5, r: ['oo......', 'owwo.....', 'owwwo....', '.owwwo...', '..owwo...'] }, { y: 8, r: ['oo......', 'owwo.....', 'owwwo....', '.owwwo...', '..ooo....'] }] };
const realmIdx = level => Math.min(REALMS.length - 1, Math.floor((level - 1) / 3));
const realmName = level => REALMS[realmIdx(level)].name;

function buildBg(ri, sub, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = rng(ri * 977 + 13);
  const dk = col => mix(col, '#000000', sub * .08), cols = REALMS[ri].cols.map(dk), hh = Math.round;
  bands(g, w, 0, ri === 4 ? h : h, cols);
  if (ri === 0) {
    const pts = []; for (let x = -2; x < w + 8; x += 7) pts.push([x, h - 2 + hh(r() * 3), 4 + hh(r() * 5)]);
    pts.forEach(([x, y, rr]) => pxCircle(g, x, y + 1, rr, '#b7d0f2')); pts.forEach(([x, y, rr]) => pxCircle(g, x, y - 1, rr, '#ffffff'));
  } else if (ri === 1) {
    ridge(g, w, h, h * .8, 2, dk('#2a2f4d'), r);
    for (let i = 0; i < 7; i++) { const bx = Math.floor(r() * w), ht = 6 + Math.floor(r() * 14); g.fillStyle = dk('#1f2340'); g.fillRect(bx, hh(h * .8) - ht, 3, ht + 8); g.fillRect(bx - 1, hh(h * .8) - ht, 5, 1); }
    ridge(g, w, h, h * .9, 2, dk('#14162a'), r);
  } else if (ri === 2) {
    for (let i = 0; i < 30; i++) { g.fillStyle = '#e9d8ff'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h * .4), 1, 1); }
    const mr = Math.max(6, hh(Math.min(w, h) * .13)), mx = hh(w * .74), my = hh(h * .24); pxCircle(g, mx, my, mr, '#c9a46a'); pxCircle(g, mx - 1, my - 1, mr - 1, '#ffe9b0');
    ridge(g, w, h, h * .66, 3, dk('#4a2a63'), r); ridge(g, w, h, h * .76, 3, dk('#35204e'), r); ridge(g, w, h, h * .88, 2, dk('#241638'), r);
    g.fillStyle = dk('#241638'); for (let i = 0; i < 5; i++) { const x = hh(w * (.1 + i * .2) + r() * 8), y = hh(h * .88) - 4; g.fillRect(x, y - 6, 1, 8); g.fillRect(x - 2, y - 4, 5, 1); }
  } else if (ri === 3) {
    ridge(g, w, h, h * .84, 3, dk('#0b1a26'), r); teeth(g, w, h, dk('#03060c'), r, true, 6, 16); teeth(g, w, h, dk('#050b14'), r, false, 7, 10);
  } else {
    teeth(g, w, h, dk('#1a0510'), r, true, 5, 14); ridge(g, w, h, h * .74, 3, dk('#3a0a14'), r); ridge(g, w, h, h * .82, 2, dk('#220610'), r);
    bands(g, w, hh(h * .9), h, ['#ff8a1f', '#e8500f', '#b52a10']);
  }
  return c;
}

// Background particles: feathers (heaven), embers (purgatory), bubbles (abyss), lava eruptions (hell)
const bfx = []; let bfxT = 0;
function lava(x, h, k) { bfx.push({ x, y: h * .9, vx: (Math.random() - .5) * 24, vy: -(40 + Math.random() * 45) * (k || 1), g: 95, life: 4, k: 'l' }); }
function bfxRun(g, w, h, dt) {
  bfxT -= dt;
  if (bfxT <= 0 && bfx.length < 90) { bfxT = [.5, 9, .9, .5, .3][ri] * (.6 + Math.random() * .8);
    if (ri === 0) bfx.push({ x: Math.random() * w, y: -2, vx: 6, vy: 8 + Math.random() * 6, g: 0, life: 14, k: 'f' });
    else if (ri === 2) bfx.push({ x: Math.random() * w, y: -2, vx: -8, vy: 28, g: 18, life: 6, k: 'e' });
    else if (ri === 3) bfx.push({ x: Math.random() * w, y: h + 2, vx: 0, vy: -12 - Math.random() * 10, g: 0, life: 12, k: 'b' });
    else if (ri === 4) lava(Math.random() * w, h); }
  for (let i = bfx.length - 1; i >= 0; i--) {
    const p = bfx[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt;
    if (p.k === 'f' || p.k === 'b') p.x += Math.sin(bgT * 2 + p.life) * 8 * dt;
    const splash = p.k === 'l' && p.vy > 0 && p.y > h * .9;
    if (p.life <= 0 || p.y > h + 4 || p.y < -6 || splash) { if (splash) for (let n = 0; n < 3; n++) bfx.push({ x: p.x, y: p.y, vx: (n - 1) * 14, vy: -20, g: 90, life: .5, k: 'e' }); bfx.splice(i, 1); continue; }
    g.fillStyle = p.k === 'l' ? (p.vy < 0 ? '#ffd166' : '#ff6a1a') : p.k === 'f' ? '#ffffff' : p.k === 'b' ? '#9fe7ff' : '#ffb347';
    const sz = p.k === 'l' ? 2 : 1; g.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
    if (p.k === 'l' || p.k === 'e') { g.globalAlpha = .5; g.fillRect(Math.round(p.x - p.vx * .06), Math.round(p.y - p.vy * .06), 1, 1); g.globalAlpha = 1; }
  }
}
const pulses = [], SHR = { float: -5, lamp: 3, crystal: -6, flame: -5 };
let lit = {}, bossOn = false;
function bgPoke(x, y, s = 1) { pulses.push({ x, y, t: bgT, s }); if (pulses.length > 12) pulses.shift(); if (ri === 4 && bfx.length < 90) lava(x, bgH, s); }
function agit(x, y) { let a = 0; for (const q of pulses) { const age = bgT - q.t; if (age < 2.5) a += q.s * Math.exp(-Math.hypot(x - q.x, y - q.y) / 34) * Math.exp(-age * 1.4); } return Math.min(a, 2); }
const shrines = () => REALMS[ri].props.map((p, i) => [p, i]).filter(([p]) => p[0] in SHR);
const shrineTotal = () => Math.min(3, shrines().length), shrineLit = () => Object.keys(lit).length;
function shrineCheck(rips, S) {
  let n = 0;
  for (const [p, i] of shrines()) { if (lit[i] !== undefined) continue; const x = Math.round(p[1] * bgW) * S, y = (Math.round(p[2] * bgH) + SHR[p[0]]) * S;
    for (const r of rips) if (Math.hypot(r.x - x, r.y - y) < r.r) { lit[i] = bgT; n++; bgPoke(x / S, y / S, 1.5); break; } }
  return n;
}
function drawProp(g, p, w, h, t, i) {
  const [k, fx, fy, a] = p, x = Math.round(fx * w), y = Math.round(fy * h), ph = fx * 17, ag = agit(x, y);
  if (k === 'float') {
    const by = y + Math.round(Math.sin(t * .8 + ph) * (2 + ag * 4)), W = a.w;
    g.fillStyle = a.rock; for (let j = 0; j < W / 2; j++) g.fillRect(x - ((W - j * 2) >> 1), by + 1 + j, W - j * 2, 1);
    g.fillStyle = a.top; g.fillRect(x - (W >> 1), by - 1, W, 2);
    g.fillStyle = a.col; g.fillRect(x - 2, by - 9, 5, 8); g.fillRect(x - 3, by - 10, 7, 1); g.fillRect(x - 3, by - 2, 7, 1);
  } else if (k === 'lamp') {
    const sw = Math.round(Math.sin(t * (1.2 + ag) + ph) * (3 + ag * 6)), lx = x + sw;
    g.fillStyle = '#2a2440'; for (let j = 0; j < y; j += 2) g.fillRect(x + Math.round(sw * j / y), j, 1, 1);
    g.globalAlpha = .4; pxDither(g, lx, y + 3, 7 + (Math.sin(t * 9 + ph) > 0 ? 1 : 0), a.c, 1); g.globalAlpha = 1;
    g.fillStyle = '#1a1646'; g.fillRect(lx - 3, y - 1, 7, 9); g.fillStyle = a.c; g.fillRect(lx - 2, y + 1, 5, 5);
    if (a.cage) { g.fillStyle = '#1a1646'; g.fillRect(lx - 1, y + 1, 1, 5); g.fillRect(lx + 1, y + 1, 1, 5); }
  } else if (k === 'flame') {
    const H = Math.round(a.h * (1 + ag * .6));
    for (let j = 0; j < H; j++) { const ww = Math.max(1, Math.round(6 * (1 - j / H) + Math.sin(t * 10 + j * .8 + ph) * 1.2));
      g.fillStyle = j < a.h * .35 ? '#ffd166' : j < a.h * .7 ? '#ff8a1f' : '#e8500f'; g.fillRect(x - (ww >> 1) + Math.round(Math.sin(t * 6 + j * .5 + ph)), y - j, ww, 1); }
  } else if (k === 'crystal') {
    const c = mix(a.c, '#ffffff', Math.min(1, (Math.sin(t * 2 + ph) + 1) * .18 + ag * .3));
    a.hs.forEach((hh, i) => { const dx = (i - 1) * 5; g.fillStyle = c; for (let j = 0; j < hh; j++) { const ww = Math.max(1, Math.round(4 * (1 - j / hh))); g.fillRect(x + dx - (ww >> 1), y - j, ww, 1); } g.fillStyle = '#ffffff'; g.fillRect(x + dx - 1, y - hh + 3, 1, 2); });
  } else if (k === 'wisp') {
    for (let i = 3; i >= 0; i--) { const tt = t * (1 + ag * 2) - i * .15, wx = x + Math.round(Math.sin(tt * .7 + ph) * 16), wy = y + Math.round(Math.sin(tt * 1.4 + ph) * 6);
      g.globalAlpha = 1 - i * .22; g.fillStyle = a.c; if (i) g.fillRect(wx, wy + 1, 2, 2); else { pxCircle(g, wx, wy, 2, a.c); g.fillStyle = '#1a1646'; g.fillRect(wx - 1, wy - 1, 1, 1); g.fillRect(wx + 1, wy - 1, 1, 1); } }
    g.globalAlpha = 1;
  } else if (k === 'flyer') {
    const px = Math.round((t * a.s + fx * w) % (w + 20)) - 10, py = y + Math.round(Math.sin(t * 2 + ph) * 3 - ag * 6), up = (t * 6 | 0) & 1;
    g.fillStyle = a.c; g.fillRect(px - 3, py + (up ? -1 : 1), 2, 1); g.fillRect(px - 1, py, 3, 1); g.fillRect(px + 2, py + (up ? -1 : 1), 2, 1);
  } else if (k === 'bolt') {
    const u = (t + ph) % 5, n = Math.floor((t + ph) / 5);
    if (u < .25) { const r = rng(n * 31 + 7); let bx = x + Math.round((r() - .5) * 30); g.fillStyle = '#ffffff';
      for (let j = 0; j < y; j += 2) { bx += Math.round((r() - .5) * 6); g.fillRect(bx, j, 2, 2); }
      g.globalAlpha = .3 * (1 - u * 4); g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
  } else if (k === 'bubble') {
    for (let i = 0; i < 5; i++) { const u = (t * .5 + i * .2 + fx) % 1, bx = Math.round(w * (.1 + i * .2 + Math.sin(i * 7) * .05)), by = Math.round(h * .94);
      if (u < .8) pxCircle(g, bx, by - Math.round(u * 2), Math.round(1 + u * 2), '#ffb347'); else { g.fillStyle = '#ffd166'; g.fillRect(bx - 3, by - 2, 1, 1); g.fillRect(bx + 3, by - 2, 1, 1); g.fillRect(bx, by - 4, 1, 1); } }
  } else if (k === 'rays') {
    g.fillStyle = '#ffffff'; g.globalAlpha = .12;
    for (let i = 0; i < 3; i++) { const x0 = Math.round(w * (.2 + i * .3) + Math.sin(t * .3 + i * 2) * 8); for (let j = 0; j < h; j++) g.fillRect(x0 + Math.round(j * .45), j, 4 + i * 2, 1); }
    g.globalAlpha = 1;
  } else if (k === 'comet') {
    const u = (t * .125 + fx) % 1;
    if (u < .12) { const f = u / .12, cx = Math.round(w * 1.1 * (1 - f)), cy = y + Math.round(f * h * .25);
      for (let n = 9; n >= 0; n--) { g.globalAlpha = 1 - n / 10; g.fillStyle = n ? '#ffe9b0' : '#ffffff'; g.fillRect(cx + n * 2, cy - n, 2, 1); } g.globalAlpha = 1; }
  } else if (k === 'tree') {
    const sx = Math.round(Math.sin(t * 18) * ag * 1.5); g.fillStyle = a.c;
    g.fillRect(x + sx, y - 14, 2, 14); g.fillRect(x - 4 + sx, y - 12, 5, 1); g.fillRect(x - 4 + sx, y - 14, 1, 3); g.fillRect(x + 2 + sx, y - 9, 5, 1); g.fillRect(x + 6 + sx, y - 12, 1, 4); g.fillRect(x + sx, y - 17, 1, 3);
  } else if (k === 'eye') {
    const bl = (t + ph) % 4 < .15, q = pulses[pulses.length - 1];
    const dx = q ? Math.max(-3, Math.min(3, Math.round((q.x - x) / 10))) : Math.round(Math.sin(t * .5) * 2), dy = q ? Math.max(-1, Math.min(1, Math.round((q.y - y) / 20))) : 0;
    [[-2, 9], [-1, 13], [0, 15], [1, 13], [2, 9]].forEach(([j, wd]) => { g.fillStyle = '#1a1646'; g.fillRect(x - (wd >> 1), y + j, wd, 1); if (!bl) { g.fillStyle = '#e8e4f5'; g.fillRect(x - (wd >> 1) + 1, y + j, wd - 2, 1); } });
    if (!bl) { pxCircle(g, x + dx, y + dy, 1, a.c); g.fillStyle = '#1a1646'; g.fillRect(x + dx, y + dy, 1, 1); }
  } else if (k === 'rain') {
    g.fillStyle = '#9aa3c8'; g.globalAlpha = .55;
    for (let n = 0; n < 28; n++) g.fillRect(Math.round((n * 37 + t * 22) % w), Math.round((n * 53 + t * 150) % h), 1, 3);
    g.globalAlpha = 1;
  }
  if (lit[i] !== undefined && t - lit[i] < 5) { g.globalAlpha = .5 * (1 - (t - lit[i]) / 5); pxDither(g, x, y + (SHR[k] || 0), 11, '#ffffff', 1); g.globalAlpha = 1; }
}

// ---------- Scene state + renderer (with the scroll-down transition between levels) ----------
let ri = 0, sub = 0, curLevel = 0, bgCv = null, bgW = 0, bgH = 0, clouds = [], amb = [], bgT = 0, sprF = 0, cloudCv = null, prevCv = null, trans = 0;
function rebuildBackground(w, h) {
  bgW = w; bgH = h; bgCv = buildBg(ri, sub, w, h); const r = rng(7), R = REALMS[ri];
  cloudCv = R.cloud ? makeCloud(R.cloud[0], R.cloud[1]) : null;
  clouds = cloudCv ? [0, 1, 2, 3].map(i => ({ x: r() * w, y: h * (.12 + i * .17), s: 1.5 + r() * 2.5 })) : [];
  amb = Array.from({ length: 36 }, () => ({ x: r() * w, y: r() * h, s: .5 + r(), p: r() * 6.28 }));
}
function loadThemeAssets(level) {
  const old = bgCv; ri = realmIdx(level); sub = (level - 1) % 3; rebuildBackground(bgW || 100, bgH || 100);
  if (old && curLevel && level !== curLevel) { prevCv = old; trans = .001; }
  curLevel = level; lit = {};
}
function renderBackgroundAndSprites(g, w, h, dt) {
  if (w !== bgW || h !== bgH) { rebuildBackground(w, h); trans = 0; }
  bgT += dt; sprF = Math.floor(bgT / .45) & 1;
  const R = REALMS[ri]; let off = 0;
  if (trans > 0) { trans += dt / 1.8; if (trans >= 1) { trans = 0; prevCv = null; } else { off = Math.round(h * (1 - trans * trans * (3 - 2 * trans))); if (prevCv) g.drawImage(prevCv, 0, off - h); } }
  g.save(); g.translate(0, off); g.drawImage(bgCv, 0, 0);
  for (const c of clouds) { c.x += c.s * dt; if (c.x > w) c.x = -44; g.drawImage(cloudCv, Math.round(c.x), Math.round(c.y)); }
  const mode = R.amb[1];
  for (const a of amb) {
    if (mode === 'spark') { if (Math.sin(bgT * 2 + a.p) > .55) { g.fillStyle = '#ffffff'; g.fillRect(a.x | 0, a.y * .8 | 0, 1, 1); g.fillRect((a.x | 0) - 1, a.y * .8 | 0, 3, 1); } continue; }
    a.y += ({ rise: -9, fall: 5, drift: 0 }[mode]) * a.s * dt; a.x += (Math.sin(bgT + a.p) * 6 + (mode === 'drift' ? 8 * a.s : 0)) * dt;
    if (a.y < 0) a.y = h; if (a.y > h) a.y = 0; if (a.x > w) a.x = 0; if (a.x < 0) a.x = w;
    g.fillStyle = Math.sin(bgT * 8 + a.p) > 0 ? R.amb[0] : mix(R.amb[0], '#000000', .35); g.fillRect(Math.round(a.x), Math.round(a.y), 1, 1);
  }
  R.props.forEach((p, i) => drawProp(g, p, w, h, bgT, i));
  bfxRun(g, w, h, dt);
  (bossOn ? [] : R.at).forEach(([px, py], i) => { const ag = agit(px * w, py * h), fr = spriteFrames(R.char)[ag > .3 ? (bgT / .12 | 0) & 1 : sprF], x = Math.round(px * w - HALF), y = Math.round(py * h - 10) - Math.round(Math.min(ag, 1.5) * 3);
    if (i) { g.save(); g.translate(x + HALF * 2, y); g.scale(-1, 1); g.drawImage(fr, 0, 0); g.restore(); } else g.drawImage(fr, x, y); });
  g.restore();
  const bp = beatPhase(); if (bp >= 0 && bp < .1) { g.globalAlpha = .07; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; }
  if (trans > 0) { g.fillStyle = '#ffffff'; g.globalAlpha = .5; for (let i = 0; i < 18; i++) g.fillRect((i * 53) % w, h - ((bgT * 380 + i * 47) % (h + 14)), 1, 7); g.globalAlpha = 1; }
}
