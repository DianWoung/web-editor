# web-editor

Monorepo for a scene editor, named-scene management/preview workflow, asset management center, and a mock runtime-data backend used for local development, demos, and closed-loop runtime verification.

## Workspace Layout

- `apps/twin-web`: frontend app for scene management, asset management, overview, device detail, preview, and scene editing
- `apps/mock-api`: mock backend serving scene, asset, equipment, and runtime endpoints
- `assets`: model generation assets and related source material
- `docs`: project notes, specs, plans, and technical risk records

## Requirements

- Node.js 20+
- npm workspaces enabled via the root `package.json`

## Install

```bash
npm install
```

## Common Commands

From the repository root:

```bash
# frontend dev server
npm run dev

# backend dev server
npm run dev:api

# frontend production build
npm run build

# backend production build
npm run build:api
```

Workspace-specific test commands:

```bash
npm test -w twin-web
npm test -w mock-api

# repo-level verification
npm run lint
npm run test
npm run check
```

## Runtime Data Flow

- `mock-api` exposes `GET /api/runtime/overview` and `GET /api/runtime/devices/:deviceId`
- `twin-web` overview and detail pages fetch runtime data from those endpoints instead of generating all runtime state locally
- the frontend currently refreshes runtime data with a 10 second polling loop
- device detail polling forces refetches so runtime telemetry and alarms do not get stuck behind the client cache
- `apps/mock-api/data/runtime/snapshot.json` can override generated runtime payloads when present

## Scene Management Flow

- `/` now redirects to `/scenes`
- top-level navigation exposes only `场景管理`
- `/scenes` lists saved named scenes and allows creating a new one
- each scene row now links to:
  - `/scenes/:sceneId/overview` for runtime overview and device-detail drilldown
  - `/scenes/:sceneId/preview` for read-only 3D preview
  - `/editor?sceneId=...` for editing
- the editor keeps save in the top-right header and supports local undo for scene-structure changes
- `mock-api` exposes the scene library endpoints used by that flow: `GET /api/scene/library`, `GET|PUT /api/scene/library/:sceneId`, and `POST /api/scene/library/:sceneId/load`

## Asset Management Flow

- `/assets` is the new asset management center
- the frontend now creates, edits, publishes, archives, and deletes assets from that page
- asset metadata, ports, bindings, versions, and upload records are stored by the backend in a SQLite-backed repository layer
- model files are uploaded through `POST /api/assets/uploads` and served back through a storage-adapter URL
- the scene editor palette now treats `/assets` as the primary asset-entry workflow and only lists published assets
- published assets still flow into the existing equipment-consumer contract:
  - `GET /api/equipment/catalog`
  - `GET /api/equipment/:assetId`
  - `GET /api/equipment/:assetId/ports`

## Where To Read More

- frontend-specific notes: `apps/twin-web/README.md`
- project stack and risk summary: `docs/project-tech-stack-and-risks.md`
- runtime data design and plan docs: `docs/superpowers/specs/` and `docs/superpowers/plans/`
