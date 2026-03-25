"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Clock, Palmtree, CalendarDays, ClipboardCheck } from "lucide-react";

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  NORMAL: "정상", LATE: "지각", EARLY_LEAVE: "조퇴", ABSENT: "결근",
  INCOMPLETE: "미완료", ON_LEAVE: "휴가", ON_SICK_LEAVE: "병가",
};

const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  NORMAL: "default", LATE: "destructive", EARLY_LEAVE: "secondary",
  ABSENT: "destructive", INCOMPLETE: "secondary", ON_LEAVE: "default", ON_SICK_LEAVE: "default",
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차", HALF_AM: "오전반차", HALF_PM: "오후반차",
  QUARTER: "반반차", SICK: "병가", COMPENSATORY: "보상휴가",
};

interface DashboardData {
  todayAttendance: { clockIn: string; clockOut: string | null; status: string } | null;
  balances: Array<{ leaveType: string; grantedDays: number; usedDays: number; remainingDays: number }>;
  upcomingLeave: { leaveType: string; startDate: string; endDate: string; days: number } | null;
  pendingApprovals: number;
}

export default function EmployeeDashboardPage() {
  const { user, roles } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/employee/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isTeamLead = roles.includes("TEAM_LEAD");
  const annualBalance = data?.balances.find((b) => b.leaveType === "ANNUAL");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">안녕하세요, {user?.name ?? "직원"}님</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 근태 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 근태</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </div>
            ) : data?.todayAttendance ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{data.todayAttendance.clockIn}</span>
                  <Badge variant={ATTENDANCE_STATUS_COLORS[data.todayAttendance.status] as "default" | "destructive" | "secondary"}>
                    {ATTENDANCE_STATUS_LABELS[data.todayAttendance.status] || data.todayAttendance.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  퇴근: {data.todayAttendance.clockOut || "미등록"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">기록 없음</p>
            )}
          </CardContent>
        </Card>

        {/* 잔여 연차 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">잔여 연차</CardTitle>
            <Palmtree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded bg-muted" />
              </div>
            ) : annualBalance ? (
              <>
                <div className="text-2xl font-bold">
                  {annualBalance.remainingDays}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {annualBalance.grantedDays}일
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${annualBalance.grantedDays > 0 ? (annualBalance.remainingDays / annualBalance.grantedDays) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  사용 {annualBalance.usedDays}일
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">연차 정보 없음</p>
            )}
          </CardContent>
        </Card>

        {/* 다가오는 휴가 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">다가오는 휴가</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </div>
            ) : data?.upcomingLeave ? (
              <>
                <div className="text-lg font-bold">
                  {LEAVE_TYPE_LABELS[data.upcomingLeave.leaveType] || data.upcomingLeave.leaveType}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(data.upcomingLeave.startDate).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(data.upcomingLeave.endDate).toLocaleDateString("ko-KR")}
                  {" "}({data.upcomingLeave.days}일)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">예정된 휴가 없음</p>
            )}
          </CardContent>
        </Card>

        {/* 승인 대기 (TEAM_LEAD only) */}
        {isTeamLead && (
          <Link href="/employee/approvals">
            <Card className="cursor-pointer hover:border-blue-300 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{data?.pendingApprovals ?? 0}건</div>
                    <p className="text-xs text-muted-foreground mt-1">승인함으로 이동</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
