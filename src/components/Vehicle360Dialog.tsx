import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'
import { ArrowLeft, ArrowRight, Rotate3D, RotateCcw, X } from 'lucide-react'
import type { Vehicle, Vehicle360Media } from '../vehicle'
import { resolveVehicle360Media } from '../lib/vehicle360DemoManifest'
import { getFrameStatus, loadFrameWithRetry, modulo, nearestFrameOrder, nearestReadyFrame, primeFrameUrls } from '../lib/vehicle360'

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
  const startupTimerRef = useRef<number | null>(null)
  const activeRef = useRef(true)
  const interactionReadyRef = useRef(false)
  const pendingFrameRef = useRef<string | null>(null)
  const [startupPreparing, setStartupPreparing] = useState(true)
  const [startupFading, setStartupFading] = useState(false)
  const [startupProgress, setStartupProgress] = useState({ normalReady: 0, normalFailed: 0 })
  const [interactionReady, setInteractionReady] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [startupWarning, setStartupWarning] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [displayedFrame, setDisplayedFrame] = useState(0)
  const allFrames = Object.values(resolved.framesByElevation).flat()
  const normalFrames = resolved.framesByElevation[resolved.defaultElevation]

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
    if (getFrameStatus(frames[target]) !== 'ready') return false
    azimuthRef.current = target; elevationRef.current = requestedElevation; imageRef.current.src = frames[target]; setDisplayedFrame(target)
    return true
  }

  const displayInitialFrame = () => {
    if (displayFrame(0, resolved.defaultElevation)) return true
    const nearby = nearestReadyFrame(0, normalFrames)
    return nearby === undefined ? false : displayFrame(nearby, resolved.defaultElevation)
  }

  const requestFrame = (requested: number, requestedElevation = elevationRef.current) => {
    if (!interactionReadyRef.current) return
    const frames = resolved.framesByElevation[requestedElevation]
    if (!frames) return
    const target = modulo(requested, frames.length)
    if (displayFrame(target, requestedElevation)) { setViewLoading(false); return }
    const sourceAzimuth = azimuthRef.current
    const sourceElevation = elevationRef.current
    const targetUrl = frames[target]
    pendingFrameRef.current = targetUrl
    setViewLoading(true)
    void loadFrameWithRetry(targetUrl, 1).then(() => {
      if (activeRef.current && pendingFrameRef.current === targetUrl && azimuthRef.current === sourceAzimuth && elevationRef.current === sourceElevation) displayFrame(target, requestedElevation)
    }).catch(() => {
      if (activeRef.current && pendingFrameRef.current === targetUrl) setStartupWarning(true)
    }).finally(() => {
      if (activeRef.current && pendingFrameRef.current === targetUrl) { pendingFrameRef.current = null; setViewLoading(false) }
    })
  }

  const requestElevation = (delta: number) => {
    if (!interactionReadyRef.current) return
    const current = resolved.elevations.findIndex(({ id }) => id === elevationRef.current); const next = clamp(current + delta, 0, resolved.elevations.length - 1)
    if (next === current) return
    requestFrame(azimuthRef.current, resolved.elevations[next].id)
  }
  const stepAzimuth = (delta: number) => requestFrame(azimuthRef.current + delta)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialogRef.current?.focus(); activeRef.current = true
    const normalOrder = nearestFrameOrder(0, media.azimuthFrameCount)
    const helperIndexes = [0, 1, media.azimuthFrameCount - 1]
    const otherElevations = resolved.elevations.filter(({ id }) => id !== resolved.defaultElevation)
    const helperFrames = otherElevations.flatMap(({ id }) => helperIndexes.map((index) => resolved.framesByElevation[id][index]))
    const criticalFrames = Array.from(new Set([...normalOrder.map((index) => normalFrames[index]), ...helperFrames]))
    const backgroundFrames = otherElevations.flatMap(({ id }) => normalOrder.filter((index) => !helperIndexes.includes(index)).map((index) => resolved.framesByElevation[id][index]))
    const updateStartupProgress = () => {
      const normalReady = normalFrames.filter((url) => getFrameStatus(url) === 'ready').length
      const normalFailed = normalFrames.filter((url) => getFrameStatus(url) === 'failed').length
      if (activeRef.current) setStartupProgress({ normalReady, normalFailed })
      return { normalReady, normalFailed }
    }
    const completeStartup = (normalReady: number, normalFailed: number) => {
      if (!activeRef.current || interactionReadyRef.current) return
      const minimumUsableNormalFrames = Math.max(1, normalFrames.length - 2)
      if (normalReady < minimumUsableNormalFrames) { setUnavailable(true); setStartupPreparing(false); return }
      displayInitialFrame()
      interactionReadyRef.current = true
      setInteractionReady(true)
      setStartupWarning(normalFailed > 0)
      setStartupFading(true)
      startupTimerRef.current = window.setTimeout(() => { if (activeRef.current) setStartupPreparing(false) }, 200)
      void primeFrameUrls(backgroundFrames, allFrames, () => undefined, () => activeRef.current)
    }
    const preloadStartup = async () => {
      updateStartupProgress()
      for (const url of criticalFrames) {
        if (!activeRef.current) return
        try { await loadFrameWithRetry(url, 1) } catch { /* terminal failure is reflected in progress */ }
        const { normalReady } = updateStartupProgress()
        if (url === normalFrames[0] && normalReady) displayInitialFrame()
      }
      const { normalReady, normalFailed } = updateStartupProgress()
      completeStartup(normalReady, normalFailed)
    }
    void preloadStartup()
    return () => {
      activeRef.current = false; interactionReadyRef.current = false; document.body.style.overflow = previousOverflow
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (startupTimerRef.current) window.clearTimeout(startupTimerRef.current)
      trigger?.focus()
    }
  // The manifest and dialog lifecycle intentionally define one viewer session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
    if (interactionReadyRef.current && event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); stepAzimuth(-1); return }
    if (interactionReadyRef.current && event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); stepAzimuth(1); return }
    if (interactionReadyRef.current && event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); requestElevation(1); return }
    if (interactionReadyRef.current && event.key === 'ArrowDown') { event.preventDefault(); event.stopPropagation(); requestElevation(-1); return }
    if (event.key !== 'Tab') return
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []); if (!nodes.length) return
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus() }
    else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus() }
  }

  const queueMove = () => {
    if (rafRef.current !== null || !interactionReadyRef.current) return
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

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!interactionReadyRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId); pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const gesture = gestureRef.current
    if (pointersRef.current.size === 1) { gesture.x = event.clientX; gesture.y = event.clientY; gesture.axis = ''; gesture.carryX = 0; gesture.carryY = 0 }
    if (pointersRef.current.size === 2) { const [first, second] = Array.from(pointersRef.current.values()); gesture.distance = Math.hypot(second.x - first.x, second.y - first.y) }
  }
  const onPointerMove = (event: PointerEvent<HTMLElement>) => { if (interactionReadyRef.current && pointersRef.current.has(event.pointerId)) { pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); queueMove() } }
  const onPointerEnd = (event: PointerEvent<HTMLElement>) => { pointersRef.current.delete(event.pointerId); try { event.currentTarget.releasePointerCapture(event.pointerId) } catch { /* already released */ } }
  const onWheel = (event: WheelEvent<HTMLElement>) => {
    if (!interactionReadyRef.current) return
    event.preventDefault(); const stage = stageRef.current?.getBoundingClientRect(); const gesture = gestureRef.current
    if (stage && imageRef.current) imageRef.current.style.transformOrigin = `${(event.clientX - stage.left) / stage.width * 100}% ${(event.clientY - stage.top) / stage.height * 100}%`
    gesture.zoom = clamp(gesture.zoom * (event.deltaY < 0 ? 1.12 : .89), 1, 2.8); applyTransform(); setZoomed(gesture.zoom > 1.01)
  }

  const loadingLabel = startupPreparing ? `Preparing 360° · ${startupProgress.normalReady}/${media.azimuthFrameCount}` : null

  return <div className="viewer-overlay" role="presentation"><div className="viewer-dialog" role="dialog" aria-modal="true" aria-label={viewerTitle} tabIndex={-1} ref={dialogRef} onKeyDown={onKeyDown}>
    <header className="viewer-header"><div><p>{vehicle.make} {vehicle.model} {vehicle.variant}</p><h2>{viewerTitle}</h2></div><button className="viewer-exit" onClick={onClose} aria-label="Exit exterior 360 degree view"><X size={20}/><span>Exit</span></button></header>
    <main className="viewer-stage" ref={stageRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onWheel={onWheel} onDoubleClick={() => { if (interactionReadyRef.current) resetView() }}><img ref={imageRef} src={resolved.poster} alt="Independently rendered Porsche exterior demonstration" draggable={false}/>{zoomed && <button className="viewer-reset" onClick={resetView} aria-label="Reset zoom and position"><RotateCcw size={16}/> Reset view</button>}{startupPreparing && <div className={`viewer-loader${startupFading ? ' is-fading' : ''}`} role="status" aria-label="Preparing 360 degree view"><span/><p>Preparing 360° view</p><small aria-hidden="true">{startupProgress.normalReady} / {media.azimuthFrameCount} views ready</small></div>}{viewLoading && interactionReady && <span className="viewer-view-loading" role="status">Loading view…</span>}{startupWarning && interactionReady && <span className="viewer-view-warning" role="status">Some views are unavailable.</span>}{unavailable && <div className="viewer-error"><strong>360° view is currently unavailable.</strong><span>Browse the normal photos instead.</span><button onClick={onClose}>Return to gallery</button></div>}</main>
    <footer className="viewer-footer"><span className="viewer-instruction"><ArrowLeft size={15}/><Rotate3D size={18}/><ArrowRight size={15}/><b className="desktop-copy">Drag to rotate · drag vertically to change view · scroll to zoom</b><b className="mobile-copy">Swipe to rotate · drag vertically to change view · pinch to zoom</b></span><span className="viewer-progress" aria-live={startupPreparing ? 'off' : 'polite'}>{loadingLabel ? <span>{loadingLabel}</span> : <i>{displayedFrame + 1} / {media.azimuthFrameCount}</i>}</span></footer>
  </div></div>
}
