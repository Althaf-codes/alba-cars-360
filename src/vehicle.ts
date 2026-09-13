export type GalleryImage = { src: string; alt: string; position: string }
export type Vehicle360Media = {
  enabled: boolean
  azimuthFrameCount: number
  elevations: { id: string; label: string }[]
  defaultElevation?: string
  manifestId: string
  aspectRatio: number
  demo?: boolean
  label?: string
}

export type Vehicle = {
  id: string
  slug: string
  stockNumber: string
  make: string
  model: string
  variant: string
  bodyStyle: string
  year: number
  mileage: number
  currency: string
  price: number
  vatLabel: string
  monthlyPrice: number
  availability: string
  viewerCount?: number
  transmission: string
  fuelType: string
  specification: string
  engine?: string
  cylinders?: number
  range?: number
  warranty: string
  serviceContract: string
  gallery: GalleryImage[]
  exterior360?: Vehicle360Media
  features: string[]
  description: string[]
  inspection: { categories: string[]; message: string; reportLabel: string }
  finance: { rate: number; defaultTenure: number; maxTenure: number }
  similarVehicles: { name: string; year: number; mileage: number; price: number; monthly: number; image: string; warranty?: string; transmission?: string; engine?: string; fuelType?: string }[]
  contact: { phone: string; showroom: string; hours: string }
}

const porscheImage = (number: number) => `https://storage.albacars.ae/vehicles/drafts/1808/${number}.jpg?width=1440&quality=75&format=webp`

const demoFrameCount = 24

export const porsche911Carrera: Vehicle = {
  id: '1808', slug: '1808-porsche-carrera-911-carrera', stockNumber: '14036AC', make: 'Porsche', model: '911', variant: 'Carrera',
  bodyStyle: 'Coupe', year: 2025, mileage: 22_000, currency: 'AED', price: 550_999, vatLabel: 'Inclusive of VAT', monthlyPrice: 10_791,
  availability: 'Available now', viewerCount: 19, transmission: 'Automatic', fuelType: 'Petrol', specification: 'GCC Specs',
  engine: '3.0L', cylinders: 6, warranty: 'Until 01-Apr-2030', serviceContract: 'Paid add-on',
  gallery: [
    { src: porscheImage(1), alt: '2025 Porsche 911 Carrera front three-quarter view', position: 'Front three-quarter' },
    { src: porscheImage(2), alt: '2025 Porsche 911 Carrera front view', position: 'Front' },
    { src: porscheImage(3), alt: '2025 Porsche 911 Carrera side profile', position: 'Side profile' },
    { src: porscheImage(4), alt: '2025 Porsche 911 Carrera rear three-quarter view', position: 'Rear three-quarter' },
    { src: porscheImage(5), alt: '2025 Porsche 911 Carrera rear view', position: 'Rear' },
    { src: porscheImage(6), alt: '2025 Porsche 911 Carrera interior detail', position: 'Interior' },
    { src: porscheImage(7), alt: '2025 Porsche 911 Carrera cockpit detail', position: 'Cockpit' },
    { src: porscheImage(8), alt: '2025 Porsche 911 Carrera wheel detail', position: 'Wheel detail' },
  ],
  // These independently rendered frames are never used as normal-gallery photography.
  exterior360: { enabled: true, azimuthFrameCount: demoFrameCount, elevations: [{ id: 'low', label: 'Low view' }, { id: 'normal', label: 'Standard view' }, { id: 'high', label: 'Elevated view' }], defaultElevation: 'normal', manifestId: 'porsche-911-carrera-14036ac-multiaxis-24', aspectRatio: 1365 / 1024, demo: true, label: 'Interactive 360° demonstration' },
  features: ['ISOFIX', 'Parking Sensors', 'Navigation', 'Keyless Start', 'Blind Spot Indicator', 'Android Auto', 'Keyless Entry', '360 Camera', 'Rear Camera', 'Apple Car Play', 'Cruise Control', 'Leather Seats', 'Driving Modes', 'Electric Seats'],
  description: [
    'Step into the future of driving with this 2025 Porsche 911 Carrera. Finished in green and showing just over 22,000 km, it brings a near-new condition to one of Porsche’s most recognisable silhouettes.',
    'Its 379 BHP engine delivers the precise handling and confident acceleration expected of a 911 Carrera, with GCC specification for local ownership.',
    'This is an opportunity to experience Porsche’s legendary lineage through an inspected, transparent ALBA CARS buying journey.'
  ],
  inspection: { categories: ['Exterior', 'Engine', 'Electricals', 'Suspension'], message: 'Every vehicle is inspected when acquired, after refurbishment and again before delivery—so you can choose with clarity and drive away with confidence.', reportLabel: 'View inspection approach' },
  finance: { rate: 3.5, defaultTenure: 5, maxTenure: 5 },
  similarVehicles: [
    { name: 'Porsche 911 Carrera Cabriolet', year: 2022, mileage: 16_000, price: 479_999, monthly: 9_400, warranty: 'Until 15-Mar-2027', transmission: 'Automatic', engine: '3.0', fuelType: 'Petrol', image: 'https://storage.albacars.ae/vehicles/drafts/1229/1.jpg?width=800&quality=75&format=webp' },
    { name: 'Porsche 911 Carrera S Cabriolet', year: 2020, mileage: 61_000, price: 439_999, monthly: 8_617, image: 'https://storage.albacars.ae/vehicles/drafts/1150/1.jpg?width=800&quality=75&format=webp' },
  ],
  contact: { phone: '+971 4 377 2503', showroom: 'Showroom 17, 18 & 20, Al Asayel Street, Al Quoz Ind 1, Dubai', hours: 'Sun–Sat · 9:30 AM – 10 PM' },
}
