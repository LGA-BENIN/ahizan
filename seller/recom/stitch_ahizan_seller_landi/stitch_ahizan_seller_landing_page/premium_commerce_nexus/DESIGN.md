---
name: Premium Commerce Nexus
colors:
  surface: '#fff8f7'
  surface-dim: '#f4d2cf'
  surface-bright: '#fff8f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff0ee'
  surface-container: '#ffe9e6'
  surface-container-high: '#ffe2de'
  surface-container-highest: '#fddbd7'
  on-surface: '#291715'
  on-surface-variant: '#5d3f3c'
  inverse-surface: '#402b29'
  inverse-on-surface: '#ffedea'
  outline: '#926f6b'
  outline-variant: '#e7bdb8'
  surface-tint: '#c00014'
  primary: '#ba0013'
  on-primary: '#ffffff'
  primary-container: '#e31e24'
  on-primary-container: '#fffafa'
  inverse-primary: '#ffb4ab'
  secondary: '#515f78'
  on-secondary: '#ffffff'
  secondary-container: '#d2e0fe'
  on-secondary-container: '#55637d'
  tertiary: '#006190'
  on-tertiary: '#ffffff'
  tertiary-container: '#007bb5'
  on-tertiary-container: '#fbfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b9c7e4'
  on-secondary-fixed: '#0d1c32'
  on-secondary-fixed-variant: '#39475f'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#8ecdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b71'
  background: '#fff8f7'
  on-background: '#291715'
  surface-variant: '#fddbd7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
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
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is engineered for a high-performance marketplace seller experience, blending enterprise-grade reliability with cutting-edge technological sophistication. The aesthetic sits at the intersection of **Corporate Modernism** and **Minimalism**, prioritizing clarity, data-density, and frictionless workflows.

The visual narrative is driven by "The Curve of Commerce"—a motif derived from the shopping cart's signature arc in the logo. This manifests as subtle geometric patterns in backgrounds and specific component radii. The emotional response is one of confidence and empowerment; the UI acts as a silent, premium partner to the seller, using expansive whitespace to reduce cognitive load while employing high-contrast accents to drive action.

## Colors

The palette is anchored by a high-energy **Ahizan Red** for primary actions and a deep **Midnight Blue** for structural hierarchy and text. 

- **Primary Red (#E31E24):** Reserved for call-to-actions, critical status indicators, and brand touchpoints.
- **Midnight Blue (#0A192F):** Used for sidebars, navigation headers, and primary headings to establish authority.
- **Surface Strategy:** The background is pure white to maximize "breathability." A secondary surface of #F8FAFC is utilized for card backgrounds and input fields to create a subtle layered effect without the weight of heavy borders.
- **Gradients:** Use the Red-to-Blue linear gradient sparingly for high-impact areas like dashboard hero cards, premium feature badges, or progress visualizations.

## Typography

The typography system utilizes a dual-font strategy. **Plus Jakarta Sans** provides a modern, geometric character for headlines, mirroring the curves found in the marketplace logo. **Inter** is used for all body and functional text to ensure maximum legibility at small sizes, crucial for complex data tables and seller analytics.

Use `label-bold` for table headers and small captions to provide clear structural markers. `display-lg` should be reserved for empty state messaging or major marketing milestones within the app.

## Layout & Spacing

This design system follows a **Fluid-Fixed Hybrid Grid**. The content is contained within a max-width of 1440px for desktop viewing, centered with dynamic margins. 

- **Desktop:** 12-column grid with 24px gutters. Use heavy 40px - 64px padding for section containers to maintain a premium, spacious feel.
- **Tablet:** 8-column grid with 16px gutters and 24px side margins.
- **Mobile:** 4-column grid with 16px side margins.

Horizontal rhythm is managed in multiples of 4px. Use `lg` spacing for top-level component separation and `sm` spacing for internal card elements.

## Elevation & Depth

Depth is established through **Tonal Layering** and **Ambient Shadows**. 

1.  **Level 0 (Base):** White (#FFFFFF) background.
2.  **Level 1 (Subtle):** Surface-container (#F8FAFC) used to group content areas without elevation.
3.  **Level 2 (Floating):** Primary cards use a very soft, diffused shadow: `box-shadow: 0 4px 20px rgba(10, 25, 47, 0.05)`.
4.  **Level 3 (Overlay):** Modals and dropdowns use a deeper shadow with a slight Midnight Blue tint to ground them: `box-shadow: 0 12px 40px rgba(10, 25, 47, 0.12)`.

Avoid harsh borders. Use subtle 1px strokes in #E2E8F0 only when content needs explicit separation within a card.

## Shapes

The shape language is "Soft-Tech." While the overall layout is structured and grid-based, individual elements feature generous rounding to feel approachable and modern.

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Dashboard cards and modal windows use a 1rem (16px) radius.
- **Accent Shapes:** Use the "A-Curve" as a decorative mask for images or background patterns. This is a large, sweeping arc that intersects the top-right or bottom-left corners of primary containers.

## Components

### Buttons
- **Primary:** Solid Ahizan Red with white text. On hover, darken the red slightly. Use a subtle shadow to indicate interactability.
- **Secondary:** Transparent background with a Midnight Blue border and text. 
- **Ghost:** No border, Midnight Blue text. Used for less prominent actions in sidebars.

### Cards
Cards are the primary organizational unit. They must be white with a Level 2 shadow and a 16px corner radius. For "Premium" features, a 2px top border using the Red/Blue gradient can be applied.

### Input Fields
Inputs use the #F8FAFC surface color with a 1px #E2E8F0 border. On focus, the border transitions to Midnight Blue with a subtle 3px spread shadow in the primary red (at 10% opacity).

### Chips & Badges
Small, pill-shaped indicators. For status (e.g., "Shipped"), use low-saturation background tints (e.g., light green) with high-saturation text.

### Navigation
The sidebar should be Midnight Blue with high-contrast white text for active states and 60% opacity for inactive states. Use a vertical Red bar (4px wide) on the left edge of the active menu item.