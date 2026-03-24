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

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, status: true, name: true, email: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.status === "INACTIVE") {
    return NextResponse.json({ error: "User is already inactive" }, { status: 400 });
  }

  if (target.id === actor.id) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: "INACTIVE" },
    select: { id: true, email: true, name: true, status: true },
  });

  await logAudit({
    actorId: actor.id,
    action: "USER_DEACTIVATED",
    targetType: "User",
    targetId: id,
    before: { status: target.status },
    after: { status: "INACTIVE" },
  });

  return NextResponse.json({ data: updated });
}
