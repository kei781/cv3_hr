import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ data: departments });
}
