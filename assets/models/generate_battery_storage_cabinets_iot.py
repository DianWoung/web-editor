import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "battery_storage_cabinets_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "battery_storage_cabinets_iot_web.png")


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


def add_cylinder(name, radius, depth, location, material, rotation=(0.0, 0.0, 0.0), vertices=16):
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


def add_grille(prefix, x, side_y, center_z, width, height, rows, material):
    spacing = height / rows
    for idx in range(rows):
        z = center_z - height * 0.5 + spacing * (idx + 0.5)
        add_box(
            f"{prefix}_{idx}",
            (width, 0.05, spacing * 0.38),
            (x, side_y, z),
            material,
            rotation=(math.radians(8 if side_y > 0 else -8), 0.0, 0.0),
        )


def add_indicator_stack(prefix, x, y, z, accent_mat, warn_mat, dark_mat):
    add_box(f"{prefix}_Panel", (0.28, 0.06, 0.52), (x, y, z), dark_mat)
    add_box(f"{prefix}_Green", (0.08, 0.03, 0.08), (x, y + 0.02, z + 0.14), accent_mat)
    add_box(f"{prefix}_Amber", (0.08, 0.03, 0.08), (x, y + 0.02, z), warn_mat)
    add_box(f"{prefix}_Blue", (0.08, 0.03, 0.08), (x, y + 0.02, z - 0.14), accent_mat)


def add_cabinet_module(prefix, center_x, body_mat, dark_mat, accent_mat, metal_mat, base_mat, warn_mat):
    add_box(f"{prefix}_Base", (2.85, 1.75, 0.34), (center_x, 0.0, 0.17), base_mat)
    add_box(f"{prefix}_Body", (2.58, 1.52, 4.15), (center_x, 0.0, 2.42), body_mat)
    add_box(f"{prefix}_TopCap", (2.66, 1.6, 0.12), (center_x, 0.0, 4.56), metal_mat)
    add_box(f"{prefix}_RoofBand", (2.66, 1.6, 0.16), (center_x, 0.0, 4.35), dark_mat)

    add_box(f"{prefix}_DoorLeft", (1.22, 0.06, 3.62), (center_x - 0.64, 0.77, 2.34), body_mat)
    add_box(f"{prefix}_DoorRight", (1.22, 0.06, 3.62), (center_x + 0.64, 0.77, 2.34), body_mat)
    add_box(f"{prefix}_DoorMidSeal", (0.05, 0.07, 3.62), (center_x, 0.79, 2.34), dark_mat)
    add_box(f"{prefix}_FrameTop", (2.44, 0.08, 0.08), (center_x, 0.78, 4.08), dark_mat)
    add_box(f"{prefix}_FrameBottom", (2.44, 0.08, 0.08), (center_x, 0.78, 0.58), dark_mat)

    for idx, z in enumerate((3.35, 2.34, 1.33)):
        add_box(f"{prefix}_BusBand_{idx}", (2.2, 0.03, 0.05), (center_x, 0.81, z), accent_mat)

    add_box(f"{prefix}_HandleLeft", (0.06, 0.05, 0.38), (center_x - 0.18, 0.82, 2.34), dark_mat)
    add_box(f"{prefix}_HandleRight", (0.06, 0.05, 0.38), (center_x + 0.18, 0.82, 2.34), dark_mat)

    add_grille(f"{prefix}_GrilleL", center_x, -0.77, 2.38, 2.1, 2.7, 10, dark_mat)
    add_grille(f"{prefix}_GrilleR", center_x, 0.73, 2.38, 2.1, 2.7, 10, dark_mat)

    add_indicator_stack(f"{prefix}_Indicators", center_x - 0.95, 0.82, 3.56, accent_mat, warn_mat, dark_mat)

    add_box(f"{prefix}_TopServiceA", (0.48, 0.2, 0.05), (center_x - 0.62, 0.0, 4.63), metal_mat)
    add_box(f"{prefix}_TopServiceB", (0.48, 0.2, 0.05), (center_x + 0.62, 0.0, 4.63), metal_mat)

    add_box(f"{prefix}_SkidPadL", (0.24, 0.24, 0.12), (center_x - 0.96, 0.0, 0.4), dark_mat)
    add_box(f"{prefix}_SkidPadR", (0.24, 0.24, 0.12), (center_x + 0.96, 0.0, 0.4), dark_mat)

    add_cylinder(
        f"{prefix}_SidePort",
        0.09,
        0.18,
        (center_x, -0.87, 0.82),
        accent_mat,
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=12,
    )


def build_scene():
    reset_scene()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("BatteryStorageWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.016, 0.021, 0.03, 1.0)
    bg.inputs[1].default_value = 0.7

    mats = {
        "ground": make_material("Ground", (0.11, 0.14, 0.17, 1.0), roughness=0.96),
        "body": make_material("Body", (0.85, 0.87, 0.9, 1.0), roughness=0.66),
        "dark": make_material("Dark", (0.13, 0.16, 0.19, 1.0), roughness=0.82),
        "accent": make_material("Accent", (0.19, 0.75, 0.84, 1.0), metallic=0.14, roughness=0.36),
        "metal": make_material("Metal", (0.66, 0.71, 0.77, 1.0), metallic=0.24, roughness=0.4),
        "base": make_material("Base", (0.28, 0.31, 0.35, 1.0), roughness=0.86),
        "warn": make_material("Warn", (0.92, 0.72, 0.16, 1.0), roughness=0.42),
    }

    add_box("Ground", (18.0, 10.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("SkidPad", (12.4, 4.4, 0.18), (0.0, 0.0, 0.09), mats["base"])

    for idx, x in enumerate((-3.2, 0.0, 3.2)):
        add_cabinet_module(
            f"Cabinet_{idx + 1}",
            x,
            mats["body"],
            mats["dark"],
            mats["accent"],
            mats["metal"],
            mats["base"],
            mats["warn"],
        )

    add_box("TopBusDuct", (8.8, 0.42, 0.28), (0.0, -0.98, 4.26), mats["dark"])
    add_box("TopBusBand", (8.7, 0.08, 0.08), (0.0, -1.18, 4.26), mats["accent"])
    add_cylinder(
        "MainOutputPort",
        0.14,
        0.52,
        (4.9, -0.98, 4.24),
        mats["accent"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "MainInputPort",
        0.14,
        0.52,
        (-4.9, -0.98, 4.24),
        mats["accent"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )

    add_box("Nameplate", (1.45, 0.06, 0.32), (0.0, 0.84, 4.1), mats["accent"])
    add_box("CableTray", (10.2, 0.38, 0.16), (0.0, -1.62, 0.86), mats["metal"])

    for idx, x in enumerate((-4.6, -1.8, 1.8, 4.6)):
        add_box(f"Anchor_{idx}", (0.32, 0.28, 0.16), (x, 0.0, 0.25), mats["dark"])

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.25
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(49), 0.0, math.radians(28))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (13.5, -10.0, 7.0)
    cam.rotation_euler = (math.radians(68), 0.0, math.radians(43))
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
