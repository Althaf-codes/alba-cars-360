import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { KeyboardEvent } from 'react'
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, CarFront, Check,
  ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Fuel, Gauge, Heart,
  MapPin, Menu, MessageCircle, Phone, ShieldCheck, SlidersHorizontal, Sparkles, Baby, Camera, CircleParking, KeyRound, Navigation, Radio, ScanLine, Settings2, Smartphone,
  X,
} from 'lucide-react'
import { porsche911Carrera, type Vehicle } from './vehicle'
import { AlbaDetailSections, AlbaFooter, AlbaPostDetailSections } from './components/alba-replica/AlbaVehicleSections'
import { VEHICLE_SECTION_VARIANT } from './config/uiVariant'
import AlbaPurchasePanel from './components/alba-replica/AlbaPurchasePanel'

const Vehicle360Dialog = lazy(() => import('./components/Vehicle360Dialog'))
const GalleryLightbox = lazy(() => import('./components/GalleryLightbox'))

const formatMoney = (value: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value)
const formatMileage = (value: number) => new Intl.NumberFormat('en-AE').format(value)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function App() { return <VehicleDetail vehicle={porsche911Carrera} /> }
export default App

class ViewerBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="viewer-fallback" role="dialog" aria-modal="true" aria-label="Exterior 360 degree view unavailable"><p>360° view is currently unavailable.</p><button onClick={this.props.onClose}>Return to gallery</button></div>
    return this.props.children
  }
}

function VehicleDetail({ vehicle }: { vehicle: Vehicle }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main .section, main .fact-strip, main .editorial'))
    if (!('IntersectionObserver' in window)) { sections.forEach(section => section.classList.add('reveal', 'is-visible')); return }
    sections.forEach(section => section.classList.add('reveal'))
    const observer = new IntersectionObserver((entries) => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: 0.08, rootMargin: '0px 0px -42px' })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])
  return <>
    <Header open={mobileMenu} onOpenChange={setMobileMenu} />
    {VEHICLE_SECTION_VARIANT === 'alba' ? <>
      <main><div className="shell alba-detail-two-column-region"><div className="alba-purchase-content"><Breadcrumbs vehicle={vehicle} /><Hero vehicle={vehicle} /><AlbaDetailSections vehicle={vehicle}/></div><AlbaPurchasePanel vehicle={vehicle}/></div><div className="shell alba-post-detail"><AlbaPostDetailSections vehicle={vehicle}/></div></main>
      <a className="alba-whatsapp" href={`https://wa.me/${vehicle.contact.phone.replace(/\D/g, '')}`} aria-label="Chat on WhatsApp"><Phone/></a><AlbaFooter vehicle={vehicle}/>
    </> : <>
    <main><div className="shell">
        <Breadcrumbs vehicle={vehicle} />
        <Hero vehicle={vehicle} />
        <FactStrip vehicle={vehicle} />
      </div>
      <>
        <div className="shell"><Overview vehicle={vehicle} /></div>
        <EditorialGallery vehicle={vehicle} />
        <div className="shell">
          <VehicleStory vehicle={vehicle} />
          <Inspection vehicle={vehicle} />
          <FinancePlanner vehicle={vehicle} />
          <SimilarVehicles vehicle={vehicle} />
          <Faq />
          <Contact vehicle={vehicle} />
        </div>
      </>
    </main><StickyActions vehicle={vehicle} /><Footer />
    </>}
  </>
}

function Header({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  return <header className="site-header">
    <div className="shell nav-wrap">
      <a className="brand" href="#top" aria-label="ALBA CARS concept home"><span className="crest">A</span><span>ALBA<small>CARS</small></span></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#hero">Buy</a><a href="#inspection">Sell</a><a href="#finance">Finance</a><a href="#contact">Visit showroom</a></nav>
      <div className="header-tools"><button className="language">EN <ChevronDown size={14}/></button><button className="icon-button menu" onClick={() => onOpenChange(!open)} aria-expanded={open} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button></div>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation"><a href="#hero">Buy a car</a><a href="#finance">Finance</a><a href="#inspection">Our inspection</a><a href="#contact">Contact ALBA</a></nav>}
  </header>
}

function Breadcrumbs({ vehicle }: { vehicle: Vehicle }) { return <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="#top">Home</a><span>/</span><a href="#similar">Buy Used Cars</a><span>/</span><b>{vehicle.make} {vehicle.model}</b></nav> }

function Hero({ vehicle }: { vehicle: Vehicle }) { return <section id="hero" className={`hero ${VEHICLE_SECTION_VARIANT === 'alba' ? 'alba-media-hero' : ''}`}><Gallery vehicle={vehicle}/>{VEHICLE_SECTION_VARIANT === 'concept' && <PurchaseSummary vehicle={vehicle}/>}</section> }

function Gallery({ vehicle }: { vehicle: Vehicle }) {
  const [current, setCurrent] = useState(0); const [viewerOpen, setViewerOpen] = useState(false); const [lightboxOpen, setLightboxOpen] = useState(false); const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null); const suppressLightboxOpen = useRef(false); const openedLightboxWithKeyboard = useRef(false); const thumbnailButtons = useRef<Array<HTMLButtonElement | null>>([]); const viewerTrigger = useRef<HTMLButtonElement>(null); const lightboxTrigger = useRef<HTMLButtonElement>(null)
  const previous = () => setCurrent((value) => (value + vehicle.gallery.length - 1) % vehicle.gallery.length)
  const next = () => setCurrent((value) => (value + 1) % vehicle.gallery.length)
  const select = (index: number) => setCurrent(index)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'ArrowLeft') previous(); if (event.key === 'ArrowRight') next() }
  useEffect(() => { const active = thumbnailButtons.current[current]; if (!active) return; const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; active.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' }) }, [current])
  return <section className="gallery" aria-label="Vehicle photos" tabIndex={0} onKeyDown={onKeyDown}>
    <div className="gallery-main" onPointerDown={(event) => { if (event.button !== 0 || (event.target as HTMLElement).closest('button:not(.gallery-open)')) return; gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId }; suppressLightboxOpen.current = false }} onPointerMove={(event) => { const start = gesture.current; if (!start || start.pointerId !== event.pointerId) return; const horizontal = event.clientX - start.x; const vertical = event.clientY - start.y; if (Math.abs(horizontal) > 35 && Math.abs(horizontal) > Math.abs(vertical)) { suppressLightboxOpen.current = true; if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId) } }} onPointerUp={(event) => { const start = gesture.current; if (!start || start.pointerId !== event.pointerId) return; const horizontal = event.clientX - start.x; const vertical = event.clientY - start.y; if (Math.abs(horizontal) > 35 && Math.abs(horizontal) > Math.abs(vertical)) { if (horizontal > 0) previous(); else next() } gesture.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }} onPointerCancel={() => { gesture.current = null }}>
      {vehicle.gallery.map((photo, index) => <img key={photo.src} className={index === current ? 'active' : ''} src={photo.src} alt={photo.alt} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} />)}
      <button ref={lightboxTrigger} className="gallery-open" onClick={(event) => { if (suppressLightboxOpen.current) { suppressLightboxOpen.current = false; return } openedLightboxWithKeyboard.current = event.detail === 0; setLightboxOpen(true) }} aria-label={`Open ${vehicle.gallery[current].position} photo fullscreen`}/>
      <div className="gallery-top"><span className="photo-counter">{String(current + 1).padStart(2, '0')} <i/> {String(vehicle.gallery.length).padStart(2, '0')}</span>{vehicle.exterior360?.enabled && <button ref={viewerTrigger} className="viewer-entry" onClick={() => setViewerOpen(true)} aria-label="Explore in 360 degrees"><Sparkles size={16}/><span>Explore in 360°</span></button>}</div>
      <div className="gallery-controls"><button onClick={previous} aria-label="Previous image"><ChevronLeft/></button><button onClick={next} aria-label="Next image"><ChevronRight/></button></div>
      <p className="swipe-hint">Swipe or use arrow keys to explore</p>
    </div>
    <div className="thumbnails" aria-label="Select a vehicle photo">{vehicle.gallery.map((photo, index) => <button ref={(node) => { thumbnailButtons.current[index] = node }} key={photo.src} className={index === current ? 'selected' : ''} onClick={() => select(index)} aria-label={`Show ${photo.position}`} aria-current={index === current ? 'true' : undefined}><img src={photo.src} alt="" loading="lazy"/></button>)}</div>
    {viewerOpen && vehicle.exterior360 && <ViewerBoundary onClose={() => setViewerOpen(false)}><Suspense fallback={<div className="viewer-fallback" role="status">Preparing 360° view</div>}><Vehicle360Dialog vehicle={vehicle} media={vehicle.exterior360} trigger={viewerTrigger.current} onClose={() => setViewerOpen(false)}/></Suspense></ViewerBoundary>}
    {lightboxOpen && <Suspense fallback={null}><GalleryLightbox images={vehicle.gallery} initialIndex={current} trigger={lightboxTrigger.current} restoreFocus={openedLightboxWithKeyboard.current} onClose={() => setLightboxOpen(false)}/></Suspense>}
  </section>
}

function PurchaseSummary({ vehicle }: { vehicle: Vehicle }) { return <aside className="purchase-summary">
  <div className="availability"><span/><b>{vehicle.availability}</b><em>{vehicle.viewerCount} people viewing</em></div>
  <p className="eyebrow">{vehicle.year} · {vehicle.bodyStyle}</p><h1>{vehicle.make} {vehicle.model}<span>{vehicle.variant}</span></h1><p className="stock">Stock no. {vehicle.stockNumber}</p>
  <div className="price"><small>Full price</small><strong>{vehicle.currency} {formatMoney(vehicle.price)}</strong><span>{vehicle.vatLabel}</span></div>
  <div className="monthly"><CircleDollarSign size={19}/><span>From <b>{vehicle.currency} {formatMoney(vehicle.monthlyPrice)}<small>/month</small></b></span></div>
  <div className="trust-pills"><span><ShieldCheck size={16}/> 1-year warranty</span><span><BadgeCheck size={16}/> Inspected</span></div>
  <div className="actions"><a className="button primary" href="#contact">Book a free test drive <ArrowUpRight size={18}/></a><div><a className="button secondary" href={`tel:${vehicle.contact.phone.replaceAll(' ', '')}`}><Phone size={17}/> Call us</a><button className="button quiet" type="button"><Heart size={18}/> Save</button></div></div>
</aside> }

function FactStrip({ vehicle }: { vehicle: Vehicle }) { const facts: [typeof CalendarDays, string, string][] = [[CalendarDays, 'Year', String(vehicle.year)], [Gauge, 'Mileage', `${formatMileage(vehicle.mileage)} km`], [SlidersHorizontal, 'Transmission', vehicle.transmission], [Fuel, 'Fuel', vehicle.fuelType], [MapPin, 'Specification', vehicle.specification], [ShieldCheck, 'Warranty', vehicle.warranty]]; return <section className="fact-strip" aria-label="Vehicle highlights">{facts.map(([Glyph, label, value]) => <div key={label}><Glyph size={20}/><span>{label}</span><b>{value}</b></div>)}</section> }

function Overview({ vehicle }: { vehicle: Vehicle }) {
  const stageRef = useRef<HTMLElement>(null)
  useEffect(() => { const stage = stageRef.current; if (!stage || window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches) return; let raf = 0; const update = () => { raf = 0; const bounds = stage.getBoundingClientRect(); const travel = Math.max(1, stage.offsetHeight - innerHeight); const progress = clamp((-bounds.top) / travel, 0, 1); stage.style.setProperty('--information-progress', progress.toFixed(3)) }; const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }; update(); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) } }, [])
  const specs: [string, string | undefined, typeof Settings2][] = [['Engine', vehicle.engine, Settings2], ['Cylinders', vehicle.cylinders?.toString(), Gauge], ['Transmission', vehicle.transmission, SlidersHorizontal], ['Fuel type', vehicle.fuelType, Fuel], ['Specification', vehicle.specification, MapPin], ['Service contract', vehicle.serviceContract, ShieldCheck]]
  const featureIcons: Record<string, typeof Check> = { ISOFIX: Baby, 'Parking Sensors': CircleParking, Navigation, 'Keyless Start': KeyRound, 'Blind Spot Indicator': ScanLine, 'Android Auto': Smartphone, 'Keyless Entry': KeyRound, '360 Camera': Radio, 'Rear Camera': Camera }
  return <section ref={stageRef} className="information-scroll section"><div className="overview information-sticky"><div className="features information-features"><p className="section-kicker">KEY FEATURES</p><h3>Built for the better drive.</h3><div className="feature-grid">{vehicle.features.slice(0, 12).map(feature => { const Icon = featureIcons[feature] ?? Check; return <span key={feature}><Icon size={16}/>{feature}</span> })}</div><button className="text-button">All {vehicle.features.length} features <ArrowRight size={16}/></button></div><div className="information-essentials"><p className="section-kicker">THE ESSENTIALS</p><h2>Everything you need,<br/>at a glance.</h2><p className="lede">A clean, complete snapshot of the details that matter before you step inside.</p><dl className="spec-list">{specs.map(([label, value, Icon]) => <div key={label}><dt><Icon size={15}/>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl></div></div></section>
}

function EditorialGallery({ vehicle }: { vehicle: Vehicle }) { return <section className="editorial"><div className="shell editorial-grid"><div className="editorial-copy"><p className="section-kicker">DESIGNED TO TURN HEADS</p><h2>Every angle has a point of view.</h2><p>The lines, proportions and details of this {vehicle.make} {vehicle.model} deserve a closer look.</p></div><figure className="editorial-large"><img src={vehicle.gallery[2].src} alt={vehicle.gallery[2].alt} loading="lazy"/></figure><figure className="editorial-small"><img src={vehicle.gallery[4].src} alt={vehicle.gallery[4].alt} loading="lazy"/></figure></div></section> }

function VehicleStory({ vehicle }: { vehicle: Vehicle }) { return <section className="story section"><div><p className="section-kicker">ABOUT THIS VEHICLE</p><h2>Ready for the next chapter.</h2></div><div>{vehicle.description.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<span className="reference">REF: {vehicle.stockNumber}</span></div></section> }

function Inspection({ vehicle }: { vehicle: Vehicle }) { return <section id="inspection" className="inspection section"><div className="inspection-graphic"><div className="inspection-car"><CarFront size={82}/></div><span className="ring ring-one"/><span className="ring ring-two"/></div><div className="inspection-content"><p className="section-kicker">OWN WITH CONFIDENCE</p><h2>Care that goes deeper than a quick look.</h2><p>{vehicle.inspection.message}</p><div className="inspection-checks">{vehicle.inspection.categories.map((item, index) => <span key={item}><b>0{index + 1}</b>{item}<Check size={16}/></span>)}</div><button className="text-button">{vehicle.inspection.reportLabel} <ArrowUpRight size={16}/></button></div></section> }

function FinancePlanner({ vehicle }: { vehicle: Vehicle }) {
  const [deposit, setDeposit] = useState(0); const [years, setYears] = useState(vehicle.finance.defaultTenure)
  const financed = Math.max(vehicle.price - deposit, 0); const monthlyRate = vehicle.finance.rate / 100 / 12; const months = years * 12
  const emi = useMemo(() => monthlyRate ? financed * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1) : financed / months, [financed, monthlyRate, months])
  const updateDeposit = (value: string) => setDeposit(Number(value))
  return <section id="finance" className="finance section"><div className="finance-intro"><p className="section-kicker">PLAN YOUR PURCHASE</p><h2>A clearer route to your next car.</h2><p>Adjust your down payment and preferred term. Your estimate updates instantly.</p><span className="concept-note">Illustrative concept estimate at {vehicle.finance.rate}% p.a.; not a finance offer or approval.</span></div><div className="finance-card"><label htmlFor="deposit">Down payment <b>{vehicle.currency} {formatMoney(deposit)}</b></label><input id="deposit" type="range" min="0" max={Math.round(vehicle.price * .5)} step="1000" value={deposit} onChange={e => updateDeposit(e.target.value)} onInput={e => updateDeposit(e.currentTarget.value)}/><div className="range-labels"><span>AED 0</span><span>AED {formatMoney(Math.round(vehicle.price * .5))}</span></div><div className="tenure"><span>Loan term</span><div>{Array.from({ length: vehicle.finance.maxTenure }, (_, index) => index + 1).map(year => <button className={year === years ? 'active' : ''} key={year} onClick={() => setYears(year)}>{year}<small>yr</small></button>)}</div></div><div className="finance-result"><span>Indicative monthly payment</span><strong>{vehicle.currency} {formatMoney(Math.round(emi))}<small>/month</small></strong><div><span>Financed <b>AED {formatMoney(financed)}</b></span><span>Term <b>{years} years</b></span></div></div></div></section>
}

function SimilarVehicles({ vehicle }: { vehicle: Vehicle }) { return <section id="similar" className="similar section"><div className="section-head"><div><p className="section-kicker">KEEP EXPLORING</p><h2>Similar vehicles, thoughtfully selected.</h2></div><button className="text-button">Browse all cars <ArrowRight size={16}/></button></div><div className="vehicle-cards">{vehicle.similarVehicles.map(car => <article className="vehicle-card" key={car.name}><img src={car.image} alt={`${car.name}, vehicle exterior`} loading="lazy"/><div><p>{car.year} · {formatMileage(car.mileage)} km</p><h3>{car.name}</h3><strong>AED {formatMoney(car.price)}</strong><span>From AED {formatMoney(car.monthly)}/month</span><button>View vehicle <ArrowUpRight size={15}/></button></div></article>)}</div></section> }

const questions = [['Are ALBA vehicles inspected and certified?', 'Every vehicle is inspected and certified for quality and reliability before it is listed.'], ['Can I finance a used car?', 'This concept includes an indicative planner; an ALBA adviser can help explain available finance routes.'], ['Can I book a test drive?', 'Yes. Use the test-drive action to start a conversation with the showroom team.'], ['Can ALBA assist with delivery and paperwork?', 'The current service messaging describes support for documentation and delivery across the UAE.']]
function Faq() { const [open, setOpen] = useState(0); return <section className="faq section"><p className="section-kicker">QUESTIONS, ANSWERED</p><h2>Helpful before you decide.</h2><div>{questions.map(([q, a], index) => <article key={q}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>{q}<ChevronDown size={20}/></button>{open === index && <p>{a}</p>}</article>)}</div></section> }

function Contact({ vehicle }: { vehicle: Vehicle }) { return <section id="contact" className="contact section"><div><p className="section-kicker">SEE IT FOR YOURSELF</p><h2>Your next drive starts here.</h2><p>Visit our Dubai showroom or arrange a time that works for you.</p><a className="button primary" href={`tel:${vehicle.contact.phone.replaceAll(' ', '')}`}>Book a free test drive <ArrowUpRight size={18}/></a></div><div className="contact-details"><span><MapPin/> <b>ALBA CARS Dubai</b>{vehicle.contact.showroom}</span><span><Phone/> <b>{vehicle.contact.phone}</b>{vehicle.contact.hours}</span><a href={`https://wa.me/${vehicle.contact.phone.replace(/\D/g, '')}`}><MessageCircle/> Chat on WhatsApp <ArrowUpRight size={16}/></a></div></section> }

function StickyActions({ vehicle }: { vehicle: Vehicle }) { const [show, setShow] = useState(false); useEffect(() => { const listener = () => setShow(window.scrollY > 760); window.addEventListener('scroll', listener, { passive: true }); listener(); return () => window.removeEventListener('scroll', listener) }, []); return <div className={`sticky-actions ${show ? 'visible' : ''}`}><div><span>{vehicle.make} {vehicle.model} {vehicle.variant}</span><b>AED {formatMoney(vehicle.price)}</b></div><a className="button secondary" href={`tel:${vehicle.contact.phone.replaceAll(' ', '')}`}><Phone size={17}/><i>Call</i></a><a className="button primary" href="#contact">Book test drive <ArrowUpRight size={17}/></a></div> }

function Footer() { return <footer><div className="shell footer-grid"><a className="brand light" href="#top"><span className="crest">A</span><span>ALBA<small>CARS</small></span></a><p>Independent concept created for demonstration purposes. Not affiliated with ALBA CARS.</p><div><a href="#hero">Buy</a><a href="#finance">Finance</a><a href="#contact">Contact</a></div><span>© 2026 Concept study</span></div></footer> }
