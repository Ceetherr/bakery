/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatColorConfig, ItemType } from './types';

// The 8 pixel cats from the reference collection with exact cropped sprites
export const CAT_COLORS: CatColorConfig[] = [
  {
    id: 'orange',
    name: 'Orange Tabby',
    breed: 'Marmalade',
    spriteUrl: '/assets/cats/cat_orange.png',
    primary: '#E67E22',
    secondary: '#FFFFFF',
    stripes: '#BA4A00',
    ears: '#FADBD8',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#C0392B',
    outline: '#261712',
    pattern: 'tabby',
  },
  {
    id: 'siamese',
    name: 'Seal Point',
    breed: 'Mocha',
    spriteUrl: '/assets/cats/cat_siamese.png',
    primary: '#F0ECE1',
    secondary: '#4A3028',
    stripes: '#4A3028',
    ears: '#36211A',
    eyeColor1: '#2980B9',
    eyeColor2: '#2980B9',
    nose: '#36211A',
    outline: '#231815',
    pattern: 'point',
  },
  {
    id: 'buff',
    name: 'Caramel Buff',
    breed: 'Biscuit',
    spriteUrl: '/assets/cats/cat_buff.png',
    primary: '#D4A373',
    secondary: '#FFFFFF',
    stripes: '#A0714F',
    ears: '#EDBB99',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#8D5B36',
    outline: '#2A1F18',
    pattern: 'tabby',
  },
  {
    id: 'pink',
    name: 'Strawberry Pink',
    breed: 'Sakura',
    spriteUrl: '/assets/cats/cat_pink.png',
    primary: '#F48FB1',
    secondary: '#FFFFFF',
    stripes: '#C2185B',
    ears: '#AD1457',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#C2185B',
    outline: '#2A1420',
    pattern: 'tabby',
  },
  {
    id: 'white',
    name: 'Snow Angel',
    breed: 'Odd Eyes',
    spriteUrl: '/assets/cats/cat_white.png',
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    stripes: '#ECEFF1',
    ears: '#F8BBD0',
    eyeColor1: '#F39C12', // Left Eye: Amber gold
    eyeColor2: '#3498DB', // Right Eye: Sky blue
    nose: '#F48FB1',
    outline: '#22262C',
    pattern: 'solid',
  },
  {
    id: 'gray',
    name: 'Russian Blue',
    breed: 'Smokey',
    spriteUrl: '/assets/cats/cat_gray.png',
    primary: '#607D8B',
    secondary: '#ECEFF1',
    stripes: '#37474F',
    ears: '#37474F',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#37474F',
    outline: '#1C2429',
    pattern: 'tabby',
  },
  {
    id: 'calico',
    name: 'Lucky Calico',
    breed: 'Mi-Ke',
    spriteUrl: '/assets/cats/cat_calico.png',
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    stripes: '#E67E22',
    patch2: '#2C3E50',
    ears: '#E67E22',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#F48FB1',
    outline: '#201A24',
    pattern: 'calico',
  },
  {
    id: 'tuxedo',
    name: 'Midnight Tuxedo',
    breed: 'Bandit',
    spriteUrl: '/assets/cats/cat_tuxedo.png',
    primary: '#1E252B',
    secondary: '#FFFFFF',
    stripes: '#12161A',
    ears: '#1E252B',
    eyeColor1: '#1A181B',
    eyeColor2: '#1A181B',
    nose: '#F48FB1',
    outline: '#0D1114',
    pattern: 'tuxedo',
  },
];

// Preload & Cache Image Sprites
const spriteCache: Record<string, HTMLImageElement> = {};

function getCachedImage(url: string): HTMLImageElement {
  if (!spriteCache[url]) {
    const img = new Image();
    img.src = url;
    spriteCache[url] = img;
  }
  return spriteCache[url];
}

// Background image caching
let bgImage: HTMLImageElement | null = null;
function getBakeryBg(): HTMLImageElement {
  if (!bgImage) {
    bgImage = new Image();
    bgImage.src = '/assets/bakery_bg.png';
  }
  return bgImage;
}

/**
 * Draws the cat with animated wagging tail, walk bounce, eating chomp, and blinking!
 * Zero white borders, larger prominent size, and exact photo sprite shapes.
 */
export function drawPixelCat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  config: CatColorConfig,
  state: 'idle' | 'walk' | 'eat' | 'hurt',
  direction: 'left' | 'right',
  animTimer: number,
  scale: number = 1.0
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const isWalking = state === 'walk';
  const isEating = state === 'eat';
  const isHurt = state === 'hurt';

  // Walk bounce
  const walkBob = isWalking ? Math.abs(Math.sin(animTimer * 14)) * 4 : 0;
  ctx.translate(Math.floor(cx), Math.floor(cy - walkBob));

  // Flip horizontally if facing left
  if (direction === 'left') {
    ctx.scale(-1, 1);
  }

  // Hurt flashing
  if (isHurt) {
    ctx.filter = Math.floor(animTimer * 20) % 2 === 0 ? 'brightness(2.2) drop-shadow(0 0 8px red)' : 'hue-rotate(90deg)';
  }

  // URLs for body, tail, and whole sprite
  const bodyUrl = `/assets/cats/cat_${config.id}_body.png`;
  const tailUrl = `/assets/cats/cat_${config.id}_tail.png`;
  const fullUrl = config.spriteUrl;

  const bodyImg = getCachedImage(bodyUrl);
  const tailImg = getCachedImage(tailUrl);
  const fullImg = getCachedImage(fullUrl);

  // Enlarged cat dimensions: ~86px wide by ~68px high (scaled by scale param)
  const drawW = Math.round(86 * scale);
  const drawH = Math.round(68 * scale);
  const originX = -drawW / 2;
  const originY = -drawH + 12;

  if (bodyImg.complete && bodyImg.naturalWidth > 0 && tailImg.complete && tailImg.naturalWidth > 0) {
    // 1. ANIMATED WAGGING TAIL
    // Tail pivot is at hip connection: ~32% width and ~79% height of the 78x62 sprite
    const pivotRatioX = 25.0 / 78.0;
    const pivotRatioY = 49.0 / 62.0;
    const pivotX = originX + (pivotRatioX * drawW);
    const pivotY = originY + (pivotRatioY * drawH);

    ctx.save();
    ctx.translate(pivotX, pivotY);

    // Smooth sinusoidal tail wagging motion
    const tailSway = isWalking
      ? Math.sin(animTimer * 14) * 0.28   // Energetic wag when walking
      : Math.sin(animTimer * 5) * 0.16;   // Peaceful breathing flick when idle
    ctx.rotate(tailSway);

    // Draw tail aligned to its pivot
    ctx.drawImage(
      tailImg,
      -pivotRatioX * drawW,
      -pivotRatioY * drawH,
      drawW,
      drawH
    );
    ctx.restore();

    // 2. CAT BODY & HEAD
    ctx.drawImage(
      bodyImg,
      originX,
      originY,
      drawW,
      drawH
    );

    // 3. BLINKING EYES & FACIAL EXPRESSIONS
    // In the 78x62 sprite:
    // Left eye: x ≈ 50/78 (0.641), y ≈ 30/62 (0.484)
    // Right eye: x ≈ 66/78 (0.846), y ≈ 30/62 (0.484)
    // Nose: x ≈ 58/78 (0.744), y ≈ 35/62 (0.565)
    // Mouth: x ≈ 58/78 (0.744), y ≈ 39/62 (0.630) - directly below nose!
    const eye1X = originX + (0.641 * drawW);
    const eye2X = originX + (0.846 * drawW);
    const eyeY = originY + (0.484 * drawH);
    const eyeW = Math.max(3, Math.round(3.5 * scale));
    const eyeH = Math.max(5, Math.round(6.5 * scale));

    if (isEating) {
      // Happy closed ^ ^ squinting eyes
      ctx.fillStyle = config.outline;
      ctx.fillRect(eye1X - 2, eyeY + 1, eyeW + 2, Math.max(2, Math.round(2 * scale)));
      ctx.fillRect(eye2X - 2, eyeY + 1, eyeW + 2, Math.max(2, Math.round(2 * scale)));

      // Open happy mouth catching falling pastries!
      // Precisely positioned directly beneath the nose on the muzzle
      const mouthX = originX + (0.744 * drawW);
      const mouthY = originY + (0.630 * drawH);
      const mW = Math.max(5, Math.round(5.5 * scale));
      const mH = Math.max(3, Math.round(4.0 * scale));

      // Dark mouth outline
      ctx.fillStyle = config.outline;
      ctx.fillRect(Math.floor(mouthX - mW / 2), Math.floor(mouthY), mW, mH);

      // Warm red mouth interior
      ctx.fillStyle = '#C0392B';
      ctx.fillRect(Math.floor(mouthX - mW / 2 + 1), Math.floor(mouthY + 1), mW - 2, mH - 1);

      // Cute pink tongue
      ctx.fillStyle = '#F1948A';
      ctx.fillRect(
        Math.floor(mouthX - mW / 2 + 1.5),
        Math.floor(mouthY + mH - 2),
        Math.max(2, mW - 3),
        Math.max(1, Math.round(1.5 * scale))
      );
    } else if (isHurt) {
      // Dizzy X X eyes
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(eye1X - 2, eyeY - 1, eyeW + 3, eyeH);
      ctx.fillRect(eye2X - 2, eyeY - 1, eyeW + 3, eyeH);
    } else {
      // Occasional natural blink
      const isBlinking = Math.sin(animTimer * 1.8) > 0.93;
      if (isBlinking) {
        ctx.fillStyle = config.outline;
        ctx.fillRect(eye1X - 1, eyeY + 2, eyeW + 1, Math.max(2, Math.round(2 * scale)));
        ctx.fillRect(eye2X - 1, eyeY + 2, eyeW + 1, Math.max(2, Math.round(2 * scale)));
      }
    }
  } else if (fullImg.complete && fullImg.naturalWidth > 0) {
    // Fallback to static full sprite if body/tail are still loading
    ctx.drawImage(fullImg, originX, originY, drawW, drawH);
  }

  ctx.restore();
}

export interface BreadSpriteConfig {
  url: string;
  baseW: number;
  baseH: number;
  displayName: string;
}

export const BREAD_SPRITES: Partial<Record<ItemType, BreadSpriteConfig>> = {
  toast: { url: '/assets/breads/bread_toast.png', baseW: 36, baseH: 30, displayName: 'Plain Toast' },
  baguette: { url: '/assets/breads/bread_baguette.png', baseW: 46, baseH: 38, displayName: 'French Baguette' },
  croissant: { url: '/assets/breads/bread_croissant.png', baseW: 38, baseH: 32, displayName: 'Croissant' },
  golden: { url: '/assets/breads/bread_golden.png', baseW: 40, baseH: 32, displayName: 'Golden Bread' },
  moldy: { url: '/assets/breads/bread_moldy.png', baseW: 36, baseH: 30, displayName: 'Moldy Bread' },
  challah: { url: '/assets/breads/bread_challah.png', baseW: 42, baseH: 34, displayName: 'Challah' },
  cinnamon: { url: '/assets/breads/bread_cinnamon.png', baseW: 34, baseH: 30, displayName: 'Cinnamon Roll' },
  sourdough: { url: '/assets/breads/bread_sourdough.png', baseW: 38, baseH: 30, displayName: 'Sourdough' },
  boule: { url: '/assets/breads/bread_boule.png', baseW: 38, baseH: 30, displayName: 'Boule Loaf' },
  bun: { url: '/assets/breads/bread_bun.png', baseW: 32, baseH: 28, displayName: 'Sesame Bun' },
  knot: { url: '/assets/breads/bread_knot.png', baseW: 34, baseH: 30, displayName: 'Brioche Knot' },
};

// Preload bread sprites
if (typeof window !== 'undefined') {
  Object.values(BREAD_SPRITES).forEach((info) => {
    if (info) getCachedImage(info.url);
  });
}

/**
 * Draws the falling items using exact cropped pixel bread sprites
 */
export function drawItem(
  ctx: CanvasRenderingContext2D,
  itemType: ItemType,
  x: number,
  y: number,
  rotation: number,
  animTimer: number,
  scale: number = 1.0
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.rotate(rotation);

  const breadConfig = BREAD_SPRITES[itemType];

  if (breadConfig) {
    const img = getCachedImage(breadConfig.url);
    const w = Math.round(breadConfig.baseW * scale);
    const h = Math.round(breadConfig.baseH * scale);

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      if (itemType === 'golden') {
        // Sparkling twinkling stars around golden bread
        const sparkleA = Math.sin(animTimer * 12) > 0.2;
        const sparkleB = Math.sin(animTimer * 12 + 2.5) > 0.2;
        ctx.fillStyle = '#FFFFFF';
        if (sparkleA) {
          ctx.fillRect(-w / 2 - 2, -h / 2 + 1, 3, 3);
          ctx.fillRect(-w / 2 - 1, -h / 2, 1, 5);
          ctx.fillRect(-w / 2 - 3, -h / 2 + 2, 5, 1);
        }
        if (sparkleB) {
          ctx.fillRect(w / 2 + 1, h / 2 - 4, 3, 3);
          ctx.fillRect(w / 2 + 2, h / 2 - 5, 1, 5);
          ctx.fillRect(w / 2, h / 2 - 3, 5, 1);
        }
      } else if (itemType === 'moldy') {
        // Green mold spore particles floating and warning outline
        const pulse = (Math.sin(animTimer * 8) + 1) * 0.5;
        ctx.strokeStyle = `rgba(39, 174, 96, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);

        const sporeY = (animTimer * 20) % 12;
        ctx.fillStyle = 'rgba(46, 204, 113, 0.85)';
        ctx.fillRect(-w / 4, -h / 2 - sporeY, 2, 2);
        ctx.fillRect(w / 4, -h / 2 - ((sporeY + 6) % 12), 2, 2);
      }
    } else {
      // Fallback while loading
      ctx.fillStyle = itemType === 'moldy' ? '#27ae60' : itemType === 'golden' ? '#f1c40f' : '#d35400';
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
  } else if (itemType === 'milk') {
    // Blue ceramic saucer with creamy white milk
    const p = scale * 1.5;
    ctx.fillStyle = '#2980B9';
    ctx.fillRect(-8 * p, 0 * p, 16 * p, 6 * p);
    ctx.fillRect(-6 * p, 4 * p, 12 * p, 3 * p);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-6 * p, -1 * p, 12 * p, 4 * p);
    ctx.fillStyle = '#EBF5FB';
    ctx.fillRect(-4 * p, 1 * p, 8 * p, 2 * p);
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(-2 * p, 1 * p, 4 * p, 2 * p);
    ctx.fillRect(-1 * p, 3 * p, 2 * p, 1 * p);
  } else if (itemType === 'coffee') {
    // Red bakery mug with steaming rich espresso
    const p = scale * 1.5;
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(-6 * p, -4 * p, 12 * p, 11 * p);
    ctx.fillRect(6 * p, -2 * p, 3 * p, 7 * p);
    ctx.fillStyle = '#1A1215';
    ctx.fillRect(6 * p, 0 * p, 1 * p, 3 * p);
    ctx.fillStyle = '#4A235A';
    ctx.fillRect(-5 * p, -3 * p, 10 * p, 4 * p);
    ctx.fillStyle = '#6E2C00';
    ctx.fillRect(-4 * p, -2 * p, 8 * p, 3 * p);

    const steamShift = Math.sin(animTimer * 10) * p;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect((-2 * p) + steamShift, -9 * p, 2 * p, 3 * p);
    ctx.fillRect((2 * p) - steamShift, -11 * p, 2 * p, 3 * p);
  }

  ctx.restore();
}

/**
 * Draws the Cozy French Bakery Kitchen scene using the user's provided pixel background
 */
export function drawBakeryBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  animTimer: number
) {
  const bg = getBakeryBg();

  if (bg.complete && bg.naturalWidth > 0) {
    ctx.drawImage(bg, 0, 0, width, height);

    // Warm atmospheric light shimmer from ceiling lamps
    const lampGlow = (Math.sin(animTimer * 3) + 1) * 0.5;
    const grad1 = ctx.createRadialGradient(width * 0.23, 50, 10, width * 0.23, 80, 110);
    grad1.addColorStop(0, `rgba(255, 230, 150, ${0.15 + lampGlow * 0.06})`);
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, width * 0.5, 200);

    const grad2 = ctx.createRadialGradient(width * 0.78, 50, 10, width * 0.78, 80, 110);
    grad2.addColorStop(0, `rgba(255, 230, 150, ${0.15 + lampGlow * 0.06})`);
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(width * 0.5, 0, width * 0.5, 200);
  } else {
    ctx.fillStyle = '#E8D8C3';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, height - 70, width, 70);
  }
}
