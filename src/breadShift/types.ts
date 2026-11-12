/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IngredientId =
  | 'flour'
  | 'water'
  | 'salt'
  | 'yeast'
  | 'sugar'
  | 'sesame'
  | 'nigella'
  | 'oil'
  | 'butter'
  | 'milk';

export type BreadShapeId =
  | 'flat_oval'
  | 'round'
  | 'long_baguette'
  | 'thin_sheet'
  | 'crescent';

export type OvenTypeId = 'tandoor' | 'brick_oven';

export type BreadId =
  | 'sangak'
  | 'barbari'
  | 'white_loaf'
  | 'taftoon'
  | 'lavash'
  | 'pita'
  | 'baguette'
  | 'croissant'
  | 'nane_khamei'
  | 'saffron_barbari'
  | 'baklava_roll'
  | 'royal_brioche';

export type CustomerTypeId =
  | 'old_man'
  | 'student'
  | 'critic'
  | 'kid'
  | 'chef'
  | 'tourist';

export type CustomerExpression = 'happy' | 'waiting' | 'impatient' | 'disgusted' | 'furious';

export type WeatherType = 'sunny' | 'breezy' | 'rainy' | 'golden_hour';

export type BreadQualityFeedbackKey =
  | 'perfect'
  | 'good'
  | 'burnt'
  | 'raw'
  | 'dense'
  | 'salty'
  | 'wrong_shape'
  | 'wrong_bread';

export interface CustomerDialogueSet {
  bakery: string[];
  weather: Record<WeatherType, string[]>;
  breadQuality: Record<BreadQualityFeedbackKey, string[]>;
}

export interface BakerLookConfig {
  name: string;
  skinColor: string;
  hairStyle: 'short' | 'bob' | 'ponytail' | 'waves' | 'classic';
  hairColor: string;
  hat: 'none' | 'toque' | 'beanie' | 'headband' | 'cap';
  apronColor: string;
  detail: 'none' | 'glasses' | 'flour_smudge' | 'rosy';
}

export type TicketModifier =
  | 'none'
  | 'no_salt'
  | 'extra_sesame'
  | 'add_nigella'
  | 'well_done';

export type BreadOutcomeQuality =
  | 'perfect'
  | 'good'
  | 'raw'
  | 'burnt'
  | 'dense'
  | 'salty'
  | 'sweet_error'
  | 'wrong_ingredients'
  | 'wrong_shape'
  | 'wrong_oven'
  | 'over_kneaded'
  | 'under_kneaded';

export interface IngredientDef {
  id: IngredientId;
  name: string;
  shortName: string;
  color: string;
  accent: string;
  category: 'base' | 'fat' | 'topping';
}

export interface BreadRecipe {
  id: BreadId;
  name: string;
  origin: 'Iranian' | 'International';
  unlockDay: number;
  unlockReputation?: number;
  difficulty: 'Standard' | 'Hard' | 'Master' | 'Rare';
  description: string;
  ingredients: IngredientId[];
  restSeconds: number;
  shape: BreadShapeId;
  oven: OvenTypeId;
  bakeMinSeconds: number;
  bakeMaxSeconds: number;
  price: number;
}

export interface CustomerTypeDef {
  id: CustomerTypeId;
  name: string;
  role: string;
  patienceSeconds: number;
  tipMultiplier: number;
  reputationImpact: number;
  favorites: BreadId[];
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  accessory: 'glasses' | 'beanie' | 'monocle' | 'cap' | 'toque' | 'camera';
  greetings: string[];
  happyQuotes: string[];
  upsetQuotes: string[];
}

export interface TicketLineItem {
  uid: string;
  breadId: BreadId;
  qty: number;
  servedQty: number;
  modifier: TicketModifier;
  isDailySpecial?: boolean;
  crossedOut?: boolean;
  crossedOutText?: string;
  marginNote?: string;
}

export interface OrderTicket {
  id: string;
  customer: CustomerTypeDef;
  items: TicketLineItem[];
  patienceMax: number;
  patienceLeft: number;
  ticketNumber: number;
  expression: CustomerExpression;
  reactionMessage: string;
  dialogueTopic?: 'greeting' | 'bakery' | 'weather' | 'bread';
}

export interface BakedBreadItem {
  id: string;
  intendedBreadId: BreadId | null;
  matchedRecipeId: BreadId | null;
  ingredients: IngredientId[];
  kneadQuality: 'under' | 'perfect' | 'over';
  rested: boolean;
  shape: BreadShapeId;
  oven: OvenTypeId;
  bakeRatio: number;
  outcome: BreadOutcomeQuality;
  issues: string[];
  hasSesame: boolean;
  hasNigella: boolean;
  isWellDone: boolean;
}

export interface DoughSlot {
  id: string;
  ingredients: IngredientId[];
  kneadQuality: 'under' | 'perfect' | 'over';
  restProgress: number;
  targetRestSeconds: number;
  restSkipped: boolean;
  suggestedRecipeId: BreadId | null;
}

export interface OvenSlot {
  id: string;
  ovenType: OvenTypeId;
  ingredients: IngredientId[];
  kneadQuality: 'under' | 'perfect' | 'over';
  rested: boolean;
  shape: BreadShapeId;
  suggestedRecipeId: BreadId | null;
  elapsedSeconds: number;
  targetMinSeconds: number;
  targetMaxSeconds: number;
}

export type UpgradeId =
  | 'faster_oven'
  | 'bigger_counter'
  | 'extra_dough_slot'
  | 'kneading_board'
  | 'soothing_chime'
  | 'decor_plants'
  | 'decor_rug'
  | 'decor_neon'
  | 'decor_cat';

export interface ShopUpgrade {
  id: UpgradeId;
  name: string;
  category: 'equipment' | 'decor';
  description: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export type ChaosEventType = 'none' | 'power_flicker' | 'flour_spill' | 'rush_hour' | 'cat_thief';

export interface DaySummary {
  day: number;
  coinsEarned: number;
  tipsEarned: number;
  scoreEarned: number;
  specialsFulfilled: number;
  dailySpecialBreadId: BreadId;
  dailySpecialMultiplier: number;
  ordersCompleted: number;
  perfectBreads: number;
  mistakes: number;
  walkouts: number;
  reputationChange: number;
  newlyUnlockedBreads: BreadId[];
  newlyUnlockedAchievements: string[];
  failedDay: boolean;
}

export interface BakerySaveData {
  day: number;
  coins: number;
  bestScore: number;
  reputation: number;
  totalBreadsBaked: number;
  sangakPerfectCount: number;
  catShoos: number;
  unlockedRareBreads: BreadId[];
  upgrades: Record<UpgradeId, number>;
  achievements: string[];
  tutorialSeen: boolean;
  bakerLook: BakerLookConfig;
}
