# Low-Risk Review Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed lint failure and reduce main bundle size with low-risk code-splitting and deduplication changes.

**Architecture:** Keep the current store and page structure intact. Remove one effect-driven derived state in the scene component, lazy-load the detail chart path so `echarts` no longer ships in the main entry chunk, and centralize equipment asset loading behind one shared helper.

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7, React Three Fiber, Drei, ECharts, Zustand, Zod

---

## Chunk 1: Scene Correctness

### Task 1: Remove effect-driven derived state in `DeviceInstance`

**Files:**
- Modify: `apps/twin-web/src/components/scene/DeviceInstance.tsx`
- Test: `npm run lint -w twin-web`

- [ ] **Step 1: Replace the derived `modelTopY` state with render-time calculation**

Keep the existing label placement behavior but stop calling `setState` from the layout effect that measures the visual bounds.

- [ ] **Step 2: Keep transform and GLB loading behavior unchanged**

Do not change selection, dragging, GLB fallback, or port interaction behavior.

- [ ] **Step 3: Run lint to verify the React Hooks rule is satisfied**

Run: `npm run lint -w twin-web`
Expected: PASS with no `react-hooks/set-state-in-effect` error.

## Chunk 2: Bundle Optimization

### Task 2: Lazy-load the detail chart path

**Files:**
- Modify: `apps/twin-web/src/pages/detail/DeviceDetailPage.tsx`
- Modify: `apps/twin-web/src/components/charts/TrendChart.tsx`
- Test: `npm run build -w twin-web`

- [ ] **Step 1: Move the chart component behind a lazy boundary**

Ensure the detail page still renders the same trend content while loading `echarts` only when the detail route needs it.

- [ ] **Step 2: Keep chart initialization and cleanup logic intact**

Do not change chart options or runtime data flow unless required by the lazy-loading boundary.

- [ ] **Step 3: Run build and inspect chunk output**

Run: `npm run build -w twin-web`
Expected: PASS and main bundle smaller than the pre-change `dist/assets/index-C8Bmhweo.js` output.

## Chunk 3: Service Deduplication

### Task 3: Centralize equipment asset loading

**Files:**
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
- Test: `npm run lint -w twin-web`
- Test: `npm run build -w twin-web`

- [ ] **Step 1: Extract a shared asset loader helper**

Use one function for fetching and mapping `asset.json` + `ports.json`, then reuse it from both catalog-loading entry points.

- [ ] **Step 2: Preserve current response shapes and errors**

Do not change consumer-facing types or public function signatures.

- [ ] **Step 3: Re-run verification**

Run: `npm run lint -w twin-web`
Expected: PASS

Run: `npm run build -w twin-web`
Expected: PASS
