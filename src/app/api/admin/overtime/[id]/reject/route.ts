import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const rejectSchema = z.object({ reason: z.string().min(1, "사유를 입력하세요") });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const ot = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!ot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ot.status !== "CANDIDATE") return NextResponse.json({ error: "이미 처리된 건입니다" }, { status: 400 });

  await prisma.overtimeRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectReason: parsed.data.reason, approvedById: user.id, approvedAt: new Date() },
  });

  await logAudit({
    actorId: user.id,
    action: "OVERTIME_REJECTED",
    targetType: "OvertimeRequest",
    targetId: id,
  });

  return NextResponse.json({ success: true });
}
