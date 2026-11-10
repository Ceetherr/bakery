/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CatColorId = 
  | 'orange' 
  | 'siamese' 
  | 'buff' 
  | 'pink' 
  | 'white' 
  | 'gray' 
  | 'calico' 
  | 'tuxedo';

export interface CatColorConfig {
  id: CatColorId;
  name: string;
  breed: string;
  spriteUrl: string;     // Exact cropped sprite image
  primary: string;       // Main body fur
  secondary: string;     // Belly / paws / muzzle
  stripes?: string;      // Tabby stripes or patch 1
  patch2?: string;       // Secondary patch (e.g. for Calico)
  ears: string;          // Ear tip / inner ear
  eyeColor1: string;     // Left eye color
  eyeColor2: string;     // Right eye color (heterochromia support)
  nose: string;          // Nose color
  outline: string;       // Pixel outline color
  pattern: 'tabby' | 'point' | 'calico' | 'tuxedo' | 'solid';
}

export type ItemType = 
  | 'toast' 
  | 'baguette' 
  | 'croissant' 
  | 'golden' 
  | 'moldy' 
  | 'challah'
  | 'cinnamon'
  | 'sourdough'
  | 'bun'
  | 'knot'
  | 'boule'
  | 'milk' 
  | 'coffee';

export interface FallingItem {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  rotation: number;
  rotSpeed: number;
  points: number;
  isHazard: boolean;
  isPowerUp: boolean;
  horizontalDrift?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  isSparkle?: boolean;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

export type GameScreen = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'HOW_TO_PLAY';

export interface GameStats {
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  misses: number;
  maxMisses: number;
  breadsEaten: {
    toast: number;
    baguette: number;
    croissant: number;
    golden: number;
    [key: string]: number;
  };
  powerUpsCollected: {
    milk: number;
    coffee: number;
  };
}
