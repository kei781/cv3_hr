import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mode } = await request.json();

  if (mode !== "employee" && mode !== "admin") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // admin 모드 전환은 HR 또는 ADMIN 역할 필요
  if (mode === "admin") {
    const roles = token.roles as string[];
    const canSwitchToAdmin = roles.includes("HR") || roles.includes("ADMIN");
    if (!canSwitchToAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // JWT 토큰의 currentMode를 업데이트하기 위해 세션 쿠키를 갱신해야 하지만,
  // NextAuth v4에서는 직접적인 토큰 수정이 어려우므로
  // 클라이언트 상태로 관리하고, API에서는 권한 검증만 수행
  return NextResponse.json({ success: true, mode });
}
