import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { notifyLeaveStatusChange } from "@/lib/leave-notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leaveId } = await params;

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cancellableStatuses = ["APPROVED", "PENDING_L1", "PENDING_L2"];
  if (!cancellableStatuses.includes(leave.status)) {
    return NextResponse.json({ error: "취소할 수 없는 상태입니다" }, { status: 400 });
  }

  const wasApproved = leave.status === "APPROVED";

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "CANCELLED" },
  });

  // Restore balance if was approved
  if (wasApproved) {
    const balanceType = leave.leaveType === "SICK" ? "SICK"
      : leave.leaveType === "COMPENSATORY" ? "COMPENSATORY"
      : "ANNUAL";
    const year = leave.startDate.getFullYear();

    await prisma.leaveBalance.update({
      where: { userId_leaveType_year: { userId: leave.userId, leaveType: balanceType, year } },
      data: {
        usedDays: { decrement: leave.days },
        remainingDays: { increment: leave.days },
      },
    });
  }

  await logAudit({
    actorId: user.id,
    action: "LEAVE_CANCELLED",
    targetType: "LeaveRequest",
    targetId: leaveId,
    before: { status: leave.status },
    after: { status: "CANCELLED" },
  });

  notifyLeaveStatusChange(leaveId, "CANCELLED", user.id).catch(console.error);

  return NextResponse.json({ data: updated });
}
