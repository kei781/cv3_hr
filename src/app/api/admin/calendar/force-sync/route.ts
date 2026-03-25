import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { syncLeaveToCalendar } from "@/lib/google-calendar";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ leaveId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  try {
    await syncLeaveToCalendar(parsed.data.leaveId);
    await logAudit({
      actorId: user.id,
      action: "CALENDAR_FORCE_SYNC",
      targetType: "LeaveRequest",
      targetId: parsed.data.leaveId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "동기화 실패",
    }, { status: 500 });
  }
}
