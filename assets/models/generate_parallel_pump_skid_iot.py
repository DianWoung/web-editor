import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "parallel_pump_skid_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "parallel_pump_skid_iot_web.png")


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


def add_pump_unit(prefix, x, body_mat, metal_mat, accent_mat, base_mat):
    add_box(f"{prefix}_Base", (3.2, 1.2, 0.2), (x, 0.0, 0.7), base_mat)
    add_cylinder(
        f"{prefix}_Motor",
        radius=0.45,
        depth=1.8,
        location=(x - 0.8, 0.0, 1.4),
        material=metal_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=16,
    )
    for idx, dx in enumerate((-1.35, -1.0, -0.65, -0.3)):
        add_box(f"{prefix}_MotorFin_{idx}", (0.08, 0.92, 0.92), (x + dx, 0.0, 1.4), accent_mat)

    add_cylinder(
        f"{prefix}_Coupling",
        radius=0.22,
        depth=0.55,
        location=(x + 0.25, 0.0, 1.4),
        material=accent_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        f"{prefix}_PumpVolute",
        radius=0.62,
        depth=0.58,
        location=(x + 1.0, 0.0, 1.28),
        material=body_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=20,
    )
    add_cylinder(
        f"{prefix}_ImpellerCover",
        radius=0.36,
        depth=0.18,
        location=(x + 1.3, 0.0, 1.28),
        material=metal_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=16,
    )
    add_box(f"{prefix}_FootFront", (0.22, 0.25, 0.42), (x + 0.65, 0.0, 0.92), base_mat)
    add_box(f"{prefix}_FootRear", (0.22, 0.25, 0.42), (x - 1.0, 0.0, 0.92), base_mat)

    add_cylinder(
        f"{prefix}_Suction",
        radius=0.18,
        depth=1.1,
        location=(x + 1.0, -0.82, 1.28),
        material=metal_mat,
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=12,
    )
    add_cylinder(
        f"{prefix}_Discharge",
        radius=0.18,
        depth=1.0,
        location=(x + 1.0, 0.0, 2.05),
        material=metal_mat,
        vertices=12,
    )
    add_cylinder(
        f"{prefix}_ValveWheel",
        radius=0.18,
        depth=0.05,
        location=(x + 1.0, 0.0, 2.55),
        material=accent_mat,
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=10,
    )


def build_scene():
    reset_scene()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("PumpSkidWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.016, 0.022, 0.03, 1.0)
    bg.inputs[1].default_value = 0.68

    mats = {
        "ground": make_material("Ground", (0.12, 0.15, 0.17, 1.0), roughness=0.96),
        "body": make_material("Body", (0.18, 0.73, 0.83, 1.0), metallic=0.14, roughness=0.38),
        "metal": make_material("Metal", (0.74, 0.78, 0.82, 1.0), metallic=0.24, roughness=0.34),
        "dark": make_material("Dark", (0.13, 0.15, 0.18, 1.0), roughness=0.8),
        "base": make_material("Base", (0.25, 0.29, 0.33, 1.0), roughness=0.82),
        "accent": make_material("Accent", (0.9, 0.72, 0.18, 1.0), roughness=0.42),
    }

    add_box("Ground", (18.0, 10.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("SkidFrame", (11.5, 3.4, 0.28), (0.0, 0.0, 0.14), mats["base"])
    add_box("RailLeft", (11.2, 0.18, 0.22), (0.0, 1.45, 0.38), mats["dark"])
    add_box("RailRight", (11.2, 0.18, 0.22), (0.0, -1.45, 0.38), mats["dark"])

    add_pump_unit("PumpA", -2.7, mats["body"], mats["metal"], mats["accent"], mats["base"])
    add_pump_unit("PumpB", 2.7, mats["body"], mats["metal"], mats["accent"], mats["base"])

    add_cylinder(
        "SuctionHeader",
        radius=0.22,
        depth=10.0,
        location=(0.0, -1.35, 1.28),
        material=mats["metal"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "DischargeHeader",
        radius=0.22,
        depth=10.0,
        location=(0.0, 1.15, 2.05),
        material=mats["metal"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )

    for x in (-2.7, 2.7):
        add_cylinder(
            f"SuctionBranch_{x:.1f}",
            radius=0.18,
            depth=1.05,
            location=(x + 1.0, -0.82, 1.28),
            material=mats["metal"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=12,
        )
        add_cylinder(
            f"DischargeBranch_{x:.1f}",
            radius=0.18,
            depth=0.9,
            location=(x + 1.0, 0.7, 2.05),
            material=mats["metal"],
            vertices=12,
        )
        add_cylinder(
            f"SuctionFlange_{x:.1f}",
            radius=0.3,
            depth=0.12,
            location=(x + 1.0, -1.35, 1.28),
            material=mats["dark"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=16,
        )
        add_cylinder(
            f"DischargeFlange_{x:.1f}",
            radius=0.3,
            depth=0.12,
            location=(x + 1.0, 1.15, 2.05),
            material=mats["dark"],
            rotation=(math.radians(90), 0.0, 0.0),
            vertices=16,
        )

    add_cylinder(
        "HeaderNozzleLeftIn",
        radius=0.24,
        depth=0.7,
        location=(-5.4, -1.35, 1.28),
        material=mats["body"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "HeaderNozzleRightOut",
        radius=0.24,
        depth=0.7,
        location=(5.4, 1.15, 2.05),
        material=mats["body"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )

    for idx, x in enumerate((-5.0, -1.3, 1.3, 5.0)):
        add_box(f"Anchor_{idx}", (0.35, 0.3, 0.16), (x, 0.0, 0.36), mats["dark"])

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.3
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(49), 0.0, math.radians(30))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (13.0, -10.0, 6.5)
    cam.rotation_euler = (math.radians(69), 0.0, math.radians(43))
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
