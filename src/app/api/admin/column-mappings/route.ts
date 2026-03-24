import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const mappings = await prisma.columnMapping.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ data: mappings });
}

const createSchema = z.object({
  name: z.string().min(1, "템플릿 이름을 입력하세요"),
  mappings: z.object({
    employee_identifier: z.object({
      column: z.string(),
      type: z.enum(["employee_id", "name", "email"]),
    }),
    date: z.object({ column: z.string(), format: z.string() }),
    clock_in: z.object({ column: z.string(), format: z.string() }),
    clock_out: z.object({ column: z.string(), format: z.string() }),
    header_row: z.number().int().positive(),
    data_start_row: z.number().int().positive(),
  }),
});

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const mapping = await prisma.columnMapping.create({
    data: {
      name: parsed.data.name,
      mappings: parsed.data.mappings,
      createdById: user.id,
    },
  });

  return NextResponse.json({ data: mapping }, { status: 201 });
}
