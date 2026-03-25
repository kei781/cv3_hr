import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const failures = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", calendarSynced: false },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, team: { select: { name: true, calendarId: true } } } },
    },
  });

  return NextResponse.json({ data: failures });
}
