import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { useAuth } from '@/features/auth/hooks/useAuth'
export function ProtectedRoute() { const auth = useAuth(); const location = useLocation(); if (auth.status === 'initializing') return <FullPageLoader/>; if (auth.status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname, sessionExpired: auth.sessionExpired }}/>; return <Outlet/> }
