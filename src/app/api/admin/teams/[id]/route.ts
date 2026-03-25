import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  calendarId: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.team.update({
    where: { id },
    data: { calendarId: parsed.data.calendarId },
  });

  await logAudit({
    actorId: user.id,
    action: "TEAM_CALENDAR_UPDATED",
    targetType: "Team",
    targetId: id,
    before: { calendarId: team.calendarId },
    after: { calendarId: updated.calendarId },
  });

  return NextResponse.json({ data: updated });
}
