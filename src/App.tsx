/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sound } from './audio';
import { BreadShiftGame } from './breadShift/BreadShiftGame';
import { CatArcadeSection } from './components/CatArcadeSection';
import { Volume2, VolumeX } from 'lucide-react';

type AppMode = 'BREAD_SHIFT' | 'CAT_ARCADE';

export default function App() {
  const [mode, setMode] = useState<AppMode>('BREAD_SHIFT');
  const [isMuted, setIsMuted] = useState(false);
  const [recipesSignal, setRecipesSignal] = useState(0);
  const [shopSignal, setShopSignal] = useState(0);

  useEffect(() => {
    setIsMuted(sound.getMuted());
  }, []);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleSwitchMode = (nextMode: AppMode) => {
    if (nextMode === mode) return;
    sound.stopMusic();
    sound.playButtonClick();
    setMode(nextMode);
  };

  return (
    <div className="min-h-screen bg-[#160f0e] text-[#f4e8c1] flex flex-col select-none overflow-x-hidden">
      {/* 3-Zone Cozy Bakery Top Bar */}
      <header className="bg-[#1e1310] border-b-2 border-[#4d3023]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            onClick={() => handleSwitchMode('BREAD_SHIFT')}
            className="font-pixel-display text-[11px] sm:text-sm text-[#f5c542] whitespace-nowrap shrink-0 cursor-pointer hover:brightness-110 transition-all"
          >
            <span className="sm:hidden">BARBAR</span>
            <span className="hidden sm:inline">BARBAR BAKERY</span>
          </button>

          {/* Zone 2: Clean Single-line Navigation Links */}
          <nav className="flex items-center gap-4 sm:gap-6 text-xs font-pixel-ui">
            <button
              onClick={() => handleSwitchMode('BREAD_SHIFT')}
              className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                mode === 'BREAD_SHIFT'
                  ? 'border-[#f5c542] text-[#fbf3de] font-bold'
                  : 'border-transparent text-[#bba182] hover:text-[#fbf3de]'
              }`}
            >
              <span className="sm:hidden">Bakery</span>
              <span className="hidden sm:inline">Bread Shift</span>
            </button>

            <button
              onClick={() => handleSwitchMode('CAT_ARCADE')}
              className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                mode === 'CAT_ARCADE'
                  ? 'border-[#f5c542] text-[#fbf3de] font-bold'
                  : 'border-transparent text-[#bba182] hover:text-[#fbf3de]'
              }`}
            >
              <span className="sm:hidden">Cat Game</span>
              <span className="hidden sm:inline">Cat Arcade</span>
            </button>

            {mode === 'BREAD_SHIFT' && (
              <>
                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setRecipesSignal((n) => n + 1);
                  }}
                  className="hidden md:inline-block whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-[#bba182] hover:text-[#fbf3de] transition-colors cursor-pointer"
                >
                  Recipes
                </button>
                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setShopSignal((n) => n + 1);
                  }}
                  className="hidden md:inline-block whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-[#bba182] hover:text-[#fbf3de] transition-colors cursor-pointer"
                >
                  Shop
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Single Primary Audio Action */}
          <div className="shrink-0">
            <button
              onClick={handleToggleMute}
              className="min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer pixel-btn"
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#e37266]" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#69c79b]" />
                  <span className="hidden sm:inline">Sound On</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start py-2 sm:py-4">
        {mode === 'BREAD_SHIFT' ? (
          <BreadShiftGame
            onOpenSideGame={() => handleSwitchMode('CAT_ARCADE')}
            externalOpenRecipesSignal={recipesSignal}
            externalOpenShopSignal={shopSignal}
          />
        ) : (
          <CatArcadeSection
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onBackToBakery={() => handleSwitchMode('BREAD_SHIFT')}
          />
        )}
      </main>
    </div>
  );
}
