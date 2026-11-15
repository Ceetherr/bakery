/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BREAD_ORDER,
  BREAD_RECIPES,
  EXTRA_INGREDIENTS,
  EXTRA_ITEMS,
  EXTRA_ORDER,
  INGREDIENTS,
  OVENS,
  SHAPES,
} from '../data';
import { BreadId } from '../types';
import { BreadSprite, ExtraIngredientIcon, ExtraItemSprite, IngredientIcon, ShapeIcon } from '../PixelArt';
import { X, BookOpen, Lock, Star, Coffee, Croissant } from 'lucide-react';
import {
  FA_BREAD_NAMES,
  FA_EXTRA_INGREDIENTS,
  FA_EXTRAS,
  FA_INGREDIENTS,
  FA_OVENS,
  FA_SHAPES,
  Language,
  RECIPE_BOOK_TEXT,
  fmtNum,
} from '../i18n';

interface RecipeBookModalProps {
  currentDay: number;
  reputation?: number;
  unlockedRareBreads?: BreadId[];
  lang?: Language;
  onClose: () => void;
}

export const RecipeBookModal: React.FC<RecipeBookModalProps> = ({
  currentDay,
  reputation = 0,
  unlockedRareBreads = [],
  lang = 'en',
  onClose,
}) => {
  const [tab, setTab] = useState<'breads' | 'extras'>('breads');
  const ingMap = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
  const shapeMap = Object.fromEntries(SHAPES.map((s) => [s.id, s]));
  const ovenMap = Object.fromEntries(OVENS.map((o) => [o.id, o]));

  const isFa = lang === 'fa';
  const T = RECIPE_BOOK_TEXT[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-[#251815] border-4 border-[#5c3a28] rounded-md max-w-3xl w-full max-h-[90vh] flex flex-col pixel-box text-[#f4e8c1] ${
          isFa ? 'font-vazir text-right rtl' : ''
        }`}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b-2 border-[#422a1e] bg-[#1c120f]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#f5c542]" />
            <h2 className="font-pixel-display text-xs sm:text-sm text-[#f5c542]">{T.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] p-2 bg-[#3a241b] hover:bg-[#4e3125] border border-[#6e4635] rounded text-[#f4e8c1] flex items-center justify-center cursor-pointer"
            aria-label={T.backBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Switch Tabs */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a100e] border-b border-[#3d261c]">
          <button
            onClick={() => setTab('breads')}
            className={`px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'breads'
                ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                : 'bg-[#261815] text-[#cbb596] hover:text-white'
            }`}
          >
            <Croissant className="w-3.5 h-3.5" />
            <span>{T.breadsTab.replace('{count}', fmtNum(BREAD_ORDER.length, lang))}</span>
          </button>
          <button
            onClick={() => setTab('extras')}
            className={`px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'extras'
                ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                : 'bg-[#261815] text-[#cbb596] hover:text-white'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{T.extrasTab.replace('{count}', fmtNum(EXTRA_ORDER.length, lang))}</span>
          </button>
        </div>

        {/* Content Grid */}
        <div className="p-3.5 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {tab === 'breads' &&
            BREAD_ORDER.map((id) => {
              const recipe = BREAD_RECIPES[id];
              const isRare = recipe.unlockReputation !== undefined;
              const isUnlocked = isRare
                ? reputation >= (recipe.unlockReputation || 5) || unlockedRareBreads.includes(id)
                : recipe.unlockDay <= currentDay;

              const localizedName = isFa ? FA_BREAD_NAMES[id]?.name || recipe.name : recipe.name;
              const localizedDesc = isFa
                ? FA_BREAD_NAMES[id]?.description || recipe.description
                : recipe.description;
              const diffLabel = isFa
                ? FA_BREAD_NAMES[id]?.difficulty || recipe.difficulty
                : recipe.difficulty;

              if (!isUnlocked) {
                return (
                  <div
                    key={id}
                    className="bg-[#1b110f] border-2 border-[#36221a] rounded p-3.5 flex items-center gap-3.5 opacity-75"
                  >
                    <div className="w-14 h-14 bg-[#140c0a] border border-[#36221a] rounded flex items-center justify-center shrink-0">
                      {isRare ? (
                        <Star className="w-6 h-6 text-[#f5c542]/70" />
                      ) : (
                        <Lock className="w-6 h-6 text-[#8a6d56]" />
                      )}
                    </div>
                    <div>
                      <div className="font-pixel-display text-[11px] text-[#cbb596]">
                        {isRare ? T.rareRecipe.replace('{diff}', diffLabel) : T.locked}
                      </div>
                      <p className="text-xs text-[#a88d73] mt-1">
                        {isRare
                          ? T.unlocksAtRep.replace(
                              '{rep}',
                              fmtNum((recipe.unlockReputation || 5).toFixed(1), lang)
                            )
                          : T.unlocksDay.replace('{day}', fmtNum(recipe.unlockDay, lang))}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={id}
                  className={`bg-[#1c120f] border-2 rounded p-3.5 flex flex-col gap-2.5 ${
                    isRare ? 'border-[#a87a24]' : 'border-[#4d3023]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-[#2c1d18] border border-[#5c3a28] rounded flex items-center justify-center shrink-0">
                      <BreadSprite breadId={id} size={48} outcome="perfect" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-pixel-display text-xs text-[#f5c542] truncate">
                          {localizedName}
                        </h3>
                        <span className="text-[11px] text-[#d6b995] shrink-0 tabular-nums">
                          {isRare ? T.rarePrefix : ''}
                          {isFa ? FA_BREAD_NAMES[id]?.origin || recipe.origin : recipe.origin} ·{' '}
                          {fmtNum(recipe.price, lang)}
                          {T.coinSuffix}
                        </span>
                      </div>
                      <p
                        className={`font-pixel-ticket text-base leading-snug text-[#d9c8ac] mt-1 ${
                          isFa ? 'font-sans' : ''
                        }`}
                      >
                        {localizedDesc}
                      </p>
                    </div>
                  </div>

                  {/* Ingredients row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#332018]">
                    {recipe.ingredients.map((ingId) => {
                      const ingName = isFa
                        ? FA_INGREDIENTS[ingId]?.shortName || ingMap[ingId]?.shortName
                        : ingMap[ingId]?.shortName;
                      return (
                        <div
                          key={ingId}
                          className="inline-flex items-center gap-1 bg-[#2a1b16] border border-[#4a3024] px-2 py-0.5 rounded text-[11px] text-[#f4e8c1]"
                        >
                          <IngredientIcon id={ingId} size={15} />
                          <span>{ingName}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shape, Oven, Knead Target & Rest Time */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 text-[11px] text-[#ccb596]">
                    <div className="bg-[#231613] px-2 py-1 rounded flex items-center gap-1.5">
                      <ShapeIcon id={recipe.shape} size={18} />
                      <span className="truncate">
                        {isFa
                          ? FA_SHAPES[recipe.shape]?.name || shapeMap[recipe.shape]?.name
                          : shapeMap[recipe.shape]?.name}
                      </span>
                    </div>
                    <div className="bg-[#231613] px-2 py-1 rounded flex items-center justify-center text-center">
                      <span className="truncate">
                        {isFa
                          ? FA_OVENS[recipe.oven]?.name || ovenMap[recipe.oven]?.name
                          : ovenMap[recipe.oven]?.name.replace('Stone ', '').replace(' Deck', '')}
                      </span>
                    </div>
                    <div className="bg-[#231613] px-2 py-1 rounded flex items-center justify-center text-center tabular-nums">
                      <span>{T.kneadTimes.replace('{count}', fmtNum(recipe.kneadTarget, lang))}</span>
                    </div>
                    <div className="bg-[#231613] px-2 py-1 rounded flex items-center justify-center text-center tabular-nums">
                      <span>{T.restSec.replace('{sec}', fmtNum(recipe.restSeconds, lang))}</span>
                    </div>
                  </div>
                </div>
              );
            })}

          {tab === 'extras' &&
            EXTRA_ORDER.map((id) => {
              const item = EXTRA_ITEMS[id];
              const isUnlocked = item.unlockDay <= currentDay;
              const localizedName = isFa ? FA_EXTRAS[id]?.name || item.name : item.name;
              const localizedDesc = isFa
                ? FA_EXTRAS[id]?.description || item.description
                : item.description;

              if (!isUnlocked) {
                return (
                  <div
                    key={id}
                    className="bg-[#1b110f] border-2 border-[#36221a] rounded p-3.5 flex items-center gap-3.5 opacity-75"
                  >
                    <div className="w-14 h-14 bg-[#140c0a] border border-[#36221a] rounded flex items-center justify-center shrink-0">
                      <Lock className="w-6 h-6 text-[#8a6d56]" />
                    </div>
                    <div>
                      <div className="font-pixel-display text-[11px] text-[#cbb596]">{T.locked}</div>
                      <p className="text-xs text-[#a88d73] mt-1">
                        {T.unlocksDay.replace('{day}', fmtNum(item.unlockDay, lang))}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={id}
                  className="bg-[#1c120f] border-2 border-[#4d3023] rounded p-3.5 flex flex-col gap-2.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-[#2c1d18] border border-[#5c3a28] rounded flex items-center justify-center shrink-0">
                      <ExtraItemSprite id={id} size={44} showSteam={item.category === 'beverage'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-pixel-display text-xs text-[#f5c542] truncate">
                          {localizedName}
                        </h3>
                        <span className="text-[11px] text-[#d6b995] shrink-0 tabular-nums">
                          {fmtNum(item.price, lang)}
                          {T.coinSuffix}
                        </span>
                      </div>
                      <p
                        className={`font-pixel-ticket text-base leading-snug text-[#d9c8ac] mt-1 ${
                          isFa ? 'font-sans' : ''
                        }`}
                      >
                        {localizedDesc}
                      </p>
                    </div>
                  </div>

                  {/* Crafting ingredients row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#332018]">
                    {item.ingredients.map((ingId) => {
                      const ingName = isFa
                        ? FA_EXTRA_INGREDIENTS[ingId]?.shortName || ingId
                        : EXTRA_INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId;
                      return (
                        <div
                          key={ingId}
                          className="inline-flex items-center gap-1 bg-[#2a1b16] border border-[#4a3024] px-2 py-0.5 rounded text-[11px] text-[#f4e8c1]"
                        >
                          <ExtraIngredientIcon id={ingId} size={15} />
                          <span>{ingName}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-[#332018] text-[11px] text-[#ccb596]">
                    <div className="bg-[#231613] px-2 py-1 rounded text-center">
                      {item.subKind === 'coffee'
                        ? T.coffeeLabel
                        : item.category === 'beverage'
                        ? T.teaLabel
                        : T.dessertLabel}
                    </div>
                    <div className="bg-[#231613] px-2 py-1 rounded text-center tabular-nums">
                      {T.prepSec.replace('{sec}', fmtNum(item.prepSeconds, lang))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t-2 border-[#422a1e] bg-[#1c120f] flex flex-wrap items-center justify-between gap-2 text-xs text-[#bba182]">
          <span className="hidden sm:inline">{T.tip}</span>
          <button
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto px-5 py-2 bg-[#d95f3b] hover:bg-[#e56d49] text-white font-pixel-ui text-xs rounded border border-[#7c2e16] pixel-btn cursor-pointer"
          >
            {T.backBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
