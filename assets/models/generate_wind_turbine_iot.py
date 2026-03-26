import math
import os

import bpy
from mathutils import Vector


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(BASE_DIR, "wind_turbine_iot_web.glb")
PREVIEW_PATH = os.path.join(BASE_DIR, "wind_turbine_iot_web.png")


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


def parent_with_local_transform(obj, parent, location=(0.0, 0.0, 0.0), rotation=(0.0, 0.0, 0.0)):
    obj.parent = parent
    obj.location = location
    obj.rotation_euler = rotation


def add_box(name, size, location, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] * 0.5, size[1] * 0.5, size[2] * 0.5)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def add_cylinder(name, radius, depth, location, material, rotation=(0.0, 0.0, 0.0), vertices=24):
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


def add_uv_sphere(name, radius, location, material, scale=(1.0, 1.0, 1.0), segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=location,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def taper_cylinder(obj, radius_bottom, radius_top, half_height):
    for vertex in obj.data.vertices:
        factor = (vertex.co.z + half_height) / (half_height * 2.0)
        radius = radius_bottom + (radius_top - radius_bottom) * factor
        length = math.hypot(vertex.co.x, vertex.co.y)
        if length == 0:
            continue
        scale = radius / length
        vertex.co.x *= scale
        vertex.co.y *= scale


def create_blade(name, material):
    sections = [
        (0.0, 0.92, 0.34, 18.0, 0.0),
        (1.2, 0.84, 0.28, 13.0, 0.06),
        (4.2, 0.54, 0.15, 7.0, 0.12),
        (8.2, 0.28, 0.07, 3.0, 0.1),
        (11.8, 0.1, 0.03, 0.0, 0.03),
    ]
    profile = (
        (0.56, 0.0),
        (0.18, 0.48),
        (-0.34, 0.24),
        (-0.5, 0.0),
        (-0.34, -0.24),
        (0.18, -0.48),
    )

    vertices = []
    faces = []

    for section_idx, (z_pos, chord, thickness, twist_deg, camber) in enumerate(sections):
        twist = math.radians(twist_deg)
        cos_t = math.cos(twist)
        sin_t = math.sin(twist)
        for px, py in profile:
            x = px * chord + camber
            y = py * thickness
            rx = x * cos_t - y * sin_t
            ry = x * sin_t + y * cos_t
            vertices.append((rx, ry, z_pos))

        if section_idx == 0:
            continue
        ring_size = len(profile)
        prev_start = (section_idx - 1) * ring_size
        current_start = section_idx * ring_size
        for point_idx in range(ring_size):
            next_idx = (point_idx + 1) % ring_size
            faces.append(
                (
                    prev_start + point_idx,
                    prev_start + next_idx,
                    current_start + next_idx,
                    current_start + point_idx,
                )
            )

    root_face = tuple(reversed(range(len(profile))))
    tip_start = (len(sections) - 1) * len(profile)
    tip_face = tuple(tip_start + idx for idx in range(len(profile)))
    faces.append(root_face)
    faces.append(tip_face)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    blade = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(blade)
    apply_material(blade, material)
    return blade


def add_rotor_assembly(rotor_center, tower_mat, metal_mat, accent_mat):
    rotor = bpy.data.objects.new("RotorAssembly", None)
    rotor.empty_display_type = "PLAIN_AXES"
    rotor.location = rotor_center
    bpy.context.collection.objects.link(rotor)

    hub_shell = add_uv_sphere("HubShell", 0.58, rotor_center, metal_mat, scale=(1.15, 1.0, 1.0))
    parent_with_local_transform(hub_shell, rotor)

    pitch_ring = add_cylinder(
        "PitchRing",
        radius=0.62,
        depth=0.34,
        location=rotor_center,
        material=accent_mat,
        rotation=(0.0, math.radians(90), 0.0),
        vertices=24,
    )
    parent_with_local_transform(pitch_ring, rotor, location=(0.06, 0.0, 0.0), rotation=(0.0, math.radians(90), 0.0))

    nose = add_uv_sphere(
        "NoseCone",
        0.48,
        rotor_center,
        accent_mat,
        scale=(1.55, 1.0, 1.0),
    )
    parent_with_local_transform(nose, rotor, location=(-0.78, 0.0, 0.0))

    root_positions = (
        Vector((0.08, 0.0, 0.86)),
        Vector((0.08, -0.72, -0.42)),
        Vector((0.08, 0.72, -0.42)),
    )
    blade_angles = (-90.0, 30.0, 150.0)
    for index, angle_deg in enumerate(blade_angles, start=1):
        root = add_cylinder(
            f"BladeRoot_{index}",
            radius=0.17,
            depth=0.62,
            location=rotor_center,
            material=metal_mat,
            rotation=(0.0, math.radians(90), 0.0),
            vertices=16,
        )
        parent_with_local_transform(
            root,
            rotor,
            location=(0.14, 0.0, 0.0),
            rotation=(math.radians(90), 0.0, math.radians(angle_deg)),
        )

        blade = create_blade(f"Blade_{index}", tower_mat)
        parent_with_local_transform(
            blade,
            rotor,
            location=(0.0, 0.0, 0.0),
            rotation=(math.radians(angle_deg), 0.0, 0.0),
        )

    rotor.rotation_euler = (0.0, 0.0, 0.0)
    rotor.keyframe_insert(data_path="rotation_euler", frame=1)
    rotor.rotation_euler = (math.radians(360), 0.0, 0.0)
    rotor.keyframe_insert(data_path="rotation_euler", frame=120)
    return rotor


def build_scene():
    reset_scene()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"
    scene.frame_start = 1
    scene.frame_end = 120

    world = bpy.data.worlds.new("WindTurbineWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.014, 0.019, 0.027, 1.0)
    bg.inputs[1].default_value = 0.76

    mats = {
        "ground": make_material("Ground", (0.105, 0.14, 0.17, 1.0), roughness=0.98),
        "tower": make_material("Tower", (0.92, 0.93, 0.95, 1.0), metallic=0.04, roughness=0.5),
        "accent": make_material("Accent", (0.18, 0.72, 0.83, 1.0), metallic=0.15, roughness=0.35),
        "metal": make_material("Metal", (0.62, 0.67, 0.72, 1.0), metallic=0.22, roughness=0.4),
        "dark": make_material("Dark", (0.13, 0.16, 0.19, 1.0), roughness=0.8),
    }

    add_box("Ground", (36.0, 22.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_cylinder("Foundation", 2.2, 0.85, (0.0, 0.0, 0.42), mats["metal"], vertices=30)
    add_cylinder("FoundationTop", 1.6, 0.2, (0.0, 0.0, 0.92), mats["dark"], vertices=28)

    tower = add_cylinder("Tower", 0.9, 20.0, (0.0, 0.0, 10.95), mats["tower"], vertices=28)
    taper_cylinder(tower, 0.92, 0.28, 10.0)
    add_cylinder("TowerFlange", 1.08, 0.16, (0.0, 0.0, 1.03), mats["dark"], vertices=28)
    add_box("ServiceDoor", (0.08, 0.82, 1.65), (0.88, 0.0, 2.1), mats["accent"])
    add_box("DoorHandle", (0.06, 0.08, 0.2), (0.93, 0.27, 2.1), mats["dark"])
    add_box("TowerTopCap", (0.5, 0.5, 0.12), (0.0, 0.0, 21.06), mats["metal"])

    nacelle_body = add_box("NacelleBody", (3.85, 2.3, 2.05), (1.55, 0.0, 21.05), mats["tower"])
    nacelle_body.rotation_euler = (0.0, math.radians(1.5), 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    apply_material(nacelle_body, mats["tower"])
    add_box("NacelleTop", (3.35, 1.95, 0.34), (1.45, 0.0, 22.07), mats["metal"])
    add_box("NacelleChin", (1.4, 1.65, 0.34), (0.0, 0.0, 20.15), mats["metal"])
    add_box("NacelleRear", (1.4, 1.86, 1.45), (3.55, 0.0, 20.95), mats["metal"])
    add_box("RearVentBlock", (0.48, 1.74, 1.2), (4.42, 0.0, 20.95), mats["dark"])

    for idx, z in enumerate((20.35, 20.65, 20.95, 21.25, 21.55)):
        add_box(f"RearVentFin_{idx}", (0.07, 1.58, 0.07), (4.68, 0.0, z), mats["accent"])

    add_box("SideServicePanel", (1.45, 0.08, 1.15), (1.45, 1.18, 20.85), mats["accent"])
    add_box("SideServicePanelRear", (1.2, 0.08, 0.95), (3.05, -1.18, 20.8), mats["metal"])
    add_cylinder(
        "YawBearing",
        radius=0.46,
        depth=0.36,
        location=(0.0, 0.0, 20.24),
        material=mats["dark"],
        vertices=24,
    )
    add_box("GeneratorBulge", (1.0, 1.6, 1.0), (2.3, 0.0, 20.95), mats["metal"])

    add_box("HubSupport", (0.48, 0.48, 0.84), (-0.34, 0.0, 21.02), mats["dark"])

    rotor = add_rotor_assembly((-0.78, 0.0, 21.1), mats["tower"], mats["metal"], mats["accent"])

    if rotor.animation_data and rotor.animation_data.action:
        fcurves = getattr(rotor.animation_data.action, "fcurves", None)
        if fcurves is not None:
            for fcurve in fcurves:
                for keyframe in fcurve.keyframe_points:
                    keyframe.interpolation = "LINEAR"

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.6
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(47), 0.0, math.radians(24))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (22.0, -18.5, 14.8)
    cam.rotation_euler = (math.radians(66), 0.0, math.radians(52))
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
        export_animations=True,
        export_force_sampling=True,
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
