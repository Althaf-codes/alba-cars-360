import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import { ArrowLeft, ArrowRight, Rotate3D, RotateCcw, X } from 'lucide-react'
import type { Vehicle, Vehicle360Media } from '../vehicle'
import { resolveVehicle360Media } from '../lib/vehicle360DemoManifest'
import { getFrameStatus, loadFrame, modulo, nearestFrameOrder, nearestReadyFrame, primeFrameUrls } from '../lib/vehicle360'

type Props = { vehicle: Vehicle; media: Vehicle360Media; trigger: HTMLElement | null; onClose: () => void }
type Point = { x: number; y: number }
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default function Vehicle360Dialog({ vehicle, media, trigger, onClose }: Props) {
  const resolved = resolveVehicle360Media(media)
  const viewerTitle = media.demo ? 'Interactive 360° exterior' : media.label ?? 'Exterior 360°'
  const dialogRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const azimuthRef = useRef(0)
  const elevationRef = useRef(resolved.defaultElevation)
  const pointersRef = useRef(new Map<number, Point>())
  const gestureRef = useRef({ x: 0, y: 0, carryX: 0, carryY: 0, axis: '' as '' | 'horizontal' | 'vertical', distance: 0, zoom: 1, panX: 0, panY: 0 })
  const rafRef = useRef<number | null>(null)
  const activeRef = useRef(true)
  const [progress, setProgress] = useState({ ready: 0, failed: 0 })
  const [interactive, setInteractive] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [displayedFrame, setDisplayedFrame] = useState(0)
  const allFrames = Object.values(resolved.framesByElevation).flat()
  const currentFrames = () => resolved.framesByElevation[elevationRef.current]
  const applyTransform = () => {
    const image = imageRef.current; const stage = stageRef.current; if (!image || !stage) return
    const gesture = gestureRef.current; const bounds = stage.getBoundingClientRect()
    const maxX = Math.max(0, bounds.width * (gesture.zoom - 1) * .42); const maxY = Math.max(0, bounds.height * (gesture.zoom - 1) * .34)
    gesture.panX = clamp(gesture.panX, -maxX, maxX); gesture.panY = clamp(gesture.panY, -maxY, maxY)
    image.style.transform = `translate3d(${gesture.panX}px, ${gesture.panY}px, 0) scale(${gesture.zoom})`
  }
  const resetView = () => { const gesture = gestureRef.current; gesture.zoom = 1; gesture.panX = 0; gesture.panY = 0; applyTransform(); setZoomed(false) }
  const displayFrame = (requested: number, requestedElevation = elevationRef.current) => {
    const frames = resolved.framesByElevation[requestedElevation]
    if (!frames || !imageRef.current) return false
    const target = modulo(requested, frames.length)
    const nearby = nearestReadyFrame(target, frames, 2)
    const currentUrl = currentFrames()[azimuthRef.current]
    const frame = nearby ?? (getFrameStatus(currentUrl) === 'ready' ? azimuthRef.current : nearestReadyFrame(target, frames))
    if (frame === undefined) return false
    azimuthRef.current = frame; elevationRef.current = requestedElevation; imageRef.current.src = frames[frame]; setDisplayedFrame(frame)
    return true
  }
  const requestElevation = (delta: number) => {
    const current = resolved.elevations.findIndex(({ id }) => id === elevationRef.current); const next = clamp(current + delta, 0, resolved.elevations.length - 1)
    if (next === current) return
    const id = resolved.elevations[next].id; const target = resolved.framesByElevation[id][azimuthRef.current]
    if (getFrameStatus(target) === 'ready') { displayFrame(azimuthRef.current, id); return }
    void loadFrame(target).then(() => displayFrame(azimuthRef.current, id)).catch(() => undefined)
  }
  const stepAzimuth = (delta: number) => displayFrame(azimuthRef.current + delta)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialogRef.current?.focus(); activeRef.current = true
    const initial = resolved.framesByElevation[resolved.defaultElevation][0]; const order = nearestFrameOrder(0, media.azimuthFrameCount)
    const otherElevations = resolved.elevations.filter(({ id }) => id !== resolved.defaultElevation)
    const priority = [...order.slice(0, 5).map((index) => resolved.framesByElevation[resolved.defaultElevation][index]), ...otherElevations.map(({ id }) => resolved.framesByElevation[id][0]), ...order.slice(5).map((index) => resolved.framesByElevation[resolved.defaultElevation][index]), ...otherElevations.flatMap(({ id }) => order.slice(1).map((index) => resolved.framesByElevation[id][index]))]
    void loadFrame(initial).then(() => { displayFrame(0); setInteractive(true) }).catch(() => undefined)
    void primeFrameUrls(priority, allFrames, (ready, failed) => { setProgress({ ready, failed }); if (ready && !interactive) { displayFrame(0); setInteractive(true) } }, () => activeRef.current)
    return () => { activeRef.current = false; document.body.style.overflow = previousOverflow; if (rafRef.current) cancelAnimationFrame(rafRef.current); trigger?.focus() }
  // The media manifest and dialog lifecycle intentionally define one viewer session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); stepAzimuth(-1); return }
    if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); stepAzimuth(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); requestElevation(1); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); requestElevation(-1); return }
    if (event.key !== 'Tab') return
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []); if (!nodes.length) return
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus() }
    else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus() }
  }
  const queueMove = () => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      const pointers = pointersRef.current; const gesture = gestureRef.current
      if (pointers.size >= 2) {
        const [first, second] = Array.from(pointers.values()); const distance = Math.hypot(second.x - first.x, second.y - first.y); const stage = stageRef.current?.getBoundingClientRect()
        if (stage && imageRef.current) imageRef.current.style.transformOrigin = `${((first.x + second.x) / 2 - stage.left) / stage.width * 100}% ${((first.y + second.y) / 2 - stage.top) / stage.height * 100}%`
        gesture.zoom = clamp(gesture.zoom * (distance / Math.max(gesture.distance, 1)), 1, 2.8); gesture.distance = distance; applyTransform(); setZoomed(gesture.zoom > 1.01)
      } else if (pointers.size === 1) {
        const point = Array.from(pointers.values())[0]; const dx = point.x - gesture.x; const dy = point.y - gesture.y; gesture.x = point.x; gesture.y = point.y
        if (gesture.zoom > 1.01) { gesture.panX += dx; gesture.panY += dy; applyTransform() }
        else {
          if (!gesture.axis && Math.hypot(dx, dy) > 7) gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'horizontal' : Math.abs(dy) > Math.abs(dx) * 1.25 ? 'vertical' : ''
          if (gesture.axis === 'horizontal') { gesture.carryX += dx; const step = Math.trunc(gesture.carryX / 18); if (step) { gesture.carryX -= step * 18; stepAzimuth(-step) } }
          if (gesture.axis === 'vertical') { gesture.carryY += dy; const step = Math.trunc(gesture.carryY / 56); if (step) { gesture.carryY -= step * 56; requestElevation(-step) } }
        }
      }
      rafRef.current = null
    })
  }
  const onPointerDown = (event: PointerEvent<HTMLElement>) => { if (!interactive) return; event.currentTarget.setPointerCapture(event.pointerId); pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const gesture = gestureRef.current; if (pointersRef.current.size === 1) { gesture.x = event.clientX; gesture.y = event.clientY; gesture.axis = ''; gesture.carryX = 0; gesture.carryY = 0 } if (pointersRef.current.size === 2) { const [first, second] = Array.from(pointersRef.current.values()); gesture.distance = Math.hypot(second.x - first.x, second.y - first.y) } }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => { if (pointersRef.current.has(event.pointerId)) { pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); queueMove() } }
  const onPointerEnd = (event: PointerEvent<HTMLElement>) => { pointersRef.current.delete(event.pointerId); try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ } }
  const onWheel = (event: WheelEvent<HTMLElement>) => { event.preventDefault(); const stage = stageRef.current?.getBoundingClientRect(); const gesture = gestureRef.current; if (stage && imageRef.current) imageRef.current.style.transformOrigin = `${(event.clientX - stage.left) / stage.width * 100}% ${(event.clientY - stage.top) / stage.height * 100}%`; gesture.zoom = clamp(gesture.zoom * (event.deltaY < 0 ? 1.12 : .89), 1, 2.8); applyTransform(); setZoomed(gesture.zoom > 1.01) }
  const unavailable = progress.failed > allFrames.length / 2 && progress.ready === 0
  const loadingLabel = !interactive ? `Loading 360° · ${progress.ready}/${allFrames.length}` : null

  return <div className="viewer-overlay" role="presentation"><div className="viewer-dialog" role="dialog" aria-modal="true" aria-label={viewerTitle} tabIndex={-1} ref={dialogRef} onKeyDown={onKeyDown}>
    <header className="viewer-header"><div><p>{vehicle.make} {vehicle.model} {vehicle.variant}</p><h2>{viewerTitle}</h2></div><button className="viewer-exit" onClick={onClose} aria-label="Exit exterior 360 degree view"><X size={20}/><span>Exit</span></button></header>
    <main className="viewer-stage" ref={stageRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onWheel={onWheel} onDoubleClick={resetView}><img ref={imageRef} src={resolved.poster} alt="Independently rendered Porsche exterior demonstration" draggable={false}/>{zoomed && <button className="viewer-reset" onClick={resetView} aria-label="Reset zoom and position"><RotateCcw size={16}/> Reset view</button>}{!interactive && <div className="viewer-loader"><span/><p>Preparing 360° view</p></div>}{unavailable && <div className="viewer-error"><strong>360° view is currently unavailable.</strong><span>Browse the normal photos instead.</span><button onClick={onClose}>Return to gallery</button></div>}</main>
    <footer className="viewer-footer"><span className="viewer-instruction"><ArrowLeft size={15}/><Rotate3D size={18}/><ArrowRight size={15}/><b className="desktop-copy">Drag to rotate · drag vertically to change view · scroll to zoom</b><b className="mobile-copy">Swipe to rotate · drag vertically to change view · pinch to zoom</b></span><span className="viewer-progress" aria-live="polite">{loadingLabel ? <span>{loadingLabel}</span> : <i>{displayedFrame + 1} / {media.azimuthFrameCount}</i>}</span></footer>
  </div></div>
}
