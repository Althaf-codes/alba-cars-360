# Optional Google Colab workflow

RunPod remains the recommended final environment because it is predictable and
easy to delete immediately after the render. This page is only a lower-cost,
interactive fallback for testing the exact same toolkit.

1. Create a new Google Colab notebook and select an available GPU runtime if one
   is offered. Do not rely on a particular GPU being available.
2. Upload a ZIP containing this `porsche360-render` folder and separately upload
   the licensed model plus its texture folder. Never place login credentials in
   the notebook.
3. Run this setup cell:

```bash
!apt-get update -qq
!apt-get install -y -qq blender python3-pip
!python3 -m pip install -q pillow
!blender --version
```

4. Unzip the toolkit under `/content`, place the source model at
   `/content/porsche360-render/input/porsche-911-992.blend`, then run:

```bash
%cd /content/porsche360-render
!chmod +x render.sh
!./render.sh input/porsche-911-992.blend
!python3 optimize.py --input output/png --output output/webp --quality 84 --method 6 --contact-sheet output/contact-sheet.jpg --preview output/preview.webp
```

5. Review `output/contact-sheet.jpg`, download the WebP folder only after it is
approved, and end the Colab runtime.

Colab may provide only CPU resources or may terminate free sessions. The toolkit
does not require a runtime WebGL stack; it needs only cloud Blender and Pillow.
If the render is slow or the session is unavailable, use the RunPod workflow in
the main README instead.
