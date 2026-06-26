---
name: NeuroPulse
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
  surface-glass: rgba(18, 18, 20, 0.7)
  glow-accent: rgba(0, 219, 231, 0.15)
  error-alert: '#ffb4ab'
  success-active: '#5bffa1'
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
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin: 40px
  container-max: 1440px
---

## Brand & Style

NeuroPulse is a high-performance, developer-centric interface designed for advanced motion tracking and neural processing. The brand personality is technical, futuristic, and precise, evoking the feel of a sophisticated command center.

The design style is a refined blend of **Glassmorphism** and **Minimalism**. It utilizes deep tonal layering, high-transparency frosted glass effects, and vibrant "glow" accents to guide the user's attention toward active data streams. The aesthetic is "dark-ops" inspired, prioritizing low-light comfort with sharp, high-contrast digital accents.

## Colors

The palette is anchored by a "Cyber Cyan" primary color, used for active states, data highlights, and interactive elements. The background is a sophisticated near-black (#0a0a0b), providing a high-contrast foundation for translucent layers.

- **Primary:** Used for main actions, active navigation states, and high-confidence data markers.
- **Secondary:** Reserved for "Ready" or "Active" system status indicators.
- **Surface Strategy:** Employs a hierarchy of dark grays. The base is deep, while containers use `surface-container-low` (for backgrounds) and `surface-container-high` (for elevated interactive cards).
- **Glass Effects:** Semi-transparent overlays use a 70% opacity base with a 20px blur to maintain legibility without sacrificing depth.

## Typography

The typographic system utilizes a trio of fonts to balance character with utility:
- **Geist (Display/Headlines):** Used for primary headings and brand elements. Its technical, clean structure reinforces the futuristic aesthetic.
- **Inter (Body):** The workhorse for descriptions and general content, chosen for its exceptional legibility in dark environments.
- **JetBrains Mono (Labels/Technical Data):** Used for all status readouts, confidence scores, and metadata. The monospaced nature emphasizes the "code-driven" essence of the platform.

Text shadows (glows) should be applied sparingly to `label-mono` elements when they represent real-time, active data streams.

## Layout & Spacing

The system uses a **Fluid Grid** with fixed outer margins to maintain a cinematic wide-screen appearance. 

- **Outer Margins:** A generous 40px margin ensures content feels centered and professional.
- **Internal Gutters:** 24px spacing between cards and major sections provides enough breathing room for glass effects to overlap visually without clutter.
- **Sidestrip Navigation:** A fixed 64px to 256px vertical navigation bar anchors the left side, providing consistent access to core engine controls.
- **Responsive Behavior:** On mobile, the layout collapses into a single-column scroll, and the top navigation bar prioritizes the system status and a compact "Live Feed" preview.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.

- **Level 0 (Background):** Deep black with a subtle neural-pattern shader.
- **Level 1 (Sub-Panels):** `surface-container-low` with 60% opacity and high blur. Used for sidebars and secondary navigation.
- **Level 2 (Main Workspace):** The primary content area, often featuring the live data feed.
- **Level 3 (Interactive Cards):** These use 1px "ghost borders" (semi-transparent white or primary color) and a more pronounced backdrop blur.
- **Active State Glow:** Elements in an "active" or "focused" state receive a soft, cyan-tinted outer glow (`0 0 30px rgba(0, 219, 231, 0.15)`).

## Shapes

The interface uses a "Soft" rounding strategy to balance technical sharpness with modern UI friendliness. 

- **Small Components (Chips/Badges):** Fully rounded (pill-shaped) to distinguish them as atomic status elements.
- **Medium Components (Buttons/Inputs):** 4px (0.25rem) radius for a precise, "machined" look.
- **Large Containers (Cards/Panels):** 12px (0.75rem) radius to soften the large workspace areas.
- **Visual Contrast:** High-precision items, like tracking nodes or crosshairs, should remain sharp (0px) or perfectly circular.

## Components

### Buttons
- **Primary:** Gradient-filled (Cyan to Purple) with dark text. High visibility for "Calibrate" or "Start" actions.
- **Ghost/Icon:** Transparent background with `on-surface-variant` colors, transitioning to `primary` on hover.

### Cards
- **Gesture Cards:** Glass containers with a 1px border. On hover, the border color shifts to Primary, and a subtle scale effect (1.02x) is applied.
- **Status Widgets:** High-density modules using `label-xs` typography for maximum information in small spaces.

### Feedback & Indicators
- **Pulse Dots:** Small circular indicators (secondary or error colors) that use a continuous pulse animation to signal live connectivity.
- **Progress/Confidence Bars:** Slim, high-contrast lines that utilize the `primary` color against a dark background.

### Navigation
- **Docked Sidebar:** Semi-transparent, full-height navigation with active states indicated by a tinted background and a 1px vertical accent line or border.