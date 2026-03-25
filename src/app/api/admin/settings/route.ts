import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const configs = await prisma.policyConfig.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ data: configs });
}
