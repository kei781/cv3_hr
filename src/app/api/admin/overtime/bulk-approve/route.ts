import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { loadPolicyValues, calculateCompensatoryDays } from "@/lib/policy-engine";
import { z } from "zod";

const bulkSchema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const policy = await loadPolicyValues();
  let approved = 0;

  for (const id of parsed.data.ids) {
    const ot = await prisma.overtimeRequest.findUnique({ where: { id } });
    if (!ot || ot.status !== "CANDIDATE") continue;

    const compDays = calculateCompensatoryDays(ot.overtimeHours, policy.overtimeCompensationRate);
    const year = ot.date.getFullYear();

    await prisma.overtimeRequest.update({
      where: { id },
      data: { status: "COMPENSATED", approvedById: user.id, approvedAt: new Date() },
    });

    await prisma.leaveBalance.upsert({
      where: { userId_leaveType_year: { userId: ot.userId, leaveType: "COMPENSATORY", year } },
      update: { grantedDays: { increment: compDays }, remainingDays: { increment: compDays } },
      create: {
        userId: ot.userId, leaveType: "COMPENSATORY", year,
        grantedDays: compDays, remainingDays: compDays, grantedReason: "OVERTIME",
      },
    });

    approved++;
  }

  await logAudit({
    actorId: user.id,
    action: "OVERTIME_BULK_APPROVED",
    targetType: "OvertimeRequest",
    targetId: "bulk",
    after: { count: approved },
  });

  return NextResponse.json({ data: { approved } });
}
