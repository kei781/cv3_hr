import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { leaveId } = await params;

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.status !== "PENDING_L2") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  // Determine balance type
  const balanceType = leave.leaveType === "SICK" ? "SICK"
    : leave.leaveType === "COMPENSATORY" ? "COMPENSATORY"
    : "ANNUAL";

  const year = leave.startDate.getFullYear();

  // Deduct balance
  await prisma.leaveBalance.update({
    where: { userId_leaveType_year: { userId: leave.userId, leaveType: balanceType, year } },
    data: {
      usedDays: { increment: leave.days },
      remainingDays: { decrement: leave.days },
    },
  });

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "APPROVED",
      l2ApprovedAt: new Date(),
      l2ApproverId: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "LEAVE_L2_APPROVED",
    targetType: "LeaveRequest",
    targetId: leaveId,
    after: { status: "APPROVED", days: leave.days },
  });

  return NextResponse.json({ data: updated });
}
