import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { notifyLeaveStatusChange } from "@/lib/leave-notifications";
import { calculateLeaveDays } from "@/lib/policy-engine";
import { z } from "zod";

const proxySchema = z.object({
  userId: z.string().min(1),
  leaveType: z.enum(["ANNUAL", "HALF_AM", "HALF_PM", "QUARTER", "SICK", "COMPENSATORY"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { user: admin, error, status } = await requireAdmin();
  if (!admin) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = proxySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { userId, leaveType, startDate, endDate, reason } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = calculateLeaveDays(leaveType, start, end);

  const balanceType = leaveType === "SICK" ? "SICK"
    : leaveType === "COMPENSATORY" ? "COMPENSATORY" : "ANNUAL";
  const year = start.getFullYear();

  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveType_year: { userId, leaveType: balanceType, year } },
  });

  if (!balance || balance.remainingDays < days) {
    return NextResponse.json({ error: "잔여일이 부족합니다" }, { status: 400 });
  }

  // Check auto_approve policy
  const autoApproveConfig = await prisma.policyConfig.findUnique({
    where: { key: "admin_proxy_leave.auto_approve" },
  });
  const autoApprove = autoApproveConfig ? Boolean(autoApproveConfig.value) : true;

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId,
      registeredById: admin.id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      isProxy: true,
      status: autoApprove ? "APPROVED" : "PENDING_L1",
    },
  });

  if (autoApprove) {
    await prisma.leaveBalance.update({
      where: { userId_leaveType_year: { userId, leaveType: balanceType, year } },
      data: { usedDays: { increment: days }, remainingDays: { decrement: days } },
    });
  }

  await logAudit({
    actorId: admin.id,
    action: "LEAVE_PROXY_CREATED",
    targetType: "LeaveRequest",
    targetId: leaveRequest.id,
    after: { userId, leaveType, days, isProxy: true, autoApprove },
  });

  if (autoApprove) {
    notifyLeaveStatusChange(leaveRequest.id, "APPROVED", admin.id).catch(console.error);
  }

  return NextResponse.json({ data: leaveRequest }, { status: 201 });
}
