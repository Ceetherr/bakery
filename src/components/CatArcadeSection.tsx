/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CatColorId, GameScreen, GameStats } from '../types';
import { CAT_COLORS } from '../sprites';
import { CAT_UI_TEXT, FA_CAT_COLORS, Language } from '../breadShift/i18n';
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
  lang?: Language;
}

export const CatArcadeSection: React.FC<CatArcadeSectionProps> = ({
  isMuted,
  onToggleMute,
  onBackToBakery,
  lang = 'en',
}) => {
  const isFa = lang === 'fa';
  const T = CAT_UI_TEXT[lang];

  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [selectedColorId, setSelectedColorId] = useState<CatColorId>('orange');
  const [catName, setCatName] = useState<string>('Marmalade');
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const statsRef = useRef<GameStats>(stats);
  statsRef.current = stats;

  const [isPaused, setIsPaused] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<'lives' | 'misses'>('lives');
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [coffeeTimer, setCoffeeTimer] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameRunId, setGameRunId] = useState(1);
  const runStartHighScoreRef = useRef(0);

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
    const isDefaultName =
      catName.toLowerCase() === 'marmalade' ||
      CAT_COLORS.some(
        (c) =>
          c.name.toLowerCase() === catName.toLowerCase() ||
          FA_CAT_COLORS[c.id]?.name === catName
      );
    if (newCat && (!catName.trim() || isDefaultName)) {
      const nextDefault = isFa ? FA_CAT_COLORS[newCat.id]?.name || newCat.name : newCat.name;
      setCatName(nextDefault);
      try {
        localStorage.setItem('cat_bread_cat_name', nextDefault);
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

    runStartHighScoreRef.current = statsRef.current.highScore;
    setStats((prev) => ({
      ...INITIAL_STATS,
      highScore: prev.highScore,
    }));
    setIsNewRecord(false);
    setIsPaused(false);
    setCoffeeTimer(0);
    setGameRunId((id) => id + 1);
    setScreen('PLAYING');
  };

  const handleGameOver = useCallback((reason: 'lives' | 'misses') => {
    setGameOverReason(reason);
    setScreen('GAMEOVER');

    const current = statsRef.current;
    if (current.score > runStartHighScoreRef.current) {
      setIsNewRecord(true);
      try {
        localStorage.setItem('cat_bread_best_score', String(current.score));
      } catch {
        // ignore
      }
    }
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
    <div
      className={`w-full max-w-4xl mx-auto px-3 sm:px-6 py-3 space-y-3 ${isFa ? 'font-vazir rtl' : ''}`}
      dir={isFa ? 'rtl' : 'ltr'}
    >
      {/* Side Game Sub-bar */}
      <div className="flex items-center justify-between bg-[#241714] border-2 border-[#4d3023] rounded px-3 py-2 text-xs">
        <button
          onClick={() => {
            sound.stopMusic();
            onBackToBakery();
          }}
          className="inline-flex items-center gap-1.5 text-[#f4e8c1] hover:text-[#f5c542] cursor-pointer font-pixel-ui"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isFa ? 'rotate-180' : ''}`} />
          <span>{T.backToBakery}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[#cbb596]">{T.subBarTitle}</span>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="inline-flex items-center gap-1 bg-[#3a251c] hover:bg-[#4d3227] px-2.5 py-1 rounded border border-[#6b4635] text-[#f4e8c1] cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#f5c542]" />
            <span>{T.rulesBtn}</span>
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
            lang={lang}
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
                lang={lang}
              />
            </div>

            <GameCanvas
              key={gameRunId}
              catConfig={selectedCatConfig}
              stats={stats}
              isPaused={isPaused || screen === 'GAMEOVER'}
              isGameOver={screen === 'GAMEOVER'}
              onUpdateStats={setStats}
              onGameOver={handleGameOver}
              onCoffeeTimeChange={setCoffeeTimer}
              onTogglePause={handleTogglePause}
              lang={lang}
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
          lang={lang}
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
          lang={lang}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} lang={lang} />
      )}
    </div>
  );
};
