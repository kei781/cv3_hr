import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import type { ParsedRow } from "@/lib/excel-parser";

const confirmSchema = z.object({
  skipWarnings: z.boolean().default(false),
  warningRowActions: z.record(z.string(), z.enum(["include", "skip"])).default({}),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { batchId } = await params;

  const batch = await prisma.uploadBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (batch.status !== "PROCESSING") {
    return NextResponse.json({ error: "이미 처리된 배치입니다" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { skipWarnings, warningRowActions } = parsed.data;
  const report = batch.errorReport as { rows: ParsedRow[] } | null;
  const rows = report?.rows ?? [];

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    // Skip ERROR rows
    if (row.severity === "ERROR") {
      errorCount++;
      continue;
    }

    // Handle WARNING rows
    if (row.severity === "WARNING") {
      const action = warningRowActions[String(row.rowNum)];
      if (skipWarnings && !action) {
        skipCount++;
        continue;
      }
      if (action === "skip") {
        skipCount++;
        continue;
      }
      // action === "include" or (!skipWarnings && no explicit action) → proceed
    }

    // Validate required fields
    if (!row.computed.userId || !row.parsed.date || !row.parsed.clockIn) {
      errorCount++;
      continue;
    }

    try {
      await prisma.attendance.upsert({
        where: {
          userId_date: {
            userId: row.computed.userId,
            date: new Date(row.parsed.date),
          },
        },
        update: {
          clockIn: row.parsed.clockIn,
          clockOut: row.parsed.clockOut ?? undefined,
          actualWorkHours: row.computed.actualWorkHours,
          overtimeHours: row.computed.overtimeHours,
          status: (row.computed.status as "NORMAL" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "INCOMPLETE") ?? "NORMAL",
          source: "EXCEL_UPLOAD",
          uploadBatchId: batchId,
        },
        create: {
          userId: row.computed.userId,
          date: new Date(row.parsed.date),
          clockIn: row.parsed.clockIn,
          clockOut: row.parsed.clockOut ?? undefined,
          actualWorkHours: row.computed.actualWorkHours,
          overtimeHours: row.computed.overtimeHours,
          status: (row.computed.status as "NORMAL" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "INCOMPLETE") ?? "NORMAL",
          source: "EXCEL_UPLOAD",
          uploadBatchId: batchId,
        },
      });
      successCount++;
    } catch {
      errorCount++;
    }
  }

  // Update batch
  await prisma.uploadBatch.update({
    where: { id: batchId },
    data: {
      status: "COMPLETED",
      successCount,
      errorCount,
      skipCount,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "ATTENDANCE_BULK_UPLOAD",
    targetType: "UploadBatch",
    targetId: batchId,
    after: { successCount, errorCount, skipCount, fileName: batch.fileName },
  });

  return NextResponse.json({
    data: { successCount, errorCount, skipCount, batchId },
  });
}
