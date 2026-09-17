import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/urus'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    )

    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(new URL('/urus/login', requestUrl.origin))
    }

    // Check user role after session is established
    if (session?.user) {
      try {
        // Fetch user profile from user_profiles table
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        const userRole = profile?.role || 'user'
        const userEmail = session.user.email || ''

        // RBAC-based redirect
        if (userRole === 'admin' || userRole === 'staff') {
          // Admin/staff: proceed to /urus dashboard
          return NextResponse.redirect(new URL('/urus', requestUrl.origin))
        } else {
          // Regular user: redirect to home page
          console.log(`OAuth callback: User ${userEmail} with role '${userRole}' redirected to home`)
          return NextResponse.redirect(new URL('/', requestUrl.origin))
        }
      } catch (error) {
        console.error('Error fetching user profile in OAuth callback:', error)
        // Default fallback: redirect to /urus login
        return NextResponse.redirect(new URL('/urus/login', requestUrl.origin))
      }
    }
  }

  // Fallback redirect if no code or session
  return NextResponse.redirect(new URL('/urus/login', requestUrl.origin))
}