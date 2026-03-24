import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leaveId } = await params;

  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leave.l1ApproverId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (leave.status !== "PENDING_L1") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  // Find an HR user for L2 approval
  const hrUser = await prisma.user.findFirst({
    where: { roles: { has: "HR" }, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status: "PENDING_L2",
      l1ApprovedAt: new Date(),
      l2ApproverId: hrUser?.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "LEAVE_L1_APPROVED",
    targetType: "LeaveRequest",
    targetId: leaveId,
    after: { status: "PENDING_L2" },
  });

  return NextResponse.json({ data: updated });
}
