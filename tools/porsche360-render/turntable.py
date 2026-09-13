"""Headless, deterministic Porsche 911 exterior turntable renderer.

Run through render.sh. The script accepts a .blend, .fbx, .glb/.gltf, or .obj
source asset, centres its combined visible mesh bounds around a non-destructive
Empty pivot, then rotates that pivot while camera, lights, and studio stay fixed.

Optional environment variables:
  PORSCHE360_TRANSPARENT=1
  PORSCHE360_PAINT_MATERIAL="Exact material name"
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector

FRAME_COUNT = 24
ANGLE_STEP_DEGREES = 360 / FRAME_COUNT
RESOLUTION = (1365, 1024)
LENS_MM = 65
# The previous 0.82 safe-area factor framed the full turntable conservatively
# but left the 911 too small in a fullscreen product viewer. This still uses
# the maximum circular footprint across every rotation, with a tighter 10%
# horizontal safety margin.
HORIZONTAL_OCCUPANCY = 0.93

# Each row is a real camera position in the same deterministic turntable scene.
# The browser never fakes elevation by translating or cropping a single render.
ELEVATIONS = (
    ("low", 0.48, 0.34),
    ("normal", 0.52, 0.56),
    ("high", 0.54, 1.38),
)


def blender_args() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--elevation", choices=[name for name, _, _ in ELEVATIONS])
    return parser.parse_args(arguments)


def remove_object(object_: bpy.types.Object) -> None:
    bpy.data.objects.remove(object_, do_unlink=True)


def clear_default_scene() -> None:
    for object_ in list(bpy.context.scene.objects):
        remove_object(object_)


def load_model(path: Path) -> None:
    suffix = path.suffix.lower()
    if suffix == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(path))
        return

    clear_default_scene()
    if suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path))
    elif suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".obj":
        # Blender 4 uses wm.obj_import; Blender 3.x uses import_scene.obj.
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=str(path))
        else:
            bpy.ops.import_scene.obj(filepath=str(path))
    else:
        raise RuntimeError(f"Unsupported source format: {suffix}")


def visible_meshes() -> list[bpy.types.Object]:
    meshes = [
        object_
        for object_ in bpy.context.scene.objects
        if object_.type == "MESH" and object_.visible_get() and not object_.hide_render
    ]
    if not meshes:
        raise RuntimeError("No visible mesh objects were found after importing the model.")
    return meshes


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [object_.matrix_world @ Vector(corner) for object_ in meshes for corner in object_.bound_box]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum


def vehicle_roots(meshes: list[bpy.types.Object]) -> list[bpy.types.Object]:
    roots: set[bpy.types.Object] = set()
    for mesh in meshes:
        root = mesh
        while root.parent and root.parent.type not in {"CAMERA", "LIGHT"}:
            root = root.parent
        roots.add(root)
    return list(roots)


def parent_to_pivot(meshes: list[bpy.types.Object], pivot_location: Vector) -> bpy.types.Object:
    pivot = bpy.data.objects.new("TurntablePivot", None)
    bpy.context.collection.objects.link(pivot)
    pivot.location = pivot_location
    for root in vehicle_roots(meshes):
        world_matrix = root.matrix_world.copy()
        root.parent = pivot
        root.matrix_parent_inverse = pivot.matrix_world.inverted()
        root.matrix_world = world_matrix
    return pivot


def remove_existing_cameras_and_lights() -> None:
    for object_ in list(bpy.context.scene.objects):
        if object_.type in {"CAMERA", "LIGHT"}:
            remove_object(object_)


def look_at(object_: bpy.types.Object, target: Vector) -> None:
    object_.rotation_euler = (target - object_.location).to_track_quat("-Z", "Y").to_euler()


def create_camera(
    center: Vector,
    radial_extent: float,
    height: float,
    target_ratio: float,
    camera_height_ratio: float,
    elevation_name: str,
) -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("TurntableCamera")
    camera_data.lens = LENS_MM
    camera_data.sensor_width = 36
    camera = bpy.data.objects.new("TurntableCamera", camera_data)
    bpy.context.collection.objects.link(camera)

    horizontal_fov = camera_data.angle
    vertical_fov = 2 * math.atan(math.tan(horizontal_fov / 2) / (RESOLUTION[0] / RESOLUTION[1]))
    # `radial_extent` bounds every mesh corner at every Z rotation, so the
    # composition remains safe through all 24 frames—not just the first view.
    required_width = (2 * radial_extent) / (2 * math.tan(horizontal_fov / 2) * HORIZONTAL_OCCUPANCY)
    required_height = height / (2 * math.tan(vertical_fov / 2) * 0.84)
    distance = max(required_width, required_height, radial_extent * 2.5)

    target = Vector((center.x, center.y, center.z - height * 0.52 + height * target_ratio))
    camera.location = Vector((target.x, target.y - distance, center.z - height * 0.52 + height * camera_height_ratio))
    look_at(camera, target)
    camera_data.lens = LENS_MM
    camera_data.dof.use_dof = False
    camera_data.clip_start = max(0.01, radial_extent * 0.01)
    camera_data.clip_end = max(1000, distance * 10)
    bpy.context.scene.camera = camera
    print(
        f"Camera composition ({elevation_name}): lens={LENS_MM}mm, distance={distance:.3f}, "
        f"target_z={target.z:.3f}, camera_z={camera.location.z:.3f}, "
        f"horizontal_occupancy={HORIZONTAL_OCCUPANCY:.0%}"
    )
    return camera


def add_area_light(name: str, location: Vector, target: Vector, energy: float, size: float) -> None:
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, target)


def create_studio(minimum: Vector, maximum: Vector, center: Vector, radial_extent: float, transparent: bool) -> None:
    height = maximum.z - minimum.z
    target = Vector((center.x, center.y, minimum.z + height * 0.48))
    floor_size = max(radial_extent * 8, height * 4)

    if not transparent:
        bpy.ops.mesh.primitive_plane_add(size=floor_size, location=(center.x, center.y, minimum.z - 0.01))
        floor = bpy.context.active_object
        floor.name = "StudioFloor"
        floor_material = bpy.data.materials.new("StudioFloorMaterial")
        floor_material.use_nodes = True
        floor_material.diffuse_color = (0.012, 0.016, 0.020, 1)
        floor_principled = next(node for node in floor_material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        floor_principled.inputs["Base Color"].default_value = (0.003, 0.005, 0.007, 1)
        floor_principled.inputs["Roughness"].default_value = 0.86
        floor.data.materials.append(floor_material)

    add_area_light(
        "StudioKey",
        target + Vector((-radial_extent * 1.7, -radial_extent * 1.4, height * 1.8)),
        target,
        energy=1125,
        size=max(radial_extent * 3.0, 6),
    )
    add_area_light(
        "StudioFill",
        target + Vector((radial_extent * 1.9, -radial_extent * 0.8, height * 1.1)),
        target,
        energy=775,
        size=max(radial_extent * 3.0, 6),
    )
    add_area_light(
        "StudioRim",
        target + Vector((0, radial_extent * 1.8, height * 1.65)),
        target,
        energy=950,
        size=max(radial_extent * 2.0, 4),
    )

    world = bpy.context.scene.world or bpy.data.worlds.new("StudioWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    # Match the immersive viewer's charcoal tone so the rendered stage feels
    # deliberate rather than like a light rectangle floating in a dark dialog.
    background.inputs["Color"].default_value = (0.018, 0.028, 0.035, 1)
    background.inputs["Strength"].default_value = 0.22

def set_optional_paint_override() -> None:
    material_name = os.environ.get("PORSCHE360_PAINT_MATERIAL")
    if not material_name:
        return
    material = bpy.data.materials.get(material_name)
    if material is None or not material.use_nodes:
        raise RuntimeError(
            f"PORSCHE360_PAINT_MATERIAL={material_name!r} did not name a node-based material. "
            "Remove the override or select the body-paint material manually."
        )
    principled = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if principled is None:
        raise RuntimeError(f"Material {material_name!r} has no Principled BSDF to override safely.")
    principled.inputs["Base Color"].default_value = (0.035, 0.19, 0.085, 1)
    principled.inputs["Metallic"].default_value = max(0.45, float(principled.inputs["Metallic"].default_value))
    principled.inputs["Roughness"].default_value = min(0.25, float(principled.inputs["Roughness"].default_value))


def configure_render(output: Path) -> None:
    scene = bpy.context.scene
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    else:
        raise RuntimeError("This Blender installation does not provide a compatible Eevee renderer.")
    scene.render.resolution_x, scene.render.resolution_y = RESOLUTION
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if os.environ.get("PORSCHE360_TRANSPARENT") == "1" else "RGB"
    scene.render.film_transparent = os.environ.get("PORSCHE360_TRANSPARENT") == "1"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = str(output)
    scene.render.use_file_extension = True

    # Use intentionally modest, reproducible Eevee settings.
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 64


def render_frames(pivot: bpy.types.Object, camera: bpy.types.Object, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.camera = camera
    for index in range(FRAME_COUNT):
        pivot.rotation_euler = (0, 0, math.radians(index * ANGLE_STEP_DEGREES))
        bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"{index + 1:03d}.png")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    args = blender_args()
    model_path = args.input.expanduser().resolve()
    output_path = args.output.expanduser().resolve()
    if not model_path.is_file():
        raise FileNotFoundError(f"Input model not found: {model_path}")

    load_model(model_path)
    remove_existing_cameras_and_lights()
    meshes = visible_meshes()
    minimum, maximum = world_bounds(meshes)
    center = (minimum + maximum) / 2
    radial_extent = max(
        math.hypot(point.x - center.x, point.y - center.y)
        for mesh in meshes
        for corner in mesh.bound_box
        for point in [mesh.matrix_world @ Vector(corner)]
    )
    height = maximum.z - minimum.z
    if radial_extent <= 0 or height <= 0:
        raise RuntimeError("The imported model has invalid dimensions.")

    pivot = parent_to_pivot(meshes, Vector((center.x, center.y, minimum.z)))
    transparent = os.environ.get("PORSCHE360_TRANSPARENT") == "1"
    create_studio(minimum, maximum, center, radial_extent, transparent)
    set_optional_paint_override()
    configure_render(output_path)
    camera_center = Vector((center.x, center.y, minimum.z + height * 0.52))
    elevations = tuple(item for item in ELEVATIONS if args.elevation in {None, item[0]})
    for elevation_name, target_ratio, camera_height_ratio in elevations:
        camera = create_camera(camera_center, radial_extent, height, target_ratio, camera_height_ratio, elevation_name)
        render_frames(pivot, camera, output_path / elevation_name)
    print(f"Rendered {FRAME_COUNT} deterministic frames across {len(elevations)} elevations to {output_path}")


if __name__ == "__main__":
    main()
