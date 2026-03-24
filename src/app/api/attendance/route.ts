import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";
import { z } from "zod";

const querySchema = z.object({
  userId: z.string().optional(),
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { year, month } = parsed.data;
  // Admin can view any user, employee can only view self
  const roles = user.roles ?? [];
  const isAdmin = roles.includes("HR") || roles.includes("ADMIN");
  const targetUserId = (isAdmin && parsed.data.userId) ? parsed.data.userId : user.id;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const attendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ data: attendances });
}
