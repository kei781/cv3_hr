import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const candidates = await prisma.overtimeRequest.findMany({
    where: { status: "CANDIDATE" },
    orderBy: { date: "desc" },
    include: {
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
      attendance: { select: { clockIn: true, clockOut: true, actualWorkHours: true } },
    },
  });

  return NextResponse.json({ data: candidates });
}
