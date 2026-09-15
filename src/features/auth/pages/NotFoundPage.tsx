import { Link } from 'react-router-dom'
export function NotFoundPage() { return <main className="status-page"><p className="overline">Error 404</p><h1>Página no encontrada</h1><p>La dirección solicitada no existe.</p><Link className="primary-link" to="/">Volver al inicio</Link></main> }
