/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CAT_COLORS, drawPixelCat } from '../sprites';
import { CatColorConfig, CatColorId } from '../types';
import { Play, HelpCircle, Trophy, Sparkles } from 'lucide-react';

interface ColorPickerProps {
  selectedColorId: CatColorId;
  highScore: number;
  onSelectColor: (id: CatColorId) => void;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColorId,
  highScore,
  onSelectColor,
  onStartGame,
  onOpenHowToPlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [animTimer, setAnimTimer] = useState<number>(0);
  const selectedConfig = CAT_COLORS.find((c) => c.id === selectedColorId) || CAT_COLORS[0];

  // Animation loop for live cat preview
  useEffect(() => {
    let animId: number;
    let start = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - start) / 1000;
      setAnimTimer(elapsed);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw warm pedestal platform
          const cx = canvas.width / 2;
          const cy = canvas.height / 2 + 18;

          // Wooden stool top
          ctx.fillStyle = '#8B5A2B';
          ctx.fillRect(cx - 52, cy + 14, 104, 10);
          ctx.fillStyle = '#D4A373';
          ctx.fillRect(cx - 52, cy + 12, 104, 2);
          // Cushion
          ctx.fillStyle = '#C0392B';
          ctx.fillRect(cx - 46, cy + 6, 92, 6);

          // Draw live cat with animated wagging tail and blinking
          drawPixelCat(ctx, cx, cy + 6, selectedConfig, 'idle', 'right', elapsed, 1.2);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [selectedConfig]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4 p-4 select-none">
      {/* Title Lockup */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 bg-[#3e2723] px-3 py-1 rounded border border-[#5d4037] text-[10px] text-[#f5c542] mb-1">
          <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
          <span>FRENCH BAKERY ARCADE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl text-[#f4e8c1] font-bold tracking-wider drop-shadow-[0_4px_0_#2b1b17]">
          CAT & BREAD
        </h1>
        <p className="text-[10px] sm:text-xs text-[#d7ccc8]">
          Catch falling pastries, dodge moldy loaves!
        </p>
      </div>

      {/* Best Score Banner */}
      <div className="flex items-center gap-2 bg-[#261819] px-4 py-1.5 rounded-md border-2 border-[#54342a] text-xs">
        <Trophy className="w-4 h-4 text-[#ffd700]" />
        <span className="text-[#bcaaa4] text-[10px]">BEST RECORD:</span>
        <span className="font-bold text-[#f5c542] text-sm tabular-nums">
          {highScore.toString().padStart(4, '0')} PTS
        </span>
      </div>

      {/* Live Cat Preview Card */}
      <div className="flex flex-col items-center bg-[#261819] border-4 border-[#54342a] rounded-lg p-3 w-full pixel-box">
        <div className="text-[10px] text-[#bcaaa4] tracking-widest uppercase mb-1">
          CHOOSE YOUR CAT
        </div>
        
        {/* Canvas preview */}
        <div className="w-[210px] h-[130px] bg-[#1a0f11] rounded border-2 border-[#3e2723] flex items-center justify-center relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={210}
            height={130}
            className="pixel-art w-full h-full"
          />
        </div>

        {/* Selected Cat Name & Breed */}
        <div className="mt-2 text-center">
          <div className="font-bold text-sm text-[#f5c542]">{selectedConfig.name}</div>
          <div className="text-[10px] text-[#a1887f]">"{selectedConfig.breed}"</div>
        </div>

        {/* 8 Cat Collection Selector in 4x2 grid matching photo */}
        <div className="grid grid-cols-4 gap-2 mt-3 w-full">
          {CAT_COLORS.map((color) => {
            const isSelected = color.id === selectedColorId;
            return (
              <button
                key={color.id}
                onClick={() => onSelectColor(color.id)}
                className={`flex flex-col items-center p-2 rounded-md border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#f5c542] bg-[#3e2723] scale-105 shadow-md ring-2 ring-[#f5c542]/40'
                    : 'border-[#4e342e] bg-[#1a0f11] hover:border-[#8d6e63]'
                }`}
                title={`${color.name} (${color.breed})`}
              >
                {/* Visual sprite preview */}
                <div className="w-12 h-9 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={color.spriteUrl}
                    alt={color.name}
                    className="pixel-art max-w-full max-h-full object-contain filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]"
                  />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f5c542] border border-[#2b1b17]" />
                  )}
                </div>
                <span className="text-[8px] mt-1 text-[#d7ccc8] font-bold truncate max-w-full">
                  {color.name.split(' ')[0]}
                </span>
                <span className="text-[7px] text-[#8d6e63] truncate max-w-full">
                  {color.breed}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onStartGame}
        className="w-full py-3.5 px-6 bg-[#27ae60] hover:bg-[#219653] active:bg-[#1e824c] text-white font-bold text-sm sm:text-base rounded-md border-2 border-[#196f3d] pixel-btn flex items-center justify-center gap-2 cursor-pointer shadow-lg tracking-wider"
      >
        <Play className="w-5 h-5 fill-current" />
        START BAKERY SHIFT
      </button>

      {/* Secondary Button: How to Play */}
      <div className="w-full">
        <button
          onClick={onOpenHowToPlay}
          className="w-full py-2 px-3 bg-[#3e2723] hover:bg-[#4e342e] text-[#f4e8c1] rounded border border-[#5d4037] text-[10px] flex items-center justify-center gap-1.5 pixel-btn cursor-pointer transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#f5c542]" />
          <span>HOW TO PLAY</span>
        </button>
      </div>
    </div>
  );
};
