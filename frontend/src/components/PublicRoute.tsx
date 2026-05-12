import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen" />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
