/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { sound } from './audio';
import { BreadShiftGame } from './breadShift/BreadShiftGame';
import { CatArcadeSection } from './components/CatArcadeSection';
import { Language, UI_TEXT } from './breadShift/i18n';
import { Languages, Volume2, VolumeX } from 'lucide-react';

type AppMode = 'BREAD_SHIFT' | 'CAT_ARCADE';

const LANG_KEY = 'barbar_bakery_lang';
const SAVE_KEY = 'golden_crust_bread_shift_v1';

export default function App() {
  const [mode, setMode] = useState<AppMode>('BREAD_SHIFT');
  const [isMuted, setIsMuted] = useState(false);
  const [recipesSignal, setRecipesSignal] = useState(0);
  const [shopSignal, setShopSignal] = useState(0);
  const [lang, setLang] = useState<Language>(() => {
    try {
      const storedLang = localStorage.getItem(LANG_KEY);
      if (storedLang === 'fa' || storedLang === 'en') {
        return storedLang;
      }
      const rawSave = localStorage.getItem(SAVE_KEY);
      if (rawSave) {
        const parsed = JSON.parse(rawSave);
        if (parsed?.lang === 'fa' || parsed?.lang === 'en') {
          return parsed.lang;
        }
      }
    } catch {
      // ignore storage errors
    }
    return 'en';
  });

  useEffect(() => {
    setIsMuted(sound.getMuted());
  }, []);

  useEffect(() => {
    const isRtl = lang === 'fa';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const handleToggleLang = () => {
    sound.playButtonClick();
    setLang((prev) => (prev === 'fa' ? 'en' : 'fa'));
  };

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

  const isFa = lang === 'fa';
  const T = UI_TEXT[lang];

  return (
    <div
      dir={isFa ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#160f0e] text-[#f4e8c1] flex flex-col select-none overflow-x-hidden ${
        isFa ? 'lang-fa font-vazir' : ''
      }`}
    >
      {/* 3-Zone Cozy Bakery Top Bar */}
      <header className="bg-[#1e1310] border-b-2 border-[#4d3023]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            onClick={() => handleSwitchMode('BREAD_SHIFT')}
            className="font-pixel-display text-[11px] sm:text-sm text-[#f5c542] whitespace-nowrap shrink-0 cursor-pointer hover:brightness-110 transition-all"
          >
            <span className="sm:hidden">{T.topBrandShort}</span>
            <span className="hidden sm:inline">{T.brandName}</span>
          </button>

          {/* Zone 2: Clean Single-line Navigation Links */}
          <nav className="flex items-center gap-3.5 sm:gap-6 text-xs font-pixel-ui">
            <button
              onClick={() => handleSwitchMode('BREAD_SHIFT')}
              className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                mode === 'BREAD_SHIFT'
                  ? 'border-[#f5c542] text-[#fbf3de] font-bold'
                  : 'border-transparent text-[#bba182] hover:text-[#fbf3de]'
              }`}
            >
              <span className="sm:hidden">{T.topNavBakeryShort}</span>
              <span className="hidden sm:inline">{T.topNavBakery}</span>
            </button>

            <button
              onClick={() => handleSwitchMode('CAT_ARCADE')}
              className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                mode === 'CAT_ARCADE'
                  ? 'border-[#f5c542] text-[#fbf3de] font-bold'
                  : 'border-transparent text-[#bba182] hover:text-[#fbf3de]'
              }`}
            >
              <span className="sm:hidden">{T.topNavCatShort}</span>
              <span className="hidden sm:inline">{T.topNavCat}</span>
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
                  {T.topNavRecipes}
                </button>
                <button
                  onClick={() => {
                    sound.playButtonClick();
                    setShopSignal((n) => n + 1);
                  }}
                  className="hidden md:inline-block whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-[#bba182] hover:text-[#fbf3de] transition-colors cursor-pointer"
                >
                  {T.topNavShop}
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Language Switcher + Audio Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleToggleLang}
              className="min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f5c542] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer pixel-btn font-bold"
              title="Switch Language / تغییر زبان"
              aria-label="Switch Language / تغییر زبان"
            >
              <Languages className="w-3.5 h-3.5 shrink-0 sm:hidden" />
              <span className="hidden sm:inline">{T.langButton}</span>
              <span className="sm:hidden">{isFa ? 'EN' : 'فا'}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer pixel-btn"
              aria-label={isMuted ? T.soundOn : T.muted}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#e37266]" />
                  <span className="hidden sm:inline">{T.muted}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#69c79b]" />
                  <span className="hidden sm:inline">{T.soundOn}</span>
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
            lang={lang}
            onToggleLang={handleToggleLang}
          />
        ) : (
          <CatArcadeSection
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onBackToBakery={() => handleSwitchMode('BREAD_SHIFT')}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}
