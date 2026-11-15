/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ACHIEVEMENTS, BREAD_RECIPES, SHOP_UPGRADES } from '../data';
import { BakerySaveData, DaySummary, UpgradeId } from '../types';
import {
  FA_ACHIEVEMENTS,
  FA_BREAD_NAMES,
  FA_UPGRADES,
  Language,
  SHOP_MODAL_TEXT,
  fmtNum,
} from '../i18n';
import { BreadSprite } from '../PixelArt';
import { Coins, Star, Award, ShoppingBag, ArrowRight, RotateCcw } from 'lucide-react';

interface ShopModalProps {
  summary: DaySummary | null;
  saveData: BakerySaveData;
  onBuyUpgrade: (id: UpgradeId) => void;
  onStartNextDay: () => void;
  onRetryDay: () => void;
  onCloseOnly?: () => void;
  lang?: Language;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  summary,
  saveData,
  onBuyUpgrade,
  onStartNextDay,
  onRetryDay,
  onCloseOnly,
  lang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'achievements'>('shop');
  const isFa = lang === 'fa';
  const T = SHOP_MODAL_TEXT[lang];
  const isFailedDay = summary?.failedDay ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
      <div
        className={`bg-[#251815] border-4 border-[#5c3a28] rounded-md max-w-3xl w-full max-h-[90vh] flex flex-col pixel-box text-[#f4e8c1] ${
          isFa ? 'font-vazir text-right rtl' : ''
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#1c120f] border-b-2 border-[#422a1e] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-pixel-display text-xs sm:text-sm text-[#f5c542]">
              {summary
                ? isFailedDay
                  ? T.dayClosedEarly.replace('{day}', fmtNum(summary.day, lang))
                  : T.dayComplete.replace('{day}', fmtNum(summary.day, lang))
                : T.shopTitle}
            </h2>
            <p className="text-xs text-[#cbb596] mt-0.5">
              {isFailedDay ? T.subFailed : T.subSuccess}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-[#f5c542]">
              <Coins className="w-4 h-4" />
              {fmtNum(saveData.coins, lang)} {T.coinsLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#f4c44e]">
              <Star className="w-4 h-4 fill-current" />
              {fmtNum(saveData.reputation.toFixed(1), lang)} / {fmtNum('5.0', lang)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* End-of-Day Summary Strip */}
          {summary && (
            <div className="bg-[#1b110f] border-2 border-[#4a3024] rounded p-3.5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">{T.scoreLabel}</div>
                  <div className="font-pixel-display text-xs text-[#f5c542] mt-1 tabular-nums">
                    {fmtNum(summary.scoreEarned, lang)}
                  </div>
                </div>
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">{T.earnedLabel}</div>
                  <div className="font-pixel-display text-xs text-[#f5c542] mt-1 tabular-nums">
                    +{fmtNum(summary.coinsEarned + summary.tipsEarned, lang)}
                    {T.coinSuffix}
                  </div>
                </div>
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">{T.specialsLabel}</div>
                  <div className="font-pixel-display text-xs text-[#ffd561] mt-1 tabular-nums">
                    {fmtNum(summary.specialsFulfilled, lang)}×
                  </div>
                </div>
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">{T.ordersLabel}</div>
                  <div className="font-pixel-display text-xs text-[#f4e8c1] mt-1 tabular-nums">
                    {fmtNum(summary.ordersCompleted, lang)}
                  </div>
                </div>
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">
                    {summary.extrasServed && summary.extrasServed > 0
                      ? T.extrasLabel
                      : T.mistakesLabel}
                  </div>
                  <div
                    className={`font-pixel-display text-xs mt-1 tabular-nums ${
                      summary.extrasServed && summary.extrasServed > 0
                        ? 'text-[#7cc4e0]'
                        : 'text-[#e37266]'
                    }`}
                  >
                    {summary.extrasServed && summary.extrasServed > 0
                      ? `${fmtNum(summary.extrasServed, lang)}×`
                      : fmtNum(summary.mistakes + summary.walkouts, lang)}
                  </div>
                </div>
                <div className="bg-[#261915] p-2 rounded">
                  <div className="text-[10px] text-[#a88d73]">{T.repDeltaLabel}</div>
                  <div
                    className={`font-pixel-display text-xs mt-1 tabular-nums ${
                      summary.reputationChange >= 0 ? 'text-[#69c79b]' : 'text-[#e37266]'
                    }`}
                  >
                    {summary.reputationChange >= 0 ? '+' : ''}
                    {fmtNum(summary.reputationChange.toFixed(2), lang)}★
                  </div>
                </div>
              </div>

              {/* Newly Unlocked Breads Banner */}
              {summary.newlyUnlockedBreads.length > 0 && !isFailedDay && (
                <div className="bg-[#2b2015] border border-[#8f6a2e] rounded p-2.5 flex items-center gap-3">
                  <BreadSprite breadId={summary.newlyUnlockedBreads[0]} size={38} outcome="perfect" />
                  <div className="text-xs">
                    <div className="font-bold text-[#f5c542]">{T.newRecipesTitle}</div>
                    <div className="text-[#e6d5b8]">
                      {summary.newlyUnlockedBreads
                        .map((b) => (isFa ? FA_BREAD_NAMES[b]?.name || b : BREAD_RECIPES[b].name))
                        .join(isFa ? '، ' : ', ')}{' '}
                      — {T.checkBook}
                    </div>
                  </div>
                </div>
              )}

              {/* Newly Unlocked Achievements */}
              {summary.newlyUnlockedAchievements.length > 0 && (
                <div className="bg-[#1b2b28] border border-[#3b8c84] rounded p-2.5 text-xs text-[#a5e3dc] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#f5c542] shrink-0" />
                  <span>
                    {T.achUnlocked}{' '}
                    <strong>
                      {summary.newlyUnlockedAchievements
                        .map(
                          (id) =>
                            (isFa
                              ? FA_ACHIEVEMENTS[id]?.title
                              : ACHIEVEMENTS.find((a) => a.id === id)?.title) || id
                        )
                        .join(isFa ? '، ' : ', ')}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Shop vs Achievements Tabs */}
          <div className="flex items-center gap-2 border-b border-[#422a1e] pb-2">
            <button
              onClick={() => setActiveTab('shop')}
              className={`px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'shop'
                  ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                  : 'bg-[#1c120f] text-[#cbb596] hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{T.upgradesTab}</span>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'achievements'
                  ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                  : 'bg-[#1c120f] text-[#cbb596] hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {T.achievementsTab
                  .replace('{owned}', fmtNum(saveData.achievements.length, lang))
                  .replace('{total}', fmtNum(ACHIEVEMENTS.length, lang))}
              </span>
            </button>
          </div>

          {/* Tab Content: Shop */}
          {activeTab === 'shop' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_UPGRADES.map((upg) => {
                const level = saveData.upgrades[upg.id] || 0;
                const isMaxed = level >= upg.maxLevel;
                const cost = upg.baseCost + level * upg.costStep;
                const canAfford = saveData.coins >= cost && !isMaxed;

                const upgName = isFa ? FA_UPGRADES[upg.id]?.name || upg.name : upg.name;
                const upgDesc = isFa
                  ? FA_UPGRADES[upg.id]?.description || upg.description
                  : upg.description;

                return (
                  <div
                    key={upg.id}
                    className="bg-[#1c120f] border-2 border-[#422a1e] rounded p-3 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#f5c542]">{upgName}</span>
                        <span className="text-[11px] text-[#9cc9c3] tabular-nums">
                          {upg.category === 'decor'
                            ? isMaxed
                              ? T.owned
                              : T.decor
                            : T.level
                                .replace('{lv}', fmtNum(level, lang))
                                .replace('{max}', fmtNum(upg.maxLevel, lang))}
                        </span>
                      </div>
                      <p
                        className={`font-pixel-ticket text-base leading-snug text-[#d6c5aa] mt-1 ${
                          isFa ? 'font-sans' : ''
                        }`}
                      >
                        {upgDesc}
                      </p>
                    </div>

                    <button
                      onClick={() => onBuyUpgrade(upg.id)}
                      disabled={!canAfford}
                      className={`w-full py-2 px-3 rounded font-pixel-ui text-xs pixel-btn cursor-pointer border ${
                        isMaxed
                          ? 'bg-[#2a3b34] border-[#3d6355] text-[#9de0c2]'
                          : canAfford
                          ? 'bg-[#3b8c84] hover:bg-[#46a39a] border-[#225954] text-white'
                          : 'bg-[#261a16] border-[#3d2922] text-[#7a6454]'
                      }`}
                    >
                      {isMaxed
                        ? T.maxedOut
                        : T.buyUpgrade.replace('{cost}', fmtNum(cost, lang))}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab Content: Achievements */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = saveData.achievements.includes(ach.id);
                const title = isFa ? FA_ACHIEVEMENTS[ach.id]?.title || ach.title : ach.title;
                const desc = isFa
                  ? FA_ACHIEVEMENTS[ach.id]?.description || ach.description
                  : ach.description;

                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded border-2 flex items-start gap-2.5 ${
                      unlocked
                        ? 'bg-[#1c2b26] border-[#3b8c84] text-[#f4e8c1]'
                        : 'bg-[#19100e] border-[#36221a] text-[#856b58]'
                    }`}
                  >
                    <Award
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        unlocked ? 'text-[#f5c542]' : 'text-[#543c2e]'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-xs">{title}</div>
                      <div
                        className={`font-pixel-ticket text-base leading-tight mt-0.5 ${
                          isFa ? 'font-sans' : ''
                        }`}
                      >
                        {desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3.5 bg-[#1c120f] border-t-2 border-[#422a1e] flex items-center justify-end gap-3">
          {onCloseOnly && !summary && (
            <button
              onClick={onCloseOnly}
              className="px-5 py-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border border-[#225954] pixel-btn cursor-pointer"
            >
              {T.doneShopping}
            </button>
          )}
          {summary && isFailedDay && (
            <button
              onClick={onRetryDay}
              className="px-5 py-2.5 bg-[#d95f3b] hover:bg-[#e86e48] text-white font-pixel-ui text-xs rounded border border-[#7c2e16] pixel-btn flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{T.retryDay.replace('{day}', fmtNum(summary.day, lang))}</span>
            </button>
          )}
          {summary && !isFailedDay && (
            <button
              onClick={onStartNextDay}
              className="px-5 py-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border border-[#225954] pixel-btn flex items-center gap-2 cursor-pointer"
            >
              <span>{T.startNextDay.replace('{day}', fmtNum(saveData.day, lang))}</span>
              <ArrowRight className={`w-4 h-4 ${isFa ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
