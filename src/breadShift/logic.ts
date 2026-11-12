/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BREAD_ORDER, BREAD_RECIPES, CUSTOMER_TYPES } from './data';
import {
  BakedBreadItem,
  BreadId,
  BreadOutcomeQuality,
  BreadShapeId,
  CustomerTypeDef,
  IngredientId,
  OrderTicket,
  OvenTypeId,
  TicketLineItem,
  TicketModifier,
} from './types';

/**
 * Return breads unlocked by current day AND reputation level / persistent rare unlocks
 */
export function getUnlockedBreads(
  day: number,
  reputation: number = 0,
  unlockedRareBreads: BreadId[] = []
): BreadId[] {
  return BREAD_ORDER.filter((id) => {
    const rec = BREAD_RECIPES[id];
    if (rec.unlockReputation !== undefined) {
      return reputation >= rec.unlockReputation || unlockedRareBreads.includes(id);
    }
    return rec.unlockDay <= day;
  });
}

/**
 * Pick a challenging Daily Special bread for the current shift + reward multiplier
 */
export function pickDailySpecial(
  day: number,
  unlocked: BreadId[]
): { breadId: BreadId; multiplier: number } {
  // Rank unlocked breads by difficulty (ingredient count + recipe complexity + rare tier)
  const scored = unlocked.map((id) => {
    const rec = BREAD_RECIPES[id];
    const rareBonus = rec.unlockReputation ? 8 : 0;
    const tierBonus =
      rec.difficulty === 'Rare'
        ? 6
        : rec.difficulty === 'Master'
        ? 4
        : rec.difficulty === 'Hard'
        ? 2
        : 0;
    const score = rec.ingredients.length + rec.unlockDay * 1.5 + tierBonus + rareBonus;
    return { id, score, isRare: Boolean(rec.unlockReputation) };
  });

  scored.sort((a, b) => b.score - a.score);
  // Pick among the top 2 hardest unlocked breads so each day stays challenging yet varied
  const topPool = scored.slice(0, Math.min(2, scored.length));
  const picked = topPool[(day - 1) % topPool.length] || scored[0];
  const multiplier = picked.isRare ? 2.5 : day === 1 ? 1.75 : 2.0;

  return { breadId: picked.id, multiplier };
}

/**
 * Evaluate what a baked batch turned into and whether it has defects
 */
export function evaluateBakedBread(params: {
  ingredients: IngredientId[];
  kneadQuality: 'under' | 'perfect' | 'over';
  rested: boolean;
  shape: BreadShapeId;
  oven: OvenTypeId;
  bakeRatio: number; // elapsed / ((min+max)/2), where ~0.72-1.22 is golden, <0.65 raw, >1.30 burnt
  targetMin: number;
  targetMax: number;
  elapsed: number;
}): {
  matchedRecipeId: BreadId | null;
  outcome: BreadOutcomeQuality;
  issues: string[];
  hasSesame: boolean;
  hasNigella: boolean;
  isWellDone: boolean;
} {
  const { ingredients, kneadQuality, rested, shape, oven, targetMin, targetMax, elapsed } = params;
  const issues: string[] = [];

  const uniqueIngs = Array.from(new Set(ingredients));
  const hasSesame = uniqueIngs.includes('sesame');
  const hasNigella = uniqueIngs.includes('nigella');

  // Identify closest recipe by ingredient + shape similarity
  let bestRecipeId: BreadId | null = null;
  let bestScore = -999;

  for (const id of BREAD_ORDER) {
    const rec = BREAD_RECIPES[id];
    let score = 0;

    // Ingredient overlap (ignoring optional toppings sesame/nigella/salt nuances first)
    for (const ing of rec.ingredients) {
      if (uniqueIngs.includes(ing)) score += 3;
      else if (ing !== 'salt' && ing !== 'sesame') score -= 3;
      else score -= 1;
    }
    for (const ing of uniqueIngs) {
      if (!rec.ingredients.includes(ing) && ing !== 'sesame' && ing !== 'nigella') {
        score -= 2.5;
      }
    }
    if (rec.shape === shape) score += 4;
    if (rec.oven === oven) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestRecipeId = id;
    }
  }

  const recipe = bestRecipeId ? BREAD_RECIPES[bestRecipeId] : BREAD_RECIPES.sangak;

  // Determine bake status relative to matched recipe (or active target)
  const minT = bestRecipeId ? recipe.bakeMinSeconds : targetMin;
  const maxT = bestRecipeId ? recipe.bakeMaxSeconds : targetMax;
  const midT = (minT + maxT) / 2;

  const isRaw = elapsed < minT * 0.85;
  const isBurnt = elapsed > maxT * 1.1;
  const isWellDone = !isBurnt && elapsed >= midT + (maxT - minT) * 0.2;

  // Check ingredient defects against the closest recipe
  const missingCore = recipe.ingredients.filter(
    (ing) => ing !== 'salt' && ing !== 'sesame' && !uniqueIngs.includes(ing)
  );
  const extraNonTopping = uniqueIngs.filter(
    (ing) => !recipe.ingredients.includes(ing) && ing !== 'sesame' && ing !== 'nigella'
  );

  // Salty mistake: added salt when recipe doesn't take salt, OR added salt+sugar weirdly
  const addedSugarOnSavory = uniqueIngs.includes('sugar') && !recipe.ingredients.includes('sugar');
  const addedSaltOnSweet = uniqueIngs.includes('salt') && !recipe.ingredients.includes('salt');

  if (isBurnt) issues.push('Burnt black crust!');
  if (isRaw) issues.push('Raw dough inside!');
  if (!rested) issues.push('Dense & hard (skipped rest)');
  if (kneadQuality === 'under') issues.push('Lumpy & under-kneaded');
  if (kneadQuality === 'over') issues.push('Tough & over-kneaded');
  if (recipe.shape !== shape) issues.push(`Wrong shape (${recipe.shape.replace('_', ' ')})`);
  if (recipe.oven !== oven) issues.push(`Wrong oven (needs ${recipe.oven === 'tandoor' ? 'Tandoor' : 'Brick Oven'})`);
  if (missingCore.length > 0) issues.push(`Missing ${missingCore.join(', ')}`);
  if (addedSugarOnSavory) issues.push('Too sweet for savory bread!');
  if (addedSaltOnSweet) issues.push('Too salty for sweet bread!');
  if (extraNonTopping.length > 0 && !addedSugarOnSavory && !addedSaltOnSweet) {
    issues.push(`Extra ${extraNonTopping.join(', ')}`);
  }

  // Decide dominant visual/taste outcome
  let outcome: BreadOutcomeQuality = 'perfect';
  if (isBurnt) outcome = 'burnt';
  else if (isRaw) outcome = 'raw';
  else if (!rested) outcome = 'dense';
  else if (addedSaltOnSweet) outcome = 'salty';
  else if (addedSugarOnSavory) outcome = 'sweet_error';
  else if (missingCore.length > 0 || extraNonTopping.length > 0) outcome = 'wrong_ingredients';
  else if (recipe.shape !== shape) outcome = 'wrong_shape';
  else if (recipe.oven !== oven) outcome = 'wrong_oven';
  else if (kneadQuality === 'over') outcome = 'over_kneaded';
  else if (kneadQuality === 'under') outcome = 'under_kneaded';
  else outcome = 'perfect';

  return {
    matchedRecipeId: bestRecipeId,
    outcome,
    issues,
    hasSesame,
    hasNigella,
    isWellDone,
  };
}

/**
 * Evaluate a finished baked bread against a specific TicketLineItem
 */
export function evaluateAgainstTicketItem(
  bread: BakedBreadItem,
  line: TicketLineItem
): {
  accepted: boolean;
  perfect: boolean;
  scoreFactor: number; // 1.0 = full price+tip, 0.5 = flawed accepted, 0 = ruined/rejected
  feedback: string;
} {
  const recipe = BREAD_RECIPES[line.breadId];

  // Check if bread physically failed badly
  if (bread.outcome === 'burnt') {
    return { accepted: false, perfect: false, scoreFactor: 0, feedback: 'Charred black! Customer refused it.' };
  }
  if (bread.outcome === 'raw') {
    return { accepted: false, perfect: false, scoreFactor: 0, feedback: 'Still raw dough! Customer refused it.' };
  }

  // Check if wrong bread type altogether
  if (bread.matchedRecipeId !== line.breadId) {
    return {
      accepted: false,
      perfect: false,
      scoreFactor: 0,
      feedback: `Wrong bread! Ordered ${recipe.name}.`,
    };
  }

  const problems: string[] = [];

  // Check modifier rules!
  const hasSalt = bread.ingredients.includes('salt');
  if (line.modifier === 'no_salt' && hasSalt) {
    problems.push('Put salt in a NO SALT order!');
  } else if (line.modifier !== 'no_salt' && recipe.ingredients.includes('salt') && !hasSalt) {
    problems.push('Forgot the salt (bland)!');
  }

  if (line.modifier === 'extra_sesame' && !bread.hasSesame) {
    problems.push('Missing EXTRA SESAME!');
  } else if (recipe.ingredients.includes('sesame') && !bread.hasSesame) {
    problems.push('Forgot sesame topping!');
  }

  if (line.modifier === 'add_nigella' && !bread.hasNigella) {
    problems.push('Missing NIGELLA SEEDS!');
  }

  if (line.modifier === 'well_done' && !bread.isWellDone) {
    problems.push('Not baked WELL DONE enough!');
  }

  if (!bread.rested) problems.push('Dense & heavy (skipped rest)');
  if (bread.shape !== recipe.shape) problems.push('Wrong shape!');
  if (bread.oven !== recipe.oven) problems.push('Wrong oven!');
  if (bread.kneadQuality !== 'perfect') problems.push(`${bread.kneadQuality}-kneaded`);
  if (bread.outcome === 'salty' || bread.outcome === 'sweet_error' || bread.outcome === 'wrong_ingredients') {
    problems.push(...bread.issues);
  }

  if (problems.length === 0) {
    return {
      accepted: true,
      perfect: true,
      scoreFactor: 1.0,
      feedback: `Perfect ${recipe.name}!`,
    };
  }

  // Minor flaws (like missing sesame or under-kneaded or wrong oven) still pass with partial pay, major taste/shape mistakes anger customer
  const severeMistake =
    problems.some((p) => p.includes('SALT') || p.includes('Wrong shape') || p.includes('Dense') || p.includes('sweet'));

  return {
    accepted: true,
    perfect: false,
    scoreFactor: severeMistake ? 0.25 : 0.65,
    feedback: problems[0],
  };
}

/**
 * Generate a daily queue of paper order tickets with progressive complexity, tricky notes & Daily Specials
 */
export function generateDayTickets(
  day: number,
  patienceLevel: number,
  dailySpecialBreadId?: BreadId,
  reputation: number = 0,
  unlockedRareBreads: BreadId[] = []
): OrderTicket[] {
  const unlocked = getUnlockedBreads(day, reputation, unlockedRareBreads);
  const customerCount = Math.min(8, 3 + day); // Day 1: 4 customers, Day 2: 5, Day 3: 6...
  const tickets: OrderTicket[] = [];

  // Choose 1-2 customer indices (never Day 1 #1 tutorial) that request the Daily Special!
  const specialTicketIndices = new Set<number>();
  if (dailySpecialBreadId && unlocked.includes(dailySpecialBreadId)) {
    const minIdx = day === 1 ? 1 : 0;
    const firstSpecialIdx = Math.min(customerCount - 1, minIdx + 1);
    specialTicketIndices.add(firstSpecialIdx);
    if (day >= 2 && customerCount >= 5) {
      specialTicketIndices.add(customerCount - 1);
    }
  }

  for (let i = 0; i < customerCount; i++) {
    // Pick customer weighted nicely
    const custPool =
      day === 1
        ? CUSTOMER_TYPES.filter((c) => c.id !== 'critic')
        : CUSTOMER_TYPES;
    const customer: CustomerTypeDef = custPool[Math.floor(Math.random() * custPool.length)];

    // Number of distinct items in order
    let lineCount = 1;
    if (day === 2 && i >= 2) lineCount = 2;
    else if (day >= 3 && Math.random() < 0.7) lineCount = 2;
    if (day >= 4 && Math.random() < 0.35) lineCount = 3;

    // Tutorial on Day 1 customer #1 is always 1x Sangak with clear instructions
    if (day === 1 && i === 0) {
      tickets.push({
        id: `t_${day}_${i}_${Date.now()}`,
        customer: CUSTOMER_TYPES[3], // Cheerful Nima
        items: [
          {
            uid: `li_${i}_0`,
            breadId: 'sangak',
            qty: 1,
            servedQty: 0,
            modifier: 'none',
          },
        ],
        patienceMax: 95,
        patienceLeft: 95,
        ticketNumber: i + 1,
        expression: 'happy',
        reactionMessage: 'One hot Sangak please! Use the Stone Tandoor!',
      });
      continue;
    }

    const lines: TicketLineItem[] = [];
    const usedBreads = new Set<BreadId>();
    const includeSpecialHere = specialTicketIndices.has(i) && Boolean(dailySpecialBreadId);

    for (let j = 0; j < lineCount; j++) {
      let breadId: BreadId;
      let isDailySpecialLine = false;

      if (j === 0 && includeSpecialHere && dailySpecialBreadId) {
        breadId = dailySpecialBreadId;
        isDailySpecialLine = true;
      } else {
        // Pick from unlocked breads, slightly favoring customer's favorites
        const favUnlocked = customer.favorites.filter((b) => unlocked.includes(b) && !usedBreads.has(b));
        const avail = unlocked.filter((b) => !usedBreads.has(b));
        const pool = favUnlocked.length > 0 && Math.random() < 0.65 ? favUnlocked : avail;
        breadId = pool[Math.floor(Math.random() * pool.length)] || unlocked[0];
        if (breadId === dailySpecialBreadId) isDailySpecialLine = true;
      }
      usedBreads.add(breadId);

      // Quantity (occasionally 2x on Day 2+)
      const qty = day >= 2 && lineCount === 1 && Math.random() < 0.4 ? 2 : 1;

      // Tricky Modifiers (from Day 2+, or last customer of Day 1)
      let modifier: TicketModifier = 'none';
      const modChance = day === 1 ? (i >= 2 ? 0.25 : 0) : Math.min(0.65, 0.25 + day * 0.1);
      if (Math.random() < modChance) {
        const mods: TicketModifier[] = ['no_salt', 'extra_sesame', 'add_nigella', 'well_done'];
        // Avoid extra_sesame on sweet dessert puff
        const filteredMods =
          breadId === 'nane_khamei' || breadId === 'croissant'
            ? (['well_done'] as TicketModifier[])
            : mods;
        modifier = filteredMods[Math.floor(Math.random() * filteredMods.length)];
      }

      // Crossed out decoy / handwritten margin note on tricky orders (Day 2+)
      let crossedOutText: string | undefined;
      let marginNote: string | undefined;
      if (day >= 2 && j === 0 && Math.random() < 0.35) {
        const decoyId = unlocked.find((b) => b !== breadId) || 'white_loaf';
        crossedOutText = `1x ${BREAD_RECIPES[decoyId].name}`;
      }
      if (day >= 2 && modifier !== 'none' && Math.random() < 0.45) {
        marginNote =
          modifier === 'no_salt'
            ? 'Doctor says zero salt!'
            : modifier === 'extra_sesame'
            ? 'Pile on sesame!'
            : modifier === 'add_nigella'
            ? 'Sprinkle nigella!'
            : 'Leave longer in oven!';
      }

      lines.push({
        uid: `li_${i}_${j}`,
        breadId,
        qty,
        servedQty: 0,
        modifier,
        isDailySpecial: isDailySpecialLine,
        crossedOutText,
        marginNote,
      });
    }

    // Patience boosted by Copper Wind Chime upgrade
    const patienceBonus = 1 + patienceLevel * 0.2;
    const itemCountFactor = 1 + (lines.reduce((s, l) => s + l.qty, 0) - 1) * 0.42;
    const totalPatience = Math.round(customer.patienceSeconds * patienceBonus * itemCountFactor);

    tickets.push({
      id: `t_${day}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      customer,
      items: lines,
      patienceMax: totalPatience,
      patienceLeft: totalPatience,
      ticketNumber: i + 1,
      expression: 'waiting',
      reactionMessage: customer.greetings[Math.floor(Math.random() * customer.greetings.length)],
    });
  }

  return tickets;
}
