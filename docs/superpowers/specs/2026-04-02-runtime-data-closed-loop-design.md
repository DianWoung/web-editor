# Runtime Data Closed-Loop Design

## Goal

Build the first real runtime-data loop for the project by replacing frontend-only generated runtime data with a frontend-to-`mock-api` runtime contract. The first version covers overview aggregates and single-device detail data, includes monitoring fields such as online status, update time, and point quality, and uses polling rather than push transport.

## Scope

### In Scope

- Add runtime REST endpoints to `apps/mock-api`
- Define shared runtime response shapes in frontend and backend code
- Support two backend runtime sources:
  - dynamic generation based on the current scene
  - injected snapshot files for testing and demos
- Replace frontend local runtime generation with API-backed fetching
- Poll runtime data from the frontend on a fixed interval
- Show backend-sourced runtime data on:
  - `/overview`
  - `/detail/:deviceId`
- Include the following monitoring fields in the first version:
  - `onlineStatus`
  - `updatedAt`
  - point-level `quality`

### Out of Scope

- SSE or WebSocket transport
- Real external telemetry ingestion
- Database-backed runtime persistence
- Historical storage beyond generated or injected trend payloads
- Moving AI suggestion text or strategy text to the backend
- Browser E2E automation

## Current State

The editor workflow is already mature enough to load, save, import, export, and manipulate scene data. The runtime-display flow is not yet real:

- overview data is derived in the frontend from a local runtime store
- device detail data is derived in the frontend from local runtime generation
- the runtime store currently creates runtime values itself instead of fetching them

This means the application can demo monitoring, but it cannot exercise a real contract between frontend and backend.

## Requirements

### Functional Requirements

1. The overview page must fetch aggregate runtime data from the backend.
2. The device detail page must fetch runtime data for a specific device from the backend.
3. The backend must return monitoring fields for each device runtime:
   - online status
   - updated time
   - point quality
4. The frontend must poll runtime data on an interval.
5. The backend must default to dynamic generation based on scene devices.
6. The backend must allow injected snapshot data to override dynamic generation for tests and demos.
7. A missing device runtime request must return `404`.

### Non-Functional Requirements

- Keep the first version small and testable.
- Preserve the existing scene editing flow.
- Keep the frontend pages independent from runtime-generation internals.
- Make the runtime contract easy to replace with a real backend later.

## Architecture

Introduce a dedicated runtime boundary while keeping implementation inside the current `mock-api`.

### Backend

Add a runtime route group under `/api/runtime`:

- `GET /api/runtime/overview`
- `GET /api/runtime/devices/:deviceId`

The backend runtime layer will resolve data from one of two sources:

1. Injected snapshot source
2. Dynamic generated source based on `current.scene.json`

The backend will prefer snapshot data when present, otherwise fall back to generated data.

Recommended backend decomposition:

- route layer:
  validates request and maps errors to HTTP responses
- service layer:
  resolves runtime source and builds contract payloads
- generator layer:
  creates deterministic demo runtime from scene devices
- snapshot layer:
  reads injected runtime payloads from disk when available

### Frontend

Replace frontend-generated runtime with an API-backed runtime store.

Recommended frontend decomposition:

- API client layer:
  fetches overview and device runtime payloads
- runtime store:
  caches API results, loading state, error state, and poll timestamps
- page layer:
  renders store data only and no longer generates runtime data locally

## Data Contract

### RuntimeOverview

```ts
type RuntimeOverview = {
  totalPower: number
  avgCop: number
  activeAlarmCount: number
  lastUpdatedAt: string | null
}
```

### DeviceRuntime

```ts
type OnlineStatus = 'online' | 'offline' | 'degraded'
type PointQuality = 'good' | 'bad' | 'stale'

type RuntimePoint = {
  id: string
  name: string
  value: number
  unit: string
  quality: PointQuality
}

type RuntimeAlarm = {
  id: string
  level: 'warning' | 'critical'
  message: string
  time: string
}

type RuntimeTrendSample = {
  t: string
  v: number
}

type DeviceRuntime = {
  deviceId: string
  deviceName: string
  system: string
  onlineStatus: OnlineStatus
  updatedAt: string
  points: RuntimePoint[]
  alarms: RuntimeAlarm[]
  trend: RuntimeTrendSample[]
}
```

### Notes

- `quality` is backend-owned monitoring data, not frontend-derived presentation logic.
- `updatedAt` is per-device runtime freshness.
- `lastUpdatedAt` in `RuntimeOverview` represents the backend aggregate freshness for the overview payload.

## Backend Data Resolution

### Default Dynamic Generation

Use the current scene file as the device inventory and generate deterministic runtime data per device. Deterministic generation is preferred so that test expectations remain stable.

Expected dynamic fields:

- overview aggregate values derived from device runtime payloads
- per-device `onlineStatus`
- per-device `updatedAt`
- point list with `quality`
- alarm list
- trend samples

### Snapshot Injection

Support an optional runtime snapshot file under the mock data directory. When present, the backend should use the snapshot values instead of generated values for matching devices and overview data.

The snapshot source exists for:

- stable automated tests
- deterministic demos
- reproducing UI edge cases

The exact file shape should mirror the API contract closely to avoid translation complexity.

## Frontend State Flow

### Store Responsibilities

The runtime store should own:

- `overview`
- `deviceRuntimeById`
- `loadingOverview`
- `loadingDeviceIds`
- `overviewError`
- `deviceErrorById`
- `lastFetchedAt`
- polling lifecycle methods

The runtime store should no longer generate runtime values.

### Page Flow

#### Overview Page

1. Ensure scene is loaded.
2. Fetch runtime overview from the backend.
3. Start polling on the selected interval.
4. Render aggregate values and runtime freshness.
5. Show an error state if the request fails.

#### Detail Page

1. Ensure scene is loaded.
2. Fetch runtime payload for the selected device.
3. Start polling for that device.
4. Render backend-provided status, points, alarms, and trend data.
5. Show `404` or error state when the device runtime is unavailable.

## Error Handling

### Backend

- Return `404` for unknown device IDs.
- Return `500` for malformed snapshot data or unreadable runtime data files.
- Keep scene validation and runtime validation separate so failure causes remain clear.

### Frontend

- Distinguish scene-loading errors from runtime-loading errors.
- Keep the last successful runtime payload only if explicitly desired later; first version can replace it with an error state for simplicity.
- Avoid silently falling back to local mock generation when API calls fail.

## Polling Strategy

Use fixed-interval polling for the first version.

Recommended defaults:

- overview polling interval: `10s`
- device detail polling interval: `10s`

The interval should be centralized in runtime code rather than duplicated in page components.

## Testing Strategy

### Backend Tests

Add tests for:

- overview runtime response shape
- device runtime response shape
- `404` for missing `deviceId`
- snapshot override behavior
- fallback to dynamic generation when snapshot is absent
- inclusion of `onlineStatus`, `updatedAt`, and point `quality`

### Frontend Tests

Add tests for:

- runtime API client parsing
- runtime store overview fetch behavior
- runtime store device fetch behavior
- polling refresh replacing cached values
- error state transitions
- page rendering from backend-provided runtime data

## Trade-Offs

### Why polling first

Polling is enough to validate the runtime contract and keeps the first delivery low-risk. It avoids introducing connection lifecycle complexity before the system has a stable payload model.

### Why a runtime contract layer now

If the frontend continues to generate runtime locally, replacing it later will require deeper page and store rewrites. A small contract layer now keeps the migration cost low.

### Why not backend-own AI text yet

That would expand this task from monitoring data transport into content ownership and product copy decisions. It does not help the first runtime-data milestone.

## Implementation Boundary

A successful first iteration should produce all of the following:

- runtime API endpoints in `mock-api`
- test coverage for backend runtime endpoints
- runtime API client and store in `twin-web`
- overview and detail pages reading backend runtime data
- polling-based refresh
- no remaining frontend dependency on local runtime generation for the overview/detail experience

## Risks

- Runtime schemas can drift between frontend and backend if they are duplicated carelessly.
- Polling logic can leak timers if lifecycle ownership is unclear.
- Snapshot support can become a second source of truth if the override rules are ambiguous.

## Recommendation

Implement this in a small closed loop:

1. backend runtime contract and tests
2. backend dynamic generation and snapshot override
3. frontend runtime client and store
4. overview and detail integration
5. verification with build, lint, and targeted tests
