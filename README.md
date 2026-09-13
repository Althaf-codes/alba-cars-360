# ALBA CARS — Interactive Vehicle Experience Concept

An independently built vehicle-detail experience exploring how a premium automotive marketplace could combine a conventional photo gallery with a lightweight multi-axis 360° exterior viewer, responsive comparison tools, and a polished mobile experience.

> Independent concept created for demonstration purposes. Not affiliated with or endorsed by ALBA CARS.

## Preview

<!-- Add deployed screenshot / demo video here after deployment. -->

## Why I Built This

This project explores product and frontend-engineering ideas for premium automotive merchandising: helping a prospective buyer understand a vehicle more deeply before visiting a showroom, while preserving familiar dealership browsing patterns.

The work focuses on:

- an ALBA-inspired, information-dense vehicle-detail presentation;
- conventional vehicle photography as the default way to browse;
- richer exterior exploration through a lightweight interactive 360° experience;
- responsive, mobile-first browsing and touch interaction; and
- added interaction without introducing a runtime 3D engine or WebGL dependency.

It is an independent exploration of an enhanced vehicle-shopping experience, not a statement about any existing ALBA CARS product.

## Feature Overview

### Vehicle browsing

- ALBA-inspired vehicle detail interface for a Porsche 911 Carrera concept listing;
- responsive photo gallery with click/tap controls, keyboard navigation, mobile swipe, and a horizontally scrollable thumbnail rail;
- fullscreen photo lightbox with swipe, pinch-to-zoom, panning while zoomed, navigation controls, Escape close, and focus restoration; and
- vehicle overview, features, inspection, finance, FAQ, contact/map, and comparison sections.

### Interactive media

- 24 azimuth positions across three camera elevations (72 rendered exterior frames);
- horizontal rotation and vertical viewpoint changes;
- pinch or mouse-wheel zoom, plus panning while zoomed;
- keyboard controls and reset behavior; and
- lazy, progressive loading with browser and in-memory frame reuse.

### Responsive and accessible UI

- desktop, tablet, and mobile layouts;
- horizontally scrollable comparison content on narrow viewports;
- semantic headings, labelled controls, accessible dialogs, keyboard support, and visible `:focus-visible` states; and
- reduced-motion handling for non-essential motion.

## Interactive 360° Viewer

The exterior viewer is an image-sequence interaction rather than a real-time 3D viewer:

```text
24 azimuth angles × 3 camera elevations = 72 optimized WebP frames
```

Users can drag horizontally to rotate the vehicle, drag vertically to change elevation, pinch or scroll to zoom, pan while zoomed, reset the view, and use keyboard navigation.

This project does **not** ship Three.js, React Three Fiber, GLB/GLTF models, Blender, or WebGL vehicle rendering. Blender was used only offline to create the approved image sequences.

That approach provides predictable output, modest browser/GPU requirements, normal mobile-browser compatibility, straightforward CDN delivery, browser caching, and a comparatively small media payload. The final 72-frame sequence is approximately **2.97 MiB**.

## Media Loading Strategy

The normal photo gallery remains the default experience. No 360 frame images are mounted or requested before a visitor selects **Explore in 360°**.

After activation:

1. The initial/current frame loads first.
2. The nearest azimuth neighbours are prioritized.
3. Adjacent elevation frames are requested next.
4. Remaining frames progressively preload while the viewer remains open.
5. Browser and in-memory caching support subsequent interaction and reopen behavior.

The 360 viewer JavaScript is code-split, and the fullscreen photo lightbox is separately lazy-loaded.

## Why Image Sequences?

Image sequences provide a practical middle ground between static photography and runtime 3D. They preserve a rendered automotive appearance without a browser-side 3D engine, reduce the JavaScript and mobile-GPU surface area, remain deterministic, distribute cleanly through static hosting/CDNs, and benefit from ordinary browser image caching.

The trade-off is intentional: viewpoint freedom is limited to the camera positions rendered in advance. For a dealership-style exterior inspection experience, the 24 × 3 view set gives useful interaction while remaining predictable and lightweight.

## How This Could Scale for Real Inventory

The Blender workflow in this repository is a portfolio demonstration, not a proposed requirement to create a 3D model for every inventory vehicle. A production dealership workflow could instead use standardized capture:

```text
Vehicle photography rig
  → ordered exterior turntable capture
  → optional elevation capture
  → automated image optimization
  → object storage / CDN
  → stock-ID media mapping
  → lazy frontend viewer activation
```

For example:

```text
vehicles/
  14036AC/
    gallery/
    360/
      low/
      normal/
      high/
```

An object-storage and CDN combination—such as Cloudflare R2 with a CDN—could serve these assets without changing the core viewer model. This is an architectural illustration only; it does not claim to describe ALBA CARS infrastructure.

## Tech Stack

- React 19
- TypeScript
- Vite 6
- Native CSS with scoped ALBA-fidelity styling
- Lucide React icons
- Browser Pointer Events for gallery and viewer interactions
- Tailwind CSS/PostCSS tooling available in the project configuration
- Blender and Python tooling for offline turntable rendering and WebP optimization only

## Performance

Verified production-build assets:

| Asset | Size | Gzip |
| --- | ---: | ---: |
| Main JavaScript | 263.27 kB | 81.40 kB |
| Main CSS | 88.52 kB | 17.30 kB |
| 360 viewer chunk | 11.27 kB | 4.61 kB |
| Gallery lightbox chunk | 3.66 kB | 1.56 kB |
| 72-frame 360 media | approximately 2.97 MiB | deferred until activation |

No Lighthouse score is claimed here. The important behavior is that the 360 media is deferred until a visitor explicitly opens the viewer.

## Responsive Experience

The experience adapts across desktop and mobile layouts. The gallery keeps the full hero photograph visible on narrow screens, supports mobile swipe navigation, and exposes a touch-scrollable thumbnail rail. The comparison interface retains its meaningful column structure through nested horizontal scrolling rather than compressing vehicle data into unreadable cards. Purchase information, media controls, and contact content stack for smaller viewports while retaining touch-friendly targets.

## Accessibility

The concept includes semantic heading structure, labelled buttons and links, dialog semantics, keyboard navigation, Escape-to-close behavior, focus trapping and restoration in dialogs, visible `:focus-visible` handling, and reduced-motion support. It is not presented as WCAG-certified.

## Project Structure

```text
src/
  components/
  config/
  lib/
  styles/

public/
  360/
    porsche-911-carrera-14036ac/
  assets/

tools/
  porsche360-render/

ASSET_NOTES.md
```

`tools/porsche360-render/input/` and `tools/porsche360-render/output/` are deliberately excluded from Git. They can contain the licensed source model, PNG masters, previews, and local render logs. The final optimized WebP turntable media in `public/360/porsche-911-carrera-14036ac/` is intended to be versioned.

## Local Development

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Deployment

This is a standard Vite static frontend and can be deployed to Vercel or another static host.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

No live URL is included yet.

## Assets and Licensing

See [ASSET_NOTES.md](./ASSET_NOTES.md) for the repository-level asset record, including publicly referenced ALBA vehicle photography, the independently rendered 360 demonstration media, the Blendkit model source record, comparison/inspection image references, and the CC0 Wikimedia UAE Dirham symbol.

The detailed 3D-source record is maintained in [tools/porsche360-render/asset-source.md](./tools/porsche360-render/asset-source.md). The original licensed `.blend` source asset is intentionally not included in this repository.

## Important Demo Limitations

This is a frontend concept. It intentionally does not include a dealership backend, checkout flow, real inventory management, authentication, or live financing. Comparison filters and selected calls to action are demonstration UI. Vehicle content is representative of the referenced public listing and should not be interpreted as a live inventory feed.
