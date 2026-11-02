# NEPSE Analytics Responsive Design Standards

This document establishes the UI/UX responsive architecture, viewport breakpoints, and component rules across all devices (mobile phones, foldables, tablets, laptops, and ultra-wide desktop monitors).

---

## 1. Breakpoint System (Tailwind CSS v4)

| Token | Screen Width | Typical Devices | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **`xs`** | `< 640px` | iPhone SE, 13/14/15/16, Samsung Galaxy, Foldables | Single column, collapsed charts, horizontal scroll tables, touch-friendly targets (min 40px) |
| **`sm`** | `640px - 767px` | Large phones in landscape, phablets, mini tablets | 2-column KPI ribbons, expanded search bars |
| **`md`** | `768px - 1023px` | Tablets (iPad, Galaxy Tab), desktop sidebar threshold | Collapsible/fixed desktop navigation switch, 2-to-3 column grids |
| **`lg`** | `1024px - 1279px` | Laptops, small desktop monitors | 3-column analysis layouts, full interactive trading views |
| **`xl`** | `1280px - 1535px` | Standard desktop screens | 4-column metric strips, multi-pane charting |
| **`2xl`** | `>= 1536px` | Ultra-wide monitors | Max-width bounded (`max-w-[1440px]` or `max-w-[1680px]`) centered content |

---

## 2. Mandatory Architectural Standards

### A. Page Container (`PageContainer`)
All page routes (`src/app/**/page.tsx`) must wrap top-level views inside `<PageContainer>`:
```tsx
import { PageContainer } from "@/shared/ui";

export default function MyPage() {
  return (
    <PageContainer maxWidth="standard">
      {/* Content */}
    </PageContainer>
  );
}
```
- **Mobile edge padding**: `px-3.5` on screens `< 640px` prevents wasting screen real estate.
- **Desktop edge padding**: expands cleanly to `sm:px-6 lg:px-8`.
- **Viewport safety**: `min-w-0 w-full overflow-x-hidden` prevents table or flex blowouts that cause body horizontal scroll.

### B. Standard Page Header (`PageHeader`)
Page headers must use `<PageHeader>` to adapt gracefully:
```tsx
import { PageHeader } from "@/shared/ui";

<PageHeader
  title="Stock Screener"
  description="Multi-factor filter engine across 200+ listed NEPSE equities"
  icon="🔍"
  actions={<ExportButtons />}
/>
```
- On mobile (`xs`), titles scale (`text-xl sm:text-2xl lg:text-3xl`) and action controls wrap underneath naturally.

### C. Financial Data Tables (`TableContainer`)
Never render an unconstrained raw `<table>`. Financial data tables (Holdings, Floorsheet, Announcements, Screener results, Dividends) must always be wrapped with `<TableContainer>`:
```tsx
import { TableContainer } from "@/shared/ui";

<TableContainer scrollHint>
  <table className="w-full text-right text-xs">
    {/* Table content */}
  </table>
</TableContainer>
```
- Features smooth `-webkit-overflow-scrolling: touch` and thin scrollbars.
- Table headers should have `whitespace-nowrap`.
- Numeric data should have `tabular-nums font-mono text-right`.

### D. Multi-Chart Grids
When rendering multiple charts or heavy SVG/Canvas surfaces:
- Multi-column layouts must automatically collapse to 1 column on mobile viewports (`< 768px`) regardless of desktop column settings (`cols = 2` or `3`).
- ECharts and KlineCharts must listen to container resizes via `ResizeObserver` or window resize triggers.

### E. Touch Targets & Form Controls
- Minimum touch height of 38-44px on interactive buttons and inputs.
- Text inputs must have minimum font size (>= 16px or scaled via `-webkit-text-size-adjust: 100%`) to prevent unwanted iOS auto-zooming.
- Modals must enforce `max-h-[90vh] overflow-y-auto` so they remain operable in landscape mode on mobile phones.
