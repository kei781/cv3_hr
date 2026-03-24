import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      expiresAt: true,
      departmentId: true,
      teamId: true,
      roles: true,
    },
  });

  if (!invitation) {
    return NextResponse.json({ error: "유효하지 않은 초대 링크입니다" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 초대입니다", status: invitation.status }, { status: 400 });
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "초대가 만료되었습니다" }, { status: 400 });
  }

  return NextResponse.json({ data: invitation });
}
