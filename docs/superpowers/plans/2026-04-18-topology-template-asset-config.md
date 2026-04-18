# Topology Template Asset Config Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-form asset connector editing with topology template selection plus limited asset overrides for `name` and `required`, while preserving published `ports` compatibility.

**Architecture:** Extend the mock asset store with topology template data and an apply-template snapshot flow, then update the asset page to select a template and render a constrained override table instead of the current connector editor. Keep existing publish/import contracts by continuing to project connectors into legacy `ports`.

**Tech Stack:** React, TypeScript, Vitest, Express, Zod, SQLite-backed mock store

---

## Chunk 1: Backend Template Snapshot Flow

### Task 1: Add failing store coverage for topology templates and apply-template behavior

**Files:**
- Modify: `apps/mock-api/src/lib/assetStore.test.ts`
- Test: `apps/mock-api/src/lib/assetStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add a store test that:
- lists topology templates
- applies a selected template to a draft asset
- asserts connectors are generated from the template
- asserts asset detail exposes template metadata
- asserts published `ports.json` still contains the projected structure

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mock-api exec node --test src/lib/assetStore.test.ts`
Expected: FAIL because topology template APIs and asset metadata do not exist yet

- [ ] **Step 3: Write minimal implementation**

Modify:
- `apps/mock-api/src/schemas.ts`
- `apps/mock-api/src/lib/assetStore.ts`
- `apps/mock-api/src/routes/assets.ts`

Add:
- topology template schemas/types
- template seed data or persisted tables
- asset metadata for template source
- `applyTopologyTemplate()` store method
- list/detail template APIs and asset apply-template API

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mock-api exec node --test src/lib/assetStore.test.ts`
Expected: PASS

### Task 2: Wire backend routes and payload validation for template endpoints

**Files:**
- Modify: `apps/mock-api/src/routes/assets.ts`
- Modify: `apps/mock-api/src/schemas.ts`

- [ ] **Step 1: Add/adjust failing route validation coverage if needed**

If store tests do not exercise HTTP contracts enough, add assertions through an existing route-level test file or extend store-facing expectations through schema parsing.

- [ ] **Step 2: Run targeted backend tests to verify failure**

Run: `pnpm --filter mock-api exec node --test src/lib/assetStore.test.ts`
Expected: FAIL on missing route/schema support

- [ ] **Step 3: Implement route handlers and payload validation**

Add:
- `GET /api/assets/topology-templates`
- `GET /api/assets/topology-templates/:templateId`
- `POST /api/assets/:assetId/apply-topology-template`

- [ ] **Step 4: Re-run targeted backend tests**

Run: `pnpm --filter mock-api exec node --test src/lib/assetStore.test.ts`
Expected: PASS

## Chunk 2: Frontend Template-Driven Asset Flow

### Task 3: Add failing frontend test for template selection and override-only editing

**Files:**
- Modify: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`
- Test: `apps/twin-web/src/pages/assets/AssetsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that:
- loads template options
- applies a topology template
- renders connector rows with read-only topology fields
- allows editing only connector name and required
- saves through the constrained connector payload path

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter twin-web test --run src/pages/assets/AssetsPage.test.tsx`
Expected: FAIL because the page still renders the old connector editor and lacks template APIs

- [ ] **Step 3: Write minimal implementation**

Modify:
- `apps/twin-web/src/schemas/assets.ts`
- `apps/twin-web/src/services/api/assetsApi.ts`
- `apps/twin-web/src/pages/assets/AssetsPage.tsx`

Create as needed:
- `apps/twin-web/src/components/assets/TopologyTemplatePicker.tsx`
- `apps/twin-web/src/components/assets/ConnectorOverridesTable.tsx`

Remove the asset-page dependency on:
- `ConnectorList.tsx`
- `ConnectorDetailForm.tsx`
- JSON-mode editing as the primary connector workflow

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter twin-web test --run src/pages/assets/AssetsPage.test.tsx`
Expected: PASS

### Task 4: Update styling to support template picker and override table

**Files:**
- Modify: `apps/twin-web/src/index.css`
- Modify: `apps/twin-web/src/components/assets/TopologyTemplatePicker.tsx`
- Modify: `apps/twin-web/src/components/assets/ConnectorOverridesTable.tsx`

- [ ] **Step 1: Add failing UI assertions if needed**

Extend the page test only if accessibility labels or text regressions need protection.

- [ ] **Step 2: Implement CSS for the new layout**

Add styles for:
- template summary cards / list
- override table rows
- read-only topology chips

- [ ] **Step 3: Re-run page test**

Run: `pnpm --filter twin-web test --run src/pages/assets/AssetsPage.test.tsx`
Expected: PASS

## Chunk 3: Verification

### Task 5: Run focused verification and inspect the final diff

**Files:**
- Modify: `docs/superpowers/plans/2026-04-18-topology-template-asset-config.md`

- [ ] **Step 1: Run backend verification**

Run: `pnpm --filter mock-api exec node --test src/lib/assetStore.test.ts`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run: `pnpm --filter twin-web test --run src/pages/assets/AssetsPage.test.tsx`
Expected: PASS

- [ ] **Step 3: Review git diff**

Run: `git diff --stat`
Expected: Only topology-template asset-config files and related tests/components changed

- [ ] **Step 4: Commit**

```bash
git add apps/mock-api/src/lib/assetStore.test.ts apps/mock-api/src/lib/assetStore.ts apps/mock-api/src/routes/assets.ts apps/mock-api/src/schemas.ts apps/twin-web/src/index.css apps/twin-web/src/pages/assets/AssetsPage.test.tsx apps/twin-web/src/pages/assets/AssetsPage.tsx apps/twin-web/src/schemas/assets.ts apps/twin-web/src/services/api/assetsApi.ts apps/twin-web/src/components/assets/TopologyTemplatePicker.tsx apps/twin-web/src/components/assets/ConnectorOverridesTable.tsx docs/superpowers/plans/2026-04-18-topology-template-asset-config.md
git commit -m "feat: add topology template driven asset config"
```
