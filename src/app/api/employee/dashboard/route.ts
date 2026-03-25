import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = today.getFullYear();

  const [todayAttendance, balances, upcomingLeave, pendingApprovals] = await Promise.all([
    // Today's attendance
    prisma.attendance.findFirst({
      where: { userId: user.id, date: { gte: today, lt: tomorrow } },
    }),
    // Leave balances for current year
    prisma.leaveBalance.findMany({
      where: { userId: user.id, year },
      orderBy: { leaveType: "asc" },
    }),
    // Next upcoming approved leave
    prisma.leaveRequest.findFirst({
      where: { userId: user.id, status: "APPROVED", startDate: { gte: today } },
      orderBy: { startDate: "asc" },
    }),
    // Pending L1 approvals (for TEAM_LEAD)
    prisma.leaveRequest.count({
      where: { l1ApproverId: user.id, status: "PENDING_L1" },
    }),
  ]);

  return NextResponse.json({
    data: {
      todayAttendance,
      balances,
      upcomingLeave,
      pendingApprovals,
    },
  });
}
