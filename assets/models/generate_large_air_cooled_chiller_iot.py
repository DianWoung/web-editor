import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "large_air_cooled_chiller_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "large_air_cooled_chiller_iot_web.png")


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


def add_fan_module(name, center_x, center_y, top_z, metal_mat, accent_mat, dark_mat):
    created = []
    ring = add_cylinder(
        f"{name}_Ring",
        radius=1.1,
        depth=0.2,
        location=(center_x, center_y, top_z),
        material=metal_mat,
        vertices=20,
    )
    created.append(ring)

    intake = add_cylinder(
        f"{name}_Intake",
        radius=0.9,
        depth=0.12,
        location=(center_x, center_y, top_z + 0.02),
        material=dark_mat,
        vertices=20,
    )
    created.append(intake)

    hub = add_cylinder(
        f"{name}_Hub",
        radius=0.18,
        depth=0.26,
        location=(center_x, center_y, top_z + 0.05),
        material=accent_mat,
        vertices=12,
    )
    created.append(hub)

    for idx in range(5):
        blade = add_box(
            f"{name}_Blade_{idx}",
            size=(0.9, 0.12, 0.05),
            location=(center_x + 0.35, center_y, top_z + 0.04),
            material=accent_mat,
            rotation=(0.0, 0.0, math.radians(idx * 72)),
        )
        created.append(blade)

    return created


def add_grille_bank(prefix, x, y_start, count, spacing, panel_size, material, rotation):
    created = []
    for idx in range(count):
        y = y_start + idx * spacing
        panel = add_box(
            f"{prefix}_{idx}",
            panel_size,
            (x, y, 1.9),
            material,
            rotation=rotation,
        )
        created.append(panel)
    return created


def build_scene():
    reset_scene()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("AirChillerWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.015, 0.02, 0.028, 1.0)
    bg.inputs[1].default_value = 0.7

    mats = {
        "ground": make_material("Ground", (0.11, 0.14, 0.16, 1.0), roughness=0.95),
        "body": make_material("Body", (0.84, 0.86, 0.88, 1.0), roughness=0.68),
        "roof": make_material("Roof", (0.55, 0.63, 0.68, 1.0), metallic=0.15, roughness=0.48),
        "dark": make_material("Dark", (0.12, 0.14, 0.16, 1.0), roughness=0.75),
        "accent": make_material("Accent", (0.18, 0.74, 0.84, 1.0), metallic=0.18, roughness=0.36),
        "pipe": make_material("Pipe", (0.78, 0.82, 0.86, 1.0), metallic=0.25, roughness=0.42),
        "base": make_material("Base", (0.25, 0.28, 0.31, 1.0), roughness=0.82),
    }

    add_box("Ground", (24.0, 14.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])

    add_box("SkidBase", (17.4, 4.5, 0.4), (0.0, 0.0, 0.2), mats["base"])
    add_box("MainBody", (16.8, 3.8, 3.3), (0.0, 0.0, 2.05), mats["body"])
    add_box("TopDeck", (16.95, 4.0, 0.18), (0.0, 0.0, 3.79), mats["roof"])
    add_box("ServiceBand", (16.95, 0.34, 0.34), (0.0, 1.77, 1.1), mats["accent"])
    add_box("BaseRailLeft", (16.95, 0.18, 0.22), (0.0, 2.12, 0.46), mats["dark"])
    add_box("BaseRailRight", (16.95, 0.18, 0.22), (0.0, -2.12, 0.46), mats["dark"])

    fan_centers = (-6.0, -2.0, 2.0, 6.0)
    for idx, x in enumerate(fan_centers):
        add_fan_module(f"Fan_{idx+1}", x, 0.0, 3.92, mats["roof"], mats["accent"], mats["dark"])

    for idx, x in enumerate((-7.2, -3.6, 0.0, 3.6, 7.2)):
        add_box(
            f"RoofDivider_{idx}",
            (0.12, 3.7, 0.22),
            (x, 0.0, 3.87),
            mats["dark"],
        )

    add_grille_bank(
        "GrilleLeft",
        -8.38,
        -1.2,
        4,
        0.8,
        (0.08, 0.55, 2.3),
        mats["dark"],
        (0.0, math.radians(90), 0.0),
    )
    add_grille_bank(
        "GrilleRight",
        8.38,
        -1.2,
        4,
        0.8,
        (0.08, 0.55, 2.3),
        mats["dark"],
        (0.0, math.radians(90), 0.0),
    )

    for side_y, label in ((1.92, "Front"), (-1.92, "Back")):
        for idx, x in enumerate((-6.0, -2.0, 2.0, 6.0)):
            add_box(
                f"{label}Panel_{idx}",
                (3.2, 0.08, 2.4),
                (x, side_y, 1.95),
                mats["body"],
            )
            add_box(
                f"{label}PanelTrim_{idx}",
                (3.05, 0.04, 2.15),
                (x, side_y + (0.02 if side_y > 0 else -0.02), 1.95),
                mats["dark"],
            )

    add_box("ControllerCabinet", (1.9, 1.25, 2.5), (-7.15, -1.2, 1.65), mats["roof"])
    add_box("ControllerScreen", (0.55, 0.08, 0.7), (-7.48, -0.55, 1.95), mats["accent"])

    for idx, x in enumerate((-3.6, -1.2, 1.2, 3.6)):
        compressor = add_cylinder(
            f"Compressor_{idx}",
            radius=0.38,
            depth=1.45,
            location=(x, -0.95, 1.15),
            material=mats["dark"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=14,
        )
        add_box(
            f"CompressorBracket_{idx}",
            (0.7, 0.25, 0.18),
            (x, -1.7, 0.52),
            mats["base"],
        )

    pipe_points = (-2.8, -1.0, 1.0, 2.8)
    for idx, x in enumerate(pipe_points):
        add_cylinder(
            f"HeaderPipe_{idx}",
            radius=0.12,
            depth=2.5,
            location=(x, 1.55, 0.95),
            material=mats["pipe"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=12,
        )

    add_cylinder(
        "OutletHeader",
        radius=0.2,
        depth=4.9,
        location=(0.0, 2.1, 0.95),
        material=mats["pipe"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )

    for idx, x in enumerate((-1.0, 1.0)):
        add_cylinder(
            f"Nozzle_{idx}",
            radius=0.18,
            depth=0.9,
            location=(x, 2.55, 0.95),
            material=mats["accent"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=12,
        )
        add_cylinder(
            f"NozzleCap_{idx}",
            radius=0.23,
            depth=0.12,
            location=(x, 3.02, 0.95),
            material=mats["pipe"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=16,
        )

    for idx, x in enumerate((-7.4, -2.5, 2.5, 7.4)):
        add_box(
            f"Foot_{idx}",
            (0.55, 0.42, 0.16),
            (x, 0.0, 0.08),
            mats["base"],
        )

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.4
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48), 0.0, math.radians(28))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (18.0, -16.5, 9.8)
    cam.rotation_euler = (math.radians(67), 0.0, math.radians(46))
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
