/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameStats } from '../types';
import { CAT_UI_TEXT, Language, fmtNum } from '../breadShift/i18n';
import { RotateCcw, Palette, Trophy, Sparkles, AlertCircle } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  catName?: string;
  isNewRecord: boolean;
  reason: 'lives' | 'misses';
  onPlayAgain: () => void;
  onChangeCat: () => void;
  lang?: Language;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  catName,
  isNewRecord,
  reason,
  onPlayAgain,
  onChangeCat,
  lang = 'en',
}) => {
  const isFa = lang === 'fa';
  const T = CAT_UI_TEXT[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none">
      <div
        className={`bg-[#241719] border-4 border-[#54342a] rounded-lg max-w-sm w-full p-5 text-[#f4e8c1] shadow-2xl pixel-box text-center ${
          isFa ? 'font-vazir rtl' : ''
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Banner */}
        <div className="mb-3">
          <div className="text-[10px] text-[#e53935] tracking-widest font-bold">
            {catName
              ? isFa
                ? `${catName}${T.shiftOverSuffix}`
                : `${catName.toUpperCase()}${T.shiftOverSuffix}`
              : T.bakeryShiftOver}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#e63946] drop-shadow-[0_2px_0_#4a151b]">
            {T.gameOver}
          </h2>
        </div>

        {/* Reason banner */}
        <div className="bg-[#1a0f11] py-1.5 px-3 rounded border border-[#3e2723] text-[9px] sm:text-[10px] text-[#d7ccc8] mb-4 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-[#e53935] shrink-0" />
          <span>{reason === 'misses' ? T.reasonMisses : T.reasonLives}</span>
        </div>

        {/* Score comparison */}
        <div className="bg-[#1a0f11] p-3 rounded-lg border-2 border-[#4e342e] mb-4">
          <div className="text-[10px] text-[#bcaaa4] tracking-wider mb-1">{T.finalScore}</div>
          <div className="text-3xl font-bold text-[#f5c542] drop-shadow-[0_2px_0_#7f5518] tabular-nums">
            {fmtNum(stats.score.toString().padStart(4, '0'), lang)}
          </div>

          {isNewRecord && (
            <div className="inline-flex items-center gap-1.5 mt-2 bg-[#d35400] text-white text-[9px] font-bold px-2.5 py-1 rounded-full animate-bounce">
              <Sparkles className="w-3 h-3 text-[#ffe082]" />
              <span>{T.newBestRecord}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-[#3e2723] text-xs text-[#a1887f]">
            <Trophy className="w-3.5 h-3.5 text-[#ffd700]" />
            <span>{T.bestLabel}:</span>
            <span className="font-bold text-[#e0a96d] tabular-nums">
              {fmtNum(stats.highScore, lang)} {T.pts}
            </span>
          </div>
        </div>

        {/* Breads caught breakdown */}
        <div className="bg-[#1a0f11] p-2.5 rounded border border-[#3e2723] mb-5 text-[9px] text-[#d7ccc8]">
          <div className="text-[#a1887f] font-bold mb-1.5 uppercase tracking-wide">
            {T.pastriesEaten}
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#261819] p-1.5 rounded border border-[#3e2723] flex flex-col items-center justify-between">
              <img src="/assets/breads/bread_toast.png" alt="Toast" className="pixel-art w-6 h-5 object-contain my-0.5" />
              <div className="font-bold text-[#f4e8c1]">{fmtNum(stats.breadsEaten.toast || 0, lang)}</div>
              <div className="text-[8px] text-[#8d6e63]">{T.toast}</div>
            </div>
            <div className="bg-[#261819] p-1.5 rounded border border-[#3e2723] flex flex-col items-center justify-between">
              <img src="/assets/breads/bread_baguette.png" alt="Baguette" className="pixel-art w-7 h-5 object-contain my-0.5" />
              <div className="font-bold text-[#f4e8c1]">{fmtNum(stats.breadsEaten.baguette || 0, lang)}</div>
              <div className="text-[8px] text-[#8d6e63]">{T.baguette}</div>
            </div>
            <div className="bg-[#261819] p-1.5 rounded border border-[#3e2723] flex flex-col items-center justify-between">
              <img src="/assets/breads/bread_croissant.png" alt="Croissant" className="pixel-art w-6 h-5 object-contain my-0.5" />
              <div className="font-bold text-[#f4e8c1]">{fmtNum(stats.breadsEaten.croissant || 0, lang)}</div>
              <div className="text-[8px] text-[#8d6e63]">{T.croissant}</div>
            </div>
            <div className="bg-[#261819] p-1.5 rounded border border-[#3e2723] flex flex-col items-center justify-between">
              <img src="/assets/breads/bread_golden.png" alt="Golden" className="pixel-art w-6 h-5 object-contain my-0.5" />
              <div className="font-bold text-[#ffd700]">{fmtNum(stats.breadsEaten.golden || 0, lang)}</div>
              <div className="text-[8px] text-[#8d6e63]">{T.golden}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-4 bg-[#27ae60] hover:bg-[#219653] text-white font-bold text-xs sm:text-sm rounded border-2 border-[#196f3d] pixel-btn flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{T.playAgain}</span>
          </button>

          <button
            onClick={onChangeCat}
            className="w-full py-2.5 px-4 bg-[#3e2723] hover:bg-[#4e342e] text-[#f4e8c1] font-bold text-[10px] rounded border border-[#5d4037] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-[#f5c542]" />
            <span>{T.changeCat}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
