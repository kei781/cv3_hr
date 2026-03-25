"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string };
}

const ACTION_COLORS: Record<string, string> = {
  LEAVE_REQUESTED: "default",
  LEAVE_L1_APPROVED: "default",
  LEAVE_L2_APPROVED: "default",
  LEAVE_L1_REJECTED: "destructive",
  LEAVE_L2_REJECTED: "destructive",
  LEAVE_CANCELLED: "secondary",
  LEAVE_PROXY_CREATED: "default",
  CALENDAR_SYNC_FAILED: "destructive",
  CALENDAR_FORCE_SYNC: "secondary",
  LEAVE_REMINDER_SENT: "default",
  MAIL_RETRY: "secondary",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter) params.set("action", actionFilter);
      if (targetTypeFilter) params.set("targetType", targetTypeFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, actionFilter, targetTypeFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (targetTypeFilter) params.set("targetType", targetTypeFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.open(`/api/admin/audit-logs/export?${params}`, "_blank");
  };

  const truncateJson = (val: Record<string, unknown> | null) => {
    if (!val) return "-";
    const str = JSON.stringify(val);
    return str.length > 50 ? str.slice(0, 50) + "..." : str;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">감사 로그</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          CSV 내보내기
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">시작일</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">종료일</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">액션</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">전체</option>
                <option value="LEAVE_REQUESTED">휴가 신청</option>
                <option value="LEAVE_L1_APPROVED">L1 승인</option>
                <option value="LEAVE_L2_APPROVED">L2 승인</option>
                <option value="LEAVE_L1_REJECTED">L1 반려</option>
                <option value="LEAVE_L2_REJECTED">L2 반려</option>
                <option value="LEAVE_CANCELLED">휴가 취소</option>
                <option value="LEAVE_PROXY_CREATED">대리 등록</option>
                <option value="CALENDAR_SYNC_FAILED">캘린더 실패</option>
                <option value="CALENDAR_FORCE_SYNC">강제 동기화</option>
                <option value="LEAVE_REMINDER_SENT">연차 촉진</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">대상 유형</label>
              <select
                value={targetTypeFilter}
                onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">전체</option>
                <option value="LeaveRequest">휴가 신청</option>
                <option value="User">사용자</option>
                <option value="Team">팀</option>
                <option value="Attendance">근태</option>
                <option value="OvertimeRequest">추가근무</option>
                <option value="MailLog">메일</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>로그 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일시</TableHead>
                  <TableHead>행위자</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </TableCell>
                    <TableCell className="font-medium">{log.actor.name}</TableCell>
                    <TableCell>
                      <Badge variant={(ACTION_COLORS[log.action] || "secondary") as "default" | "destructive" | "secondary"}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.targetType}
                      <span className="text-muted-foreground ml-1">({log.targetId.slice(0, 8)}...)</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {truncateJson(log.afterValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              감사 로그가 없습니다
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>감사 로그 상세</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">일시:</span>
                  <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString("ko-KR")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">행위자:</span>
                  <p className="font-medium">{selectedLog.actor.name} ({selectedLog.actor.email})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">액션:</span>
                  <p><Badge variant={(ACTION_COLORS[selectedLog.action] || "secondary") as "default" | "destructive" | "secondary"}>{selectedLog.action}</Badge></p>
                </div>
                <div>
                  <span className="text-muted-foreground">대상:</span>
                  <p className="font-medium">{selectedLog.targetType} / {selectedLog.targetId}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-muted-foreground">IP:</span>
                    <p className="font-medium">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>

              {selectedLog.beforeValue && (
                <div>
                  <h4 className="text-sm font-medium mb-1">이전 값 (Before)</h4>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(selectedLog.beforeValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterValue && (
                <div>
                  <h4 className="text-sm font-medium mb-1">이후 값 (After)</h4>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(selectedLog.afterValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
