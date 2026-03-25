import math
import os

import bpy
from mathutils import Vector


OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "large_substation_iot_web.glb",
)
PREVIEW_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "large_substation_iot_web.png",
)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablock_collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablock_collection):
            if datablock.users == 0:
                datablock_collection.remove(datablock)


def ensure_world():
    world = bpy.data.worlds.new("SubstationWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.018, 0.025, 0.034, 1.0)
    bg.inputs[1].default_value = 0.65


def make_material(name, rgba, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def apply_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def set_smooth(obj):
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_smooth()
        obj.select_set(False)


def add_box(name, size, location, material, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] * 0.5, size[1] * 0.5, size[2] * 0.5)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, material)
    return obj


def add_cylinder(name, radius, depth, location, material, rotation=(0.0, 0.0, 0.0), vertices=12):
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


def add_busbar(name, start, end, radius, material):
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = (start_v + end_v) * 0.5
    length = direction.length
    dx, dy, dz = direction
    yaw = math.atan2(dy, dx)
    pitch = math.atan2(math.sqrt(dx * dx + dy * dy), dz)
    obj = add_cylinder(
        name,
        radius=radius,
        depth=length,
        location=midpoint,
        material=material,
        rotation=(pitch, 0.0, yaw),
        vertices=10,
    )
    return obj


def add_fence(x_count, y_count, spacing_x, spacing_y, base_height, pole_mat, rail_mat):
    pole_mesh = None
    rail_mesh = None
    created = []
    x_positions = [(-x_count / 2 + i) * spacing_x for i in range(x_count + 1)]
    y_positions = [(-y_count / 2 + i) * spacing_y for i in range(y_count + 1)]
    fence_x = x_positions[-1]
    fence_y = y_positions[-1]

    def duplicate_with_shared_mesh(mesh, name, location, material):
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        apply_material(obj, material)
        return obj

    for x in x_positions:
        for sign in (-1, 1):
            if pole_mesh is None:
                pole = add_cylinder(
                    "FencePoleSeed",
                    radius=0.05,
                    depth=base_height,
                    location=(x, sign * fence_y, base_height * 0.5),
                    material=pole_mat,
                    vertices=8,
                )
                pole_mesh = pole.data
                created.append(pole)
            else:
                created.append(
                    duplicate_with_shared_mesh(
                        pole_mesh,
                        f"FencePoleX_{x:.1f}_{sign}",
                        (x, sign * fence_y, base_height * 0.5),
                        pole_mat,
                    )
                )
    for y in y_positions[1:-1]:
        for sign in (-1, 1):
            created.append(
                duplicate_with_shared_mesh(
                    pole_mesh,
                    f"FencePoleY_{y:.1f}_{sign}",
                    (sign * fence_x, y, base_height * 0.5),
                    pole_mat,
                )
            )

    rail_depth_x = fence_x * 2
    rail_depth_y = fence_y * 2
    rail_heights = (0.75, 1.4)
    for height in rail_heights:
        for sign in (-1, 1):
            if rail_mesh is None:
                rail = add_box(
                    "FenceRailSeed",
                    size=(rail_depth_x, 0.06, 0.06),
                    location=(0.0, sign * fence_y, height),
                    material=rail_mat,
                )
                rail_mesh = rail.data
                created.append(rail)
            else:
                rail_x = duplicate_with_shared_mesh(
                    rail_mesh,
                    f"FenceRailX_{height:.2f}_{sign}",
                    (0.0, sign * fence_y, height),
                    rail_mat,
                )
                rail_x.scale = (1.0, 1.0, 1.0)
                created.append(rail_x)

            rail_y = duplicate_with_shared_mesh(
                rail_mesh,
                f"FenceRailY_{height:.2f}_{sign}",
                (sign * fence_x, 0.0, height),
                rail_mat,
            )
            rail_y.rotation_euler = (0.0, 0.0, math.radians(90))
            rail_y.scale = (rail_depth_y / rail_depth_x, 1.0, 1.0)
            created.append(rail_y)
    return created


def add_transformer(name, location, body_mat, metal_mat, accent_mat):
    created = []
    x, y, z = location
    body = add_box(f"{name}_Body", (4.8, 3.1, 2.6), (x, y, z + 1.5), body_mat)
    created.append(body)
    lid = add_box(f"{name}_Lid", (4.6, 2.9, 0.3), (x, y, z + 2.95), accent_mat)
    created.append(lid)

    for idx, dx in enumerate((-1.55, -0.9, -0.25, 0.4, 1.05)):
        fin = add_box(
            f"{name}_Fin_{idx}",
            (0.24, 2.5, 2.1),
            (x + dx, y + 0.2, z + 1.45),
            metal_mat,
        )
        created.append(fin)

    conservator = add_cylinder(
        f"{name}_Conservator",
        radius=0.28,
        depth=3.8,
        location=(x, y - 1.75, z + 2.7),
        material=metal_mat,
        rotation=(math.radians(90), 0.0, 0.0),
        vertices=10,
    )
    created.append(conservator)

    for idx, dx in enumerate((-1.2, 0.0, 1.2)):
        bushing = add_cylinder(
            f"{name}_Bushing_{idx}",
            radius=0.12,
            depth=1.5,
            location=(x + dx, y + 1.0, z + 3.45),
            material=accent_mat,
            vertices=8,
        )
        created.append(bushing)
        lead = add_busbar(
            f"{name}_Lead_{idx}",
            (x + dx, y + 1.0, z + 4.2),
            (x + dx, y + 3.4, z + 4.2),
            0.05,
            accent_mat,
        )
        created.append(lead)

    skid = add_box(f"{name}_Skid", (5.2, 3.5, 0.22), (x, y, z + 0.11), metal_mat)
    created.append(skid)
    return created


def add_breaker_bay(name, location, metal_mat, live_mat):
    created = []
    x, y, z = location
    stand = add_box(f"{name}_Stand", (0.85, 0.85, 0.2), (x, y, z + 0.1), metal_mat)
    created.append(stand)
    for idx, dx in enumerate((-0.22, 0.22)):
        post = add_cylinder(
            f"{name}_Post_{idx}",
            radius=0.08,
            depth=2.4,
            location=(x + dx, y, z + 1.35),
            material=metal_mat,
            vertices=8,
        )
        created.append(post)
        insulator = add_cylinder(
            f"{name}_Ins_{idx}",
            radius=0.14,
            depth=0.55,
            location=(x + dx, y, z + 2.62),
            material=live_mat,
            vertices=8,
        )
        created.append(insulator)

    tank = add_box(f"{name}_Tank", (0.92, 0.5, 0.7), (x, y, z + 1.85), metal_mat)
    created.append(tank)
    return created


def add_gantry(name, location, height, width, metal_mat):
    created = []
    x, y, z = location
    for idx, dx in enumerate((-width * 0.5, width * 0.5)):
        leg = add_box(
            f"{name}_Leg_{idx}",
            (0.18, 0.18, height),
            (x + dx, y, z + height * 0.5),
            metal_mat,
        )
        created.append(leg)
    beam = add_box(
        f"{name}_Beam",
        (width + 0.4, 0.22, 0.22),
        (x, y, z + height),
        metal_mat,
    )
    created.append(beam)
    return created


def add_tower(name, location, height, metal_mat, live_mat):
    created = []
    x, y, z = location
    base = add_box(f"{name}_Base", (1.4, 1.4, 0.22), (x, y, z + 0.11), metal_mat)
    created.append(base)
    levels = (0.32, 0.95, 1.75, 2.65)
    for sign_x in (-1, 1):
        for sign_y in (-1, 1):
            top = 0.18
            bottom = 0.42
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=6,
                radius=top,
                depth=height,
                location=(x + sign_x * bottom, y + sign_y * bottom, z + height * 0.5),
            )
            leg = bpy.context.active_object
            leg.scale.x = 0.35
            leg.scale.y = 0.35
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            leg.name = f"{name}_Leg_{sign_x}_{sign_y}"
            apply_material(leg, metal_mat)
            created.append(leg)
    for idx, level in enumerate(levels):
        cross = add_box(
            f"{name}_Cross_{idx}",
            (2.5 - idx * 0.2, 0.12, 0.12),
            (x, y, z + level * height),
            metal_mat,
        )
        created.append(cross)
        cross_y = add_box(
            f"{name}_CrossY_{idx}",
            (0.12, 2.5 - idx * 0.2, 0.12),
            (x, y, z + level * height),
            metal_mat,
        )
        created.append(cross_y)
    arm = add_box(f"{name}_TopArm", (4.0, 0.16, 0.16), (x, y, z + height + 0.2), metal_mat)
    created.append(arm)
    for idx, dx in enumerate((-1.35, 0.0, 1.35)):
        ins = add_cylinder(
            f"{name}_TopIns_{idx}",
            radius=0.08,
            depth=0.6,
            location=(x + dx, y, z + height - 0.25),
            material=live_mat,
            vertices=8,
        )
        created.append(ins)
    return created


def build_scene():
    reset_scene()
    ensure_world()

    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"

    mats = {
        "ground": make_material("Ground", (0.11, 0.15, 0.18, 1.0), roughness=0.95),
        "concrete": make_material("Concrete", (0.54, 0.58, 0.6, 1.0), roughness=0.9),
        "metal": make_material("Metal", (0.56, 0.64, 0.68, 1.0), metallic=0.15, roughness=0.52),
        "body": make_material("Body", (0.84, 0.86, 0.88, 1.0), roughness=0.68),
        "accent": make_material("Accent", (0.17, 0.75, 0.83, 1.0), metallic=0.22, roughness=0.36),
        "live": make_material("Live", (0.89, 0.76, 0.24, 1.0), metallic=0.12, roughness=0.42),
        "building": make_material("Building", (0.18, 0.25, 0.31, 1.0), roughness=0.82),
        "glass": make_material("Glass", (0.17, 0.44, 0.58, 1.0), metallic=0.05, roughness=0.16),
        "road": make_material("Road", (0.09, 0.11, 0.13, 1.0), roughness=0.92),
    }

    add_box("GroundPlane", (62.0, 42.0, 0.2), (0.0, 0.0, -0.1), mats["ground"])
    add_box("ConcretePad", (52.0, 30.0, 0.14), (0.0, 0.0, 0.07), mats["concrete"])
    add_box("AccessRoad", (52.0, 4.2, 0.06), (0.0, -13.2, 0.11), mats["road"])
    add_box("ControlBuilding", (9.4, 5.8, 3.4), (-18.0, -8.3, 1.7), mats["building"])
    add_box("BuildingRoof", (9.9, 6.2, 0.26), (-18.0, -8.3, 3.53), mats["accent"])
    window_band = add_box("BuildingWindows", (8.2, 0.12, 1.15), (-18.0, -5.35, 2.05), mats["glass"])
    set_smooth(window_band)

    add_box("GISHall", (8.6, 4.8, 3.0), (-18.2, 4.8, 1.5), mats["building"])
    add_box("GISRoof", (8.9, 5.1, 0.22), (-18.2, 4.8, 3.12), mats["accent"])

    add_fence(12, 8, 4.0, 4.0, 2.2, mats["metal"], mats["accent"])

    for idx, loc in enumerate(((-5.2, -1.5, 0.0), (5.2, -1.5, 0.0))):
        add_transformer(f"MainTransformer_{idx+1}", loc, mats["body"], mats["metal"], mats["accent"])

    bus_y_positions = (6.1, 8.3)
    for idx, bus_y in enumerate(bus_y_positions):
        add_busbar(
            f"Busbar_{idx+1}",
            (-11.5, bus_y, 4.25),
            (11.5, bus_y, 4.25),
            0.12,
            mats["live"],
        )
        for x in (-9.2, -5.7, -2.2, 2.2, 5.7, 9.2):
            add_busbar(
                f"BusbarDrop_{idx+1}_{x:.1f}",
                (x, bus_y, 4.25),
                (x, bus_y - 1.5, 2.8),
                0.05,
                mats["live"],
            )

    bay_x_positions = (-9.0, -5.8, -2.6, 2.6, 5.8, 9.0)
    for line_idx, y in enumerate((4.7, 7.0, 9.3)):
        for bay_idx, x in enumerate(bay_x_positions):
            add_breaker_bay(f"Bay_{line_idx}_{bay_idx}", (x, y, 0.0), mats["metal"], mats["accent"])

    for idx, loc in enumerate(((-11.5, 12.0, 0.0), (11.5, 12.0, 0.0))):
        add_gantry(f"Gantry_{idx+1}", loc, 6.2, 5.8, mats["metal"])
    for idx, loc in enumerate(((-15.0, 15.5, 0.0), (15.0, 15.5, 0.0))):
        add_tower(f"LineTower_{idx+1}", loc, 8.4, mats["metal"], mats["live"])
        for dx in (-1.35, 0.0, 1.35):
            add_busbar(
                f"TowerLead_{idx+1}_{dx:.1f}",
                (loc[0] + dx, loc[1], 8.55),
                (loc[0] * 0.8 + dx, 12.0, 6.2),
                0.04,
                mats["live"],
            )

    for x in (-12.5, 12.5):
        lamp = add_cylinder(
            f"LightPole_{x:.1f}",
            radius=0.07,
            depth=4.0,
            location=(x, -10.0, 2.0),
            material=mats["metal"],
            vertices=8,
        )
        created_head = add_box(f"LightHead_{x:.1f}", (0.65, 0.28, 0.18), (x, -9.7, 4.05), mats["accent"])
        set_smooth(lamp)
        set_smooth(created_head)

    sun_data = bpy.data.lights.new(name="Sun", type="SUN")
    sun_data.energy = 2.2
    sun = bpy.data.objects.new(name="Sun", object_data=sun_data)
    bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(42), 0.0, math.radians(28))

    cam_data = bpy.data.cameras.new("PreviewCamera")
    cam = bpy.data.objects.new("PreviewCamera", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (28.0, -32.0, 24.0)
    cam.rotation_euler = (math.radians(61), 0.0, math.radians(38))
    bpy.context.scene.camera = cam


def export_glb():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
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


def render_preview():
    scene = bpy.context.scene
    scene.render.filepath = PREVIEW_PATH
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    bpy.ops.render.render(write_still=True)


def main():
    build_scene()
    export_glb()
    render_preview()
    print(f"Exported GLB to: {OUTPUT_PATH}")
    print(f"Rendered preview to: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
