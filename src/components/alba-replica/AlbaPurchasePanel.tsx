import { Eye, Heart, Phone } from 'lucide-react'
import type { Vehicle } from '../../vehicle'
import { formatAlbaNumber } from './format'

function DirhamSymbol() { return <img className="alba-dirham-symbol" src="/assets/uae-dirham-symbol.svg" alt="" aria-hidden="true" /> }

export default function AlbaPurchasePanel({ vehicle }: { vehicle: Vehicle }) {
  return <div className="alba-purchase-rail">
    <aside className="alba-purchase-panel" aria-label={`${vehicle.make} ${vehicle.model} purchase details`}>
    <p className="alba-purchase-meta">{vehicle.year} · {vehicle.bodyStyle}</p>
    <h1>{vehicle.make} {vehicle.variant} <span>{vehicle.model}</span></h1>
    <p className="alba-purchase-stock">Stock no. {vehicle.stockNumber}</p>
    <div className="alba-purchase-pricing">
      <p className="alba-purchase-price"><DirhamSymbol/><span className="alba-visually-hidden">AED </span>{formatAlbaNumber(vehicle.price)}</p>
      <p className="alba-purchase-vat">{vehicle.vatLabel}</p>
      <div className="alba-purchase-monthly"><DirhamSymbol/><b><span className="alba-visually-hidden">AED </span>{formatAlbaNumber(vehicle.monthlyPrice)} <small>/Month</small></b></div>
    </div>
    <p className="alba-purchase-availability"><Eye aria-hidden="true"/><span>{vehicle.viewerCount ?? 0} People</span> are viewing right now</p>
    <a className="alba-purchase-primary" href="#contact">Book a free test drive</a>
    <div className="alba-purchase-actions"><a href={`tel:${vehicle.contact.phone.replaceAll(' ', '')}`}><Phone/>Call Us</a><button type="button"><Heart/>Buy this Car</button></div>
    </aside>
    <div className="alba-purchase-offer"><b>0%</b><span>Downpayment for all cars<br/><strong>1 Year free warranty</strong></span></div>
  </div>
}
