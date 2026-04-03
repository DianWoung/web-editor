# Runtime Data Closed-Loop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace frontend-only generated runtime data with a polling-based frontend-to-`mock-api` runtime contract for overview aggregates and single-device detail views.

**Architecture:** Add a dedicated runtime route and service path inside `apps/mock-api`, with snapshot override plus deterministic fallback generation from the current scene. In `twin-web`, replace local runtime generation with an API-backed runtime client and runtime store, then wire overview and detail pages to fetch and poll backend runtime data.

**Tech Stack:** Node.js, Express, TypeScript, React, Zustand, Vite, Zod, Node built-in test runner

---

## Chunk 1: Backend Runtime Contract

### Task 1: Define backend runtime schemas and route entry points

**Files:**
- Modify: `apps/mock-api/src/app.ts`
- Modify: `apps/mock-api/src/schemas.ts`
- Create: `apps/mock-api/src/routes/runtime.ts`
- Test: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Write a failing route-level test for runtime overview**

Add a new `GET /api/runtime/overview` test in `apps/mock-api/src/app.test.ts` that expects:
- HTTP `200`
- JSON object with `totalPower`, `avgCop`, `activeAlarmCount`, and `lastUpdatedAt`

- [ ] **Step 2: Run the backend test to verify it fails for the expected reason**

Run: `npm test -w mock-api`
Expected: FAIL because `/api/runtime/overview` does not exist yet and returns `404`.

- [ ] **Step 3: Write a failing route-level test for single-device runtime**

Add a new `GET /api/runtime/devices/:deviceId` test in `apps/mock-api/src/app.test.ts` that expects:
- HTTP `200`
- JSON object with `deviceId`, `onlineStatus`, `updatedAt`, `points`, `alarms`, and `trend`

- [ ] **Step 4: Run the backend test again to verify both tests fail**

Run: `npm test -w mock-api`
Expected: FAIL because the runtime route is still missing.

- [ ] **Step 5: Add minimal runtime route wiring and runtime schemas**

Implement the smallest possible version that mounts `/api/runtime` in `apps/mock-api/src/app.ts`, adds runtime response Zod schemas to `apps/mock-api/src/schemas.ts`, and returns placeholder-but-schema-valid JSON from the new route module.

- [ ] **Step 6: Run the backend test to verify the new runtime endpoints pass**

Run: `npm test -w mock-api`
Expected: PASS for the new runtime route tests and previously existing API tests.

### Task 2: Add missing-device error coverage

**Files:**
- Modify: `apps/mock-api/src/routes/runtime.ts`
- Test: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Write a failing test for unknown device runtime**

Add a test in `apps/mock-api/src/app.test.ts` that requests `GET /api/runtime/devices/UNKNOWN` and expects HTTP `404` with `{ ok: false }`.

- [ ] **Step 2: Run the backend test to verify it fails**

Run: `npm test -w mock-api`
Expected: FAIL because the placeholder handler does not distinguish missing devices yet.

- [ ] **Step 3: Implement `404` handling in the runtime route**

Update `apps/mock-api/src/routes/runtime.ts` so unknown scene device IDs produce a controlled `404`.

- [ ] **Step 4: Re-run the backend test suite**

Run: `npm test -w mock-api`
Expected: PASS

## Chunk 2: Backend Runtime Sources

### Task 3: Add deterministic runtime generation from the current scene

**Files:**
- Create: `apps/mock-api/src/lib/runtimeGenerator.ts`
- Create: `apps/mock-api/src/lib/runtimeService.ts`
- Modify: `apps/mock-api/src/routes/runtime.ts`
- Modify: `apps/mock-api/src/schemas.ts`
- Test: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Write a failing test that asserts generated device runtime fields**

Add a backend test that seeds a scene with at least one device and expects the runtime detail response to include:
- deterministic `onlineStatus`
- per-device `updatedAt`
- point-level `quality`
- non-empty `points` and `trend`

- [ ] **Step 2: Verify the failure is caused by incomplete runtime generation**

Run: `npm test -w mock-api`
Expected: FAIL because the placeholder runtime payload is too thin or non-deterministic.

- [ ] **Step 3: Implement deterministic runtime generation**

Create `apps/mock-api/src/lib/runtimeGenerator.ts` to generate stable runtime payloads from scene devices, and `apps/mock-api/src/lib/runtimeService.ts` to assemble:
- overview aggregate payload
- per-device runtime payload

- [ ] **Step 4: Replace placeholder route responses with service-backed data**

Update `apps/mock-api/src/routes/runtime.ts` to load the current scene and delegate to the runtime service.

- [ ] **Step 5: Re-run backend tests**

Run: `npm test -w mock-api`
Expected: PASS

### Task 4: Add snapshot override support for tests and demos

**Files:**
- Create: `apps/mock-api/src/lib/runtimeSnapshot.ts`
- Create: `apps/mock-api/data/runtime/.gitkeep`
- Modify: `apps/mock-api/src/lib/runtimeService.ts`
- Modify: `apps/mock-api/src/app.test.ts`

- [ ] **Step 1: Write a failing test for snapshot override**

Add a test that writes an injected runtime snapshot file under the fixture-specific `<dataRoot>/runtime/` directory created by `apps/mock-api/src/app.test.ts`, then expect the runtime endpoint to return snapshot values instead of generated values.

- [ ] **Step 2: Verify the override test fails**

Run: `npm test -w mock-api`
Expected: FAIL because snapshot loading is not implemented yet.

- [ ] **Step 3: Implement snapshot lookup and precedence**

Create `apps/mock-api/src/lib/runtimeSnapshot.ts` to read and validate an optional snapshot file, then update `apps/mock-api/src/lib/runtimeService.ts` so snapshot data wins when present and generated data is the fallback.

- [ ] **Step 4: Run the backend suite again**

Run: `npm test -w mock-api`
Expected: PASS

## Chunk 3: Frontend Runtime Client and Store

### Task 5: Replace local runtime types with API contract types

**Files:**
- Modify: `apps/twin-web/src/schemas/deviceRuntime.ts`
- Create: `apps/twin-web/src/services/api/runtimeApi.ts`
- Test: `apps/twin-web/src/services/api/runtimeApi.test.ts`
- Modify: `apps/twin-web/package.json`

- [ ] **Step 1: Write a failing frontend API parsing test for overview**

Create `apps/twin-web/src/services/api/runtimeApi.test.ts` with a test that expects a runtime overview parser/client helper to accept backend JSON containing `totalPower`, `avgCop`, `activeAlarmCount`, and `lastUpdatedAt`.

- [ ] **Step 2: Add a scoped frontend test command and verify red**

Add a `test` script to `apps/twin-web/package.json` using the Node test runner, but scope it to the runtime-focused test files so unrelated existing test failures do not pollute the TDD loop. The command should explicitly include only:
- `src/services/api/runtimeApi.test.ts`
- `src/store/runtimeStore.test.ts`
- any new runtime page or hook test files added by this plan

Then run:

Run: `npm test -w twin-web`
Expected: FAIL because the runtime API module and types do not exist yet.

- [ ] **Step 3: Update frontend runtime contract types**

Replace the current local-mock-only shape in `apps/twin-web/src/schemas/deviceRuntime.ts` with API-backed types for overview/detail runtime payloads:
- `RuntimeOverview`
- `DeviceRuntime`
- `OnlineStatus`
- `TelemetryQuality` including `stale`

Keep `runMode`, `runModeDescription`, `strategyHint`, and `aiSuggestion` available to `DeviceDetailPage` for now, because backend-owning those fields is explicitly out of scope in the approved design. The runtime contract migration must not silently remove those UI sections.

- [ ] **Step 4: Implement `runtimeApi.ts`**

Create `apps/twin-web/src/services/api/runtimeApi.ts` with typed methods for:
- `getRuntimeOverview()`
- `getDeviceRuntime(deviceId)`

- [ ] **Step 5: Re-run frontend API tests**

Run: `npm test -w twin-web`
Expected: PASS

### Task 6: Refactor the runtime store into an API-backed cache

**Files:**
- Modify: `apps/twin-web/src/store/runtimeStore.ts`
- Modify: `apps/twin-web/src/store/runtimeStore.test.ts`
- Create: `apps/twin-web/src/hooks/useRuntimePolling.ts`

- [ ] **Step 1: Write a failing store test for overview fetch state**

Add a test in `apps/twin-web/src/store/runtimeStore.test.ts` that expects the store to:
- call an injected or mocked runtime API method
- save `overview`
- set and clear loading/error state correctly

- [ ] **Step 2: Run the store test to verify it fails**

Run: `npm test -w twin-web`
Expected: FAIL because the current store still generates data locally and lacks fetch state.

- [ ] **Step 3: Refactor `runtimeStore.ts` to fetch and cache API data**

Update the runtime store so it owns:
- `overview`
- `deviceRuntimeById`
- `loadingOverview`
- `loadingDeviceIds`
- `overviewError`
- `deviceErrorById`
- `lastFetchedAt`
- actions for fetching overview and device runtime

- [ ] **Step 4: Add polling lifecycle helper**

Create `apps/twin-web/src/hooks/useRuntimePolling.ts` to centralize polling setup and teardown so pages do not duplicate timer logic.

- [ ] **Step 5: Re-run frontend store tests**

Run: `npm test -w twin-web`
Expected: PASS

## Chunk 4: Frontend Page Integration and Verification

### Task 7: Switch overview and detail pages to backend runtime data

**Files:**
- Modify: `apps/twin-web/src/pages/overview/OverviewPage.tsx`
- Modify: `apps/twin-web/src/pages/detail/DeviceDetailPage.tsx`
- Modify: `apps/twin-web/src/hooks/useSyncRuntimeWithScene.ts`
- Create: `apps/twin-web/src/pages/runtimeIntegration.test.tsx`
- Modify or Delete: `apps/twin-web/src/services/mockDeviceRuntime.ts`
- Modify: `apps/twin-web/package.json`

- [ ] **Step 1: Write a failing page-integration test for overview/detail runtime wiring**

Create `apps/twin-web/src/pages/runtimeIntegration.test.tsx` with a minimal React integration harness for runtime page wiring. The test should prove:
- overview-related UI reads values from backend fetch results
- detail-related UI reads values from backend fetch results
- `DeviceDetailPage` still renders the existing strategy and AI sections
- old local generation behavior is no longer required for overview/detail

- [ ] **Step 2: Verify the failure**

Run: `npm test -w twin-web`
Expected: FAIL because the pages and sync hook still rely on local runtime generation or do not yet consume the backend-backed runtime store.

- [ ] **Step 3: Update page integration**

Change:
- `OverviewPage.tsx` to fetch overview data and use polling
- `DeviceDetailPage.tsx` to fetch device runtime and use polling
- `useSyncRuntimeWithScene.ts` so it no longer triggers local runtime generation

Remove or isolate the old `mockDeviceRuntime.ts` path if it is no longer needed by overview/detail.

- [ ] **Step 4: Re-run frontend tests**

Run: `npm test -w twin-web`
Expected: PASS

### Task 8: Verify full repo health after runtime integration

**Files:**
- Modify: `apps/twin-web/README.md`
- Modify: `docs/superpowers/specs/2026-04-02-runtime-data-closed-loop-design.md` only if implementation clarifications are required

- [ ] **Step 1: Run backend tests**

Run: `npm test -w mock-api`
Expected: PASS

- [ ] **Step 2: Run frontend tests**

Run: `npm test -w twin-web`
Expected: PASS

- [ ] **Step 3: Run frontend lint**

Run: `npm run lint -w twin-web`
Expected: PASS

- [ ] **Step 4: Run both builds**

Run: `npm run build -w mock-api`
Expected: PASS

Run: `npm run build -w twin-web`
Expected: PASS

- [ ] **Step 5: Update usage docs**

Document:
- runtime endpoint behavior
- polling behavior
- snapshot override behavior for demos/tests

- [ ] **Step 6: Commit the completed runtime closed-loop implementation**

```bash
git add apps/mock-api apps/twin-web docs/superpowers/specs/2026-04-02-runtime-data-closed-loop-design.md apps/twin-web/README.md
git commit -m "feat: add api-backed runtime data loop"
```
