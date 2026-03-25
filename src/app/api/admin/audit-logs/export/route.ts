import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { searchParams } = request.nextUrl;
  const actor = searchParams.get("actor");
  const action = searchParams.get("action");
  const targetType = searchParams.get("targetType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.AuditLogWhereInput = {};
  if (actor) where.actorId = actor;
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { actor: { select: { name: true, email: true } } },
  });

  const header = "일시,행위자,이메일,액션,대상유형,대상ID,이전값,이후값,IP";
  const rows = logs.map((log) => {
    const before = log.beforeValue ? JSON.stringify(log.beforeValue) : "";
    const after = log.afterValue ? JSON.stringify(log.afterValue) : "";
    return [
      new Date(log.createdAt).toISOString(),
      log.actor.name,
      log.actor.email,
      log.action,
      log.targetType,
      log.targetId,
      `"${before.replace(/"/g, '""')}"`,
      `"${after.replace(/"/g, '""')}"`,
      log.ipAddress || "",
    ].join(",");
  });

  const csv = "\uFEFF" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
