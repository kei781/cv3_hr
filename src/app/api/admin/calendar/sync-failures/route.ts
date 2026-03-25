import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const failures = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", calendarSynced: false },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, team: { select: { name: true, calendarId: true } } } },
    },
  });

  // Look up last CALENDAR_SYNC_FAILED audit log for each failure to get error details
  const failureIds = failures.map((f) => f.id);
  const auditLogs = failureIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          action: "CALENDAR_SYNC_FAILED",
          targetType: "LeaveRequest",
          targetId: { in: failureIds },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const auditByTarget = new Map<string, string>();
  for (const log of auditLogs) {
    if (!auditByTarget.has(log.targetId)) {
      const after = log.afterValue as Record<string, unknown> | null;
      auditByTarget.set(log.targetId, (after?.error as string) || "알 수 없는 오류");
    }
  }

  const data = failures.map((f) => {
    let failReason = auditByTarget.get(f.id) || null;
    // If no audit log, infer reason
    if (!failReason) {
      if (!f.user.team) {
        failReason = "직원에게 팀이 배정되지 않았습니다";
      } else if (!f.user.team.calendarId) {
        failReason = `팀 "${f.user.team.name}"에 캘린더 ID가 설정되지 않았습니다`;
      } else {
        failReason = "Google Calendar API 연동 미설정 또는 서비스 계정 인증 오류";
      }
    }
    return { ...f, failReason };
  });

  return NextResponse.json({ data });
}
