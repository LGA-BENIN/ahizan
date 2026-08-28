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
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  sidebar-width: 260px
  card-padding: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is a high-performance framework for the Ahizan Seller Dashboard, engineered to transform complex e-commerce data into actionable insights. It prioritizes clarity and growth, evoking a sense of professional reliability similar to industry leaders like Stripe.

The visual style is **Corporate / Modern** with a focus on data density and cognitive ease. By utilizing a "light-mode first" philosophy for the workspace and a "dark-mode" navigation sidebar, the system establishes a clear mental model between management (the side-nav) and execution (the content area). The atmosphere is sophisticated yet approachable, using whitespace as a structural element to prevent information overload.

## Colors
The palette is dominated by **Ahizan Night Blue** for structural hierarchy and **Ahizan Red** as a surgical accent for primary actions and brand presence.

- **Primary Canvas:** The main workspace uses a very light gray (`#f8fafc`) to keep the interface feeling airy despite heavy data tables.
- **Accents:** Red is reserved for critical CTA buttons, "Live" indicators, and brand-touchpoints.
- **Data Visualization:** Use a distinct secondary palette for charts—relying on the status colors for meaning (Success, Warning, Error) and muted blues for neutral trends.
- **Sidebar:** Maintains the deep Night Blue to anchor the application, providing high contrast against the light content area.

## Typography
This design system utilizes **Plus Jakarta Sans** for its tech-forward, optimistic geometry. It provides excellent legibility at small sizes, which is critical for dense dashboard tables.

- **Scale:** Headings use tighter letter spacing and bold weights to command attention.
- **Data Display:** For Order IDs, SKUs, and monetary values in tables, consider a monospaced alternative or tabular lining figures to ensure vertical alignment across rows.
- **Hierarchy:** Use color (Text Secondary) rather than just size to differentiate between "Label" and "Value" pairs.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. The Sidebar is fixed at 260px, while the main content area occupies the remaining width up to a 1440px max-width to prevent line lengths from becoming unreadable on ultra-wide monitors.

- **Grid:** Use a 12-column grid for the content area.
- **Dashboard Rhythm:** Stats cards should span 3 columns (4 per row) on desktop, reflowing to 6 columns (2 per row) on tablets.
- **Data Density:** Table rows should maintain a height of 56px for standard density and 48px for high-density views.

## Elevation & Depth
Depth is created through **Tonal Layers** and extremely soft **Ambient Shadows**.

- **Level 0 (Background):** `#f8fafc`.
- **Level 1 (Cards/Surface):** White `#ffffff` with a 1px border of `#e2e8f0` (no shadow) for a clean, flat look.
- **Level 2 (Active/Hover):** White with a soft shadow: `0px 10px 15px -3px rgba(0, 0, 0, 0.05)`.
- **Modals:** High elevation with a backdrop blur (`8px`) to maintain focus on the task at hand.

## Shapes
The shape language is defined by **Rounded (8px-12px)** corners. This softens the "industrial" feel of data-heavy screens and aligns with the premium SaaS aesthetic.

- **Standard Elements (Buttons, Inputs):** 8px radius.
- **Container Elements (Cards, Tables):** 12px radius.
- **Badges/Status Tags:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components
### Side Navigation
The sidebar uses Ahizan Night Blue with high-contrast white text. Active states are indicated by a subtle Ahizan Red vertical bar on the left and a translucent white background for the menu item. Groupings (e.g., "Store", "Analytics", "Settings") should be separated by clear, all-caps labels.

### Data Tables
Tables are the heart of the dashboard.
- **Header:** Sticky headers with a subtle gray background.
- **Rows:** Zebra striping is discouraged; use subtle border-bottoms.
- **Status Badges:** Use low-saturation backgrounds with high-saturation text for clarity (e.g., a pale green background with dark green text for "Delivered").

### Statistics Cards
These feature a large numerical value, a label, and a "micro-chart" (sparkline) in the bottom right. Growth indicators (percentage up/down) sit adjacent to the main value in their respective semantic colors.

### Input Fields
Inputs should have a 1px border that turns Ahizan Red on focus. Labels sit outside the field for permanent visibility during data entry.