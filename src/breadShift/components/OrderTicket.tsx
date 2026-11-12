/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BREAD_RECIPES, MODIFIER_LABELS } from '../data';
import { OrderTicket as OrderTicketType } from '../types';
import { Check } from 'lucide-react';

interface OrderTicketProps {
  ticket: OrderTicketType;
  bakerName?: string;
  dailySpecialMultiplier?: number;
}

export const OrderTicket: React.FC<OrderTicketProps> = ({
  ticket,
  bakerName,
  dailySpecialMultiplier = 2,
}) => {
  const patiencePct = Math.max(0, Math.min(100, (ticket.patienceLeft / ticket.patienceMax) * 100));
  const patienceState =
    patiencePct > 55 ? 'CALM' : patiencePct > 25 ? 'HURRY' : 'CRITICAL';
  const patienceBarColor =
    patiencePct > 55 ? 'bg-[#3b8c84]' : patiencePct > 25 ? 'bg-[#e59f2c]' : 'bg-[#c93b3b]';

  return (
    <div className="relative paper-ticket text-[#2b1d12] rounded-sm p-3.5 sm:p-4 border-2 border-[#c7ae82] lg:-rotate-[0.6deg] transition-transform">
      {/* Masking tape pin at top */}
      <div className="hidden sm:block absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-[#e8d59e]/85 border border-[#b89f63] rotate-1" />

      {/* Receipt Header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#bfa57a] pb-1.5 mb-2">
        <span className="font-pixel-display text-[10px] text-[#5e3c23]">
          TICKET #{String(ticket.ticketNumber).padStart(2, '0')}
        </span>
        <span className="font-pixel-ticket text-base text-[#7a583b]">
          {ticket.customer.name}
        </span>
      </div>

      {/* Patience Gauge (Non-hue + bar + label) */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-[10px] font-pixel-ui text-[#5e3c23] mb-1">
          <span>PATIENCE: {patienceState}</span>
          <span className="tabular-nums">{Math.ceil(ticket.patienceLeft)}s</span>
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

          return (
            <div key={line.uid} className="relative border-b border-dotted border-[#d2be96] pb-2 last:border-b-0 last:pb-0">
              {/* Optional crossed-out mistake on ticket */}
              {line.crossedOutText && (
                <div className="text-[17px] text-[#8f7458] line-through decoration-2 decoration-[#b33939]/75 -rotate-1 mb-0.5">
                  {line.crossedOutText} (no, wait!)
                </div>
              )}

              {/* Actual requested bread & qty */}
              <div className="flex items-center justify-between gap-2">
                <div className={`font-bold ${isDone ? 'line-through text-[#6b705c]' : 'text-[#24160d]'}`}>
                  {line.qty}x {recipe.name}
                </div>
                <div className="font-pixel-ui text-[10px] tabular-nums shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-0.5 text-[#2d7a47] font-bold">
                      <Check className="w-3.5 h-3.5" /> DONE
                    </span>
                  ) : (
                    <span className="text-[#7a583b]">
                      {line.servedQty}/{line.qty}
                    </span>
                  )}
                </div>
              </div>

              {/* Daily Special Stamp */}
              {line.isDailySpecial && !isDone && (
                <div className="mt-0.5 text-[15px] font-bold text-[#9c5700] tracking-wide">
                  ★ DAILY SPECIAL ({dailySpecialMultiplier}x SCORE &amp; COINS)
                </div>
              )}

              {/* Tricky Modifier Note */}
              {line.modifier !== 'none' && (
                <div className="mt-0.5 pl-2 text-[17px] text-[#a62929] font-bold tracking-wide">
                  * {MODIFIER_LABELS[line.modifier]}
                </div>
              )}

              {/* Side margin scribbled correction */}
              {line.marginNote && (
                <div className="mt-0.5 text-right text-[15px] text-[#28548a] italic -rotate-1">
                  [{line.marginNote}]
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Jagged receipt bottom visual */}
      <div className="mt-2 pt-1 border-t border-dashed border-[#bfa57a] flex justify-between font-pixel-ticket text-sm text-[#8a6d4b]">
        <span>Barbar Bakery</span>
        <span>{bakerName ? `Baker: ${bakerName}` : 'Serve Hot!'}</span>
      </div>
    </div>
  );
};
