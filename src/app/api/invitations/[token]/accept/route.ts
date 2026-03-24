import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const acceptSchema = z.object({
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json({ error: "유효하지 않은 초대 링크입니다" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 초대입니다" }, { status: 400 });
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "초대가 만료되었습니다" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // 트랜잭션: 유저 생성 + 초대 상태 변경
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invitation.email,
        name: invitation.name,
        passwordHash,
        position: null,
        hireDate: invitation.hireDate,
        status: "ACTIVE",
        roles: invitation.roles,
        departmentId: invitation.departmentId,
        teamId: invitation.teamId,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
