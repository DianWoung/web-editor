# web-editor

Monorepo for a scene editor, named-scene management/preview workflow, and a mock runtime-data backend used for local development, demos, and closed-loop runtime verification.

## Workspace Layout

- `apps/twin-web`: frontend app for overview, named scene management/preview, device detail, and scene editing
- `apps/mock-api`: mock backend serving scene, equipment, and runtime endpoints
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

- `/scenes` lists saved named scenes and allows creating a new one
- `/scenes/:sceneId/preview` provides a read-only 3D preview with camera controls and a flow toggle
- `/editor?sceneId=...` loads a named scene into the editor for continued changes
- `mock-api` exposes the scene library endpoints used by that flow: `GET /api/scene/library`, `GET|PUT /api/scene/library/:sceneId`, and `POST /api/scene/library/:sceneId/load`

## Where To Read More

- frontend-specific notes: `apps/twin-web/README.md`
- project stack and risk summary: `docs/project-tech-stack-and-risks.md`
- runtime data design and plan docs: `docs/superpowers/specs/` and `docs/superpowers/plans/`
