import type { Vehicle360Media } from '../vehicle'

export type ResolvedVehicle360Media = Omit<Vehicle360Media, 'defaultElevation'> & {
  defaultElevation: string
  poster: string
  framesByElevation: Record<string, string[]>
  totalFrameCount: number
}

// Development-only neutral vector turntable artwork. It is not derived from ALBA
// photography and must be replaced with approved, dedicated vehicle captures.
const createNeutralDemoFrame = (index: number, count: number) => {
  const angle = (index / count) * Math.PI * 2
  const width = 900
  const bodyWidth = 270 + Math.abs(Math.sin(angle)) * 220
  const front = Math.cos(angle)
  const shade = Math.round(30 + ((front + 1) / 2) * 38)
  const highlight = Math.round(105 + ((front + 1) / 2) * 45)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="560" viewBox="0 0 ${width} 560"><rect width="100%" height="100%" fill="#11181e"/><ellipse cx="450" cy="418" rx="${bodyWidth * .72}" ry="34" fill="#06090b" opacity=".72"/><g transform="translate(450 290)"><path d="M-${bodyWidth / 2} 64 Q-${bodyWidth / 2 - 22} -2 -${bodyWidth * .23} -48 L${bodyWidth * .22} -48 Q${bodyWidth / 2 - 12} -2 ${bodyWidth / 2} 64 Z" fill="rgb(${shade},${shade + 6},${shade + 10})" stroke="#d4dade" stroke-width="4"/><path d="M-${bodyWidth * .2} -43 L-${bodyWidth * .1} -102 L${bodyWidth * .17} -102 L${bodyWidth * .27} -43 Z" fill="#293944" stroke="#8e9ca6" stroke-width="3"/><path d="M-${bodyWidth * .41} 20 Q-${bodyWidth * .33} -1 -${bodyWidth * .24} 19" fill="none" stroke="#e9f0f2" stroke-width="8" stroke-linecap="round"/><path d="M${bodyWidth * .41} 20 Q${bodyWidth * .33} -1 ${bodyWidth * .24} 19" fill="none" stroke="#e9f0f2" stroke-width="8" stroke-linecap="round"/><circle cx="-${bodyWidth * .3}" cy="66" r="42" fill="#0c1216" stroke="#77858e" stroke-width="6"/><circle cx="${bodyWidth * .3}" cy="66" r="42" fill="#0c1216" stroke="#77858e" stroke-width="6"/><circle cx="-${bodyWidth * .3}" cy="66" r="18" fill="#${highlight.toString(16)}${(highlight + 6).toString(16)}${(highlight + 10).toString(16)}"/><circle cx="${bodyWidth * .3}" cy="66" r="18" fill="#${highlight.toString(16)}${(highlight + 6).toString(16)}${(highlight + 10).toString(16)}"/></g><text x="450" y="515" fill="#9aa7af" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" letter-spacing="2">NEUTRAL DEVELOPMENT SEQUENCE · REPLACE WITH APPROVED VEHICLE CAPTURE</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const flatFrames = (basePath: string, frameCount: number) => Array.from(
  { length: frameCount },
  (_, index) => `${basePath}/${String(index + 1).padStart(3, '0')}.webp`,
)

const manifests: Record<string, (media: Vehicle360Media) => Record<string, string[]>> = {
  // Production-ready local path convention. These files are intentionally not
  // bundled until approved, redistributable automotive turntable media is supplied.
  'approved-demo-car-24': (media) => ({ normal: flatFrames('/360/demo-car', media.azimuthFrameCount) }),
  'porsche-911-carrera-14036ac-multiaxis-24': (media) => Object.fromEntries(
    media.elevations.map(({ id }) => [id, flatFrames(`/360/porsche-911-carrera-14036ac/${id}`, media.azimuthFrameCount)]),
  ),
  // Development fallback only; never represents the listing vehicle.
  'neutral-development-sequence-24': (media) => ({ normal: Array.from({ length: media.azimuthFrameCount }, (_, index) => createNeutralDemoFrame(index, media.azimuthFrameCount)) }),
}

export const resolveVehicle360Media = (media: Vehicle360Media): ResolvedVehicle360Media => {
  const buildFrames = manifests[media.manifestId]
  if (!buildFrames) throw new Error(`No 360 manifest registered for ${media.manifestId}`)
  const framesByElevation = buildFrames(media)
  const defaultElevation = media.defaultElevation && framesByElevation[media.defaultElevation]
    ? media.defaultElevation
    : media.elevations.find(({ id }) => framesByElevation[id])?.id ?? Object.keys(framesByElevation)[0]
  if (!defaultElevation) throw new Error(`No 360 frames registered for ${media.manifestId}`)
  const totalFrameCount = Object.values(framesByElevation).reduce((total, frames) => total + frames.length, 0)
  return { ...media, defaultElevation, poster: framesByElevation[defaultElevation][0], framesByElevation, totalFrameCount }
}
