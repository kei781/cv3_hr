import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: actor, error, status } = await requireAdmin();
  if (!actor) return NextResponse.json({ error }, { status });

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ error: "PENDING 상태의 초대만 취소할 수 있습니다" }, { status: 400 });
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    actorId: actor.id,
    action: "INVITATION_CANCELLED",
    targetType: "Invitation",
    targetId: id,
    before: { status: "PENDING" },
    after: { status: "CANCELLED" },
  });

  return NextResponse.json({ data: updated });
}
