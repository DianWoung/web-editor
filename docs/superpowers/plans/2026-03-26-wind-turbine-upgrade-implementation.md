# Wind Turbine Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the wind turbine asset with stronger realism while keeping a lightweight, animation-friendly GLB.

**Architecture:** Update the Blender generation script to produce a more layered nacelle, better blade geometry, a stronger tapered tower, and retained rotor hierarchy. Export the GLB and a preview image, then verify node names and file size.

**Tech Stack:** Blender Python, glTF/GLB export

---

### Task 1: Rebuild Wind Turbine Asset

**Files:**
- Modify: `assets/models/generate_wind_turbine_iot.py`
- Verify: `assets/models/wind_turbine_iot_web.glb`
- Verify: `assets/models/wind_turbine_iot_web.png`

- [ ] Update the generator script to improve tower, nacelle, hub, and blade geometry while preserving a `RotorAssembly` node.
- [ ] Export the rebuilt GLB and preview PNG with Blender.
- [ ] Verify the GLB is under 1MB.
- [ ] Verify the GLB still contains rotor-related node names suitable for frontend rotation.
