# Scene Operations SaaS Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current twin-web UI into a scene-centered SaaS workbench where `/scenes` is the primary operating surface, runtime views are scene subspaces, and asset management becomes a secondary scene-level entry.

**Architecture:** First refactor the shared application shell and route framing so every scene-facing page inherits one consistent context model. Then rebuild `/scenes` into a two-column operations workbench, unify `/editor`, `/preview`, and `/overview` under a shared subspace layout, and finally relocate the asset entry and refresh docs/tests to match the new product structure.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, Vite, Vitest, Express 5, existing twin-web CSS token system

---

## File Map

### App shell and navigation

- Modify: `apps/twin-web/src/App.tsx`
  - Keep route map intact while aligning shell and scene-first entry framing
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
  - Collapse top navigation to a scene-first SaaS header
- Modify: `apps/twin-web/src/index.css`
  - Replace current dark-heavy token usage with a light information layer + dark realtime layer system

### Scene operations workbench

- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
  - Rebuild into left scene list + right current-scene runtime summary
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`
  - Cover new workbench layout, create modal, runtime summary placeholders, and asset entry
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
  - Reuse existing scene lifecycle helpers and add any scene-summary loading helper needed by `/scenes`

### Shared scene subspace framing

- Create: `apps/twin-web/src/components/layout/SceneWorkspaceHeader.tsx`
  - Shared scene context header used by editor/preview/overview
- Create: `apps/twin-web/src/components/layout/SceneSubspaceShell.tsx`
  - Shared page wrapper for light context layer + dark view stage
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
  - Adopt shared shell and keep only name/remark/save/undo plus core editing surfaces
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
  - Adopt shared shell and reduce to read-only effect page with minimal summary
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
  - Adopt shared shell and promote runtime summary + dark realtime view stage
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx`
- Modify: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`
  - Extend coverage where route-level framing changes behavior

### Asset entry demotion

- Modify: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
  - Update page framing so it behaves like a scene-level configuration center rather than a primary product surface
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`
  - Cover new entry copy and framing changes
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
  - Add the secondary asset-management entry in the workbench

### Docs

- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`
  - Update navigation, product framing, and realtime-ready scene workbench description

---

## Chunk 1: Shared SaaS Shell and Visual Tokens

### Task 1: Define the failing shell/navigation tests

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`

- [ ] **Step 1: Add a failing test that `/scenes` renders as the primary landing workbench**

Assert:
- the page headline is scene-operations oriented
- the top area no longer presents asset management as a peer primary nav target

- [ ] **Step 2: Add a failing test that editor renders a shared scene context header**

Assert:
- the page exposes a consistent scene context region
- save/undo/name/remark stay in the shared header area

- [ ] **Step 3: Run focused frontend tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx src/pages/editor/EditorPage.test.tsx
```

Expected: FAIL because current pages do not use the new unified shell.

- [ ] **Step 4: Commit failing tests**

```bash
git add apps/twin-web/src/pages/scenes/ScenesPage.test.tsx apps/twin-web/src/pages/editor/EditorPage.test.tsx
git commit -m "test: define scene saas shell behavior"
```

### Task 2: Implement shared shell primitives and top navigation

**Files:**
- Modify: `apps/twin-web/src/App.tsx`
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
- Create: `apps/twin-web/src/components/layout/SceneWorkspaceHeader.tsx`
- Create: `apps/twin-web/src/components/layout/SceneSubspaceShell.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Create `SceneWorkspaceHeader.tsx`**

Implement a focused scene header component that can render:
- scene name
- scene remark
- primary actions
- contextual subtitle/back link

- [ ] **Step 2: Create `SceneSubspaceShell.tsx`**

Implement a layout wrapper with:
- light information section
- dark stage section
- optional secondary aside region

- [ ] **Step 3: Simplify `AppNav.tsx`**

Keep only the scene-first product framing in the top nav.  
Do not expose asset management as a co-equal primary destination.

- [ ] **Step 4: Rework global CSS tokens**

In `apps/twin-web/src/index.css`:
- define light workspace tokens
- define dark stage tokens
- switch typography and spacing to a modern SaaS cadence
- remove reliance on the current system-font, dark-only product feeling

- [ ] **Step 5: Wire the shell into `App.tsx`**

Keep routes stable, but ensure the app shell can visually support the new scene-first hierarchy.

- [ ] **Step 6: Re-run focused verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npx vitest run apps/twin-web/src/pages/scenes/ScenesPage.test.tsx apps/twin-web/src/pages/editor/EditorPage.test.tsx
npm run lint -w twin-web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/twin-web/src/App.tsx apps/twin-web/src/components/layout/AppNav.tsx apps/twin-web/src/components/layout/SceneWorkspaceHeader.tsx apps/twin-web/src/components/layout/SceneSubspaceShell.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/scenes/ScenesPage.test.tsx apps/twin-web/src/pages/editor/EditorPage.test.tsx
git commit -m "feat: add shared scene saas shell"
```

---

## Chunk 2: Rebuild `/scenes` as the Operations Workbench

### Task 3: Define the failing workbench behavior tests

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`

- [ ] **Step 1: Add a failing test for two-column workbench rendering**

Assert the page renders:
- left scene list region
- right current-scene runtime summary region

- [ ] **Step 2: Add a failing test for create modal flow**

Assert:
- `新增场景` opens a modal
- modal contains name and remark fields
- confirm still navigates to the editor

- [ ] **Step 3: Add a failing test for secondary asset entry**

Assert:
- asset management is available from the workbench
- it is rendered as a secondary entry, not the main nav

- [ ] **Step 4: Run the focused test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx
```

Expected: FAIL because the current page does not yet expose the new operations-workbench structure.

- [ ] **Step 5: Commit failing tests**

```bash
git add apps/twin-web/src/pages/scenes/ScenesPage.test.tsx
git commit -m "test: define scene operations workbench layout"
```

### Task 4: Implement the new scene operations workbench

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Refactor `ScenesPage.tsx` to a dual-region workbench**

Implement:
- left scene list with create/delete/select/actions
- right selected-scene summary with runtime-oriented status placeholders and KPI slots

- [ ] **Step 2: Preserve create/delete flows**

Keep:
- modal-based creation
- delete confirmation
- edit/preview/overview navigation

Do not regress existing scene lifecycle behavior.

- [ ] **Step 3: Add secondary asset entry**

Place asset management as a clearly secondary configuration entry inside the workbench.

- [ ] **Step 4: Add runtime-ready empty/loading states**

The right panel must visually support:
- no scene selected
- loading scene summary
- summary available

- [ ] **Step 5: Re-run page verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npx vitest run apps/twin-web/src/pages/scenes/ScenesPage.test.tsx
npm run lint -w twin-web
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/src/pages/scenes/ScenesPage.tsx apps/twin-web/src/services/loadDemoScene.ts apps/twin-web/src/index.css apps/twin-web/src/pages/scenes/ScenesPage.test.tsx
git commit -m "feat: rebuild scenes as operations workbench"
```

---

## Chunk 3: Unify Editor, Preview, and Overview as Scene Subspaces

### Task 5: Define failing tests for shared scene-subspace framing

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx`
- Modify: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`

- [ ] **Step 1: Add a failing editor test for subspace framing**

Assert:
- shared scene header is present
- editor body remains focused on palette/canvas/properties
- old utility-heavy layout is absent from the main surface

- [ ] **Step 2: Add a failing preview test for minimal summary + dark stage**

Assert:
- preview renders summary-only metadata
- dark stage region remains the main focus
- no delete or edit form surfaces appear

- [ ] **Step 3: Add a failing overview test for runtime-oriented subspace**

Assert:
- overview renders through the shared shell
- runtime summary and dark stage coexist
- device-detail navigation remains available

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/editor/EditorPage.test.tsx src/pages/scenes/ScenePreviewPage.test.tsx src/pages/runtimeIntegration.test.tsx
```

Expected: FAIL because these pages do not yet share the new scene-subspace layout.

- [ ] **Step 5: Commit failing tests**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx apps/twin-web/src/pages/runtimeIntegration.test.tsx
git commit -m "test: define unified scene subspace layout"
```

### Task 6: Implement editor/preview/overview unification

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Apply `SceneSubspaceShell` to the editor**

Keep:
- name
- remark
- save
- undo
- return to scenes
- palette/canvas/properties

Do not reintroduce the removed debug/JSON surfaces.

- [ ] **Step 2: Apply `SceneSubspaceShell` to preview**

Limit the page to:
- back/edit actions
- flow toggle
- summary metadata
- read-only 3D view

- [ ] **Step 3: Apply `SceneSubspaceShell` to overview**

Promote:
- runtime summary cards
- KPI placeholders
- dark runtime/3D stage

Keep existing polling and device-detail linking behavior.

- [ ] **Step 4: Re-run scene-subspace verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npx vitest run apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx apps/twin-web/src/pages/runtimeIntegration.test.tsx
npm run lint -w twin-web
npm run build -w twin-web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.tsx apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx apps/twin-web/src/pages/overview/OverviewPage.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx apps/twin-web/src/pages/runtimeIntegration.test.tsx
git commit -m "feat: unify scene subspaces under shared shell"
```

---

## Chunk 4: Asset Entry Demotion and Product Copy Cleanup

### Task 7: Define the failing asset-entry tests

**Files:**
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`

- [ ] **Step 1: Add a failing test for secondary-entry framing**

Assert:
- asset management copy reflects a configuration-center role
- the page no longer reads like a primary top-level product area

- [ ] **Step 2: Run focused asset page tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/assets/AssetsPage.test.tsx
```

Expected: FAIL because the current copy still assumes a primary module surface.

- [ ] **Step 3: Commit failing test**

```bash
git add apps/twin-web/src/pages/assets/AssetsPage.test.tsx
git commit -m "test: define secondary asset entry framing"
```

### Task 8: Update asset entry framing and supporting copy

**Files:**
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
- Modify: `apps/twin-web/src/index.css`
- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

- [ ] **Step 1: Reframe `AssetsPage.tsx` as a configuration center**

Update headings, introductory copy, and surrounding layout so the page reads as a secondary scene-configuration destination.

- [ ] **Step 2: Align CSS and spacing with the SaaS shell**

Ensure the page looks consistent with the new product-wide visual system.

- [ ] **Step 3: Update documentation**

Document:
- scene-first product positioning
- `/scenes` as the primary workbench
- asset management as a secondary scene-level entry
- overview/preview/editor as unified scene subspaces

- [ ] **Step 4: Run final verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm run lint -w twin-web
npm test -w twin-web
npm test -w mock-api
npm run build -w twin-web
npm run build -w mock-api
```

Expected: PASS with no frontend lint regressions and no backend contract regressions.

- [ ] **Step 5: Commit**

```bash
git add apps/twin-web/src/pages/assets/AssetsPage.tsx apps/twin-web/src/pages/assets/AssetsPage.test.tsx apps/twin-web/src/index.css README.md apps/twin-web/README.md docs/project-tech-stack-and-risks.md
git commit -m "docs: align product framing with scene saas redesign"
```

---

## Execution Notes

- Keep route paths stable unless a concrete implementation blocker appears.
- Do not widen scope into backend runtime contract redesign in this plan.
- Do not bring `js-sdk/` or `ts-sdk/` into any commit.
- Preserve current device-detail jump behavior from scene overview.
- Prefer focused test updates over broad snapshot rewrites.
