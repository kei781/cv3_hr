"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Users, ClipboardCheck, AlertTriangle, CalendarDays } from "lucide-react";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차", HALF_AM: "오전반차", HALF_PM: "오후반차",
  QUARTER: "반반차", SICK: "병가", COMPENSATORY: "보상휴가",
};

interface DashboardData {
  totalActiveUsers: number;
  todayAttendanceCount: number;
  todayOnLeave: number;
  pendingL1: number;
  pendingL2: number;
  pendingOvertime: number;
  monthlyLate: number;
  monthlyAbsent: number;
  monthlyEarlyLeave: number;
  calendarSyncFailures: number;
  todayLeaveList: Array<{
    id: string; leaveType: string; startDate: string; endDate: string; days: number;
    user: { name: string };
  }>;
}

export default function AdminDashboardPage() {
  const { user } = useCurrentUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse rounded bg-muted ${className}`} />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">안녕하세요, {user?.name ?? "관리자"}님</p>
      </div>

      {/* 캘린더 동기화 실패 경고 */}
      {data && data.calendarSyncFailures > 0 && (
        <Link href="/admin/calendar">
          <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-800 cursor-pointer hover:bg-yellow-100 transition-colors">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              캘린더 동기화 실패 {data.calendarSyncFailures}건이 있습니다. 확인해주세요.
            </span>
          </div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 현황 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">오늘 현황</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-6 w-24" /> : (
              <>
                <div className="text-2xl font-bold">
                  {data?.todayAttendanceCount ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {data?.totalActiveUsers ?? 0}명 출근
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  오늘 휴가자 {data?.todayOnLeave ?? 0}명
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 승인 대기 */}
        <Link href="/admin/approvals">
          <Card className="cursor-pointer hover:border-orange-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">승인 대기</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-6 w-20" /> : (
                <>
                  <div className="text-2xl font-bold">
                    {(data?.pendingL1 ?? 0) + (data?.pendingL2 ?? 0) + (data?.pendingOvertime ?? 0)}건
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(data?.pendingL1 ?? 0) > 0 && (
                      <Badge variant="secondary">L1 {data?.pendingL1}</Badge>
                    )}
                    {(data?.pendingL2 ?? 0) > 0 && (
                      <Badge variant="secondary">L2 {data?.pendingL2}</Badge>
                    )}
                    {(data?.pendingOvertime ?? 0) > 0 && (
                      <Badge variant="secondary">추가근무 {data?.pendingOvertime}</Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* 이번 달 근태 요약 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">이번 달 근태</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-6 w-28" /> : (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">지각</span>
                  <span className="font-medium">{data?.monthlyLate ?? 0}건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">결근</span>
                  <span className="font-medium">{data?.monthlyAbsent ?? 0}건</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">조퇴</span>
                  <span className="font-medium">{data?.monthlyEarlyLeave ?? 0}건</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 빈 카드 or 추가 정보 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 직원</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold">{data?.totalActiveUsers ?? 0}명</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 오늘 휴가자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>오늘 휴가자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data?.todayLeaveList && data.todayLeaveList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>일수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.todayLeaveList.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.user.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(l.startDate).toLocaleDateString("ko-KR")} ~{" "}
                      {new Date(l.endDate).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell>{l.days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              오늘 휴가자가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
