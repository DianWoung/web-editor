import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "plc_console_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "plc_console_iot_web.png")


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


def add_button_grid(prefix, center_x, center_y, center_z, rows, cols, spacing_x, spacing_z, on_mat, off_mat):
    start_x = center_x - spacing_x * (cols - 1) * 0.5
    start_z = center_z - spacing_z * (rows - 1) * 0.5
    for row in range(rows):
        for col in range(cols):
            material = on_mat if (row + col) % 3 == 0 else off_mat
            add_box(
                f"{prefix}_{row}_{col}",
                (0.08, 0.02, 0.08),
                (start_x + col * spacing_x, center_y, start_z + row * spacing_z),
                material,
            )


def add_handle(name, x, y, z, material):
    add_box(name, (0.06, 0.05, 0.36), (x, y, z), material)


def add_grille(prefix, x, y, center_z, rows, material):
    for idx in range(rows):
        add_box(
            f"{prefix}_{idx}",
            (0.88, 0.04, 0.06),
            (x, y, center_z - 0.45 + idx * 0.1),
            material,
            rotation=(math.radians(7 if y > 0 else -7), 0.0, 0.0),
        )


def build_scene():
    reset_scene()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("PlcConsoleWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.015, 0.021, 0.03, 1.0)
    bg.inputs[1].default_value = 0.7

    mats = {
        "ground": make_material("Ground", (0.11, 0.14, 0.17, 1.0), roughness=0.96),
        "body": make_material("Body", (0.84, 0.86, 0.89, 1.0), roughness=0.68),
        "dark": make_material("Dark", (0.13, 0.16, 0.19, 1.0), roughness=0.82),
        "accent": make_material("Accent", (0.18, 0.75, 0.84, 1.0), metallic=0.14, roughness=0.34),
        "screen": make_material("Screen", (0.06, 0.12, 0.16, 1.0), metallic=0.06, roughness=0.22),
        "metal": make_material("Metal", (0.66, 0.71, 0.77, 1.0), metallic=0.24, roughness=0.38),
        "base": make_material("Base", (0.28, 0.31, 0.35, 1.0), roughness=0.86),
        "warn": make_material("Warn", (0.91, 0.72, 0.16, 1.0), roughness=0.42),
        "good": make_material("Good", (0.26, 0.83, 0.48, 1.0), roughness=0.36),
        "bad": make_material("Bad", (0.86, 0.28, 0.22, 1.0), roughness=0.36),
    }

    add_box("Ground", (16.0, 10.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("Pad", (10.8, 4.8, 0.18), (0.0, 0.0, 0.09), mats["base"])

    add_box("CabinetBase", (4.7, 2.05, 0.34), (1.55, 0.0, 0.17), mats["base"])
    add_box("CabinetBody", (4.38, 1.85, 4.75), (1.55, 0.0, 2.72), mats["body"])
    add_box("CabinetTop", (4.5, 1.95, 0.12), (1.55, 0.0, 5.16), mats["metal"])
    add_box("CabinetBand", (4.5, 1.95, 0.16), (1.55, 0.0, 4.94), mats["dark"])

    for idx, x in enumerate((0.2, 1.55, 2.9)):
        add_box(f"CabinetDoor_{idx}", (1.28, 0.06, 4.12), (x, 0.96, 2.52), mats["body"])
        add_box(f"CabinetFrame_{idx}", (1.18, 0.04, 3.94), (x, 0.98, 2.52), mats["dark"])
        add_handle(f"Handle_{idx}", x + 0.43, 1.02, 2.54, mats["dark"])

    add_box("CabinetVerticalSealA", (0.04, 0.07, 4.12), (0.88, 0.99, 2.52), mats["dark"])
    add_box("CabinetVerticalSealB", (0.04, 0.07, 4.12), (2.22, 0.99, 2.52), mats["dark"])

    add_box("UpperStatusPanel", (3.5, 0.05, 0.42), (1.55, 1.02, 4.5), mats["dark"])
    add_button_grid("StatusLights", 1.55, 1.05, 4.5, 1, 8, 0.36, 0.1, mats["good"], mats["accent"])

    add_box("HMIFrame", (1.52, 0.06, 1.12), (1.55, 1.03, 3.6), mats["dark"])
    add_box("HMIScreen", (1.34, 0.03, 0.94), (1.55, 1.06, 3.6), mats["screen"])
    add_box("AlarmStrip", (0.82, 0.03, 0.1), (1.55, 1.06, 3.0), mats["warn"])

    add_grille("CabinetGrilleL", 0.2, -0.92, 2.0, 8, mats["dark"])
    add_grille("CabinetGrilleR", 2.9, -0.92, 2.0, 8, mats["dark"])
    add_box("CableTrunkTop", (4.0, 0.5, 0.22), (1.55, -1.05, 4.82), mats["dark"])

    add_box("ConsoleBase", (3.6, 2.1, 0.42), (-2.4, 0.0, 0.21), mats["base"])
    add_box("ConsoleBody", (3.2, 1.8, 1.72), (-2.4, 0.0, 1.08), mats["body"])
    add_box(
        "ConsoleSlope",
        (3.1, 1.46, 0.12),
        (-2.4, 0.16, 2.06),
        mats["metal"],
        rotation=(math.radians(-24), 0.0, 0.0),
    )
    add_box("ConsoleFrontTrim", (3.22, 0.08, 1.36), (-2.4, 0.91, 0.96), mats["dark"])

    add_box("ConsoleScreenFrame", (1.18, 0.08, 0.82), (-2.4, 0.62, 2.16), mats["dark"], rotation=(math.radians(-24), 0.0, 0.0))
    add_box("ConsoleScreen", (1.02, 0.04, 0.68), (-2.4, 0.66, 2.16), mats["screen"], rotation=(math.radians(-24), 0.0, 0.0))
    add_box("ConsoleKeyboard", (1.1, 0.04, 0.34), (-2.4, 0.68, 1.62), mats["dark"], rotation=(math.radians(-24), 0.0, 0.0))

    add_button_grid("ConsoleButtonsA", -3.15, 0.68, 1.92, 3, 4, 0.16, 0.14, mats["good"], mats["warn"])
    add_button_grid("ConsoleButtonsB", -1.65, 0.68, 1.92, 3, 4, 0.16, 0.14, mats["accent"], mats["bad"])

    add_cylinder(
        "EmergencyStop",
        0.12,
        0.08,
        (-0.95, 0.72, 2.05),
        mats["bad"],
        rotation=(math.radians(-24), 0.0, 0.0),
        vertices=18,
    )
    add_cylinder(
        "SelectorKnob",
        0.09,
        0.06,
        (-1.18, 0.72, 1.84),
        mats["accent"],
        rotation=(math.radians(-24), 0.0, 0.0),
        vertices=16,
    )

    add_box("ConsoleVent", (1.9, 0.04, 0.44), (-2.4, -0.9, 0.84), mats["dark"])
    add_button_grid("ConsoleIndicators", -2.4, 0.92, 0.82, 1, 6, 0.22, 0.1, mats["good"], mats["warn"])

    add_box("CableBridge", (1.24, 0.2, 0.18), (-0.42, -0.95, 1.74), mats["metal"])
    add_box("FloorDuct", (6.8, 0.32, 0.12), (-0.42, -1.35, 0.52), mats["metal"])
    for idx, x in enumerate((-4.8, -1.6, 1.6, 4.8)):
        add_box(f"Anchor_{idx}", (0.28, 0.24, 0.14), (x * 0.55, 0.0, 0.24), mats["dark"])

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.2
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48), 0.0, math.radians(27))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (11.5, -9.4, 6.6)
    cam.rotation_euler = (math.radians(69), 0.0, math.radians(42))
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
