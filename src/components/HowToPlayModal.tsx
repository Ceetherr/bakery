/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, AlertTriangle, Heart, Zap, ArrowLeftRight } from 'lucide-react';
import { CAT_UI_TEXT, Language, fmtNum } from '../breadShift/i18n';

interface HowToPlayModalProps {
  onClose: () => void;
  lang?: Language;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose, lang = 'en' }) => {
  const isFa = lang === 'fa';
  const T = CAT_UI_TEXT[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#241719] border-4 border-[#54342a] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-[#f4e8c1] shadow-2xl ${
          isFa ? 'font-vazir rtl text-right' : ''
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#4e342e] pb-3 mb-4">
          <h2 className="text-sm sm:text-base text-[#f5c542] tracking-wide flex items-center gap-2">
            <span>🥖</span> {T.howToPlayTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#bcaaa4] hover:text-white bg-[#3e2723] rounded hover:bg-[#4e342e] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-[10px] sm:text-xs leading-relaxed">
          {/* Controls */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723]">
            <h3 className="text-[#e0a96d] font-bold mb-2 flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-[#f5c542]" /> {T.controlsTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#d7ccc8]">
              <div>
                <span className="text-[#fff] font-bold">{T.desktopLabel}</span> {T.desktopDesc}
              </div>
              <div>
                <span className="text-[#fff] font-bold">{T.mobileLabel}</span> {T.mobileDesc}
              </div>
            </div>
          </div>

          {/* Bread Menu */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723] space-y-2">
            <h3 className="text-[#e0a96d] font-bold mb-2 flex items-center gap-1.5">
              <img src="/assets/breads/bread_croissant.png" alt="Pastry" className="pixel-art w-5 h-4 object-contain inline" />
              <span>{T.freshItemsTitle}</span>
            </h3>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_toast.png" alt="Toast" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">{T.plainToastTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.plainToastDesc}</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+{fmtNum(1, lang)} {T.pts}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_baguette.png" alt="Baguette" className="pixel-art w-8 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">{T.baguetteTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.baguetteDesc}</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+{fmtNum(3, lang)} {T.pts}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_croissant.png" alt="Croissant" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">{T.croissantTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.croissantDesc}</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+{fmtNum(5, lang)} {T.pts}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_challah.png" alt="Challah" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">{T.challahTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.challahDesc}</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+{fmtNum(4, lang)} {T.pts}</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5 bg-[#4a3b00]/30 p-1.5 rounded">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_golden.png" alt="Golden Bread" className="pixel-art w-8 h-6 object-contain drop-shadow-[0_0_6px_#ffd700]" />
                <div>
                  <div className="font-bold text-[#ffd700] flex items-center gap-1">
                    <span>{T.goldenTitle}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
                  </div>
                  <div className="text-[#d4af37] text-[9px]">{T.goldenDesc}</div>
                </div>
              </div>
              <span className="text-[#ffd700] font-bold">+{fmtNum(10, lang)} {T.pts}</span>
            </div>

            <div className="flex items-center justify-between bg-[#381111]/40 p-1.5 rounded border border-[#e63946]/30">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_moldy.png" alt="Moldy Bread" className="pixel-art w-7 h-6 object-contain drop-shadow-[0_0_4px_#27ae60]" />
                <div>
                  <div className="font-bold text-[#e63946] flex items-center gap-1">
                    <span>{T.moldyTitle}</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#e63946]" />
                  </div>
                  <div className="text-[#ef9a9a] text-[9px]">{T.moldyDesc}</div>
                </div>
              </div>
              <span className="text-[#e63946] font-bold">{T.minusLifeTag}</span>
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723] space-y-2">
            <h3 className="text-[#e0a96d] font-bold mb-2">{T.powerUpsTitle}</h3>
            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#e63946] fill-[#e63946]" />
                <div>
                  <div className="font-bold text-white">{T.milkTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.milkDesc}</div>
                </div>
              </div>
              <span className="text-[#a5d6a7] font-bold">{T.milkTag}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ffb74d]" />
                <div>
                  <div className="font-bold text-white">{T.coffeeTitle}</div>
                  <div className="text-[#a1887f] text-[9px]">{T.coffeeDesc}</div>
                </div>
              </div>
              <span className="text-[#ffe082] font-bold">{T.coffeeTag}</span>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-[#2b1b1c] p-3 rounded border border-[#54342a] text-[#d7ccc8]">
            <h4 className="font-bold text-[#f5c542] mb-1">{T.rulesTitle}</h4>
            <ul className="list-disc list-inside space-y-1 text-[9px] sm:text-[10px]">
              <li>{T.rule1}</li>
              <li>{T.rule2}</li>
              <li>{T.rule3}</li>
              <li>{T.rule4}</li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#e67e22] hover:bg-[#d35400] text-white font-bold text-xs rounded pixel-btn border border-[#a04000] cursor-pointer"
          >
            {T.gotItPlay}
          </button>
        </div>
      </div>
    </div>
  );
};
