import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '@/features/auth/services/authService'
import { Brand } from '@/presentation/components/Brand'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { const response = await authService.forgotPassword(email); setMessage(response.message) } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible enviar la solicitud.') } finally { setBusy(false) } }
  return <main className="simple-auth-page"><section className="simple-auth-card"><Brand/><p className="overline">Recuperación de acceso</p><h1>Restablece tu contraseña</h1><p>Ingresa tu correo. Si está registrado, recibirás las instrucciones correspondientes.</p>{message ? <div className="success-message" role="status">{message}</div> : <form className="simple-form" onSubmit={submit}><label htmlFor="email">Correo electrónico</label><input id="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)}/>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar instrucciones'}</button></form>}<Link className="back-link" to="/login">Volver a iniciar sesión</Link></section></main>
}
