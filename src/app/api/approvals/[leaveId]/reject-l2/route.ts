import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { notifyLeaveStatusChange } from "@/lib/leave-notifications";
import { z } from "zod";

const rejectSchema = z.object({ reason: z.string().min(1, "반려 사유를 입력하세요") });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { leaveId } = await params;
  const body = await request.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.status !== "PENDING_L2") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "REJECTED_L2", l2RejectReason: parsed.data.reason, l2ApprovedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: "LEAVE_L2_REJECTED",
    targetType: "LeaveRequest",
    targetId: leaveId,
    after: { status: "REJECTED_L2", reason: parsed.data.reason },
  });

  notifyLeaveStatusChange(leaveId, "REJECTED_L2", user.id).catch(console.error);

  return NextResponse.json({ data: updated });
}
