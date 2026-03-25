import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createLeaveEvent, deleteLeaveEvent } from "@/lib/google-calendar";
import { z } from "zod";

const schema = z.object({ calendarId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { calendarId } = parsed.data;

  try {
    const eventId = await createLeaveEvent({
      calendarId,
      employeeName: "테스트",
      leaveType: "ANNUAL",
      startDate: new Date(),
      endDate: new Date(),
    });

    if (eventId) {
      await deleteLeaveEvent(calendarId, eventId);
    }

    return NextResponse.json({ success: true, message: "캘린더 연동 테스트 성공" });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "캘린더 연동 테스트 실패",
    }, { status: 500 });
  }
}
