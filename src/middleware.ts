import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const { pathname } = req.nextUrl;

  // 공개 라우트: /invite/[token] (초대 수락 페이지)
  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  // (auth) 라우트: 비인증 사용자만 접근
  if (pathname.startsWith("/login") || pathname.startsWith("/invitation")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 인증 필요 라우트
  if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // (admin) 라우트: HR 또는 ADMIN 역할 필요
    if (pathname.startsWith("/admin")) {
      const roles = (token.roles as string[]) || [];
      const canAccessAdmin = roles.includes("HR") || roles.includes("ADMIN");
      if (!canAccessAdmin) {
        return NextResponse.redirect(new URL("/employee/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*", "/login", "/invitation/:path*", "/invite/:path*"],
};
