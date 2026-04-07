# Scene Entry Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scene management the only top-level entry, move overview and editor access into the scene list, simplify the editor shell, and add local undo support.

**Architecture:** Treat `sceneId` as the primary navigation context. Route all user flows through `/scenes`, add a scene-scoped overview route, keep `/editor?sceneId=...` for editing to minimize churn, and implement undo inside `sceneStore` as a scene-structure history that excludes editor UI state.

**Tech Stack:** React 19, React Router 7, Zustand, Vitest, Vite, TypeScript

---

## File Map

### Frontend routing and navigation

- Modify: `apps/twin-web/src/App.tsx`
  - Remove top-level `/overview` entry behavior and add `/scenes/:sceneId/overview`
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
  - Keep only the `场景管理` navigation item

### Scene list and overview entry

- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
  - Add `总览` action for each scene row
  - Keep `预览` and `编辑`
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`
  - Cover new scene row actions and navigation labels
- Create or Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
  - Read `sceneId` from route params
  - Load named scene when present
  - Preserve runtime KPI and device click-through
- Modify: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`
  - Move overview test to `/scenes/:sceneId/overview`

### Editor shell simplification

- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
  - Add right-aligned header action group
  - Move save + undo into header
  - Demote bottom toolbar to secondary tools
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
  - Remove primary save button from footer
  - Keep import/export/utility controls
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`
  - Verify named-scene header actions are rendered
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.test.tsx`
  - Update expectations for toolbar scope if needed

### Undo support

- Modify: `apps/twin-web/src/store/sceneStore.ts`
  - Add scene-history state and `undo`
  - Record snapshots only for structural scene changes
- Create: `apps/twin-web/src/store/sceneStore.undo.test.ts`
  - Verify undo for add/remove/clear/load and keyboard-safe behavior

### Styling and docs

- Modify: `apps/twin-web/src/index.css`
  - Update top nav, scene row action layout, editor header action area, slimmer toolbar styles
- Modify: `apps/twin-web/README.md`
- Modify: `README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

---

## Chunk 1: Navigation and Scene-Scoped Overview

### Task 1: Add failing route/navigation tests

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`
- Modify: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`

- [ ] **Step 1: Update `ScenesPage.test.tsx` to expect `总览 / 预览 / 编辑` actions**

Add an assertion that each saved scene row renders a `总览` link pointing at `/scenes/:sceneId/overview`.

- [ ] **Step 2: Update `runtimeIntegration.test.tsx` to render overview at `/scenes/:sceneId/overview`**

Change the route under test so overview is loaded from a scene-scoped path instead of `/overview`.

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx src/pages/runtimeIntegration.test.tsx
```

Expected: FAIL because the scene row has no `总览` link yet and overview route still expects the old path behavior.

- [ ] **Step 4: Commit the failing-test checkpoint**

```bash
git add apps/twin-web/src/pages/scenes/ScenesPage.test.tsx apps/twin-web/src/pages/runtimeIntegration.test.tsx
git commit -m "test: cover scene-scoped overview entry"
```

### Task 2: Implement scene-scoped overview routing

**Files:**
- Modify: `apps/twin-web/src/App.tsx`
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`

- [ ] **Step 1: Update `AppNav.tsx` to only render `场景管理`**

Remove `三维总览` and `场景编排` from the top-level nav.

- [ ] **Step 2: Update `App.tsx` routes**

Implement:

```tsx
<Route path="/" element={<Navigate to="/scenes" replace />} />
<Route path="/scenes" element={<ScenesPage />} />
<Route path="/scenes/:sceneId/overview" element={<OverviewPage />} />
```

Optionally keep `/overview` as a compatibility redirect to `/scenes`.

- [ ] **Step 3: Add `总览` action in `ScenesPage.tsx`**

Add a `Link` per row to `/scenes/${sceneId}/overview`.

- [ ] **Step 4: Update `OverviewPage.tsx` to load by `sceneId` when provided**

Read route params and choose:

```ts
const { sceneId } = useParams<{ sceneId: string }>()
const loader = sceneId ? loadNamedSceneIntoStore(sceneId) : loadCurrentSceneIntoStore()
```

Keep runtime polling and device-detail navigation unchanged.

- [ ] **Step 5: Re-run the focused tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx src/pages/runtimeIntegration.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/src/App.tsx apps/twin-web/src/components/layout/AppNav.tsx apps/twin-web/src/pages/scenes/ScenesPage.tsx apps/twin-web/src/pages/overview/OverviewPage.tsx apps/twin-web/src/pages/scenes/ScenesPage.test.tsx apps/twin-web/src/pages/runtimeIntegration.test.tsx
git commit -m "feat: route overview through scene management"
```

---

## Chunk 2: Editor Header Simplification

### Task 3: Add failing editor-shell tests

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.test.tsx`

- [ ] **Step 1: Extend `EditorPage.test.tsx`**

Add assertions for:

- `保存` button in the header
- `撤销` button in the header
- `返回场景管理` link

- [ ] **Step 2: Update toolbar test expectations**

Assert that the footer toolbar no longer renders the primary save action and still renders secondary controls.

- [ ] **Step 3: Run the focused tests to verify they fail**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/editor/EditorPage.test.tsx src/components/panels/SceneJsonToolbar.test.tsx
```

Expected: FAIL because save still lives in the footer and undo is not rendered.

- [ ] **Step 4: Commit the failing-test checkpoint**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/components/panels/SceneJsonToolbar.test.tsx
git commit -m "test: define simplified editor shell"
```

### Task 4: Move save to header and slim the footer toolbar

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Move save logic ownership into `EditorPage.tsx`**

Lift the existing named-scene/current-scene save flow from `SceneJsonToolbar` into editor-page header actions so the primary save button is at the top.

- [ ] **Step 2: Add a disabled placeholder undo button in the header**

Wire the button to store state later in Chunk 3, but render the control now so the page structure is stable.

- [ ] **Step 3: Remove save button from `SceneJsonToolbar.tsx`**

Keep only import/export/load-demo/clear/stress/visibility/snap/camera-reset controls and status/error display.

- [ ] **Step 4: Update `index.css`**

Add classes for:

- slimmer `editor-header`
- right-aligned header actions
- secondary footer toolbar

- [ ] **Step 5: Re-run the focused tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/editor/EditorPage.test.tsx src/components/panels/SceneJsonToolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.tsx apps/twin-web/src/components/panels/SceneJsonToolbar.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/components/panels/SceneJsonToolbar.test.tsx
git commit -m "feat: simplify editor shell actions"
```

---

## Chunk 3: Local Undo in Scene Store

### Task 5: Add failing undo store tests

**Files:**
- Create: `apps/twin-web/src/store/sceneStore.undo.test.ts`

- [ ] **Step 1: Write store tests for undo behavior**

Cover at least:

- add device → undo restores empty scene
- remove device → undo restores device
- clear scene → undo restores previous structure
- load scene → undo restores previous structure
- no history → undo is disabled/no-op

- [ ] **Step 2: Run the undo test to verify it fails**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/store/sceneStore.undo.test.ts
```

Expected: FAIL because `undo` and history state do not exist.

- [ ] **Step 3: Commit the failing-test checkpoint**

```bash
git add apps/twin-web/src/store/sceneStore.undo.test.ts
git commit -m "test: define scene undo behavior"
```

### Task 6: Implement scene-only history in `sceneStore`

**Files:**
- Modify: `apps/twin-web/src/store/sceneStore.ts`
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`

- [ ] **Step 1: Add history state and helpers**

Introduce a small snapshot type:

```ts
type SceneSnapshot = Pick<SceneState, 'version' | 'devices' | 'portGroups' | 'pipes' | 'selection'>
```

Add:

- `undoStack`
- `canUndo`
- `undo()`
- helper for pushing a cloned snapshot before structural mutations

- [ ] **Step 2: Wrap structural actions with history recording**

Update:

- `loadScene`
- `clearScene`
- `addDeviceFromAsset`
- `updateDeviceTransform` (record only when transform actually changes)
- `updateDeviceName`
- `updateDeviceSystem`
- `removeDevice`
- `duplicateDevice`
- `removePipe`
- successful `tryConnectPorts`
- successful `importSceneJsonText`
- `applyStressTest`

- [ ] **Step 3: Wire header undo button and keyboard shortcut**

In `EditorPage.tsx`, connect the header button to `undo()`, and update the existing key handler to handle `metaKey || ctrlKey` with `z`.

- [ ] **Step 4: Re-run the undo test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/store/sceneStore.undo.test.ts src/pages/editor/EditorPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/twin-web/src/store/sceneStore.ts apps/twin-web/src/store/sceneStore.undo.test.ts apps/twin-web/src/pages/editor/EditorPage.tsx
git commit -m "feat: add local undo for scene editing"
```

---

## Chunk 4: Final Integration, Styling, and Documentation

### Task 7: Update app-level tests and docs

**Files:**
- Modify: `apps/twin-web/package.json`
- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

- [ ] **Step 1: Add the new undo store test to `test:pages` or a dedicated test script**

Keep the test command explicit so CI covers the new file.

- [ ] **Step 2: Update docs**

Document:

- `/` now enters `/scenes`
- top nav only exposes `场景管理`
- scene-scoped overview route
- editor save/undo in header

- [ ] **Step 3: Run full frontend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w twin-web
npm run lint -w twin-web
npm run build -w twin-web
```

Expected: all PASS.

- [ ] **Step 4: Run backend regression**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w mock-api
npm run build -w mock-api
```

Expected: PASS, proving route refactor did not regress API integration assumptions.

- [ ] **Step 5: Browser smoke test**

Validate manually:

1. Open `/`
2. Confirm redirect lands on `/scenes`
3. From a saved scene, click `总览` and confirm runtime KPI + device click-through
4. Return to scene list and click `编辑`
5. Add a device, click `撤销`, confirm it disappears
6. Save from header and confirm success status near the top

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/package.json README.md apps/twin-web/README.md docs/project-tech-stack-and-risks.md
git commit -m "docs: update scene-first navigation flow"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-07-scene-entry-refactor.md`. Ready to execute?
