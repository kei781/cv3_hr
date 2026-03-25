"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  calendarId: string | null;
  department: { name: string };
}

interface SyncFailure {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  user: { name: string; email: string; team: { name: string; calendarId: string | null } | null };
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차", HALF_AM: "오전반차", HALF_PM: "오후반차",
  QUARTER: "반반차", SICK: "병가", COMPENSATORY: "보상휴가",
};

export default function CalendarPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [calendarIds, setCalendarIds] = useState<Record<string, string>>({});
  const [failures, setFailures] = useState<SyncFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teams");
      const json = await res.json();
      if (res.ok) {
        setTeams(json.data || []);
        const ids: Record<string, string> = {};
        for (const t of json.data || []) {
          ids[t.id] = t.calendarId || "";
        }
        setCalendarIds(ids);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/calendar/sync-failures");
      const json = await res.json();
      if (res.ok) setFailures(json.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchTeams(), fetchFailures()]).finally(() => setLoading(false));
  }, [fetchTeams, fetchFailures]);

  const handleTest = async (teamId: string) => {
    const calendarId = calendarIds[teamId];
    if (!calendarId) { toast.error("캘린더 ID를 입력하세요"); return; }
    setTesting(teamId);
    try {
      const res = await fetch("/api/admin/calendar/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId }),
      });
      const json = await res.json();
      if (res.ok) toast.success("테스트 성공");
      else toast.error(json.error || "테스트 실패");
    } catch { toast.error("테스트 실패"); }
    finally { setTesting(null); }
  };

  const handleSave = async (teamId: string) => {
    setSaving(teamId);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: calendarIds[teamId] || null }),
      });
      if (res.ok) toast.success("저장 완료");
      else toast.error("저장 실패");
    } catch { toast.error("저장 실패"); }
    finally { setSaving(null); }
  };

  const handleForceSync = async (leaveId: string) => {
    setSyncing(leaveId);
    try {
      const res = await fetch("/api/admin/calendar/force-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId }),
      });
      if (res.ok) {
        toast.success("재동기화 완료");
        fetchFailures();
      } else {
        const json = await res.json();
        toast.error(json.error || "재동기화 실패");
      }
    } catch { toast.error("재동기화 실패"); }
    finally { setSyncing(null); }
  };

  if (loading) return <p className="p-6">로딩 중...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">캘린더 설정</h1>

      <Tabs defaultValue="mapping">
        <TabsList>
          <TabsTrigger value="mapping">팀 캘린더 매핑</TabsTrigger>
          <TabsTrigger value="failures">
            동기화 실패
            {failures.length > 0 && (
              <Badge variant="destructive" className="ml-2">{failures.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>팀별 Google Calendar ID 매핑</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>팀</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>캘린더 ID</TableHead>
                    <TableHead className="w-[200px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.department.name}</TableCell>
                      <TableCell>
                        <Input
                          value={calendarIds[team.id] || ""}
                          onChange={(e) =>
                            setCalendarIds((prev) => ({ ...prev, [team.id]: e.target.value }))
                          }
                          placeholder="example@group.calendar.google.com"
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTest(team.id)}
                            disabled={testing === team.id}
                          >
                            {testing === team.id ? "테스트 중..." : "테스트"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(team.id)}
                            disabled={saving === team.id}
                          >
                            {saving === team.id ? "저장 중..." : "저장"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {teams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        등록된 팀이 없습니다
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failures">
          <Card>
            <CardHeader>
              <CardTitle>캘린더 동기화 실패 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청자</TableHead>
                    <TableHead>팀</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>일수</TableHead>
                    <TableHead className="w-[100px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.user.name}</TableCell>
                      <TableCell>{f.user.team?.name || "-"}</TableCell>
                      <TableCell>{LEAVE_TYPE_LABELS[f.leaveType] || f.leaveType}</TableCell>
                      <TableCell>
                        {new Date(f.startDate).toLocaleDateString("ko-KR")} ~{" "}
                        {new Date(f.endDate).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>{f.days}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleForceSync(f.id)}
                          disabled={syncing === f.id}
                        >
                          {syncing === f.id ? "..." : "재동기화"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {failures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        동기화 실패 건이 없습니다
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
