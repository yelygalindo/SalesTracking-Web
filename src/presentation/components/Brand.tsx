import { MapPinned } from 'lucide-react'
export function Brand({ inverse = false }: { inverse?: boolean }) { return <div className="brand"><div className="brand-logo"><MapPinned size={21}/></div><div><div className={inverse ? 'brand-name inverse' : 'brand-name'}><span>Urban</span><b>Track</b></div><small>CRM WEB</small></div></div> }
