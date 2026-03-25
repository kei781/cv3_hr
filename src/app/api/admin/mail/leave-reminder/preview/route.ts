import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const currentYear = new Date().getFullYear();

  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      email: true,
      leaveBalances: {
        where: { year: currentYear, remainingDays: { gt: 0 } },
        select: { leaveType: true, remainingDays: true, expiresAt: true },
      },
    },
  });

  const eligible = users
    .filter((u) => u.leaveBalances.length > 0)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balances: u.leaveBalances.map((b) => ({
        type: b.leaveType,
        remaining: b.remainingDays,
        expiresAt: b.expiresAt,
      })),
    }));

  return NextResponse.json({ data: eligible });
}
