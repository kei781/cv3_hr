import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { calculateLeaveDays } from "@/lib/policy-engine";
import { notifyLeaveStatusChange } from "@/lib/leave-notifications";
import { z } from "zod";

const createSchema = z.object({
  leaveType: z.enum(["ANNUAL", "HALF_AM", "HALF_PM", "QUARTER", "SICK", "COMPENSATORY"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
  l1ApproverId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = request.nextUrl.searchParams.get("status");

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId: user.id,
      ...(status && status !== "ALL" && { status: status as never }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      l1Approver: { select: { name: true } },
      l2Approver: { select: { name: true } },
      registeredBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ data: leaves });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { leaveType, startDate, endDate, reason, l1ApproverId } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = calculateLeaveDays(leaveType, start, end);

  // Determine balance type
  const balanceType = leaveType === "SICK" ? "SICK"
    : leaveType === "COMPENSATORY" ? "COMPENSATORY"
    : "ANNUAL";

  // Check remaining balance
  const year = start.getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: { userId_leaveType_year: { userId: user.id, leaveType: balanceType, year } },
  });

  if (!balance || balance.remainingDays < days) {
    return NextResponse.json({
      error: `잔여 ${balanceType === "ANNUAL" ? "연차" : balanceType === "SICK" ? "병가" : "보상휴가"}가 부족합니다 (잔여: ${balance?.remainingDays ?? 0}일, 신청: ${days}일)`,
    }, { status: 400 });
  }

  // Check duplicate dates
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: user.id,
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlap) {
    return NextResponse.json({ error: "해당 기간에 이미 승인된 휴가가 있습니다" }, { status: 400 });
  }

  // Determine status based on leave type
  const isSick = leaveType === "SICK";
  const newStatus = isSick ? "PENDING_L1" : "APPROVED";

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: user.id,
      registeredById: user.id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: newStatus,
      l1ApproverId: isSick ? l1ApproverId : undefined,
    },
  });

  // Auto-approve: deduct balance immediately
  if (newStatus === "APPROVED") {
    await prisma.leaveBalance.update({
      where: { userId_leaveType_year: { userId: user.id, leaveType: balanceType, year } },
      data: {
        usedDays: { increment: days },
        remainingDays: { decrement: days },
      },
    });
  }

  await logAudit({
    actorId: user.id,
    action: "LEAVE_REQUESTED",
    targetType: "LeaveRequest",
    targetId: leaveRequest.id,
    after: { leaveType, days, status: newStatus },
  });

  notifyLeaveStatusChange(leaveRequest.id, newStatus, user.id).catch(console.error);

  return NextResponse.json({ data: leaveRequest }, { status: 201 });
}
