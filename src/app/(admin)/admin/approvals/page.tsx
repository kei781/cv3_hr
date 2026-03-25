"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface L2ApprovalItem {
  id: string;
  leaveId: string;
  applicantName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  l1ApproverName: string;
  reason: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "반차(오전)",
  HALF_PM: "반차(오후)",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

export default function AdminApprovalsPage() {
  const [items, setItems] = useState<L2ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/approvals");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      toast.error("승인 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/approvals/${leaveId}/approve-l2`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "승인에 실패했습니다");
      }
      toast.success("승인되었습니다");
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = window.prompt("반려 사유를 입력하세요");
    if (!reason) return;
    try {
      const res = await fetch(`/api/approvals/${leaveId}/reject-l2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "반려에 실패했습니다");
      }
      toast.success("반려되었습니다");
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">2차 승인 관리</h1>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">대기 중인 2차 승인 요청이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>신청자</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>1차승인자</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.applicantName}</TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {LEAVE_TYPE_LABELS[item.leaveType] ?? item.leaveType}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(item.startDate), "yyyy-MM-dd")} ~{" "}
                  {format(new Date(item.endDate), "yyyy-MM-dd")}
                </TableCell>
                <TableCell>{item.days}일</TableCell>
                <TableCell>{item.l1ApproverName}</TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item.leaveId)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(item.leaveId)}
                    >
                      반려
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
