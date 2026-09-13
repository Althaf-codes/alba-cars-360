# Porsche 911 cloud turntable kit

This is isolated developer tooling for rendering 24 exterior frames of a licensed
Porsche 911 992 model in a temporary Linux Blender environment. It is not part of
the React application or its browser bundle.

## What this produces

```text
output/png/001.png … 024.png       # PNG masters
output/webp/001.webp … 024.webp    # quality-84 web delivery frames
output/contact-sheet.jpg            # eight-angle consistency review
output/preview.webp                 # optional low-resolution QA loop
```

The final WebPs are reviewed before a later, separate integration pass copies
them to `public/360/porsche-911-carrera-14036ac/`.

## Before using this kit

1. Re-check the asset and licence recorded in [asset-source.md](asset-source.md).
2. Sign into Blendkit yourself and obtain the model according to its terms. Do
   not place passwords, cookies, download tokens, or API keys in this folder.
3. Put the model in `input/`. The default expected name is
   `input/porsche-911-992.blend`.
4. If the asset contains external textures, upload their original relative folder
   structure beside the model. The entire `input/` directory is ignored by Git.

Supported source formats are `.blend`, `.fbx`, `.glb`, `.gltf`, and `.obj`.
Use `.blend` when available: it is most likely to preserve the asset's material
and texture setup.

## RunPod: recommended one-time workflow

Use an Ubuntu/PyTorch-style Linux Pod with an inexpensive RTX A4000, A5000, L4,
or better GPU. Twenty-four 1365 × 1024 Eevee frames do not need an expensive
high-end GPU. Start a temporary Pod, open its web terminal, and upload this
toolkit and your licensed model into `/workspace` using the RunPod file browser.

```bash
cd /workspace/porsche360-render
sudo apt-get update
sudo apt-get install -y blender python3-pip
python3 -m pip install --user pillow
blender --version
chmod +x render.sh
./render.sh input/porsche-911-992.blend
python3 optimize.py --input output/png --output output/webp --quality 84 --method 6 \
  --contact-sheet output/contact-sheet.jpg --preview output/preview.webp
```

If `sudo` is unavailable, run the `apt-get` commands as the Pod's default root
user. Blender 3.6+ and Blender 4.x are supported: the render script selects the
available Eevee engine identifier. The model should be rendered with static
camera/light/studio placement and exactly 24 angles, from 0° through 345°.

Open or download `output/contact-sheet.jpg` first. Check that all wheels, roof,
bumpers and body contours remain in frame; inspect `output/preview.webp` only as
a convenience QA loop. Download `output/webp/` and the contact sheet, then stop
and delete the Pod and attached volume so billing stops. Do not download or copy
the original source model into this repository.

## Optional green paint override

The script deliberately never guesses which material is paint. If the model is
not already near the ALBA listing's green, identify the exact body-paint material
name in Blender and run:

```bash
PORSCHE360_PAINT_MATERIAL="Exact Paint Material Name" ./render.sh input/porsche-911-992.blend
```

Only that named Principled material is adjusted. If the name is uncertain, leave
the source material alone or change it manually in cloud Blender and then render.

## Optional transparent master render

The normal output is a neutral light studio. For a one-off transparent test:

```bash
PORSCHE360_TRANSPARENT=1 ./render.sh input/porsche-911-992.blend
```

Do not create both sequences by default.

## Google Colab option

The same scripts can run in an interactive Colab notebook after uploading this
toolkit and model, installing Blender plus Pillow, and running the same commands.
See [COLAB.md](COLAB.md). It is a useful no-cost experiment, but not the
guaranteed route: Colab resource availability and session limits vary. Use RunPod
for the reproducible final run.

## Exact expected frame sequence

`001` through `024` map to 0°, 15°, 30° … 345°. Frame 024 is a distinct 345°
view; no duplicate 360° frame is rendered.

## After the cloud run

Do not alter the application yet. Deliver these items for review:

- `output/contact-sheet.jpg`
- `output/preview.webp` (optional)
- the 24 files in `output/webp/`
- the size report printed by `optimize.py`

Only after visual and payload approval should a separate task copy WebPs into the
application's public 360 asset directory and update the existing optional media
manifest.
