/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BakerLookConfig,
  BreadId,
  BreadOutcomeQuality,
  BreadShapeId,
  CustomerExpression,
  CustomerTypeDef,
  IngredientId,
  WeatherType,
} from './types';

// ============================================================================
// 1. PIXEL-ART BREAD SPRITE (supports all 9 breads + burnt/raw/dense/toppings)
// ============================================================================
interface BreadSpriteProps {
  breadId: BreadId | null;
  shape?: BreadShapeId;
  outcome?: BreadOutcomeQuality;
  hasSesame?: boolean;
  hasNigella?: boolean;
  isWellDone?: boolean;
  size?: number;
  showSteam?: boolean;
}

export const BreadSprite: React.FC<BreadSpriteProps> = ({
  breadId,
  shape,
  outcome = 'perfect',
  hasSesame = false,
  hasNigella = false,
  isWellDone = false,
  size = 56,
  showSteam = false,
}) => {
  const effectiveShape: BreadShapeId = shape || (
    breadId === 'sangak' || breadId === 'barbari' || breadId === 'saffron_barbari'
      ? 'flat_oval'
      : breadId === 'baguette'
      ? 'long_baguette'
      : breadId === 'lavash'
      ? 'thin_sheet'
      : breadId === 'croissant' || breadId === 'baklava_roll'
      ? 'crescent'
      : 'round'
  );

  // Palette based on bake outcome (and rare saffron sheen for specialty breads)
  let outline = '#3d2210';
  let crustDark = '#b86c21';
  let crustMid = '#df9a38';
  let crustLight = '#f6cc68';
  let crumb = '#fae5a5';

  if (
    outcome === 'perfect' &&
    (breadId === 'saffron_barbari' || breadId === 'baklava_roll' || breadId === 'royal_brioche')
  ) {
    crustDark = '#c97a16';
    crustMid = '#f2ab29';
    crustLight = '#ffe066';
    crumb = '#fff3b8';
  }

  if (outcome === 'raw') {
    outline = '#8e7c62';
    crustDark = '#cbb898';
    crustMid = '#e4d4b4';
    crustLight = '#f6ebd5';
    crumb = '#fdf6e7';
  } else if (outcome === 'burnt') {
    outline = '#0e0a0a';
    crustDark = '#1c1716';
    crustMid = '#2d2523';
    crustLight = '#453936';
    crumb = '#362d2a';
  } else if (isWellDone) {
    outline = '#2d1609';
    crustDark = '#8b4614';
    crustMid = '#be6d22';
    crustLight = '#e59e40';
    crumb = '#f2ce7e';
  } else if (outcome === 'salty') {
    crustMid = '#d2c28a';
    crustLight = '#f0e7be';
  } else if (outcome === 'dense') {
    crustDark = '#8a5828';
    crustMid = '#b07b42';
    crustLight = '#cfa068';
  }

  const isDense = outcome === 'dense';
  const showSeedsSesame =
    hasSesame ||
    breadId === 'barbari' ||
    breadId === 'taftoon' ||
    breadId === 'saffron_barbari' ||
    breadId === 'baklava_roll';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Rising pixel steam or smoke */}
      {(showSteam || outcome === 'burnt') && outcome !== 'raw' && (
        <svg
          viewBox="0 0 16 8"
          width={size * 0.75}
          height={size * 0.35}
          shapeRendering="crispEdges"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 pointer-events-none animate-steam"
        >
          <rect x="3" y="4" width="2" height="3" fill={outcome === 'burnt' ? '#5e5654' : '#ffffff'} opacity="0.75" />
          <rect x="7" y="1" width="2" height="4" fill={outcome === 'burnt' ? '#403836' : '#ffffff'} opacity="0.85" />
          <rect x="11" y="3" width="2" height="3" fill={outcome === 'burnt' ? '#5e5654' : '#ffffff'} opacity="0.7" />
        </svg>
      )}

      {/* Golden sparkle pixels on perfect bread */}
      {outcome === 'perfect' && showSteam && (
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          shapeRendering="crispEdges"
          className="absolute inset-0 pointer-events-none"
        >
          <rect x="2" y="3" width="1" height="3" fill="#ffe66d" />
          <rect x="1" y="4" width="3" height="1" fill="#ffe66d" />
          <rect x="20" y="5" width="1" height="3" fill="#fff6a3" />
          <rect x="19" y="6" width="3" height="1" fill="#fff6a3" />
        </svg>
      )}

      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="pixel-art"
        style={isDense ? { transform: 'scaleY(0.72) translateY(3px)' } : undefined}
      >
        {effectiveShape === 'flat_oval' && (
          <g>
            {/* Sangak / Barbari elongated oval flatbread */}
            <rect x="4" y="6" width="16" height="12" fill={outline} />
            <rect x="3" y="8" width="18" height="8" fill={outline} />
            <rect x="4" y="7" width="16" height="10" fill={crustDark} />
            <rect x="4" y="8" width="16" height="8" fill={crustMid} />
            <rect x="6" y="9" width="12" height="5" fill={crustLight} />
            {/* Pebble dimples for Sangak OR ridges for Barbari / Saffron Barbari */}
            {breadId === 'barbari' || breadId === 'saffron_barbari' ? (
              <>
                <rect x="6" y="10" width="12" height="1" fill={crustDark} />
                <rect x="6" y="13" width="12" height="1" fill={crustDark} />
                {breadId === 'saffron_barbari' && outcome !== 'burnt' && (
                  <>
                    <rect x="8" y="11" width="3" height="1" fill="#e63946" />
                    <rect x="13" y="12" width="2" height="1" fill="#e63946" />
                  </>
                )}
              </>
            ) : (
              <>
                <rect x="7" y="10" width="2" height="2" fill={crustDark} />
                <rect x="12" y="9" width="2" height="2" fill={crustDark} />
                <rect x="15" y="12" width="2" height="2" fill={crustDark} />
                <rect x="9" y="13" width="2" height="1" fill={crustDark} />
              </>
            )}
          </g>
        )}

        {effectiveShape === 'round' && (
          <g>
            {/* White loaf / Taftoon / Pita / Nan-e Khamei / Royal Brioche */}
            <rect x="6" y="5" width="12" height="14" fill={outline} />
            <rect x="4" y="7" width="16" height="10" fill={outline} />
            <rect x="6" y="6" width="12" height="12" fill={crustDark} />
            <rect x="5" y="8" width="14" height="8" fill={crustMid} />
            <rect x="7" y="7" width="10" height="7" fill={crustLight} />
            {breadId === 'nane_khamei' ? (
              /* Cream puff dollop & sugar glaze */
              <>
                <rect x="9" y="6" width="6" height="3" fill="#fffdf6" />
                <rect x="8" y="11" width="8" height="2" fill="#fff7e2" />
              </>
            ) : breadId === 'royal_brioche' ? (
              /* Braided crown & sugar pearl sheen */
              <>
                <rect x="9" y="5" width="6" height="2" fill={crustMid} />
                <rect x="7" y="9" width="10" height="1" fill={crustDark} />
                <rect x="8" y="12" width="8" height="1" fill={crustDark} />
                <rect x="10" y="7" width="4" height="2" fill="#fff7cc" />
              </>
            ) : breadId === 'taftoon' ? (
              /* Pricked dot pattern */
              <>
                <rect x="8" y="9" width="1" height="1" fill={crustDark} />
                <rect x="12" y="9" width="1" height="1" fill={crustDark} />
                <rect x="15" y="9" width="1" height="1" fill={crustDark} />
                <rect x="10" y="12" width="1" height="1" fill={crustDark} />
                <rect x="14" y="12" width="1" height="1" fill={crustDark} />
              </>
            ) : breadId === 'pita' ? (
              /* Puffed pocket highlight */
              <rect x="8" y="8" width="7" height="4" fill={crumb} />
            ) : (
              /* Scored cross slash on country white loaf */
              <>
                <rect x="11" y="8" width="2" height="6" fill={crumb} />
                <rect x="9" y="10" width="6" height="2" fill={crumb} />
              </>
            )}
          </g>
        )}

        {effectiveShape === 'long_baguette' && (
          <g>
            {/* Diagonal crisp French Baguette */}
            <rect x="3" y="14" width="5" height="5" fill={outline} />
            <rect x="6" y="11" width="6" height="5" fill={outline} />
            <rect x="10" y="8" width="6" height="5" fill={outline} />
            <rect x="15" y="5" width="6" height="5" fill={outline} />

            <rect x="4" y="15" width="4" height="3" fill={crustDark} />
            <rect x="7" y="12" width="5" height="3" fill={crustMid} />
            <rect x="11" y="9" width="5" height="3" fill={crustMid} />
            <rect x="16" y="6" width="4" height="3" fill={crustDark} />

            <rect x="7" y="12" width="4" height="2" fill={crustLight} />
            <rect x="11" y="9" width="4" height="2" fill={crustLight} />
            <rect x="15" y="7" width="3" height="2" fill={crustLight} />
            {/* Slashes */}
            <rect x="8" y="12" width="2" height="1" fill={crumb} />
            <rect x="12" y="9" width="2" height="1" fill={crumb} />
            <rect x="16" y="7" width="2" height="1" fill={crumb} />
          </g>
        )}

        {effectiveShape === 'thin_sheet' && (
          <g>
            {/* Folded/layered thin Lavash sheet */}
            <rect x="3" y="8" width="18" height="9" fill={outline} />
            <rect x="4" y="9" width="16" height="7" fill={crustDark} />
            <rect x="4" y="9" width="16" height="5" fill={crustLight} />
            <rect x="5" y="14" width="14" height="1" fill={crustMid} />
            {/* Toasted blisters */}
            <rect x="6" y="10" width="2" height="1" fill={crustDark} />
            <rect x="11" y="11" width="2" height="1" fill={crustDark} />
            <rect x="15" y="10" width="2" height="1" fill={crustDark} />
            <rect x="8" y="12" width="2" height="1" fill={crustDark} />
          </g>
        )}

        {effectiveShape === 'crescent' && (
          <g>
            {/* Flaky golden Croissant */}
            <rect x="6" y="7" width="12" height="5" fill={outline} />
            <rect x="4" y="10" width="16" height="6" fill={outline} />
            <rect x="3" y="13" width="5" height="4" fill={outline} />
            <rect x="16" y="13" width="5" height="4" fill={outline} />

            <rect x="7" y="8" width="10" height="4" fill={crustMid} />
            <rect x="5" y="11" width="14" height="4" fill={crustMid} />
            <rect x="4" y="14" width="3" height="2" fill={crustDark} />
            <rect x="17" y="14" width="3" height="2" fill={crustDark} />

            <rect x="8" y="8" width="8" height="3" fill={crustLight} />
            <rect x="9" y="9" width="1" height="5" fill={crustDark} />
            <rect x="14" y="9" width="1" height="5" fill={crustDark} />
            {breadId === 'baklava_roll' && outcome !== 'burnt' && (
              <>
                <rect x="10" y="8" width="4" height="1" fill="#fff099" />
                <rect x="7" y="12" width="10" height="1" fill="#ffe169" />
              </>
            )}
          </g>
        )}

        {/* Sesame Seed Specks */}
        {showSeedsSesame && outcome !== 'burnt' && (
          <g fill="#fff5d1">
            <rect x="7" y="9" width="1" height="1" />
            <rect x="10" y="11" width="1" height="1" />
            <rect x="14" y="10" width="1" height="1" />
            <rect x="16" y="12" width="1" height="1" />
            <rect x="11" y="8" width="1" height="1" />
          </g>
        )}

        {/* Nigella Seed Specks */}
        {(hasNigella || breadId === 'saffron_barbari' || breadId === 'royal_brioche') && (
          <g fill="#1b1822">
            <rect x="8" y="11" width="1" height="1" />
            <rect x="12" y="10" width="1" height="1" />
            <rect x="15" y="11" width="1" height="1" />
            <rect x="9" y="13" width="1" height="1" />
          </g>
        )}

        {/* Extra white salt crystals when ruined with salt */}
        {outcome === 'salty' && (
          <g fill="#ffffff">
            <rect x="7" y="10" width="1" height="1" />
            <rect x="11" y="12" width="1" height="1" />
            <rect x="15" y="9" width="1" height="1" />
            <rect x="13" y="13" width="1" height="1" />
          </g>
        )}
      </svg>
    </div>
  );
};

// ============================================================================
// 2. CUSTOMER PIXEL-ART AVATAR (6 personalities + 5 live expressions)
// ============================================================================
interface CustomerSpriteProps {
  customer: CustomerTypeDef;
  expression: CustomerExpression;
  isWalkingIn?: boolean;
  size?: number;
}

export const CustomerSprite: React.FC<CustomerSpriteProps> = ({
  customer,
  expression,
  isWalkingIn = false,
  size = 64,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`pixel-art ${isWalkingIn ? 'animate-bob-walk' : ''}`}
    >
      {/* Shoulders / Shirt */}
      <rect x="5" y="16" width="14" height="8" fill="#1d1412" />
      <rect x="6" y="17" width="12" height="7" fill={customer.shirtColor} />
      {/* Apron or collar accent */}
      <rect x="10" y="17" width="4" height="2" fill="#f5ead4" />

      {/* Head Outline */}
      <rect x="6" y="5" width="12" height="12" fill="#1d1412" />
      {/* Face Skin */}
      <rect x="7" y="7" width="10" height="9" fill={customer.skinColor} />

      {/* Hair */}
      <rect x="6" y="4" width="12" height="4" fill={customer.hairColor} />
      <rect x="6" y="7" width="2" height="3" fill={customer.hairColor} />
      <rect x="16" y="7" width="2" height="3" fill={customer.hairColor} />

      {/* Accessories */}
      {customer.accessory === 'toque' && (
        <g>
          <rect x="7" y="0" width="10" height="5" fill="#ffffff" />
          <rect x="6" y="2" width="12" height="3" fill="#e8e2d5" />
          <rect x="7" y="4" width="10" height="2" fill="#dcd5c6" />
        </g>
      )}
      {customer.accessory === 'beanie' && (
        <g>
          <rect x="6" y="3" width="12" height="3" fill="#c94b4b" />
          <rect x="8" y="1" width="8" height="2" fill="#a63636" />
          <rect x="10" y="0" width="4" height="1" fill="#f4e8c1" />
        </g>
      )}
      {customer.accessory === 'cap' && (
        <g>
          <rect x="6" y="3" width="12" height="3" fill="#e59f2c" />
          <rect x="14" y="5" width="5" height="1" fill="#b86c21" />
        </g>
      )}
      {customer.accessory === 'glasses' && (
        <g fill="#2d3436">
          <rect x="7" y="9" width="4" height="3" fill="none" stroke="#2d3436" strokeWidth="1" />
          <rect x="13" y="9" width="4" height="3" fill="none" stroke="#2d3436" strokeWidth="1" />
          <rect x="11" y="10" width="2" height="1" />
        </g>
      )}
      {customer.accessory === 'monocle' && (
        <g>
          <rect x="13" y="9" width="4" height="3" fill="none" stroke="#f5c542" strokeWidth="1" />
          <rect x="17" y="11" width="1" height="4" fill="#f5c542" />
        </g>
      )}
      {customer.accessory === 'camera' && (
        <g>
          <rect x="9" y="18" width="6" height="4" fill="#2c2c34" />
          <rect x="11" y="19" width="2" height="2" fill="#7ec8e3" />
        </g>
      )}

      {/* Eyes & Brows by Expression */}
      {expression === 'happy' && (
        <g>
          {/* Happy arched eyes */}
          <rect x="8" y="10" width="2" height="1" fill="#1d1412" />
          <rect x="14" y="10" width="2" height="1" fill="#1d1412" />
          {/* Rosy cheeks */}
          <rect x="7" y="12" width="2" height="1" fill="#ee8e8e" />
          <rect x="15" y="12" width="2" height="1" fill="#ee8e8e" />
          {/* Big Smile */}
          <rect x="10" y="13" width="4" height="1" fill="#1d1412" />
          <rect x="11" y="14" width="2" height="1" fill="#c93b3b" />
        </g>
      )}

      {expression === 'waiting' && (
        <g>
          <rect x="9" y="10" width="1" height="2" fill="#1d1412" />
          <rect x="14" y="10" width="1" height="2" fill="#1d1412" />
          <rect x="10" y="13" width="4" height="1" fill="#6d4c41" />
        </g>
      )}

      {expression === 'impatient' && (
        <g>
          <rect x="8" y="9" width="2" height="1" fill="#1d1412" />
          <rect x="14" y="9" width="2" height="1" fill="#1d1412" />
          <rect x="9" y="10" width="1" height="2" fill="#1d1412" />
          <rect x="14" y="10" width="1" height="2" fill="#1d1412" />
          <rect x="10" y="14" width="4" height="1" fill="#6d4c41" />
        </g>
      )}

      {expression === 'disgusted' && (
        <g>
          {/* X / Squint eyes + green tint */}
          <rect x="8" y="10" width="2" height="1" fill="#1d1412" />
          <rect x="14" y="10" width="2" height="1" fill="#1d1412" />
          <rect x="7" y="12" width="2" height="1" fill="#82b366" />
          <rect x="15" y="12" width="2" height="1" fill="#82b366" />
          {/* Wavy disgusted mouth */}
          <rect x="9" y="14" width="2" height="1" fill="#1d1412" />
          <rect x="11" y="13" width="2" height="1" fill="#1d1412" />
          <rect x="13" y="14" width="2" height="1" fill="#1d1412" />
        </g>
      )}

      {expression === 'furious' && (
        <g>
          {/* Angry slanted brows */}
          <rect x="8" y="8" width="2" height="1" fill="#1d1412" />
          <rect x="10" y="9" width="1" height="1" fill="#1d1412" />
          <rect x="14" y="8" width="2" height="1" fill="#1d1412" />
          <rect x="13" y="9" width="1" height="1" fill="#1d1412" />
          <rect x="9" y="10" width="1" height="2" fill="#c93b3b" />
          <rect x="14" y="10" width="1" height="2" fill="#c93b3b" />
          {/* Frown */}
          <rect x="10" y="14" width="4" height="1" fill="#1d1412" />
          <rect x="9" y="15" width="1" height="1" fill="#1d1412" />
          <rect x="14" y="15" width="1" height="1" fill="#1d1412" />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 3. INGREDIENT PIXEL ICON
// ============================================================================
export const IngredientIcon: React.FC<{ id: IngredientId; size?: number }> = ({ id, size = 28 }) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" className="pixel-art">
      {id === 'flour' && (
        <g>
          <rect x="4" y="3" width="8" height="11" fill="#3a281d" />
          <rect x="5" y="4" width="6" height="9" fill="#efe2c4" />
          <rect x="6" y="2" width="4" height="2" fill="#d3be96" />
          <rect x="6" y="7" width="4" height="3" fill="#c9935b" />
        </g>
      )}
      {id === 'water' && (
        <g>
          <rect x="5" y="2" width="6" height="12" fill="#204054" />
          <rect x="6" y="3" width="4" height="10" fill="#82cbe6" />
          <rect x="6" y="3" width="4" height="2" fill="#eef9fd" />
          <rect x="7" y="6" width="1" height="5" fill="#bce8f7" />
        </g>
      )}
      {id === 'salt' && (
        <g>
          <rect x="5" y="4" width="6" height="10" fill="#2c3e50" />
          <rect x="6" y="5" width="4" height="8" fill="#f1f5f9" />
          <rect x="5" y="3" width="6" height="2" fill="#94a3b8" />
          <rect x="7" y="7" width="2" height="3" fill="#7aa6c2" />
        </g>
      )}
      {id === 'yeast' && (
        <g>
          <rect x="4" y="4" width="8" height="10" fill="#3d2717" />
          <rect x="5" y="5" width="6" height="8" fill="#d9a65d" />
          <rect x="6" y="7" width="4" height="4" fill="#f3d69b" />
          <rect x="6" y="2" width="4" height="2" fill="#734824" />
        </g>
      )}
      {id === 'sugar' && (
        <g>
          <rect x="4" y="4" width="8" height="10" fill="#52362a" />
          <rect x="5" y="5" width="6" height="8" fill="#fffaf0" />
          <rect x="6" y="7" width="4" height="4" fill="#e87a90" />
          <rect x="5" y="3" width="6" height="2" fill="#c97184" />
        </g>
      )}
      {id === 'sesame' && (
        <g>
          <rect x="3" y="6" width="10" height="7" fill="#3a281d" />
          <rect x="4" y="7" width="8" height="5" fill="#8e5a31" />
          <rect x="5" y="6" width="6" height="2" fill="#e6c281" />
          <rect x="6" y="5" width="4" height="2" fill="#f7e3b5" />
          <rect x="7" y="7" width="1" height="1" fill="#fff7dc" />
        </g>
      )}
      {id === 'nigella' && (
        <g>
          <rect x="3" y="6" width="10" height="7" fill="#18151c" />
          <rect x="4" y="7" width="8" height="5" fill="#6e5a49" />
          <rect x="5" y="5" width="6" height="3" fill="#2c2638" />
          <rect x="6" y="6" width="1" height="1" fill="#6b6380" />
          <rect x="9" y="6" width="1" height="1" fill="#6b6380" />
        </g>
      )}
      {id === 'oil' && (
        <g>
          <rect x="6" y="2" width="4" height="3" fill="#3d2f12" />
          <rect x="4" y="5" width="8" height="9" fill="#3d2f12" />
          <rect x="5" y="6" width="6" height="7" fill="#dfb734" />
          <rect x="6" y="7" width="2" height="4" fill="#f7df79" />
        </g>
      )}
      {id === 'butter' && (
        <g>
          <rect x="2" y="7" width="12" height="6" fill="#4f3915" />
          <rect x="3" y="8" width="10" height="4" fill="#f5d158" />
          <rect x="4" y="6" width="8" height="3" fill="#fae588" />
        </g>
      )}
      {id === 'milk' && (
        <g>
          <rect x="4" y="3" width="8" height="11" fill="#2c445c" />
          <rect x="5" y="4" width="6" height="9" fill="#f9fcff" />
          <rect x="5" y="7" width="6" height="3" fill="#6ca0d1" />
          <rect x="6" y="2" width="4" height="2" fill="#6ca0d1" />
        </g>
      )}
    </svg>
  );
};

// ============================================================================
// 4. SHAPE SELECTION ICON
// ============================================================================
export const ShapeIcon: React.FC<{ id: BreadShapeId; size?: number }> = ({ id, size = 34 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} shapeRendering="crispEdges" className="pixel-art">
    {id === 'flat_oval' && (
      <>
        <rect x="3" y="6" width="14" height="8" fill="#4f321b" />
        <rect x="4" y="7" width="12" height="6" fill="#e5b874" />
        <rect x="6" y="8" width="8" height="4" fill="#f6d89e" />
      </>
    )}
    {id === 'round' && (
      <>
        <rect x="5" y="4" width="10" height="12" fill="#4f321b" />
        <rect x="4" y="6" width="12" height="8" fill="#4f321b" />
        <rect x="5" y="5" width="10" height="10" fill="#e5b874" />
        <rect x="7" y="6" width="6" height="6" fill="#f6d89e" />
      </>
    )}
    {id === 'long_baguette' && (
      <>
        <rect x="2" y="13" width="5" height="4" fill="#4f321b" />
        <rect x="6" y="10" width="5" height="4" fill="#4f321b" />
        <rect x="10" y="7" width="5" height="4" fill="#4f321b" />
        <rect x="13" y="4" width="5" height="4" fill="#4f321b" />
        <rect x="3" y="14" width="3" height="2" fill="#e5b874" />
        <rect x="7" y="11" width="3" height="2" fill="#f6d89e" />
        <rect x="11" y="8" width="3" height="2" fill="#f6d89e" />
        <rect x="14" y="5" width="3" height="2" fill="#e5b874" />
      </>
    )}
    {id === 'thin_sheet' && (
      <>
        <rect x="2" y="7" width="16" height="6" fill="#4f321b" />
        <rect x="3" y="8" width="14" height="4" fill="#f6d89e" />
        <rect x="4" y="11" width="12" height="1" fill="#d19d58" />
      </>
    )}
    {id === 'crescent' && (
      <>
        <rect x="5" y="6" width="10" height="4" fill="#4f321b" />
        <rect x="3" y="9" width="14" height="5" fill="#4f321b" />
        <rect x="6" y="7" width="8" height="3" fill="#f6d89e" />
        <rect x="4" y="10" width="12" height="3" fill="#e5b874" />
      </>
    )}
  </svg>
);

// ============================================================================
// 5. SLEEPING DOUGH BLOB (for Station 3: Dough Rest)
// ============================================================================
export const SleepingDoughSprite: React.FC<{ done: boolean }> = ({ done }) => (
  <div className="relative inline-flex items-center justify-center w-24 h-20">
    {!done && (
      <div className="absolute -top-1 right-1 font-pixel-display text-[9px] text-[#7cc4e0] animate-steam">
        zZz
      </div>
    )}
    {done && (
      <div className="absolute -top-1 right-1 font-pixel-display text-[9px] text-[#5cd68d]">
        PUFFED!
      </div>
    )}
    <svg
      viewBox="0 0 24 18"
      width="84"
      height="64"
      shapeRendering="crispEdges"
      className="pixel-art animate-dough-sleep"
    >
      {/* Floured proofing cloth */}
      <rect x="2" y="13" width="20" height="4" fill="#c7b299" />
      <rect x="3" y="14" width="18" height="2" fill="#e6d7be" />

      {/* Dough blob */}
      <rect x="5" y={done ? 4 : 6} width="14" height={done ? 10 : 8} fill="#7d6448" />
      <rect x="4" y={done ? 6 : 8} width="16" height={done ? 8 : 6} fill="#7d6448" />
      <rect x="5" y={done ? 5 : 7} width="14" height={done ? 8 : 6} fill="#f4e6cc" />
      <rect x="7" y={done ? 6 : 8} width="10" height="4" fill="#fff7e6" />

      {/* Cute sleeping eyes */}
      {done ? (
        <>
          <rect x="8" y="9" width="2" height="2" fill="#4f3622" />
          <rect x="14" y="9" width="2" height="2" fill="#4f3622" />
          <rect x="11" y="11" width="2" height="1" fill="#d97777" />
        </>
      ) : (
        <>
          <rect x="8" y="10" width="2" height="1" fill="#4f3622" />
          <rect x="14" y="10" width="2" height="1" fill="#4f3622" />
          <rect x="11" y="11" width="2" height="1" fill="#c9847c" />
        </>
      )}
    </svg>
  </div>
);

// ============================================================================
// 6. COZY BAKERY SCENE BACKDROP (with shop decor + chaos event overlays)
// ============================================================================
interface BakerySceneDecor {
  plants: boolean;
  rug: boolean;
  neon: boolean;
  cat: boolean;
}

export const BakerySceneBackdrop: React.FC<{
  decor: BakerySceneDecor;
  powerOut: boolean;
  ovenActive: boolean;
  weather?: WeatherType;
}> = ({ decor, powerOut, ovenActive, weather = 'sunny' }) => {
  const skyColor =
    powerOut
      ? '#172336'
      : weather === 'rainy'
      ? '#4c6578'
      : weather === 'golden_hour'
      ? '#d98f4e'
      : weather === 'breezy'
      ? '#6da5c9'
      : '#7cb8d8';

  return (
    <div className="relative w-full h-full overflow-hidden rounded-t-md bg-[#2a1b16]">
      {/* Animated subtle flour motes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-[18%] top-[28%] w-1 h-1 bg-[#f9eed7] animate-flour-float" />
        <span className="absolute left-[54%] top-[18%] w-1 h-1 bg-[#f9eed7] animate-flour-float" style={{ animationDelay: '1.2s' }} />
        <span className="absolute left-[78%] top-[36%] w-1 h-1 bg-[#f9eed7] animate-flour-float" style={{ animationDelay: '2.4s' }} />
      </div>

      {/* Crisp SVG Cozy Bakery Wall, Shelves, Hearth & Purchased Decor */}
      <svg
        viewBox="0 0 160 56"
        preserveAspectRatio="none"
        className="w-full h-full pixel-art block"
        shapeRendering="crispEdges"
      >
        {/* Warm plaster wall */}
        <rect x="0" y="0" width="160" height="44" fill={powerOut ? '#1a1210' : '#432c22'} />
        {/* Brick texture patches */}
        <g fill={powerOut ? '#221714' : '#54382c'}>
          <rect x="10" y="8" width="8" height="3" />
          <rect x="20" y="8" width="8" height="3" />
          <rect x="14" y="12" width="8" height="3" />
          <rect x="120" y="10" width="9" height="3" />
          <rect x="131" y="10" width="8" height="3" />
          <rect x="125" y="14" width="9" height="3" />
        </g>

        {/* Window on left looking out to live weather sky */}
        <rect x="8" y="6" width="24" height="22" fill="#2d1c15" />
        <rect x="10" y="8" width="20" height="18" fill={skyColor} />
        {weather === 'sunny' && !powerOut && (
          <rect x="24" y="10" width="4" height="4" fill="#ffe66d" />
        )}
        {weather === 'golden_hour' && !powerOut && (
          <rect x="12" y="19" width="16" height="7" fill="#f5b858" opacity="0.6" />
        )}
        {(weather === 'sunny' || weather === 'breezy') && !powerOut && (
          <rect x="12" y="11" width="6" height="3" fill="#ffffff" opacity="0.65" />
        )}
        {weather === 'rainy' && (
          <g fill="#b8d9eb" opacity="0.8">
            <rect x="12" y="10" width="1" height="4" />
            <rect x="16" y="13" width="1" height="4" />
            <rect x="23" y="9" width="1" height="4" />
            <rect x="26" y="15" width="1" height="4" />
          </g>
        )}
        <rect x="19" y="8" width="2" height="18" fill="#3e261b" />
        <rect x="10" y="16" width="20" height="2" fill="#3e261b" />

        {/* Wooden shelf with jars & copper pans */}
        <rect x="38" y="18" width="44" height="2" fill="#6b422a" />
        <rect x="42" y="12" width="5" height="6" fill="#e6c281" />
        <rect x="49" y="11" width="5" height="7" fill="#d97a46" />
        <rect x="57" y="13" width="6" height="5" fill="#7cc4e0" />
        <rect x="66" y="10" width="9" height="8" fill="#ede0c8" />
        <rect x="68" y="12" width="5" height="4" fill="#b86c21" />

        {/* Glowing Brick Hearth / Tandoor on right */}
        <rect x="124" y="14" width="28" height="28" fill="#5e3a2d" />
        <rect x="128" y="18" width="20" height="20" fill="#241613" />
        <rect x="130" y="20" width="16" height="16" fill={ovenActive ? '#ff8f2b' : '#b8421a'} />
        <rect x="133" y="24" width="10" height="10" fill={ovenActive ? '#ffe066' : '#e06924'} />
        {ovenActive && <rect x="135" y="27" width="6" height="6" fill="#fff7b2" />}

        {/* Optional Decor: Warm Neon/Golden Bakery Sign */}
        {decor.neon && !powerOut && (
          <g>
            <rect x="86" y="7" width="32" height="11" fill="#1e1311" />
            <rect x="87" y="8" width="30" height="9" fill="#361c17" />
            <rect x="89" y="10" width="26" height="5" fill="#f5c542" opacity="0.9" />
            <rect x="91" y="11" width="22" height="3" fill="#fff4b8" />
          </g>
        )}

        {/* Optional Decor: Potted Rosemary Plants on windowsill & shelf */}
        {decor.plants && (
          <g>
            <rect x="16" y="25" width="6" height="4" fill="#b55936" />
            <rect x="15" y="21" width="8" height="4" fill="#4f9d69" />
            <rect x="17" y="19" width="4" height="2" fill="#72c488" />
            <rect x="76" y="14" width="5" height="4" fill="#b55936" />
            <rect x="75" y="10" width="7" height="4" fill="#4f9d69" />
          </g>
        )}

        {/* Wooden Countertop */}
        <rect x="0" y="42" width="160" height="4" fill="#784a2d" />
        <rect x="0" y="46" width="160" height="10" fill="#472b1c" />

        {/* Optional Decor: Persian Runner Rug on counter/floor */}
        {decor.rug && (
          <g>
            <rect x="46" y="47" width="68" height="8" fill="#8f2424" />
            <rect x="48" y="48" width="64" height="6" fill="#b8352f" />
            <rect x="52" y="49" width="56" height="4" fill="#e5b85c" />
            <rect x="56" y="50" width="48" height="2" fill="#2c6b66" />
          </g>
        )}

        {/* Optional Decor: Friendly Bakery Mascot Cat lounging on counter */}
        {decor.cat && (
          <g>
            <rect x="108" y="34" width="9" height="8" fill="#261712" />
            <rect x="109" y="35" width="7" height="6" fill="#e67e22" />
            <rect x="109" y="33" width="2" height="2" fill="#e67e22" />
            <rect x="114" y="33" width="2" height="2" fill="#e67e22" />
            <rect x="105" y="38" width="4" height="2" fill="#e67e22" />
            <rect x="110" y="37" width="1" height="1" fill="#1a181b" />
            <rect x="114" y="37" width="1" height="1" fill="#1a181b" />
            <rect x="112" y="38" width="1" height="1" fill="#c0392b" />
          </g>
        )}
      </svg>

      {/* Power Flicker Dark Dimmer Overlay */}
      {powerOut && (
        <div className="pointer-events-none absolute inset-0 bg-black/55 transition-opacity duration-200" />
      )}
    </div>
  );
};

// ============================================================================
// 7. CUSTOM PLAYER BAKER PIXEL AVATAR
// ============================================================================
export const BakerAvatarSprite: React.FC<{
  look: BakerLookConfig;
  size?: number;
}> = ({ look, size = 64 }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="pixel-art"
    >
      {/* Shoulders & Shirt */}
      <rect x="5" y="16" width="14" height="8" fill="#1d1412" />
      <rect x="6" y="17" width="12" height="7" fill="#f4ead5" />
      {/* Custom Apron */}
      <rect x="7" y="17" width="10" height="7" fill={look.apronColor} />
      <rect x="9" y="16" width="1" height="2" fill={look.apronColor} />
      <rect x="14" y="16" width="1" height="2" fill={look.apronColor} />
      <rect x="9" y="20" width="6" height="3" fill="#ffffff" opacity="0.22" />

      {/* Back Hair (for Bob, Ponytail, Waves) */}
      {(look.hairStyle === 'bob' || look.hairStyle === 'waves') && (
        <>
          <rect x="5" y="7" width="2" height="9" fill={look.hairColor} />
          <rect x="17" y="7" width="2" height="9" fill={look.hairColor} />
        </>
      )}
      {look.hairStyle === 'ponytail' && (
        <>
          <rect x="4" y="9" width="2" height="6" fill={look.hairColor} />
          <rect x="5" y="8" width="1" height="2" fill="#e59f2c" />
        </>
      )}

      {/* Head Outline & Skin */}
      <rect x="6" y="5" width="12" height="12" fill="#1d1412" />
      <rect x="7" y="7" width="10" height="9" fill={look.skinColor} />

      {/* Top & Side Hair */}
      <rect x="6" y="5" width="12" height="3" fill={look.hairColor} />
      {look.hairStyle === 'waves' && (
        <rect x="7" y="7" width="4" height="2" fill={look.hairColor} />
      )}
      {look.hairStyle === 'classic' && (
        <rect x="13" y="7" width="3" height="1" fill={look.hairColor} />
      )}
      <rect x="6" y="7" width="2" height="3" fill={look.hairColor} />
      <rect x="16" y="7" width="2" height="3" fill={look.hairColor} />

      {/* Headwear */}
      {look.hat === 'toque' && (
        <g>
          <rect x="7" y="0" width="10" height="5" fill="#ffffff" />
          <rect x="6" y="2" width="12" height="3" fill="#f3ebd9" />
          <rect x="7" y="4" width="10" height="2" fill="#dcd3be" />
        </g>
      )}
      {look.hat === 'beanie' && (
        <g>
          <rect x="6" y="3" width="12" height="3" fill="#d95f3b" />
          <rect x="8" y="1" width="8" height="2" fill="#b34424" />
          <rect x="10" y="0" width="4" height="1" fill="#f5c542" />
        </g>
      )}
      {look.hat === 'headband' && (
        <rect x="6" y="5" width="12" height="2" fill="#3b8c84" />
      )}
      {look.hat === 'cap' && (
        <g>
          <rect x="6" y="3" width="12" height="3" fill="#5c3a28" />
          <rect x="14" y="5" width="5" height="1" fill="#3e261a" />
        </g>
      )}

      {/* Eyes & Cheerful Smile */}
      <rect x="9" y="10" width="1" height="2" fill="#1d1412" />
      <rect x="14" y="10" width="1" height="2" fill="#1d1412" />
      <rect x="10" y="13" width="4" height="1" fill="#6d4c41" />

      {/* Facial Details */}
      {look.detail === 'rosy' && (
        <g fill="#ea8a8a">
          <rect x="7" y="12" width="2" height="1" />
          <rect x="15" y="12" width="2" height="1" />
        </g>
      )}
      {look.detail === 'flour_smudge' && (
        <g fill="#faf2e1">
          <rect x="14" y="12" width="2" height="1" />
          <rect x="15" y="11" width="1" height="1" />
        </g>
      )}
      {look.detail === 'glasses' && (
        <g>
          <rect x="7" y="9" width="4" height="3" fill="none" stroke="#2d3436" strokeWidth="1" />
          <rect x="13" y="9" width="4" height="3" fill="none" stroke="#2d3436" strokeWidth="1" />
          <rect x="11" y="10" width="2" height="1" fill="#2d3436" />
        </g>
      )}
    </svg>
  );
};
