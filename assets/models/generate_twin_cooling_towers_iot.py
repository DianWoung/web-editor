import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "twin_cooling_towers_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "twin_cooling_towers_iot_web.png")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def make_material(name, rgba, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def apply_material(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def add_box(name, size, location, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] * 0.5, size[1] * 0.5, size[2] * 0.5)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def add_cylinder(name, radius, depth, location, material, rotation=(0.0, 0.0, 0.0), vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    apply_material(obj, material)
    return obj


def add_louver_bank(prefix, center_x, side_y, bottom_z, width, height, depth, rows, material):
    z_step = height / rows
    for row in range(rows):
        z = bottom_z + z_step * (row + 0.5)
        y = side_y + (0.03 if side_y > 0 else -0.03)
        add_box(
            f"{prefix}_{row}",
            (width, depth, z_step * 0.46),
            (center_x, y, z),
            material,
            rotation=(math.radians(9 if side_y > 0 else -9), 0.0, 0.0),
        )


def add_side_column(prefix, x, y, z, height, width, depth, material):
    add_box(prefix, (width, depth, height), (x, y, z), material)


def add_fan_stack(prefix, center_x, center_y, top_z, ring_mat, fan_mat, accent_mat):
    add_cylinder(f"{prefix}_Stack", 1.2, 0.65, (center_x, center_y, top_z - 0.08), ring_mat, vertices=24)
    add_cylinder(f"{prefix}_FanWell", 0.92, 0.2, (center_x, center_y, top_z + 0.06), fan_mat, vertices=24)
    add_cylinder(f"{prefix}_Hub", 0.16, 0.24, (center_x, center_y, top_z + 0.12), accent_mat, vertices=12)
    for idx in range(5):
        blade = add_box(
            f"{prefix}_Blade_{idx}",
            (0.96, 0.11, 0.05),
            (center_x + 0.34, center_y, top_z + 0.12),
            accent_mat,
            rotation=(math.radians(4), 0.0, math.radians(idx * 72)),
        )
        blade.rotation_euler.rotate_axis("X", math.radians(-5))


def add_tower_module(prefix, center_x, body_mat, dark_mat, accent_mat, metal_mat, base_mat):
    base_z = 0.0
    basin_top_z = 1.0
    body_bottom_z = 1.2
    body_mid_z = 3.35
    top_z = 5.85

    add_box(f"{prefix}_Basin", (5.8, 4.9, 1.0), (center_x, 0.0, basin_top_z * 0.5), base_mat)
    add_box(f"{prefix}_BasinBand", (5.88, 4.98, 0.18), (center_x, 0.0, 1.04), dark_mat)
    add_box(f"{prefix}_BaseRailFront", (5.9, 0.18, 0.24), (center_x, 2.42, 0.42), dark_mat)
    add_box(f"{prefix}_BaseRailRear", (5.9, 0.18, 0.24), (center_x, -2.42, 0.42), dark_mat)

    add_box(f"{prefix}_CoreBody", (5.2, 4.2, 4.3), (center_x, 0.0, 3.2), body_mat)
    add_box(f"{prefix}_TopDeck", (5.35, 4.35, 0.2), (center_x, 0.0, top_z), metal_mat)
    add_box(f"{prefix}_FanFrameFront", (5.4, 0.16, 0.36), (center_x, 2.18, 5.55), dark_mat)
    add_box(f"{prefix}_FanFrameRear", (5.4, 0.16, 0.36), (center_x, -2.18, 5.55), dark_mat)

    for side_x in (-2.42, 2.42):
        add_side_column(
            f"{prefix}_Corner_{'L' if side_x < 0 else 'R'}",
            center_x + side_x,
            0.0,
            3.2,
            4.4,
            0.18,
            4.5,
            dark_mat,
        )

    for y in (-2.08, 2.08):
        for idx, dx in enumerate((-1.5, 0.0, 1.5)):
            add_box(
                f"{prefix}_Frame_{'F' if y > 0 else 'R'}_{idx}",
                (0.14, 0.12, 4.25),
                (center_x + dx, y, 3.22),
                dark_mat,
            )

    add_louver_bank(f"{prefix}_LouversFront", center_x, 2.08, 1.55, 4.6, 2.75, 0.08, 10, dark_mat)
    add_louver_bank(f"{prefix}_LouversRear", center_x, -2.08, 1.55, 4.6, 2.75, 0.08, 10, dark_mat)

    add_box(f"{prefix}_MidBand", (5.28, 4.28, 0.14), (center_x, 0.0, body_mid_z), accent_mat)
    add_box(f"{prefix}_TopCap", (4.28, 3.35, 0.34), (center_x, 0.0, 5.48), metal_mat)

    add_fan_stack(f"{prefix}_FanA", center_x - 1.25, 0.0, 5.98, metal_mat, dark_mat, accent_mat)
    add_fan_stack(f"{prefix}_FanB", center_x + 1.25, 0.0, 5.98, metal_mat, dark_mat, accent_mat)

    add_box(f"{prefix}_AccessDoor", (0.7, 0.08, 1.4), (center_x + 1.8, 2.18, 1.88), accent_mat)
    add_box(f"{prefix}_Handle", (0.06, 0.08, 0.18), (center_x + 2.05, 2.23, 1.9), dark_mat)
    add_box(f"{prefix}_PlinthA", (0.42, 0.42, 0.16), (center_x - 1.8, 0.0, 0.18), dark_mat)
    add_box(f"{prefix}_PlinthB", (0.42, 0.42, 0.16), (center_x + 1.8, 0.0, 0.18), dark_mat)


def build_scene():
    reset_scene()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("TwinCoolingTowerWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.016, 0.022, 0.03, 1.0)
    bg.inputs[1].default_value = 0.7

    mats = {
        "ground": make_material("Ground", (0.105, 0.13, 0.16, 1.0), roughness=0.96),
        "body": make_material("Body", (0.83, 0.86, 0.9, 1.0), roughness=0.7),
        "dark": make_material("Dark", (0.14, 0.16, 0.19, 1.0), roughness=0.8),
        "accent": make_material("Accent", (0.18, 0.73, 0.83, 1.0), metallic=0.12, roughness=0.36),
        "metal": make_material("Metal", (0.66, 0.72, 0.78, 1.0), metallic=0.22, roughness=0.42),
        "base": make_material("Base", (0.29, 0.32, 0.36, 1.0), roughness=0.86),
        "pipe": make_material("Pipe", (0.78, 0.82, 0.86, 1.0), metallic=0.26, roughness=0.35),
    }

    add_box("Ground", (22.0, 14.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("Pad", (16.6, 7.8, 0.22), (0.0, 0.0, 0.11), mats["base"])

    add_tower_module("TowerA", -3.7, mats["body"], mats["dark"], mats["accent"], mats["metal"], mats["base"])
    add_tower_module("TowerB", 3.7, mats["body"], mats["dark"], mats["accent"], mats["metal"], mats["base"])

    add_cylinder(
        "CrossHeader",
        0.23,
        7.3,
        (0.0, -2.95, 1.22),
        mats["pipe"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "RiserA",
        0.18,
        2.1,
        (-3.7, -2.95, 2.18),
        mats["pipe"],
        vertices=12,
    )
    add_cylinder(
        "RiserB",
        0.18,
        2.1,
        (3.7, -2.95, 2.18),
        mats["pipe"],
        vertices=12,
    )
    add_cylinder(
        "BridgePipeA",
        0.16,
        2.0,
        (-1.85, -2.95, 3.22),
        mats["pipe"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )
    add_cylinder(
        "BridgePipeB",
        0.16,
        2.0,
        (1.85, -2.95, 3.22),
        mats["pipe"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )
    add_cylinder(
        "SupplyNozzle",
        0.26,
        1.2,
        (-7.0, -2.95, 1.22),
        mats["accent"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "ReturnNozzle",
        0.26,
        1.2,
        (7.0, -2.95, 1.22),
        mats["accent"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_box("ServicePlatform", (2.8, 0.9, 0.14), (0.0, 2.85, 1.38), mats["metal"])
    add_box("PlatformSupportA", (0.12, 0.12, 1.2), (-1.15, 2.85, 0.68), mats["dark"])
    add_box("PlatformSupportB", (0.12, 0.12, 1.2), (1.15, 2.85, 0.68), mats["dark"])
    add_box("GuardRail", (2.9, 0.08, 0.6), (0.0, 3.23, 1.74), mats["accent"])

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.35
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(52), 0.0, math.radians(29))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (18.0, -13.5, 8.2)
    cam.rotation_euler = (math.radians(68), 0.0, math.radians(48))
    scene.camera = cam


def export_outputs():
    os.makedirs(BASE_DIR, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_PATH,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_animations=False,
        export_force_sampling=False,
        use_selection=False,
    )

    scene = bpy.context.scene
    scene.render.filepath = PREVIEW_PATH
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    bpy.ops.render.render(write_still=True)


def main():
    build_scene()
    export_outputs()
    print(f"Exported GLB to: {OUTPUT_PATH}")
    print(f"Rendered preview to: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
