#!/usr/bin/env python3
"""Convert deterministic PNG turntable masters to WebP and generate QA assets.

This utility intentionally never deletes the PNG masters. It is usable outside
Blender and only requires Pillow in the temporary cloud environment.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from statistics import mean

from PIL import Image, ImageDraw, ImageFont

FRAME_COUNT = 24
CONTACT_FRAMES = (1, 4, 7, 10, 13, 16, 19, 22)


def numeric_pngs(directory: Path) -> list[Path]:
    return sorted(
        (path for path in directory.glob("*.png") if path.stem.isdigit()),
        key=lambda path: int(path.stem),
    )


def to_webp(source: Path, destination: Path, quality: int, method: int) -> None:
    with Image.open(source) as image:
        # Preserve alpha when transparent masters are explicitly requested.
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image.save(destination, "WEBP", quality=quality, method=method)


def make_contact_sheet(source_dir: Path, destination: Path) -> None:
    frames = [source_dir / f"{number:03d}.png" for number in CONTACT_FRAMES]
    frames = [frame for frame in frames if frame.exists()]
    if not frames:
        raise FileNotFoundError("No representative PNG frames were found for the contact sheet.")

    with Image.open(frames[0]) as sample:
        thumb_width = 360
        thumb_height = round(sample.height * (thumb_width / sample.width))

    columns, rows, padding, label_height = 4, 2, 24, 34
    canvas = Image.new(
        "RGB",
        (
            columns * thumb_width + (columns + 1) * padding,
            rows * (thumb_height + label_height) + (rows + 1) * padding,
        ),
        "#f1f1ee",
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()

    for index, frame_path in enumerate(frames):
        with Image.open(frame_path) as frame:
            image = frame.convert("RGB")
            image.thumbnail((thumb_width, thumb_height), Image.Resampling.LANCZOS)
            cell_x = padding + (index % columns) * (thumb_width + padding)
            cell_y = padding + (index // columns) * (thumb_height + label_height + padding)
            image_x = cell_x + (thumb_width - image.width) // 2
            image_y = cell_y + (thumb_height - image.height) // 2
            canvas.paste(image, (image_x, image_y))
            draw.text((cell_x, cell_y + thumb_height + 9), frame_path.stem, fill="#24272b", font=font)

    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "JPEG", quality=92, optimize=True)


def make_preview(source_dir: Path, destination: Path) -> None:
    frames = numeric_pngs(source_dir)
    if not frames:
        raise FileNotFoundError("No PNG frames were found for the preview.")

    images: list[Image.Image] = []
    for path in frames:
        with Image.open(path) as frame:
            image = frame.convert("RGB")
            image.thumbnail((640, 480), Image.Resampling.LANCZOS)
            images.append(image.copy())

    destination.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(
        destination,
        "WEBP",
        save_all=True,
        append_images=images[1:],
        duration=80,
        loop=0,
        quality=72,
        method=4,
    )


def print_size_report(files: list[Path]) -> None:
    sizes = [path.stat().st_size for path in files]
    total = sum(sizes)
    mib = 1024 * 1024
    print(f"Frames: {len(files)}")
    print(f"Total: {total / mib:.2f} MiB")
    print(f"Average: {mean(sizes) / 1024:.0f} KiB")
    print(f"Smallest: {min(sizes) / 1024:.0f} KiB ({min(files, key=lambda path: path.stat().st_size).name})")
    print(f"Largest: {max(sizes) / 1024:.0f} KiB ({max(files, key=lambda path: path.stat().st_size).name})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("output/png"))
    parser.add_argument("--output", type=Path, default=Path("output/webp"))
    parser.add_argument("--quality", type=int, default=84)
    parser.add_argument("--method", type=int, default=6)
    parser.add_argument("--contact-sheet", type=Path, default=Path("output/contact-sheet.jpg"))
    parser.add_argument("--preview", type=Path, default=None)
    args = parser.parse_args()

    if not 0 <= args.quality <= 100 or not 0 <= args.method <= 6:
        parser.error("WebP quality must be 0–100 and method must be 0–6.")

    pngs = numeric_pngs(args.input)
    if len(pngs) != FRAME_COUNT:
        parser.error(f"Expected exactly {FRAME_COUNT} numbered PNG masters; found {len(pngs)} in {args.input}.")

    args.output.mkdir(parents=True, exist_ok=True)
    webps: list[Path] = []
    for png in pngs:
        webp = args.output / f"{png.stem}.webp"
        to_webp(png, webp, args.quality, args.method)
        webps.append(webp)

    make_contact_sheet(args.input, args.contact_sheet)
    if args.preview:
        make_preview(args.input, args.preview)

    print_size_report(webps)
    print(f"Contact sheet: {args.contact_sheet}")
    if args.preview:
        print(f"QA preview: {args.preview}")


if __name__ == "__main__":
    main()
