/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CatColorConfig,
  FallingItem,
  FloatingText,
  GameStats,
  ItemType,
  Particle,
} from './types';
import { BREAD_SPRITES, drawBakeryBackground, drawItem, drawPixelCat } from './sprites';
import { sound } from './audio';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface GameCanvasProps {
  catConfig: CatColorConfig;
  stats: GameStats;
  isPaused: boolean;
  onUpdateStats: (updater: (prev: GameStats) => GameStats) => void;
  onGameOver: (reason: 'lives' | 'misses') => void;
  onCoffeeTimeChange: (timeRemaining: number) => void;
  onTogglePause: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  catConfig,
  stats,
  isPaused,
  onUpdateStats,
  onGameOver,
  onCoffeeTimeChange,
  onTogglePause,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Logical game resolution (crisp pixel canvas scaled cleanly)
  const GAME_WIDTH = 480;
  const GAME_HEIGHT = 640;

  // Cat position & movement state
  const catRef = useRef({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 48,
    vx: 0,
    direction: 'right' as 'left' | 'right',
    state: 'idle' as 'idle' | 'walk' | 'eat' | 'hurt',
    stateTimer: 0,
    width: 90,
    height: 71,
  });

  // Mobile virtual buttons state
  const leftPressedRef = useRef(false);
  const rightPressedRef = useRef(false);

  // Items, particles, and floating text
  const itemsRef = useRef<FallingItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Timers & difficulty scaling
  const nextItemIdRef = useRef(1);
  const nextTextIdRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const coffeeTimerRef = useRef(0); // in seconds
  const screenShakeRef = useRef(0);

  // Keyboard tracking
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Trigger floating text helper
  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: nextTextIdRef.current++,
      text,
      x,
      y,
      color,
      alpha: 1,
      scale: 1,
    });
  };

  // Burst crumbs helper
  const addCrumbs = (x: number, y: number, color: string, count: number = 8, isSparkle: boolean = false) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 0.4 + 0.3,
        isSparkle,
      });
    }
  };

  // Spawning logic based on score difficulty curve
  const spawnItem = (currentScore: number) => {
    const rand = Math.random() * 100;
    let type: ItemType = 'toast';
    let points = 1;
    let isHazard = false;
    let isPowerUp = false;
    let baseSpeed = 2.2;
    let rotSpeed = (Math.random() - 0.5) * 0.04;

    if (rand < 28) {
      // Plain Toast: 28% (1 pt, common)
      type = 'toast';
      points = 1;
      baseSpeed = 2.2;
    } else if (rand < 42) {
      // Baguette: 14% (3 pts)
      type = 'baguette';
      points = 3;
      baseSpeed = 2.5;
    } else if (rand < 54) {
      // Croissant: 12% (5 pts)
      type = 'croissant';
      points = 5;
      baseSpeed = 2.0;
      rotSpeed = (Math.random() - 0.5) * 0.08;
    } else if (rand < 64) {
      // Braided Challah or Cinnamon Swirl: 10% (4 pts)
      type = Math.random() < 0.5 ? 'challah' : 'cinnamon';
      points = 4;
      baseSpeed = 2.3;
    } else if (rand < 74) {
      // Sourdough, Boule, Knot, or Bun: 10% (2-3 pts)
      const variety: ItemType[] = ['sourdough', 'boule', 'knot', 'bun'];
      type = variety[Math.floor(Math.random() * variety.length)];
      points = type === 'knot' ? 3 : 2;
      baseSpeed = 2.2;
    } else if (rand < 81) {
      // Golden Bread: 7% (Rare, fast, 10pts)
      type = 'golden';
      points = 10;
      baseSpeed = 3.6;
    } else if (rand < 91) {
      // Moldy Bread: 10% (Hazard, costs 1 life)
      type = 'moldy';
      points = 0;
      isHazard = true;
      baseSpeed = 2.4;
    } else if (rand < 95) {
      // Milk Saucer: 4% (Power-up, restores 1 life)
      type = 'milk';
      points = 0;
      isPowerUp = true;
      baseSpeed = 1.8;
    } else {
      // Coffee Cup: 5% (Power-up, 2x speed for 8s)
      type = 'coffee';
      points = 0;
      isPowerUp = true;
      baseSpeed = 2.3;
    }

    // Scale speed gradually with score (up to 2.2x max bonus)
    const difficultyMultiplier = Math.min(2.2, 1 + currentScore * 0.015);
    const finalSpeed = baseSpeed * difficultyMultiplier;

    // Item width and height from sprite metadata
    const spriteConfig = BREAD_SPRITES[type];
    const width = spriteConfig ? spriteConfig.baseW : 32;
    const height = spriteConfig ? spriteConfig.baseH : 28;

    // Random X with padding away from edges
    const x = Math.random() * (GAME_WIDTH - 60) + 30;

    itemsRef.current.push({
      id: nextItemIdRef.current++,
      type,
      x,
      y: -20,
      width,
      height,
      speed: finalSpeed,
      rotation: Math.random() * Math.PI,
      rotSpeed,
      points,
      isHazard,
      isPowerUp,
      horizontalDrift: type === 'croissant' ? (Math.random() - 0.5) * 0.8 : 0,
    });
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle pause on P or Escape
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        onTogglePause();
        return;
      }

      // If already paused, pressing any key resumes
      if (isPaused) {
        e.preventDefault();
        onTogglePause();
        return;
      }

      keysRef.current[e.key] = true;
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, onTogglePause]);

  // Direct Pointer/Touch Dragging on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaused) {
      onTogglePause();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;

    catRef.current.x = Math.max(30, Math.min(GAME_WIDTH - 30, clickX));
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const targetX = (e.clientX - rect.left) * scaleX;

    const prevX = catRef.current.x;
    catRef.current.x = Math.max(30, Math.min(GAME_WIDTH - 30, targetX));
    if (catRef.current.x > prevX + 1) {
      catRef.current.direction = 'right';
    } else if (catRef.current.x < prevX - 1) {
      catRef.current.direction = 'left';
    }
  };

  // Main 60fps Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let globalTimer = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!isPaused) {
        globalTimer += dt;

        // Update Coffee turbo timer
        if (coffeeTimerRef.current > 0) {
          coffeeTimerRef.current = Math.max(0, coffeeTimerRef.current - dt);
          onCoffeeTimeChange(coffeeTimerRef.current);

          // Emit coffee steam particles behind cat
          if (Math.random() < 0.4) {
            particlesRef.current.push({
              x: catRef.current.x + (catRef.current.direction === 'right' ? -15 : 15),
              y: catRef.current.y - 10,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -Math.random() * 2 - 1,
              color: '#d35400',
              size: 3,
              alpha: 0.9,
              life: 0,
              maxLife: 0.4,
            });
          }
        } else {
          onCoffeeTimeChange(0);
        }

        // --- 1. CAT MOVEMENT & INPUT ---
        const isLeft =
          keysRef.current['ArrowLeft'] ||
          keysRef.current['KeyA'] ||
          keysRef.current['a'] ||
          keysRef.current['A'] ||
          leftPressedRef.current;

        const isRight =
          keysRef.current['ArrowRight'] ||
          keysRef.current['KeyD'] ||
          keysRef.current['d'] ||
          keysRef.current['D'] ||
          rightPressedRef.current;

        const baseMoveSpeed = 340;
        const moveSpeed = coffeeTimerRef.current > 0 ? baseMoveSpeed * 1.85 : baseMoveSpeed;

        if (isLeft && !isRight) {
          catRef.current.vx = -moveSpeed;
          catRef.current.direction = 'left';
          if (catRef.current.state !== 'eat' && catRef.current.state !== 'hurt') {
            catRef.current.state = 'walk';
          }
        } else if (isRight && !isLeft) {
          catRef.current.vx = moveSpeed;
          catRef.current.direction = 'right';
          if (catRef.current.state !== 'eat' && catRef.current.state !== 'hurt') {
            catRef.current.state = 'walk';
          }
        } else {
          catRef.current.vx = 0;
          if (catRef.current.state !== 'eat' && catRef.current.state !== 'hurt') {
            catRef.current.state = 'idle';
          }
        }

        // Apply cat velocity with boundary clamping
        catRef.current.x += catRef.current.vx * dt;
        catRef.current.x = Math.max(32, Math.min(GAME_WIDTH - 32, catRef.current.x));

        // State timers (e.g. eating chomp or hurt stun)
        if (catRef.current.stateTimer > 0) {
          catRef.current.stateTimer -= dt;
          if (catRef.current.stateTimer <= 0) {
            catRef.current.state = 'idle';
          }
        }

        // --- 2. SPAWNING ITEMS ---
        // Spawn rate scales with score: interval drops from 1.35s down to 0.55s
        const spawnInterval = Math.max(0.55, 1.35 - stats.score * 0.008);
        spawnTimerRef.current += dt;
        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          spawnItem(stats.score);
        }

        // --- 3. UPDATE FALLING ITEMS & COLLISIONS ---
        const catBox = {
          x: catRef.current.x - 36,
          y: catRef.current.y - 58,
          w: 72,
          h: 54,
        };

        const activeItems: FallingItem[] = [];

        for (const item of itemsRef.current) {
          item.y += item.speed;
          item.rotation += item.rotSpeed;
          if (item.horizontalDrift) {
            item.x += item.horizontalDrift;
            // bounce off screen edges
            if (item.x < 20 || item.x > GAME_WIDTH - 20) {
              item.horizontalDrift = -item.horizontalDrift;
            }
          }

          // AABB Collision with Cat
          const itemBox = {
            x: item.x - item.width / 2,
            y: item.y - item.height / 2,
            w: item.width,
            h: item.height,
          };

          const isColliding =
            itemBox.x < catBox.x + catBox.w &&
            itemBox.x + itemBox.w > catBox.x &&
            itemBox.y < catBox.y + catBox.h &&
            itemBox.y + itemBox.h > catBox.y;

          if (isColliding) {
            // Cat catches / eats the item!
            if (item.isHazard) {
              // Moldy Bread eaten: lose life!
              sound.playHurtSound();
              screenShakeRef.current = 0.3; // screen shake
              catRef.current.state = 'hurt';
              catRef.current.stateTimer = 0.55;

              addFloatingText('-1 LIFE!', item.x, item.y - 10, '#e63946');
              addCrumbs(item.x, item.y, '#27ae60', 12);

              onUpdateStats((prev) => {
                const nextLives = prev.lives - 1;
                if (nextLives <= 0) {
                  sound.playGameOverSound();
                  onGameOver('lives');
                }
                return {
                  ...prev,
                  lives: Math.max(0, nextLives),
                };
              });
            } else if (item.isPowerUp) {
              // Power-up caught
              if (item.type === 'milk') {
                sound.playPowerUpSound('milk');
                addFloatingText('+1 HEART!', item.x, item.y - 10, '#a5d6a7');
                addCrumbs(item.x, item.y, '#ffffff', 14, true);

                onUpdateStats((prev) => ({
                  ...prev,
                  lives: Math.min(prev.maxLives, prev.lives + 1),
                  powerUpsCollected: {
                    ...prev.powerUpsCollected,
                    milk: prev.powerUpsCollected.milk + 1,
                  },
                }));
              } else if (item.type === 'coffee') {
                sound.playPowerUpSound('coffee');
                coffeeTimerRef.current = 8.0; // 8 seconds of turbo
                addFloatingText('TURBO SPEED!', item.x, item.y - 10, '#ffe082');
                addCrumbs(item.x, item.y, '#d35400', 14);

                onUpdateStats((prev) => ({
                  ...prev,
                  powerUpsCollected: {
                    ...prev.powerUpsCollected,
                    coffee: prev.powerUpsCollected.coffee + 1,
                  },
                }));
              }
              catRef.current.state = 'eat';
              catRef.current.stateTimer = 0.25;
            } else {
              // Normal or Golden Bread eaten!
              const isGolden = item.type === 'golden';
              sound.playEatSound(item.points, isGolden);

              catRef.current.state = 'eat';
              catRef.current.stateTimer = 0.22;

              const crumbColor =
                item.type === 'golden'
                  ? '#f1c40f'
                  : item.type === 'croissant'
                  ? '#f39c12'
                  : item.type === 'baguette'
                  ? '#d35400'
                  : item.type === 'cinnamon'
                  ? '#a0522d'
                  : item.type === 'challah'
                  ? '#e67e22'
                  : '#deb887';

              addCrumbs(item.x, item.y, crumbColor, isGolden ? 16 : 8, isGolden);
              addFloatingText(
                `+${item.points}`,
                item.x,
                item.y - 10,
                isGolden ? '#ffd700' : '#f5c542'
              );

              onUpdateStats((prev) => {
                const newScore = prev.score + item.points;
                const newHigh = Math.max(prev.highScore, newScore);
                try {
                  localStorage.setItem('cat_bread_best_score', String(newHigh));
                } catch {
                  // ignore
                }

                return {
                  ...prev,
                  score: newScore,
                  highScore: newHigh,
                  breadsEaten: {
                    ...prev.breadsEaten,
                    [item.type]: (prev.breadsEaten[item.type] || 0) + 1,
                  },
                };
              });
            }

            // Do not keep item in activeItems
            continue;
          }

          // Check if item hit the ground (counter bottom)
          if (item.y > GAME_HEIGHT - 44) {
            if (item.isHazard) {
              // Moldy bread dropped on floor safely avoids punishment!
              addCrumbs(item.x, GAME_HEIGHT - 48, '#27ae60', 6);
            } else if (item.isPowerUp) {
              // Power-up missed
              addCrumbs(item.x, GAME_HEIGHT - 48, '#ffffff', 4);
            } else {
              // Regular bread missed! Reaching 5 dropped breads equals game over!
              sound.playMissSound();
              addFloatingText('DROPPED!', item.x, GAME_HEIGHT - 64, '#ef5350');
              addCrumbs(item.x, GAME_HEIGHT - 48, '#8b5a2b', 8);

              onUpdateStats((prev) => {
                const newMisses = prev.misses + 1;
                if (newMisses >= prev.maxMisses) {
                  sound.playGameOverSound();
                  onGameOver('misses');
                }
                return {
                  ...prev,
                  misses: newMisses,
                };
              });
            }
            continue;
          }

          activeItems.push(item);
        }

        itemsRef.current = activeItems;

        // --- 4. UPDATE PARTICLES ---
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12; // gravity
          p.life += dt;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          return p.life < p.maxLife;
        });

        // --- 5. UPDATE FLOATING TEXT ---
        floatingTextsRef.current = floatingTextsRef.current.filter((t) => {
          t.y -= 35 * dt;
          t.alpha -= 1.2 * dt;
          return t.alpha > 0;
        });

        // Screen shake decay
        if (screenShakeRef.current > 0) {
          screenShakeRef.current = Math.max(0, screenShakeRef.current - dt);
        }
      }

      // --- RENDERING PHASE ---
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Handle screen shake if active
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw French Bakery Kitchen Background
      drawBakeryBackground(ctx, GAME_WIDTH, GAME_HEIGHT, globalTimer);

      // 2. Draw Falling Items
      for (const item of itemsRef.current) {
        drawItem(ctx, item.type, item.x, item.y, item.rotation, globalTimer, 1.05);
      }

      // 3. Draw Particles (crumbs, sparks)
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.isSparkle) {
          ctx.fillRect(p.x - p.size, p.y, p.size * 2, 1);
          ctx.fillRect(p.x, p.y - p.size, 1, p.size * 2);
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.restore();
      }

      // 4. Draw Cat
      drawPixelCat(
        ctx,
        catRef.current.x,
        catRef.current.y,
        catConfig,
        catRef.current.state,
        catRef.current.direction,
        globalTimer,
        1.05
      );

      // 5. Draw Floating Numbers/Texts (+1, +3, TURBO!)
      for (const t of floatingTextsRef.current) {
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';

        // Dark outline for crisp readability
        ctx.fillStyle = '#1a0e0e';
        ctx.fillText(t.text, t.x - 1, t.y);
        ctx.fillText(t.text, t.x + 1, t.y);
        ctx.fillText(t.text, t.x, t.y - 1);
        ctx.fillText(t.text, t.x, t.y + 1);

        // Core text
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      }

      // 6. Draw Subtle Pause Overlay if Paused (PauseModal handles full UI & controls)
      if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [catConfig, isPaused, stats.score, onGameOver, onUpdateStats, onCoffeeTimeChange]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[480px] aspect-[3/4] max-h-[75vh] sm:max-h-[80vh] mx-auto flex flex-col items-center justify-center select-none"
    >
      {/* Crisp Canvas */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="pixel-art w-full h-full rounded-md border-4 border-[#54342a] shadow-2xl cursor-pointer bg-[#2d1e1e]"
      />

      {/* On-screen Mobile Controls (Visible on mobile/tablet) */}
      <div className="sm:hidden absolute bottom-2 left-0 right-0 flex justify-between px-4 pointer-events-none">
        <button
          onPointerDown={() => {
            leftPressedRef.current = true;
          }}
          onPointerUp={() => {
            leftPressedRef.current = false;
          }}
          onPointerLeave={() => {
            leftPressedRef.current = false;
          }}
          className="pointer-events-auto w-14 h-14 bg-[#3e2723]/90 active:bg-[#e67e22] border-2 border-[#5d4037] active:border-white rounded-lg flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          aria-label="Move Left"
        >
          <ArrowLeft className="w-8 h-8 stroke-[2.5]" />
        </button>

        <button
          onPointerDown={() => {
            rightPressedRef.current = true;
          }}
          onPointerUp={() => {
            rightPressedRef.current = false;
          }}
          onPointerLeave={() => {
            rightPressedRef.current = false;
          }}
          className="pointer-events-auto w-14 h-14 bg-[#3e2723]/90 active:bg-[#e67e22] border-2 border-[#5d4037] active:border-white rounded-lg flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          aria-label="Move Right"
        >
          <ArrowRight className="w-8 h-8 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
