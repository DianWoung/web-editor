# Asset Management Center Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/assets` management center that stores asset metadata in structured tables, stores uploaded models through a backend storage adapter, and keeps the scene editor consuming only published assets.

**Architecture:** Add a new backend asset-management layer alongside the existing `/api/equipment/*` consumer contract. Persist asset metadata, ports, bindings, versions, and uploads in SQLite-style relational tables, while model binaries go through a local object-storage adapter that returns future-OSS-compatible URLs. On the frontend, add a dedicated `/assets` page for CRUD and publishing, then simplify the editor so it only reads published assets from the existing equipment catalog endpoints.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, Vite, Vitest, Express 5, Zod, SQLite (or a SQLite-backed repository layer), local filesystem storage adapter

---

## File Map

### Backend asset-management domain

- Create: `apps/mock-api/src/lib/assetStore.ts`
  - Repository/service layer for asset CRUD, ports, bindings, versions, and published-catalog projection
- Create: `apps/mock-api/src/lib/storageAdapter.ts`
  - Local object-storage adapter for uploaded `model.glb`
- Create: `apps/mock-api/src/routes/assets.ts`
  - New `/api/assets/*` management routes
- Modify: `apps/mock-api/src/routes/equipment.ts`
  - Stop reading raw JSON files and instead project published assets from `assetStore`
- Modify: `apps/mock-api/src/app.ts`
  - Mount the new asset routes
- Modify: `apps/mock-api/src/schemas.ts`
  - Add request/response schemas for assets, ports, bindings, uploads, publish/archive/delete
- Modify: `apps/mock-api/src/app.test.ts`
  - Extend integration coverage for asset CRUD + publish path

### Frontend asset management

- Create: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
  - Asset center shell
- Create: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`
  - Page-level coverage for asset CRUD workflow
- Create: `apps/twin-web/src/services/api/assetsApi.ts`
  - Frontend client for `/api/assets/*`
- Create: `apps/twin-web/src/schemas/assets.ts`
  - Page-facing asset DTOs
- Create: `apps/twin-web/src/components/assets/AssetList.tsx`
  - Left-side asset list and status filter
- Create: `apps/twin-web/src/components/assets/AssetForm.tsx`
  - Basic asset form section
- Create: `apps/twin-web/src/components/assets/AssetPortsEditor.tsx`
  - Table + JSON dual-mode editor
- Create: `apps/twin-web/src/components/assets/AssetBindingsEditor.tsx`
  - Placeholder binding editor
- Create: `apps/twin-web/src/components/assets/AssetUploadPanel.tsx`
  - Model upload panel and preview placeholder

### Navigation and editor integration

- Modify: `apps/twin-web/src/App.tsx`
  - Add `/assets`
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
  - Add `资产管理`
- Modify: `apps/twin-web/src/components/panels/DevicePalette.tsx`
  - Remove local asset-pack import as a primary workflow or clearly demote it
- Modify: `apps/twin-web/src/services/api/equipmentApi.ts`
  - Keep published-asset consumer contract stable
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
  - Continue mapping published assets without local blob assumptions as the main path

### Docs and verification

- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

---

## Chunk 1: Backend Asset Domain and Published Equipment Projection

### Task 1: Add failing backend tests for asset CRUD and publishing

**Files:**
- Modify: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Add tests for `POST /api/assets`, `PUT /api/assets/:assetId`, and `DELETE /api/assets/:assetId`**

Cover:

- create a draft asset
- update its basic fields
- delete it before publish

- [ ] **Step 2: Add tests for `PUT /api/assets/:assetId/ports` and `PUT /api/assets/:assetId/bindings`**

Assert the backend stores the structured configuration and returns it on `GET /api/assets/:assetId`.

- [ ] **Step 3: Add a publish-flow test**

Test sequence:

1. create draft asset
2. upload or attach a model reference
3. publish asset
4. assert `/api/equipment/catalog`, `/api/equipment/:assetId`, and `/api/equipment/:assetId/ports` now include the asset

- [ ] **Step 4: Run the focused backend test file**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w mock-api
```

Expected: FAIL because `/api/assets/*` does not exist and `/api/equipment/*` still reads JSON files.

- [ ] **Step 5: Commit the failing-test checkpoint**

```bash
git add apps/mock-api/src/app.test.ts
git commit -m "test: define asset management api contract"
```

### Task 2: Implement backend asset repository, storage adapter, and routes

**Files:**
- Create: `apps/mock-api/src/lib/assetStore.ts`
- Create: `apps/mock-api/src/lib/storageAdapter.ts`
- Create: `apps/mock-api/src/routes/assets.ts`
- Modify: `apps/mock-api/src/routes/equipment.ts`
- Modify: `apps/mock-api/src/app.ts`
- Modify: `apps/mock-api/src/schemas.ts`

- [ ] **Step 1: Add asset schemas to `apps/mock-api/src/schemas.ts`**

Define DTOs for:

- asset list item
- asset detail
- ports payload
- bindings payload
- upload response
- publish/archive requests if needed

- [ ] **Step 2: Implement `assetStore.ts`**

Provide functions with focused responsibilities:

- `listAssets`
- `createAssetDraft`
- `getAsset`
- `updateAsset`
- `replaceAssetPorts`
- `replaceAssetBindings`
- `publishAsset`
- `archiveAsset`
- `deleteAsset`
- `listPublishedAssetKeys`
- `getPublishedAssetJson`
- `getPublishedPortsJson`

Use a relational persistence layer compatible with SQLite semantics. If the repo already has a DB helper, use it; otherwise keep the repository boundary explicit so the first implementation can swap from local persistence to SQLite-backed persistence cleanly.

- [ ] **Step 3: Implement `storageAdapter.ts`**

Expose:

- `saveModelUpload(fileLike) -> { storageKey, publicUrl, sizeBytes, mimeType }`

For v1, save to a local storage directory and return a stable URL path.

- [ ] **Step 4: Implement `routes/assets.ts`**

Add:

- `GET /api/assets`
- `POST /api/assets`
- `GET /api/assets/:assetId`
- `PUT /api/assets/:assetId`
- `PUT /api/assets/:assetId/ports`
- `PUT /api/assets/:assetId/bindings`
- `POST /api/assets/uploads`
- `POST /api/assets/:assetId/publish`
- `POST /api/assets/:assetId/archive`
- `DELETE /api/assets/:assetId`
- `GET /api/assets/:assetId/versions`

- [ ] **Step 5: Replace raw JSON reads in `routes/equipment.ts`**

Project only published assets from `assetStore`, preserving the existing response shape expected by the frontend.

- [ ] **Step 6: Mount the new route set in `app.ts`**

Add:

```ts
app.use('/api/assets', createAssetsRouter(options))
```

- [ ] **Step 7: Re-run backend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w mock-api
npm run build -w mock-api
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/mock-api/src/lib/assetStore.ts apps/mock-api/src/lib/storageAdapter.ts apps/mock-api/src/routes/assets.ts apps/mock-api/src/routes/equipment.ts apps/mock-api/src/app.ts apps/mock-api/src/schemas.ts apps/mock-api/src/app.test.ts
git commit -m "feat: add backend asset management api"
```

---

## Chunk 2: Frontend `/assets` Page and Asset Editor

### Task 3: Add failing frontend tests for the new asset page

**Files:**
- Create: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`

- [ ] **Step 1: Write tests for `/assets` page rendering**

Cover:

- asset list loads from backend
- selecting an asset shows the form
- status filter changes the list request or list result handling

- [ ] **Step 2: Add tests for create/update/publish/archive/delete actions**

At minimum:

- create draft
- edit basic fields
- save ports in table mode
- switch to JSON mode and save valid ports payload
- publish asset

- [ ] **Step 3: Add a test for model upload panel**

Mock the upload endpoint and assert the returned model URL is rendered in the page state.

- [ ] **Step 4: Run the focused frontend test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/assets/AssetsPage.test.tsx
```

Expected: FAIL because `/assets` page and assets API client do not exist.

- [ ] **Step 5: Commit the failing-test checkpoint**

```bash
git add apps/twin-web/src/pages/assets/AssetsPage.test.tsx
git commit -m "test: define asset center page workflow"
```

### Task 4: Implement the frontend asset center

**Files:**
- Create: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
- Create: `apps/twin-web/src/services/api/assetsApi.ts`
- Create: `apps/twin-web/src/schemas/assets.ts`
- Create: `apps/twin-web/src/components/assets/AssetList.tsx`
- Create: `apps/twin-web/src/components/assets/AssetForm.tsx`
- Create: `apps/twin-web/src/components/assets/AssetPortsEditor.tsx`
- Create: `apps/twin-web/src/components/assets/AssetBindingsEditor.tsx`
- Create: `apps/twin-web/src/components/assets/AssetUploadPanel.tsx`
- Modify: `apps/twin-web/src/App.tsx`
- Modify: `apps/twin-web/src/components/layout/AppNav.tsx`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Add `assetsApi.ts`**

Implement focused client functions:

- `listAssets`
- `createAsset`
- `getAsset`
- `updateAsset`
- `replaceAssetPorts`
- `replaceAssetBindings`
- `uploadAssetModel`
- `publishAsset`
- `archiveAsset`
- `deleteAsset`
- `listAssetVersions`

- [ ] **Step 2: Add frontend asset schemas**

Define view-model types that match the backend DTOs and keep dual-mode ports editing straightforward.

- [ ] **Step 3: Build the `/assets` page shell**

Use a three-column layout:

- left: list and filters
- center: form + ports + bindings
- right: upload panel + validation summary

- [ ] **Step 4: Implement `AssetPortsEditor` with dual mode**

Support:

- row-based table editing
- JSON text editing
- shared validation

- [ ] **Step 5: Implement `AssetBindingsEditor`**

Keep it simple: grouped key/value rows by binding type.

- [ ] **Step 6: Implement `AssetUploadPanel`**

Support selecting a `model.glb`, uploading it through the backend, and showing the resulting URL.

- [ ] **Step 7: Register `/assets` in `App.tsx` and `AppNav.tsx`**

Expose `资产管理` as a first-class page without breaking the existing scene-first flow.

- [ ] **Step 8: Re-run focused frontend tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/assets/AssetsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/twin-web/src/pages/assets apps/twin-web/src/services/api/assetsApi.ts apps/twin-web/src/schemas/assets.ts apps/twin-web/src/components/assets apps/twin-web/src/App.tsx apps/twin-web/src/components/layout/AppNav.tsx apps/twin-web/src/index.css
git commit -m "feat: add asset management center page"
```

---

## Chunk 3: Editor Catalog Integration and Import Demotion

### Task 5: Add failing tests around published-asset consumption

**Files:**
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
- Modify or Create: `apps/twin-web/src/services/api/equipmentApi.test.ts`
- Modify: `apps/twin-web/src/components/panels/DevicePalette.tsx`
- Add or extend tests in: `apps/twin-web/src/pages/editor/EditorPage.test.tsx`

- [ ] **Step 1: Add/extend an equipment API test**

Assert the frontend still parses the published-asset equipment endpoints after the backend refactor.

- [ ] **Step 2: Add a DevicePalette expectation**

Define the post-change behavior:

- published assets are the default catalog source
- local folder import is demoted or clearly labeled as dev-only

- [ ] **Step 3: Run the focused tests to verify failure or mismatch**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/services/api/equipmentApi.test.ts src/pages/editor/EditorPage.test.tsx
```

Expected: FAIL or require updates because the catalog assumptions changed.

- [ ] **Step 4: Commit the failing-test checkpoint**

```bash
git add apps/twin-web/src/services/api/equipmentApi.test.ts apps/twin-web/src/pages/editor/EditorPage.test.tsx apps/twin-web/src/components/panels/DevicePalette.tsx
git commit -m "test: lock published asset catalog behavior"
```

### Task 6: Update the editor to consume only published assets by default

**Files:**
- Modify: `apps/twin-web/src/services/api/equipmentApi.ts`
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
- Modify: `apps/twin-web/src/components/panels/DevicePalette.tsx`
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`

- [ ] **Step 1: Keep `equipmentApi.ts` aligned with the published-asset contract**

Preserve the current DTOs but ensure they rely on the backend projection rather than filesystem assumptions.

- [ ] **Step 2: Simplify `loadEquipmentCatalog.ts` assumptions**

Make the main path backend-first:

- backend-provided asset metadata
- backend-provided model URLs

Avoid treating local blob imports as the primary path.

- [ ] **Step 3: Demote local import actions in `DevicePalette.tsx`**

Options:

- move them under a “开发辅助” section
- or hide behind secondary affordance

Do not remove them entirely in this chunk unless the backend-first workflow fully replaces them.

- [ ] **Step 4: Re-run focused tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/services/api/equipmentApi.test.ts src/pages/editor/EditorPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/twin-web/src/services/api/equipmentApi.ts apps/twin-web/src/services/loadEquipmentCatalog.ts apps/twin-web/src/components/panels/DevicePalette.tsx apps/twin-web/src/pages/editor/EditorPage.tsx
git commit -m "feat: make editor consume published assets"
```

---

## Chunk 4: Docs, Full Verification, and Manual Smoke Test

### Task 7: Update docs and run full verification

**Files:**
- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`
- Modify: `apps/twin-web/package.json` if test scripts need to include the new asset-page tests

- [ ] **Step 1: Update docs**

Document:

- new `/assets` page
- asset CRUD/publish workflow
- backend-first published asset catalog
- local object-storage adapter instead of direct OSS in v1

- [ ] **Step 2: Add new frontend test files to the workspace test command**

Include `AssetsPage.test.tsx` and any new assets-related tests in `apps/twin-web/package.json`.

- [ ] **Step 3: Run full frontend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w twin-web
npm run lint -w twin-web
npm run build -w twin-web
```

Expected: PASS.

- [ ] **Step 4: Run full backend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w mock-api
npm run build -w mock-api
```

Expected: PASS.

- [ ] **Step 5: Manual browser smoke test**

Validate:

1. open `/assets`
2. create a draft asset
3. upload a `model.glb`
4. edit ports in table mode
5. switch to JSON mode and save
6. publish asset
7. open `/editor`
8. verify the published asset appears in the device palette

- [ ] **Step 6: Commit**

```bash
git add README.md apps/twin-web/README.md docs/project-tech-stack-and-risks.md apps/twin-web/package.json
git commit -m "docs: document asset management center"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-08-asset-management-center.md`. Ready to execute?
