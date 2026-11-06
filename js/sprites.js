const LEVEL_THEMES = {
  heaven: {
    bgSrc: 'assets/backgrounds/level_heaven.jpg',
    sprites: [
      { f1: 'assets/sprites/angel_f1.jpg', f2: 'assets/sprites/angel_f2.jpg', xPct: 0.15, yPct: 0.25, scale: 0.5 },
      { f1: 'assets/sprites/angel_f1.jpg', f2: 'assets/sprites/angel_f2.jpg', xPct: 0.84, yPct: 0.2, scale: 0.45 }
    ]
  },
  purgatory: {
    bgSrc: 'assets/backgrounds/level_purgatory.jpg',
    sprites: [{ f1: 'assets/sprites/gargoyle_f1.jpg', f2: 'assets/sprites/gargoyle_f2.jpg', xPct: 0.2, yPct: 0.4, scale: 0.6 }]
  },
  hell: {
    bgSrc: 'assets/backgrounds/level_hell.jpg',
    sprites: [{ f1: 'assets/sprites/demon_f1.jpg', f2: 'assets/sprites/demon_f2.jpg', xPct: 0.78, yPct: 0.7, scale: 0.65 }]
  }
};

let currentBgImage = new Image();
let loadedSprites = [];
let animFrame = 0;
let animTimer = 0;

function getThemeKey(level) {
  if (level <= 3) return 'heaven';
  if (level <= 6) return 'purgatory';
  return 'hell';
}

function loadThemeAssets(level) {
  const theme = LEVEL_THEMES[getThemeKey(level)];
  currentBgImage = new Image();
  currentBgImage.src = theme.bgSrc;
  loadedSprites = theme.sprites.map(sprite => {
    const img1 = new Image();
    const img2 = new Image();
    img1.src = sprite.f1;
    img2.src = sprite.f2;
    return { img1, img2, xPct: sprite.xPct, yPct: sprite.yPct, scale: sprite.scale };
  });
}

function renderBackgroundAndSprites(ctx, width, height, dt) {
  if (currentBgImage.complete && currentBgImage.naturalWidth) {
    const imageRatio = currentBgImage.naturalWidth / currentBgImage.naturalHeight;
    const viewRatio = width / height;
    let sx = 0, sy = 0, sw = currentBgImage.naturalWidth, sh = currentBgImage.naturalHeight;
    if (imageRatio > viewRatio) { sw = sh * viewRatio; sx = (currentBgImage.naturalWidth - sw) / 2; }
    else { sh = sw / viewRatio; sy = (currentBgImage.naturalHeight - sh) / 2; }
    ctx.drawImage(currentBgImage, sx, sy, sw, sh, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#777de0';
    ctx.fillRect(0, 0, width, height);
  }

  animTimer += dt;
  if (animTimer >= 0.45) {
    animFrame = animFrame === 0 ? 1 : 0;
    animTimer %= 0.45;
  }
  for (const sprite of loadedSprites) {
    const image = animFrame === 0 ? sprite.img1 : sprite.img2;
    if (image.complete && image.naturalWidth) {
      const w = image.naturalWidth * sprite.scale;
      const h = image.naturalHeight * sprite.scale;
      ctx.drawImage(image, sprite.xPct * width - w / 2, sprite.yPct * height - h / 2, w, h);
    }
  }
}
