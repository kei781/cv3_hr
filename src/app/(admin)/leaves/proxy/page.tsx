"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string;
  email: string;
  department?: string;
}

const LEAVE_TYPE_OPTIONS = [
  { value: "ANNUAL", label: "연차" },
  { value: "HALF_AM", label: "반차(오전)" },
  { value: "HALF_PM", label: "반차(오후)" },
  { value: "QUARTER", label: "반반차" },
  { value: "SICK", label: "병가" },
  { value: "COMPENSATORY", label: "보상휴가" },
];

export default function ProxyLeavePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      setUsers(json.data ?? []);
    } catch {
      toast.error("직원 목록을 불러오지 못했습니다");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setSelectedUserId("");
    setLeaveType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !startDate || !endDate) {
      toast.error("필수 항목을 입력하세요");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leaves/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          leaveType,
          startDate,
          endDate,
          reason,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "등록에 실패했습니다");
      }
      toast.success("대리 휴가가 등록되었습니다");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/leaves"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 휴가관리
        </Link>
        <h1 className="mt-2 text-2xl font-bold">대리 휴가 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">대상 직원</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">직원을 선택하세요</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
                {u.department ? ` - ${u.department}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">유형</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {LEAVE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">사유</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={3}
            placeholder="사유를 입력하세요"
          />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "등록 중..." : "휴가 등록"}
        </Button>
      </form>
    </div>
  );
}
