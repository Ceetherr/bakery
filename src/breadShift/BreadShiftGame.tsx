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
  BakedBreadItem,
  BakerySaveData,
  BreadId,
  BreadQualityFeedbackKey,
  BreadShapeId,
  ChaosEventType,
  DaySummary,
  DoughSlot,
  IngredientId,
  OrderTicket as OrderTicketType,
  OvenSlot,
  OvenTypeId,
  UpgradeId,
  WeatherType,
} from './types';
import {
  evaluateAgainstTicketItem,
  evaluateBakedBread,
  generateDayTickets,
  getUnlockedBreads,
  pickDailySpecial,
} from './logic';
import {
  BakerAvatarSprite,
  BakerySceneBackdrop,
  BreadSprite,
  CustomerSprite,
  IngredientIcon,
  ShapeIcon,
  SleepingDoughSprite,
} from './PixelArt';
import { OrderTicket } from './components/OrderTicket';
import { RecipeBookModal } from './components/RecipeBookModal';
import { ReputationMeter } from './components/ReputationMeter';
import { ShopModal } from './components/ShopModal';
import { BakerCustomizeModal } from './components/BakerCustomizeModal';
import { sound } from '../audio';
import {
  Award,
  BookOpen,
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
  Cat,
  UtensilsCrossed,
  Wind,
  Zap,
} from 'lucide-react';

const SAVE_KEY = 'golden_crust_bread_shift_v1';

type StationTab = 'shelf' | 'knead' | 'rest' | 'shape' | 'oven';
type BreadShiftPhase = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'DAY_END';

interface BreadShiftGameProps {
  onOpenSideGame: () => void;
  externalOpenRecipesSignal?: number;
  externalOpenShopSignal?: number;
}

export const BreadShiftGame: React.FC<BreadShiftGameProps> = ({
  onOpenSideGame,
  externalOpenRecipesSignal = 0,
  externalOpenShopSignal = 0,
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
    return INITIAL_BAKERY_SAVE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch {
      // ignore
    }
  }, [saveData]);

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
        triggerPopup('Shop opens after shift ends!', false);
      }
    }
  }, [externalOpenShopSignal, phase, triggerPopup]);

  // Active Shift State
  const [tickets, setTickets] = useState<OrderTicketType[]>([]);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [isWalkingIn, setIsWalkingIn] = useState(false);
  const [dayStats, setDayStats] = useState({
    coinsEarned: 0,
    tipsEarned: 0,
    scoreEarned: 0,
    specialsFulfilled: 0,
    ordersCompleted: 0,
    perfectBreads: 0,
    mistakes: 0,
    walkouts: 0,
    burntCount: 0,
    repStart: 3.5,
  });

  // Station State
  const [station, setStation] = useState<StationTab>('shelf');
  const [bowlIngredients, setBowlIngredients] = useState<IngredientId[]>([]);
  const [kneadingDough, setKneadingDough] = useState<{
    ingredients: IngredientId[];
    hits: number;
    goodHits: number;
    overHits: number;
  } | null>(null);
  const [kneadCursor, setKneadCursor] = useState(50);
  const kneadDirRef = useRef(1);

  const [restingSlots, setRestingSlots] = useState<DoughSlot[]>([]);
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

  // Chaos Events
  const [chaosEvent, setChaosEvent] = useState<ChaosEventType>('none');
  const [flourSpillClicks, setFlourSpillClicks] = useState(0);
  const [chaosTimer, setChaosTimer] = useState(0);
  const nextChaosCooldownRef = useRef(18);

  // Derived upgrade capacities
  const maxTraySlots = 2 + (saveData.upgrades.bigger_counter || 0);
  const maxRestSlots = 1 + (saveData.upgrades.extra_dough_slot || 0);
  const speedMultiplier = 1 + (saveData.upgrades.faster_oven || 0) * 0.18;
  const sweetSpotHalfWidth = 14 + (saveData.upgrades.kneading_board || 0) * 6; // +/- % around 50%

  const activeTicket = tickets[activeTicketIndex] || null;

  // Guess intended recipe from ingredients to display helpful resting/baking timers
  const guessRecipeFromIngredients = (ings: IngredientId[]): BreadId | null => {
    const unlocked = getUnlockedBreads(
      saveData.day,
      saveData.reputation,
      saveData.unlockedRareBreads
    );
    let best: BreadId | null = null;
    let bestScore = -99;
    for (const id of unlocked) {
      const rec = BREAD_RECIPES[id];
      let score = 0;
      for (const i of rec.ingredients) score += ings.includes(i) ? 2 : -1;
      for (const i of ings) if (!rec.ingredients.includes(i) && i !== 'sesame' && i !== 'nigella') score -= 1.5;
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
      sound.initContext();
      sound.startBakeryMusic();
      sound.playSlapTicket();

      // Choose shift weather (sunny on Day 1 for clarity, varied from Day 2+)
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
        saveData.unlockedRareBreads
      ).map((t) => ({ ...t, dialogueTopic: 'greeting' as const }));
      setTickets(generated);
      setActiveTicketIndex(0);
      setIsWalkingIn(true);
      setTimeout(() => setIsWalkingIn(false), 650);

      setMobilePanel('counter');
      setStation('shelf');
      setBowlIngredients([]);
      setKneadingDough(null);
      setRestingSlots([]);
      setShapingBatch(null);
      setReadyToBakeBatch(null);
      setOvenSlot(null);
      setServingTray([]);
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

      if (activeTicketIndex + 1 >= tickets.length) {
        finishDay(updatedStats, latestRep, false);
      } else {
        setActiveTicketIndex((idx) => idx + 1);
        setIsWalkingIn(true);
        sound.playSlapTicket();
        setTimeout(() => setIsWalkingIn(false), 600);
      }
    },
    [activeTicketIndex, finishDay, tickets.length]
  );

  // ============================================================================
  // MAIN TICK LOOP (Patience drain, Knead bar cursor, Resting Dough, Oven Bake, Chaos)
  // ============================================================================
  useEffect(() => {
    if (phase !== 'PLAYING' || showRecipes || showShopModal) return;

    const intervalMs = 50; // 20Hz crisp simulation tick
    const dt = intervalMs / 1000;

    const timer = window.setInterval(() => {
      // 1. Kneading Timing Bar oscillation
      setKneadCursor((prev) => {
        let next = prev + kneadDirRef.current * 1.95;
        if (next >= 98) {
          next = 98;
          kneadDirRef.current = -1;
        } else if (next <= 2) {
          next = 2;
          kneadDirRef.current = 1;
        }
        return next;
      });

      // 2. Dough Rest timers
      setRestingSlots((prev) =>
        prev.map((slot) => {
          if (slot.restProgress >= slot.targetRestSeconds) return slot;
          const nextProg = Math.min(
            slot.targetRestSeconds,
            slot.restProgress + dt * speedMultiplier
          );
          if (nextProg >= slot.targetRestSeconds && slot.restProgress < slot.targetRestSeconds) {
            sound.playDing();
          }
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

      // 4. Chaos Event Scheduling (Day 2+)
      if (saveData.day >= 2) {
        if (chaosEvent !== 'none') {
          setChaosTimer((t) => {
            if (t - dt <= 0) {
              // If cat thief escaped un-shooed, steal a loaf from tray!
              if (chaosEvent === 'cat_thief') {
                setServingTray((tray) => {
                  if (tray.length > 0) {
                    sound.playCatMeow();
                    triggerPopup('Meow! Bakery cat snatched a loaf!', false);
                    return tray.slice(1);
                  }
                  return tray;
                });
              }
              setChaosEvent('none');
              return 0;
            }
            return t - dt;
          });
        } else {
          nextChaosCooldownRef.current -= dt;
          if (nextChaosCooldownRef.current <= 0) {
            nextChaosCooldownRef.current = 20 + Math.random() * 14;
            const pool: ChaosEventType[] = ['power_flicker', 'flour_spill', 'rush_hour'];
            // Cat thief only triggers if there's bread on the tray & no mascot cat yet (or rare cheeky visit)
            if (servingTray.length > 0 && (saveData.upgrades.decor_cat || 0) === 0) {
              pool.push('cat_thief');
            }
            const picked = pool[Math.floor(Math.random() * pool.length)];
            setChaosEvent(picked);
            setChaosTimer(picked === 'rush_hour' ? 12 : picked === 'cat_thief' ? 7 : 6);
            if (picked === 'flour_spill') setFlourSpillClicks(0);
            if (picked === 'cat_thief') sound.playCatMeow();
          }
        }
      }

      // 5. Active Customer Patience Drain
      setTickets((prev) => {
        const current = prev[activeTicketIndex];
        if (!current) return prev;
        // Pause patience drain during tutorial customer #1 on Day 1
        if (saveData.day === 1 && activeTicketIndex === 0) return prev;

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
    chaosEvent,
    phase,
    saveData.day,
    saveData.upgrades.decor_cat,
    servingTray.length,
    showRecipes,
    showShopModal,
    speedMultiplier,
    triggerPopup,
  ]);

  // Watch for patience hitting 0 -> Customer walks out angrily!
  useEffect(() => {
    if (phase !== 'PLAYING' || !activeTicket) return;
    if (activeTicket.patienceLeft <= 0) {
      sound.playServeFail();
      const repLoss = activeTicket.customer.reputationImpact;
      const nextRep = Math.max(1.0, Number((saveData.reputation - repLoss).toFixed(2)));
      setSaveData((prev) => ({ ...prev, reputation: nextRep }));

      const nextStats = {
        ...dayStats,
        walkouts: dayStats.walkouts + 1,
      };
      setDayStats(nextStats);
      triggerPopup(`${activeTicket.customer.name} left! (-${repLoss.toFixed(1)}★)`, false);
      advanceCustomer(nextStats, nextRep);
    }
  }, [activeTicket, advanceCustomer, dayStats, phase, saveData.reputation, triggerPopup]);

  // Ambient Customer Bubble Chatter: comment on Barbar Bakery or outside Weather
  // Positive remarks while waiting happily give a gentle Reputation boost!
  useEffect(() => {
    if (phase !== 'PLAYING' || showRecipes || showShopModal || showBakerCustomize) return;
    // Keep Day 1 tutorial order #1 uncluttered
    if (saveData.day === 1 && activeTicketIndex === 0) return;

    const timer = window.setInterval(() => {
      if (Date.now() - lastServeReactionAtRef.current < 3500) return;

      const current = tickets[activeTicketIndex];
      if (!current) return;

      const personalityDialogue = CUSTOMER_DIALOGUE_VARIATIONS[current.customer.id];
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

      // Positive cozy/bakery chatter while patience >= 45% lifts Reputation Meter!
      const patiencePct = current.patienceLeft / current.patienceMax;
      if (topic === 'bakery' && patiencePct >= 0.45) {
        const praiseBoost = 0.04;
        setSaveData((prev) => {
          const nextRep = Math.min(5.0, Number((prev.reputation + praiseBoost).toFixed(2)));
          const newlyRare = RARE_REPUTATION_UNLOCKS.filter(
            (u) => nextRep >= u.requiredRep && !prev.unlockedRareBreads.includes(u.breadId)
          ).map((u) => u.breadId);

          if (newlyRare.length > 0) {
            sessionRareUnlocksRef.current = Array.from(
              new Set([...sessionRareUnlocksRef.current, ...newlyRare])
            );
            triggerPopup(`Rare Recipe Unlocked: ${BREAD_RECIPES[newlyRare[0]].name}!`, true);
          }

          return {
            ...prev,
            reputation: nextRep,
            unlockedRareBreads:
              newlyRare.length > 0
                ? [...prev.unlockedRareBreads, ...newlyRare]
                : prev.unlockedRareBreads,
          };
        });
        setRecentRepBoost(`+${praiseBoost.toFixed(2)}★ Bakery Praise!`);
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
    tickets,
    triggerPopup,
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
    setKneadingDough({
      ingredients: [...bowlIngredients],
      hits: 0,
      goodHits: 0,
      overHits: 0,
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
        overHits: nextHits > 3 ? prev.overHits + 1 : prev.overHits,
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
    if (kneadingDough.hits < 3) return 'under';
    if (kneadingDough.overHits >= 2 || kneadingDough.hits >= 5) return 'over';
    if (kneadingDough.goodHits >= 2) return 'perfect';
    return 'under';
  };

  const handleFinishKneading = () => {
    if (!kneadingDough) return;
    if (restingSlots.length >= maxRestSlots) {
      triggerPopup('Proofing cloths full! Shape a resting dough first.', false);
      setStation('rest');
      return;
    }

    const quality = getKneadQuality();
    const guessedId = guessRecipeFromIngredients(kneadingDough.ingredients);
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

  // Station 4: Choose Shape -> Ready for Oven
  const handlePickShape = (shape: BreadShapeId) => {
    if (!shapingBatch) return;
    sound.playPlop();
    const rec = shapingBatch.suggestedRecipeId
      ? BREAD_RECIPES[shapingBatch.suggestedRecipeId]
      : null;
    if (rec) setSelectedOven(rec.oven);
    setReadyToBakeBatch({
      ...shapingBatch,
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
      triggerPopup('Serving tray full! Serve or discard a loaf first.', false);
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

    // Track total baked & Sangak achievement
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

    // Return to Shelf automatically if tray still has space
    setStation('shelf');
  };

  // Station 6: Serve Bread from Tray to Active Customer
  const handleServeLoaf = (loaf: BakedBreadItem) => {
    if (!activeTicket) return;

    // Find best matching unfulfilled line on the ticket
    const unfulfilled = activeTicket.items.filter((i) => i.servedQty < i.qty);
    if (unfulfilled.length === 0) return;

    // Prefer exact bread match first, otherwise first unfulfilled line
    const targetLine =
      unfulfilled.find((l) => l.breadId === loaf.matchedRecipeId) || unfulfilled[0];

    const result = evaluateAgainstTicketItem(loaf, targetLine);

    // Helper: pick personality-specific bread quality dialogue line
    const pickBreadDialogue = (key: BreadQualityFeedbackKey): string => {
      const set = CUSTOMER_DIALOGUE_VARIATIONS[activeTicket.customer.id].breadQuality[key];
      return set[Math.floor(Math.random() * set.length)];
    };

    // Remove loaf from tray
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
      triggerPopup(`${result.feedback} (-${repLoss.toFixed(1)}★)`, false);

      if (nextRep < 1.5) {
        finishDay({ ...dayStats, mistakes: dayStats.mistakes + 1 }, nextRep, true);
      }
      return;
    }

    // Accepted! Compute price + Daily Special multiplier + Speed & Dialogue Reputation bonuses
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

    // Update customer reaction & ticket progress
    const updatedItems = activeTicket.items.map((l) =>
      l.uid === targetLine.uid ? { ...l, servedQty: l.servedQty + 1 } : l
    );
    const allDone = updatedItems.every((l) => l.servedQty >= l.qty);

    // Reputation increases faster on quick service + positive bread dialogue comments!
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
      const reasonTag =
        speedRepBonus > 0 ? 'Fast + Praise!' : 'Customer Praise!';
      setRecentRepBoost(`+${repDelta.toFixed(2)}★ ${reasonTag}`);
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
      : !loaf.rested || loaf.outcome === 'dense'
      ? 'dense'
      : loaf.outcome === 'salty' || result.feedback.toLowerCase().includes('salt')
      ? 'salty'
      : loaf.outcome === 'wrong_shape' || result.feedback.toLowerCase().includes('shape')
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

    if (newlyRare.length > 0) {
      triggerPopup(`RARE UNLOCKED: ${BREAD_RECIPES[newlyRare[0]].name}!`, true);
    } else if (isSpecialFulfilled) {
      triggerPopup(`★ SPECIAL ${dailySpecial.multiplier}x! +${totalGain}c · +${pointsGain} pts`, true);
    } else {
      triggerPopup(
        result.perfect
          ? `+${totalGain}c · +${pointsGain} pts${speedRepBonus > 0 ? ' (Fast!)' : ''}`
          : `+${totalGain}c (${result.feedback})`,
        result.perfect
      );
    }

    if (allDone) {
      setTimeout(() => {
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
      setTimeout(() => setConfirmReset(false), 3500);
      return;
    }
    setSaveData(INITIAL_BAKERY_SAVE);
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
    if (servingTray.length > 0) {
      return 'Step 6: Your Sangak is hot on the tray! Click "Serve" to hand it to Nima!';
    }
    if (ovenSlot) {
      return 'Step 5: Watch the gauge turn GOLDEN, then click "PULL IT OUT!" before it burns!';
    }
    if (readyToBakeBatch) {
      return 'Step 5: Choose "Stone Tandoor" and click "Put In Hearth!"';
    }
    if (shapingBatch) {
      return 'Step 4: Sangak is shaped as a "Flat Oval" — tap Flat Oval!';
    }
    if (restingSlots.length > 0) {
      const slot = restingSlots[0];
      if (slot.restProgress >= slot.targetRestSeconds) {
        return 'Step 3: Dough is puffed! Click "Shape Dough ->"!';
      }
      return 'Step 3: Let your cute dough sleep until puffed (do not skip or it turns dense!)';
    }
    if (kneadingDough) {
      if (kneadingDough.hits >= 3) {
        return 'Step 2: Great kneading! Click "Send to Proofing Rest ->"!';
      }
      return 'Step 2: Tap "KNEAD!" (or Spacebar) 3 times inside the green center zone!';
    }
    return 'Step 1 (Tutorial): For Sangak, tap Flour, Water, Salt, and Yeast, then click "Knead Dough ->"!';
  };

  const tutorialHint = getTutorialHint();

  const currentWeatherMeta =
    WEATHER_OPTIONS.find((w) => w.id === weather) || WEATHER_OPTIONS[0];

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
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5">
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
                BREAD SHIFT · ARTISAN PIXEL BAKERY
              </div>
              <h1 className="font-pixel-display text-xl sm:text-3xl text-[#fbf3de] drop-shadow-[0_4px_0_#140b09]">
                BARBAR BAKERY
              </h1>
              <p className="font-pixel-ticket text-lg sm:text-xl text-[#e2cfa9] mt-0.5 leading-snug">
                Knead by rhythm, bake Sangak &amp; Barbari in stone tandoors, and earn rare recipes.
              </p>
            </div>
          </div>

          {/* Clean Un-mushed Bakery Stats & Actions */}
          <div className="p-4 sm:p-5 bg-[#1d1310] border-t-2 border-[#422a1e] space-y-4">
            {/* Key Stats Row */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center sm:text-left">
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">NEXT SHIFT</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] mt-0.5 tabular-nums">
                  DAY {saveData.day}
                </div>
              </div>
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">COINS</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#f5c542] mt-0.5 tabular-nums">
                  {saveData.coins}c
                </div>
              </div>
              <div className="bg-[#251815] border-2 border-[#4d3023] rounded px-3 py-2.5">
                <div className="text-[10px] text-[#a88d73] font-bold">BEST SCORE</div>
                <div className="font-pixel-display text-xs sm:text-sm text-[#69c79b] mt-0.5 tabular-nums">
                  {saveData.bestScore || 0}
                </div>
              </div>
            </div>

            {/* Reputation Meter & Rare Recipe Milestones */}
            <ReputationMeter
              reputation={saveData.reputation}
              unlockedRareBreads={saveData.unlockedRareBreads}
              recentBoostText={recentRepBoost}
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
                      DAY {saveData.day} DAILY SPECIAL
                    </span>
                    <span className="text-[#e8917d]">· {lobbySpecialRecipe.difficulty}</span>
                  </div>
                  <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] truncate">
                    {lobbySpecialRecipe.name}
                  </div>
                  <div className="text-xs text-[#d9c8ac]">
                    Ingredients:{' '}
                    {lobbySpecialRecipe.ingredients
                      .map((ingId) => INGREDIENTS.find((i) => i.id === ingId)?.shortName || ingId)
                      .join(', ')}
                  </div>
                </div>
              </div>

              <div className="bg-[#1a100e] border border-[#f5c542]/60 rounded px-3 py-2 text-center sm:text-right shrink-0">
                <div className="text-[10px] text-[#cbb596] uppercase">Perfect Special Bonus</div>
                <div className="font-pixel-display text-xs text-[#f5c542] mt-0.5 tabular-nums">
                  {lobbySpecial.multiplier}x SCORE &amp; COINS
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
                    HEAD BAKER · BARBAR BAKERY
                  </div>
                  <div className="font-pixel-display text-xs sm:text-sm text-[#fbf3de] truncate mt-0.5">
                    {saveData.bakerLook.name || 'Ostad Baker'}
                  </div>
                  <div className="text-xs text-[#cbb596] mt-0.5">
                    {saveData.totalBreadsBaked} loaves baked · {saveData.achievements.length}/{ACHIEVEMENTS.length} badges
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
                <span>Name &amp; Customize Baker</span>
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
                  <span>START DAY {saveData.day} SHIFT</span>
                </button>

                <div className="grid grid-cols-2 sm:flex gap-2.5">
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setDaySummary(null);
                      setShowShopModal(true);
                    }}
                    className="min-h-[46px] px-4 py-2.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border-2 border-[#215752] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Shop &amp; Decor</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setShowRecipes(true);
                    }}
                    className="min-h-[46px] px-4 py-2.5 bg-[#3a251c] hover:bg-[#4d3227] text-[#f4e8c1] font-pixel-ui text-xs rounded border-2 border-[#6b4635] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#f5c542]" />
                    <span>Recipe Book</span>
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
                <span>{confirmReset ? 'Tap Again to Reset!' : 'Reset Save'}</span>
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
                BAKERY MENU ({unlockedBreads.length}/{BREAD_ORDER.length} UNLOCKED)
              </h2>
              <span className="text-xs text-[#cbb596]">Iranian, World &amp; Rare Loaves</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {unlockedBreads.map((id) => {
                const rec = BREAD_RECIPES[id];
                const isSpecial = id === lobbySpecial.breadId;
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
                      {rec.name}
                    </div>
                    <div className="text-[11px] text-[#d4a373] tabular-nums">
                      {isSpecial ? `★ ${lobbySpecial.multiplier}x` : `${rec.price}c`}
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
                <span className="text-[11px] font-bold text-[#f5c542]">SIDE GAME ARCADE</span>
                <Cat className="w-4 h-4 text-[#f5c542]" />
              </div>
              <h3 className="font-pixel-display text-sm text-[#fbf3de]">CAT &amp; BREAD</h3>
              <p className="font-pixel-ticket text-lg text-[#d9c8ac] leading-snug mt-1">
                Need a break from the ovens? Pick &amp; name your pixel cat and catch falling French pastries while dodging moldy loaves!
              </p>
            </div>

            <button
              onClick={() => {
                sound.playButtonClick();
                onOpenSideGame();
              }}
              className="min-h-[46px] w-full py-2.5 px-4 bg-[#e59f2c] hover:bg-[#f0ae3c] text-[#1c110c] font-pixel-ui font-bold text-xs rounded border-2 border-[#8c5a12] pixel-btn cursor-pointer"
            >
              Play Cat &amp; Bread →
            </button>
          </div>
        </div>

        {/* Modals */}
        {showRecipes && (
          <RecipeBookModal
            currentDay={saveData.day}
            reputation={saveData.reputation}
            unlockedRareBreads={saveData.unlockedRareBreads}
            onClose={() => setShowRecipes(false)}
          />
        )}
        {showShopModal && (
          <ShopModal
            summary={daySummary}
            saveData={saveData}
            onBuyUpgrade={handleBuyUpgrade}
            onStartNextDay={() => startDayShift(saveData.day)}
            onRetryDay={() => startDayShift(saveData.day)}
            onCloseOnly={() => setShowShopModal(false)}
          />
        )}
        {showBakerCustomize && (
          <BakerCustomizeModal
            look={saveData.bakerLook}
            onChange={(nextLook) => setSaveData((prev) => ({ ...prev, bakerLook: nextLook }))}
            onClose={() => {
              setSaveData((prev) => ({
                ...prev,
                bakerLook: {
                  ...prev.bakerLook,
                  name: prev.bakerLook.name.trim() || 'Ostad Baker',
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
    if (ovenPct < ovenMinPct * 0.88) return 'RAW DOUGH';
    if (ovenPct <= ovenMaxPct * 1.05) {
      return ovenPct >= ovenMidPct ? 'WELL DONE GOLD!' : 'GOLDEN READY!';
    }
    return 'BURNING!! PULL OUT!';
  };

  const getOvenBarColor = () => {
    if (!ovenSlot) return 'bg-[#d8c6a3]';
    if (ovenPct < ovenMinPct * 0.88) return 'bg-[#e6d5b8]';
    if (ovenPct <= ovenMaxPct * 1.05) return ovenPct >= ovenMidPct ? 'bg-[#d97724]' : 'bg-[#f5c542]';
    return 'bg-[#2a2220]';
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 space-y-3">
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
              title="Edit Baker Look"
              className="min-h-[38px] flex items-center gap-1.5 bg-[#1a100e] hover:bg-[#2c1c18] border border-[#4d3023] rounded px-2 py-1 cursor-pointer"
            >
              <BakerAvatarSprite look={saveData.bakerLook} size={24} />
              <span className="font-bold text-[#fbf3de] max-w-[78px] sm:max-w-[110px] truncate">
                {saveData.bakerLook.name || 'Ostad Baker'}
              </span>
            </button>

            <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs">
              <span>
                <strong className="font-pixel-display text-[11px] text-[#fbf3de]">DAY {saveData.day}</strong>
              </span>
              <span className="text-[#cbb596]">
                Cust <strong className="text-[#f4e8c1]">{Math.min(activeTicketIndex + 1, tickets.length)}/{tickets.length}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[#f5c542] font-bold">
                <Coins className="w-3.5 h-3.5" />
                {saveData.coins}c
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[#9ecbe0] text-[11px]">
                <Sun className="w-3.5 h-3.5 text-[#f5c542]" />
                {currentWeatherMeta.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowRecipes(true);
              }}
              className="min-h-[40px] px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#f5c542]" />
              <span>Recipes</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonClick();
                setPhase((p) => (p === 'PAUSED' ? 'PLAYING' : 'PAUSED'));
              }}
              className="min-h-[40px] px-3 py-1.5 bg-[#3a251c] hover:bg-[#4d3227] border border-[#6b4635] rounded text-xs font-pixel-ui text-[#f4e8c1] flex items-center gap-1.5 cursor-pointer"
            >
              {phase === 'PAUSED' ? <Play className="w-3.5 h-3.5 text-[#69c79b]" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{phase === 'PAUSED' ? 'Resume' : 'Pause'}</span>
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
            />
          </div>
          <div className="md:col-span-5 bg-[#2b1a14] border border-[#f5c542]/60 rounded px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-[#f5c542] font-bold flex items-center gap-1.5 truncate">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Special: {BREAD_RECIPES[dailySpecial.breadId].name}</span>
            </span>
            <span className="font-bold text-[#fbf3de] shrink-0">{dailySpecial.multiplier}x BONUS</span>
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
              {chaosEvent === 'cat_thief' && 'A sneaky street cat is eyeing your cooling tray!'}
              {chaosEvent === 'flour_spill' && `Flour spill! Sweep ${3 - flourSpillClicks}x to clean!`}
              {chaosEvent === 'power_flicker' && 'Power flicker! Keep watching the ovens!'}
              {chaosEvent === 'rush_hour' && `Bakery Rush Hour! +50% tips for ${Math.ceil(chaosTimer)}s!`}
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
                  return { ...prev, catShoos: nextShoos, achievements: nextAchs, coins: prev.coins + 2 };
                });
                triggerPopup('Shooed kitty safely! (+2c)', true);
              }}
              className="min-h-[42px] px-3.5 py-1.5 bg-[#f5c542] text-[#1c110c] font-bold rounded border border-[#8c5a12] pixel-btn cursor-pointer"
            >
              Shoo / Pet Cat!
            </button>
          )}

          {chaosEvent === 'flour_spill' && (
            <button
              onClick={() => {
                sound.playButtonClick();
                if (flourSpillClicks + 1 >= 3) {
                  setChaosEvent('none');
                  setFlourSpillClicks(0);
                  triggerPopup('Counter swept spotless!', true);
                } else {
                  setFlourSpillClicks((c) => c + 1);
                }
              }}
              className="min-h-[42px] px-3.5 py-1.5 bg-[#f4e8c1] text-[#1c110c] font-bold rounded border border-[#9d8159] pixel-btn cursor-pointer"
            >
              Sweep Counter ({flourSpillClicks}/3)
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
          <span>Counter &amp; Order{servingTray.length > 0 ? ` (${servingTray.length})` : ''}</span>
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
          <span>Kitchen (Bake 1-5)</span>
        </button>
      </div>

      {/* Main 2-Column Bakery Play Area (2-tab switched on phone, side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN: Storefront Scene + Customer + Paper Ticket + Serving Tray */}
        <div className={`lg:col-span-5 space-y-3.5 ${mobilePanel === 'counter' ? 'block' : 'hidden lg:block'}`}>
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
                    <div className="absolute -left-2 bottom-2.5 w-2.5 h-2.5 bg-[#fbf3de] border-l-2 border-b-2 border-[#5c3a28] rotate-45" />

                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                      <span className="text-[#8f4c24] truncate">
                        {activeTicket.customer.name} · {activeTicket.customer.role}
                      </span>
                      <span className="text-[#3b8c84] uppercase tracking-wider shrink-0">
                        {activeTicket.dialogueTopic === 'weather'
                          ? 'WEATHER'
                          : activeTicket.dialogueTopic === 'bakery'
                          ? 'BAKERY'
                          : activeTicket.dialogueTopic === 'bread'
                          ? 'TASTE'
                          : 'ORDER'}
                      </span>
                    </div>
                    <div className="font-pixel-ticket text-[17px] leading-tight mt-0.5 break-words">
                      &ldquo;{activeTicket.reactionMessage}&rdquo;
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Coin/Feedback Popup */}
              {coinPopup && (
                <div
                  key={coinPopup.id}
                  className={`absolute top-2 right-3 px-2.5 py-1 rounded border font-pixel-ui text-xs font-bold animate-coin-float ${
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
            <span>Go to Kitchen &amp; Bake →</span>
          </button>

          {/* Counter / Serving Tray */}
          <div className="bg-[#241714] border-2 border-[#5c3a28] rounded-md p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-pixel-display text-[10px] text-[#f5c542]">
                COUNTER TRAY ({servingTray.length}/{maxTraySlots})
              </span>
              <span className="text-[11px] text-[#cbb596]">Serve finished bread here</span>
            </div>

            {servingTray.length === 0 ? (
              <div className="bg-[#1a100e] border border-dashed border-[#4d3023] rounded py-4 text-center text-xs text-[#8a6d56]">
                Tray empty — bake bread at Stations 1 → 5!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {servingTray.map((loaf) => {
                  const recName = loaf.matchedRecipeId
                    ? BREAD_RECIPES[loaf.matchedRecipeId].name
                    : 'Mystery Loaf';
                  const tagText =
                    loaf.outcome === 'perfect'
                      ? loaf.isWellDone
                        ? 'Well Done!'
                        : 'Golden!'
                      : loaf.issues[0] || loaf.outcome;

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
                            Serve
                          </button>
                          <button
                            onClick={() => {
                              sound.playButtonClick();
                              setServingTray((prev) => prev.filter((i) => i.id !== loaf.id));
                            }}
                            title="Discard loaf"
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
          </div>
        </div>

        {/* RIGHT COLUMN: 5 BAKING STATIONS WORKBENCH */}
        <div
          className={`lg:col-span-7 bg-[#241714] border-2 border-[#5c3a28] rounded-md overflow-hidden flex-col ${
            mobilePanel === 'kitchen' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Mobile Kitchen Header: Non-sticky Order Reminder + Quick Serve */}
          {activeTicket && (
            <div className="lg:hidden bg-[#2b1b16] border-b-2 border-[#4d3023] px-3.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold text-[#f5c542]">NEED:</span>
                  {activeTicket.items.map((line) => (
                    <span
                      key={line.uid}
                      className={`font-bold ${
                        line.servedQty >= line.qty
                          ? 'line-through text-[#69c79b]'
                          : line.isDailySpecial
                          ? 'text-[#f5c542]'
                          : 'text-[#fbf3de]'
                      }`}
                    >
                      {line.isDailySpecial ? '★ ' : ''}
                      {line.qty - line.servedQty > 0 ? `${line.qty - line.servedQty}x ` : ''}
                      {BREAD_RECIPES[line.breadId].name}
                      {line.modifier !== 'none' ? ` (${MODIFIER_LABELS[line.modifier]})` : ''}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-pixel-ui text-xs font-bold text-[#f4c44e] tabular-nums">
                    {Math.ceil(activeTicket.patienceLeft)}s
                  </span>
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setMobilePanel('counter');
                    }}
                    className="min-h-[34px] px-2.5 py-1 bg-[#1a100e] border border-[#5c3a28] rounded text-[11px] font-bold text-[#e2cfa9] cursor-pointer"
                  >
                    Ticket
                  </button>
                </div>
              </div>

              {servingTray.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1.5 border-t border-[#422a1e]">
                  {servingTray.map((loaf) => {
                    const recName = loaf.matchedRecipeId
                      ? BREAD_RECIPES[loaf.matchedRecipeId].name
                      : 'Loaf';
                    return (
                      <button
                        key={loaf.id}
                        onClick={() => handleServeLoaf(loaf)}
                        className="min-h-[42px] px-3.5 py-1.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white text-xs font-bold rounded border border-[#225954] pixel-btn cursor-pointer"
                      >
                        Serve {recName} →
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Station Step Tabs */}
          <div className="grid grid-cols-5 bg-[#1a100e] border-b-2 border-[#422a1e] text-[11px] sm:text-xs font-pixel-ui">
            {(
              [
                { id: 'shelf', label: '1. Shelf', shortLabel: '1.Shelf', badge: bowlIngredients.length },
                { id: 'knead', label: '2. Knead', shortLabel: '2.Knead', badge: kneadingDough ? 1 : 0 },
                { id: 'rest', label: '3. Rest', shortLabel: '3.Rest', badge: restingSlots.length },
                { id: 'shape', label: '4. Shape', shortLabel: '4.Shape', badge: shapingBatch ? 1 : 0 },
                { id: 'oven', label: '5. Oven', shortLabel: '5.Oven', badge: ovenSlot || readyToBakeBatch ? 1 : 0 },
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
                  className={`min-h-[48px] py-2.5 px-1 text-center cursor-pointer border-r border-[#2e1c16] last:border-r-0 transition-colors whitespace-nowrap truncate ${
                    active
                      ? 'bg-[#e59f2c] text-[#1c110c] font-bold'
                      : 'text-[#cbb596] hover:bg-[#2a1b16] hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge > 0 ? ` (${tab.badge})` : ''}
                </button>
              );
            })}
          </div>

          {/* Active Station Panel */}
          <div className="p-3.5 sm:p-5 min-h-[370px] flex flex-col justify-between">
            {/* STATION 1: INGREDIENT SHELF */}
            {station === 'shelf' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    STATION 1 · INGREDIENT SHELF
                  </h3>
                  <span className="text-xs text-[#cbb596]">Tap to add/remove in bowl</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {INGREDIENTS.map((ing) => {
                    const selected = bowlIngredients.includes(ing.id);
                    return (
                      <button
                        key={ing.id}
                        onClick={() => handleAddIngredient(ing.id)}
                        className={`min-h-[60px] p-2 rounded border-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all pixel-btn ${
                          selected
                            ? 'bg-[#2a4a45] border-[#52b8ad] text-white'
                            : 'bg-[#1b110f] hover:bg-[#2c1d18] border-[#4a3024] text-[#f4e8c1]'
                        }`}
                      >
                        <IngredientIcon id={ing.id} size={26} />
                        <span className="text-[11px] font-bold">{ing.shortName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mixing Bowl Summary */}
                <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#cbb596]">
                      In Mixing Bowl ({bowlIngredients.length}):
                    </span>
                    {bowlIngredients.length > 0 && (
                      <button
                        onClick={() => {
                          sound.playButtonClick();
                          setBowlIngredients([]);
                        }}
                        className="text-[#e37266] hover:underline cursor-pointer"
                      >
                        Clear Bowl
                      </button>
                    )}
                  </div>

                  {bowlIngredients.length === 0 ? (
                    <div className="text-xs text-[#7c614c] py-1">
                      Empty ceramic bowl — select ingredients above (open Recipe Book if unsure!).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bowlIngredients.map((id) => {
                        const ing = INGREDIENTS.find((i) => i.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => handleAddIngredient(id)}
                            className="inline-flex items-center gap-1 bg-[#2a1b16] hover:bg-[#422a1e] border border-[#5c3a28] px-2 py-1 rounded text-xs cursor-pointer"
                            title="Click to remove"
                          >
                            <IngredientIcon id={id} size={14} />
                            <span>{ing?.shortName}</span>
                            <span className="text-[#e37266] ml-0.5">×</span>
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
                    Knead Dough →
                  </button>
                </div>
              </div>
            )}

            {/* STATION 2: KNEADING BOARD */}
            {station === 'knead' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    STATION 2 · KNEADING BOARD
                  </h3>
                  <span className="text-xs text-[#cbb596]">Tap KNEAD or press Spacebar</span>
                </div>

                {!kneadingDough ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">
                      No dough on the wooden board yet. Mix ingredients at Station 1 first!
                    </p>
                    <button
                      onClick={() => setStation('shelf')}
                      className="px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      Go to Ingredient Shelf
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Dough Visual + Stats */}
                    <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-4 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-24 h-16 bg-[#f2e2c4] border-4 border-[#6e4c2e] rounded-full flex items-center justify-center transition-transform"
                          style={{
                            transform: `scale(${1 + Math.min(3, kneadingDough.hits) * 0.04})`,
                          }}
                        >
                          <span className="font-pixel-display text-[10px] text-[#5e3c23]">
                            {kneadingDough.hits}/3
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div>
                            Kneads: <strong>{kneadingDough.hits} / 3</strong>
                          </div>
                          <div>
                            Quality:{' '}
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
                                ? 'Smooth & Silky!'
                                : kneadQualityPreview === 'over'
                                ? 'Over-kneaded (Tough!)'
                                : 'Needs more kneading'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Timing Bar */}
                      <div className="w-full space-y-1.5">
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
                        <div className="text-center text-[11px] text-[#cbb596]">
                          Aim for the teal zone — stop at 3 kneads so you do not overwork it!
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleKneadTap}
                        className="min-h-[52px] py-3.5 bg-[#e59f2c] hover:bg-[#f2ae3b] text-[#1c110c] font-pixel-display text-xs rounded border-2 border-[#8c5a12] pixel-btn flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Hand className="w-4 h-4" />
                        <span>KNEAD!</span>
                      </button>

                      <button
                        onClick={handleFinishKneading}
                        className="min-h-[52px] py-3.5 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui font-bold text-xs rounded border-2 border-[#225954] pixel-btn cursor-pointer"
                      >
                        Rest Dough →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STATION 3: DOUGH REST */}
            {station === 'rest' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    STATION 3 · DOUGH REST ({restingSlots.length}/{maxRestSlots})
                  </h3>
                  <span className="text-xs text-[#cbb596]">Wait until puffed!</span>
                </div>

                {restingSlots.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">
                      No doughs proofing right now. You can prep dough at Stations 1 &amp; 2!
                    </p>
                    <button
                      onClick={() => setStation('shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      Mix New Batch
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

                      return (
                        <div
                          key={slot.id}
                          className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3 flex flex-col sm:flex-row items-center gap-4"
                        >
                          <SleepingDoughSprite done={isDone} />

                          <div className="flex-1 w-full space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#f4e8c1]">
                                {slot.suggestedRecipeId
                                  ? `${BREAD_RECIPES[slot.suggestedRecipeId].name} Dough`
                                  : 'Artisan Dough'}
                              </span>
                              <span className="tabular-nums text-[#7cc4e0]">{pct}%</span>
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
                                  Shape Dough →
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSendToShape(slot, true)}
                                  className="min-h-[44px] w-full py-2.5 bg-[#5c3a28] hover:bg-[#704731] text-[#f4e8c1] text-xs rounded border border-[#3d261a] pixel-btn cursor-pointer"
                                >
                                  Skip Rest Early (Makes Dense Bread!)
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-[11px] text-[#a88d73] text-center">
                  Tip: Resting dough continues ticking in the background if you switch back to Shelf!
                </div>
              </div>
            )}

            {/* STATION 4: SHAPING */}
            {station === 'shape' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    STATION 4 · SHAPING BOARD
                  </h3>
                  <span className="text-xs text-[#cbb596]">Pick exact bread silhouette</span>
                </div>

                {!shapingBatch ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">
                      No dough ready to shape. Check Station 3 (Rest) or start a fresh dough!
                    </p>
                    <button
                      onClick={() => setStation(restingSlots.length > 0 ? 'rest' : 'shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      {restingSlots.length > 0 ? 'Check Resting Dough' : 'Go to Shelf'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SHAPES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handlePickShape(s.id)}
                        className="min-h-[58px] p-3 bg-[#1b110f] hover:bg-[#2c1d18] border-2 border-[#4d3023] hover:border-[#f5c542] rounded flex items-center gap-3 cursor-pointer pixel-btn text-left"
                      >
                        <div className="w-12 h-12 bg-[#2a1b16] border border-[#5c3a28] rounded flex items-center justify-center shrink-0">
                          <ShapeIcon id={s.id} size={36} />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#f4e8c1]">{s.name}</div>
                          <div className="text-[11px] text-[#cbb596]">{s.hint}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STATION 5: OVEN & TANDOOR */}
            {station === 'oven' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="font-pixel-display text-xs text-[#f5c542]">
                    STATION 5 · OVEN &amp; TANDOOR
                  </h3>
                  <span className="text-xs text-[#cbb596]">Pull out at golden zone!</span>
                </div>

                {!ovenSlot && !readyToBakeBatch && (
                  <div className="flex-1 flex flex-col items-center justify-center bg-[#1a100e] border border-dashed border-[#4d3023] rounded p-6 text-center gap-3">
                    <p className="text-xs text-[#cbb596]">
                      Hearth is hot and empty! Shape a rested dough at Station 4 to bake.
                    </p>
                    <button
                      onClick={() => setStation(shapingBatch ? 'shape' : 'shelf')}
                      className="min-h-[44px] px-4 py-2 bg-[#e59f2c] text-[#1c110c] font-bold text-xs rounded pixel-btn cursor-pointer"
                    >
                      Prep Next Loaf
                    </button>
                  </div>
                )}

                {!ovenSlot && readyToBakeBatch && (
                  <div className="space-y-4">
                    <div className="bg-[#1a100e] border-2 border-[#422a1e] rounded p-3.5 text-xs space-y-2">
                      <div className="font-bold text-[#f4e8c1]">
                        Shaped Loaf Ready for Hearth ({readyToBakeBatch.shape.replace('_', ' ')})
                      </div>
                      <div className="text-[#cbb596]">Select the right oven type for this bread:</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {OVENS.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => {
                              sound.playButtonClick();
                              setSelectedOven(o.id);
                            }}
                            className={`min-h-[56px] p-3 rounded border-2 text-left cursor-pointer transition-colors ${
                              selectedOven === o.id
                                ? 'bg-[#3b2016] border-[#f5c542] text-white'
                                : 'bg-[#241714] border-[#4d3023] text-[#cbb596]'
                            }`}
                          >
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <Flame className="w-4 h-4 text-[#ff8f2b]" />
                              <span>{o.name}</span>
                            </div>
                            <div className="text-[11px] opacity-80 mt-0.5">{o.subtitle}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handlePutInOven}
                      className="min-h-[48px] w-full py-3.5 bg-[#d95f3b] hover:bg-[#e86d48] text-white font-pixel-display text-xs rounded border-2 border-[#7c2e16] pixel-btn cursor-pointer"
                    >
                      Put In {selectedOven === 'tandoor' ? 'Stone Tandoor' : 'Brick Oven'}!
                    </button>
                  </div>
                )}

                {ovenSlot && (
                  <div className="space-y-4">
                    <div className="bg-[#1a100e] border-2 border-[#5c3a28] rounded p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#ffae52] flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          {ovenSlot.ovenType === 'tandoor' ? 'Stone Tandoor Baking...' : 'Brick Oven Baking...'}
                        </span>
                        <span className="font-pixel-display text-[10px] text-[#f5c542]">
                          {getOvenZoneLabel()}
                        </span>
                      </div>

                      {/* Color-changing bake gauge */}
                      <div className="relative w-full h-10 bg-[#2b1b17] border-2 border-[#5c3a28] rounded overflow-hidden">
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

                      <div className="flex justify-between text-[10px] text-[#cbb596]">
                        <span>Raw Dough</span>
                        <span className="text-[#f5c542] font-bold text-center">Golden Zone (Well Done = Right)</span>
                        <span className="text-[#e37266]">Burnt!</span>
                      </div>
                    </div>

                    <button
                      onClick={handlePullFromOven}
                      className="min-h-[54px] w-full py-4 bg-[#f5c542] hover:bg-[#ffd561] text-[#1c110c] font-pixel-display text-xs sm:text-sm rounded border-2 border-[#94680d] pixel-btn cursor-pointer"
                    >
                      PULL IT OUT!
                    </button>
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
            <h2 className="font-pixel-display text-base text-[#f5c542]">SHIFT PAUSED</h2>
            <p className="font-pixel-ticket text-xl text-[#e2cfa9]">
              Take a breather, {saveData.bakerLook.name || 'Ostad Baker'}! The ovens are waiting on Day {saveData.day}.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setPhase('PLAYING')}
                className="min-h-[44px] w-full py-3 bg-[#3b8c84] hover:bg-[#46a39a] text-white font-pixel-ui text-xs rounded border border-[#225954] pixel-btn cursor-pointer"
              >
                Resume Shift
              </button>
              <button
                onClick={() => {
                  sound.stopMusic();
                  setPhase('LOBBY');
                }}
                className="min-h-[44px] w-full py-2.5 bg-[#6e2424] hover:bg-[#8a2e2e] text-white font-pixel-ui text-xs rounded border border-[#451313] pixel-btn cursor-pointer"
              >
                Back to Bakery Lobby
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
          onClose={() => setShowRecipes(false)}
        />
      )}
      {showShopModal && (
        <ShopModal
          summary={daySummary}
          saveData={saveData}
          onBuyUpgrade={handleBuyUpgrade}
          onStartNextDay={() => startDayShift(saveData.day)}
          onRetryDay={() => startDayShift(saveData.day)}
        />
      )}
      {showBakerCustomize && (
        <BakerCustomizeModal
          look={saveData.bakerLook}
          onChange={(nextLook) => setSaveData((prev) => ({ ...prev, bakerLook: nextLook }))}
          onClose={() => {
            setSaveData((prev) => ({
              ...prev,
              bakerLook: {
                ...prev.bakerLook,
                name: prev.bakerLook.name.trim() || 'Ostad Baker',
              },
            }));
            setShowBakerCustomize(false);
          }}
        />
      )}
    </div>
  );
};
