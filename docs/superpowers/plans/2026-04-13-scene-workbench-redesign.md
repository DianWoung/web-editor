# Scene Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the scene module so `/scenes` becomes a lightweight scene workbench for create/edit/preview/delete, while the editor is simplified to scene metadata plus core layout editing only.

**Architecture:** First extend scene-library metadata and APIs to support `remark`, rename/update/delete flows, and backward-compatible index reads. Then rebuild `/scenes` as the unified workbench, shrink `/editor` into a focused editing shell, and simplify `/preview` into a read-only 3D effect page with only lightweight scene summary.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, Vite, Vitest, Express 5, Zod, JSON file persistence

---

## File Map

### Backend scene metadata and lifecycle

- Modify: `apps/mock-api/src/schemas.ts`
  - Add `remark` to scene library item and create/update request schemas
- Modify: `apps/mock-api/src/routes/scene.ts`
  - Support create/update/delete with `name + remark + scene`
  - Backfill legacy scene index records without `remark`
- Modify: `apps/mock-api/src/app.test.ts`
  - Add coverage for scene remark persistence, update, and delete

### Frontend scene contracts and service helpers

- Modify: `apps/twin-web/src/schemas/scene.ts`
  - Add `remark` to scene library metadata and request/response parsing
- Modify: `apps/twin-web/src/services/api/sceneApi.ts`
  - Send and parse `remark`
  - Add delete named scene API
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
  - Add helpers for create/update/delete named scene with scene metadata

### Scene workbench page

- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
  - Convert current dual-column manager into lightweight card workbench
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`
  - Cover create with remark, summary rendering, and delete confirmation
- Modify: `apps/twin-web/src/index.css`
  - Add workbench card styles and confirmation modal styles

### Editor and preview simplification

- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
  - Add scene metadata header inputs and remove extra bottom tools
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`
  - Cover metadata loading/saving and absence of old tool surface
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
  - Reduce to summary + 3D preview
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx`
  - Cover summary-only rendering and absence of verbose lists
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
  - Remove from normal editor page usage or de-scope to dev-only surface
- Modify: `apps/twin-web/src/components/panels/EditorDeck.tsx`
  - Remove from normal editor layout or stop rendering by default

### Docs

- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

---

## Chunk 1: Scene Metadata Contract and Delete API

### Task 1: Define failing backend tests for `remark` and delete flow

**Files:**
- Modify: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Add a failing test for scene creation with `name + remark`**

Test that `POST /api/scene/library` persists:
- `name`
- `remark`
- `updatedAt`
- correct `deviceCount` / `pipeCount`

- [ ] **Step 2: Add a failing test for scene update with metadata**

Test that `PUT /api/scene/library/:sceneId` can update:
- `name`
- `remark`
- `scene`

- [ ] **Step 3: Add a failing test for scene deletion**

Test that deleting a named scene:
- removes it from the library list
- removes the scene file
- clears `current.scene.meta.json` if the deleted scene was current

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
node --test --experimental-strip-types apps/mock-api/src/app.test.ts
```

Expected: FAIL because current scene routes do not support `remark` or deletion.

- [ ] **Step 5: Commit failing tests**

```bash
git add apps/mock-api/src/app.test.ts
git commit -m "test: define scene metadata lifecycle contract"
```

### Task 2: Implement backend scene metadata and delete support

**Files:**
- Modify: `apps/mock-api/src/schemas.ts`
- Modify: `apps/mock-api/src/routes/scene.ts`

- [ ] **Step 1: Extend backend scene schemas**

Add:
- `remark` to `sceneLibraryItemSchema`
- request schema for create/update payloads carrying `name`, `remark`, and `scene`

- [ ] **Step 2: Implement legacy index compatibility**

When reading old scene index items without `remark`, normalize them to:

```ts
remark: ''
```

- [ ] **Step 3: Update create and update handlers**

Persist:
- `name`
- `remark`
- `deviceCount`
- `pipeCount`

for both create and update routes.

- [ ] **Step 4: Add `DELETE /api/scene/library/:sceneId`**

Behavior:
- delete scene JSON file
- remove item from index
- if current scene meta points to this scene, set `sceneId: null`

- [ ] **Step 5: Re-run backend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
node --test --experimental-strip-types apps/mock-api/src/app.test.ts
npm run build -w mock-api
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mock-api/src/schemas.ts apps/mock-api/src/routes/scene.ts apps/mock-api/src/app.test.ts
git commit -m "feat: add scene remark and delete lifecycle"
```

## Chunk 2: Frontend Scene Contracts and Workbench Flow

### Task 3: Define failing frontend tests for the new `/scenes` workbench

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.test.tsx`

- [ ] **Step 1: Add a failing test for create-with-remark**

Cover:
- entering `场景名称`
- entering `场景备注`
- clicking `创建并进入编辑`
- asserting the API helper receives both fields

- [ ] **Step 2: Add a failing test for summary rendering**

Cover:
- selected scene remark
- updated time
- device/pipe counts

- [ ] **Step 3: Add a failing test for delete confirmation**

Cover:
- click delete
- confirmation appears
- confirm triggers delete API

- [ ] **Step 4: Run focused frontend test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx
```

Expected: FAIL because current page has no remark-aware create or delete flow.

- [ ] **Step 5: Commit failing tests**

```bash
git add apps/twin-web/src/pages/scenes/ScenesPage.test.tsx
git commit -m "test: define scene workbench behavior"
```

### Task 4: Implement scene workbench contracts and UI

**Files:**
- Modify: `apps/twin-web/src/schemas/scene.ts`
- Modify: `apps/twin-web/src/services/api/sceneApi.ts`
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
- Modify: `apps/twin-web/src/pages/scenes/ScenesPage.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Extend frontend scene schemas**

Add `remark` to parsed scene-library item shape and request helpers.

- [ ] **Step 2: Update scene API helpers**

Support:
- create named scene with `name + remark + scene`
- update named scene with `name + remark + scene`
- delete named scene

- [ ] **Step 3: Update scene service helpers**

Add helpers that the page can call without manual JSON handling:
- `createEmptyNamedScene(name, remark)`
- `saveNamedSceneFromStore(sceneId, name, remark)`
- `deleteNamedScene(sceneId)`

- [ ] **Step 4: Rebuild `ScenesPage.tsx` into the lightweight workbench**

Implement:
- new-scene card
- scene list card
- selected scene summary card
- delete confirmation dialog

- [ ] **Step 5: Re-run scene workbench test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenesPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/src/schemas/scene.ts apps/twin-web/src/services/api/sceneApi.ts apps/twin-web/src/services/loadDemoScene.ts apps/twin-web/src/pages/scenes/ScenesPage.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/scenes/ScenesPage.test.tsx
git commit -m "feat: rebuild scene workbench flow"
```

## Chunk 3: Simplify Editor and Preview Pages

### Task 5: Define failing tests for editor simplification

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`

- [ ] **Step 1: Add a failing test for scene metadata header**

Cover:
- loading scene name
- loading scene remark
- rendering top-right save action

- [ ] **Step 2: Add a failing test that old bottom tool surfaces are gone**

Assert the normal editor page no longer renders:
- scene JSON toolbar actions
- raw JSON / topology deck tabs

- [ ] **Step 3: Run focused editor test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/editor/EditorPage.test.tsx
```

Expected: FAIL because current editor still shows the old layout.

- [ ] **Step 4: Commit failing editor test**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.test.tsx
git commit -m "test: define simplified editor shell"
```

### Task 6: Implement simplified editor shell

**Files:**
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
- Modify: `apps/twin-web/src/components/panels/EditorDeck.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Add local scene metadata state to `EditorPage.tsx`**

Load:
- `name`
- `remark`

for the current named scene and bind them to header inputs.

- [ ] **Step 2: Save metadata together with the scene**

Use the updated scene service helper so one save writes:
- `name`
- `remark`
- scene structure

- [ ] **Step 3: Remove the bottom tool strip from the normal editor layout**

Do not render `SceneJsonToolbar` as part of the main editor page.

- [ ] **Step 4: Remove `EditorDeck` from the normal layout**

The primary editing screen should remain:
- left palette
- center canvas
- right properties

- [ ] **Step 5: Re-run editor verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/editor/EditorPage.test.tsx
npm run lint -w twin-web
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/twin-web/src/pages/editor/EditorPage.tsx apps/twin-web/src/components/panels/SceneJsonToolbar.tsx apps/twin-web/src/components/panels/EditorDeck.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/editor/EditorPage.test.tsx
git commit -m "feat: simplify scene editor shell"
```

### Task 7: Define failing tests for summary-only preview page

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx`

- [ ] **Step 1: Add a failing test for summary metadata**

Cover:
- scene name
- scene remark
- updated time
- device/pipe counts

- [ ] **Step 2: Add a failing test for removed verbose lists**

Assert the preview page no longer renders device and pipe detail lists.

- [ ] **Step 3: Run focused preview test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenePreviewPage.test.tsx
```

Expected: FAIL because current preview still renders extra lists.

- [ ] **Step 4: Commit failing preview test**

```bash
git add apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx
git commit -m "test: define summary-only preview page"
```

### Task 8: Implement simplified preview page

**Files:**
- Modify: `apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Add summary metadata rendering**

Render:
- name
- remark
- updated time
- device count
- pipe count

- [ ] **Step 2: Remove detailed device/pipe list sections**

Keep only:
- summary panel
- flow toggle
- 3D preview shell

- [ ] **Step 3: Re-run preview verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/scenes/ScenePreviewPage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx apps/twin-web/src/index.css apps/twin-web/src/pages/scenes/ScenePreviewPage.test.tsx
git commit -m "feat: simplify scene preview page"
```

## Chunk 4: Docs and Full Verification

### Task 9: Update product/docs language to match the new flow

**Files:**
- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

- [ ] **Step 1: Update route and workflow descriptions**

Document:
- `/scenes` as the workbench
- create with `name + remark`
- editor metadata header
- preview as summary-only
- delete confirmation in workbench

- [ ] **Step 2: Update risk/status notes**

Mention:
- scene metadata now includes `remark`
- editor page is intentionally simplified
- delete is centralized in workbench

- [ ] **Step 3: Commit docs**

```bash
git add README.md apps/twin-web/README.md docs/project-tech-stack-and-risks.md
git commit -m "docs: sync scene workbench redesign"
```

### Task 10: Run end-to-end project verification

**Files:**
- No code changes expected

- [ ] **Step 1: Run frontend tests**

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w twin-web
```

Expected: PASS.

- [ ] **Step 2: Run backend tests**

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w mock-api
```

Expected: PASS.

- [ ] **Step 3: Run lint and builds**

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm run lint -w twin-web
npm run build -w twin-web
npm run build -w mock-api
```

Expected: PASS.

- [ ] **Step 4: Manual smoke check**

Verify in browser:
- `/scenes` can create scene with name + remark
- delete requires explicit confirmation
- `/editor?sceneId=...` shows only metadata header + core editor layout
- `/scenes/:sceneId/preview` shows summary-only left rail and 3D preview
- `/scenes/:sceneId/overview` still opens and can jump to device detail

- [ ] **Step 5: Final integration commit**

```bash
git status
```

Expected: clean working tree after the planned commits above.

