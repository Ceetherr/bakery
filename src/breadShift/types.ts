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
  | 'crescent'
  | 'braided_twist';

export type OvenTypeId = 'tandoor' | 'brick_oven';

export type BreadId =
  | 'sangak'
  | 'barbari'
  | 'white_loaf'
  | 'taftoon'
  | 'lavash'
  | 'shirmal'
  | 'pita'
  | 'baguette'
  | 'focaccia'
  | 'simit'
  | 'croissant'
  | 'nane_khamei'
  | 'sourdough'
  | 'komaj'
  | 'pretzel'
  | 'saffron_barbari'
  | 'baklava_roll'
  | 'royal_brioche';

export type ExtraItemCategory = 'beverage' | 'dessert';

export type ExtraIngredientId =
  | 'hot_water'
  | 'tea_leaves'
  | 'coffee_grounds'
  | 'milk_cream'
  | 'saffron'
  | 'cardamom'
  | 'mint'
  | 'rose'
  | 'cinnamon_pistachio'
  | 'rose_syrup'
  | 'crushed_pistachio'
  | 'crisp_wafer';

export interface ExtraIngredientDef {
  id: ExtraIngredientId;
  name: string;
  shortName: string;
  forCategory: ExtraItemCategory;
}

export type ExtraItemId =
  | 'persian_tea'
  | 'saffron_tea'
  | 'karak_tea'
  | 'mint_tea'
  | 'rose_tea'
  | 'persian_coffee'
  | 'saffron_pudding'
  | 'zoolbia_bamieh'
  | 'baklava_plate'
  | 'bastani_sonnati';

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
  kneadTarget: number;
  kneadSpeed: number;
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
  crossedOutBreadId?: BreadId;
  crossedOutText?: string;
  marginModifier?: TicketModifier;
  marginNote?: string;
}

export interface ExtraItemDef {
  id: ExtraItemId;
  category: ExtraItemCategory;
  subKind: 'tea' | 'coffee' | 'dessert';
  name: string;
  description: string;
  unlockDay: number;
  prepSeconds: number;
  price: number;
  ingredients: ExtraIngredientId[];
}

export interface TicketExtraItem {
  uid: string;
  extraId: ExtraItemId;
  qty: number;
  servedQty: number;
}

export interface ActiveExtraPrep {
  id: string;
  extraId: ExtraItemId;
  category: ExtraItemCategory;
  progressSeconds: number;
  targetSeconds: number;
  overboilSeconds: number;
  flameMode: 'high' | 'simmer';
  overboiled: boolean;
  stirsDone: number;
  targetStirs: number;
}

export interface ReadyExtraItem {
  id: string;
  extraId: ExtraItemId;
  category: ExtraItemCategory;
}

export interface OrderTicket {
  id: string;
  customer: CustomerTypeDef;
  items: TicketLineItem[];
  extras?: TicketExtraItem[];
  patienceMax: number;
  patienceLeft: number;
  ticketNumber: number;
  expression: CustomerExpression;
  reactionMessage: string;
  greetingIndex?: number;
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
  | 'samovar_heater'
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
  extrasServed?: number;
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
  totalExtrasServed?: number;
  sangakPerfectCount: number;
  catShoos: number;
  unlockedRareBreads: BreadId[];
  upgrades: Record<UpgradeId, number>;
  achievements: string[];
  tutorialSeen: boolean;
  bakerLook: BakerLookConfig;
  lang: 'en' | 'fa';
}
