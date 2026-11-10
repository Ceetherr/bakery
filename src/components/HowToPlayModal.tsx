/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, AlertTriangle, Heart, Zap, ArrowLeftRight, Smartphone } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#241719] border-4 border-[#54342a] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-[#f4e8c1] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#4e342e] pb-3 mb-4">
          <h2 className="text-sm sm:text-base text-[#f5c542] tracking-wide flex items-center gap-2">
            <span>🥖</span> HOW TO PLAY
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#bcaaa4] hover:text-white bg-[#3e2723] rounded hover:bg-[#4e342e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-[10px] sm:text-xs leading-relaxed">
          {/* Controls */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723]">
            <h3 className="text-[#e0a96d] font-bold mb-2 flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4 text-[#f5c542]" /> CONTROLS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#d7ccc8]">
              <div>
                <span className="text-[#fff] font-bold">Desktop:</span> Arrow Keys (<kbd className="bg-[#2b1b1c] px-1 py-0.5 rounded text-[9px] border border-[#54342a]">←</kbd> <kbd className="bg-[#2b1b1c] px-1 py-0.5 rounded text-[9px] border border-[#54342a]">→</kbd>) or <kbd className="bg-[#2b1b1c] px-1 py-0.5 rounded text-[9px] border border-[#54342a]">A</kbd> / <kbd className="bg-[#2b1b1c] px-1 py-0.5 rounded text-[9px] border border-[#54342a]">D</kbd>.
              </div>
              <div>
                <span className="text-[#fff] font-bold">Mobile:</span> Tap or slide left/right on the bottom controls, or drag the cat directly!
              </div>
            </div>
          </div>

          {/* Bread Menu */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723] space-y-2">
            <h3 className="text-[#e0a96d] font-bold mb-2 flex items-center gap-1.5">
              <img src="/assets/breads/bread_croissant.png" alt="Pastry" className="pixel-art w-5 h-4 object-contain inline" />
              <span>FRESH BAKERY ITEMS</span>
            </h3>
            
            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_toast.png" alt="Toast" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">Plain Toast</div>
                  <div className="text-[#a1887f] text-[9px]">Standard baked toast</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+1 PT</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_baguette.png" alt="Baguette" className="pixel-art w-8 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">French Baguette</div>
                  <div className="text-[#a1887f] text-[9px]">Crisp rustic baguette</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+3 PTS</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_croissant.png" alt="Croissant" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">Croissant</div>
                  <div className="text-[#a1887f] text-[9px]">Flaky rolled golden pastry</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+5 PTS</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_challah.png" alt="Challah" className="pixel-art w-7 h-6 object-contain" />
                <div>
                  <div className="font-bold text-white">Challah & Cinnamon Swirl</div>
                  <div className="text-[#a1887f] text-[9px]">Braided loaves & sweet rolls</div>
                </div>
              </div>
              <span className="text-[#f5c542] font-bold">+4 PTS</span>
            </div>

            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5 bg-[#4a3b00]/30 p-1.5 rounded">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_golden.png" alt="Golden Bread" className="pixel-art w-8 h-6 object-contain drop-shadow-[0_0_6px_#ffd700]" />
                <div>
                  <div className="font-bold text-[#ffd700] flex items-center gap-1">
                    <span>Golden Bread</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#ffd700]" />
                  </div>
                  <div className="text-[#d4af37] text-[9px]">Super rare, glittering & falls fast!</div>
                </div>
              </div>
              <span className="text-[#ffd700] font-bold">+10 PTS</span>
            </div>

            <div className="flex items-center justify-between bg-[#381111]/40 p-1.5 rounded border border-[#e63946]/30">
              <div className="flex items-center gap-2.5">
                <img src="/assets/breads/bread_moldy.png" alt="Moldy Bread" className="pixel-art w-7 h-6 object-contain drop-shadow-[0_0_4px_#27ae60]" />
                <div>
                  <div className="font-bold text-[#e63946] flex items-center gap-1">
                    <span>Moldy Bread</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#e63946]" />
                  </div>
                  <div className="text-[#ef9a9a] text-[9px]">Spoiled with toxic spores! DO NOT EAT</div>
                </div>
              </div>
              <span className="text-[#e63946] font-bold">-1 LIFE</span>
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-[#1a0f11] p-3 rounded border border-[#3e2723] space-y-2">
            <h3 className="text-[#e0a96d] font-bold mb-2">✨ SPECIAL POWER-UPS</h3>
            <div className="flex items-center justify-between border-b border-[#2b1b1c] pb-1.5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#e63946] fill-[#e63946]" />
                <div>
                  <div className="font-bold text-white">Milk Saucer</div>
                  <div className="text-[#a1887f] text-[9px]">Fresh milk restores 1 lost life</div>
                </div>
              </div>
              <span className="text-[#a5d6a7] font-bold">+1 HEART</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ffb74d]" />
                <div>
                  <div className="font-bold text-white">Coffee Cup</div>
                  <div className="text-[#a1887f] text-[9px]">Hot espresso turbo speed for 8s</div>
                </div>
              </div>
              <span className="text-[#ffe082] font-bold">2X SPEED</span>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-[#2b1b1c] p-3 rounded border border-[#54342a] text-[#d7ccc8]">
            <h4 className="font-bold text-[#f5c542] mb-1">⚠️ RULES & GAME OVER</h4>
            <ul className="list-disc list-inside space-y-1 text-[9px] sm:text-[10px]">
              <li>You start with <strong>3 Lives</strong>. Eating moldy bread costs 1 life.</li>
              <li>Bread that touches the floor counts as a <strong>miss</strong>.</li>
              <li>Reaching <strong>5 dropped breads</strong> or losing all lives causes <strong>Game Over</strong>!</li>
              <li>Falling speed and spawn rate increase as your score climbs!</li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#e67e22] hover:bg-[#d35400] text-white font-bold text-xs rounded pixel-btn border border-[#a04000]"
          >
            GOT IT, LET'S PLAY!
          </button>
        </div>
      </div>
    </div>
  );
};
