import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 1. Establish baseline security headers (Technical Safeguards)
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Retrieve authenticated session securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 3. Check suspension status in banned_users table safely
  if (user) {
    try {
      const { data: banCheck } = await supabase
        .from("banned_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (banCheck) {
        if (pathname !== "/banned") {
          url.pathname = "/banned";
          return NextResponse.redirect(url);
        }
      } else {
        if (pathname === "/banned") {
          url.pathname = "/dashboard";
          return NextResponse.redirect(url);
        }
      }
    } catch (err) {
      console.error("Session verification error:", err);
    }
  }

  // 4. Comprehensive list of protected routes
  const protectedRoutes = [
    "/dashboard",
    "/settings",
    "/studio",
    "/mod",
    "/mod/logs",
    "/squads/create",
    "/lfg/create",
    "/clips/upload",
  ];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // If unauthorized visitor requests a protected route -> redirect to signup
  if (isProtectedRoute && !user) {
    url.pathname = "/auth/signup";
    return NextResponse.redirect(url);
  }

  // If logged-in user navigates to auth pages -> redirect to dashboard
  if ((pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup")) && user) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};