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
const ICONS = { star: ['..#..', '#####', '.###.', '.#.#.', '#...#'], super: ['..#..', '#####', '.###.', '.#.#.', '#...#'],
  magnet: ['#...#', '#...#', '#.#.#', '.###.'], frost: ['.#.#.', '..#..', '#####', '..#..', '.#.#.'] };
const ORB_BASE = { bomb: '#2a2d6e', star: '#ffd166', super: '#ffd166', magnet: '#a78bfa', frost: '#4cc9f0' };
function drawOrb(g, x, y, r, o, t) {
  const base = ORB_BASE[o.kind] || o.color, dark = mix(base, '#000000', .35), lite = mix(base, '#ffffff', .55);
  pxCircle(g, x, y, r + 1, '#1a1646'); pxCircle(g, x, y, r, dark); pxCircle(g, x - 1, y - 1, Math.max(1, r - 2), base);
  const hx = x - Math.round(r * .5), hy = y - Math.round(r * .6);
  g.fillStyle = lite; g.fillRect(hx, hy, 2, 1); g.fillRect(hx, hy + 1, 1, 1);
  const ic = ICONS[o.kind];
  if (ic) { g.fillStyle = o.kind === 'super' && Math.sin(t * 10) > 0 ? '#ff9f1c' : '#ffffff';
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
function makeCloud() {
  const c = document.createElement('canvas'); c.width = 44; c.height = 18; const g = c.getContext('2d');
  const dots = [[10, 11, 6], [19, 8, 8], [29, 10, 7], [36, 12, 5], [22, 12, 6]];
  dots.forEach(([x, y, r]) => pxCircle(g, x, y + 1, r, '#b7d0f2')); dots.forEach(([x, y, r]) => pxCircle(g, x, y - 1, r, '#ffffff'));
  g.clearRect(0, 16, 44, 2); return c;
}
function buildBg(key, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = rng(key.length * 977 + 13);
  if (key === 'heaven') {
    bands(g, w, 0, h, ['#2f6fcf', '#3f86dd', '#58a0e8', '#7cbcf2', '#a6d4f7', '#cfe9fb', '#ffeccf']);
    const pts = []; for (let x = -2; x < w + 8; x += 7) pts.push([x, h - 2 + Math.round(r() * 3), 4 + Math.round(r() * 5)]);
    pts.forEach(([x, y, rr]) => pxCircle(g, x, y + 1, rr, '#b7d0f2')); pts.forEach(([x, y, rr]) => pxCircle(g, x, y - 1, rr, '#ffffff'));
  } else if (key === 'purgatory') {
    bands(g, w, 0, h, ['#241345', '#3a1d63', '#5a2a78', '#823a80', '#b04f7a', '#dc7466', '#f5a46a']);
    for (let i = 0; i < 30; i++) { g.fillStyle = '#e9d8ff'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h * .4), 1, 1); }
    const mr = Math.max(6, Math.round(Math.min(w, h) * .13)); pxCircle(g, Math.round(w * .74), Math.round(h * .24), mr, '#c9a46a'); pxCircle(g, Math.round(w * .74) - 1, Math.round(h * .24) - 1, mr - 1, '#ffe9b0');
    ridge(g, w, h, h * .66, 3, '#4a2a63', r); ridge(g, w, h, h * .76, 3, '#35204e', r); ridge(g, w, h, h * .88, 2, '#241638', r);
  } else {
    bands(g, w, 0, h, ['#12030c', '#2a0716', '#4a0b1c', '#7a1218', '#b02a12']);
    g.fillStyle = '#1a0510'; for (let x = 2; x < w; x += 5 + Math.floor(r() * 4)) { const len = 3 + Math.floor(r() * 14); for (let j = 0; j < len; j++) { const wd = Math.max(1, Math.round(6 * (1 - j / len))); g.fillRect(x - (wd >> 1), j, wd, 1); } }
    ridge(g, w, h, h * .74, 3, '#3a0a14', r); ridge(g, w, h, h * .82, 2, '#220610', r);
    bands(g, w, Math.round(h * .9), h, ['#ff8a1f', '#e8500f', '#b52a10']);
  }
  return c;
}

// ---------- Level themes ----------
const LEVEL_THEMES = {
  heaven: { char: 'angel', at: [[.12, .28], [.84, .25]] },
  purgatory: { char: 'gargoyle', at: [[.18, .34], [.8, .68]] },
  hell: { char: 'demon', at: [[.16, .62], [.82, .7]] }
};
let theme = 'heaven', bgCv = null, bgW = 0, bgH = 0, clouds = [], amb = [], bgT = 0, sprF = 0, cloudCv = null;
function getThemeKey(level) { return level <= 3 ? 'heaven' : level <= 6 ? 'purgatory' : 'hell'; }
function rebuildBackground(w, h) {
  bgW = w; bgH = h; bgCv = buildBg(theme, w, h); const r = rng(7);
  cloudCv = cloudCv || makeCloud();
  clouds = theme === 'heaven' ? [0, 1, 2, 3].map(i => ({ x: r() * w, y: h * (.12 + i * .17), s: 1.5 + r() * 2.5 })) : [];
  amb = Array.from({ length: 36 }, () => ({ x: r() * w, y: r() * h, s: .5 + r(), p: r() * 6.28 }));
}
function loadThemeAssets(level) { theme = getThemeKey(level); rebuildBackground(bgW || 100, bgH || 100); }
function renderBackgroundAndSprites(g, w, h, dt) {
  if (w !== bgW || h !== bgH) rebuildBackground(w, h);
  bgT += dt; sprF = Math.floor(bgT / .45) & 1;
  g.drawImage(bgCv, 0, 0);
  for (const c of clouds) { c.x += c.s * dt; if (c.x > w) c.x = -44; g.drawImage(cloudCv, Math.round(c.x), Math.round(c.y)); }
  for (const a of amb) {
    if (theme === 'heaven') { if (Math.sin(bgT * 2 + a.p) > .55) { g.fillStyle = '#ffffff'; g.fillRect(a.x | 0, a.y * .8 | 0, 1, 1); g.fillRect((a.x | 0) - 1, (a.y * .8 | 0), 3, 1 - 1 + 1 * 0); } continue; }
    a.y += (theme === 'hell' ? -9 : 5) * a.s * dt; a.x += Math.sin(bgT + a.p) * 6 * dt;
    if (a.y < 0) a.y = h; if (a.y > h) a.y = 0;
    g.fillStyle = theme === 'hell' ? (Math.sin(bgT * 8 + a.p) > 0 ? '#ffd166' : '#ff6a1a') : '#cbb8d8'; g.fillRect(Math.round(a.x), Math.round(a.y), 1, 1);
  }
  const T = LEVEL_THEMES[theme], fr = spriteFrames(T.char)[sprF];
  T.at.forEach(([px, py], i) => { const x = Math.round(px * w - HALF), y = Math.round(py * h - 10);
    if (i) { g.save(); g.translate(x + HALF * 2, y); g.scale(-1, 1); g.drawImage(fr, 0, 0); g.restore(); } else g.drawImage(fr, x, y); });
}
