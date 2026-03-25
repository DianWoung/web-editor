# Mock Scene Service Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file-backed Express mock API for equipment and the current scene, then switch the frontend scene flow to use HTTP so the project can be debugged against a backend boundary.

**Architecture:** Create a new `apps/mock-api` workspace with focused routes for health, equipment, and single-scene persistence. Keep `twin-web` store and schemas intact, add a small API client layer, and replace direct static-file reads with explicit backend calls plus a manual “save to backend” action.

**Tech Stack:** Node.js, Express, TypeScript, Vite, React, Zustand, Zod

---

## Chunk 1: Mock API Workspace

### Task 1: Scaffold `apps/mock-api`

**Files:**
- Create: `apps/mock-api/package.json`
- Create: `apps/mock-api/tsconfig.json`
- Create: `apps/mock-api/src/server.ts`
- Create: `apps/mock-api/src/lib/fileStore.ts`
- Create: `apps/mock-api/src/lib/httpErrors.ts`
- Create: `apps/mock-api/src/routes/health.ts`
- Create: `apps/mock-api/src/routes/scene.ts`
- Create: `apps/mock-api/src/routes/equipment.ts`
- Create: `apps/mock-api/data/scene/current.scene.json`
- Create: `apps/mock-api/data/scene/demo.scene.json`
- Create: `apps/mock-api/data/equipment/catalog.json`
- Copy: `apps/twin-web/public/equipment/** -> apps/mock-api/data/equipment/**`
- Modify: `package.json`

- [ ] **Step 1: Add a failing backend smoke test target**

Create a minimal Node built-in test or route smoke harness that expects `GET /api/health` and `GET /api/scene` to return JSON.

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `npm run test -w mock-api`
Expected: FAIL because the workspace and routes do not exist yet.

- [ ] **Step 3: Implement the Express server and route wiring**

Add JSON parsing, route mounting, file-backed reads/writes, and consistent error responses.

- [ ] **Step 4: Add root scripts for API startup/build**

Update root `package.json` with `dev:api`, `dev:web`, and `build:api`.

- [ ] **Step 5: Run backend test again**

Run: `npm run test -w mock-api`
Expected: PASS

## Chunk 2: Validation and Persistence

### Task 2: Validate scene and equipment payloads

**Files:**
- Create or Modify: `apps/mock-api/src/schemas/*.ts` or shared import bridge
- Modify: `apps/mock-api/src/routes/scene.ts`
- Modify: `apps/mock-api/src/routes/equipment.ts`
- Test: `apps/mock-api/src/**/*.test.*`

- [ ] **Step 1: Write a failing test for invalid scene writes**

Test that `PUT /api/scene` rejects malformed payloads with `400`.

- [ ] **Step 2: Verify red**

Run: `npm run test -w mock-api`
Expected: FAIL because request validation is missing.

- [ ] **Step 3: Add schema validation and file persistence**

Validate writes before saving `current.scene.json`, and validate equipment files before returning them.

- [ ] **Step 4: Verify green**

Run: `npm run test -w mock-api`
Expected: PASS

## Chunk 3: Frontend API Layer

### Task 3: Replace direct static fetches with API services

**Files:**
- Create: `apps/twin-web/src/services/api/client.ts`
- Create: `apps/twin-web/src/services/api/sceneApi.ts`
- Create: `apps/twin-web/src/services/api/equipmentApi.ts`
- Modify: `apps/twin-web/src/services/loadEquipmentCatalog.ts`
- Modify: `apps/twin-web/src/services/loadDemoScene.ts`
- Modify: `apps/twin-web/src/pages/editor/EditorPage.tsx`
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
- Modify: `apps/twin-web/src/components/panels/SceneJsonToolbar.tsx`
- Modify: `apps/twin-web/vite.config.ts`

- [ ] **Step 1: Write a failing frontend integration expectation**

Add the smallest testable seam possible, or at minimum a build-breaking typed call site that expects the new API service signatures.

- [ ] **Step 2: Verify the failure**

Run: `npm run build -w twin-web`
Expected: FAIL because the API service layer and call sites are not implemented.

- [ ] **Step 3: Implement API client and front-end call path changes**

Switch device catalog loading, current scene loading, demo reset, and explicit save-to-backend to HTTP.

- [ ] **Step 4: Configure Vite proxy or API base URL**

Use `VITE_API_BASE_URL` and a dev proxy so local debugging does not require hardcoded origins.

- [ ] **Step 5: Verify build succeeds**

Run: `npm run build -w twin-web`
Expected: PASS

## Chunk 4: Verification and Startup

### Task 4: End-to-end debug readiness

**Files:**
- Modify: `apps/twin-web/README.md`
- Modify: `docs/superpowers/specs/2026-03-24-mock-scene-service-design.md` (only if implementation-driven clarification is needed)

- [ ] **Step 1: Run frontend lint**

Run: `npm run lint -w twin-web`
Expected: PASS

- [ ] **Step 2: Run backend tests**

Run: `npm run test -w mock-api`
Expected: PASS

- [ ] **Step 3: Run both builds**

Run: `npm run build -w mock-api`
Expected: PASS

Run: `npm run build -w twin-web`
Expected: PASS

- [ ] **Step 4: Start the API service**

Run: `npm run dev:api`
Expected: API listens on the configured local port.

- [ ] **Step 5: Start the frontend**

Run: `npm run dev:web`
Expected: Vite starts and the editor can connect to the API for equipment and scene operations.
