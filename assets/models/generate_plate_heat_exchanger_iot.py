import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "plate_heat_exchanger_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "plate_heat_exchanger_iot_web.png")


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


def add_plate(name, x, metal_mat, trim_mat):
    plate = add_box(name, (0.08, 3.15, 4.25), (x, 0.0, 3.35), metal_mat)
    for y in (-1.35, 1.35):
        add_cylinder(
            f"{name}_Port_{'Top' if y > 0 else 'Bottom'}",
            radius=0.22,
            depth=0.12,
            location=(x + 0.01, y, 5.0 if y > 0 else 1.7),
            material=trim_mat,
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=12,
        )
    return plate


def add_bolt_grid(prefix, x, y, z_values, material):
    for idx, z in enumerate(z_values):
        add_cylinder(
            f"{prefix}_{idx}",
            radius=0.045,
            depth=0.1,
            location=(x, y, z),
            material=material,
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=10,
        )


def build_scene():
    reset_scene()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("PlateHeatExchangerWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.015, 0.021, 0.03, 1.0)
    bg.inputs[1].default_value = 0.68

    mats = {
        "ground": make_material("Ground", (0.11, 0.14, 0.17, 1.0), roughness=0.96),
        "frame": make_material("Frame", (0.16, 0.72, 0.82, 1.0), metallic=0.18, roughness=0.36),
        "metal": make_material("Metal", (0.76, 0.8, 0.84, 1.0), metallic=0.28, roughness=0.34),
        "dark": make_material("Dark", (0.14, 0.16, 0.18, 1.0), roughness=0.78),
        "pipe": make_material("Pipe", (0.86, 0.88, 0.9, 1.0), metallic=0.22, roughness=0.3),
        "base": make_material("Base", (0.24, 0.28, 0.32, 1.0), roughness=0.82),
        "accent": make_material("Accent", (0.9, 0.72, 0.18, 1.0), roughness=0.42),
    }

    add_box("Ground", (14.0, 10.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])

    add_box("SkidLeft", (5.2, 0.35, 0.28), (0.0, 1.1, 0.14), mats["base"])
    add_box("SkidRight", (5.2, 0.35, 0.28), (0.0, -1.1, 0.14), mats["base"])
    add_box("SupportLeft", (0.32, 0.44, 1.0), (-1.8, 0.0, 0.64), mats["base"])
    add_box("SupportRight", (0.32, 0.44, 1.0), (1.8, 0.0, 0.64), mats["base"])

    add_box("FixedFrame", (0.3, 3.4, 4.7), (-2.2, 0.0, 3.05), mats["frame"])
    add_box("PressurePlate", (0.26, 3.28, 4.55), (2.2, 0.0, 3.05), mats["frame"])

    plate_positions = [(-1.72 + i * 0.145) for i in range(24)]
    for idx, x in enumerate(plate_positions):
        add_plate(f"Plate_{idx}", x, mats["metal"], mats["dark"])

    rod_z = (1.0, 2.0, 4.1, 5.1)
    for idx, z in enumerate(rod_z):
        rod = add_cylinder(
            f"TieRod_{idx}",
            radius=0.065,
            depth=4.9,
            location=(0.0, 0.0, z),
            material=mats["dark"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=12,
        )
        add_cylinder(
            f"TieRodNutL_{idx}",
            radius=0.11,
            depth=0.18,
            location=(-2.48, 0.0, z),
            material=mats["accent"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=12,
        )
        add_cylinder(
            f"TieRodNutR_{idx}",
            radius=0.11,
            depth=0.18,
            location=(2.48, 0.0, z),
            material=mats["accent"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=12,
        )

    for y in (-1.2, 1.2):
        add_cylinder(
            f"MainNozzle_Left_{'Top' if y > 0 else 'Bottom'}",
            radius=0.28,
            depth=0.65,
            location=(-2.55, y, 4.95 if y > 0 else 1.7),
            material=mats["pipe"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=14,
        )
        add_cylinder(
            f"MainNozzle_Right_{'Top' if y > 0 else 'Bottom'}",
            radius=0.28,
            depth=0.65,
            location=(2.55, y, 4.95 if y > 0 else 1.7),
            material=mats["pipe"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=14,
        )
        add_cylinder(
            f"Flange_Left_{'Top' if y > 0 else 'Bottom'}",
            radius=0.38,
            depth=0.12,
            location=(-2.85, y, 4.95 if y > 0 else 1.7),
            material=mats["dark"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=16,
        )
        add_cylinder(
            f"Flange_Right_{'Top' if y > 0 else 'Bottom'}",
            radius=0.38,
            depth=0.12,
            location=(2.85, y, 4.95 if y > 0 else 1.7),
            material=mats["dark"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=16,
        )

    bolt_z = (1.5, 2.6, 3.5, 4.6)
    for x in (-2.18, 2.18):
        add_bolt_grid(f"BoltA_{x:.1f}", x, 1.55, bolt_z, mats["accent"])
        add_bolt_grid(f"BoltB_{x:.1f}", x, -1.55, bolt_z, mats["accent"])

    add_box("NamePlate", (0.7, 0.06, 0.36), (2.34, 1.61, 4.35), mats["accent"])
    add_box("DrainTray", (4.0, 2.0, 0.08), (0.0, 0.0, 0.44), mats["dark"])

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.3
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(48), 0.0, math.radians(30))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (10.0, -9.5, 8.2)
    cam.rotation_euler = (math.radians(66), 0.0, math.radians(43))
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
