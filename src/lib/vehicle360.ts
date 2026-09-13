type FrameStatus = 'idle' | 'loading' | 'ready' | 'failed'
type FrameEntry = { image?: HTMLImageElement; status: FrameStatus }

const sessionFrames = new Map<string, FrameEntry>()

const frameKey = (url: string) => url
const modulo = (value: number, length: number) => ((value % length) + length) % length

export const nearestFrameOrder = (start: number, count: number) => {
  const order = [start]
  for (let offset = 1; order.length < count; offset += 1) {
    order.push(modulo(start + offset, count))
    if (order.length < count) order.push(modulo(start - offset, count))
  }
  return order
}

export const getFrameStatus = (url: string) => sessionFrames.get(frameKey(url))?.status ?? 'idle'

export const loadFrame = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const existing = sessionFrames.get(frameKey(url))
  if (existing?.status === 'ready' && existing.image) { resolve(existing.image); return }
  if (existing?.status === 'loading') {
    const probe = () => {
      const entry = sessionFrames.get(frameKey(url))
      if (entry?.status === 'ready' && entry.image) resolve(entry.image)
      else if (entry?.status === 'failed') reject(new Error('Frame unavailable'))
      else window.setTimeout(probe, 24)
    }
    probe(); return
  }
  const image = new Image()
  sessionFrames.set(frameKey(url), { image, status: 'loading' })
  image.onload = async () => {
    try { if ('decode' in image) await image.decode() } catch { /* decoded browser image is still usable */ }
    sessionFrames.set(frameKey(url), { image, status: 'ready' })
    resolve(image)
  }
  image.onerror = () => { sessionFrames.set(frameKey(url), { status: 'failed' }); reject(new Error('Frame unavailable')) }
  image.src = url
})

export const loadFrameWithRetry = async (url: string, retries = 1) => {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await loadFrame(url) } catch (error) { lastError = error }
  }
  throw lastError instanceof Error ? lastError : new Error('Frame unavailable')
}

export const nearestReadyFrame = (requested: number, frames: string[], radius = frames.length) => {
  const limit = Math.min(frames.length, radius * 2 + 1)
  for (const frame of nearestFrameOrder(requested, frames.length).slice(0, limit)) {
    const url = frames[frame]
    if (getFrameStatus(url) === 'ready') return frame
  }
  return undefined
}

export const primeFrameUrls = async (
  urls: string[],
  allUrls: string[],
  onProgress: (ready: number, failed: number) => void,
  isActive: () => boolean,
) => {
  let ready = allUrls.filter((url) => getFrameStatus(url) === 'ready').length
  let failed = allUrls.filter((url) => getFrameStatus(url) === 'failed').length
  onProgress(ready, failed)
  for (const url of urls) {
    if (!isActive() || getFrameStatus(url) !== 'idle') continue
    try { await loadFrame(url) } catch { /* failures are reflected in the cache */ }
    ready = allUrls.filter((item) => getFrameStatus(item) === 'ready').length
    failed = allUrls.filter((item) => getFrameStatus(item) === 'failed').length
    onProgress(ready, failed)
  }
}

export { modulo }
