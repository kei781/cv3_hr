import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const adjustSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "COMPENSATORY"]),
  year: z.number().int().positive(),
  adjustment: z.number(), // positive = increase, negative = decrease
  reason: z.string().min(1, "사유를 입력하세요"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user: admin, error, status } = await requireAdmin();
  if (!admin) return NextResponse.json({ error }, { status });

  const { userId } = await params;
  const body = await request.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { leaveType, year, adjustment, reason } = parsed.data;

  const balance = await prisma.leaveBalance.upsert({
    where: { userId_leaveType_year: { userId, leaveType, year } },
    update: {
      grantedDays: { increment: adjustment },
      remainingDays: { increment: adjustment },
      adjustedById: admin.id,
      grantedReason: "MANUAL",
    },
    create: {
      userId,
      leaveType,
      year,
      grantedDays: Math.max(0, adjustment),
      remainingDays: Math.max(0, adjustment),
      grantedReason: "MANUAL",
      adjustedById: admin.id,
    },
  });

  await logAudit({
    actorId: admin.id,
    action: "BALANCE_ADJUSTED",
    targetType: "LeaveBalance",
    targetId: balance.id,
    after: { leaveType, year, adjustment, reason },
  });

  return NextResponse.json({ data: balance });
}
