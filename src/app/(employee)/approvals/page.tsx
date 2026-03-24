"use client";

import { useEffect, useState, useCallback } from "react";
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

interface ApprovalItem {
  id: string;
  leaveId: string;
  applicantName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "반차(오전)",
  HALF_PM: "반차(오후)",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

type Tab = "pending" | "completed";

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals/pending");
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleApprove = async (leaveId: string) => {
    try {
      const res = await fetch(`/api/approvals/${leaveId}/approve-l1`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      // ignore
    }
  };

  const handleReject = async (leaveId: string) => {
    const reason = window.prompt("반려 사유를 입력하세요");
    if (!reason) return;
    try {
      const res = await fetch(`/api/approvals/${leaveId}/reject-l1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      // ignore
    }
  };

  const pendingItems = items.filter(
    (i) => i.status === "PENDING" || i.status === "PENDING_L1"
  );
  const completedItems = items.filter(
    (i) => i.status !== "PENDING" && i.status !== "PENDING_L1"
  );

  const displayItems = activeTab === "pending" ? pendingItems : completedItems;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">승인함</h1>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          onClick={() => setActiveTab("pending")}
        >
          대기 중
          {pendingItems.length > 0 && (
            <Badge className="ml-1">{pendingItems.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "completed" ? "default" : "outline"}
          onClick={() => setActiveTab("completed")}
        >
          완료
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : displayItems.length === 0 ? (
        <p className="text-muted-foreground">
          {activeTab === "pending"
            ? "대기 중인 승인 요청이 없습니다."
            : "완료된 항목이 없습니다."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>신청자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>사유</TableHead>
              {activeTab === "pending" && <TableHead>작업</TableHead>}
              {activeTab === "completed" && <TableHead>상태</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.applicantName}</TableCell>
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
                <TableCell>{item.reason}</TableCell>
                {activeTab === "pending" ? (
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
                ) : (
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {item.status === "APPROVED" ? "승인됨" : "반려됨"}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
