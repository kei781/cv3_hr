import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { loadPolicyValues, calculateCompensatoryDays } from "@/lib/policy-engine";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await params;

  const ot = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!ot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ot.status !== "CANDIDATE") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  const policy = await loadPolicyValues();
  const compDays = calculateCompensatoryDays(ot.overtimeHours, policy.overtimeCompensationRate);
  const year = ot.date.getFullYear();

  // Update overtime status
  await prisma.overtimeRequest.update({
    where: { id },
    data: { status: "COMPENSATED", approvedById: user.id, approvedAt: new Date() },
  });

  // Upsert compensatory leave balance
  await prisma.leaveBalance.upsert({
    where: { userId_leaveType_year: { userId: ot.userId, leaveType: "COMPENSATORY", year } },
    update: {
      grantedDays: { increment: compDays },
      remainingDays: { increment: compDays },
    },
    create: {
      userId: ot.userId,
      leaveType: "COMPENSATORY",
      year,
      grantedDays: compDays,
      remainingDays: compDays,
      grantedReason: "OVERTIME",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "OVERTIME_APPROVED",
    targetType: "OvertimeRequest",
    targetId: id,
    after: { overtimeHours: ot.overtimeHours, compensatoryDays: compDays },
  });

  return NextResponse.json({ data: { compensatoryDays: compDays } });
}
