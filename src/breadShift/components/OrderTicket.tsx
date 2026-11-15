/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BREAD_RECIPES,
  EXTRA_INGREDIENTS,
  EXTRA_ITEMS,
  INGREDIENTS,
  MODIFIER_LABELS,
  OVENS,
  SHAPES,
} from '../data';
import { ExtraItemSprite, ExtraIngredientIcon, IngredientIcon, ShapeIcon } from '../PixelArt';
import { IngredientId, OrderTicket as OrderTicketType } from '../types';
import {
  FA_BREAD_NAMES,
  FA_CUSTOMER_NAMES,
  FA_EXTRA_INGREDIENTS,
  FA_EXTRAS,
  FA_INGREDIENTS,
  FA_LOGIC_TEXT,
  FA_MODIFIERS,
  FA_OVENS,
  FA_SHAPES,
  Language,
  ORDER_TICKET_TEXT,
  UI_TEXT,
  fmtNum,
} from '../i18n';
import { Check, Flame, Hand, Wind } from 'lucide-react';

interface OrderTicketProps {
  ticket: OrderTicketType;
  bakerName?: string;
  dailySpecialMultiplier?: number;
  lang?: Language;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  ticket,
  bakerName,
  dailySpecialMultiplier = 2,
  lang = 'en',
}) => {
  const isFa = lang === 'fa';
  const T = ORDER_TICKET_TEXT[lang];
  const U = UI_TEXT[lang];
  const patiencePct = Math.max(0, Math.min(100, (ticket.patienceLeft / ticket.patienceMax) * 100));
  const patienceStateLabel =
    patiencePct > 55
      ? T.patienceCalm
      : patiencePct > 25
      ? T.patienceHurry
      : T.patienceCritical;
  const patienceBarColor =
    patiencePct > 55 ? 'bg-[#3b8c84]' : patiencePct > 25 ? 'bg-[#e59f2c]' : 'bg-[#c93b3b]';

  const customerName = isFa
    ? FA_CUSTOMER_NAMES[ticket.customer.id]?.name || ticket.customer.name
    : ticket.customer.name;

  return (
    <div
      className={`relative paper-ticket text-[#2b1d12] rounded-sm p-3.5 sm:p-4 border-2 border-[#c7ae82] lg:-rotate-[0.6deg] transition-transform ${
        isFa ? 'font-vazir text-right rtl' : ''
      }`}
      dir={isFa ? 'rtl' : 'ltr'}
    >
      {/* Masking tape pin at top */}
      <div className="hidden sm:block absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#e8d59e]/85 border border-[#b89f63] rotate-1" />

      {/* Receipt Header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#bfa57a] pb-1.5 mb-2">
        <span className="font-pixel-display text-[10px] text-[#5e3c23]">
          {T.ticketLabel}
          {fmtNum(String(ticket.ticketNumber).padStart(2, '0'), lang)}
        </span>
        <span className="font-pixel-ticket text-base text-[#7a583b]">
          {customerName}
        </span>
      </div>

      {/* Patience Gauge (Non-hue + bar + label) */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[10px] font-pixel-ui text-[#5e3c23] mb-1">
          <span>{T.patienceLabel.replace('{state}', patienceStateLabel)}</span>
          <span className="tabular-nums">
            {fmtNum(Math.ceil(ticket.patienceLeft), lang)}
            {T.secSuffix}
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#dfd0b1] border border-[#9d8159] overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${patienceBarColor}`}
            style={{ width: `${patiencePct}%` }}
          />
        </div>
      </div>

      {/* Order Lines */}
      <div className="space-y-2.5 font-pixel-ticket text-[21px] leading-tight">
        {ticket.items.map((line) => {
          const recipe = BREAD_RECIPES[line.breadId];
          const isDone = line.servedQty >= line.qty;
          const breadName = isFa
            ? FA_BREAD_NAMES[line.breadId]?.name || recipe.name
            : recipe.name;

          const L = FA_LOGIC_TEXT[lang];
          const crossedOutDisplay = line.crossedOutBreadId
            ? `${fmtNum(1, lang)}× ${
                isFa
                  ? FA_BREAD_NAMES[line.crossedOutBreadId]?.name ||
                    BREAD_RECIPES[line.crossedOutBreadId].name
                  : BREAD_RECIPES[line.crossedOutBreadId].name
              }`
            : line.crossedOutText
            ? fmtNum(line.crossedOutText, lang)
            : undefined;
          const marginDisplay = line.marginModifier
            ? line.marginModifier === 'no_salt'
              ? L.marginNoSalt
              : line.marginModifier === 'extra_sesame'
              ? L.marginExtraSesame
              : line.marginModifier === 'add_nigella'
              ? L.marginAddNigella
              : L.marginWellDone
            : line.marginNote;

          return (
            <div key={line.uid} className="relative border-b border-dotted border-[#d2be96] pb-2 last:border-b-0 last:pb-0">
              {/* Optional crossed-out mistake on ticket */}
              {crossedOutDisplay && (
                <div className="text-[17px] text-[#8f7458] line-through decoration-2 decoration-[#b33939]/75 -rotate-1 mb-0.5">
                  {crossedOutDisplay} {T.noWait}
                </div>
              )}

              {/* Actual requested bread & qty */}
              <div className="flex items-center justify-between gap-2">
                <div className={`font-bold ${isDone ? 'line-through text-[#6b705c]' : 'text-[#24160d]'}`}>
                  {fmtNum(line.qty, lang)}× {breadName}
                </div>
                <div className="font-pixel-ui text-[10px] tabular-nums shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-0.5 text-[#2d7a47] font-bold">
                      <Check className="w-3.5 h-3.5" /> {T.done}
                    </span>
                  ) : (
                    <span className="text-[#7a583b]">
                      {fmtNum(line.servedQty, lang)}/{fmtNum(line.qty, lang)}
                    </span>
                  )}
                </div>
              </div>

              {/* Daily Special Stamp */}
              {line.isDailySpecial && !isDone && (
                <div className="mt-0.5 text-[15px] font-bold text-[#9c5700] tracking-wide">
                  {T.dailySpecialBanner.replace('{mult}', fmtNum(dailySpecialMultiplier, lang))}
                </div>
              )}

              {/* Tricky Modifier Note */}
              {line.modifier !== 'none' && (
                <div className="mt-0.5 ps-2 text-[17px] text-[#a62929] font-bold tracking-wide">
                  * {isFa ? FA_MODIFIERS[line.modifier] || line.modifier : MODIFIER_LABELS[line.modifier]}
                </div>
              )}

              {/* Side margin scribbled correction */}
              {marginDisplay && (
                <div className={`mt-0.5 text-[15px] text-[#28548a] italic -rotate-1 ${isFa ? 'text-left' : 'text-right'}`}>
                  [{marginDisplay}]
                </div>
              )}

              {/* Compact Visual Recipe Guide right inside Order Ticket */}
              {!isDone && (
                <div className="mt-1.5 pt-1.5 border-t border-dotted border-[#d2be96]/70 space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-pixel-ui text-[9px] text-[#7a583b] font-bold me-0.5">
                      {T.recipeHintLabel}
                    </span>
                    {(() => {
                      const list: IngredientId[] = [...recipe.ingredients];
                      if (line.modifier === 'add_nigella' && !list.includes('nigella')) {
                        list.push('nigella');
                      }
                      if (line.modifier === 'extra_sesame' && !list.includes('sesame')) {
                        list.push('sesame');
                      }
                      return list.map((ingId) => {
                        const isSkippedSalt = ingId === 'salt' && line.modifier === 'no_salt';
                        const isHighlighted =
                          (ingId === 'sesame' && line.modifier === 'extra_sesame') ||
                          (ingId === 'nigella' && line.modifier === 'add_nigella');
                        const ingLabel = isFa
                          ? FA_INGREDIENTS[ingId]?.shortName || ingId
                          : INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId;
                        return (
                          <span
                            key={ingId}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-sans font-bold ${
                              isSkippedSalt
                                ? 'bg-[#ebd5cc] border-[#c47a74] text-[#9b3430] line-through opacity-75'
                                : isHighlighted
                                ? 'bg-[#faecc7] border-[#c98718] text-[#704106]'
                                : 'bg-[#efe2c4] border-[#c9b186] text-[#472d18]'
                            }`}
                          >
                            <IngredientIcon id={ingId} size={12} />
                            <span>{ingLabel}</span>
                          </span>
                        );
                      });
                    })()}
                  </div>

                  {/* Action Pipeline Badges with Icons & Tooltips: Knead -> Proof -> Shape -> Heat */}
                  <div className="flex flex-wrap items-center gap-1 font-sans text-[10px] text-[#5e3c23] font-bold">
                    {(() => {
                      const shapeLabel = isFa
                        ? FA_SHAPES[recipe.shape]?.name || recipe.shape
                        : SHAPES.find((s) => s.id === recipe.shape)?.name || recipe.shape;
                      const ovenLabel = isFa
                        ? FA_OVENS[recipe.oven]?.name || recipe.oven
                        : OVENS.find((o) => o.id === recipe.oven)?.name || recipe.oven;
                      return (
                        <>
                          <span
                            title={U.tipKnead.replace('{count}', fmtNum(recipe.kneadTarget, lang))}
                            className="inline-flex items-center gap-1 bg-[#e8d9b5] px-1.5 py-0.5 rounded border border-[#cbb487] tabular-nums"
                          >
                            <Hand className="w-3 h-3 text-[#9c5700]" />
                            <span>{U.actionKnead.replace('{count}', fmtNum(recipe.kneadTarget, lang))}</span>
                          </span>
                          <span
                            title={U.tipProof.replace('{sec}', fmtNum(recipe.restSeconds, lang))}
                            className="inline-flex items-center gap-1 bg-[#e8d9b5] px-1.5 py-0.5 rounded border border-[#cbb487] tabular-nums"
                          >
                            <Wind className="w-3 h-3 text-[#2d6a7a]" />
                            <span>{U.actionProof.replace('{sec}', fmtNum(recipe.restSeconds, lang))}</span>
                          </span>
                          <span
                            title={U.tipShape.replace('{shape}', shapeLabel)}
                            className="inline-flex items-center gap-1 bg-[#e8d9b5] px-1.5 py-0.5 rounded border border-[#cbb487]"
                          >
                            <ShapeIcon id={recipe.shape} size={13} />
                            <span>{shapeLabel}</span>
                          </span>
                          <span
                            title={U.tipHeat.replace('{oven}', ovenLabel)}
                            className="inline-flex items-center gap-1 bg-[#e8d9b5] px-1.5 py-0.5 rounded border border-[#cbb487] tabular-nums"
                          >
                            <Flame className="w-3 h-3 text-[#b84c14]" />
                            <span>
                              {U.actionHeat.replace('{sec}', fmtNum(recipe.bakeMinSeconds, lang))} · {ovenLabel}
                            </span>
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Companion Beverage & Dessert Lines */}
        {ticket.extras && ticket.extras.length > 0 && (
          <div className="pt-2 border-t-2 border-dashed border-[#bfa57a] space-y-1.5">
            <div className="font-pixel-ui text-[10px] text-[#7a4b26] font-bold">
              {T.extrasHeading}
            </div>
            {ticket.extras.map((ex) => {
              const def = EXTRA_ITEMS[ex.extraId];
              const isDone = ex.servedQty >= ex.qty;
              const exName = isFa ? FA_EXTRAS[ex.extraId]?.name || def.name : def.name;
              return (
                <div key={ex.uid} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[19px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ExtraItemSprite id={ex.extraId} size={24} showSteam={false} />
                      <span className={`font-bold truncate ${isDone ? 'line-through text-[#6b705c]' : 'text-[#5b2c1a]'}`}>
                        {fmtNum(ex.qty, lang)}× {exName}
                      </span>
                    </div>
                    <div className="font-pixel-ui text-[10px] tabular-nums shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-0.5 text-[#2d7a47] font-bold">
                          <Check className="w-3.5 h-3.5" /> {T.done}
                        </span>
                      ) : (
                        <span className="text-[#7a583b]">
                          {fmtNum(ex.servedQty, lang)}/{fmtNum(ex.qty, lang)}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isDone && (
                    <div className="flex flex-wrap items-center gap-1 ps-1">
                      {def.ingredients.map((ingId) => {
                        const label = isFa
                          ? FA_EXTRA_INGREDIENTS[ingId]?.shortName || ingId
                          : EXTRA_INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId;
                        return (
                          <span
                            key={ingId}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#efe2c4] border border-[#c9b186] text-[10px] font-sans font-bold text-[#472d18]"
                          >
                            <ExtraIngredientIcon id={ingId} size={12} />
                            <span>{label}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Jagged receipt bottom visual */}
      <div className="mt-2 pt-1 border-t border-dashed border-[#bfa57a] flex justify-between font-pixel-ticket text-sm text-[#8a6d4b]">
        <span>{T.brandFooter}</span>
        <span>
          {bakerName ? T.bakerPrefix.replace('{name}', bakerName) : T.serveHot}
        </span>
      </div>
    </div>
  );
};
