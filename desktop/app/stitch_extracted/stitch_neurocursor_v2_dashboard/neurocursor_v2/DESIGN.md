---
name: NeuroCursor V2
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#f5fff3'
  on-secondary: '#00391d'
  secondary-container: '#27ff97'
  on-secondary-container: '#00723f'
  tertiary: '#fcf5ff'
  on-tertiary: '#3c0091'
  tertiary-container: '#e2d4ff'
  on-tertiary-container: '#6f3cd8'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#5bffa1'
  secondary-fixed-dim: '#00e383'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#00522c'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin: 40px
  container-max: 1440px
---

## Brand & Style

This design system is engineered for a high-performance AI hand-tracking interface. The brand personality is sophisticated, precise, and technologically advanced. It moves away from "sci-fi trope" aesthetics toward a refined, production-ready **Modern Glassmorphism** style. 

The visual language emphasizes transparency, depth, and luminosity to mimic a digital overlay or a heads-up display (HUD). It targets professional users who require a low-friction, high-fidelity control center that feels like an extension of their own biology. The emotional response is one of calm empowerment and seamless technical fluidity.

## Colors

The palette is anchored in high-density blacks to provide a "void" depth, allowing interactive elements to appear as if they are floating. 

- **Primary (Electric Cyan):** Used for active tracking states, primary cursors, and essential interactive triggers.
- **Secondary (Neural Green):** Reserved for system health, successful gesture recognition, and "ready" states.
- **Tertiary (Soft Violet):** Used for background data visualizations, AI processing indicators, and secondary depth layers.
- **Neutral/Surface:** Deep Charcoal (#121214) provides the base for glass containers, while Deep Black (#0A0A0B) is used for the global background.

Apply 1px glowing borders using 15-20% opacity of the primary or secondary colors to simulate light leakage at the edges of glass panels.

## Typography

The typographic hierarchy balances technical precision with modern legibility. 

- **Display & Headlines:** Use **Geist** for its clinical, developer-centric aesthetic. Tighten letter spacing on larger sizes to maintain a "machined" look.
- **Body:** **Inter** provides maximum readability for settings and instructional text, ensuring the interface remains accessible despite the dark aesthetic.
- **Data & Metadata:** **JetBrains Mono** is used for coordinate data, AI confidence scores, and system logs to reinforce the professional, high-tech nature of the tool.

All headers should be set in High-Contrast White (#FFFFFF), while body text should sit at a slightly lower contrast (Zinc/A1A1AA) to reduce eye strain in dark environments.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a strict 4px baseline rhythm. 

- **Desktop:** A 12-column grid with 24px gutters. Use wide margins (40px+) to create a "floating" effect for the central UI.
- **Structure:** Content is organized into "Modules" or "Pods." Each pod should have a dynamic height based on content but adhere to fixed width increments (e.g., 4-column span).
- **Responsive:** On tablet/mobile, the grid collapses to 6/4 columns. Surface transparency should increase as screen size decreases to maintain depth without clutter.
- **Negative Space:** Use generous internal padding within glass containers (typically 24px or 32px) to ensure the high-tech elements don't feel claustrophobic.

## Elevation & Depth

Depth in this design system is achieved through **Glassmorphism and Tonal Layering** rather than traditional shadows.

1. **Base Layer:** Pure Deep Black (#0A0A0B).
2. **Glass Surfaces:** Semi-transparent Deep Charcoal (#121214 at 60-80% opacity) with a `backdrop-filter: blur(20px)`.
3. **Stroke/Rim Light:** 1px solid border. Use a linear gradient for the border (Top-Left: White 20%, Bottom-Right: Transparent) to simulate a light source.
4. **Interaction Glow:** Active elements use a `box-shadow` with a large blur (20-40px) and very low opacity (10%) in the color of the element (e.g., Cyan) to create an atmospheric bloom.

## Shapes

The shape language is "Functional-Geometric." While corners are rounded to feel modern and premium, they are not "bubbly."

- **Standard Containers:** 16px radius (`rounded-lg`).
- **Interactive Elements (Buttons, Inputs):** 12px radius.
- **System Indicators:** Small 4px radius for a sharper, more technical feel.

Avoid 100% circular "pill" shapes except for toggle switches, as they lean too far into casual/playful territory.

## Components

### Buttons
- **Primary:** Gradient background (Cyan to Blue-Violet), white text, 1px inner glow.
- **Ghost:** Transparent background, 1px Cyan border at 30% opacity, 100% Cyan text.

### Inputs & Sliders
- **Inputs:** Darker than the surface layer, 1px border that illuminates to 100% Cyan on focus.
- **Sliders:** The track is a thin 2px line. The "thumb" is a high-contrast glowing white circle with a Cyan outer bloom.

### Lists & Cells
- Use thin 1px dividers in Zinc/800. Hovering over a list item should trigger a subtle 5% white overlay to indicate selection potential.

### Cards (Glass Pods)
- Cards are the primary container. They must feature the 20px backdrop blur and the 1px rim light. No drop shadows; use the "bloom" effect for active/high-priority cards.

### AI Status Chips
- Small, uppercase JetBrains Mono text. Include a 6px "breathing" dot (Neural Green) to indicate the AI is actively processing hand-tracking data.