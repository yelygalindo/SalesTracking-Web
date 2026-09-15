import type { PropsWithChildren, ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'
export function PermissionGuard({ permission, fallback = null, children }: PropsWithChildren<{ permission: string; fallback?: ReactNode }>) { return usePermission(permission) ? children : fallback }
