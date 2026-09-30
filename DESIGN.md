---
name: Radar SECOP - Impeccable Design System
description: Neo Kinpaku & Verdigris system tailored for Radar SECOP. Two distinct brand worlds: Verdigris Patina for NIKADU IA, and Kinpaku Gold for CERABELA, resting on dark warm-black lacquer. Restraint in chrome, brilliance in typography and texture. Neutral elevation without artificial halos.
colors:
  # Surfaces (Lacquer)
  lacquer-black: "oklch(7% 0.006 95)"          # #090c13 - Deep background ground
  lacquer-deep: "oklch(4% 0.004 95)"           # #05070a - Inset inputs & code
  raised-lacquer: "oklch(11% 0.006 95)"        # #101522 - Cards, sheets, panels
  surface-hover: "oklch(14% 0.008 95)"         # #161e2f - Interactive hover state
  hairline: "oklch(78% 0 0 / 0.10)"            # Razor-sharp structural boundary
  hairline-strong: "oklch(80% 0 0 / 0.20)"     # Focused / active border
  scrollbar-thumb: "oklch(25% 0.01 95)"        # Subtle dark lacquer scrollbar thumb
  scrollbar-thumb-hover: "oklch(35% 0.01 95)"  # Scrollbar thumb hover

  # Brand NIKADU IA (Verdigris Patina & Tech Precision)
  verdigris-patina: "oklch(72% 0.14 185)"      # Primary accent for IA
  verdigris-pale: "oklch(84% 0.08 185 / 0.12)" # Subtle surface tint for IA
  verdigris-deep: "oklch(50% 0.10 185)"        # Border against dark background

  # Brand CERABELA (Kinpaku Gold & Warm Amber)
  kinpaku-gold: "oklch(84% 0.19 80.46)"        # Primary accent for candles & craft
  kinpaku-pale: "oklch(86% 0.07 84 / 0.14)"    # Subtle warm surface tint for CERABELA
  kinpaku-deep: "oklch(62% 0.12 80)"           # Border against dark background

  # Unified & Communication Accent
  tech-cyan: "oklch(75% 0.14 220)"             # Telegram & unified actions
  tech-cyan-pale: "oklch(75% 0.14 220 / 0.12)" # Subtle tint for telegram button
  tech-cyan-deep: "oklch(75% 0.14 220 / 0.25)" # Border for telegram button

  # Text & High Contrast
  champagne: "oklch(95% 0 0)"                  # Primary headings, numbers
  text-warm: "oklch(88% 0 0)"                  # Body text
  text-muted: "oklch(68% 0 0)"                 # Secondary metadata
  text-faint: "oklch(65% 0 0)"                 # Subdued captions with >=4.5:1 WCAG AA contrast

  # Semantic States
  success: "oklch(72% 0.16 145)"               # Verified / Active
  warning: "oklch(82% 0.16 80)"                # Pending / Review / Star
  danger: "oklch(62% 0.22 25)"                 # Error / Discarded
---

# Impeccable Design Guidelines: Radar SECOP

## 1. Ergonomía Móvil y Touch Targets
- Todo botón, control táctil, selector y elemento interactivo cuenta con una altura mínima de **44px** para manipulación con una sola mano en pantallas de smartphones.
- Padding inferior respetando las zonas seguras (`env(safe-area-inset-bottom)`).

## 2. Tipografía & Cifras Numéricas
- Cifras de presupuesto en pesos colombianos ($ COP) estilizadas con `font-variant-numeric: tabular-nums` para alineación perfecta y legibilidad financiera instantánea.
- Proporciones tipográficas fluidas sin saltos arbitrarios.

## 3. Identidad Bimodal (NIKADU IA vs. CERABELA)
- **Modo NIKADU IA:** Acentos Verdigris Patina / Esmeralda. Simboliza precisión, analítica y autonomía tecnológica.
- **Modo CERABELA:** Acentos Kinpaku Gold / Ámbar. Simboliza artesanía fina, calidez de cera de abejas/soya y maestría manual.

## 4. Iconografía Vectorial Limpia (SVG)
- Reemplazo absoluto de caracteres emoji de sistema por iconos vectoriales SVG limpios, dibujados con trazo uniforme (1.75px stroke, rounded caps/joins).

## 5. Elevación Honesta
- Sin halos de colores artificiales (glow shadows). Elevación sutil con sombras neutras y bordes hairline de 1px.
