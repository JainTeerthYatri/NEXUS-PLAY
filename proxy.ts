import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // List of routes jo sirf authenticated users ke liye khulne chahiye
  const protectedRoutes = ['/dashboard', '/studio', '/mod', '/squads/create', '/lfg/create']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Agar user logged in nahi hai aur protected route par ja raha hai -> /auth/signup par bhej do
  if (isProtectedRoute && !user) {
    url.pathname = '/auth/signup'
    return NextResponse.redirect(url)
  }

  // Agar user pehle se logged in hai aur /auth/login ya /auth/signup kholne ki koshish kare -> dashboard par bhej do
  if ((pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) && user) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}