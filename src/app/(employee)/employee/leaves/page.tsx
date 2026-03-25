"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Leave {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
  createdAt: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "반차(오전)",
  HALF_PM: "반차(오후)",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "임시저장", variant: "secondary" },
  PENDING_L1: { label: "1차대기", variant: "outline" },
  PENDING_L2: { label: "2차대기", variant: "outline" },
  APPROVED: { label: "승인", variant: "default" },
  REJECTED_L1: { label: "1차반려", variant: "destructive" },
  REJECTED_L2: { label: "2차반려", variant: "destructive" },
  CANCELLED: { label: "취소", variant: "secondary" },
};

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "secondary" as const,
  };

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
      {config.label}
    </Badge>
  );
}

function isPending(status: string) {
  return status === "PENDING_L1" || status === "PENDING_L2";
}

function filterLeaves(leaves: Leave[], tab: FilterTab): Leave[] {
  switch (tab) {
    case "ALL":
      return leaves;
    case "PENDING":
      return leaves.filter((l) => isPending(l.status));
    case "APPROVED":
      return leaves.filter((l) => l.status === "APPROVED");
    case "REJECTED":
      return leaves.filter(
        (l) => l.status === "REJECTED_L1" || l.status === "REJECTED_L2"
      );
    case "CANCELLED":
      return leaves.filter((l) => l.status === "CANCELLED");
    default:
      return leaves;
  }
}

export default function MyLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch("/api/employee/leaves?status=ALL");
      if (res.ok) {
        const json = await res.json();
        setLeaves(json.data ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleCancel = async (leaveId: string) => {
    if (!confirm("이 휴가를 취소하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/employee/leaves/${leaveId}/cancel`, { method: "POST" });
      if (res.ok) {
        toast.success("휴가가 취소되었습니다");
        fetchLeaves();
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || "취소 실패");
      }
    } catch { toast.error("취소 실패"); }
  };

  const filtered = filterLeaves(leaves, activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">휴가</h1>
          <p className="text-muted-foreground">
            휴가 신청 내역을 확인하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/employee/balance">
            <Button variant="outline" size="sm">
              잔여 현황 보기
            </Button>
          </Link>
          <Link href="/employee/leaves/new">
            <Button size="sm">휴가 신청</Button>
          </Link>
        </div>
      </div>

      <Tabs
        defaultValue="ALL"
        onValueChange={(val) => setActiveTab(val as FilterTab)}
      >
        <TabsList>
          <TabsTrigger value="ALL">전체</TabsTrigger>
          <TabsTrigger value="PENDING">대기 중</TabsTrigger>
          <TabsTrigger value="APPROVED">승인</TabsTrigger>
          <TabsTrigger value="REJECTED">반려</TabsTrigger>
          <TabsTrigger value="CANCELLED">취소</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              휴가 신청 내역이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>일수</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      {LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.startDate), "yyyy.MM.dd", {
                        locale: ko,
                      })}
                      {leave.startDate !== leave.endDate && (
                        <>
                          {" ~ "}
                          {format(new Date(leave.endDate), "yyyy.MM.dd", {
                            locale: ko,
                          })}
                        </>
                      )}
                    </TableCell>
                    <TableCell>{leave.days}일</TableCell>
                    <TableCell>
                      <StatusBadge status={leave.status} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.createdAt), "yyyy.MM.dd", {
                        locale: ko,
                      })}
                    </TableCell>
                    <TableCell>
                      {(isPending(leave.status) || leave.status === "APPROVED") && (
                        <Button variant="outline" size="sm" onClick={() => handleCancel(leave.id)}>
                          취소
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
