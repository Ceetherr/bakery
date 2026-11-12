/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BREAD_ORDER, BREAD_RECIPES, INGREDIENTS, OVENS, SHAPES } from '../data';
import { BreadId } from '../types';
import { BreadSprite, IngredientIcon, ShapeIcon } from '../PixelArt';
import { X, BookOpen, Lock, Star } from 'lucide-react';

interface RecipeBookModalProps {
  currentDay: number;
  reputation?: number;
  unlockedRareBreads?: BreadId[];
  onClose: () => void;
}

export const RecipeBookModal: React.FC<RecipeBookModalProps> = ({
  currentDay,
  reputation = 0,
  unlockedRareBreads = [],
  onClose,
}) => {
  const ingMap = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
  const shapeMap = Object.fromEntries(SHAPES.map((s) => [s.id, s]));
  const ovenMap = Object.fromEntries(OVENS.map((o) => [o.id, o]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#251815] border-4 border-[#5c3a28] rounded-md max-w-3xl w-full max-h-[90vh] flex flex-col pixel-box text-[#f4e8c1]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b-2 border-[#422a1e] bg-[#1c120f]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#f5c542]" />
            <h2 className="font-pixel-display text-xs sm:text-sm text-[#f5c542]">
              BAKERY RECIPE BOOK
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] p-2 bg-[#3a241b] hover:bg-[#4e3125] border border-[#6e4635] rounded text-[#f4e8c1] flex items-center justify-center cursor-pointer"
            aria-label="Close Recipe Book"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipe Grid */}
        <div className="p-3.5 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {BREAD_ORDER.map((id) => {
            const recipe = BREAD_RECIPES[id];
            const isRare = recipe.unlockReputation !== undefined;
            const isUnlocked = isRare
              ? reputation >= (recipe.unlockReputation || 5) || unlockedRareBreads.includes(id)
              : recipe.unlockDay <= currentDay;

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
                      {isRare ? `Rare Recipe (${recipe.difficulty})` : '??? (Locked)'}
                    </div>
                    <p className="text-xs text-[#a88d73] mt-1">
                      {isRare
                        ? `Unlocks at ${recipe.unlockReputation?.toFixed(1)}★ Bakery Reputation!`
                        : `Unlocks automatically on Day ${recipe.unlockDay}.`}
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
                        {recipe.name}
                      </h3>
                      <span className="text-[11px] text-[#d6b995] shrink-0">
                        {isRare ? 'Rare · ' : ''}
                        {recipe.origin} · {recipe.price}c
                      </span>
                    </div>
                    <p className="font-pixel-ticket text-base leading-snug text-[#d9c8ac] mt-1">
                      {recipe.description}
                    </p>
                  </div>
                </div>

                {/* Ingredients row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#332018]">
                  {recipe.ingredients.map((ingId) => (
                    <div
                      key={ingId}
                      className="inline-flex items-center gap-1 bg-[#2a1b16] border border-[#4a3024] px-2 py-0.5 rounded text-[11px] text-[#f4e8c1]"
                    >
                      <IngredientIcon id={ingId} size={15} />
                      <span>{ingMap[ingId]?.shortName}</span>
                    </div>
                  ))}
                </div>

                {/* Rest, Shape, Oven & Bake Time */}
                <div className="grid grid-cols-3 gap-2 pt-1.5 text-[11px] text-[#ccb596]">
                  <div className="bg-[#231613] px-2 py-1 rounded flex items-center gap-1.5">
                    <ShapeIcon id={recipe.shape} size={18} />
                    <span className="truncate">{shapeMap[recipe.shape]?.name}</span>
                  </div>
                  <div className="bg-[#231613] px-2 py-1 rounded flex items-center justify-center text-center">
                    <span>{ovenMap[recipe.oven]?.name.replace('Stone ', '').replace(' Deck', '')}</span>
                  </div>
                  <div className="bg-[#231613] px-2 py-1 rounded flex items-center justify-center text-center tabular-nums">
                    <span>Rest {recipe.restSeconds}s</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t-2 border-[#422a1e] bg-[#1c120f] flex flex-wrap items-center justify-between gap-2 text-xs text-[#bba182]">
          <span className="hidden sm:inline">
            Tip: Always double-check ticket modifiers like &quot;NO SALT&quot; or &quot;EXTRA SESAME&quot;!
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto px-5 py-2 bg-[#d95f3b] hover:bg-[#e56d49] text-white font-pixel-ui text-xs rounded border border-[#7c2e16] pixel-btn cursor-pointer"
          >
            Back to Counter
          </button>
        </div>
      </div>
    </div>
  );
};
