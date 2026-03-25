import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { parseExcelBuffer, DEFAULT_TEMPLATE, type ColumnMappingConfig } from "@/lib/excel-parser";

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const templateId = formData.get("templateId") as string | null;
  const customMapping = formData.get("mapping") as string | null;

  if (!file) {
    return NextResponse.json({ error: "파일을 선택해주세요" }, { status: 400 });
  }

  // Resolve mapping
  let mapping: ColumnMappingConfig = DEFAULT_TEMPLATE;
  if (customMapping) {
    try {
      mapping = JSON.parse(customMapping);
    } catch {
      return NextResponse.json({ error: "매핑 설정이 올바르지 않습니다" }, { status: 400 });
    }
  } else if (templateId) {
    const template = await prisma.columnMapping.findUnique({ where: { id: templateId } });
    if (template) {
      mapping = template.mappings as unknown as ColumnMappingConfig;
    }
  }

  // Load policy config
  const configs = await prisma.policyConfig.findMany({
    where: {
      key: { in: ["work_hours.standard_start", "work_hours.standard_end", "work_hours.lunch_minutes"] },
    },
  });
  const configMap = new Map(configs.map((c) => [c.key, c.value]));
  const policyConfig = {
    standardStart: (configMap.get("work_hours.standard_start") as string) || "09:00",
    standardEnd: (configMap.get("work_hours.standard_end") as string) || "18:00",
    lunchMinutes: Number(configMap.get("work_hours.lunch_minutes")) || 60,
  };

  // Load all active users
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, email: true },
  });

  // Parse file
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseExcelBuffer(buffer, mapping, users, policyConfig);

  // Create batch record
  const batch = await prisma.uploadBatch.create({
    data: {
      fileName: file.name,
      uploadedById: user.id,
      templateId: templateId || undefined,
      totalRows: result.summary.total,
      errorCount: result.summary.errors,
      status: "PROCESSING",
      errorReport: JSON.parse(JSON.stringify({
        rows: result.rows,
        summary: result.summary,
        headers: result.headers,
      })),
    },
  });

  // Return preview (max 50 rows)
  return NextResponse.json({
    data: {
      batchId: batch.id,
      fileName: file.name,
      headers: result.headers,
      preview: result.rows.slice(0, 50),
      summary: result.summary,
      totalRows: result.rows.length,
    },
  });
}
