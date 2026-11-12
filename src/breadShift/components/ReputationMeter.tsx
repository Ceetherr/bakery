/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RARE_REPUTATION_UNLOCKS } from '../data';
import { BreadId } from '../types';
import { Star } from 'lucide-react';

interface ReputationMeterProps {
  reputation: number;
  unlockedRareBreads: BreadId[];
  recentBoostText?: string | null;
  compact?: boolean;
}

export const ReputationMeter: React.FC<ReputationMeterProps> = ({
  reputation,
  unlockedRareBreads,
  recentBoostText,
  compact = false,
}) => {
  const clamped = Math.max(1, Math.min(5, reputation));
  // Meter scales smoothly from 1.0 to 5.0
  const fillPct = ((clamped - 1) / 4) * 100;

  const nextUnlock = RARE_REPUTATION_UNLOCKS.find(
    (u) => clamped < u.requiredRep && !unlockedRareBreads.includes(u.breadId)
  );

  const unlockedCount = RARE_REPUTATION_UNLOCKS.filter(
    (u) => clamped >= u.requiredRep || unlockedRareBreads.includes(u.breadId)
  ).length;

  const barColor =
    clamped >= 4.4
      ? 'bg-[#f5c542]'
      : clamped >= 3.0
      ? 'bg-[#69c79b]'
      : clamped >= 2.0
      ? 'bg-[#e59f2c]'
      : 'bg-[#e37266]';

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
          <div className="flex items-center gap-1.5 font-bold text-[#f4c44e]">
            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>REP {clamped.toFixed(2)}★</span>
            {recentBoostText && (
              <span className="text-[10px] text-[#69c79b] font-bold animate-bread-pop">
                {recentBoostText}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#cbb596] truncate">
            {nextUnlock
              ? `Next: ${nextUnlock.title} @ ${nextUnlock.requiredRep.toFixed(1)}★`
              : `All ${RARE_REPUTATION_UNLOCKS.length} Rare Loaves Unlocked!`}
          </span>
        </div>

        <div className="relative w-full h-2.5 bg-[#160e0c] border border-[#5c3a28] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${fillPct}%` }}
          />
          {RARE_REPUTATION_UNLOCKS.map((u) => {
            const leftPct = ((u.requiredRep - 1) / 4) * 100;
            return (
              <div
                key={u.breadId}
                className="absolute top-0 bottom-0 w-0.5 bg-[#fbf3de]/55"
                style={{ left: `${leftPct}%` }}
                title={`${u.title} (${u.requiredRep.toFixed(1)}★)`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1b110f] border-2 border-[#4d3023] rounded p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#f5c542] fill-current shrink-0" />
          <span className="font-pixel-display text-[11px] text-[#f5c542]">
            REPUTATION METER
          </span>
          <span className="text-xs font-bold text-[#fbf3de] tabular-nums">
            {clamped.toFixed(2)} / 5.00★
          </span>
        </div>

        <div className="text-xs text-[#cbb596]">
          {recentBoostText ? (
            <span className="text-[#69c79b] font-bold">{recentBoostText}</span>
          ) : (
            <span>
              Rare Recipes: {unlockedCount}/{RARE_REPUTATION_UNLOCKS.length}
            </span>
          )}
        </div>
      </div>

      {/* Segmented Gauge with Milestone Ticks */}
      <div className="relative w-full h-4 bg-[#120b09] border-2 border-[#5c3a28] rounded-xs overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${fillPct}%` }}
        />
        {RARE_REPUTATION_UNLOCKS.map((u) => {
          const leftPct = ((u.requiredRep - 1) / 4) * 100;
          const reached = clamped >= u.requiredRep || unlockedRareBreads.includes(u.breadId);
          return (
            <div
              key={u.breadId}
              className={`absolute top-0 bottom-0 w-0.5 ${
                reached ? 'bg-[#ffffff]/80' : 'bg-[#f5c542]/60'
              }`}
              style={{ left: `${leftPct}%` }}
            />
          );
        })}
      </div>

      {/* Milestone Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#cbb596]">
        <span>
          Serve fast &amp; earn positive customer comments to fill reputation!
        </span>
        <span className="font-bold text-[#f5c542] tabular-nums">
          {nextUnlock
            ? `Next Unlock: ${nextUnlock.title} (${nextUnlock.requiredRep.toFixed(1)}★)`
            : 'Master Baker Rating — All Rare Breads Unlocked!'}
        </span>
      </div>
    </div>
  );
};
