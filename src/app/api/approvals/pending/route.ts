import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pending = await prisma.leaveRequest.findMany({
    where: {
      l1ApproverId: user.id,
      status: "PENDING_L1",
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, department: { select: { name: true } } } },
    },
  });

  const completed = await prisma.leaveRequest.findMany({
    where: {
      l1ApproverId: user.id,
      status: { in: ["PENDING_L2", "APPROVED", "REJECTED_L1"] },
    },
    orderBy: { l1ApprovedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ data: { pending, completed } });
}
