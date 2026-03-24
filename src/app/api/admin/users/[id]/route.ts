import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: actor, error, status } = await requireAdmin();
  if (!actor) return NextResponse.json({ error }, { status });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      position: true,
      hireDate: true,
      status: true,
      roles: true,
      createdAt: true,
      updatedAt: true,
      department: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
  roles: z.array(z.enum(["EMPLOYEE", "TEAM_LEAD", "HR", "ADMIN"])).optional(),
  hireDate: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: actor, error, status } = await requireAdmin();
  if (!actor) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const before = await prisma.user.findUnique({
    where: { id },
    select: { name: true, position: true, departmentId: true, teamId: true, roles: true, hireDate: true },
  });

  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data = { ...parsed.data };
  if (data.hireDate) {
    (data as Record<string, unknown>).hireDate = new Date(data.hireDate);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, name: true, position: true,
      hireDate: true, status: true, roles: true,
      department: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "USER_UPDATED",
    targetType: "User",
    targetId: id,
    before: before as unknown as Record<string, unknown>,
    after: parsed.data as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ data: updated });
}
