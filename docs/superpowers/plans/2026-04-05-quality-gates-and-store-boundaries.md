# Quality Gates and Store Boundaries Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add page-level runtime integration coverage, split editor UI state out of `sceneStore`, add repo-level verification entry points, and update stale project-status docs.

**Architecture:** Keep scene data in `sceneStore` and move transient editor/viewer UI state into a dedicated `editorUiStore`. Add a minimal DOM-backed frontend test harness so overview/detail pages can be rendered without the real 3D canvas, then wire root scripts and CI around the verified commands.

**Tech Stack:** Node.js, React 19, Zustand, Vite, jsdom, GitHub Actions

---

## Chunk 1: Frontend Runtime Page Coverage

### Task 1: Add page-level runtime integration tests

**Files:**
- Modify: `apps/twin-web/package.json`
- Modify: `package-lock.json`
- Create: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
- Modify: `apps/twin-web/src/pages/detail/DeviceDetailPage.tsx`

- [ ] Write a failing test for overview runtime rendering through the page component.
- [ ] Run the scoped frontend test command and verify the new test fails for the intended reason.
- [ ] Write a failing test for detail runtime rendering, including retained strategy and AI sections.
- [ ] Re-run the scoped frontend test command and verify the detail test also fails.
- [ ] Add the smallest page-level test seams needed to stub heavy canvas/chart components.
- [ ] Re-run the scoped frontend test command until all runtime page tests pass.

## Chunk 2: Store Boundary Cleanup

### Task 2: Extract editor UI state from `sceneStore`

**Files:**
- Create: `apps/twin-web/src/store/editorUiStore.ts`
- Modify: `apps/twin-web/src/store/sceneStore.ts`
- Modify: `apps/twin-web/src/components/scene/EditorCanvas.tsx`
- Modify: `apps/twin-web/src/components/scene/DeviceInstance.tsx`
- Modify: `apps/twin-web/src/components/panels/EditorCanvasHud.tsx`
- Modify: `apps/twin-web/src/components/panels/PropertiesPanel.tsx`
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`

- [ ] Add or adjust a failing test that proves runtime/store behavior still works after the split.
- [ ] Run the affected frontend tests and verify the failure is due to the old store boundary.
- [ ] Move editor/viewer UI state and actions into `editorUiStore`.
- [ ] Update scene actions that depend on UI values so they read from the new store boundary.
- [ ] Update all UI consumers to read/write `editorUiStore` instead of `sceneStore.editorUi`.
- [ ] Re-run the frontend test command and confirm the store split stays green.

## Chunk 3: Repo-Level Quality Gates

### Task 3: Add root verification entry points

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] Add root `lint`, `test`, and `check` scripts that compose the workspace commands.
- [ ] Add CI that runs the same root verification commands on pushes and pull requests.
- [ ] Run the new root commands locally and verify they pass.

## Chunk 4: Status and Risk Docs

### Task 4: Update stale progress documents

**Files:**
- Modify: `docs/project-tech-stack-and-risks.md`
- Modify: `docs/superpowers/plans/2026-04-02-runtime-data-closed-loop-implementation.md`
- Modify: `apps/twin-web/README.md`

- [ ] Update the documented verified status to match fresh test/lint/build evidence.
- [ ] Mark the runtime closed-loop implementation plan steps that are now complete, and call out anything intentionally left open.
- [ ] Reconcile README guidance with the new root verification commands and current runtime integration notes.

## Chunk 5: Final Verification

### Task 5: Run full verification

**Files:**
- Verify only

- [ ] Run `npm test -w twin-web`.
- [ ] Run `npm test -w mock-api`.
- [ ] Run `npm run lint -w twin-web`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm run build:api`.
