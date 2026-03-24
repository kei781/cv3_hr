import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const rejectSchema = z.object({ reason: z.string().min(1, "반려 사유를 입력하세요") });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leaveId } = await params;
  const body = await request.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.l1ApproverId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (leave.status !== "PENDING_L1") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: "REJECTED_L1", l1RejectReason: parsed.data.reason, l1ApprovedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: "LEAVE_L1_REJECTED",
    targetType: "LeaveRequest",
    targetId: leaveId,
    after: { status: "REJECTED_L1", reason: parsed.data.reason },
  });

  return NextResponse.json({ data: updated });
}
