import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const departmentId = request.nextUrl.searchParams.get("departmentId");

  const teams = await prisma.team.findMany({
    where: departmentId ? { departmentId } : undefined,
    orderBy: { name: "asc" },
    include: { department: { select: { name: true } } },
  });

  return NextResponse.json({ data: teams });
}
