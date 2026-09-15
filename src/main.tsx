import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers/AppProviders'
import '@/presentation/styles/global.css'
import '@/presentation/styles/support.css'
import '@/presentation/styles/dashboard.css'
import '@/presentation/styles/projects.css'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')!).render(<StrictMode><AppProviders><App /></AppProviders></StrictMode>)
