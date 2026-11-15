/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ACHIEVEMENTS,
  BREAD_ORDER,
  BREAD_RECIPES,
  CUSTOMER_DIALOGUE_VARIATIONS,
  DEFAULT_BAKER_LOOK,
  EXTRA_INGREDIENTS,
  EXTRA_ITEMS,
  EXTRA_ORDER,
  INGREDIENTS,
  INITIAL_BAKERY_SAVE,
  MODIFIER_LABELS,
  OVENS,
  RARE_REPUTATION_UNLOCKS,
  SHAPES,
  SHOP_UPGRADES,
  WEATHER_OPTIONS,
} from './data';
import {
  ActiveExtraPrep,
  BakedBreadItem,
  BakerySaveData,
  BreadId,
  BreadQualityFeedbackKey,
  BreadShapeId,
  ChaosEventType,
  DaySummary,
  DoughSlot,
  ExtraIngredientId,
  ExtraItemId,
  IngredientId,
  OrderTicket as OrderTicketType,
  OvenSlot,
  OvenTypeId,
  ReadyExtraItem,
  UpgradeId,
  WeatherType,
} from './types';
import {
  evaluateAgainstTicketItem,
  evaluateBakedBread,
  generateDayTickets,
  getLocalizedLoafIssue,
  getUnlockedBreads,
  pickDailySpecial,
} from './logic';
import {
  BakerAvatarSprite,
  BakerySceneBackdrop,
  BreadSprite,
  CustomerSprite,
  ExtraIngredientIcon,
  ExtraItemSprite,
  IngredientIcon,
  ShapeIcon,
  SleepingDoughSprite,
} from './PixelArt';
import { OrderTicket } from './components/OrderTicket';
import { RecipeBookModal } from './components/RecipeBookModal';
import { ReputationMeter } from './components/ReputationMeter';
import { ShopModal } from './components/ShopModal';
import { BakerCustomizeModal } from './components/BakerCustomizeModal';
import {
  FA_BREAD_NAMES,
  FA_CUSTOMER_DIALOGUES,
  FA_CUSTOMER_NAMES,
  FA_EXTRA_INGREDIENTS,
  FA_EXTRAS,
  FA_INGREDIENTS,
  FA_LOGIC_TEXT,
  FA_MODIFIERS,
  FA_OVENS,
  FA_SHAPES,
  FA_WEATHER,
  Language,
  UI_TEXT,
  fmtNum,
} from './i18n';
import { sound } from '../audio';
import {
  Award,
  BookOpen,
  Candy,
  Cat,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Coins,
  Flame,
  Hand,
  Palette,
  Pause,
  Play,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  Trash2,
  UtensilsCrossed,
  Wind,
  Zap,
} from 'lucide-react';

const SAVE_KEY = 'golden_crust_bread_shift_v1';

type StationTab = 'shelf' | 'knead' | 'rest' | 'shape' | 'oven' | 'extras';
type BreadShiftPhase = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'DAY_END';

interface KitchenStatusDrawerProps {
  open: boolean;
  onToggleOpen: () => void;
  kneadingDough: {
    hits: number;
    targetHits: number;
    intendedRecipeId: BreadId | null;
  } | null;
  restingSlots: DoughSlot[];
  shapingBatch: { suggestedRecipeId: BreadId | null } | null;
  readyToBakeBatch: { suggestedRecipeId: BreadId | null } | null;
  ovenSlot: OvenSlot | null;
  teaPrepSlot: ActiveExtraPrep | null;
  lang: Language;
  onJumpToStation: (tab: StationTab, subTab?: 'beverage' | 'dessert') => void;
}

const KitchenStatusDrawer: React.FC<KitchenStatusDrawerProps> = ({
  open,
  onToggleOpen,
  kneadingDough,
  restingSlots,
  shapingBatch,
  readyToBakeBatch,
  ovenSlot,
  teaPrepSlot,
  lang,
  onJumpToStation,
}) => {
  const isFa = lang === 'fa';
  const T = UI_TEXT[lang];

  type StatusRow = {
    key: string;
    station: StationTab;
    subTab?: 'beverage' | 'dessert';
    icon: React.ReactNode;
    title: string;
    rightLabel: string;
    pct: number;
    barClass: string;
    urgent: boolean;
  };

  const rows: StatusRow[] = [];

  if (kneadingDough) {
    const breadName = kneadingDough.intendedRecipeId
      ? isFa
        ? FA_BREAD_NAMES[kneadingDough.intendedRecipeId]?.name
        : BREAD_RECIPES[kneadingDough.intendedRecipeId].name
      : T.artisanDough;
    const done = kneadingDough.hits >= kneadingDough.targetHits;
    const pct = Math.min(100, Math.round((kneadingDough.hits / kneadingDough.targetHits) * 100));
    rows.push({
      key: 'knead',
      station: 'knead',
      icon: <Hand className="w-3.5 h-3.5 text-[#f5c542]" />,
      title: `${T.statusKneading}: ${breadName}`,
      rightLabel: done
        ? T.statusReadyTag
        : `${fmtNum(kneadingDough.hits, lang)}/${fmtNum(kneadingDough.targetHits, lang)}`,
      pct,
      barClass: done ? 'bg-[#5cd68d]' : 'bg-[#e59f2c]',
      urgent: done,
    });
  }

  restingSlots.forEach((slot) => {
    const breadName = slot.suggestedRecipeId
      ? isFa
        ? FA_BREAD_NAMES[slot.suggestedRecipeId]?.name
        : BREAD_RECIPES[slot.suggestedRecipeId].name
      : T.artisanDough;
    const pct = Math.min(100, Math.round((slot.restProgress / slot.targetRestSeconds) * 100));
    const isReady = slot.restProgress >= slot.targetRestSeconds;
    const remSec = Math.max(0, Math.ceil(slot.targetRestSeconds - slot.restProgress));
    rows.push({
      key: slot.id,
      station: 'rest',
      icon: <Wind className="w-3.5 h-3.5 text-[#7cc4e0]" />,
      title: `${T.statusProofing}: ${breadName}`,
      rightLabel: isReady ? T.statusReadyTag : `${fmtNum(remSec, lang)}${T.secSuffix}`,
      pct,
      barClass: isReady ? 'bg-[#5cd68d]' : 'bg-[#7cc4e0]',
      urgent: isReady,
    });
  });

  if (shapingBatch) {
    const breadName = shapingBatch.suggestedRecipeId
      ? isFa
        ? FA_BREAD_NAMES[shapingBatch.suggestedRecipeId]?.name
        : BREAD_RECIPES[shapingBatch.suggestedRecipeId].name
      : T.artisanDough;
    rows.push({
      key: 'shape',
      station: 'shape',
      icon: <Sparkles className="w-3.5 h-3.5 text-[#f5c542]" />,
      title: `${T.statusShaping}: ${breadName}`,
      rightLabel: T.statusReadyTag,
      pct: 100,
      barClass: 'bg-[#f5c542]',
      urgent: false,
    });
  }

  if (readyToBakeBatch && !ovenSlot) {
    const breadName = readyToBakeBatch.suggestedRecipeId
      ? isFa
        ? FA_BREAD_NAMES[readyToBakeBatch.suggestedRecipeId]?.name
        : BREAD_RECIPES[readyToBakeBatch.suggestedRecipeId].name
      : T.artisanDough;
    rows.push({
      key: 'ready_oven',
      station: 'oven',
      icon: <Flame className="w-3.5 h-3.5 text-[#ff8f2b]" />,
      title: `${T.statusReadyOven}: ${breadName}`,
      rightLabel: T.statusReadyTag,
      pct: 100,
      barClass: 'bg-[#ff8f2b]',
      urgent: false,
    });
  }

  if (ovenSlot) {
    const breadName = ovenSlot.suggestedRecipeId
      ? isFa
        ? FA_BREAD_NAMES[ovenSlot.suggestedRecipeId]?.name
        : BREAD_RECIPES[ovenSlot.suggestedRecipeId].name
      : T.artisanDough;
    const isBurning = ovenSlot.elapsedSeconds > ovenSlot.targetMaxSeconds;
    const isGolden = ovenSlot.elapsedSeconds >= ovenSlot.targetMinSeconds && !isBurning;
    const maxScale = ovenSlot.targetMaxSeconds * 1.15;
    const pct = Math.min(100, Math.round((ovenSlot.elapsedSeconds / maxScale) * 100));
    rows.push({
      key: 'oven',
      station: 'oven',
      icon: <Flame className={`w-3.5 h-3.5 ${isBurning ? 'text-[#f28b82]' : 'text-[#ff8f2b]'}`} />,
      title: `${T.statusBaking}: ${breadName}`,
      rightLabel: isBurning
        ? T.statusBurningTag
        : isGolden
        ? T.statusReadyTag
        : `${fmtNum(pct, lang)}%`,
      pct,
      barClass: isBurning ? 'bg-[#c93b3b]' : isGolden ? 'bg-[#f5c542]' : 'bg-[#e59f2c]',
      urgent: isBurning || isGolden,
    });
  }

  if (teaPrepSlot) {
    const def = EXTRA_ITEMS[teaPrepSlot.extraId];
    const drinkName = isFa ? FA_EXTRAS[teaPrepSlot.extraId]?.name || def.name : def.name;
    const inSteepZone =
      !teaPrepSlot.overboiled && teaPrepSlot.progressSeconds >= teaPrepSlot.targetSeconds;
    const pct = Math.min(
      100,
      Math.round((teaPrepSlot.progressSeconds / teaPrepSlot.overboilSeconds) * 100)
    );
    rows.push({
      key: teaPrepSlot.id,
      station: 'extras',
      subTab: 'beverage',
      icon: (
        <Coffee
          className={`w-3.5 h-3.5 ${
            teaPrepSlot.overboiled ? 'text-[#f28b82]' : 'text-[#f5c542]'
          }`}
        />
      ),
      title: `${T.statusBrewing}: ${drinkName}`,
      rightLabel: teaPrepSlot.overboiled
        ? T.statusOverboiledTag
        : inSteepZone
        ? T.statusReadyTag
        : `${fmtNum(pct, lang)}%`,
      pct,
      barClass: teaPrepSlot.overboiled
        ? 'bg-[#c93b3b]'
        : inSteepZone
        ? 'bg-[#5cd68d]'
        : 'bg-[#e59f2c]',
      urgent: teaPrepSlot.overboiled || inSteepZone,
    });
  }

  const urgentCount = rows.filter((r) => r.urgent).length;

  return (
    <div className="bg-[#1b110f] border-2 border-[#5c3a28] rounded-md overflow-hidden">
      {/* Persistent Slim Header Bar */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full min-h-[38px] px-3 py-1.5 bg-[#241714] hover:bg-[#2c1c18] flex items-center justify-between gap-2 text-xs cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-[#f5c542] shrink-0" />
          <span className="font-pixel-display text-[10px] text-[#f5c542] shrink-0">
            {T.kitchenStatusTitle}
          </span>
          {rows.length === 0 ? (
            <span className="text-[11px] text-[#8a6d56] truncate">{T.kitchenStatusIdle}</span>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {rows.map((r) => (
                <span
                  key={r.key}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 tabular-nums ${
                    r.urgent
                      ? 'bg-[#3b2016] border-[#f5c542] text-[#ffd57e]'
                      : 'bg-[#140d0b] border-[#422a1e] text-[#cbb596]'
                  }`}
                >
                  {r.icon}
                  <span>{r.rightLabel}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-[#cbb596]">
          {urgentCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-[#d95f3b] text-white font-bold tabular-nums">
              {fmtNum(urgentCount, lang)}!
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Non-blocking Vertical Timer List Drawer */}
      {open && (
        <div className="p-2.5 border-t border-[#3d261c] bg-[#160e0c] space-y-1.5">
          {rows.length === 0 ? (
            <div className="text-[11px] text-[#8a6d56] text-center py-1">
              {T.kitchenStatusIdle}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-[10px] text-[#a88d73] px-0.5">
                <span>{T.tapToJumpHint}</span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {rows.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => onJumpToStation(r.station, r.subTab)}
                    className={`w-full text-start p-2 rounded border flex flex-col gap-1 cursor-pointer transition-colors ${
                      r.urgent
                        ? 'bg-[#2b1b13] hover:bg-[#362217] border-[#f5c542]/80'
                        : 'bg-[#1f1411] hover:bg-[#291a16] border-[#422a1e]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-[#f4e8c1] truncate">
                        {r.icon}
                        <span className="truncate">{r.title}</span>
                      </span>
                      <span
                        className={`text-[11px] font-bold shrink-0 tabular-nums ${
                          r.urgent ? 'text-[#f5c542]' : 'text-[#cbb596]'
                        }`}
                      >
                        {r.rightLabel}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#120b09] rounded-sm overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${r.barClass}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface BeverageStationProps {
  teaPrepSlot: ActiveExtraPrep | null;
  bevPotIngredients: ExtraIngredientId[];
  matchedBeverageId: ExtraItemId | null;
  currentDay: number;
  orderedExtraIds: Set<ExtraItemId>;
  lang: Language;
  onToggleIngredient: (ingId: ExtraIngredientId) => void;
  onClearPot: () => void;
  onStartBrew: () => void;
  onToggleFlame: () => void;
  onStir: () => void;
  onPour: () => void;
  onDumpOverboiled: () => void;
}

const BeverageStation: React.FC<BeverageStationProps> = ({
  teaPrepSlot,
  bevPotIngredients,
  matchedBeverageId,
  currentDay,
  orderedExtraIds,
  lang,
  onToggleIngredient,
  onClearPot,
  onStartBrew,
  onToggleFlame,
  onStir,
  onPour,
  onDumpOverboiled,
}) => {
  const isFa = lang === 'fa';
  const T = UI_TEXT[lang];

  return (
    <div className="space-y-3">
      {teaPrepSlot ? (
        (() => {
          const def = EXTRA_ITEMS[teaPrepSlot.extraId];
          const drinkName = isFa ? FA_EXTRAS[teaPrepSlot.extraId]?.name || def.name : def.name;
          const totalSpan = teaPrepSlot.overboilSeconds;
          const steepStartPct = Math.round((teaPrepSlot.targetSeconds / totalSpan) * 100);
          const gaugePct = Math.min(
            100,
            Math.round((teaPrepSlot.progressSeconds / totalSpan) * 100)
          );
          const inSteepZone =
            !teaPrepSlot.overboiled && teaPrepSlot.progressSeconds >= teaPrepSlot.targetSeconds;
          const nearBoil =
            inSteepZone &&
            teaPrepSlot.progressSeconds >=
              teaPrepSlot.targetSeconds + (totalSpan - teaPrepSlot.targetSeconds) * 0.65;

          const barColor = teaPrepSlot.overboiled
            ? 'bg-[#c93b3b]'
            : nearBoil
            ? 'bg-[#e86d48]'
            : inSteepZone
            ? 'bg-[#5cd68d]'
            : 'bg-[#e59f2c]';

          const statusText = teaPrepSlot.overboiled
            ? T.bevHeatOverboiled
            : inSteepZone
            ? T.bevHeatReady
            : T.bevHeatWarming;

          return (
            <div
              className={`bg-[#1a100e] border-2 rounded p-3.5 space-y-3 ${
                teaPrepSlot.overboiled
                  ? 'border-[#c93b3b]'
                  : inSteepZone
                  ? 'border-[#5cd68d]'
                  : 'border-[#e59f2c]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ExtraItemSprite
                    id={teaPrepSlot.extraId}
                    size={40}
                    showSteam={!teaPrepSlot.overboiled}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#fbf3de] truncate">{drinkName}</div>
                    <div
                      className={`text-[11px] font-bold ${
                        teaPrepSlot.overboiled
                          ? 'text-[#f28b82]'
                          : inSteepZone
                          ? 'text-[#69c79b]'
                          : 'text-[#7cc4e0]'
                      }`}
                    >
                      {statusText}
                    </div>
                  </div>
                </div>

                {!teaPrepSlot.overboiled && (
                  <button
                    onClick={onToggleFlame}
                    className={`min-h-[38px] px-2.5 py-1 rounded border text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer pixel-btn ${
                      teaPrepSlot.flameMode === 'high'
                        ? 'bg-[#7c2e16] border-[#d95f3b] text-[#ffd7b5]'
                        : 'bg-[#1e3d36] border-[#4ca88e] text-[#a7f3d0]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {teaPrepSlot.flameMode === 'high' ? T.flameHighBtn : T.flameSimmerBtn}
                    </span>
                  </button>
                )}
              </div>

              {/* Active Heating & Boil Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[#f5c542] flex items-center gap-1">
                    <Flame className="w-4 h-4 text-[#ff8f2b] animate-bounce" />
                    <span>{statusText}</span>
                  </span>
                  <span className="text-[#69c79b] tabular-nums font-mono">
                    {fmtNum(gaugePct, lang)}%
                  </span>
                </div>
                <div
                  className="relative w-full h-6 bg-[#120b09] border-2 border-[#4d3023] overflow-hidden rounded shadow-inner"
                  dir="ltr"
                >
                  <div
                    className="absolute top-0 bottom-0 bg-[#5cd68d]/25 border-l-2 border-dashed border-[#5cd68d] pointer-events-none"
                    style={{
                      left: `${steepStartPct}%`,
                      width: `${Math.max(8, 100 - steepStartPct - 6)}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 right-0 w-[6%] bg-[#c93b3b]/40 border-l border-[#e37266] pointer-events-none"
                  />
                  <div
                    className={`h-full transition-all duration-150 ${barColor}`}
                    style={{ width: `${gaugePct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#cbb596]" dir="ltr">
                  <span>{T.bevWarmZone}</span>
                  <span className="text-[#69c79b] font-bold">{T.bevSteepZone}</span>
                  <span className="text-[#e37266]">{T.bevBoilZone}</span>
                </div>
              </div>

              {teaPrepSlot.overboiled ? (
                <button
                  onClick={onDumpOverboiled}
                  className="min-h-[46px] w-full py-2.5 px-4 bg-[#822626] hover:bg-[#a33131] text-white font-pixel-ui font-bold text-xs rounded border-2 border-[#c93b3b] pixel-btn cursor-pointer"
                >
                  {T.bevDumpPot}
                </button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={onStir}
                    className="min-h-[46px] py-2.5 px-3 bg-[#e59f2c] hover:bg-[#f2ae3b] text-[#1c110c] font-bold text-xs rounded border-2 border-[#8c5a12] pixel-btn cursor-pointer"
                  >
                    {T.bevStirCalmBtn.replace('{stirs}', fmtNum(teaPrepSlot.stirsDone, lang))}
                  </button>
                  <button
                    onClick={onPour}
                    disabled={!inSteepZone}
                    className={`min-h-[46px] py-2.5 px-3 font-pixel-display text-xs rounded border-2 pixel-btn ${
                      inSteepZone
                        ? 'bg-[#3b8c84] hover:bg-[#46a39a] border-[#225954] text-white cursor-pointer'
                        : 'bg-[#2c1d18] border-[#422a1e] text-[#7c614c] cursor-not-allowed'
                    }`}
                  >
                    {T.bevPourReady}
                  </button>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3 space-y-2.5">
          <div className="text-[11px] text-[#cbb596]">{T.bevShelfPrompt}</div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {EXTRA_INGREDIENTS.filter((i) => i.forCategory === 'beverage').map((ing) => {
              const selected = bevPotIngredients.includes(ing.id);
              const label = isFa
                ? FA_EXTRA_INGREDIENTS[ing.id]?.shortName || ing.shortName
                : ing.shortName;
              return (
                <button
                  key={ing.id}
                  onClick={() => onToggleIngredient(ing.id)}
                  className={`min-h-[50px] p-1.5 rounded border-2 flex flex-col items-center justify-center gap-1 cursor-pointer pixel-btn ${
                    selected
                      ? 'bg-[#2a4a45] border-[#52b8ad] text-white'
                      : 'bg-[#241714] hover:bg-[#32201b] border-[#4d3023] text-[#f4e8c1]'
                  }`}
                >
                  <ExtraIngredientIcon id={ing.id} size={20} />
                  <span className="text-[10px] font-bold truncate max-w-full">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-[#241714] border border-[#4d3023] rounded p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#cbb596]">
                {T.bevPotTitle} ({fmtNum(bevPotIngredients.length, lang)}):
              </span>
              {bevPotIngredients.length > 0 && (
                <button
                  onClick={onClearPot}
                  className="text-[#e37266] hover:underline cursor-pointer text-[11px]"
                >
                  {T.bevClearPot}
                </button>
              )}
            </div>

            {matchedBeverageId ? (
              <div className="text-xs font-bold text-[#69c79b] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>
                  {T.bevMatchedReady.replace(
                    '{name}',
                    isFa
                      ? FA_EXTRAS[matchedBeverageId]?.name || EXTRA_ITEMS[matchedBeverageId].name
                      : EXTRA_ITEMS[matchedBeverageId].name
                  )}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-[#a88d73]">{T.bevNoMatch}</div>
            )}

            <button
              onClick={onStartBrew}
              disabled={!matchedBeverageId}
              className={`min-h-[44px] w-full py-2 px-3 font-pixel-ui font-bold text-xs rounded border-2 pixel-btn ${
                matchedBeverageId
                  ? 'bg-[#d95f3b] hover:bg-[#e86d48] border-[#7c2e16] text-white cursor-pointer'
                  : 'bg-[#2c1d18] border-[#422a1e] text-[#7c614c] cursor-not-allowed'
              }`}
            >
              {T.brewBtn}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {EXTRA_ORDER.filter((id) => EXTRA_ITEMS[id].category === 'beverage').map((id) => {
          const def = EXTRA_ITEMS[id];
          const unlocked = currentDay >= def.unlockDay;
          const orderedNow = orderedExtraIds.has(id);
          const name = isFa ? FA_EXTRAS[id]?.name || def.name : def.name;
          return (
            <div
              key={id}
              className={`p-2 rounded border-2 flex items-center justify-between gap-2 ${
                orderedNow
                  ? 'bg-[#2b2012] border-[#f5c542]'
                  : unlocked
                  ? 'bg-[#1a100e] border-[#422a1e]'
                  : 'bg-[#150d0b] border-[#2e1c16] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ExtraItemSprite id={id} size={30} showSteam={unlocked} />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#f4e8c1] truncate">{name}</div>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {def.ingredients.map((ingId) => (
                      <span
                        key={ingId}
                        className="inline-flex items-center gap-0.5 text-[10px] text-[#cbb596]"
                      >
                        <ExtraIngredientIcon id={ingId} size={11} />
                        <span>
                          {isFa
                            ? FA_EXTRA_INGREDIENTS[ingId]?.shortName
                            : EXTRA_INGREDIENTS.find((i) => i.id === ingId)?.shortName}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-bold text-[#f5c542] shrink-0 tabular-nums">
                {unlocked
                  ? `${fmtNum(def.price, lang)}${T.coinSuffix}`
                  : T.lockedExtraDay.replace('{day}', fmtNum(def.unlockDay, lang))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface BreadShiftGameProps {
  onOpenSideGame: () => void;
  externalOpenRecipesSignal?: number;
  externalOpenShopSignal?: number;
  lang?: Language;
  onToggleLang?: () => void;
}

export const BreadShiftGame: React.FC<BreadShiftGameProps> = ({
  onOpenSideGame,
  externalOpenRecipesSignal = 0,
  externalOpenShopSignal = 0,
  lang: propLang,
  onToggleLang,
}) => {
  // Persistent Save State
  const [saveData, setSaveData] = useState<BakerySaveData>(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...INITIAL_BAKERY_SAVE,
          ...parsed,
          bestScore: parsed.bestScore ?? 0,
          totalExtrasServed: parsed.totalExtrasServed ?? 0,
          lang: propLang || parsed.lang || 'en',
          unlockedRareBreads: Array.isArray(parsed.unlockedRareBreads)
            ? parsed.unlockedRareBreads
            : [],
          upgrades: { ...INITIAL_BAKERY_SAVE.upgrades, ...(parsed.upgrades || {}) },
          bakerLook: { ...DEFAULT_BAKER_LOOK, ...(parsed.bakerLook || {}) },
        };
      }
    } catch {
      // ignore
    }
    return {
      ...INITIAL_BAKERY_SAVE,
      lang: propLang || INITIAL_BAKERY_SAVE.lang,
    };
  });

  // Keep saveData.lang synchronized with parent App language when provided
  useEffect(() => {
    if (propLang && saveData.lang !== propLang) {
      setSaveData((prev) => ({ ...prev, lang: propLang }));
    }
  }, [propLang, saveData.lang]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch {
      // ignore
    }
  }, [saveData]);

  const lang: Language = propLang || saveData.lang || 'en';
  const isFa = lang === 'fa';
  const T = UI_TEXT[lang];
  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  const handleLanguageSwitch = () => {
    sound.playButtonClick();
    if (onToggleLang) {
      onToggleLang();
    } else {
      setSaveData((prev) => ({
        ...prev,
        lang: prev.lang === 'fa' ? 'en' : 'fa',
      }));
    }
  };

  // Game Phase & Modals
  const [phase, setPhase] = useState<BreadShiftPhase>('LOBBY');
  const [mobilePanel, setMobilePanel] = useState<'counter' | 'kitchen'>('counter');
  const [showRecipes, setShowRecipes] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showBakerCustomize, setShowBakerCustomize] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [recentRepBoost, setRecentRepBoost] = useState<string | null>(null);
  const lastServeReactionAtRef = useRef<number>(0);
  const ambientTopicToggleRef = useRef<boolean>(false);
  const sessionRareUnlocksRef = useRef<BreadId[]>([]);
  const isAdvancingRef = useRef<boolean>(false);
  const advanceTimeoutRef = useRef<number | null>(null);
  const walkInTimeoutRef = useRef<number | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);

  // Daily Special for the active/upcoming day
  const [dailySpecial, setDailySpecial] = useState<{ breadId: BreadId; multiplier: number }>(() =>
    pickDailySpecial(
      saveData.day,
      getUnlockedBreads(saveData.day, saveData.reputation, saveData.unlockedRareBreads)
    )
  );

  // Floating feedback toast & coin popups
  const [coinPopup, setCoinPopup] = useState<{ id: number; text: string; positive: boolean } | null>(null);

  const triggerPopup = useCallback((text: string, positive: boolean = true) => {
    setCoinPopup({ id: Date.now(), text, positive });
  }, []);
  const triggerPopupRef = useRef(triggerPopup);
  triggerPopupRef.current = triggerPopup;

  useEffect(() => {
    if (!coinPopup) return;
    const t = setTimeout(() => setCoinPopup(null), 1500);
    return () => clearTimeout(t);
  }, [coinPopup]);

  useEffect(() => {
    if (!recentRepBoost) return;
    const t = setTimeout(() => setRecentRepBoost(null), 2600);
    return () => clearTimeout(t);
  }, [recentRepBoost]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current !== null) {
        clearTimeout(advanceTimeoutRef.current);
      }
      if (walkInTimeoutRef.current !== null) {
        clearTimeout(walkInTimeoutRef.current);
      }
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // Sync external top-bar triggers
  useEffect(() => {
    if (externalOpenRecipesSignal > 0) setShowRecipes(true);
  }, [externalOpenRecipesSignal]);

  useEffect(() => {
    if (externalOpenShopSignal > 0) {
      if (phase === 'LOBBY') {
        setDaySummary(null);
        setShowShopModal(true);
      } else {
        triggerPopup(UI_TEXT[langRef.current].shopAfterShift, false);
      }
    }
  }, [externalOpenShopSignal, phase, triggerPopup]);

  // Active Shift State
  const [tickets, setTickets] = useState<OrderTicketType[]>([]);
  const ticketsRef = useRef<OrderTicketType[]>(tickets);
  ticketsRef.current = tickets;

  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [isWalkingIn, setIsWalkingIn] = useState(false);
  const [dayStats, setDayStats] = useState({
    coinsEarned: 0,
    tipsEarned: 0,
    scoreEarned: 0,
    specialsFulfilled: 0,
    ordersCompleted: 0,
    perfectBreads: 0,
    extrasServed: 0,
    mistakes: 0,
    walkouts: 0,
    burntCount: 0,
    repStart: 3.5,
  });

  // Station State
  const [kitchenDrawerOpen, setKitchenDrawerOpen] = useState(false);
  const [station, setStation] = useState<StationTab>('shelf');
  const [bowlIngredients, setBowlIngredients] = useState<IngredientId[]>([]);
  const [kneadingDough, setKneadingDough] = useState<{
    ingredients: IngredientId[];
    hits: number;
    goodHits: number;
    overHits: number;
    intendedRecipeId: BreadId | null;
    targetHits: number;
    kneadSpeed: number;
  } | null>(null);
  const kneadSpeedRef = useRef(1.95);
  kneadSpeedRef.current = kneadingDough?.kneadSpeed ?? 1.95;
  const [kneadCursor, setKneadCursor] = useState(50);
  const kneadDirRef = useRef(1);

  const [restingSlots, setRestingSlots] = useState<DoughSlot[]>([]);
  const restingSlotsRef = useRef<DoughSlot[]>(restingSlots);
  restingSlotsRef.current = restingSlots;

  const [shapingBatch, setShapingBatch] = useState<{
    ingredients: IngredientId[];
    kneadQuality: 'under' | 'perfect' | 'over';
    rested: boolean;
    suggestedRecipeId: BreadId | null;
  } | null>(null);
  const [readyToBakeBatch, setReadyToBakeBatch] = useState<{
    ingredients: IngredientId[];
    kneadQuality: 'under' | 'perfect' | 'over';
    rested: boolean;
    shape: BreadShapeId;
    suggestedRecipeId: BreadId | null;
  } | null>(null);
  const [selectedOven, setSelectedOven] = useState<OvenTypeId>('tandoor');
  const [ovenSlot, setOvenSlot] = useState<OvenSlot | null>(null);
  const [servingTray, setServingTray] = useState<BakedBreadItem[]>([]);
  const servingTrayRef = useRef<BakedBreadItem[]>(servingTray);
  servingTrayRef.current = servingTray;

  // Samovar & Dessert Bar Interactive Workshop State
  const [cafeSubTab, setCafeSubTab] = useState<'beverage' | 'dessert'>('beverage');
  const [bevPotIngredients, setBevPotIngredients] = useState<ExtraIngredientId[]>([]);
  const [dessertDraftId, setDessertDraftId] = useState<ExtraItemId | null>(null);
  const [dessertAddedGarnishes, setDessertAddedGarnishes] = useState<ExtraIngredientId[]>([]);
  const [dessertTapCount, setDessertTapCount] = useState(0);
  const [teaPrepSlot, setTeaPrepSlot] = useState<ActiveExtraPrep | null>(null);
  const teaPrepSlotRef = useRef<ActiveExtraPrep | null>(teaPrepSlot);
  teaPrepSlotRef.current = teaPrepSlot;
  const [teaDessertTray, setTeaDessertTray] = useState<ReadyExtraItem[]>([]);
  const teaDessertTrayRef = useRef<ReadyExtraItem[]>(teaDessertTray);
  teaDessertTrayRef.current = teaDessertTray;

  // Chaos Events
  const [chaosEvent, setChaosEvent] = useState<ChaosEventType>('none');
  const chaosEventRef = useRef<ChaosEventType>(chaosEvent);
  chaosEventRef.current = chaosEvent;

  const [flourSpillClicks, setFlourSpillClicks] = useState(0);
  const [chaosTimer, setChaosTimer] = useState(0);
  const chaosTimerRef = useRef<number>(0);
  const nextChaosCooldownRef = useRef(18);

  const reputationRef = useRef(saveData.reputation);
  reputationRef.current = saveData.reputation;
  const unlockedRareRef = useRef(saveData.unlockedRareBreads);
  unlockedRareRef.current = saveData.unlockedRareBreads;

  // Derived upgrade capacities
  const maxTraySlots = 2 + (saveData.upgrades.bigger_counter || 0);
  const maxRestSlots = 1 + (saveData.upgrades.extra_dough_slot || 0);
  const speedMultiplier = 1 + (saveData.upgrades.faster_oven || 0) * 0.18;
  const samovarSpeed = 1 + (saveData.upgrades.samovar_heater || 0) * 0.35;
  const sweetSpotHalfWidth = 14 + (saveData.upgrades.kneading_board || 0) * 6;

  const isTicketComplete = useCallback((t: OrderTicketType) => {
    const breadsDone = t.items.every((l) => l.servedQty >= l.qty);
    const extrasDone = !t.extras || t.extras.every((e) => e.servedQty >= e.qty);
    return breadsDone && extrasDone;
  }, []);

  const activeTicket = tickets[activeTicketIndex] || null;

  // Guess intended recipe from ingredients (using active ticket items to break ties cleanly)
  const guessRecipeFromIngredients = (ings: IngredientId[]): BreadId | null => {
    const unlocked = getUnlockedBreads(
      saveData.day,
      saveData.reputation,
      saveData.unlockedRareBreads
    );
    const activeOrderedIds = new Set(
      (activeTicket?.items || [])
        .filter((item) => item.servedQty < item.qty)
        .map((item) => item.breadId)
    );
    let best: BreadId | null = null;
    let bestScore = -99;
    for (const id of unlocked) {
      const rec = BREAD_RECIPES[id];
      let score = 0;
      for (const i of rec.ingredients) score += ings.includes(i) ? 2 : -1;
      for (const i of ings) if (!rec.ingredients.includes(i) && i !== 'sesame' && i !== 'nigella') score -= 1.5;
      if (activeOrderedIds.has(id)) score += 1.5;
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  };

  // Start a new daily shift
  const startDayShift = useCallback(
    (dayNumber: number) => {
      if (advanceTimeoutRef.current !== null) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      if (walkInTimeoutRef.current !== null) {
        clearTimeout(walkInTimeoutRef.current);
        walkInTimeoutRef.current = null;
      }
      isAdvancingRef.current = false;

      sound.initContext();
      sound.startBakeryMusic();
      sound.playSlapTicket();

      const nextWeather: WeatherType =
        dayNumber === 1
          ? 'sunny'
          : WEATHER_OPTIONS[Math.floor(Math.random() * WEATHER_OPTIONS.length)].id;
      setWeather(nextWeather);
      lastServeReactionAtRef.current = 0;
      sessionRareUnlocksRef.current = [];
      setRecentRepBoost(null);

      const unlockedForDay = getUnlockedBreads(
        dayNumber,
        saveData.reputation,
        saveData.unlockedRareBreads
      );
      const nextSpecial = pickDailySpecial(dayNumber, unlockedForDay);
      setDailySpecial(nextSpecial);

      const generated = generateDayTickets(
        dayNumber,
        saveData.upgrades.soothing_chime || 0,
        nextSpecial.breadId,
        saveData.reputation,
        saveData.unlockedRareBreads,
        langRef.current
      ).map((t) => ({ ...t, dialogueTopic: 'greeting' as const }));
      setTickets(generated);
      setActiveTicketIndex(0);
      setIsWalkingIn(true);
      walkInTimeoutRef.current = window.setTimeout(() => {
        walkInTimeoutRef.current = null;
        setIsWalkingIn(false);
      }, 650);

      setMobilePanel('counter');
      setStation('shelf');
      setBowlIngredients([]);
      setKneadingDough(null);
      setRestingSlots([]);
      setShapingBatch(null);
      setReadyToBakeBatch(null);
      setOvenSlot(null);
      setServingTray([]);
      setTeaPrepSlot(null);
      setTeaDessertTray([]);
      setBevPotIngredients([]);
      setDessertDraftId(null);
      setDessertAddedGarnishes([]);
      setDessertTapCount(0);
      chaosEventRef.current = 'none';
      chaosTimerRef.current = 0;
      setChaosEvent('none');
      setChaosTimer(0);
      nextChaosCooldownRef.current = dayNumber === 1 ? 999 : 16 + Math.random() * 10;

      setDayStats({
        coinsEarned: 0,
        tipsEarned: 0,
        scoreEarned: 0,
        specialsFulfilled: 0,
        ordersCompleted: 0,
        perfectBreads: 0,
        extrasServed: 0,
        mistakes: 0,
        walkouts: 0,
        burntCount: 0,
        repStart: saveData.reputation,
      });

      setDaySummary(null);
      setShowShopModal(false);
      setShowBakerCustomize(false);
      setPhase('PLAYING');
    },
    [saveData.reputation, saveData.unlockedRareBreads, saveData.upgrades.soothing_chime]
  );

  // Finish the day and compute achievements + unlocks
  const finishDay = useCallback(
    (
      finalStats: typeof dayStats,
      currentRep: number,
      failedDay: boolean
    ) => {
      if (advanceTimeoutRef.current !== null) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      isAdvancingRef.current = false;

      const completedDay = saveData.day;
      const dayUnlockedBreads = failedDay
        ? []
        : BREAD_ORDER.filter(
            (id) =>
              !BREAD_RECIPES[id].unlockReputation &&
              BREAD_RECIPES[id].unlockDay === completedDay + 1
          );
      const newlyUnlockedBreads = Array.from(
        new Set([...dayUnlockedBreads, ...sessionRareUnlocksRef.current])
      );

      const newAchs: string[] = [];
      const addAch = (id: string) => {
        if (!saveData.achievements.includes(id) && !newAchs.includes(id)) {
          newAchs.push(id);
        }
      };

      if (!failedDay) {
        addAch('first_shift');
        if (finalStats.mistakes === 0 && finalStats.walkouts === 0) addAch('perfect_day');
        if (finalStats.burntCount === 0) addAch('no_burnt');
      }
      if (currentRep >= 4.95) addAch('five_star');

      const summary: DaySummary = {
        day: completedDay,
        coinsEarned: finalStats.coinsEarned,
        tipsEarned: finalStats.tipsEarned,
        scoreEarned: finalStats.scoreEarned,
        specialsFulfilled: finalStats.specialsFulfilled,
        dailySpecialBreadId: dailySpecial.breadId,
        dailySpecialMultiplier: dailySpecial.multiplier,
        ordersCompleted: finalStats.ordersCompleted,
        perfectBreads: finalStats.perfectBreads,
        extrasServed: finalStats.extrasServed,
        mistakes: finalStats.mistakes,
        walkouts: finalStats.walkouts,
        reputationChange: Number((currentRep - finalStats.repStart).toFixed(2)),
        newlyUnlockedBreads,
        newlyUnlockedAchievements: newAchs,
        failedDay,
      };

      setSaveData((prev) => ({
        ...prev,
        day: failedDay ? prev.day : prev.day + 1,
        bestScore: Math.max(prev.bestScore || 0, finalStats.scoreEarned),
        achievements: [...prev.achievements, ...newAchs],
        tutorialSeen: true,
      }));

      setDaySummary(summary);
      setShowShopModal(true);
      setPhase('DAY_END');
      sound.playDing();
    },
    [dailySpecial.breadId, dailySpecial.multiplier, saveData.achievements, saveData.day]
  );

  // Advance to next customer or end day
  const advanceCustomer = useCallback(
    (updatedStats: typeof dayStats, latestRep: number) => {
      if (latestRep < 1.5) {
        finishDay(updatedStats, latestRep, true);
        return;
      }

      if (activeTicketIndex + 1 >= ticketsRef.current.length) {
        finishDay(updatedStats, latestRep, false);
      } else {
        isAdvancingRef.current = false;
        setActiveTicketIndex((idx) => idx + 1);
        setIsWalkingIn(true);
        sound.playSlapTicket();
        if (walkInTimeoutRef.current !== null) {
          clearTimeout(walkInTimeoutRef.current);
        }
        walkInTimeoutRef.current = window.setTimeout(() => {
          walkInTimeoutRef.current = null;
          setIsWalkingIn(false);
        }, 600);
      }
    },
    [activeTicketIndex, finishDay]
  );

  // Sync active ticket greeting bubble text if player toggles language mid-shift
  useEffect(() => {
    setTickets((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((ticket) => {
        if (ticket.dialogueTopic && ticket.dialogueTopic !== 'greeting') return ticket;
        if (ticket.greetingIndex === -1) {
          return { ...ticket, reactionMessage: FA_LOGIC_TEXT[lang].tutorialGreeting };
        }
        if (ticket.greetingIndex !== undefined) {
          const pool =
            lang === 'fa'
              ? FA_CUSTOMER_DIALOGUES[ticket.customer.id]?.bakery || ticket.customer.greetings
              : ticket.customer.greetings;
          return {
            ...ticket,
            reactionMessage: pool[ticket.greetingIndex % pool.length],
          };
        }
        return ticket;
      });
    });
  }, [lang]);

  // ============================================================================
  // MAIN TICK LOOP (Patience drain, Knead bar cursor, Resting Dough, Oven Bake, Chaos)
  // ============================================================================
  useEffect(() => {
    if (phase !== 'PLAYING' || showRecipes || showShopModal) return;

    const intervalMs = 50; // 20Hz crisp simulation tick
    const dt = intervalMs / 1000;

    const timer = window.setInterval(() => {
      // 1. Kneading Timing Bar oscillation (tempo varies by bread recipe!)
      setKneadCursor((prev) => {
        let next = prev + kneadDirRef.current * kneadSpeedRef.current;
        if (next >= 98) {
          next = 98;
          kneadDirRef.current = -1;
        } else if (next <= 2) {
          next = 2;
          kneadDirRef.current = 1;
        }
        return next;
      });

      // 2. Dough Rest timers (sound side effect runs outside updater)
      const finishedSlotNow = restingSlotsRef.current.some(
        (slot) =>
          slot.restProgress < slot.targetRestSeconds &&
          slot.restProgress + dt * speedMultiplier >= slot.targetRestSeconds
      );
      if (finishedSlotNow) {
        sound.playDing();
      }
      setRestingSlots((prev) =>
        prev.map((slot) => {
          if (slot.restProgress >= slot.targetRestSeconds) return slot;
          const nextProg = Math.min(
            slot.targetRestSeconds,
            slot.restProgress + dt * speedMultiplier
          );
          return { ...slot, restProgress: nextProg };
        })
      );

      // 3. Oven Bake timer
      setOvenSlot((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + dt * speedMultiplier,
        };
      });

      // 3b. Beverage Samovar / Copper Pot active heating timer (Warming -> Steep Zone -> Overboil)
      const activeTea = teaPrepSlotRef.current;
      if (activeTea && !activeTea.overboiled) {
        const flameMult = activeTea.flameMode === 'high' ? 1.8 : 0.65;
        const nextTeaProg = Math.min(
          activeTea.overboilSeconds,
          activeTea.progressSeconds + dt * samovarSpeed * flameMult
        );
        if (
          activeTea.progressSeconds < activeTea.targetSeconds &&
          nextTeaProg >= activeTea.targetSeconds
        ) {
          sound.playDing();
        }
        const didOverboil = nextTeaProg >= activeTea.overboilSeconds;
        if (didOverboil) {
          sound.playServeFail();
          const curLang = langRef.current;
          const drinkName =
            curLang === 'fa'
              ? FA_EXTRAS[activeTea.extraId]?.name || EXTRA_ITEMS[activeTea.extraId].name
              : EXTRA_ITEMS[activeTea.extraId].name;
          triggerPopupRef.current(
            UI_TEXT[curLang].bevOverboiledToast.replace('{name}', drinkName),
            false
          );
        }
        setTeaPrepSlot({
          ...activeTea,
          progressSeconds: nextTeaProg,
          overboiled: didOverboil,
        });
      }

      // 4. Chaos Event Scheduling (Day 2+, all side effects kept clean outside state updaters)
      if (saveData.day >= 2) {
        if (chaosEventRef.current !== 'none') {
          const nextT = chaosTimerRef.current - dt;
          if (nextT <= 0) {
            chaosTimerRef.current = 0;
            setChaosTimer(0);
            if (chaosEventRef.current === 'cat_thief' && servingTrayRef.current.length > 0) {
              sound.playCatMeow();
              triggerPopupRef.current(UI_TEXT[langRef.current].catSnatched, false);
              setServingTray((tray) => tray.slice(1));
            }
            chaosEventRef.current = 'none';
            setChaosEvent('none');
          } else {
            chaosTimerRef.current = nextT;
            setChaosTimer(nextT);
          }
        } else {
          nextChaosCooldownRef.current -= dt;
          if (nextChaosCooldownRef.current <= 0) {
            nextChaosCooldownRef.current = 20 + Math.random() * 14;
            const pool: ChaosEventType[] = ['power_flicker', 'flour_spill', 'rush_hour'];
            if (servingTrayRef.current.length > 0 && (saveData.upgrades.decor_cat || 0) === 0) {
              pool.push('cat_thief');
            }
            const picked = pool[Math.floor(Math.random() * pool.length)];
            const duration = picked === 'rush_hour' ? 12 : picked === 'cat_thief' ? 7 : 6;
            chaosEventRef.current = picked;
            chaosTimerRef.current = duration;
            setChaosEvent(picked);
            setChaosTimer(duration);
            if (picked === 'flour_spill') setFlourSpillClicks(0);
            if (picked === 'cat_thief') sound.playCatMeow();
          }
        }
      }

      // 5. Active Customer Patience Drain (paused once order is already completed / advancing)
      setTickets((prev) => {
        const current = prev[activeTicketIndex];
        if (!current) return prev;
        if (saveData.day === 1 && activeTicketIndex === 0) return prev;
        if (isAdvancingRef.current) return prev;
        if (isTicketComplete(current)) return prev;

        const nextPatience = Math.max(0, current.patienceLeft - dt);
        const pct = nextPatience / current.patienceMax;
        const nextExpr =
          current.expression === 'disgusted'
            ? 'disgusted'
            : pct <= 0.01
            ? 'furious'
            : pct < 0.35
            ? 'impatient'
            : 'waiting';

        const updated = [...prev];
        updated[activeTicketIndex] = {
          ...current,
          patienceLeft: nextPatience,
          expression: nextExpr,
        };
        return updated;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    activeTicketIndex,
    isTicketComplete,
    phase,
    samovarSpeed,
    saveData.day,
    saveData.upgrades.decor_cat,
    showRecipes,
    showShopModal,
    speedMultiplier,
  ]);

  // Watch for patience hitting 0 -> Customer walks out angrily! (Guarded against double-advance)
  useEffect(() => {
    if (phase !== 'PLAYING' || !activeTicket) return;
    if (isAdvancingRef.current) return;
    if (isTicketComplete(activeTicket)) return;

    if (activeTicket.patienceLeft <= 0) {
      isAdvancingRef.current = true;
      sound.playServeFail();
      const repLoss = activeTicket.customer.reputationImpact;
      const nextRep = Math.max(1.0, Number((saveData.reputation - repLoss).toFixed(2)));
      setSaveData((prev) => ({ ...prev, reputation: nextRep }));

      const nextStats = {
        ...dayStats,
        walkouts: dayStats.walkouts + 1,
      };
      setDayStats(nextStats);
      const custName =
        langRef.current === 'fa'
          ? FA_CUSTOMER_NAMES[activeTicket.customer.id]?.name || activeTicket.customer.name
          : activeTicket.customer.name;
      triggerPopup(
        UI_TEXT[langRef.current].leftAngry
          .replace('{name}', custName)
          .replace('{rep}', fmtNum(repLoss.toFixed(1), langRef.current)),
        false
      );
      advanceCustomer(nextStats, nextRep);
    }
  }, [activeTicket, advanceCustomer, dayStats, isTicketComplete, phase, saveData.reputation, triggerPopup]);

  // Ambient Customer Bubble Chatter (uses ticketsRef so 50ms loop does NOT reset the 6200ms timer!)
  useEffect(() => {
    if (phase !== 'PLAYING' || showRecipes || showShopModal || showBakerCustomize) return;
    if (saveData.day === 1 && activeTicketIndex === 0) return;

    const timer = window.setInterval(() => {
      if (Date.now() - lastServeReactionAtRef.current < 3500) return;
      if (isAdvancingRef.current) return;

      const current = ticketsRef.current[activeTicketIndex];
      if (!current) return;

      const curLang = langRef.current;
      const personalityDialogue =
        curLang === 'fa'
          ? FA_CUSTOMER_DIALOGUES[current.customer.id] ||
            CUSTOMER_DIALOGUE_VARIATIONS[current.customer.id]
          : CUSTOMER_DIALOGUE_VARIATIONS[current.customer.id];
      if (!personalityDialogue) return;

      ambientTopicToggleRef.current = !ambientTopicToggleRef.current;
      const topic: 'bakery' | 'weather' = ambientTopicToggleRef.current ? 'bakery' : 'weather';
      const pool =
        topic === 'bakery'
          ? personalityDialogue.bakery
          : personalityDialogue.weather[weather];

      const nextLine = pool[Math.floor(Math.random() * pool.length)];
      if (!nextLine) return;

      setTickets((prev) => {
        const cur = prev[activeTicketIndex];
        if (!cur) return prev;
        const updated = [...prev];
        updated[activeTicketIndex] = {
          ...cur,
          reactionMessage: nextLine,
          dialogueTopic: topic,
        };
        return updated;
      });

      const patiencePct = current.patienceLeft / current.patienceMax;
      if (topic === 'bakery' && patiencePct >= 0.45) {
        const praiseBoost = 0.04;
        const nextRep = Math.min(5.0, Number((reputationRef.current + praiseBoost).toFixed(2)));
        const newlyRare = RARE_REPUTATION_UNLOCKS.filter(
          (u) => nextRep >= u.requiredRep && !unlockedRareRef.current.includes(u.breadId)
        ).map((u) => u.breadId);

        if (newlyRare.length > 0) {
          sessionRareUnlocksRef.current = Array.from(
            new Set([...sessionRareUnlocksRef.current, ...newlyRare])
          );
          const breadTitle =
            curLang === 'fa'
              ? FA_BREAD_NAMES[newlyRare[0]]?.name || BREAD_RECIPES[newlyRare[0]].name
              : BREAD_RECIPES[newlyRare[0]].name;
          triggerPopupRef.current(
            UI_TEXT[curLang].rareUnlockedToast.replace('{name}', breadTitle),
            true
          );
        }

        setSaveData((prev) => ({
          ...prev,
          reputation: Math.min(5.0, Number((prev.reputation + praiseBoost).toFixed(2))),
          unlockedRareBreads:
            newlyRare.length > 0
              ? Array.from(new Set([...prev.unlockedRareBreads, ...newlyRare]))
              : prev.unlockedRareBreads,
        }));
        setRecentRepBoost(
          `+${fmtNum(praiseBoost.toFixed(2), curLang)}★ ${UI_TEXT[curLang].bakeryPraise}`
        );
      }
    }, 6200);

    return () => clearInterval(timer);
  }, [
    activeTicketIndex,
    phase,
    saveData.day,
    showBakerCustomize,
    showRecipes,
    showShopModal,
    weather,
  ]);

  // ============================================================================
  // STATION HANDLERS
  // ============================================================================

  // Station 1: Add/Remove Ingredient
  const handleAddIngredient = (id: IngredientId) => {
    if (bowlIngredients.includes(id)) {
      sound.playButtonClick();
      setBowlIngredients((prev) => prev.filter((item) => item !== id));
      return;
    }
    sound.playPlop();
    setBowlIngredients((prev) => [...prev, id]);
  };

  const handleStartKneading = () => {
    if (bowlIngredients.length === 0) return;
    sound.playButtonClick();
    const guessedId = guessRecipeFromIngredients(bowlIngredients);
    const rec = guessedId ? BREAD_RECIPES[guessedId] : null;
    setKneadingDough({
      ingredients: [...bowlIngredients],
      hits: 0,
      goodHits: 0,
      overHits: 0,
      intendedRecipeId: guessedId,
      targetHits: rec ? rec.kneadTarget : 3,
      kneadSpeed: rec ? rec.kneadSpeed : 1.95,
    });
    setBowlIngredients([]);
    setStation('knead');
  };

  // Station 2: Knead Click (or Spacebar!)
  const handleKneadTap = useCallback(() => {
    if (!kneadingDough) return;
    const inSweetSpot = Math.abs(kneadCursor - 50) <= sweetSpotHalfWidth;
    sound.playKnead(inSweetSpot);

    setKneadingDough((prev) => {
      if (!prev) return null;
      const nextHits = prev.hits + 1;
      return {
        ...prev,
        hits: nextHits,
        goodHits: prev.goodHits + (inSweetSpot ? 1 : 0),
        overHits: nextHits > prev.targetHits ? prev.overHits + 1 : prev.overHits,
      };
    });
  }, [kneadCursor, kneadingDough, sweetSpotHalfWidth]);

  // Spacebar shortcut for kneading!
  useEffect(() => {
    if (phase !== 'PLAYING' || station !== 'knead' || !kneadingDough) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleKneadTap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKneadTap, kneadingDough, phase, station]);

  const getKneadQuality = (): 'under' | 'perfect' | 'over' => {
    if (!kneadingDough) return 'under';
    const target = kneadingDough.targetHits;
    if (kneadingDough.hits < target) return 'under';
    if (kneadingDough.overHits >= 2 || kneadingDough.hits >= target + 2) return 'over';
    if (kneadingDough.goodHits >= Math.max(1, target - 1)) return 'perfect';
    return 'under';
  };

  const handleFinishKneading = () => {
    if (!kneadingDough) return;
    if (restingSlots.length >= maxRestSlots) {
      triggerPopup(T.proofingFull, false);
      setStation('rest');
      return;
    }

    const quality = getKneadQuality();
    const guessedId =
      kneadingDough.intendedRecipeId ?? guessRecipeFromIngredients(kneadingDough.ingredients);
    const targetRest = guessedId ? BREAD_RECIPES[guessedId].restSeconds : 3.5;

    const newSlot: DoughSlot = {
      id: `dough_${Date.now()}`,
      ingredients: kneadingDough.ingredients,
      kneadQuality: quality,
      restProgress: 0,
      targetRestSeconds: targetRest,
      restSkipped: false,
      suggestedRecipeId: guessedId,
    };

    sound.playButtonClick();
    setRestingSlots((prev) => [...prev, newSlot]);
    setKneadingDough(null);
    setStation('rest');
  };

  // Station 3: Dough Rest -> Move to Shaping
  const handleSendToShape = (slot: DoughSlot, skipped: boolean) => {
    sound.playButtonClick();
    setRestingSlots((prev) => prev.filter((s) => s.id !== slot.id));
    setShapingBatch({
      ingredients: slot.ingredients,
      kneadQuality: slot.kneadQuality,
      rested: !skipped,
      suggestedRecipeId: slot.suggestedRecipeId,
    });
    setStation('shape');
  };

  // Station 4: Choose Shape -> Ready for Oven (also refines suggestedRecipeId if shape disambiguates shared-ingredient recipes)
  const handlePickShape = (shape: BreadShapeId) => {
    if (!shapingBatch) return;
    sound.playPlop();

    const unlocked = getUnlockedBreads(
      saveData.day,
      saveData.reputation,
      saveData.unlockedRareBreads
    );
    let refinedId = shapingBatch.suggestedRecipeId;
    let bestShapeScore = -99;
    for (const id of unlocked) {
      const rec = BREAD_RECIPES[id];
      if (rec.shape !== shape) continue;
      let score = 0;
      for (const i of rec.ingredients) score += shapingBatch.ingredients.includes(i) ? 2 : -1;
      for (const i of shapingBatch.ingredients) {
        if (!rec.ingredients.includes(i) && i !== 'sesame' && i !== 'nigella') score -= 1.5;
      }
      if (id === shapingBatch.suggestedRecipeId) score += 0.5;
      if (score > bestShapeScore) {
        bestShapeScore = score;
        refinedId = id;
      }
    }

    const rec = refinedId ? BREAD_RECIPES[refinedId] : null;
    if (rec) setSelectedOven(rec.oven);
    setReadyToBakeBatch({
      ...shapingBatch,
      suggestedRecipeId: refinedId,
      shape,
    });
    setShapingBatch(null);
    setStation('oven');
  };

  // Station 5: Start Baking & Pull Out
  const handlePutInOven = () => {
    if (!readyToBakeBatch || ovenSlot) return;
    sound.playSizzle();
    const rec = readyToBakeBatch.suggestedRecipeId
      ? BREAD_RECIPES[readyToBakeBatch.suggestedRecipeId]
      : BREAD_RECIPES.sangak;

    setOvenSlot({
      id: `oven_${Date.now()}`,
      ovenType: selectedOven,
      ingredients: readyToBakeBatch.ingredients,
      kneadQuality: readyToBakeBatch.kneadQuality,
      rested: readyToBakeBatch.rested,
      shape: readyToBakeBatch.shape,
      suggestedRecipeId: readyToBakeBatch.suggestedRecipeId,
      elapsedSeconds: 0,
      targetMinSeconds: rec.bakeMinSeconds,
      targetMaxSeconds: rec.bakeMaxSeconds,
    });
    setReadyToBakeBatch(null);
  };

  const handlePullFromOven = () => {
    if (!ovenSlot) return;
    if (servingTray.length >= maxTraySlots) {
      triggerPopup(T.trayFull, false);
      return;
    }

    const evaluation = evaluateBakedBread({
      ingredients: ovenSlot.ingredients,
      kneadQuality: ovenSlot.kneadQuality,
      rested: ovenSlot.rested,
      shape: ovenSlot.shape,
      oven: ovenSlot.ovenType,
      bakeRatio: ovenSlot.elapsedSeconds / ((ovenSlot.targetMinSeconds + ovenSlot.targetMaxSeconds) / 2),
      targetMin: ovenSlot.targetMinSeconds,
      targetMax: ovenSlot.targetMaxSeconds,
      elapsed: ovenSlot.elapsedSeconds,
      lang,
    });

    const newBread: BakedBreadItem = {
      id: `loaf_${Date.now()}`,
      intendedBreadId: ovenSlot.suggestedRecipeId,
      matchedRecipeId: evaluation.matchedRecipeId,
      ingredients: ovenSlot.ingredients,
      kneadQuality: ovenSlot.kneadQuality,
      rested: ovenSlot.rested,
      shape: ovenSlot.shape,
      oven: ovenSlot.ovenType,
      bakeRatio: ovenSlot.elapsedSeconds / ovenSlot.targetMaxSeconds,
      outcome: evaluation.outcome,
      issues: evaluation.issues,
      hasSesame: evaluation.hasSesame,
      hasNigella: evaluation.hasNigella,
      isWellDone: evaluation.isWellDone,
    };

    if (evaluation.outcome === 'burnt') {
      sound.playServeFail();
      setDayStats((prev) => ({ ...prev, burntCount: prev.burntCount + 1 }));
    } else {
      sound.playDing();
    }

    setServingTray((prev) => [...prev, newBread]);
    setOvenSlot(null);

    setSaveData((prev) => {
      const sangakInc =
        evaluation.matchedRecipeId === 'sangak' && evaluation.outcome === 'perfect' ? 1 : 0;
      const nextSangak = prev.sangakPerfectCount + sangakInc;
      const nextAchs = [...prev.achievements];
      if (nextSangak >= 10 && !nextAchs.includes('sangak_master')) {
        nextAchs.push('sangak_master');
      }
      return {
        ...prev,
        totalBreadsBaked: prev.totalBreadsBaked + 1,
        sangakPerfectCount: nextSangak,
        achievements: nextAchs,
      };
    });

    setStation('shelf');
  };

  // Station 6: Serve Bread from Tray to Active Customer
  const handleServeLoaf = (loaf: BakedBreadItem) => {
    if (!activeTicket || isAdvancingRef.current) return;

    const unfulfilled = activeTicket.items.filter((i) => i.servedQty < i.qty);
    if (unfulfilled.length === 0) return;

    const targetLine =
      unfulfilled.find((l) => l.breadId === loaf.matchedRecipeId) || unfulfilled[0];

    const result = evaluateAgainstTicketItem(loaf, targetLine, lang);

    const pickBreadDialogue = (key: BreadQualityFeedbackKey): string => {
      const dialogueMap =
        lang === 'fa'
          ? FA_CUSTOMER_DIALOGUES[activeTicket.customer.id] ||
            CUSTOMER_DIALOGUE_VARIATIONS[activeTicket.customer.id]
          : CUSTOMER_DIALOGUE_VARIATIONS[activeTicket.customer.id];
      const set = dialogueMap.breadQuality[key];
      return set[Math.floor(Math.random() * set.length)];
    };

    setServingTray((prev) => prev.filter((item) => item.id !== loaf.id));
    lastServeReactionAtRef.current = Date.now();

    if (!result.accepted) {
      sound.playServeFail();
      const repLoss = activeTicket.customer.reputationImpact * 0.6;
      const nextRep = Math.max(1.0, Number((saveData.reputation - repLoss).toFixed(2)));
      setSaveData((prev) => ({ ...prev, reputation: nextRep }));

      setDayStats((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));

      const qualityKey: BreadQualityFeedbackKey =
        loaf.outcome === 'burnt'
          ? 'burnt'
          : loaf.outcome === 'raw'
          ? 'raw'
          : 'wrong_bread';

      setTickets((prev) => {
        const copy = [...prev];
        copy[activeTicketIndex] = {
          ...activeTicket,
          expression: 'disgusted',
          reactionMessage: pickBreadDialogue(qualityKey),
          dialogueTopic: 'bread',
        };
        return copy;
      });
      triggerPopup(
        `${result.feedback} (-${fmtNum(repLoss.toFixed(1), lang)}★)`,
        false
      );

      if (nextRep < 1.5) {
        finishDay({ ...dayStats, mistakes: dayStats.mistakes + 1 }, nextRep, true);
      }
      return;
    }

    const recipe = BREAD_RECIPES[targetLine.breadId];
    const decorBonus =
      (saveData.upgrades.decor_plants || 0) * 1 +
      (saveData.upgrades.decor_rug || 0) * 2 +
      (saveData.upgrades.decor_neon || 0) * 2 +
      (saveData.upgrades.decor_cat || 0) * 3;
    const rushMultiplier = chaosEvent === 'rush_hour' ? 1.5 : 1;

    const isSpecialFulfilled =
      result.perfect &&
      (Boolean(targetLine.isDailySpecial) || targetLine.breadId === dailySpecial.breadId);
    const specialMult = isSpecialFulfilled ? dailySpecial.multiplier : 1;

    const baseCoins = Math.round(recipe.price * result.scoreFactor * specialMult);
    const tipCoins = result.perfect
      ? Math.round((4 * activeTicket.customer.tipMultiplier + decorBonus) * rushMultiplier)
      : 0;
    const totalGain = baseCoins + tipCoins;

    const patiencePct = activeTicket.patienceLeft / activeTicket.patienceMax;
    const speedBonusPts = patiencePct >= 0.65 ? 40 : patiencePct >= 0.4 ? 15 : 0;
    const pointsGain = Math.round(
      (baseCoins * 10 + (result.perfect ? 60 : 15) + speedBonusPts) * specialMult
    );

    if (result.perfect) {
      sound.playServeSuccess(true);
      sound.playCoin();
    } else {
      sound.playServeSuccess(false);
    }

    const updatedItems = activeTicket.items.map((l) =>
      l.uid === targetLine.uid ? { ...l, servedQty: l.servedQty + 1 } : l
    );
    const allBreadsDone = updatedItems.every((l) => l.servedQty >= l.qty);
    const allExtrasDone =
      !activeTicket.extras || activeTicket.extras.every((e) => e.servedQty >= e.qty);
    const allDone = allBreadsDone && allExtrasDone;

    if (allDone) {
      isAdvancingRef.current = true;
    }

    const speedRepBonus =
      result.perfect && patiencePct >= 0.65
        ? 0.12
        : result.perfect && patiencePct >= 0.45
        ? 0.06
        : 0;
    const dialoguePraiseBonus = result.perfect ? 0.08 : 0;

    const repDelta = result.perfect
      ? activeTicket.customer.reputationImpact * 0.45 + speedRepBonus + dialoguePraiseBonus
      : -0.15;
    const nextRep = Math.max(1.0, Math.min(5.0, Number((saveData.reputation + repDelta).toFixed(2))));

    const newlyRare = RARE_REPUTATION_UNLOCKS.filter(
      (u) => nextRep >= u.requiredRep && !saveData.unlockedRareBreads.includes(u.breadId)
    ).map((u) => u.breadId);

    if (newlyRare.length > 0) {
      sessionRareUnlocksRef.current = Array.from(
        new Set([...sessionRareUnlocksRef.current, ...newlyRare])
      );
    }

    if (repDelta > 0) {
      const reasonTag = speedRepBonus > 0 ? T.praiseFast : T.praiseNormal;
      setRecentRepBoost(`+${fmtNum(repDelta.toFixed(2), lang)}★ ${reasonTag}`);
    }

    setSaveData((prev) => ({
      ...prev,
      coins: prev.coins + totalGain,
      reputation: nextRep,
      unlockedRareBreads:
        newlyRare.length > 0
          ? Array.from(new Set([...prev.unlockedRareBreads, ...newlyRare]))
          : prev.unlockedRareBreads,
    }));

    const nextStats = {
      ...dayStats,
      coinsEarned: dayStats.coinsEarned + baseCoins,
      tipsEarned: dayStats.tipsEarned + tipCoins,
      scoreEarned: dayStats.scoreEarned + pointsGain,
      specialsFulfilled: dayStats.specialsFulfilled + (isSpecialFulfilled ? 1 : 0),
      perfectBreads: dayStats.perfectBreads + (result.perfect ? 1 : 0),
      mistakes: dayStats.mistakes + (result.perfect ? 0 : 1),
      ordersCompleted: dayStats.ordersCompleted + (allDone ? 1 : 0),
    };
    setDayStats(nextStats);

    const qualityKey: BreadQualityFeedbackKey = result.perfect
      ? 'perfect'
      : !loaf.rested || loaf.outcome === 'dense' || result.defectType === 'dense'
      ? 'dense'
      : loaf.outcome === 'salty' || result.defectType === 'salt'
      ? 'salty'
      : loaf.outcome === 'wrong_shape' || result.defectType === 'shape'
      ? 'wrong_shape'
      : 'good';

    setTickets((prev) => {
      const copy = [...prev];
      copy[activeTicketIndex] = {
        ...activeTicket,
        items: updatedItems,
        expression: result.perfect ? 'happy' : 'disgusted',
        reactionMessage: pickBreadDialogue(qualityKey),
        dialogueTopic: 'bread',
      };
      return copy;
    });

    const rareTitle =
      newlyRare.length > 0
        ? isFa
          ? FA_BREAD_NAMES[newlyRare[0]]?.name || BREAD_RECIPES[newlyRare[0]].name
          : BREAD_RECIPES[newlyRare[0]].name
        : '';

    if (newlyRare.length > 0) {
      triggerPopup(T.rareUnlockedBig.replace('{name}', rareTitle), true);
    } else if (isSpecialFulfilled) {
      triggerPopup(
        `★ ${fmtNum(dailySpecial.multiplier, lang)}×! +${fmtNum(totalGain, lang)}${T.coinSuffix} · +${fmtNum(pointsGain, lang)}`,
        true
      );
    } else {
      triggerPopup(
        result.perfect
          ? `+${fmtNum(totalGain, lang)}${T.coinSuffix} · +${fmtNum(pointsGain, lang)}`
          : `+${fmtNum(totalGain, lang)}${T.coinSuffix} (${result.feedback})`,
        result.perfect
      );
    }

    if (allDone) {
      advanceTimeoutRef.current = window.setTimeout(() => {
        advanceTimeoutRef.current = null;
        advanceCustomer(nextStats, nextRep);
      }, 950);
    }
  };

  // Station 6: Interactive Beverage Mixing, Steeping & Pouring + Interactive Dessert Garnishing
  const matchedBeverageId: ExtraItemId | null = (() => {
    if (bevPotIngredients.length === 0) return null;
    const sortedMix = [...bevPotIngredients].sort().join(',');
    for (const id of EXTRA_ORDER) {
      const def = EXTRA_ITEMS[id];
      if (def.category !== 'beverage' || saveData.day < def.unlockDay) continue;
      if ([...def.ingredients].sort().join(',') === sortedMix) {
        return id;
      }
    }
    return null;
  })();

  const handleToggleBevIngredient = (ingId: ExtraIngredientId) => {
    sound.playPlop();
    setBevPotIngredients((prev) =>
      prev.includes(ingId) ? prev.filter((x) => x !== ingId) : [...prev, ingId]
    );
  };

  const handleStartBeverageBrew = () => {
    if (!matchedBeverageId || teaPrepSlot) return;
    const def = EXTRA_ITEMS[matchedBeverageId];
    sound.playPlop();
    setTeaPrepSlot({
      id: `prep_${Date.now()}_${matchedBeverageId}`,
      extraId: matchedBeverageId,
      category: 'beverage',
      progressSeconds: 0,
      targetSeconds: def.prepSeconds,
      overboilSeconds: Number((def.prepSeconds + 4.8).toFixed(1)),
      flameMode: 'high',
      overboiled: false,
      stirsDone: 0,
      targetStirs: 2,
    });
    setBevPotIngredients([]);
  };

  const handleToggleBeverageFlame = () => {
    if (!teaPrepSlot || teaPrepSlot.overboiled) return;
    sound.playButtonClick();
    setTeaPrepSlot({
      ...teaPrepSlot,
      flameMode: teaPrepSlot.flameMode === 'high' ? 'simmer' : 'high',
    });
  };

  const handleStirBeverage = () => {
    if (!teaPrepSlot || teaPrepSlot.overboiled) return;
    sound.playPlop();
    let nextProg: number;
    if (teaPrepSlot.progressSeconds < teaPrepSlot.targetSeconds) {
      const boost = Math.max(0.55, teaPrepSlot.targetSeconds * 0.28);
      nextProg = Math.min(teaPrepSlot.targetSeconds + 0.2, teaPrepSlot.progressSeconds + boost);
      if (nextProg >= teaPrepSlot.targetSeconds) {
        sound.playDing();
      }
    } else {
      // Stirring while already steeped calms foam & pulls temp safely back from boiling over!
      nextProg = Math.max(teaPrepSlot.targetSeconds + 0.15, teaPrepSlot.progressSeconds - 1.15);
    }
    setTeaPrepSlot({
      ...teaPrepSlot,
      progressSeconds: nextProg,
      stirsDone: teaPrepSlot.stirsDone + 1,
    });
  };

  const handleDumpOverboiledBeverage = () => {
    sound.playButtonClick();
    setTeaPrepSlot(null);
  };

  const handleCollectExtraPrep = () => {
    if (teaDessertTray.length >= 3) {
      triggerPopup(T.extrasFull, false);
      return;
    }
    if (
      !teaPrepSlot ||
      teaPrepSlot.overboiled ||
      teaPrepSlot.progressSeconds < teaPrepSlot.targetSeconds
    ) {
      return;
    }
    sound.playDing();
    setTeaDessertTray((prev) => [
      ...prev,
      { id: `ex_${Date.now()}_bev`, extraId: teaPrepSlot.extraId, category: 'beverage' },
    ]);
    setTeaPrepSlot(null);
  };

  const handlePickDessertBase = (id: ExtraItemId) => {
    const def = EXTRA_ITEMS[id];
    if (saveData.day < def.unlockDay) return;
    sound.playButtonClick();
    setDessertDraftId(id);
    setDessertAddedGarnishes([]);
    setDessertTapCount(0);
  };

  const handleAddDessertGarnish = (ingId: ExtraIngredientId) => {
    if (!dessertDraftId) return;
    if (dessertAddedGarnishes.includes(ingId)) return;
    sound.playPlop();
    setDessertAddedGarnishes((prev) => [...prev, ingId]);
  };

  const handleDessertPlateTap = () => {
    if (!dessertDraftId) return;
    const def = EXTRA_ITEMS[dessertDraftId];
    const allGarnishesAdded = def.ingredients.every((g) => dessertAddedGarnishes.includes(g));
    if (!allGarnishesAdded) return;
    if (teaDessertTray.length >= 3) {
      triggerPopup(T.extrasFull, false);
      return;
    }
    const nextCount = dessertTapCount + 1;
    if (nextCount >= 3) {
      sound.playDing();
      setTeaDessertTray((prev) => [
        ...prev,
        { id: `ex_${Date.now()}_des`, extraId: dessertDraftId, category: 'dessert' },
      ]);
      setDessertDraftId(null);
      setDessertAddedGarnishes([]);
      setDessertTapCount(0);
    } else {
      sound.playPlop();
      setDessertTapCount(nextCount);
    }
  };

  const handleServeExtra = (readyItem: ReadyExtraItem) => {
    if (!activeTicket || isAdvancingRef.current) return;

    const exDef = EXTRA_ITEMS[readyItem.extraId];
    const exName = isFa ? FA_EXTRAS[readyItem.extraId]?.name || exDef.name : exDef.name;
    const extrasList = activeTicket.extras || [];
    const matchingLine = extrasList.find(
      (e) => e.extraId === readyItem.extraId && e.servedQty < e.qty
    );

    setTeaDessertTray((prev) => prev.filter((item) => item.id !== readyItem.id));
    lastServeReactionAtRef.current = Date.now();

    if (!matchingLine) {
      sound.playServeFail();
      const repLoss = 0.2;
      const nextRep = Math.max(1.0, Number((saveData.reputation - repLoss).toFixed(2)));
      setSaveData((prev) => ({ ...prev, reputation: nextRep }));
      setDayStats((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));
      triggerPopup(
        T.extraWrongMsg
          .replace('{name}', exName)
          .replace('{rep}', fmtNum(repLoss.toFixed(1), lang)),
        false
      );
      if (nextRep < 1.5) {
        finishDay({ ...dayStats, mistakes: dayStats.mistakes + 1 }, nextRep, true);
      }
      return;
    }

    const rushMultiplier = chaosEvent === 'rush_hour' ? 1.5 : 1;
    const samovarTip = (saveData.upgrades.samovar_heater || 0) * 2;
    const decorBonus = (saveData.upgrades.decor_plants || 0) * 1;
    const coinsGain = Math.round((exDef.price + samovarTip + decorBonus) * rushMultiplier);
    const ptsGain = coinsGain * 10 + 35;

    sound.playServeSuccess(true);
    sound.playCoin();

    const updatedExtras = extrasList.map((e) =>
      e.uid === matchingLine.uid ? { ...e, servedQty: e.servedQty + 1 } : e
    );
    const allBreadsDone = activeTicket.items.every((l) => l.servedQty >= l.qty);
    const allExtrasDone = updatedExtras.every((e) => e.servedQty >= e.qty);
    const allDone = allBreadsDone && allExtrasDone;

    if (allDone) {
      isAdvancingRef.current = true;
    }

    const repBoost = 0.1;
    const nextRep = Math.min(5.0, Number((saveData.reputation + repBoost).toFixed(2)));
    setRecentRepBoost(`+${fmtNum(repBoost.toFixed(2), lang)}★ ${T.praiseFast}`);

    const newlyRare = RARE_REPUTATION_UNLOCKS.filter(
      (u) => nextRep >= u.requiredRep && !saveData.unlockedRareBreads.includes(u.breadId)
    ).map((u) => u.breadId);

    if (newlyRare.length > 0) {
      sessionRareUnlocksRef.current = Array.from(
        new Set([...sessionRareUnlocksRef.current, ...newlyRare])
      );
    }

    setSaveData((prev) => {
      const nextExtrasTotal = (prev.totalExtrasServed || 0) + 1;
      const nextAchs = [...prev.achievements];
      if (nextExtrasTotal >= 10 && !nextAchs.includes('tea_host')) {
        nextAchs.push('tea_host');
      }
      return {
        ...prev,
        coins: prev.coins + coinsGain,
        reputation: nextRep,
        totalExtrasServed: nextExtrasTotal,
        achievements: nextAchs,
        unlockedRareBreads:
          newlyRare.length > 0
            ? Array.from(new Set([...prev.unlockedRareBreads, ...newlyRare]))
            : prev.unlockedRareBreads,
      };
    });

    const nextStats = {
      ...dayStats,
      coinsEarned: dayStats.coinsEarned + exDef.price,
      tipsEarned: dayStats.tipsEarned + Math.max(0, coinsGain - exDef.price),
      scoreEarned: dayStats.scoreEarned + ptsGain,
      extrasServed: dayStats.extrasServed + 1,
      ordersCompleted: dayStats.ordersCompleted + (allDone ? 1 : 0),
    };
    setDayStats(nextStats);

    const dialogueMap =
      lang === 'fa'
        ? FA_CUSTOMER_DIALOGUES[activeTicket.customer.id] ||
          CUSTOMER_DIALOGUE_VARIATIONS[activeTicket.customer.id]
        : CUSTOMER_DIALOGUE_VARIATIONS[activeTicket.customer.id];
    const happyLine =
      dialogueMap.breadQuality.perfect[
        Math.floor(Math.random() * dialogueMap.breadQuality.perfect.length)
      ];

    setTickets((prev) => {
      const copy = [...prev];
      copy[activeTicketIndex] = {
        ...activeTicket,
        extras: updatedExtras,
        expression: 'happy',
        reactionMessage: happyLine,
        dialogueTopic: 'bread',
      };
      return copy;
    });

    triggerPopup(
      T.extraServedMsg
        .replace('{name}', exName)
        .replace('{coins}', fmtNum(coinsGain, lang))
        .replace('{pts}', fmtNum(ptsGain, lang)),
      true
    );

    if (allDone) {
      advanceTimeoutRef.current = window.setTimeout(() => {
        advanceTimeoutRef.current = null;
        advanceCustomer(nextStats, nextRep);
      }, 950);
    }
  };

  // Shop purchase handler
  const handleBuyUpgrade = (id: UpgradeId) => {
    const def = SHOP_UPGRADES.find((u) => u.id === id);
    if (!def) return;
    const curLevel = saveData.upgrades[id] || 0;
    if (curLevel >= def.maxLevel) return;
    const cost = def.baseCost + curLevel * def.costStep;
    if (saveData.coins < cost) return;

    sound.playCoin();
    setSaveData((prev) => {
      const nextUpgrades = { ...prev.upgrades, [id]: curLevel + 1 };
      const allDecorOwned =
        nextUpgrades.decor_plants > 0 &&
        nextUpgrades.decor_rug > 0 &&
        nextUpgrades.decor_neon > 0 &&
        nextUpgrades.decor_cat > 0;
      const nextAchs = [...prev.achievements];
      if (allDecorOwned && !nextAchs.includes('fully_decorated')) {
        nextAchs.push('fully_decorated');
      }
      return {
        ...prev,
        coins: prev.coins - cost,
        upgrades: nextUpgrades,
        achievements: nextAchs,
      };
    });
  };

  // Reset Save handler
  const handleResetProgress = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = window.setTimeout(() => {
        resetTimeoutRef.current = null;
        setConfirmReset(false);
      }, 3500);
      return;
    }
    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setSaveData({ ...INITIAL_BAKERY_SAVE, lang });
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    setConfirmReset(false);
    setPhase('LOBBY');
  };

  // ============================================================================
  // TUTORIAL COACH TEXT (Day 1 Customer #1)
  // ============================================================================
  const getTutorialHint = (): string | null => {
    if (saveData.day !== 1 || activeTicketIndex !== 0 || phase !== 'PLAYING') return null;
    if (servingTray.length > 0) return T.tutStep6;
    if (ovenSlot) return T.tutStep5Pull;
    if (readyToBakeBatch) return T.tutStep5In;
    if (shapingBatch) return T.tutStep4;
    if (restingSlots.length > 0) {
      const slot = restingSlots[0];
      return slot.restProgress >= slot.targetRestSeconds ? T.tutStep3Done : T.tutStep3Wait;
    }
    if (kneadingDough) {
      return kneadingDough.hits >= kneadingDough.targetHits
        ? T.tutStep2Done
        : T.tutStep2Tap.replace('{target}', fmtNum(kneadingDough.targetHits, lang));
    }
    return T.tutStep1;
  };

  const tutorialHint = getTutorialHint();

  const currentWeatherMeta =
    WEATHER_OPTIONS.find((w) => w.id === weather) || WEATHER_OPTIONS[0];
  const weatherLabel = isFa
    ? FA_WEATHER[currentWeatherMeta.id]?.label || currentWeatherMeta.label
    : currentWeatherMeta.label;

  // ============================================================================
  // RENDER: BAKERY TITLE / LOBBY SCREEN
  // ============================================================================
  if (phase === 'LOBBY') {
    const unlockedBreads = getUnlockedBreads(
      saveData.day,
      saveData.reputation,
      saveData.unlockedRareBreads
    );
    const lobbySpecial = pickDailySpecial(saveData.day, unlockedBreads);
    const lobbySpecialRecipe = BREAD_RECIPES[lobbySpecial.breadId];

    return (
      <div
        dir={isFa ? 'rtl' : 'ltr'}
        className={`w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 ${
          isFa ? 'font-vazir rtl' : ''
        }`}
      >
        {/* Main Hero Bakery Showcase (Pure visual banner without crammed overlay stats) */}
        <div className="bg-[#241714] border-4 border-[#5c3a28] rounded-md overflow-hidden pixel-box">
          <div className="h-36 sm:h-48 relative">
            <BakerySceneBackdrop
              decor={{
                plants: (saveData.upgrades.decor_plants || 0) > 0,
                rug: (saveData.upgrades.decor_rug || 0) > 0,
                neon: (saveData.upgrades.decor_neon || 0) > 0,
                cat: (saveData.upgrades.decor_cat || 0) > 0,
              }}
              powerOut={false}
              ovenActive={true}
              weather={weather}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#190f0d] via-[#190f0d]/55 to-transparent flex flex-col justify-end p-4 sm:p-6">
              <div className="font-pixel-ui text-[10px] sm:text-xs text-[#f5c542] tracking-wider mb-1">
                {T.tagline}
              </div>
              <h1 className="font-pixel-display text-xl sm:text-3xl text-[#fbf3de] drop-shadow-[0_4px_0_#140b09]">
                {T.brandName}
              </h1>
              <p className="font-pixel-ticket text-lg sm:text-xl text-[#e2cfa9] mt-0.5 leading-snug">
                {T.subTitle}
              </p>
            </div>
          </div>

          {/* Clean Un-mushed Bakery Stats & Actions */}
          <div className="p-4 sm:p-5 bg-[#1d1310] border-t-2 border-[#422a1e] space-y-4">
            {/* Key Stats Row */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center sm:text-start">
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">{T.nextShift}</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] mt-0.5 tabular-nums">
                  {T.day} {fmtNum(saveData.day, lang)}
                </div>
              </div>
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">{T.coins}</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#f5c542] mt-0.5 tabular-nums">
                  {fmtNum(saveData.coins, lang)}
                  {T.coinSuffix}
                </div>
              </div>
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">{T.bestScore}</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#69c79b] mt-0.5 tabular-nums">
                  {fmtNum(saveData.bestScore || 0, lang)}
                </div>
              </div>
            </div>

            {/* Reputation Meter & Rare Recipe Milestones */}
            <ReputationMeter
              reputation={saveData.reputation}
              unlockedRareBreads={saveData.unlockedRareBreads}
              recentBoostText={recentRepBoost}
              lang={lang}
            />

            {/* Today's Daily Special Showcase */}
            <div className="bg-[#2b1a14] border-2 border-[#f5c542]/70 rounded p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 bg-[#1a100e] border-2 border-[#7c5620] rounded flex items-center justify-center shrink-0">
                  <BreadSprite
                    breadId={lobbySpecial.breadId}
                    size={46}
                    outcome="perfect"
                    showSteam={true}
                  />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="text-[#f5c542] flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {`${T.dailySpecial} (${T.day} ${fmtNum(saveData.day, lang)})`}
                    </span>
                    <span className="text-[#e8917d]">
                      · {isFa ? FA_BREAD_NAMES[lobbySpecial.breadId].difficulty : lobbySpecialRecipe.difficulty}
                    </span>
                  </div>
                  <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] truncate">
                    {isFa ? FA_BREAD_NAMES[lobbySpecial.breadId].name : lobbySpecialRecipe.name}
                  </div>
                  <div className="text-xs text-[#d9c8ac]">
                    {T.ingredients}:{' '}
                    {lobbySpecialRecipe.ingredients
                      .map((ingId) =>
                        isFa
                          ? FA_INGREDIENTS[ingId]?.shortName || ingId
                          : INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId
                      )
                      .join(isFa ? '، ' : ', ')}
                  </div>
                </div>
              </div>

              <div className="bg-[#1a100e] border border-[#f5c542]/60 rounded px-3 py-2 text-center sm:text-end shrink-0">
                <div className="text-[10px] text-[#cbb596] uppercase">{T.specialBonus}</div>
                <div className="font-pixel-display text-xs text-[#f5c542] mt-0.5 tabular-nums">
                  {fmtNum(lobbySpecial.multiplier, lang)}× {T.scoreCoins}
                </div>
              </div>
            </div>

            {/* Custom Baker Identity Card */}
            <div className="bg-[#251815] border-2 border-[#4d3023] rounded p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 bg-[#1a100e] border-2 border-[#5c3a28] rounded flex items-center justify-center shrink-0">
                  <BakerAvatarSprite look={saveData.bakerLook} size={48} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-pixel-ui text-[#a88d73] tracking-wide">
                    {T.headBaker}
                  </div>
                  <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] truncate mt-0.5">
                    {saveData.bakerLook.name || T.bakerDefaultName}
                  </div>
                  <div className="text-xs text-[#cbb596] mt-0.5">
                    {fmtNum(saveData.totalBreadsBaked, lang)} {T.loavesBaked} ·{' '}
                    {fmtNum(saveData.achievements.length, lang)}/{fmtNum(ACHIEVEMENTS.length, lang)}{' '}
                    {T.badges}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playButtonClick();
                  setShowBakerCustomize(true);
                }}
                className="min-h-[46px] w-full sm:w-auto px-4 py-2.5 bg-[#4a3024] hover:bg-[#5e3d2e] text-[#f5c542] font-pixel-ui font-bold text-xs rounded border-2 border-[#78513d] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>{T.customizeBaker}</span>
              </button>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                <button
                  onClick={() => startDayShift(saveData.day)}
                  className="min-h-[50px] px-6 py-3.5 bg-[#d95f3b] hover:bg-[#e86d48] text-white font-pixel-display text-xs sm:text-sm rounded border-2 border-[#7c2e16] pixel-btn flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {T.startShift} {fmtNum(saveData.day, lang)}
                    {T.shiftSuffix ? ` ${T.shiftSuffix}` : ''}
                  </span>
                </button>

                <div className="grid grid-cols-3 sm:flex gap-2.5">
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setDaySummary(null);
                      setShowShopModal(true);
                    }}
                    className="min-h-[46px] px-3 sm:px-4 py-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border-2 border-[#215752] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span className="truncate">{T.shopDecor}</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setShowRecipes(true);
                    }}
                    className="min-h-[46px] px-3 sm:px-4 py-2.5 bg-[#3a251c] hover:bg-[#4d3227] text-[#f4e8c1] font-pixel-ui text-xs rounded border-2 border-[#6b4635] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#f5c542] shrink-0" />
                    <span className="truncate">{T.recipeBook}</span>
                  </button>

                  <button
                    onClick={handleLanguageSwitch}
                    className="min-h-[46px] px-3 sm:px-4 py-2.5 bg-[#3a251c] hover:bg-[#4d3227] border-2 border-[#6b4635] rounded text-xs font-pixel-ui text-[#f5c542] flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                    title="Switch Language / تغییر زبان"
                  >
                    <span>{T.langButton}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleResetProgress}
                className={`min-h-[44px] px-3.5 py-2 rounded border text-xs font-pixel-ui flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  confirmReset
                    ? 'bg-[#c93b3b] border-[#821f1f] text-white'
                    : 'bg-[#251815] border-[#422a1e] text-[#a88d73] hover:text-[#f4e8c1]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{confirmReset ? T.tapAgainReset : T.resetSave}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lower Split: Unlocked Menu Preview + Cat & Bread Side Game Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          {/* Unlocked Breads Menu */}
          <div className="lg:col-span-2 bg-[#241714] border-2 border-[#4d3023] rounded-md p-4 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3d261c] pb-2.5 mb-3">
              <h2 className="font-pixel-display text-xs text-[#f5c542]">
                {T.bakeryMenu} ({fmtNum(unlockedBreads.length, lang)}/{fmtNum(BREAD_ORDER.length, lang)}{' '}
                {T.unlockedOutOf})
              </h2>
              <span className="text-xs text-[#cbb596]">{T.menuSubtitle}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {unlockedBreads.map((id) => {
                const rec = BREAD_RECIPES[id];
                const isSpecial = id === lobbySpecial.breadId;
                const displayName = isFa ? FA_BREAD_NAMES[id]?.name || rec.name : rec.name;
                return (
                  <div
                    key={id}
                    className={`bg-[#1b110f] border rounded p-2.5 flex flex-col items-center text-center ${
                      isSpecial
                        ? 'border-[#f5c542]'
                        : rec.unlockReputation
                        ? 'border-[#7c56b8]'
                        : 'border-[#3d261c]'
                    }`}
                  >
                    <BreadSprite breadId={id} size={42} outcome="perfect" showSteam={false} />
                    <div className="font-bold text-xs text-[#f4e8c1] mt-1.5 truncate max-w-full">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-[#d4a373] tabular-nums">
                      {isSpecial
                        ? `★ ${fmtNum(lobbySpecial.multiplier, lang)}×`
                        : `${fmtNum(rec.price, lang)}${T.coinSuffix}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Game Promo Card: Cat & Bread Arcade */}
          <div className="bg-[#241714] border-2 border-[#5c3a28] rounded-md p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#f5c542]">{T.sideGameTitle}</span>
                <Cat className="w-4 h-4 text-[#f5c542]" />
              </div>
              <h3 className="font-pixel-display text-sm text-[#fbf3de]">{T.catGameTitle}</h3>
              <p className="font-pixel-ticket text-lg text-[#d9c8ac] leading-snug mt-1">
                {T.catGameDesc}
              </p>
            </div>

            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenSideGame();
              }}
              className="min-h-[46px] w-full py-2.5 px-4 bg-[#e59f2c] hover:bg-[#f0ae3c] text-[#1c110c] font-pixel-ui font-bold text-xs rounded border-2 border-[#8c5a12] pixel-btn cursor-pointer"
            >
              {T.playCat}
            </button>
          </div>
        </div>

        {/* Modals */}
        {showRecipes && (
          <RecipeBookModal
            currentDay={saveData.day}
            reputation={saveData.reputation}
            unlockedRareBreads={saveData.unlockedRareBreads}
            lang={lang}
            onClose={() => setShowRecipes(false)}
          />
        )}
        {showShopModal && (
          <ShopModal
            summary={daySummary}
            saveData={saveData}
            lang={lang}
            onBuyUpgrade={handleBuyUpgrade}
            onStartNextDay={() => startDayShift(saveData.day)}
            onRetryDay={() => startDayShift(saveData.day)}
            onCloseOnly={() => setShowShopModal(false)}
          />
        )}
        {showBakerCustomize && (
          <BakerCustomizeModal
            look={saveData.bakerLook}
            lang={lang}
            onChange={(nextLook) => setSaveData((prev) => ({ ...prev, bakerLook: nextLook }))}
            onClose={() => {
              setSaveData((prev) => ({
                ...prev,
                bakerLook: {
                  ...prev.bakerLook,
                  name: prev.bakerLook.name.trim() || T.bakerDefaultName,
                },
              }));
              setShowBakerCustomize(false);
            }}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: ACTIVE SHIFT WORKSPACE
  // ============================================================================
  const kneadQualityPreview = getKneadQuality();

  // Compute bake gauge colors & label
  const ovenPct = ovenSlot
    ? Math.min(100, (ovenSlot.elapsedSeconds / (ovenSlot.targetMaxSeconds * 1.25)) * 100)
    : 0;
  const ovenMinPct = ovenSlot
    ? (ovenSlot.targetMinSeconds / (ovenSlot.targetMaxSeconds * 1.25)) * 100
    : 45;
  const ovenMaxPct = ovenSlot
    ? (ovenSlot.targetMaxSeconds / (ovenSlot.targetMaxSeconds * 1.25)) * 100
    : 82;
  const ovenMidPct = (ovenMinPct + ovenMaxPct) / 2;

  const getOvenZoneLabel = () => {
    if (!ovenSlot) return '';
    if (ovenPct < ovenMinPct * 0.88) return T.zoneRaw;
    if (ovenPct <= ovenMaxPct * 1.05) {
      return ovenPct >= ovenMidPct ? T.zoneWellDone : T.zoneReady;
    }
    return T.zoneBurning;
  };

  const getOvenBarColor = () => {
    if (!ovenSlot) return 'bg-[#d8c6a3]';
    if (ovenPct < ovenMinPct * 0.88) return 'bg-[#e6d5b8]';
    if (ovenPct <= ovenMaxPct * 1.05) return ovenPct >= ovenMidPct ? 'bg-[#d97724]' : 'bg-[#f5c542]';
    return 'bg-[#2a2220]';
  };

  const activeCustomerName = activeTicket
    ? (isFa ? FA_CUSTOMER_NAMES[activeTicket.customer.id]?.name : null) ||
      activeTicket.customer.name
    : '';
  const activeCustomerRole = activeTicket
    ? (isFa ? FA_CUSTOMER_NAMES[activeTicket.customer.id]?.role : null) ||
      activeTicket.customer.role
    : '';
  const specialBreadName = isFa
    ? FA_BREAD_NAMES[dailySpecial.breadId]?.name || BREAD_RECIPES[dailySpecial.breadId].name
    : BREAD_RECIPES[dailySpecial.breadId].name;
  const selectedOvenLabel = isFa
    ? FA_OVENS[selectedOven]?.name || selectedOven
    : OVENS.find((o) => o.id === selectedOven)?.name || selectedOven;
  const activeOvenLabel = ovenSlot
    ? isFa
      ? FA_OVENS[ovenSlot.ovenType]?.name || ovenSlot.ovenType
      : OVENS.find((o) => o.id === ovenSlot.ovenType)?.name || ovenSlot.ovenType
    : '';

  return (
    <div
      dir={isFa ? 'rtl' : 'ltr'}
      className={`w-full max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 space-y-3 ${
        isFa ? 'font-vazir rtl' : ''
      }`}
    >
      {/* Top Shift HUD (Clean mobile-friendly rows) */}
      <div className="bg-[#241714] border-2 border-[#5c3a28] rounded-md p-2.5 sm:p-3 space-y-2.5 text-xs tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 min-w-0">
            {/* Custom Baker Mini Badge */}
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowBakerCustomize(true);
              }}
              title={T.customizeBaker}
              className="min-h-[38px] flex items-center gap-1.5 bg-[#1a100e] hover:bg-[#2c1c18] border border-[#4d3023] rounded px-2 py-1 cursor-pointer"
            >
              <BakerAvatarSprite look={saveData.bakerLook} size={24} />
              <span className="font-bold text-[#fbf3de] max-w-[78px] sm:max-w-[110px] truncate">
                {saveData.bakerLook.name || T.bakerDefaultName}
              </span>
            </button>

            <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs">
              <span>
                <strong className="font-pixel-display text-[11px] text-[#fbf3de]">
                  {T.day} {fmtNum(saveData.day, lang)}
                </strong>
              </span>
              <span className="text-[#cbb596]">
                {T.cust}{' '}
                <strong className="text-[#f4e8c1]">
                  {fmtNum(Math.min(activeTicketIndex + 1, tickets.length), lang)}/
                  {fmtNum(tickets.length, lang)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[#f5c542] font-bold">
                <Coins className="w-3.5 h-3.5" />
                {fmtNum(saveData.coins, lang)}
                {T.coinSuffix}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[#9ecbe0] text-[11px]">
                <Sun className="w-3.5 h-3.5 text-[#f5c542]" />
                {weatherLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowRecipes(true);
              }}
              className="min-h-[40px] px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#f5c542]" />
              <span>{T.recipes}</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                setPhase((p) => (p === 'PAUSED' ? 'PLAYING' : 'PAUSED'));
              }}
              className="min-h-[40px] px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] flex items-center gap-1.5 cursor-pointer"
            >
              {phase === 'PAUSED' ? (
                <Play className="w-3.5 h-3.5 text-[#69c79b]" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
              <span>{phase === 'PAUSED' ? T.resume : T.pause}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Reputation Meter + Active Daily Special Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2 border-t border-[#3d261c] items-center">
          <div className="md:col-span-7">
            <ReputationMeter
              compact
              reputation={saveData.reputation}
              unlockedRareBreads={saveData.unlockedRareBreads}
              recentBoostText={recentRepBoost}
              lang={lang}
            />
          </div>
          <div className="md:col-span-5 bg-[#2b1a14] border border-[#f5c542]/60 rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-[#f5c542] font-bold flex items-center gap-1.5 truncate">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {T.specialBadge.replace('{name}', specialBreadName)}
              </span>
            </span>
            <span className="font-bold text-[#fbf3de] shrink-0">
              {T.bonusLabel.replace('{mult}', fmtNum(dailySpecial.multiplier, lang))}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Chaos Event Banner */}
      {chaosEvent !== 'none' && (
        <div
          className={`px-3.5 py-2.5 rounded border-2 flex flex-wrap items-center justify-between gap-2.5 text-xs ${
            chaosEvent === 'rush_hour'
              ? 'bg-[#362611] border-[#e59f2c] text-[#ffe8a3]'
              : 'bg-[#3b1919] border-[#c93b3b] text-[#ffd6d6]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {chaosEvent === 'cat_thief' && <Cat className="w-4 h-4 text-[#f5c542]" />}
            {chaosEvent === 'flour_spill' && <Wind className="w-4 h-4 text-[#f4e8c1]" />}
            {chaosEvent === 'power_flicker' && <Zap className="w-4 h-4 text-[#f5c542]" />}
            {chaosEvent === 'rush_hour' && <Sparkles className="w-4 h-4 text-[#f5c542]" />}
            <span>
              {chaosEvent === 'cat_thief' && T.catThiefEyeing}
              {chaosEvent === 'flour_spill' &&
                T.flourSpillWarning.replace('{count}', fmtNum(3 - flourSpillClicks, lang))}
              {chaosEvent === 'power_flicker' && T.powerFlickerWarning}
              {chaosEvent === 'rush_hour' &&
                (isFa ? T.rushHourWarning : T.rushHourWarningEn).replace(
                  '{sec}',
                  fmtNum(Math.ceil(chaosTimer), lang)
                )}
            </span>
          </div>

          {chaosEvent === 'cat_thief' && (
            <button
              onClick={() => {
                sound.playCatMeow();
                setChaosEvent('none');
                setSaveData((prev) => {
                  const nextShoos = prev.catShoos + 1;
                  const nextAchs = [...prev.achievements];
                  if (nextShoos >= 3 && !nextAchs.includes('cat_whisperer')) {
                    nextAchs.push('cat_whisperer');
                  }
                  return {
                    ...prev,
                    catShoos: nextShoos,
                    achievements: nextAchs,
                    coins: prev.coins + 2,
                  };
                });
                triggerPopup(T.shooedKitty, true);
              }}
              className="min-h-[42px] px-3.5 py-1.5 bg-[#f5c542] text-[#1c110c] font-bold rounded border border-[#8c5a12] pixel-btn cursor-pointer"
            >
              {T.catShooBtn}
            </button>
          )}

          {chaosEvent === 'flour_spill' && (
            <button
              onClick={() => {
                sound.playButtonClick();
                if (flourSpillClicks + 1 >= 3) {
                  setChaosEvent('none');
                  setFlourSpillClicks(0);
                  triggerPopup(T.sweptSpotless, true);
                } else {
                  setFlourSpillClicks((c) => c + 1);
                }
              }}
              className="min-h-[42px] px-3.5 py-1.5 bg-[#f4e8c1] text-[#1c110c] font-bold rounded border border-[#9d8159] pixel-btn cursor-pointer"
            >
              {T.sweepBtn} ({fmtNum(flourSpillClicks, lang)}/{fmtNum(3, lang)})
            </button>
          )}
        </div>
      )}

      {/* Day 1 Guided Tutorial Banner */}
      {tutorialHint && (
        <div className="bg-[#1b2e2b] border-2 border-[#3b8c84] rounded px-3.5 py-2.5 text-xs text-[#c7f2ec] leading-relaxed">
          {tutorialHint}
        </div>
      )}

      {/* MOBILE ONLY (< lg): Clean 2-Tab View Switcher (Counter & Order vs Kitchen 1-5) */}
      <div className="lg:hidden grid grid-cols-2 gap-2 bg-[#1a100e] border-2 border-[#5c3a28] rounded-md p-1.5">
        <button
          onClick={() => {
            sound.playButtonClick();
            setMobilePanel('counter');
          }}
          className={`min-h-[46px] px-3 py-2 rounded font-pixel-ui text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            mobilePanel === 'counter'
              ? 'bg-[#e59f2c] text-[#1c110c]'
              : 'text-[#cbb596] hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>
            {T.counterOrder}
            {servingTray.length + teaDessertTray.length > 0
              ? ` (${fmtNum(servingTray.length + teaDessertTray.length, lang)})`
              : ''}
          </span>
        </button>

        <button
          onClick={() => {
            sound.playButtonClick();
            setMobilePanel('kitchen');
          }}
          className={`min-h-[46px] px-3 py-2 rounded font-pixel-ui text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            mobilePanel === 'kitchen'
              ? 'bg-[#e59f2c] text-[#1c110c]'
              : 'text-[#cbb596] hover:text-white'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span>{T.kitchenBake}</span>
        </button>
      </div>

      {/* PERSISTENT NON-BLOCKING KITCHEN STATUS DRAWER (Vertical summary of active proofing, baking & brewing timers) */}
      <KitchenStatusDrawer
        open={kitchenDrawerOpen}
        onToggleOpen={() => {
          sound.playButtonClick();
          setKitchenDrawerOpen((o) => !o);
        }}
        kneadingDough={kneadingDough}
        restingSlots={restingSlots}
        shapingBatch={shapingBatch}
        readyToBakeBatch={readyToBakeBatch}
        ovenSlot={ovenSlot}
        teaPrepSlot={teaPrepSlot}
        lang={lang}
        onJumpToStation={(targetTab, subTab) => {
          sound.playButtonClick();
          setStation(targetTab);
          if (subTab) setCafeSubTab(subTab);
          setMobilePanel('kitchen');
        }}
      />

      {/* Main 2-Column Bakery Play Area (2-tab switched on phone, side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN (or RIGHT in RTL): Storefront Scene + Customer + Paper Ticket + Serving Tray */}
        <div
          className={`lg:col-span-5 space-y-3.5 ${
            mobilePanel === 'counter' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Customer Counter Stage */}
          <div className="bg-[#241714] border-2 border-[#5c3a28] rounded-md overflow-hidden relative">
            <div className="h-44 sm:h-40 relative">
              <BakerySceneBackdrop
                decor={{
                  plants: (saveData.upgrades.decor_plants || 0) > 0,
                  rug: (saveData.upgrades.decor_rug || 0) > 0,
                  neon: (saveData.upgrades.decor_neon || 0) > 0,
                  cat: (saveData.upgrades.decor_cat || 0) > 0,
                }}
                powerOut={chaosEvent === 'power_flicker'}
                ovenActive={Boolean(ovenSlot)}
                weather={weather}
              />

              {/* Active Customer standing at counter */}
              {activeTicket && (
                <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-end gap-2.5 pointer-events-none">
                  <div className="shrink-0">
                    <CustomerSprite
                      customer={activeTicket.customer}
                      expression={activeTicket.expression}
                      isWalkingIn={isWalkingIn}
                      size={70}
                    />
                  </div>

                  {/* Animated Pixel Speech Bubble */}
                  <div
                    key={activeTicket.reactionMessage}
                    className="relative bg-[#fbf3de] text-[#2b1d12] border-2 border-[#5c3a28] rounded px-2.5 py-2 mb-1.5 min-w-0 flex-1 max-w-[300px] shadow-md animate-bread-pop"
                  >
                    <div
                      className={`absolute bottom-2.5 w-2.5 h-2.5 bg-[#fbf3de] border-[#5c3a28] ${
                        isFa
                          ? '-right-2 border-r-2 border-b-2 -rotate-45'
                          : '-left-2 border-l-2 border-b-2 rotate-45'
                      }`}
                    />

                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                      <span className="text-[#8f4c24] truncate">
                        {activeCustomerName} · {activeCustomerRole}
                      </span>
                      <span className="text-[#3b8c84] uppercase tracking-wider shrink-0">
                        {activeTicket.dialogueTopic === 'weather'
                          ? T.topicWeather
                          : activeTicket.dialogueTopic === 'bakery'
                          ? T.topicBakery
                          : activeTicket.dialogueTopic === 'bread'
                          ? T.topicTaste
                          : T.topicOrder}
                      </span>
                    </div>
                    <div className="font-pixel-ticket text-[17px] leading-tight mt-0.5 break-words">
                      {isFa ? `«${activeTicket.reactionMessage}»` : `“${activeTicket.reactionMessage}”`}
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Coin/Feedback Popup */}
              {coinPopup && (
                <div
                  key={coinPopup.id}
                  className={`absolute top-2 ${
                    isFa ? 'left-3' : 'right-3'
                  } px-2.5 py-1 rounded border font-pixel-ui text-xs font-bold animate-coin-float ${
                    coinPopup.positive
                      ? 'bg-[#2a5c3d] border-[#5cd68d] text-[#d9ffea]'
                      : 'bg-[#6b2020] border-[#e37266] text-[#ffd6d6]'
                  }`}
                >
                  {coinPopup.text}
                </div>
              )}
            </div>
          </div>

          {/* Paper Order Ticket */}
          {activeTicket && (
            <OrderTicket
              ticket={activeTicket}
              bakerName={saveData.bakerLook.name}
              dailySpecialMultiplier={dailySpecial.multiplier}
              lang={lang}
            />
          )}

          {/* Mobile Quick Switch CTA: Jump straight to Kitchen */}
          <button
            onClick={() => {
              sound.playButtonClick();
              setMobilePanel('kitchen');
            }}
            className="lg:hidden min-h-[48px] w-full py-3 px-4 bg-[#d95f3b] hover:bg-[#e86d48] text-white font-pixel-display text-xs rounded border-2 border-[#7c2e16] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{T.goToKitchen}</span>
          </button>

          {/* Counter / Serving Tray */}
          <div className="bg-[#241714] border-2 border-[#5c3a28] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-pixel-display text-[10px] text-[#f5c542]">
                {T.counterTray} ({fmtNum(servingTray.length, lang)}/{fmtNum(maxTraySlots, lang)})
              </span>
              <span className="text-[11px] text-[#cbb596]">{T.traySub}</span>
            </div>

            {servingTray.length === 0 ? (
              <div className="bg-[#1a100e] border border-dashed border-[#4d3023] rounded py-4 text-center text-xs text-[#8a6d56]">
                {T.trayEmpty}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {servingTray.map((loaf) => {
                  const recName = loaf.matchedRecipeId
                    ? isFa
                      ? FA_BREAD_NAMES[loaf.matchedRecipeId]?.name ||
                        BREAD_RECIPES[loaf.matchedRecipeId].name
                      : BREAD_RECIPES[loaf.matchedRecipeId].name
                    : T.mysteryLoaf;
                  const tagText =
                    loaf.outcome === 'perfect'
                      ? loaf.isWellDone
                        ? T.breadOutcomeWellDone
                        : T.breadOutcomePerfect
                      : getLocalizedLoafIssue(loaf, lang);

                  return (
                    <div
                      key={loaf.id}
                      className="bg-[#1b110f] border-2 border-[#4d3023] rounded p-2.5 flex items-center gap-2.5 animate-bread-pop"
                    >
                      <BreadSprite
                        breadId={loaf.matchedRecipeId}
                        shape={loaf.shape}
                        outcome={loaf.outcome}
                        hasSesame={loaf.hasSesame}
                        hasNigella={loaf.hasNigella}
                        isWellDone={loaf.isWellDone}
                        size={46}
                        showSteam={true}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-[#f4e8c1] truncate">{recName}</div>
                        <div
                          className={`text-[11px] truncate ${
                            loaf.outcome === 'perfect' ? 'text-[#69c79b]' : 'text-[#e8917d]'
                          }`}
                        >
                          {tagText}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            onClick={() => handleServeLoaf(loaf)}
                            className="min-h-[44px] sm:min-h-[36px] flex-1 py-1.5 px-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white text-xs font-bold rounded border border-[#225954] pixel-btn cursor-pointer"
                          >
                            {T.serve}
                          </button>
                          <button
                            onClick={() => {
                              sound.playButtonClick();
                              setServingTray((prev) => prev.filter((i) => i.id !== loaf.id));
                            }}
                            title={T.discard}
                            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 bg-[#4d2020] hover:bg-[#6b2a2a] text-[#f5b7b1] rounded border border-[#7c2e2e] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tea & Sweets Counter Sub-Tray */}
            <div className="mt-3.5 pt-3 border-t border-[#3d261c]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel-display text-[10px] text-[#f5c542] flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" />
                  {T.teaDessertTray} ({fmtNum(teaDessertTray.length, lang)}/{fmtNum(3, lang)})
                </span>
              </div>

              {teaDessertTray.length === 0 ? (
                <div className="bg-[#1a100e] border border-dashed border-[#4d3023] rounded py-2.5 px-2 text-center text-[11px] text-[#8a6d56]">
                  {T.trayEmptyExtras}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teaDessertTray.map((ex) => {
                    const exDef = EXTRA_ITEMS[ex.extraId];
                    const exName = isFa ? FA_EXTRAS[ex.extraId]?.name || exDef.name : exDef.name;
                    return (
                      <div
                        key={ex.id}
                        className="bg-[#1b110f] border-2 border-[#6e5225] rounded p-2 flex items-center gap-2 animate-bread-pop"
                      >
                        <ExtraItemSprite
                          id={ex.extraId}
                          size={38}
                          showSteam={ex.category === 'beverage'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-[#f4e8c1] truncate">{exName}</div>
                          <div className="text-[11px] text-[#f5c542] tabular-nums">
                            {fmtNum(exDef.price, lang)}
                            {T.coinSuffix}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <button
                              onClick={() => handleServeExtra(ex)}
                              className="min-h-[38px] sm:min-h-[32px] flex-1 py-1 px-2 bg-[#3b8c84] hover:bg-[#46a39a] text-white text-xs font-bold rounded border border-[#225954] pixel-btn cursor-pointer"
                            >
                              {T.serve}
                            </button>
                            <button
                              onClick={() => {
                                sound.playButtonClick();
                                setTeaDessertTray((prev) => prev.filter((item) => item.id !== ex.id));
                              }}
                              title={T.discard}
                              className="min-h-[38px] sm:min-h-[32px] min-w-[38px] sm:min-w-[32px] p-1.5 bg-[#4d2020] hover:bg-[#6b2a2a] text-[#f5b7b1] rounded border border-[#7c2e2e] flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (or LEFT in RTL): 6 BAKERY STATIONS WORKBENCH */}
        <div
          className={`lg:col-span-7 bg-[#241714] border-2 border-[#5c3a28] rounded-md overflow-hidden flex-col ${
            mobilePanel === 'kitchen' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Mobile Kitchen Header: Non-sticky Order Reminder + Live Ingredients + Quick Serve */}
          {activeTicket && (
            <div className="lg:hidden bg-[#2b1b16] border-b-2 border-[#4d3023] px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="font-bold text-[#f5c542]">{T.needOrder}</div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-pixel-ui text-xs font-bold text-[#f4c44e] tabular-nums">
                    {fmtNum(Math.ceil(activeTicket.patienceLeft), lang)}
                    {T.secSuffix}
                  </span>
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setMobilePanel('counter');
                    }}
                    className="min-h-[34px] px-2.5 py-1 bg-[#1a100e] border border-[#5c3a28] rounded text-[11px] font-bold text-[#e2cfa9] cursor-pointer"
                  >
                    {T.ticketButton}
                  </button>
                </div>
              </div>

              {/* Pending Order Items with Ingredients right in Mobile Kitchen */}
              <div className="space-y-1.5">
                {activeTicket.items
                  .filter((line) => line.servedQty < line.qty)
                  .map((line) => {
                    const rec = BREAD_RECIPES[line.breadId];
                    const breadName = isFa ? FA_BREAD_NAMES[line.breadId]?.name || rec.name : rec.name;
                    const ingList: IngredientId[] = [...rec.ingredients];
                    if (line.modifier === 'add_nigella' && !ingList.includes('nigella')) {
                      ingList.push('nigella');
                    }
                    if (line.modifier === 'extra_sesame' && !ingList.includes('sesame')) {
                      ingList.push('sesame');
                    }
                    return (
                      <div
                        key={line.uid}
                        className="bg-[#1b110f] border border-[#422a1e] rounded p-2 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-bold ${
                              line.isDailySpecial ? 'text-[#f5c542]' : 'text-[#fbf3de]'
                            }`}
                          >
                            {line.isDailySpecial ? '★ ' : ''}
                            {fmtNum(line.qty - line.servedQty, lang)}× {breadName}
                            {line.modifier !== 'none'
                              ? ` (${
                                  isFa ? FA_MODIFIERS[line.modifier] : MODIFIER_LABELS[line.modifier]
                                })`
                              : ''}
                          </span>
                          <span className="text-[10px] text-[#cbb596] shrink-0">
                            {isFa ? FA_SHAPES[rec.shape]?.name : SHAPES.find((s) => s.id === rec.shape)?.name}{' '}
                            · {isFa ? FA_OVENS[rec.oven]?.name : OVENS.find((o) => o.id === rec.oven)?.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ingList.map((ingId) => {
                            const isSkippedSalt = ingId === 'salt' && line.modifier === 'no_salt';
                            const inBowl = bowlIngredients.includes(ingId);
                            const ingLabel = isFa
                              ? FA_INGREDIENTS[ingId]?.shortName || ingId
                              : INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId;
                            return (
                              <span
                                key={ingId}
                                title={
                                  isFa
                                    ? FA_INGREDIENTS[ingId]?.name || ingLabel
                                    : INGREDIENTS.find((i) => i.id === ingId)?.name || ingLabel
                                }
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                                  isSkippedSalt
                                    ? 'bg-[#3b1c1c] border-[#823333] text-[#e8917d] line-through'
                                    : inBowl
                                    ? 'bg-[#1e3d36] border-[#4ca88e] text-[#a7f3d0]'
                                    : 'bg-[#251815] border-[#4d3023] text-[#e2cfa9]'
                                }`}
                              >
                                <IngredientIcon id={ingId} size={12} />
                                <span>{ingLabel}</span>
                                {inBowl && !isSkippedSalt && <Check className="w-2.5 h-2.5 text-[#5cd68d]" />}
                              </span>
                            );
                          })}
                        </div>

                        {/* Action Pipeline Icons + Tooltips (Knead, Proof, Shape, Heat/Oven) */}
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {(() => {
                            const shapeLabel = isFa
                              ? FA_SHAPES[rec.shape]?.name || rec.shape
                              : SHAPES.find((s) => s.id === rec.shape)?.name || rec.shape;
                            const ovenLabel = isFa
                              ? FA_OVENS[rec.oven]?.name || rec.oven
                              : OVENS.find((o) => o.id === rec.oven)?.name || rec.oven;
                            return (
                              <>
                                <span
                                  title={T.tipKnead.replace('{count}', fmtNum(rec.kneadTarget, lang))}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#261a14] border border-[#5c3a28] text-[10px] text-[#f5c542] tabular-nums"
                                >
                                  <Hand className="w-3 h-3" />
                                  <span>{T.actionKnead.replace('{count}', fmtNum(rec.kneadTarget, lang))}</span>
                                </span>
                                <span
                                  title={T.tipProof.replace('{sec}', fmtNum(rec.restSeconds, lang))}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#261a14] border border-[#5c3a28] text-[10px] text-[#7cc4e0] tabular-nums"
                                >
                                  <Wind className="w-3 h-3" />
                                  <span>{T.actionProof.replace('{sec}', fmtNum(rec.restSeconds, lang))}</span>
                                </span>
                                <span
                                  title={T.tipShape.replace('{shape}', shapeLabel)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#261a14] border border-[#5c3a28] text-[10px] text-[#e2cfa9]"
                                >
                                  <ShapeIcon id={rec.shape} size={12} />
                                  <span>{shapeLabel}</span>
                                </span>
                                <span
                                  title={T.tipHeat.replace('{oven}', ovenLabel)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#261a14] border border-[#5c3a28] text-[10px] text-[#ffae52] tabular-nums"
                                >
                                  <Flame className="w-3 h-3" />
                                  <span>{T.actionHeat.replace('{sec}', fmtNum(rec.bakeMinSeconds, lang))}</span>
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}

                {activeTicket.extras
                  ?.filter((ex) => ex.servedQty < ex.qty)
                  .map((exLine) => {
                    const def = EXTRA_ITEMS[exLine.extraId];
                    const exName = isFa ? FA_EXTRAS[exLine.extraId]?.name || def.name : def.name;
                    const actionTip =
                      def.category === 'beverage' ? T.tipBevAction : T.tipDessertAction;
                    return (
                      <div
                        key={exLine.uid}
                        title={actionTip}
                        className="bg-[#1b110f] border border-[#5c4322] rounded p-2 flex flex-wrap items-center justify-between gap-1.5"
                      >
                        <span className="font-bold text-xs text-[#ffd57e] flex items-center gap-1">
                          <ExtraItemSprite id={exLine.extraId} size={20} />
                          <span>
                            {fmtNum(exLine.qty - exLine.servedQty, lang)}× {exName}
                          </span>
                          {def.category === 'beverage' ? (
                            <Flame className="w-3 h-3 text-[#ff8f2b]" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#f5c542]" />
                          )}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {def.ingredients.map((ingId) => {
                            const label = isFa
                              ? FA_EXTRA_INGREDIENTS[ingId]?.shortName || ingId
                              : EXTRA_INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId;
                            return (
                              <span
                                key={ingId}
                                title={
                                  isFa
                                    ? FA_EXTRA_INGREDIENTS[ingId]?.name || label
                                    : EXTRA_INGREDIENTS.find((i) => i.id === ingId)?.name || label
                                }
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#251815] border border-[#4d3023] text-[10px] text-[#e2cfa9] font-bold"
                              >
                                <ExtraIngredientIcon id={ingId} size={12} />
                                <span>{label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {(servingTray.length > 0 || teaDessertTray.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1.5 border-t border-[#422a1e]">
                  {servingTray.map((loaf) => {
                    const recName = loaf.matchedRecipeId
                      ? isFa
                        ? FA_BREAD_NAMES[loaf.matchedRecipeId]?.name ||
                          BREAD_RECIPES[loaf.matchedRecipeId].name
                        : BREAD_RECIPES[loaf.matchedRecipeId].name
                      : T.loafShort;
                    return (
                      <button
                        key={loaf.id}
                        onClick={() => handleServeLoaf(loaf)}
                        className="min-h-[42px] px-3.5 py-1.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white text-xs font-bold rounded border border-[#225954] pixel-btn cursor-pointer"
                      >
                        {T.serveLoafBtn.replace('{name}', recName)}
                      </button>
                    );
                  })}
                  {teaDessertTray.map((ex) => {
                    const exName = isFa
                      ? FA_EXTRAS[ex.extraId]?.name || EXTRA_ITEMS[ex.extraId].name
                      : EXTRA_ITEMS[ex.extraId].name;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleServeExtra(ex)}
                        className="min-h-[42px] px-3.5 py-1.5 bg-[#b57a1c] hover:bg-[#cc8b23] text-white text-xs font-bold rounded border border-[#785110] pixel-btn cursor-pointer"
                      >
                        {T.serveLoafBtn.replace('{name}', exName)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Station Step Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 bg-[#1a100e] border-b-2 border-[#422a1e] text-[11px] sm:text-xs font-pixel-ui">
            {(
              [
                { id: 'shelf', label: T.shelf, shortLabel: T.kitchenShort, badge: bowlIngredients.length },
                { id: 'knead', label: T.knead, shortLabel: T.kneadShort, badge: kneadingDough ? 1 : 0 },
                { id: 'rest', label: T.rest, shortLabel: T.restShort, badge: restingSlots.length },
                { id: 'shape', label: T.shape, shortLabel: T.shapeShort, badge: shapingBatch ? 1 : 0 },
                { id: 'oven', label: T.oven, shortLabel: T.ovenShort, badge: ovenSlot || readyToBakeBatch ? 1 : 0 },
                {
                  id: 'extras',
                  label: T.extrasTab,
                  shortLabel: T.extrasShort,
                  badge:
                    teaDessertTray.length +
                    (teaPrepSlot ? 1 : 0) +
                    (dessertDraftId ? 1 : 0),
                },
              ] as { id: StationTab; label: string; shortLabel: string; badge: number }[]
            ).map((tab) => {
              const active = station === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playButtonClick();
                    setStation(tab.id);
                  }}
                  className={`min-h-[46px] py-2 px-1 text-center cursor-pointer border-e border-b sm:border-b-0 border-[#2e1c16] transition-colors whitespace-nowrap truncate ${
                    active
                      ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                      : 'text-[#cbb596] hover:bg-[#2a1b16] hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 ? ` (${fmtNum(tab.badge, lang)})` : ''}
                </button>
              );
            })}
          </div>

          {/* Active Station Panel */}
          <div className="p-3.5 sm:p-5 min-h-[370px] flex flex-col justify-between">
            {/* STATION 1: INGREDIENT SHELF */}
            {station === 'shelf' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station1Title}
                  </h3>
                  <span className="text-xs text-[#cbb596] hidden sm:inline">{T.station1Sub}</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {INGREDIENTS.map((ing) => {
                    const selected = bowlIngredients.includes(ing.id);
                    const ingLabel = isFa ? FA_INGREDIENTS[ing.id]?.shortName || ing.shortName : ing.shortName;
                    return (
                      <button
                        key={ing.id}
                        onClick={() => handleAddIngredient(ing.id)}
                        className={`min-h-[54px] sm:min-h-[60px] p-1.5 sm:p-2 rounded border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all pixel-btn ${
                          selected
                            ? 'bg-[#2a4a45] border-[#52b8ad] text-white'
                            : 'bg-[#1b110f] hover:bg-[#2c1d18] border-[#4a3024] text-[#f4e8c1]'
                        }`}
                      >
                        <IngredientIcon id={ing.id} size={24} />
                        <span className="text-[11px] font-bold">{ingLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mixing Bowl Summary */}
                <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#cbb596]">
                      {T.station1Bowl} ({fmtNum(bowlIngredients.length, lang)}):
                    </span>
                    {bowlIngredients.length > 0 && (
                      <button
                        onClick={() => {
                          sound.playButtonClick();
                          setBowlIngredients([]);
                        }}
                        className="text-[#e37266] hover:underline cursor-pointer"
                      >
                        {T.station1Clear}
                      </button>
                    )}
                  </div>

                  {bowlIngredients.length === 0 ? (
                    <div className="text-xs text-[#7c614c] py-1">{T.station1Empty}</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bowlIngredients.map((id) => {
                        const ing = INGREDIENTS.find((i) => i.id === id);
                        const label = isFa
                          ? FA_INGREDIENTS[id]?.shortName || ing?.shortName
                          : ing?.shortName;
                        return (
                          <button
                            key={id}
                            onClick={() => handleAddIngredient(id)}
                            className="inline-flex items-center gap-1 bg-[#2a1b16] hover:bg-[#422a1e] border border-[#5c3a28] px-2 py-1 rounded text-xs cursor-pointer"
                            title={T.station1Clear}
                          >
                            <IngredientIcon id={id} size={14} />
                            <span>{label}</span>
                            <span className="text-[#e37266] ms-0.5">×</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleStartKneading}
                    disabled={bowlIngredients.length === 0}
                    className="w-full py-3 bg-[#d95f3b] hover:bg-[#e86d48] text-white font-pixel-ui font-bold text-xs rounded border-2 border-[#7c2e16] pixel-btn cursor-pointer"
                  >
                    {T.station1KneadBtn}
                  </button>
                </div>
              </div>
            )}

            {/* STATION 2: KNEADING BOARD */}
            {station === 'knead' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station2Title}
                  </h3>
                  <span className="text-xs text-[#cbb596]">{T.station2Sub}</span>
                </div>

                {!kneadingDough ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">{T.station2Empty}</p>
                    <button
                      onClick={() => setStation('shelf')}
                      className="px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      {T.station2GoShelf}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Dough Visual + Stats */}
                    <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-4 flex flex-col items-center gap-3">
                      {kneadingDough.intendedRecipeId && (
                        <div className="text-[11px] font-bold text-[#f5c542] bg-[#2a1b16] border border-[#5c3a28] rounded px-2.5 py-0.5">
                          {T.targetBreadLabel}{' '}
                          {isFa
                            ? FA_BREAD_NAMES[kneadingDough.intendedRecipeId]?.name ||
                              BREAD_RECIPES[kneadingDough.intendedRecipeId].name
                            : BREAD_RECIPES[kneadingDough.intendedRecipeId].name}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div
                          className="w-24 h-16 bg-[#f2e2c4] border-4 border-[#6e4c2e] rounded-full flex items-center justify-center transition-transform"
                          style={{
                            transform: `scale(${1 + Math.min(kneadingDough.targetHits, kneadingDough.hits) * 0.04})`,
                          }}
                        >
                          <span className="font-pixel-display text-[10px] text-[#5e3c23] tabular-nums">
                            {fmtNum(kneadingDough.hits, lang)}/{fmtNum(kneadingDough.targetHits, lang)}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            {T.station2Kneads}{' '}
                            <strong className="tabular-nums">
                              {fmtNum(kneadingDough.hits, lang)} / {fmtNum(kneadingDough.targetHits, lang)}
                            </strong>
                          </div>
                          <div>
                            {T.station2Quality}{' '}
                            <strong
                              className={
                                kneadQualityPreview === 'perfect'
                                  ? 'text-[#69c79b]'
                                  : kneadQualityPreview === 'over'
                                  ? 'text-[#e37266]'
                                  : 'text-[#f5c542]'
                              }
                            >
                              {kneadQualityPreview === 'perfect'
                                ? T.station2Perfect
                                : kneadQualityPreview === 'over'
                                ? T.station2Over
                                : T.station2Under}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Timing Bar */}
                      <div className="w-full space-y-1.5" dir="ltr">
                        <div className="relative w-full h-8 bg-[#2c1d18] border-2 border-[#5c3a28] rounded overflow-hidden">
                          {/* Sweet spot center */}
                          <div
                            className="absolute top-0 bottom-0 bg-[#3b8c84]/80 border-x-2 border-[#7fe3d8]"
                            style={{
                              left: `${50 - sweetSpotHalfWidth}%`,
                              width: `${sweetSpotHalfWidth * 2}%`,
                            }}
                          />
                          {/* Moving cursor */}
                          <div
                            className="absolute top-0 bottom-0 w-2 bg-[#f5c542] border border-[#140b09]"
                            style={{ left: `calc(${kneadCursor}% - 4px)` }}
                          />
                        </div>
                        <div className="text-center text-[11px] text-[#cbb596]" dir={isFa ? 'rtl' : 'ltr'}>
                          {T.station2Hint.replace('{target}', fmtNum(kneadingDough.targetHits, lang))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleKneadTap}
                        className="min-h-[52px] py-3.5 bg-[#e59f2c] hover:bg-[#f2ae3b] text-[#1c110c] font-pixel-display text-xs rounded border-2 border-[#8c5a12] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Hand className="w-4 h-4" />
                        <span>{T.station2KneadBtn}</span>
                      </button>

                      <button
                        onClick={handleFinishKneading}
                        className="min-h-[52px] py-3.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui font-bold text-xs rounded border-2 border-[#225954] pixel-btn cursor-pointer"
                      >
                        {T.station2RestBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATION 3: DOUGH REST */}
            {station === 'rest' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station3Title} ({fmtNum(restingSlots.length, lang)}/{fmtNum(maxRestSlots, lang)})
                  </h3>
                  <span className="text-xs text-[#cbb596]">{T.station3Sub}</span>
                </div>

                {restingSlots.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">{T.station3Empty}</p>
                    <button
                      onClick={() => setStation('shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      {T.station3Mix}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {restingSlots.map((slot) => {
                      const pct = Math.min(
                        100,
                        Math.round((slot.restProgress / slot.targetRestSeconds) * 100)
                      );
                      const isDone = slot.restProgress >= slot.targetRestSeconds;
                      const suggestedName = slot.suggestedRecipeId
                        ? isFa
                          ? FA_BREAD_NAMES[slot.suggestedRecipeId]?.name ||
                            BREAD_RECIPES[slot.suggestedRecipeId].name
                          : BREAD_RECIPES[slot.suggestedRecipeId].name
                        : null;

                      return (
                        <div
                          key={slot.id}
                          className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3 flex flex-col sm:flex-row items-center gap-4"
                        >
                          <SleepingDoughSprite done={isDone} />

                          <div className="flex-1 w-full space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#f4e8c1]">
                                {suggestedName
                                  ? T.doughTitle.replace('{name}', suggestedName)
                                  : T.artisanDough}
                              </span>
                              <span className="tabular-nums text-[#7cc4e0]">{fmtNum(pct, lang)}%</span>
                            </div>

                            <div className="w-full h-3 bg-[#2c1d18] border border-[#5c3a28] overflow-hidden">
                              <div
                                className={`h-full transition-all duration-150 ${
                                  isDone ? 'bg-[#5cd68d]' : 'bg-[#7cc4e0]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              {isDone ? (
                                <button
                                  onClick={() => handleSendToShape(slot, false)}
                                  className="min-h-[44px] w-full py-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-bold text-xs rounded border border-[#225954] pixel-btn cursor-pointer"
                                >
                                  {T.station3ShapeBtn}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSendToShape(slot, true)}
                                  className="min-h-[44px] w-full py-2.5 bg-[#5c3a28] hover:bg-[#704731] text-[#f4e8c1] text-xs rounded border border-[#3d261a] pixel-btn cursor-pointer"
                                >
                                  {T.station3SkipBtn}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-[11px] text-[#a88d73] text-center">{T.station3Tip}</div>
              </div>
            )}

            {/* STATION 4: SHAPING */}
            {station === 'shape' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station4Title}
                  </h3>
                  <span className="text-xs text-[#cbb596]">{T.station4Sub}</span>
                </div>

                {!shapingBatch ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">{T.station4Empty}</p>
                    <button
                      onClick={() => setStation(restingSlots.length > 0 ? 'rest' : 'shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      {restingSlots.length > 0 ? T.station4Check : T.goToShelf}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SHAPES.map((s) => {
                      const sName = isFa ? FA_SHAPES[s.id]?.name || s.name : s.name;
                      const sHint = isFa ? FA_SHAPES[s.id]?.hint || s.hint : s.hint;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handlePickShape(s.id)}
                          className="min-h-[58px] p-3 bg-[#1b110f] hover:bg-[#2c1d18] border-2 border-[#4d3023] hover:border-[#f5c542] rounded flex items-center gap-3 cursor-pointer pixel-btn text-start"
                        >
                          <div className="w-12 h-12 bg-[#2a1b16] border border-[#5c3a28] rounded flex items-center justify-center shrink-0">
                            <ShapeIcon id={s.id} size={36} />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#f4e8c1]">{sName}</div>
                            <div className="text-[11px] text-[#cbb596]">{sHint}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STATION 5: OVEN & TANDOOR */}
            {station === 'oven' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station5Title}
                  </h3>
                  <span className="text-xs text-[#cbb596]">{T.station5Sub}</span>
                </div>

                {!ovenSlot && !readyToBakeBatch && (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">{T.station5Empty}</p>
                    <button
                      onClick={() => setStation(shapingBatch ? 'shape' : 'shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      {T.station5Prep}
                    </button>
                  </div>
                )}

                {!ovenSlot && readyToBakeBatch && (
                  <div className="space-y-4">
                    <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3.5 text-xs space-y-2">
                      <div className="font-bold text-[#f4e8c1]">
                        {T.station5Ready} (
                        {isFa
                          ? FA_SHAPES[readyToBakeBatch.shape]?.name || readyToBakeBatch.shape
                          : SHAPES.find((s) => s.id === readyToBakeBatch.shape)?.name ||
                            readyToBakeBatch.shape.replace('_', ' ')}
                        )
                      </div>
                      <div className="text-[#cbb596]">{T.station5SelectOven}</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {OVENS.map((o) => {
                          const oName = isFa ? FA_OVENS[o.id]?.name || o.name : o.name;
                          const oSub = isFa ? FA_OVENS[o.id]?.subtitle || o.subtitle : o.subtitle;
                          return (
                            <button
                              key={o.id}
                              onClick={() => {
                                sound.playButtonClick();
                                setSelectedOven(o.id);
                              }}
                              className={`min-h-[56px] p-3 rounded border-2 text-start cursor-pointer transition-colors ${
                                selectedOven === o.id
                                  ? 'bg-[#3b2016] border-[#f5c542] text-white'
                                  : 'bg-[#241714] border-[#4d3023] text-[#cbb596]'
                              }`}
                            >
                              <div className="font-bold text-xs flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-[#ff8f2b]" />
                                <span>{oName}</span>
                              </div>
                              <div className="text-[11px] opacity-80 mt-0.5">{oSub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handlePutInOven}
                      className="min-h-[48px] w-full py-3.5 bg-[#d95f3b] hover:bg-[#e86d48] text-white font-pixel-display text-xs rounded border-2 border-[#7c2e16] pixel-btn cursor-pointer"
                    >
                      {T.station5PutIn} {selectedOvenLabel}!
                    </button>
                  </div>
                )}

                {ovenSlot && (
                  <div className="space-y-4">
                    <div className="bg-[#1a100e] border-2 border-[#5c3a28] rounded p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-[#ffae52] flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          {isFa
                            ? `${T.station5Baking} ${activeOvenLabel}`
                            : `${activeOvenLabel} ${T.station5Baking}`}
                        </span>
                        <span className="font-pixel-display text-[10px] text-[#f5c542]">
                          {getOvenZoneLabel()}
                        </span>
                      </div>

                      {/* Color-changing bake gauge */}
                      <div
                        className="relative w-full h-10 bg-[#2b1b17] border-2 border-[#5c3a28] rounded overflow-hidden"
                        dir="ltr"
                      >
                        {/* Sweet spot markers */}
                        <div
                          className="absolute top-0 bottom-0 border-x-2 border-dashed border-[#f5c542]/80 bg-[#f5c542]/15 pointer-events-none"
                          style={{
                            left: `${ovenMinPct}%`,
                            width: `${ovenMaxPct - ovenMinPct}%`,
                          }}
                        />
                        <div
                          className={`h-full transition-all duration-100 ${getOvenBarColor()}`}
                          style={{ width: `${ovenPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#cbb596]" dir="ltr">
                        <span>{T.rawDough}</span>
                        <span className="text-[#f5c542] font-bold text-center">
                          {T.goldenZone}
                        </span>
                        <span className="text-[#e37266]">{T.burnt}</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePullFromOven}
                      className="min-h-[54px] w-full py-4 bg-[#f5c542] hover:bg-[#ffd561] text-[#1c110c] font-pixel-display text-xs sm:text-sm rounded border-2 border-[#94680d] pixel-btn cursor-pointer"
                    >
                      {T.station5Pull}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STATION 6: INTERACTIVE BEVERAGE BAR (TEA, KARAK, COFFEE) & DESSERT WORKSHOP */}
            {station === 'extras' && (
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    {T.station6Title}
                  </h3>
                  <span className="text-[11px] text-[#cbb596]">{T.station6Sub}</span>
                </div>

                {/* Sub-tabs: Hot Beverages vs Dessert Workshop */}
                <div className="grid grid-cols-2 gap-2 bg-[#140d0b] p-1 rounded border border-[#422a1e]">
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setCafeSubTab('beverage');
                    }}
                    className={`min-h-[42px] px-3 py-1.5 rounded text-xs font-pixel-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      cafeSubTab === 'beverage'
                        ? 'bg-[#d95f3b] text-white'
                        : 'text-[#cbb596] hover:text-white'
                    }`}
                  >
                    <Coffee className="w-4 h-4" />
                    <span>{T.bevTabLabel}</span>
                  </button>
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setCafeSubTab('dessert');
                    }}
                    className={`min-h-[42px] px-3 py-1.5 rounded text-xs font-pixel-ui font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      cafeSubTab === 'dessert'
                        ? 'bg-[#e59f2c] text-[#1c110c]'
                        : 'text-[#cbb596] hover:text-white'
                    }`}
                  >
                    <Candy className="w-4 h-4" />
                    <span>{T.dessertTabLabel}</span>
                  </button>
                </div>

                {/* CAFE TAB 1: DEDICATED BEVERAGE STATION (Mix -> Active Heating Timer + Flame Control -> Pour) */}
                {cafeSubTab === 'beverage' && (
                  <BeverageStation
                    teaPrepSlot={teaPrepSlot}
                    bevPotIngredients={bevPotIngredients}
                    matchedBeverageId={matchedBeverageId}
                    currentDay={saveData.day}
                    orderedExtraIds={
                      new Set(
                        (activeTicket?.extras || [])
                          .filter((e) => e.servedQty < e.qty)
                          .map((e) => e.extraId)
                      )
                    }
                    lang={lang}
                    onToggleIngredient={handleToggleBevIngredient}
                    onClearPot={() => setBevPotIngredients([])}
                    onStartBrew={handleStartBeverageBrew}
                    onToggleFlame={handleToggleBeverageFlame}
                    onStir={handleStirBeverage}
                    onPour={handleCollectExtraPrep}
                    onDumpOverboiled={handleDumpOverboiledBeverage}
                  />
                )}

                {/* CAFE TAB 2: INTERACTIVE DESSERT WORKSHOP (Pick Dessert -> Add 2 Toppings -> 3 Finishing Taps) */}
                {cafeSubTab === 'dessert' && (
                  <div className="space-y-3">
                    {dessertDraftId ? (
                      (() => {
                        const def = EXTRA_ITEMS[dessertDraftId];
                        const name = isFa ? FA_EXTRAS[dessertDraftId]?.name || def.name : def.name;
                        const allGarnished = def.ingredients.every((g) =>
                          dessertAddedGarnishes.includes(g)
                        );
                        return (
                          <div className="bg-[#1a100e] border-2 border-[#e59f2c] rounded p-3.5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <ExtraItemSprite id={dessertDraftId} size={40} />
                                <div className="font-bold text-xs text-[#fbf3de]">{name}</div>
                              </div>
                              <button
                                onClick={() => setDessertDraftId(null)}
                                className="text-[11px] text-[#e37266] hover:underline cursor-pointer"
                              >
                                {T.bevClearPot}
                              </button>
                            </div>

                            <div className="text-[11px] text-[#cbb596]">
                              {T.dessertGarnishPrompt.replace('{name}', name)}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {EXTRA_INGREDIENTS.filter((i) => i.forCategory === 'dessert').map(
                                (ing) => {
                                  const added = dessertAddedGarnishes.includes(ing.id);
                                  const needed = def.ingredients.includes(ing.id);
                                  const label = isFa
                                    ? FA_EXTRA_INGREDIENTS[ing.id]?.shortName || ing.shortName
                                    : ing.shortName;
                                  return (
                                    <button
                                      key={ing.id}
                                      onClick={() => needed && handleAddDessertGarnish(ing.id)}
                                      disabled={!needed || added}
                                      className={`min-h-[52px] p-2 rounded border-2 flex flex-col items-center justify-center gap-1 pixel-btn ${
                                        added
                                          ? 'bg-[#1e3d36] border-[#4ca88e] text-[#a7f3d0]'
                                          : needed
                                          ? 'bg-[#2b2012] hover:bg-[#3b2c19] border-[#f5c542] text-white cursor-pointer'
                                          : 'bg-[#150d0b] border-[#2e1c16] text-[#6b5442] opacity-50 cursor-not-allowed'
                                      }`}
                                    >
                                      <ExtraIngredientIcon id={ing.id} size={18} />
                                      <span className="text-[10px] font-bold">{label}</span>
                                    </button>
                                  );
                                }
                              )}
                            </div>

                            <button
                              onClick={handleDessertPlateTap}
                              disabled={!allGarnished}
                              className={`min-h-[48px] w-full py-2.5 px-4 font-pixel-ui font-bold text-xs rounded border-2 pixel-btn ${
                                allGarnished
                                  ? 'bg-[#3b8c84] hover:bg-[#46a39a] border-[#225954] text-white cursor-pointer'
                                  : 'bg-[#2c1d18] border-[#422a1e] text-[#7c614c] cursor-not-allowed'
                              }`}
                            >
                              {T.dessertFinishTap
                                .replace('{done}', fmtNum(dessertTapCount, lang))
                                .replace('{total}', fmtNum(3, lang))}
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2.5">
                        <div className="text-[11px] text-[#cbb596]">{T.dessertShelfPrompt}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {EXTRA_ORDER.filter((id) => EXTRA_ITEMS[id].category === 'dessert').map(
                            (id) => {
                              const def = EXTRA_ITEMS[id];
                              const unlocked = saveData.day >= def.unlockDay;
                              const orderedNow = Boolean(
                                activeTicket?.extras?.some(
                                  (e) => e.extraId === id && e.servedQty < e.qty
                                )
                              );
                              const name = isFa ? FA_EXTRAS[id]?.name || def.name : def.name;
                              return (
                                <div
                                  key={id}
                                  className={`p-2.5 rounded border-2 flex items-center justify-between gap-2 ${
                                    orderedNow
                                      ? 'bg-[#2b2012] border-[#f5c542]'
                                      : unlocked
                                      ? 'bg-[#1a100e] border-[#422a1e]'
                                      : 'bg-[#150d0b] border-[#2e1c16] opacity-65'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ExtraItemSprite id={id} size={34} />
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-[#f4e8c1] truncate">
                                        {name}
                                      </div>
                                      <div className="text-[11px] text-[#d4a373] tabular-nums">
                                        {fmtNum(def.price, lang)}
                                        {T.coinSuffix}
                                      </div>
                                    </div>
                                  </div>
                                  {unlocked ? (
                                    <button
                                      onClick={() => handlePickDessertBase(id)}
                                      className="min-h-[38px] px-3 py-1.5 bg-[#e59f2c] hover:bg-[#f2ae3b] border border-[#8c5a12] text-[#1c110c] text-xs font-bold rounded shrink-0 pixel-btn cursor-pointer"
                                    >
                                      {T.plateBtn}
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-[#a88d73] shrink-0">
                                      {T.lockedExtraDay.replace('{day}', fmtNum(def.unlockDay, lang))}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pause Overlay Modal */}
      {phase === 'PAUSED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80">
          <div className="bg-[#251815] border-4 border-[#5c3a28] rounded-md max-w-sm w-full p-5 pixel-box text-center space-y-4">
            <h2 className="font-pixel-display text-base text-[#f5c542]">{T.shiftPaused}</h2>
            <p className="font-pixel-ticket text-xl text-[#e2cfa9]">
              {T.pausedDescFull
                .replace('{name}', saveData.bakerLook.name || T.bakerDefaultName)
                .replace('{day}', fmtNum(saveData.day, lang))}
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setPhase('PLAYING')}
                className="min-h-[44px] w-full py-3 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border border-[#225954] pixel-btn cursor-pointer"
              >
                {T.resumeShift}
              </button>
              <button
                onClick={() => {
                  sound.stopMusic();
                  setPhase('LOBBY');
                }}
                className="min-h-[44px] w-full py-2.5 bg-[#6e2424] hover:bg-[#8a2e2e] text-white font-pixel-ui text-xs rounded border border-[#451313] pixel-btn cursor-pointer"
              >
                {T.backToLobby}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRecipes && (
        <RecipeBookModal
          currentDay={saveData.day}
          reputation={saveData.reputation}
          unlockedRareBreads={saveData.unlockedRareBreads}
          lang={lang}
          onClose={() => setShowRecipes(false)}
        />
      )}
      {showShopModal && (
        <ShopModal
          summary={daySummary}
          saveData={saveData}
          lang={lang}
          onBuyUpgrade={handleBuyUpgrade}
          onStartNextDay={() => startDayShift(saveData.day)}
          onRetryDay={() => startDayShift(saveData.day)}
        />
      )}
      {showBakerCustomize && (
        <BakerCustomizeModal
          look={saveData.bakerLook}
          lang={lang}
          onChange={(nextLook) => setSaveData((prev) => ({ ...prev, bakerLook: nextLook }))}
          onClose={() => {
            setSaveData((prev) => ({
              ...prev,
              bakerLook: {
                ...prev.bakerLook,
                name: prev.bakerLook.name.trim() || T.bakerDefaultName,
              },
            }));
            setShowBakerCustomize(false);
          }}
        />
      )}
    </div>
  );
};
