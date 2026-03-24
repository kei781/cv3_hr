import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = Number(request.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  const balances = await prisma.leaveBalance.findMany({
    where: { userId: user.id, year },
    orderBy: { leaveType: "asc" },
  });

  // Also get recent leave usage for history
  const recentLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId: user.id,
      status: { in: ["APPROVED", "PENDING_L1", "PENDING_L2"] },
      startDate: { gte: new Date(year, 0, 1) },
    },
    orderBy: { startDate: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: { balances, recentLeaves } });
}
