import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { sendInvitationEmail } from "@/lib/mailer";
import { z } from "zod";
import crypto from "crypto";

const createSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  name: z.string().min(1, "이름을 입력하세요"),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().min(1, "입사일을 입력하세요"),
  roles: z.array(z.enum(["EMPLOYEE", "TEAM_LEAD", "HR", "ADMIN"])).default(["EMPLOYEE"]),
});

export async function GET(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      invitedBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ data: invitations });
}

export async function POST(request: NextRequest) {
  const { user: actor, error, status } = await requireAdmin();
  if (!actor) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // 이미 존재하는 사용자 확인
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다" }, { status: 409 });
  }

  // 이미 대기 중인 초대 확인
  const existingInvite = await prisma.invitation.findFirst({
    where: { email: parsed.data.email, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "이미 대기 중인 초대가 있습니다" }, { status: 409 });
  }

  // 만료 시간 계산
  const expiryConfig = await prisma.policyConfig.findUnique({
    where: { key: "invitation.expiry_hours" },
  });
  const expiryHours = expiryConfig ? Number(expiryConfig.value) : 72;

  const token = crypto.randomUUID();

  const invitation = await prisma.invitation.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      departmentId: parsed.data.departmentId || null,
      teamId: parsed.data.teamId || null,
      hireDate: new Date(parsed.data.hireDate),
      roles: parsed.data.roles,
      token,
      invitedById: actor.id,
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    },
  });

  // 이메일 발송 (실패해도 초대 생성은 유지)
  try {
    await sendInvitationEmail(parsed.data.email, parsed.data.name, token);
  } catch (err) {
    console.error("[Invitation] Email send failed:", err);
  }

  await logAudit({
    actorId: actor.id,
    action: "INVITATION_CREATED",
    targetType: "Invitation",
    targetId: invitation.id,
    after: { email: parsed.data.email, name: parsed.data.name },
  });

  return NextResponse.json({ data: invitation }, { status: 201 });
}
