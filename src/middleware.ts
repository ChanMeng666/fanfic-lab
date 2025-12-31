import { stackServerApp } from "@/lib/stack";
import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/wizard", "/editor", "/profile"];

// Routes that should redirect authenticated users (Stack Auth handler pages)
const authRoutes = ["/handler/sign-in", "/handler/sign-up"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for handler routes (let Stack Auth handle them)
  if (pathname.startsWith("/handler")) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const user = await stackServerApp.getUser();

  // Protect authenticated routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!user) {
      const signInUrl = new URL("/handler/sign-in", request.url);
      signInUrl.searchParams.set("after_auth_return_to", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
