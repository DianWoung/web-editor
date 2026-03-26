# Wind Turbine Upgrade Design

## Goal
Upgrade the existing wind turbine asset into a more believable large horizontal-axis turbine while keeping it lightweight for IoT/web usage and preserving a dedicated rotor node for runtime animation.

## Approved Direction
- Side-view friendly, low-poly but more realistic.
- Improve the whole asset rather than one isolated part.
- Keep the asset suitable for web scenes and below 1MB.

## Design
- Tower: stronger taper, base flange language, service door, and a more grounded foundation.
- Nacelle: layered housing with a more realistic top, rear cooling/vent structure, and visible service segmentation.
- Hub and nose: replace the simple hub with a clearer nose cone and blade-root transition.
- Blades: longer and more aerodynamic with root thickness, taper, and twist.
- Animation: keep a dedicated `RotorAssembly` node and export animation so the frontend can either play or override it.

## Constraints
- No textures.
- Geometry-led realism only.
- Maintain a lightweight GLB for web delivery.
