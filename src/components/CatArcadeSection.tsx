/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CatColorId, GameScreen, GameStats } from '../types';
import { CAT_COLORS } from '../sprites';
import { sound } from '../audio';
import { HUD } from './HUD';
import { ColorPicker } from './ColorPicker';
import { GameCanvas } from '../GameCanvas';
import { GameOverModal } from './GameOverModal';
import { PauseModal } from './PauseModal';
import { HowToPlayModal } from './HowToPlayModal';
import { ArrowLeft, HelpCircle } from 'lucide-react';

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

interface CatArcadeSectionProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onBackToBakery: () => void;
}

export const CatArcadeSection: React.FC<CatArcadeSectionProps> = ({
  isMuted,
  onToggleMute,
  onBackToBakery,
}) => {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [selectedColorId, setSelectedColorId] = useState<CatColorId>('orange');
  const [catName, setCatName] = useState<string>('Marmalade');
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<'lives' | 'misses'>('lives');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [coffeeTimer, setCoffeeTimer] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Load saved preferences & high score
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
    } catch {
      // ignore
    }
  }, []);

  // Cleanup arcade loop music on unmount
  useEffect(() => {
    return () => {
      sound.stopMusic();
    };
  }, []);

  const handleSelectColor = (id: CatColorId) => {
    setSelectedColorId(id);
    try {
      localStorage.setItem('cat_bread_cat_color', id);
    } catch {
      // ignore
    }

    const newCat = CAT_COLORS.find((c) => c.id === id);
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

  const handleUpdateCatName = (name: string) => {
    setCatName(name);
    try {
      localStorage.setItem('cat_bread_cat_name', name);
    } catch {
      // ignore
    }
  };

  const handleStartGame = () => {
    sound.initContext();
    sound.startMusic('arcade');

    setStats((prev) => ({
      ...INITIAL_STATS,
      highScore: prev.highScore,
    }));
    setIsNewRecord(false);
    setIsPaused(false);
    setCoffeeTimer(0);
    setScreen('PLAYING');
  };

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

  const handlePlayAgain = () => {
    handleStartGame();
  };

  const handleChangeCat = () => {
    sound.stopMusic();
    setScreen('MENU');
  };

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const selectedCatConfig =
    CAT_COLORS.find((c) => c.id === selectedColorId) || CAT_COLORS[0];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-3 space-y-3">
      {/* Side Game Sub-bar */}
      <div className="flex items-center justify-between bg-[#241714] border-2 border-[#4d3023] rounded px-3 py-2 text-xs">
        <button
          onClick={() => {
            sound.stopMusic();
            onBackToBakery();
          }}
          className="inline-flex items-center gap-1.5 text-[#f4e8c1] hover:text-[#f5c542] cursor-pointer font-pixel-ui"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Bread Shift</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[#cbb596]">Side Game · Cat &amp; Bread Arcade</span>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="inline-flex items-center gap-1 bg-[#3a251c] hover:bg-[#4d3227] px-2.5 py-1 rounded border border-[#6b4635] text-[#f4e8c1] cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#f5c542]" />
            <span>Rules</span>
          </button>
        </div>
      </div>

      {/* Side Game Content */}
      <div className="flex flex-col items-center justify-center">
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
                onToggleMute={onToggleMute}
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
      </div>

      {/* Pause Modal */}
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
          onToggleMute={onToggleMute}
          onResume={() => setIsPaused(false)}
          onQuit={() => {
            sound.stopMusic();
            setIsPaused(false);
            setScreen('MENU');
          }}
        />
      )}

      {/* Game Over Modal */}
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
};
