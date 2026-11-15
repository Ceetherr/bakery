/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Pause, Play, Heart, Coffee } from 'lucide-react';
import { GameStats } from '../types';
import { CAT_UI_TEXT, Language, fmtNum } from '../breadShift/i18n';

interface HUDProps {
  stats: GameStats;
  catName?: string;
  isMuted: boolean;
  isPaused: boolean;
  coffeeTimer: number;
  onToggleMute: () => void;
  onTogglePause: () => void;
  lang?: Language;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  catName,
  isMuted,
  isPaused,
  coffeeTimer,
  onToggleMute,
  onTogglePause,
  lang = 'en',
}) => {
  const isFa = lang === 'fa';
  const T = CAT_UI_TEXT[lang];

  return (
    <div className={`w-full flex flex-col gap-2 select-none ${isFa ? 'font-vazir rtl' : ''}`} dir={isFa ? 'rtl' : 'ltr'}>
      {/* Top Bar Stats */}
      <div className="flex items-center justify-between bg-[#261819] border-2 border-[#54342a] px-3 py-2 rounded shadow-md text-xs sm:text-sm">
        {/* Cat Name, Score & Best */}
        <div className="flex items-center gap-2 sm:gap-4">
          {catName && (
            <div className={`flex flex-col ${isFa ? 'border-l pl-2 sm:pl-3' : 'border-r pr-2 sm:pr-3'} border-[#3e2723] max-w-[85px] sm:max-w-[120px]`}>
              <span className="text-[8px] sm:text-[9px] text-[#a1887f] tracking-wider uppercase truncate">{T.bakerLabel}</span>
              <span className="font-bold text-[#f4e8c1] text-[10px] sm:text-xs truncate flex items-center gap-1" title={catName}>
                <span>🐾</span> {catName}
              </span>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] text-[#bcaaa4] tracking-wider">{T.scoreLabel}</span>
            <span className="font-bold text-[#f5c542] text-sm sm:text-base tabular-nums">
              {fmtNum(stats.score.toString().padStart(4, '0'), lang)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] text-[#bcaaa4] tracking-wider">{T.bestLabel}</span>
            <span className="font-bold text-[#e0a96d] text-sm sm:text-base tabular-nums">
              {fmtNum(stats.highScore.toString().padStart(4, '0'), lang)}
            </span>
          </div>
        </div>

        {/* Lives (3 pixel hearts) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {Array.from({ length: stats.maxLives }).map((_, i) => {
            const hasHeart = i < stats.lives;
            return (
              <div
                key={i}
                className={`transition-all duration-150 ${
                  hasHeart
                    ? 'scale-100 text-[#e63946] drop-shadow-[0_0_4px_rgba(230,57,70,0.7)]'
                    : 'scale-90 text-[#4a2e2b] opacity-40'
                }`}
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-current stroke-[2.5]" />
              </div>
            );
          })}
        </div>

        {/* Audio & Pause Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-[#3e2723] hover:bg-[#4e342e] active:scale-95 border border-[#5d4037] rounded text-[#f4e8c1] transition-colors cursor-pointer"
            title={isMuted ? T.unmuteAudio : T.muteAudio}
            aria-label={isMuted ? T.unmuteAudio : T.muteAudio}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#ef9a9a]" /> : <Volume2 className="w-4 h-4 text-[#a5d6a7]" />}
          </button>

          <button
            onClick={onTogglePause}
            className="p-1.5 bg-[#3e2723] hover:bg-[#4e342e] active:scale-95 border border-[#5d4037] rounded text-[#f4e8c1] transition-colors cursor-pointer"
            title={isPaused ? T.resumeGame : T.gamePaused}
            aria-label={isPaused ? T.resumeGame : T.gamePaused}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#ffb74d]" /> : <Pause className="w-4 h-4 text-[#f4e8c1]" />}
          </button>
        </div>
      </div>

      {/* Misses & Power-up Status bar */}
      <div className="flex items-center justify-between text-[9px] sm:text-[11px] px-1 text-[#d7ccc8]">
        {/* Miss Counter (5 slots) */}
        <div className="flex items-center gap-1.5 bg-[#1f1315]/80 px-2 py-1 rounded border border-[#3e2723]">
          <span className="text-[#a1887f]">{T.droppedLabel}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: stats.maxMisses }).map((_, i) => {
              const isMissed = i < stats.misses;
              return (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-xs border transition-colors flex items-center justify-center ${
                    isMissed
                      ? 'bg-[#e53935] border-[#b71c1c] text-white'
                      : 'bg-[#2b1b1c] border-[#4e342e]'
                  }`}
                >
                  {isMissed && <span className="text-[7px] leading-none">✕</span>}
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-[#8d6e63] tabular-nums">
            ({fmtNum(stats.misses, lang)}/{fmtNum(stats.maxMisses, lang)})
          </span>
        </div>

        {/* Coffee Turbo Indicator if active */}
        {coffeeTimer > 0 && (
          <div className="flex items-center gap-1.5 bg-[#4e260e] border border-[#d35400] px-2 py-1 rounded text-[#ffe082] animate-pulse">
            <Coffee className="w-3 h-3" />
            <span className="font-bold tracking-wide tabular-nums">
              {T.turboLabel} {fmtNum(coffeeTimer.toFixed(1), lang)}{isFa ? 'ث' : 's'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
