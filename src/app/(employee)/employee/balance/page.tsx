"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BalanceCategory {
  remaining: number;
  total: number;
  expiresAt?: string;
}

interface RecentLeave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  createdAt: string;
}

interface BalanceData {
  annual: BalanceCategory;
  sick: BalanceCategory;
  compensatory: BalanceCategory;
  recentLeaves: RecentLeave[];
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "반차(오전)",
  HALF_PM: "반차(오후)",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "임시저장",
  PENDING_L1: "1차대기",
  PENDING_L2: "2차대기",
  APPROVED: "승인",
  REJECTED_L1: "1차반려",
  REJECTED_L2: "2차반려",
  CANCELLED: "취소",
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const colorClass =
    status === "PENDING_L1" || status === "PENDING_L2"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : status === "APPROVED"
        ? "bg-green-100 text-green-800 border-green-200"
        : status === "REJECTED_L1" || status === "REJECTED_L2"
          ? "bg-red-100 text-red-800 border-red-200"
          : "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  );
}

function BalanceCard({ title, data }: { title: string; data: BalanceCategory }) {
  const percentage =
    data.total > 0 ? Math.round((data.remaining / data.total) * 100) : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold">{data.remaining}</span>
          <span className="pb-1 text-muted-foreground">/ {data.total}일</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {data.expiresAt && (
          <p className="text-xs text-muted-foreground">
            만료일: {format(new Date(data.expiresAt), "yyyy년 MM월 dd일", { locale: ko })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function toBalanceCategory(
  balances: Array<{ leaveType: string; grantedDays: number; remainingDays: number; expiresAt?: string | null }>,
  type: string
): BalanceCategory {
  const b = balances.find((b) => b.leaveType === type);
  return {
    remaining: b?.remainingDays ?? 0,
    total: b?.grantedDays ?? 0,
    expiresAt: b?.expiresAt ?? undefined,
  };
}

export default function BalancePage() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/employee/balance");
        if (res.ok) {
          const json = await res.json();
          const { balances = [], recentLeaves = [] } = json.data || json;
          setData({
            annual: toBalanceCategory(balances, "ANNUAL"),
            sick: toBalanceCategory(balances, "SICK"),
            compensatory: toBalanceCategory(balances, "COMPENSATORY"),
            recentLeaves,
          });
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">잔여 현황</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        잔여 현황을 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">잔여 현황</h1>
          <p className="text-muted-foreground">
            휴가 잔여일과 사용 내역을 확인합니다.
          </p>
        </div>
        <Link href="/employee/leaves">
          <Button variant="outline" size="sm">
            휴가 목록
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <BalanceCard title="연차" data={data.annual} />
        <BalanceCard title="병가" data={data.sick} />
        <BalanceCard title="보상휴가" data={data.compensatory} />
      </div>

      {data.recentLeaves.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">최근 사용 내역</h2>
          <div className="space-y-2">
            {data.recentLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(leave.startDate), "yyyy.MM.dd", { locale: ko })}
                    {leave.startDate !== leave.endDate && (
                      <>
                        {" ~ "}
                        {format(new Date(leave.endDate), "yyyy.MM.dd", { locale: ko })}
                      </>
                    )}
                    {" "}({leave.days}일)
                  </p>
                </div>
                <StatusBadge status={leave.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
