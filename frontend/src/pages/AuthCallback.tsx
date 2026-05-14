import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { Sparkles } from 'lucide-react'

let hasShownNotification = false

export default function AuthCallback() {
  const navigate = useNavigate()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const handle = async () => {
      // Supabase can return errors in either the hash fragment or query string
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)
      const errorParam = hashParams.get('error') || queryParams.get('error')
      const errorDescription =
        hashParams.get('error_description') ||
        queryParams.get('error_description') ||
        'Authentication failed'

      if (errorParam) {
        if (!hasShownNotification) {
          hasShownNotification = true
          toast.error(errorDescription)
          setTimeout(() => { hasShownNotification = false }, 3000)
        }
        navigate('/login')
        return
      }

      await new Promise((r) => setTimeout(r, 100))
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        if (!hasShownNotification) {
          hasShownNotification = true
          toast.error(error?.message || 'Authentication failed')
          setTimeout(() => { hasShownNotification = false }, 3000)
        }
        navigate('/login')
        return
      }

      if (!hasShownNotification) {
        hasShownNotification = true
        toast.success('Signed in successfully!')
        setTimeout(() => { hasShownNotification = false }, 3000)
      }
      navigate('/dashboard')
    }

    handle()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-brand-violet flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <p className="text-gray-500 text-sm">Completing sign in…</p>
      </div>
    </div>
  )
}
