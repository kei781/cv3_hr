"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ReminderTarget {
  id: string;
  name: string;
  email: string;
  balances: Array<{ type: string; remaining: number; expiresAt: string | null }>;
}

interface MailLogEntry {
  id: string;
  mailType: string;
  status: string;
  to: string;
  subject: string;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
}

const BALANCE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차", SICK: "병가", COMPENSATORY: "보상휴가",
};

const MAIL_TYPE_LABELS: Record<string, string> = {
  INVITATION: "초대",
  APPROVAL_REQUEST: "승인 요청",
  APPROVAL_RESULT: "승인 결과",
  PROXY_LEAVE_NOTIFICATION: "대리 등록",
  LEAVE_REMINDER: "연차 촉진",
};

const MAIL_STATUS_COLORS: Record<string, string> = {
  SENT: "default",
  FAILED: "destructive",
  PENDING: "secondary",
};

export default function MailPage() {
  const [targets, setTargets] = useState<ReminderTarget[]>([]);
  const [logs, setLogs] = useState<MailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingUser, setSendingUser] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [logFilter, setLogFilter] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mail/leave-reminder/preview");
      const json = await res.json();
      if (res.ok) setTargets(json.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(logPage), limit: "20" });
      if (logFilter) params.set("type", logFilter);
      const res = await fetch(`/api/admin/mail/logs?${params}`);
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data || []);
        setLogTotalPages(json.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ }
  }, [logPage, logFilter]);

  useEffect(() => {
    Promise.all([fetchTargets(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchTargets, fetchLogs]);

  const handleBulkSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/mail/leave-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setSendResult(json.data);
        toast.success(`${json.data.sent}건 발송 완료`);
        fetchLogs();
      } else {
        toast.error(json.error || "발송 실패");
      }
    } catch { toast.error("발송 실패"); }
    finally { setSending(false); }
  };

  const handleSendToUser = async (userId: string) => {
    setSendingUser(userId);
    try {
      const res = await fetch("/api/admin/mail/leave-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });
      if (res.ok) {
        toast.success("발송 완료");
        fetchLogs();
      } else {
        toast.error("발송 실패");
      }
    } catch { toast.error("발송 실패"); }
    finally { setSendingUser(null); }
  };

  const handleRetry = async (mailLogId: string) => {
    setRetrying(mailLogId);
    try {
      const res = await fetch("/api/admin/mail/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailLogId }),
      });
      if (res.ok) {
        toast.success("재발송 완료");
        fetchLogs();
      } else {
        const json = await res.json();
        toast.error(json.error || "재발송 실패");
      }
    } catch { toast.error("재발송 실패"); }
    finally { setRetrying(null); }
  };

  if (loading) return <p className="p-6">로딩 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">메일 관리</h1>

      <Tabs defaultValue="reminder">
        <TabsList>
          <TabsTrigger value="reminder">연차촉진 알림</TabsTrigger>
          <TabsTrigger value="logs">발송 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="reminder">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>대상자 미리보기</CardTitle>
              <Button onClick={handleBulkSend} disabled={sending || targets.length === 0}>
                {sending ? "발송 중..." : `전체 발송 (${targets.length}명)`}
              </Button>
            </CardHeader>
            <CardContent>
              {sendResult && (
                <div className="mb-4 p-3 rounded-lg bg-muted text-sm">
                  전체 {sendResult.total}명 중 {sendResult.sent}건 성공
                  {sendResult.failed > 0 && `, ${sendResult.failed}건 실패`}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>잔여 휴가</TableHead>
                    <TableHead className="w-[100px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {t.balances.map((b) => (
                            <Badge key={b.type} variant="secondary">
                              {BALANCE_TYPE_LABELS[b.type] || b.type} {b.remaining}일
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToUser(t.id)}
                          disabled={sendingUser === t.id}
                        >
                          {sendingUser === t.id ? "..." : "발송"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {targets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        잔여 연차가 있는 대상자가 없습니다
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>발송 이력</CardTitle>
              <select
                value={logFilter}
                onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                className="flex h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">전체</option>
                {Object.entries(MAIL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>수신자</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>발송일</TableHead>
                    <TableHead className="w-[80px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.to}</TableCell>
                      <TableCell>{MAIL_TYPE_LABELS[log.mailType] || log.mailType}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>
                        <Badge variant={MAIL_STATUS_COLORS[log.status] as "default" | "destructive" | "secondary"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.sentAt
                          ? new Date(log.sentAt).toLocaleDateString("ko-KR")
                          : new Date(log.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        {log.status === "FAILED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(log.id)}
                            disabled={retrying === log.id}
                          >
                            {retrying === log.id ? "..." : "재발송"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        발송 이력이 없습니다
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {logTotalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => p - 1)}
                  >
                    이전
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">
                    {logPage} / {logTotalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={logPage >= logTotalPages}
                    onClick={() => setLogPage((p) => p + 1)}
                  >
                    다음
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
