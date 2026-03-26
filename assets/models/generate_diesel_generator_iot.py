import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "diesel_generator_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "diesel_generator_iot_web.png")


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


def add_louver_bank(prefix, x, z_start, count, spacing, material, side_sign):
    created = []
    for idx in range(count):
        z = z_start + idx * spacing
        louver = add_box(
            f"{prefix}_{idx}",
            (0.05, 2.35, 0.09),
            (x, 0.0, z),
            material,
            rotation=(0.0, math.radians(12 * side_sign), 0.0),
        )
        created.append(louver)
    return created


def build_scene():
    reset_scene()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("GeneratorWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.016, 0.022, 0.03, 1.0)
    bg.inputs[1].default_value = 0.68

    mats = {
        "ground": make_material("Ground", (0.12, 0.14, 0.16, 1.0), roughness=0.96),
        "body": make_material("Body", (0.82, 0.84, 0.86, 1.0), roughness=0.7),
        "trim": make_material("Trim", (0.18, 0.74, 0.84, 1.0), metallic=0.18, roughness=0.34),
        "dark": make_material("Dark", (0.11, 0.13, 0.15, 1.0), roughness=0.8),
        "metal": make_material("Metal", (0.58, 0.64, 0.68, 1.0), metallic=0.2, roughness=0.48),
        "base": make_material("Base", (0.22, 0.25, 0.28, 1.0), roughness=0.84),
        "warning": make_material("Warning", (0.92, 0.72, 0.2, 1.0), metallic=0.06, roughness=0.42),
    }

    add_box("Ground", (18.0, 12.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])

    add_box("FuelTankBase", (11.6, 3.8, 1.0), (0.0, 0.0, 0.5), mats["base"])
    add_box("SkidRailLeft", (11.2, 0.22, 0.24), (0.0, 1.72, 1.02), mats["dark"])
    add_box("SkidRailRight", (11.2, 0.22, 0.24), (0.0, -1.72, 1.02), mats["dark"])
    add_box("MainCanopy", (11.0, 3.2, 3.0), (0.0, 0.0, 2.5), mats["body"])
    add_box("RoofCap", (11.1, 3.3, 0.18), (0.0, 0.0, 4.08), mats["metal"])
    add_box("AccentStripe", (10.8, 0.18, 0.22), (0.0, 1.5, 2.15), mats["trim"])

    for idx, x in enumerate((-4.1, -1.35, 1.35, 4.1)):
        add_box(f"ServiceDoor_{idx}", (2.25, 0.07, 2.1), (x, 1.61, 2.45), mats["body"])
        add_box(f"ServiceDoorTrim_{idx}", (2.02, 0.03, 1.84), (x, 1.635, 2.45), mats["dark"])
        add_box(f"DoorHandle_{idx}", (0.1, 0.05, 0.18), (x + 0.78, 1.66, 2.45), mats["trim"])

    for idx, x in enumerate((-4.1, -1.35, 1.35, 4.1)):
        add_box(f"RearPanel_{idx}", (2.25, 0.07, 2.1), (x, -1.61, 2.45), mats["body"])
        add_box(f"RearPanelTrim_{idx}", (2.02, 0.03, 1.84), (x, -1.635, 2.45), mats["dark"])

    radiator = add_box("RadiatorHousing", (1.65, 3.0, 2.55), (4.78, 0.0, 2.32), mats["metal"])
    add_box("RadiatorFrame", (0.12, 3.02, 2.7), (5.52, 0.0, 2.35), mats["dark"])
    add_cylinder(
        "RadiatorFan",
        radius=1.05,
        depth=0.22,
        location=(5.42, 0.0, 2.38),
        material=mats["dark"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=20,
    )
    for idx in range(5):
        add_box(
            f"RadiatorBlade_{idx}",
            (0.9, 0.12, 0.05),
            (5.46, 0.36, 2.38),
            mats["trim"],
            rotation=(math.radians(idx * 72), math.radians(90), 0.0),
        )

    add_box("ControlCabinet", (1.2, 1.0, 1.6), (-4.95, -0.95, 2.0), mats["metal"])
    add_box("ControlScreen", (0.42, 0.08, 0.52), (-5.42, -0.95, 2.25), mats["trim"])
    add_box("WarningBand", (1.18, 0.1, 0.18), (-4.95, 0.52, 1.38), mats["warning"])

    add_louver_bank("LouverLeft", -5.34, 1.25, 9, 0.22, mats["dark"], 1)
    add_louver_bank("LouverRight", 5.28, 1.25, 9, 0.22, mats["dark"], -1)

    add_cylinder(
        "ExhaustStack",
        radius=0.18,
        depth=2.0,
        location=(-2.85, -0.78, 4.95),
        material=mats["metal"],
        vertices=14,
    )
    add_cylinder(
        "ExhaustCap",
        radius=0.28,
        depth=0.12,
        location=(-2.85, -0.78, 6.0),
        material=mats["dark"],
        vertices=16,
    )
    add_cylinder(
        "Silencer",
        radius=0.24,
        depth=1.4,
        location=(-2.85, -0.78, 4.0),
        material=mats["metal"],
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=14,
    )

    for idx, x in enumerate((-4.5, -1.5, 1.5, 4.5)):
        add_box(f"LiftHook_{idx}", (0.35, 0.12, 0.18), (x, 0.0, 4.32), mats["trim"])

    for idx, x in enumerate((-4.9, -1.65, 1.65, 4.9)):
        add_box(f"Foot_{idx}", (0.45, 0.36, 0.12), (x, 0.0, 0.96), mats["dark"])

    add_box("FuelGauge", (0.36, 0.08, 0.68), (0.0, 1.86, 0.95), mats["trim"])
    add_cylinder(
        "CableOutlet",
        radius=0.18,
        depth=0.36,
        location=(-5.1, 1.78, 1.2),
        material=mats["metal"],
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=12,
    )

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.3
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0.0, math.radians(30))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (15.0, -14.0, 9.6)
    cam.rotation_euler = (math.radians(67), 0.0, math.radians(43))
    bpy.context.scene.camera = cam


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
