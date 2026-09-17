'use client'

export const dynamic = 'force-dynamic'

import { LogIn, LogOut, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isUnauthorizedError, setIsUnauthorizedError] = useState(false)

  useEffect(() => {
    // Check for error parameters in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      setIsUnauthorizedError(errorParam === 'unauthorized')
    }

    const checkExistingSession = async () => {
      try {
        console.log('Login page: Checking for existing session...')
        
        // Check current session without forcing sign out
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Store current user info for display
          setCurrentUser(session.user)
          console.log('Login page: Active session detected for:', session.user.email)
        } else {
          console.log('Login page: No active session found')
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setCheckingSession(false)
      }
    }

    checkExistingSession()
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Get the current origin (works in browser)
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://hokkaido-eosin.vercel.app'
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${currentOrigin}/auth/callback?next=/urus`,
          scopes: 'openid email profile',
          queryParams: {
            // Force Google to show account selection dialog AND consent screen
            prompt: 'select_account consent',
            // Request offline access for refresh tokens
            access_type: 'offline',
          },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Login error:', error)
      alert('Ralat semasa log masuk. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutCurrentSession = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setCurrentUser(null)
      alert('Sesi aktif telah ditutup. Sila log masuk semula dengan emel yang betul.')
    } catch (error) {
      console.error('Logout error:', error)
      alert('Ralat semasa log keluar.')
    } finally {
      setLoading(false)
    }
  }

  const handleForceSessionReset = async () => {
    setLoading(true)
    try {
      // Clear Supabase session
      await supabase.auth.signOut()
      
      // Clear all browser storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Clear state
      setCurrentUser(null)
      
      alert('Sesi telah dibersihkan. Sila tekan Log Masuk semula.')
    } catch (error) {
      console.error('Error resetting session:', error)
      alert('Ralat semasa membersihkan sesi.')
    } finally {
      setLoading(false)
    }
  }

  const handleAccessDashboard = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/urus'
    }
  }

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-300 max-w-md w-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Menyemak sesi sedia ada...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-300 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <LogIn className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Log Masuk Pengurus</h1>
          <p className="text-gray-600">
            Akses dashboard pengurusan pesanan Hokkaido Cheese Tart
          </p>
        </div>

        {/* Display unauthorized error banner */}
        {isUnauthorizedError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Akses Ditolak</h3>
                <p className="text-sm text-red-700">
                  Akaun anda tidak mempunyai kebenaran untuk mengakses sistem pengurusan. Sila log keluar dan gunakan emel pentadbir/staf.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Display current session info if exists */}
        {currentUser && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-yellow-800">Sesi Aktif Dikesan</h3>
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Sedang Log Masuk
              </span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Emel: <strong>{currentUser.email}</strong>
            </p>
            
            {/* Main dashboard access button */}
            <button
              onClick={handleAccessDashboard}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Memproses...' : 'Masuk ke Dashboard Pengurusan (/urus)'}
            </button>

            <button
              onClick={handleLogoutCurrentSession}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4" />
              {loading ? 'Memproses...' : 'Log Keluar Sesi Ini'}
            </button>
            <p className="text-xs text-yellow-600 mt-3">
              Nota: Log keluar dahulu jika ingin menukar ke emel pengurus yang lain.
            </p>
          </div>
        )}

        {/* Permanent session reset button - always visible */}
        <div className="mb-6">
          <button
            onClick={handleForceSessionReset}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-red-300 hover:border-red-400 text-red-700 hover:text-red-800 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Memproses...' : 'Tukar Akaun / Padam Sesi Tersimpan'}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Klik butang ini jika Google tidak paparkan dialog pemilihan akaun di telefon.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-slate-900 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Memproses...' : (currentUser ? 'Log Masuk dengan Emel Lain' : 'Log Masuk dengan Google')}
          </button>

          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            <p>
              Hanya pengurus yang diberi kebenaran boleh log masuk.
              <br />
              Hubungi penyelia jika menghadapi masalah.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}