import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const pending = await prisma.leaveRequest.findMany({
    where: { status: "PENDING_L2" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
      l1Approver: { select: { name: true } },
    },
  });

  return NextResponse.json({ data: pending });
}
