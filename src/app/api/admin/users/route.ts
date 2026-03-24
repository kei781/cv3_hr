import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(["INVITED", "ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { page, pageSize, search, departmentId, status: userStatus } = parsed.data;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(departmentId && { departmentId }),
    ...(userStatus && { status: userStatus }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        position: true,
        hireDate: true,
        status: true,
        roles: true,
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
