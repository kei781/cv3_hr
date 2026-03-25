import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalActiveUsers,
    todayAttendanceCount,
    todayOnLeave,
    pendingL1,
    pendingL2,
    pendingOvertime,
    monthlyLate,
    monthlyAbsent,
    monthlyEarlyLeave,
    calendarSyncFailures,
    todayLeaveList,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.leaveRequest.count({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING_L1" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING_L2" } }),
    prisma.overtimeRequest.count({ where: { status: "CANDIDATE" } }),
    prisma.attendance.count({ where: { date: { gte: monthStart, lte: monthEnd }, status: "LATE" } }),
    prisma.attendance.count({ where: { date: { gte: monthStart, lte: monthEnd }, status: "ABSENT" } }),
    prisma.attendance.count({ where: { date: { gte: monthStart, lte: monthEnd }, status: "EARLY_LEAVE" } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", calendarSynced: false } }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
      include: { user: { select: { name: true } } },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    data: {
      totalActiveUsers,
      todayAttendanceCount,
      todayOnLeave,
      pendingL1,
      pendingL2,
      pendingOvertime,
      monthlyLate,
      monthlyAbsent,
      monthlyEarlyLeave,
      calendarSyncFailures,
      todayLeaveList,
    },
  });
}
