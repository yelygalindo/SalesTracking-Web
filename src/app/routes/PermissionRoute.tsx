import { Navigate, Outlet } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
export function PermissionRoute({ permission }: { permission: string }) { return usePermission(permission) ? <Outlet/> : <Navigate to="/unauthorized" replace/> }
