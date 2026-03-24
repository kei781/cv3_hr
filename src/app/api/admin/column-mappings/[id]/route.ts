import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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
  }).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.columnMapping.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const updated = await prisma.columnMapping.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.mappings && { mappings: parsed.data.mappings }),
    },
  });

  return NextResponse.json({ data: updated });
}
