"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eachDayOfInterval, isWeekend } from "date-fns";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEAVE_TYPES = [
  { value: "ANNUAL", label: "연차" },
  { value: "HALF_AM", label: "반차(오전)" },
  { value: "HALF_PM", label: "반차(오후)" },
  { value: "QUARTER", label: "반반차" },
  { value: "SICK", label: "병가" },
  { value: "COMPENSATORY", label: "보상휴가" },
] as const;

interface BalanceItem {
  leaveType: string;
  grantedDays: number;
  usedDays: number;
  remainingDays: number;
}

interface ApproverCandidate {
  id: string;
  name: string;
  position?: string;
}

function isHalfOrQuarter(type: string) {
  return type === "HALF_AM" || type === "HALF_PM" || type === "QUARTER";
}

function countBusinessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter((d) => !isWeekend(d)).length;
}

function computeDays(type: string, startDate: string, endDate: string): number {
  if (!startDate) return 0;
  if (type === "HALF_AM" || type === "HALF_PM") return 0.5;
  if (type === "QUARTER") return 0.25;
  return countBusinessDays(startDate, endDate);
}

export default function NewLeavePage() {
  const router = useRouter();

  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [l1ApproverId, setL1ApproverId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [approverCandidates, setApproverCandidates] = useState<ApproverCandidate[]>([]);

  useEffect(() => {
    fetch("/api/employee/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.balances) setBalances(json.data.balances);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (leaveType === "SICK") {
      fetch("/api/employee/approver-candidates")
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data) setApproverCandidates(json.data);
        })
        .catch(() => {});
    }
  }, [leaveType]);

  useEffect(() => {
    if (isHalfOrQuarter(leaveType) && startDate) {
      setEndDate(startDate);
    }
  }, [leaveType, startDate]);

  const days = useMemo(
    () => computeDays(leaveType, startDate, endDate),
    [leaveType, startDate, endDate]
  );

  const annualBalance = balances.find((b) => b.leaveType === "ANNUAL");
  const remainingAfter = annualBalance ? annualBalance.remainingDays - days : null;

  const inputClassName =
    "h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!startDate) {
      toast.error("시작일을 선택해주세요.");
      return;
    }
    if (!endDate) {
      toast.error("종료일을 선택해주세요.");
      return;
    }
    if (leaveType === "SICK" && !reason.trim()) {
      toast.error("병가 사유를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        leaveType,
        startDate,
        endDate,
        days,
        reason: reason || undefined,
      };
      if (leaveType === "SICK" && l1ApproverId) {
        body.l1ApproverId = l1ApproverId;
      }

      const res = await fetch("/api/employee/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("휴가가 신청되었습니다.");
        router.push("/employee/leaves");
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "휴가 신청에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/employee/leaves"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; 휴가 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">휴가 신청</h1>
      </div>

      {annualBalance && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              잔여 연차: <span className="font-semibold text-foreground">{annualBalance.remainingDays}일</span>
              {days > 0 && (
                <>
                  , 이번 신청: <span className="font-semibold text-foreground">{days}일</span>
                  {" → 신청 후: "}
                  <span className={(remainingAfter ?? 0) < 0 ? "font-semibold text-red-600" : "font-semibold text-foreground"}>
                    {remainingAfter}일
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Leave type */}
        <div className="space-y-2">
          <Label htmlFor="leaveType">유형 선택</Label>
          <select
            id="leaveType"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className={inputClassName}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">시작일</Label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputClassName}
          />
        </div>

        {/* End date */}
        <div className="space-y-2">
          <Label htmlFor="endDate">종료일</Label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isHalfOrQuarter(leaveType)}
            min={startDate}
            required
            className={inputClassName}
          />
          {isHalfOrQuarter(leaveType) && (
            <p className="text-xs text-muted-foreground">
              {leaveType === "QUARTER" ? "반반차" : "반차"}는 시작일과 동일하게 설정됩니다.
            </p>
          )}
        </div>

        {/* Auto days display */}
        {startDate && (
          <div className="space-y-2">
            <Label>자동 계산 일수</Label>
            <p className="text-sm font-semibold">{days}일</p>
          </div>
        )}

        {/* Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">
            사유{leaveType === "SICK" && <span className="text-red-500"> *</span>}
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              leaveType === "SICK"
                ? "병가 사유를 입력해주세요 (필수)"
                : "사유를 입력해주세요 (선택)"
            }
            required={leaveType === "SICK"}
          />
        </div>

        {/* Approver (SICK only) */}
        {leaveType === "SICK" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="approver">1차 승인자</Label>
              <select
                id="approver"
                value={l1ApproverId}
                onChange={(e) => setL1ApproverId(e.target.value)}
                className={inputClassName}
              >
                <option value="">승인자를 선택하세요</option>
                {approverCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.position ? ` (${c.position})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">승인 워크플로우 미리보기</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  [신청자] → [1차:{" "}
                  {l1ApproverId
                    ? approverCandidates.find((c) => c.id === l1ApproverId)?.name ?? "선택한 승인자"
                    : "미선택"}
                  ] → [2차: HR] → 완료
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={cn(buttonVariants({ variant: "default", size: "default" }))}
          >
            {submitting ? "신청 중..." : "휴가 신청"}
          </button>
          <Link
            href="/employee/leaves"
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
