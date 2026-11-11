/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, LogOut, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

interface PauseModalProps {
  catName: string;
  score: number;
  highScore: number;
  lives: number;
  maxLives: number;
  misses: number;
  maxMisses: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onResume: () => void;
  onQuit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  catName,
  score,
  highScore,
  lives,
  maxLives,
  misses,
  maxMisses,
  isMuted,
  onToggleMute,
  onResume,
  onQuit,
}) => {
  // Listen for any keyboard input to resume instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow browser tabs/control keys, but resume on any gameplay key
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;

      // If user has focused the Quit button and presses Enter/Space, let the Quit button handle it
      const activeEl = document.activeElement;
      if (activeEl && activeEl.getAttribute('data-action') === 'quit') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onResume();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onResume]);

  return (
    <div
      onClick={(e) => {
        // Clicking backdrop immediately resumes
        if (e.target === e.currentTarget) {
          onResume();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none"
    >
      <div className="bg-[#241719] border-4 border-[#54342a] rounded-lg max-w-sm w-full p-5 text-[#f4e8c1] shadow-2xl pixel-box text-center animate-in fade-in zoom-in-95 duration-100">
        {/* Title */}
        <div className="mb-4">
          <div className="text-[10px] text-[#f5c542] tracking-widest font-bold mb-1">
            BAKERY SHIFT ON HOLD
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#f5c542] drop-shadow-[0_2px_0_#7f5518] flex items-center justify-center gap-2">
            <span>⏸️</span> GAME PAUSED
          </h2>
        </div>

        {/* Cat and stats card */}
        <div className="bg-[#1a0f11] p-3 rounded-lg border-2 border-[#4e342e] mb-4 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-2 text-[10px]">
            <span className="text-[#a1887f]">BAKER:</span>
            <span className="font-bold text-[#f4e8c1] flex items-center gap-1">
              <span>🐱</span> {catName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="bg-[#241719] p-1.5 rounded border border-[#3e2723]">
              <div className="text-[8px] text-[#8d6e63]">CURRENT SCORE</div>
              <div className="font-bold text-sm text-[#f5c542] tabular-nums">
                {score.toString().padStart(4, '0')}
              </div>
            </div>
            <div className="bg-[#241719] p-1.5 rounded border border-[#3e2723]">
              <div className="text-[8px] text-[#8d6e63]">BEST RECORD</div>
              <div className="font-bold text-sm text-[#e0a96d] tabular-nums">
                {highScore.toString().padStart(4, '0')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-[#bcaaa4] pt-1">
            <span>LIVES: <strong className="text-[#e63946]">{'❤️'.repeat(lives)}</strong></span>
            <span>DROPPED: <strong className="text-[#e53935]">{misses}/{maxMisses}</strong></span>
          </div>
        </div>

        {/* Quick hint */}
        <p className="text-[10px] text-[#ffe082] font-bold mb-3 animate-pulse">
          ▶ PRESS ANY BUTTON OR CLICK RESUME
        </p>

        {/* Actions */}
        <div className="space-y-2.5">
          {/* Resume button */}
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 bg-[#27ae60] hover:bg-[#219653] active:bg-[#1e824c] text-white font-bold text-xs sm:text-sm rounded border-2 border-[#196f3d] pixel-btn flex items-center justify-center gap-2 cursor-pointer shadow-lg tracking-wider transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME GAME</span>
          </button>

          {/* Sound toggle while paused */}
          <button
            data-action="mute"
            onClick={onToggleMute}
            className="w-full py-2 px-3 bg-[#261819] hover:bg-[#3e2723] text-[#d7ccc8] text-[10px] rounded border border-[#4e342e] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#ef9a9a]" /> : <Volume2 className="w-3.5 h-3.5 text-[#a5d6a7]" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          {/* Quit button */}
          <button
            data-action="quit"
            onClick={onQuit}
            className="w-full py-2.5 px-4 bg-[#8b1c1c] hover:bg-[#a92323] active:bg-[#681414] text-[#ffcdd2] hover:text-white font-bold text-xs rounded border-2 border-[#d32f2f] pixel-btn flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>QUIT TO MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
