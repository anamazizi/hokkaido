import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const pathname = req.nextUrl.pathname

    // Protect /urus routes - redirect to login if no session
    if (pathname.startsWith('/urus') && !session) {
      // If already on login page, do nothing
      if (pathname === '/urus/login') {
        return res
      }
      const redirectUrl = new URL('/urus/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists and user tries to access login page, redirect to dashboard
    if (session && pathname === '/urus/login') {
      const redirectUrl = new URL('/urus', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // RBAC: If session exists and user is accessing /urus (not login), check role
    if (session && pathname.startsWith('/urus') && pathname !== '/urus/login') {
      try {
        // Fetch user profile from user_profiles table
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        // If error fetching profile or profile not found, treat as 'user' role and BLOCK access
        const userRole = profile?.role || 'user'
        
        // STRICT ENFORCEMENT: Only 'staff' or 'admin' roles can proceed
        // If user has 'user' role or no valid role, redirect to home page IMMEDIATELY
        if (userRole !== 'staff' && userRole !== 'admin') {
          const redirectUrl = new URL('/', req.url)
          return NextResponse.redirect(redirectUrl)
        }
        
        // Allow 'staff' and 'admin' roles to proceed
      } catch (error) {
        console.error('Error fetching user profile in middleware:', error)
        // STRICT SECURITY: If any error occurs fetching profile, redirect to home
        // This prevents unauthorized access during service disruptions
        const redirectUrl = new URL('/', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    return res
  } catch (error) {
    // Graceful fallback to avoid 500 crash if any auth or middleware invocation fails
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/urus/:path*'],
}