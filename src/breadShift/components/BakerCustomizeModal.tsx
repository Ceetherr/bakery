/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BAKER_CUSTOMIZATION_OPTIONS } from '../data';
import { BakerLookConfig } from '../types';
import { BakerAvatarSprite } from '../PixelArt';
import { CUSTOMIZER_TEXT, FA_APRON_COLORS, Language, fmtNum } from '../i18n';
import { X, Shuffle, Check, User, Smile, Scissors, Crown, Shirt, Sparkles } from 'lucide-react';
import { sound } from '../../audio';

interface BakerCustomizeModalProps {
  look: BakerLookConfig;
  onChange: (nextLook: BakerLookConfig) => void;
  onClose: () => void;
  lang?: Language;
}

type CustomTab = 'identity' | 'skin' | 'hair' | 'hat' | 'apron' | 'detail';

export const BakerCustomizeModal: React.FC<BakerCustomizeModalProps> = ({
  look,
  onChange,
  onClose,
  lang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<CustomTab>('identity');
  const isFa = lang === 'fa';
  const T = CUSTOMIZER_TEXT[lang];

  const handleRandomize = () => {
    sound.playButtonClick();
    const { skinColors, hairColors, hairStyles, hats, apronColors, details } =
      BAKER_CUSTOMIZATION_OPTIONS;
    onChange({
      ...look,
      skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
      hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)].id,
      hat: hats[Math.floor(Math.random() * hats.length)].id,
      apronColor: apronColors[Math.floor(Math.random() * apronColors.length)].id,
      detail: details[Math.floor(Math.random() * details.length)].id,
    });
  };

  const tabs: { id: CustomTab; label: string; icon: React.ReactNode }[] = [
    { id: 'identity', label: T.tabs.identity, icon: <User className="w-3.5 h-3.5" /> },
    { id: 'skin', label: T.tabs.skin, icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'hair', label: T.tabs.hair, icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'hat', label: T.tabs.hat, icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'apron', label: T.tabs.apron, icon: <Shirt className="w-3.5 h-3.5" /> },
    { id: 'detail', label: T.tabs.detail, icon: <Smile className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#251815] border-4 border-[#5c3a28] rounded-md max-w-lg w-full flex flex-col pixel-box text-[#f4e8c1] ${
          isFa ? 'font-vazir text-right rtl' : ''
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#1c120f] border-b-2 border-[#422a1e] flex items-center justify-between">
          <h2 className="font-pixel-display text-xs text-[#f5c542]">{T.title}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-[#3a241b] hover:bg-[#4e3125] border border-[#6e4635] rounded text-[#f4e8c1] cursor-pointer"
            aria-label={T.saveBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Sticky Live Portrait Preview & Name Quick Bar */}
        <div className="p-4 bg-[#1b110f] border-b-2 border-[#422a1e] flex items-center gap-4">
          <div className="w-20 h-20 bg-[#2c1d18] border-2 border-[#5c3a28] rounded flex items-center justify-center shrink-0 shadow-inner animate-bread-pop">
            <BakerAvatarSprite look={look} size={72} />
          </div>

          <div className="w-full flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="baker-name-input" className="font-bold text-[#f5c542]">
                {T.bakerName}
              </label>
              <span className="text-[#8d6e63] tabular-nums">
                {fmtNum(look.name.length, lang)}/{fmtNum(16, lang)}
              </span>
            </div>
            <input
              id="baker-name-input"
              type="text"
              maxLength={16}
              value={look.name}
              onChange={(e) => onChange({ ...look, name: e.target.value })}
              placeholder={T.placeholder}
              className="w-full bg-[#261815] border-2 border-[#5c3a28] focus:border-[#f5c542] rounded px-3 py-1.5 text-sm font-bold text-[#fbf3de] outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-6 bg-[#170e0c] border-b-2 border-[#422a1e] text-[11px] font-pixel-ui">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playButtonClick();
                  setActiveTab(tab.id);
                }}
                className={`min-h-[44px] py-2 px-1 text-center cursor-pointer flex flex-col items-center justify-center gap-0.5 border-e border-[#2e1c16] last:border-e-0 transition-colors ${
                  active
                    ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                    : 'text-[#cbb596] hover:bg-[#251815] hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="p-4 min-h-[220px] max-h-[320px] overflow-y-auto space-y-4">
          {activeTab === 'identity' && (
            <div className="space-y-4 py-2">
              <div className="text-xs text-[#d9c8ac] leading-relaxed">{T.identityHint}</div>
              <button
                type="button"
                onClick={handleRandomize}
                className="min-h-[46px] w-full inline-flex items-center justify-center gap-2 text-xs font-bold bg-[#3a251c] hover:bg-[#4d3227] border-2 border-[#6b4635] px-4 py-2.5 rounded text-[#f4e8c1] cursor-pointer pixel-btn"
              >
                <Shuffle className="w-4 h-4 text-[#f5c542]" />
                <span>{T.randomize}</span>
              </button>
            </div>
          )}

          {activeTab === 'skin' && (
            <div className="space-y-3 py-1">
              <div className="text-xs font-bold text-[#d9c8ac]">{T.selectSkin}</div>
              <div className="flex flex-wrap gap-3">
                {BAKER_CUSTOMIZATION_OPTIONS.skinColors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, skinColor: hex });
                    }}
                    className={`w-12 h-12 rounded border-2 cursor-pointer transition-transform ${
                      look.skinColor === hex
                        ? 'border-[#f5c542] scale-110 ring-2 ring-[#f5c542]/40'
                        : 'border-[#5c3a28]'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`${T.selectSkin} ${hex}`}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hair' && (
            <div className="space-y-3.5 py-1">
              <div className="text-xs font-bold text-[#d9c8ac]">{T.hairStyle}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BAKER_CUSTOMIZATION_OPTIONS.hairStyles.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, hairStyle: st.id });
                    }}
                    className={`min-h-[44px] px-3 py-2 rounded border-2 text-xs cursor-pointer ${
                      look.hairStyle === st.id
                        ? 'bg-[#e59f2c] border-[#8c5a12] text-[#1c110c] font-bold'
                        : 'bg-[#1b110f] border-[#4a3024] text-[#f4e8c1]'
                    }`}
                  >
                    {T.hairStyles[st.id] || st.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-[#d9c8ac] pt-1">{T.hairColor}</div>
              <div className="flex flex-wrap gap-2.5">
                {BAKER_CUSTOMIZATION_OPTIONS.hairColors.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, hairColor: hex });
                    }}
                    className={`w-10 h-10 rounded border-2 cursor-pointer transition-transform ${
                      look.hairColor === hex
                        ? 'border-[#f5c542] scale-110 ring-2 ring-[#f5c542]/40'
                        : 'border-[#5c3a28]'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`${T.hairColor} ${hex}`}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hat' && (
            <div className="space-y-3 py-1">
              <div className="text-xs font-bold text-[#d9c8ac]">{T.selectHat}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BAKER_CUSTOMIZATION_OPTIONS.hats.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, hat: h.id });
                    }}
                    className={`min-h-[46px] px-3 py-2 rounded border-2 text-xs cursor-pointer ${
                      look.hat === h.id
                        ? 'bg-[#3b8c84] border-[#225954] text-white font-bold'
                        : 'bg-[#1b110f] border-[#4a3024] text-[#f4e8c1]'
                    }`}
                  >
                    {T.hats[h.id] || h.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'apron' && (
            <div className="space-y-3 py-1">
              <div className="text-xs font-bold text-[#d9c8ac]">{T.selectApron}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BAKER_CUSTOMIZATION_OPTIONS.apronColors.map((ap) => (
                  <button
                    key={ap.id}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, apronColor: ap.id });
                    }}
                    className={`min-h-[46px] px-3 py-2 rounded border-2 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                      look.apronColor === ap.id
                        ? 'border-[#f5c542] ring-2 ring-[#f5c542]/40'
                        : 'border-[#4a3024]'
                    }`}
                    style={{
                      backgroundColor: ap.id,
                      color: ap.id === '#dfd3bc' || ap.id === '#e59f2c' ? '#1c110c' : '#ffffff',
                    }}
                  >
                    {isFa ? FA_APRON_COLORS[ap.id] || ap.label : ap.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'detail' && (
            <div className="space-y-3 py-1">
              <div className="text-xs font-bold text-[#d9c8ac]">{T.facialDetail}</div>
              <div className="grid grid-cols-2 gap-2">
                {BAKER_CUSTOMIZATION_OPTIONS.details.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      sound.playButtonClick();
                      onChange({ ...look, detail: d.id });
                    }}
                    className={`min-h-[46px] px-3 py-2 rounded border-2 text-xs cursor-pointer ${
                      look.detail === d.id
                        ? 'bg-[#d95f3b] border-[#7c2e16] text-white font-bold'
                        : 'bg-[#1b110f] border-[#4a3024] text-[#f4e8c1]'
                    }`}
                  >
                    {T.details[d.id] || d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#1c120f] border-t-2 border-[#422a1e] flex justify-end">
          <button
            onClick={() => {
              sound.playDing();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui font-bold text-xs rounded border-2 border-[#225954] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{T.saveBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
