/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CatColorId, GameScreen, GameStats } from './types';
import { CAT_COLORS } from './sprites';
import { sound } from './audio';
import { HUD } from './components/HUD';
import { ColorPicker } from './components/ColorPicker';
import { GameCanvas } from './GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { HelpCircle } from 'lucide-react';

const INITIAL_STATS: GameStats = {
  score: 0,
  highScore: 0,
  lives: 3,
  maxLives: 3,
  misses: 0,
  maxMisses: 5,
  breadsEaten: {
    toast: 0,
    baguette: 0,
    croissant: 0,
    golden: 0,
  },
  powerUpsCollected: {
    milk: 0,
    coffee: 0,
  },
};

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [selectedColorId, setSelectedColorId] = useState<CatColorId>('orange');
  const [catName, setCatName] = useState<string>('Marmalade');
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<'lives' | 'misses'>('lives');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [coffeeTimer, setCoffeeTimer] = useState(0);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Load saved preferences & high score from localStorage
  useEffect(() => {
    try {
      const savedColor = localStorage.getItem('cat_bread_cat_color') as CatColorId | null;
      if (savedColor && CAT_COLORS.some((c) => c.id === savedColor)) {
        setSelectedColorId(savedColor);
      }

      const savedName = localStorage.getItem('cat_bread_cat_name');
      if (savedName && savedName.trim()) {
        setCatName(savedName.trim());
      }

      const savedHigh = localStorage.getItem('cat_bread_best_score');
      if (savedHigh) {
        const parsed = parseInt(savedHigh, 10);
        if (!isNaN(parsed)) {
          setStats((prev) => ({ ...prev, highScore: parsed }));
        }
      }

      setIsMuted(sound.getMuted());
    } catch {
      // ignore
    }
  }, []);

  // Save cat color selection and update default name if not customized
  const handleSelectColor = (id: CatColorId) => {
    setSelectedColorId(id);
    try {
      localStorage.setItem('cat_bread_cat_color', id);
    } catch {
      // ignore
    }

    const newCat = CAT_COLORS.find((c) => c.id === id);
    // If current cat name matches one of the default cat names or is blank, auto-suggest the new cat's name
    const isDefaultName = CAT_COLORS.some((c) => c.name.toLowerCase() === catName.toLowerCase());
    if (newCat && (!catName.trim() || isDefaultName)) {
      setCatName(newCat.name);
      try {
        localStorage.setItem('cat_bread_cat_name', newCat.name);
      } catch {
        // ignore
      }
    }
  };

  // Update cat custom name
  const handleUpdateCatName = (name: string) => {
    setCatName(name);
    try {
      localStorage.setItem('cat_bread_cat_name', name);
    } catch {
      // ignore
    }
  };

  // Start game shift
  const handleStartGame = () => {
    // Unlock and start music on user gesture
    sound.initContext();
    sound.startMusic();

    setStats((prev) => ({
      ...INITIAL_STATS,
      highScore: prev.highScore,
    }));
    setIsNewRecord(false);
    setIsPaused(false);
    setCoffeeTimer(0);
    setScreen('PLAYING');
  };

  // Game over trigger
  const handleGameOver = useCallback((reason: 'lives' | 'misses') => {
    setGameOverReason(reason);
    setScreen('GAMEOVER');

    setStats((current) => {
      if (current.score > current.highScore) {
        setIsNewRecord(true);
        try {
          localStorage.setItem('cat_bread_best_score', String(current.score));
        } catch {
          // ignore
        }
        return { ...current, highScore: current.score };
      }
      return current;
    });
  }, []);

  // Restart immediately with same cat
  const handlePlayAgain = () => {
    handleStartGame();
  };

  // Return to color selection screen
  const handleChangeCat = () => {
    setScreen('MENU');
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Toggle Pause
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const selectedCatConfig =
    CAT_COLORS.find((c) => c.id === selectedColorId) || CAT_COLORS[0];

  return (
    <div className="min-h-screen bg-[#140c0e] text-[#f4e8c1] flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* Top Header Bar */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between pb-2 border-b border-[#3e2723]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐱</span>
          <span className="text-xs sm:text-sm font-bold text-[#f5c542] tracking-wider">
            CAT & BREAD
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="flex items-center gap-1 text-[10px] bg-[#261819] hover:bg-[#3e2723] px-2.5 py-1.5 rounded border border-[#54342a] text-[#d7ccc8] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#f5c542]" />
            <span className="hidden sm:inline">How To Play</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto my-2">
        {screen === 'MENU' && (
          <ColorPicker
            selectedColorId={selectedColorId}
            catName={catName}
            onUpdateCatName={handleUpdateCatName}
            highScore={stats.highScore}
            onSelectColor={handleSelectColor}
            onStartGame={handleStartGame}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
          />
        )}

        {(screen === 'PLAYING' || screen === 'GAMEOVER') && (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full max-w-[480px]">
              <HUD
                stats={stats}
                catName={catName}
                isMuted={isMuted}
                isPaused={isPaused}
                coffeeTimer={coffeeTimer}
                onToggleMute={handleToggleMute}
                onTogglePause={handleTogglePause}
              />
            </div>

            <GameCanvas
              catConfig={selectedCatConfig}
              stats={stats}
              isPaused={isPaused}
              onUpdateStats={setStats}
              onGameOver={handleGameOver}
              onCoffeeTimeChange={setCoffeeTimer}
              onTogglePause={handleTogglePause}
            />
          </div>
        )}
      </main>

      {/* Pause Modal with Resume & Quit to Main Menu */}
      {isPaused && screen === 'PLAYING' && (
        <PauseModal
          catName={catName}
          score={stats.score}
          highScore={stats.highScore}
          lives={stats.lives}
          maxLives={stats.maxLives}
          misses={stats.misses}
          maxMisses={stats.maxMisses}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onResume={() => setIsPaused(false)}
          onQuit={() => {
            setIsPaused(false);
            setScreen('MENU');
          }}
        />
      )}

      {/* Modals */}
      {screen === 'GAMEOVER' && (
        <GameOverModal
          stats={stats}
          catName={catName}
          isNewRecord={isNewRecord}
          reason={gameOverReason}
          onPlayAgain={handlePlayAgain}
          onChangeCat={handleChangeCat}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}
