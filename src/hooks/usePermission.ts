import { useAuth } from '@/features/auth/hooks/useAuth'
export function usePermission(permission: string) { const { user } = useAuth(); return user?.permissions.some(value => value.toLowerCase() === permission.toLowerCase()) ?? false }
