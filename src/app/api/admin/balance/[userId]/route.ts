import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { userId } = await params;
  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { userId, year },
    select: {
      leaveType: true,
      grantedDays: true,
      usedDays: true,
      remainingDays: true,
      expiresAt: true,
    },
    orderBy: { leaveType: "asc" },
  });

  return NextResponse.json({ data: { balances } });
}
