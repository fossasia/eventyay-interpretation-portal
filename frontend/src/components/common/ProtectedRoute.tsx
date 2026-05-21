import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="loading-spinner">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
