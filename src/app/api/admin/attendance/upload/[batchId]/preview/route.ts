import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { batchId } = await params;

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      fileName: true,
      totalRows: true,
      status: true,
      errorReport: true,
      createdAt: true,
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const report = batch.errorReport as { rows: unknown[]; summary: unknown; headers: string[] } | null;

  return NextResponse.json({
    data: {
      batchId: batch.id,
      fileName: batch.fileName,
      status: batch.status,
      headers: report?.headers ?? [],
      rows: report?.rows ?? [],
      summary: report?.summary ?? { total: 0, ok: 0, errors: 0, warnings: 0 },
    },
  });
}
