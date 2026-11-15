/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BREAD_ORDER,
  BREAD_RECIPES,
  CUSTOMER_TYPES,
  EXTRA_ITEMS,
  EXTRA_ORDER,
  OVENS,
  SHAPES,
} from './data';
import {
  FA_BREAD_NAMES,
  FA_CUSTOMER_DIALOGUES,
  FA_INGREDIENTS,
  FA_LOGIC_TEXT,
  FA_OVENS,
  FA_SHAPES,
  Language,
} from './i18n';
import {
  BakedBreadItem,
  BreadId,
  BreadOutcomeQuality,
  BreadShapeId,
  CustomerTypeDef,
  ExtraItemId,
  IngredientId,
  OrderTicket,
  OvenTypeId,
  TicketExtraItem,
  TicketLineItem,
  TicketModifier,
} from './types';

/**
 * Return teas & desserts unlocked for the current shift day (none on Day 1 so tutorial stays focused)
 */
export function getUnlockedExtras(day: number): ExtraItemId[] {
  if (day < 2) return [];
  return EXTRA_ORDER.filter((id) => EXTRA_ITEMS[id].unlockDay <= day);
}

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
  bakeRatio: number;
  targetMin: number;
  targetMax: number;
  elapsed: number;
  lang?: Language;
}): {
  matchedRecipeId: BreadId | null;
  outcome: BreadOutcomeQuality;
  issues: string[];
  hasSesame: boolean;
  hasNigella: boolean;
  isWellDone: boolean;
} {
  const {
    ingredients,
    kneadQuality,
    rested,
    shape,
    oven,
    targetMin,
    targetMax,
    elapsed,
    lang = 'en',
  } = params;
  const L = FA_LOGIC_TEXT[lang];
  const isFa = lang === 'fa';
  const issues: string[] = [];

  const uniqueIngs = Array.from(new Set(ingredients));
  const hasSesame = uniqueIngs.includes('sesame');
  const hasNigella = uniqueIngs.includes('nigella');

  let bestRecipeId: BreadId | null = null;
  let bestScore = -999;

  for (const id of BREAD_ORDER) {
    const rec = BREAD_RECIPES[id];
    let score = 0;

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

  const minT = bestRecipeId ? recipe.bakeMinSeconds : targetMin;
  const maxT = bestRecipeId ? recipe.bakeMaxSeconds : targetMax;
  const midT = (minT + maxT) / 2;

  const isRaw = elapsed < minT * 0.85;
  const isBurnt = elapsed > maxT * 1.1;
  const isWellDone = !isBurnt && elapsed >= midT + (maxT - minT) * 0.2;

  const missingCore = recipe.ingredients.filter(
    (ing) => ing !== 'salt' && ing !== 'sesame' && !uniqueIngs.includes(ing)
  );
  const extraNonTopping = uniqueIngs.filter(
    (ing) => !recipe.ingredients.includes(ing) && ing !== 'sesame' && ing !== 'nigella'
  );

  const addedSugarOnSavory = uniqueIngs.includes('sugar') && !recipe.ingredients.includes('sugar');
  const addedSaltOnSweet = uniqueIngs.includes('salt') && !recipe.ingredients.includes('salt');

  const formatIngs = (list: IngredientId[]) =>
    list
      .map((ing) => (isFa ? FA_INGREDIENTS[ing]?.shortName || ing : ing))
      .join(isFa ? '، ' : ', ');

  const shapeLabel = isFa
    ? FA_SHAPES[recipe.shape]?.name || recipe.shape
    : SHAPES.find((s) => s.id === recipe.shape)?.name || recipe.shape.replace('_', ' ');

  const ovenLabel = isFa
    ? FA_OVENS[recipe.oven]?.name || recipe.oven
    : OVENS.find((o) => o.id === recipe.oven)?.name || recipe.oven;

  if (isBurnt) issues.push(L.burntCrust);
  if (isRaw) issues.push(L.rawInside);
  if (!rested) issues.push(L.denseSkipped);
  if (kneadQuality === 'under') issues.push(L.underKneaded);
  if (kneadQuality === 'over') issues.push(L.overKneaded);
  if (recipe.shape !== shape) issues.push(L.wrongShape(shapeLabel));
  if (recipe.oven !== oven) issues.push(L.wrongOven(ovenLabel));
  if (missingCore.length > 0) issues.push(L.missingIngs(formatIngs(missingCore)));
  if (addedSugarOnSavory) issues.push(L.tooSweet);
  if (addedSaltOnSweet) issues.push(L.tooSalty);
  if (extraNonTopping.length > 0 && !addedSugarOnSavory && !addedSaltOnSweet) {
    issues.push(L.extraIngs(formatIngs(extraNonTopping)));
  }

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
 * Recompute localized issue strings for an already-baked loaf (supports live language switch)
 */
export function getLocalizedLoafIssue(loaf: BakedBreadItem, lang: Language): string {
  const L = FA_LOGIC_TEXT[lang];
  const isFa = lang === 'fa';
  if (loaf.outcome === 'burnt') return L.burntCrust;
  if (loaf.outcome === 'raw') return L.rawInside;
  if (!loaf.rested || loaf.outcome === 'dense') return L.denseSkipped;

  const recipe = loaf.matchedRecipeId ? BREAD_RECIPES[loaf.matchedRecipeId] : null;
  if (recipe) {
    const uniqueIngs = Array.from(new Set(loaf.ingredients));
    const missingCore = recipe.ingredients.filter(
      (ing) => ing !== 'salt' && ing !== 'sesame' && !uniqueIngs.includes(ing)
    );
    const addedSugarOnSavory = uniqueIngs.includes('sugar') && !recipe.ingredients.includes('sugar');
    const addedSaltOnSweet = uniqueIngs.includes('salt') && !recipe.ingredients.includes('salt');
    const extraNonTopping = uniqueIngs.filter(
      (ing) => !recipe.ingredients.includes(ing) && ing !== 'sesame' && ing !== 'nigella'
    );
    const formatIngs = (list: IngredientId[]) =>
      list
        .map((ing) => (isFa ? FA_INGREDIENTS[ing]?.shortName || ing : ing))
        .join(isFa ? '، ' : ', ');

    if (loaf.kneadQuality === 'under') return L.underKneaded;
    if (loaf.kneadQuality === 'over') return L.overKneaded;
    if (recipe.shape !== loaf.shape) {
      const shapeLabel = isFa
        ? FA_SHAPES[recipe.shape]?.name || recipe.shape
        : SHAPES.find((s) => s.id === recipe.shape)?.name || recipe.shape.replace('_', ' ');
      return L.wrongShape(shapeLabel);
    }
    if (recipe.oven !== loaf.oven) {
      const ovenLabel = isFa
        ? FA_OVENS[recipe.oven]?.name || recipe.oven
        : OVENS.find((o) => o.id === recipe.oven)?.name || recipe.oven;
      return L.wrongOven(ovenLabel);
    }
    if (missingCore.length > 0) return L.missingIngs(formatIngs(missingCore));
    if (addedSugarOnSavory) return L.tooSweet;
    if (addedSaltOnSweet) return L.tooSalty;
    if (extraNonTopping.length > 0) return L.extraIngs(formatIngs(extraNonTopping));
  }

  return loaf.issues[0] || loaf.outcome;
}

/**
 * Evaluate a finished baked bread against a specific TicketLineItem
 */
export function evaluateAgainstTicketItem(
  bread: BakedBreadItem,
  line: TicketLineItem,
  lang: Language = 'en'
): {
  accepted: boolean;
  perfect: boolean;
  scoreFactor: number;
  feedback: string;
  defectType?: 'salt' | 'shape' | 'dense' | 'other';
} {
  const recipe = BREAD_RECIPES[line.breadId];
  const L = FA_LOGIC_TEXT[lang];
  const breadDisplayName = lang === 'fa' ? FA_BREAD_NAMES[line.breadId]?.name || recipe.name : recipe.name;

  if (bread.outcome === 'burnt') {
    return { accepted: false, perfect: false, scoreFactor: 0, feedback: L.refusedBurnt };
  }
  if (bread.outcome === 'raw') {
    return { accepted: false, perfect: false, scoreFactor: 0, feedback: L.refusedRaw };
  }

  if (bread.matchedRecipeId !== line.breadId) {
    return {
      accepted: false,
      perfect: false,
      scoreFactor: 0,
      feedback: L.wrongBread(breadDisplayName),
    };
  }

  const problems: string[] = [];
  let severeMistake = false;
  let defectType: 'salt' | 'shape' | 'dense' | 'other' | undefined;

  const hasSalt = bread.ingredients.includes('salt');
  if (line.modifier === 'no_salt' && hasSalt) {
    problems.push(L.saltInNoSalt);
    severeMistake = true;
    defectType = 'salt';
  } else if (line.modifier !== 'no_salt' && recipe.ingredients.includes('salt') && !hasSalt) {
    problems.push(L.forgotSalt);
    defectType = defectType || 'salt';
  }

  if (line.modifier === 'extra_sesame' && !bread.hasSesame) {
    problems.push(L.missingExtraSesame);
    defectType = defectType || 'other';
  } else if (recipe.ingredients.includes('sesame') && !bread.hasSesame) {
    problems.push(L.forgotSesame);
    defectType = defectType || 'other';
  }

  if (line.modifier === 'add_nigella' && !bread.hasNigella) {
    problems.push(L.missingNigella);
    defectType = defectType || 'other';
  }

  if (line.modifier === 'well_done' && !bread.isWellDone) {
    problems.push(L.notWellDone);
    defectType = defectType || 'other';
  }

  if (!bread.rested) {
    problems.push(L.denseSkipped);
    severeMistake = true;
    defectType = defectType || 'dense';
  }
  if (bread.shape !== recipe.shape) {
    problems.push(L.wrongShapeShort);
    severeMistake = true;
    defectType = defectType || 'shape';
  }
  if (bread.oven !== recipe.oven) {
    problems.push(L.wrongOvenShort);
    defectType = defectType || 'other';
  }
  if (bread.kneadQuality !== 'perfect') {
    problems.push(bread.kneadQuality === 'over' ? L.overKneadedShort : L.underKneadedShort);
    defectType = defectType || 'other';
  }
  if (bread.outcome === 'salty' || bread.outcome === 'sweet_error' || bread.outcome === 'wrong_ingredients') {
    if (bread.outcome === 'salty' || bread.outcome === 'sweet_error') {
      severeMistake = true;
    }
    if (bread.outcome === 'salty') defectType = defectType || 'salt';
    problems.push(...bread.issues);
  }

  if (problems.length === 0) {
    return {
      accepted: true,
      perfect: true,
      scoreFactor: 1.0,
      feedback: L.perfectItem(breadDisplayName),
    };
  }

  return {
    accepted: true,
    perfect: false,
    scoreFactor: severeMistake ? 0.25 : 0.65,
    feedback: problems[0],
    defectType,
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
  unlockedRareBreads: BreadId[] = [],
  lang: Language = 'en'
): OrderTicket[] {
  const L = FA_LOGIC_TEXT[lang];
  const isFa = lang === 'fa';
  const unlocked = getUnlockedBreads(day, reputation, unlockedRareBreads);
  const customerCount = Math.min(8, 3 + day);
  const tickets: OrderTicket[] = [];

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
    const custPool =
      day === 1
        ? CUSTOMER_TYPES.filter((c) => c.id !== 'critic')
        : CUSTOMER_TYPES;
    const customer: CustomerTypeDef = custPool[Math.floor(Math.random() * custPool.length)];

    let lineCount = 1;
    if (day === 2 && i >= 2) lineCount = 2;
    else if (day >= 3 && Math.random() < 0.7) lineCount = 2;
    if (day >= 4 && Math.random() < 0.35) lineCount = 3;

    // Tutorial on Day 1 customer #1 is always 1x Sangak with clear instructions
    if (day === 1 && i === 0) {
      tickets.push({
        id: `t_${day}_${i}_${Date.now()}`,
        customer: CUSTOMER_TYPES[3],
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
        reactionMessage: L.tutorialGreeting,
        greetingIndex: -1,
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
        const favUnlocked = customer.favorites.filter((b) => unlocked.includes(b) && !usedBreads.has(b));
        const avail = unlocked.filter((b) => !usedBreads.has(b));
        const pool = favUnlocked.length > 0 && Math.random() < 0.65 ? favUnlocked : avail;
        breadId = pool[Math.floor(Math.random() * pool.length)] || unlocked[0];
        if (breadId === dailySpecialBreadId) isDailySpecialLine = true;
      }
      usedBreads.add(breadId);

      const qty = day >= 2 && lineCount === 1 && Math.random() < 0.4 ? 2 : 1;

      let modifier: TicketModifier = 'none';
      const modChance = day === 1 ? (i >= 2 ? 0.25 : 0) : Math.min(0.65, 0.25 + day * 0.1);
      if (Math.random() < modChance) {
        const hasSalt = BREAD_RECIPES[breadId].ingredients.includes('salt');
        const isPastry =
          breadId === 'nane_khamei' || breadId === 'croissant' || breadId === 'baklava_roll';
        const filteredMods: TicketModifier[] = isPastry
          ? ['well_done']
          : hasSalt
          ? ['no_salt', 'extra_sesame', 'add_nigella', 'well_done']
          : ['extra_sesame', 'add_nigella', 'well_done'];
        modifier = filteredMods[Math.floor(Math.random() * filteredMods.length)];
      }

      let crossedOutBreadId: BreadId | undefined;
      let crossedOutText: string | undefined;
      let marginModifier: TicketModifier | undefined;
      let marginNote: string | undefined;
      if (day >= 2 && j === 0 && Math.random() < 0.35) {
        const decoyId = unlocked.find((b) => b !== breadId) || 'white_loaf';
        crossedOutBreadId = decoyId;
        const decoyName = isFa ? FA_BREAD_NAMES[decoyId]?.name || BREAD_RECIPES[decoyId].name : BREAD_RECIPES[decoyId].name;
        crossedOutText = `1x ${decoyName}`;
      }
      if (day >= 2 && modifier !== 'none' && Math.random() < 0.45) {
        marginModifier = modifier;
        marginNote =
          modifier === 'no_salt'
            ? L.marginNoSalt
            : modifier === 'extra_sesame'
            ? L.marginExtraSesame
            : modifier === 'add_nigella'
            ? L.marginAddNigella
            : L.marginWellDone;
      }

      lines.push({
        uid: `li_${i}_${j}`,
        breadId,
        qty,
        servedQty: 0,
        modifier,
        isDailySpecial: isDailySpecialLine,
        crossedOutBreadId,
        crossedOutText,
        marginModifier,
        marginNote,
      });
    }

    const unlockedExtras = getUnlockedExtras(day);
    const extras: TicketExtraItem[] = [];
    if (unlockedExtras.length > 0 && Math.random() < 0.5) {
      const pickedExtra = unlockedExtras[Math.floor(Math.random() * unlockedExtras.length)];
      extras.push({
        uid: `ex_${i}_0`,
        extraId: pickedExtra,
        qty: 1,
        servedQty: 0,
      });
    }

    const patienceBonus = 1 + patienceLevel * 0.2;
    const itemCountFactor = 1 + (lines.reduce((s, l) => s + l.qty, 0) - 1) * 0.42;
    const extraPatienceSeconds = extras.length > 0 ? 8 : 0;
    const totalPatience = Math.round(
      customer.patienceSeconds * patienceBonus * itemCountFactor + extraPatienceSeconds
    );

    const greetingPool = isFa
      ? FA_CUSTOMER_DIALOGUES[customer.id]?.bakery || customer.greetings
      : customer.greetings;
    const greetingIndex = Math.floor(Math.random() * greetingPool.length);

    tickets.push({
      id: `t_${day}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      customer,
      items: lines,
      extras: extras.length > 0 ? extras : undefined,
      patienceMax: totalPatience,
      patienceLeft: totalPatience,
      ticketNumber: i + 1,
      expression: 'waiting',
      reactionMessage: greetingPool[greetingIndex],
      greetingIndex,
    });
  }

  return tickets;
}
