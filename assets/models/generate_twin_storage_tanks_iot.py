import math
import os

import bpy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "twin_storage_tanks_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "twin_storage_tanks_iot_web.png")


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


def add_ring(name, radius, thickness, location, material):
    outer = add_cylinder(f"{name}_Outer", radius, thickness, location, material, vertices=24)
    inner = add_cylinder(f"{name}_Inner", radius - 0.08, thickness + 0.02, location, material, vertices=24)
    bool_mod = outer.modifiers.new(name=f"{name}_Cut", type="BOOLEAN")
    bool_mod.operation = "DIFFERENCE"
    bool_mod.object = inner
    bpy.context.view_layer.objects.active = outer
    bpy.ops.object.modifier_apply(modifier=bool_mod.name)
    bpy.data.objects.remove(inner, do_unlink=True)
    outer.name = name
    return outer


def add_tank(prefix, x, shell_mat, trim_mat, base_mat, accent_mat):
    add_cylinder(f"{prefix}_Body", 1.5, 6.2, (x, 0.0, 4.0), shell_mat, vertices=24)
    add_cylinder(f"{prefix}_TopCap", 1.5, 0.55, (x, 0.0, 7.38), shell_mat, vertices=24)
    add_cylinder(f"{prefix}_BottomCap", 1.5, 0.55, (x, 0.0, 0.62), shell_mat, vertices=24)

    for idx, z in enumerate((2.0, 3.5, 5.0, 6.5)):
        add_ring(f"{prefix}_Ring_{idx}", 1.57, 0.08, (x, 0.0, z), trim_mat)

    for idx, y in enumerate((-0.9, 0.9)):
        add_box(f"{prefix}_Leg_{idx}", (0.42, 0.32, 1.2), (x + 1.05, y, 0.6), base_mat)
        add_box(f"{prefix}_LegB_{idx}", (0.42, 0.32, 1.2), (x - 1.05, y, 0.6), base_mat)

    add_cylinder(
        f"{prefix}_TopNozzle",
        radius=0.18,
        depth=0.8,
        location=(x, 0.0, 8.0),
        material=accent_mat,
        vertices=12,
    )
    add_cylinder(
        f"{prefix}_SideNozzle",
        radius=0.2,
        depth=0.95,
        location=(x + 1.72, 0.0, 3.2),
        material=accent_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )
    add_cylinder(
        f"{prefix}_BottomNozzle",
        radius=0.18,
        depth=0.95,
        location=(x - 1.72, 0.0, 1.1),
        material=accent_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )


def add_platform(rail_mat, floor_mat, accent_mat):
    add_box("Platform", (6.0, 1.3, 0.12), (0.0, 0.0, 5.45), floor_mat)
    add_box("PlatformSupportLeft", (0.14, 1.1, 2.0), (-2.1, 0.0, 4.42), rail_mat)
    add_box("PlatformSupportRight", (0.14, 1.1, 2.0), (2.1, 0.0, 4.42), rail_mat)
    add_box("HandrailFront", (6.0, 0.06, 0.06), (0.0, 0.58, 6.2), rail_mat)
    add_box("HandrailBack", (6.0, 0.06, 0.06), (0.0, -0.58, 6.2), rail_mat)
    add_box("HandrailMidFront", (6.0, 0.05, 0.05), (0.0, 0.58, 5.85), rail_mat)
    add_box("HandrailMidBack", (6.0, 0.05, 0.05), (0.0, -0.58, 5.85), rail_mat)

    for idx, x in enumerate((-2.6, -1.3, 0.0, 1.3, 2.6)):
        add_box(f"PlatformPostF_{idx}", (0.05, 0.05, 0.78), (x, 0.58, 5.82), rail_mat)
        add_box(f"PlatformPostB_{idx}", (0.05, 0.05, 0.78), (x, -0.58, 5.82), rail_mat)

    for idx in range(9):
        add_box(
            f"LadderStep_{idx}",
            (0.36, 0.05, 0.05),
            (-3.32, 0.0, 1.1 + idx * 0.47),
            accent_mat,
        )
    add_box("LadderRailL", (0.05, 0.05, 4.3), (-3.5, 0.0, 3.15), rail_mat)
    add_box("LadderRailR", (0.05, 0.05, 4.3), (-3.14, 0.0, 3.15), rail_mat)


def build_scene():
    reset_scene()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    world = bpy.data.worlds.new("TwinStorageTankWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.016, 0.022, 0.03, 1.0)
    bg.inputs[1].default_value = 0.68

    mats = {
        "ground": make_material("Ground", (0.11, 0.14, 0.17, 1.0), roughness=0.96),
        "shell": make_material("Shell", (0.84, 0.86, 0.88, 1.0), metallic=0.08, roughness=0.6),
        "trim": make_material("Trim", (0.18, 0.74, 0.84, 1.0), metallic=0.16, roughness=0.38),
        "rail": make_material("Rail", (0.55, 0.62, 0.66, 1.0), metallic=0.22, roughness=0.42),
        "base": make_material("Base", (0.24, 0.28, 0.32, 1.0), roughness=0.82),
        "accent": make_material("Accent", (0.9, 0.72, 0.18, 1.0), roughness=0.42),
    }

    add_box("Ground", (20.0, 12.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("Pad", (10.0, 5.6, 0.16), (0.0, 0.0, 0.08), mats["base"])

    add_tank("TankA", -2.3, mats["shell"], mats["trim"], mats["base"], mats["accent"])
    add_tank("TankB", 2.3, mats["shell"], mats["trim"], mats["base"], mats["accent"])
    add_platform(mats["rail"], mats["base"], mats["accent"])

    add_cylinder(
        "TopHeader",
        radius=0.2,
        depth=4.6,
        location=(0.0, 0.0, 8.0),
        material=mats["rail"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "BottomHeader",
        radius=0.2,
        depth=4.6,
        location=(0.0, 0.0, 1.1),
        material=mats["rail"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=14,
    )
    add_cylinder(
        "SideBridge",
        radius=0.18,
        depth=2.0,
        location=(0.0, 0.0, 3.2),
        material=mats["rail"],
        rotation=(0.0, math.radians(90), 0.0),
        vertices=12,
    )

    for x in (-2.3, 2.3):
        add_cylinder(
            f"HeaderFlangeTop_{x:.1f}",
            radius=0.32,
            depth=0.12,
            location=(x, 0.0, 8.0),
            material=mats["base"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=16,
        )
        add_cylinder(
            f"HeaderFlangeBottom_{x:.1f}",
            radius=0.32,
            depth=0.12,
            location=(x, 0.0, 1.1),
            material=mats["base"],
            rotation=(0.0, math.radians(90), 0.0),
            vertices=16,
        )

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.35
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0.0, math.radians(29))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (14.0, -12.0, 10.0)
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
