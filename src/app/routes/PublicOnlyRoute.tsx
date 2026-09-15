import { Navigate, Outlet } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { useAuth } from '@/features/auth/hooks/useAuth'
export function PublicOnlyRoute() { const auth = useAuth(); if (auth.status === 'initializing') return <FullPageLoader/>; return auth.status === 'authenticated' ? <Navigate to="/" replace/> : <Outlet/> }
