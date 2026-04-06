# Scene Preview Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated read-only scene preview page that opens from scene management, renders configured device combinations in 3D, supports camera interaction and flow toggling, and keeps editing disabled.

**Architecture:** Add a new `/scenes/:sceneId/preview` route backed by a dedicated page that loads one named scene and the equipment catalog without touching the editor scene store. Build a focused `ScenePreviewCanvas` container that reuses existing rendering primitives (`DeviceInstance`, `PipeRun`, `RoomFloor`) in viewer-only mode and keeps all preview state local to the page.

**Tech Stack:** React 19, React Router 7, @react-three/fiber, @react-three/drei, Vitest, existing mock-api scene library endpoints.

---

## Chunk 1: Route And Page Tests

### Task 1: Add failing preview page test

**Files:**
- Create: `apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx`
- Modify: `apps/twin-web/package.json`

- [ ] **Step 1: Write the failing test**
  Cover:
  - loading `/scenes/:sceneId/preview`
  - fetching named scene + catalog
  - rendering scene title and edit/back links
  - flow toggle state affecting preview container props

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/scenes/ScenePreviewPage.test.tsx`
Expected: FAIL because page/route does not exist yet.

### Task 2: Add scene management preview entry test

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`

- [ ] **Step 1: Extend failing test**
  Verify each scene item exposes a `预览` link pointing at `/scenes/:sceneId/preview`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/scenes/ScenesPage.test.tsx src/pages/scenes/ScenePreviewPage.test.tsx`
Expected: FAIL on missing preview entry/page.

## Chunk 2: Page And Canvas Implementation

### Task 3: Implement read-only preview canvas

**Files:**
- Create: `apps/twin-web/src/components/scene/ScenePreviewCanvas.tsx`

- [ ] **Step 1: Write minimal implementation**
  Build a canvas that accepts:
  - `scene`
  - `modelUrlByAssetId`
  - `renderStyleByAssetId`
  - `flowEnabled`

  Reuse:
  - `DeviceInstance` with `mode="viewer"` and no detail navigation
  - `PipeRun`
  - `RoomFloor`

- [ ] **Step 2: Keep it read-only**
  Do not depend on `useSceneStore` for scene data.

### Task 4: Implement preview page

**Files:**
- Create: `apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
- Modify: `apps/twin-web/src/App.tsx`

- [ ] **Step 1: Load scene + catalog**
  Use:
  - `fetchNamedScene(sceneId)`
  - `loadEquipmentCatalog()`

- [ ] **Step 2: Render summary and actions**
  Include:
  - scene name
  - updated timestamp
  - device/pipe/port-group counts
  - `返回场景管理`
  - `进入编辑`
  - flow toggle

- [ ] **Step 3: Add route**
  Register `/scenes/:sceneId/preview`.

## Chunk 3: Scene Management Integration

### Task 5: Add preview button in scene management

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Add `预览` link for each scene**
  Keep existing `进入编辑`.

- [ ] **Step 2: Adjust layout**
  Make preview/edit actions clear in list and/or hero area.

## Chunk 4: Verification

### Task 6: Run targeted tests

**Files:**
- Modify: `apps/twin-web/package.json`

- [ ] **Step 1: Add preview page test to `test:pages`**
- [ ] **Step 2: Run**

Run: `npm test -w twin-web`
Expected: PASS

### Task 7: Run lint and build

- [ ] **Step 1: Run lint**

Run: `npm run lint -w twin-web`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `npm run build -w twin-web`
Expected: PASS

### Task 8: Browser validation

- [ ] **Step 1: Validate flow**
  Verify:
  - `/scenes` shows `预览`
  - preview page opens
  - camera interaction is available
  - flow toggle updates the preview
  - no save/edit controls are present on preview page

