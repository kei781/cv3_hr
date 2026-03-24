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

interface OvertimeCandidate {
  id: string;
  employeeName: string;
  department: string;
  date: string;
  overtimeHours: number;
  checkIn: string;
  checkOut: string;
}

export default function OvertimePage() {
  const [items, setItems] = useState<OvertimeCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overtime/candidates");
      const json = await res.json();
      setItems(json.data ?? []);
      setSelectedIds(new Set());
    } catch {
      toast.error("초과근무 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/overtime/${id}/approve`, {
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

  const handleReject = async (id: string) => {
    const reason = window.prompt("반려 사유를 입력하세요");
    if (!reason) return;
    try {
      const res = await fetch(`/api/admin/overtime/${id}/reject`, {
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

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error("선택된 항목이 없습니다");
      return;
    }
    try {
      const res = await fetch("/api/admin/overtime/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "일괄 승인에 실패했습니다");
      }
      toast.success(`${selectedIds.size}건이 승인되었습니다`);
      fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">초과근무 관리</h1>
        <Button onClick={handleBulkApprove} disabled={selectedIds.size === 0}>
          선택 일괄 승인 ({selectedIds.size})
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">초과근무 대상이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  type="checkbox"
                  checked={
                    items.length > 0 && selectedIds.size === items.length
                  }
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-border"
                />
              </TableHead>
              <TableHead>직원명</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>날짜</TableHead>
              <TableHead>추가근무시간</TableHead>
              <TableHead>출근</TableHead>
              <TableHead>퇴근</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="size-4 rounded border-border"
                  />
                </TableCell>
                <TableCell>{item.employeeName}</TableCell>
                <TableCell>{item.department}</TableCell>
                <TableCell>
                  {format(new Date(item.date), "yyyy-MM-dd")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.overtimeHours}시간</Badge>
                </TableCell>
                <TableCell>{item.checkIn}</TableCell>
                <TableCell>{item.checkOut}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(item.id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(item.id)}
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
