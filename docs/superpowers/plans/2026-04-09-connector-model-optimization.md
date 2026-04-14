# Connector Model Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the asset-side port model into a connector-oriented model with better business semantics, while keeping the current scene editor and equipment-consumer APIs compatible.

**Architecture:** Introduce connector semantics inside the asset-management domain first, then project connectors back into the existing `ports` shape for the scene editor and equipment endpoints. The frontend asset center becomes semantic-first, while scene storage and pipe endpoint references remain unchanged in this phase.

**Tech Stack:** React 19, React Router 7, Zustand, TypeScript, Vite, Vitest, Express 5, Zod, SQLite-backed repository layer

---

## File Map

### Backend connector domain

- Modify: `apps/mock-api/src/lib/assetStore.ts`
  - Replace internal port persistence with connector-oriented fields and projection helpers
- Modify: `apps/mock-api/src/schemas.ts`
  - Add connector DTOs and compatibility schemas
- Modify: `apps/mock-api/src/routes/assets.ts`
  - Accept connector-oriented asset editing payloads
- Modify: `apps/mock-api/src/routes/equipment.ts`
  - Keep `/ports` output stable via projection
- Modify: `apps/mock-api/src/app.test.ts`
  - Add route-level coverage for connector persistence + `/ports` projection
- Modify: `apps/mock-api/src/lib/assetStore.test.ts`
  - Add repository-level coverage for connector normalization and legacy migration

### Frontend asset management

- Create: `apps/twin-web/src/components/assets/ConnectorList.tsx`
  - Semantic connector list
- Create: `apps/twin-web/src/components/assets/ConnectorDetailForm.tsx`
  - Connector semantic + geometry editor
- Modify: `apps/twin-web/src/components/assets/AssetPortsEditor.tsx`
  - Replace current row-table editor with connector-focused shell or remove entirely
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
  - Move from raw ports editing to connector list + detail flow
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`
  - Cover connector editing flow
- Modify: `apps/twin-web/src/schemas/assets.ts`
  - Add connector-facing schemas
- Modify: `apps/twin-web/src/services/api/assetsApi.ts`
  - Accept connector payloads while keeping compatibility

### Scene/editor compatibility

- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
  - Keep mapping from backend projected `ports` into `portsTemplate`
- Modify: `apps/twin-web/src/schemas/port.ts`
  - Optionally annotate compatibility types and future connector mapping notes

### Docs

- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

---

## Chunk 1: Backend Connector Model with Compatibility Projection

### Task 1: Add failing tests for connector-aware persistence and compatibility projection

**Files:**
- Modify: `apps/mock-api/src/lib/assetStore.test.ts`
- Modify: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Write a failing repository test for connector semantic fields**

Cover:

- persisting `role`
- persisting `medium`
- persisting `side`
- persisting `groupKey`
- persisting `required`

- [ ] **Step 2: Write a failing route test for `PUT /api/assets/:assetId/ports` compatibility input**

Test that the backend accepts compatibility-style port payloads and stores them into connector-oriented columns.

- [ ] **Step 3: Write a failing route test for `GET /api/equipment/:assetId/ports` projection**

Assert the old response shape still returns:

- `id`
- `name`
- `position`
- `system`
- `direction`

even though storage now uses connector fields internally.

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
node --test --experimental-strip-types apps/mock-api/src/app.test.ts apps/mock-api/src/lib/assetStore.test.ts
```

Expected: FAIL because connector semantics are not yet stored.

- [ ] **Step 5: Commit failing test checkpoint**

```bash
git add apps/mock-api/src/app.test.ts apps/mock-api/src/lib/assetStore.test.ts
git commit -m "test: define connector compatibility contract"
```

### Task 2: Implement connector-aware storage and projection

**Files:**
- Modify: `apps/mock-api/src/lib/assetStore.ts`
- Modify: `apps/mock-api/src/schemas.ts`
- Modify: `apps/mock-api/src/routes/assets.ts`
- Modify: `apps/mock-api/src/routes/equipment.ts`

- [ ] **Step 1: Extend backend schemas with connector fields**

Add connector semantic fields:

- `role`
- `medium`
- `side`
- `groupKey`
- `required`
- optional `normal`

- [ ] **Step 2: Add connector columns or equivalent persistence mapping in `assetStore.ts`**

Implement storage so connector semantics are first-class data, not only transient frontend fields.

- [ ] **Step 3: Keep `/api/assets/:assetId` returning connector-rich detail**

Ensure asset detail payloads expose the new fields for the asset center.

- [ ] **Step 4: Keep `/api/equipment/:assetId/ports` backward compatible**

Project connector records back into compatibility `ports`.

- [ ] **Step 5: Re-run backend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
node --test --experimental-strip-types apps/mock-api/src/app.test.ts apps/mock-api/src/lib/assetStore.test.ts
npm run build -w mock-api
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mock-api/src/lib/assetStore.ts apps/mock-api/src/schemas.ts apps/mock-api/src/routes/assets.ts apps/mock-api/src/routes/equipment.ts apps/mock-api/src/app.test.ts apps/mock-api/src/lib/assetStore.test.ts
git commit -m "feat: add connector semantics to asset storage"
```

---

## Chunk 2: Frontend Asset Center Connector Editor

### Task 3: Add failing frontend tests for connector editing UX

**Files:**
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`
- Create: `apps/twin-web/src/components/assets/ConnectorList.tsx`
- Create: `apps/twin-web/src/components/assets/ConnectorDetailForm.tsx`

- [ ] **Step 1: Write a failing page test for semantic-first connector list**

Cover:

- rendering connector list
- selecting a connector
- showing connector semantic fields in detail panel

- [ ] **Step 2: Write a failing page test for geometry editing**

Cover:

- editing anchor coordinates
- saving connector changes

- [ ] **Step 3: Write a failing page test for JSON advanced mode**

Cover:

- switching to JSON mode
- saving valid connector JSON
- showing validation error for malformed JSON

- [ ] **Step 4: Run focused frontend test**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor/apps/twin-web
npx vitest run src/pages/assets/AssetsPage.test.tsx
```

Expected: FAIL because connector UI does not exist yet.

- [ ] **Step 5: Commit failing test checkpoint**

```bash
git add apps/twin-web/src/pages/assets/AssetsPage.test.tsx
git commit -m "test: define connector editor experience"
```

### Task 4: Implement connector-focused asset editor

**Files:**
- Create: `apps/twin-web/src/components/assets/ConnectorList.tsx`
- Create: `apps/twin-web/src/components/assets/ConnectorDetailForm.tsx`
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.tsx`
- Modify: `apps/twin-web/src/schemas/assets.ts`
- Modify: `apps/twin-web/src/services/api/assetsApi.ts`
- Modify: `apps/twin-web/src/index.css`

- [ ] **Step 1: Add frontend connector schemas**

Model:

- semantic fields
- geometry fields
- advanced JSON shape

- [ ] **Step 2: Build `ConnectorList.tsx`**

Display:

- name
- system
- role
- direction
- side
- binding status summary

- [ ] **Step 3: Build `ConnectorDetailForm.tsx`**

Separate:

- semantic section
- geometry section
- optional binding preview

- [ ] **Step 4: Rework `AssetsPage.tsx` to use connector editing flow**

Behavior:

- connector list on the left or middle
- selected connector detail on the right
- advanced JSON mode remains available but secondary

- [ ] **Step 5: Update styles in `index.css`**

Keep current asset center visual language, but make the connector editor legible and compact.

- [ ] **Step 6: Re-run frontend verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
npm test -w twin-web
npm run lint -w twin-web
npm run build -w twin-web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/twin-web/src/components/assets/ConnectorList.tsx apps/twin-web/src/components/assets/ConnectorDetailForm.tsx apps/twin-web/src/pages/assets/AssetsPage.tsx apps/twin-web/src/pages/assets/AssetsPage.test.tsx apps/twin-web/src/schemas/assets.ts apps/twin-web/src/services/api/assetsApi.ts apps/twin-web/src/index.css
git commit -m "feat: add semantic connector editor"
```

---

## Chunk 3: Compatibility Cleanup and Documentation

### Task 5: Keep editor/runtime compatibility stable and document the new model

**Files:**
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
- Modify: `apps/twin-web/src/schemas/port.ts`
- Modify: `README.md`
- Modify: `apps/twin-web/README.md`
- Modify: `docs/project-tech-stack-and-risks.md`

- [ ] **Step 1: Annotate compatibility boundary in `loadEquipmentCatalog.ts`**

Document clearly that editor still consumes projected `ports`, not raw connector data.

- [ ] **Step 2: Add compatibility note in `src/schemas/port.ts`**

Clarify that current scene schema is still port-based and generated from connectors.

- [ ] **Step 3: Update docs**

Document:

- connector-oriented asset model
- compatibility projection to `/api/equipment/:assetId/ports`
- asset center editing changes

- [ ] **Step 4: Run final verification**

Run:

```bash
cd /Users/dianwang-mac/Documents/workspace/web-editor
node --test --experimental-strip-types apps/mock-api/src/app.test.ts apps/mock-api/src/lib/assetStore.test.ts
npm run build -w mock-api
npm test -w twin-web
npm run lint -w twin-web
npm run build -w twin-web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/twin-web/src/services/loadEquipmentCatalog.ts apps/twin-web/src/schemas/port.ts README.md apps/twin-web/README.md docs/project-tech-stack-and-risks.md
git commit -m "docs: describe connector-based asset model"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-04-09-connector-model-optimization.md`. Ready to execute?
