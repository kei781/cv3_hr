"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  position: string | null;
  joinDate: string | null;
  status: "ACTIVE" | "INACTIVE";
  roles: string[];
}

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
}

const ALL_ROLES = ["EMPLOYEE", "TEAM_LEAD", "HR", "ADMIN"] as const;

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "직원",
  TEAM_LEAD: "팀장",
  HR: "인사담당",
  ADMIN: "관리자",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Data
  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    departmentId: "",
    teamId: "",
    position: "",
    joinDate: "",
    roles: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------
  // Fetch helpers
  // -------------------------------------------

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("사용자 정보를 불러올 수 없습니다.");
      const json = await res.json();
      const data: User = json.data ?? json;
      setUser(data);
      setForm({
        name: data.name ?? "",
        departmentId: data.departmentId ?? "",
        teamId: data.teamId ?? "",
        position: data.position ?? "",
        joinDate: data.joinDate ? data.joinDate.slice(0, 10) : "",
        roles: data.roles ?? ["EMPLOYEE"],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  }, [id]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error("부서 목록을 불러올 수 없습니다.");
      const deptJson = await res.json();
      setDepartments(deptJson.data ?? deptJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  }, []);

  const fetchTeams = useCallback(async (departmentId: string) => {
    if (!departmentId) {
      setTeams([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/teams?departmentId=${departmentId}`
      );
      if (!res.ok) throw new Error("팀 목록을 불러올 수 없습니다.");
      const teamJson = await res.json();
      setTeams(teamJson.data ?? teamJson);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  }, []);

  // -------------------------------------------
  // Effects
  // -------------------------------------------

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchUser(), fetchDepartments()]);
      setLoading(false);
    })();
  }, [fetchUser, fetchDepartments]);

  // Fetch teams whenever the selected department changes
  useEffect(() => {
    if (form.departmentId) {
      fetchTeams(form.departmentId);
    } else {
      setTeams([]);
    }
  }, [form.departmentId, fetchTeams]);

  // -------------------------------------------
  // Handlers
  // -------------------------------------------

  const handleDepartmentChange = (newDeptId: string) => {
    setForm((prev) => ({
      ...prev,
      departmentId: newDeptId,
      teamId: "", // reset team when department changes
    }));
  };

  const handleRoleToggle = (role: string) => {
    if (role === "EMPLOYEE") return; // cannot remove EMPLOYEE
    setForm((prev) => {
      const has = prev.roles.includes(role);
      return {
        ...prev,
        roles: has
          ? prev.roles.filter((r) => r !== role)
          : [...prev.roles, role],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          departmentId: form.departmentId || null,
          teamId: form.teamId || null,
          position: form.position || null,
          joinDate: form.joinDate || null,
          roles: form.roles,
        }),
      });
      if (!res.ok) throw new Error("저장에 실패했습니다.");
      toast.success("저장되었습니다.");
      await fetchUser();
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const ok = window.confirm(
      "정말 퇴사 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users/${id}/deactivate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("퇴사 처리에 실패했습니다.");
      toast.success("퇴사 처리되었습니다.");
      await fetchUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setForm({
        name: user.name ?? "",
        departmentId: user.departmentId ?? "",
        teamId: user.teamId ?? "",
        position: user.position ?? "",
        joinDate: user.joinDate ? user.joinDate.slice(0, 10) : "",
        roles: user.roles ?? ["EMPLOYEE"],
      });
    }
    setEditing(false);
  };

  // -------------------------------------------
  // Render helpers
  // -------------------------------------------

  const statusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return <Badge variant="default">재직중</Badge>;
    }
    return <Badge variant="destructive">퇴사</Badge>;
  };

  // -------------------------------------------
  // Loading / error
  // -------------------------------------------

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          사용자를 찾을 수 없습니다.
        </p>
        <Link href="/admin/users" className="text-sm underline mt-2 inline-block">
          &larr; 목록으로
        </Link>
      </div>
    );
  }

  // -------------------------------------------
  // Main render
  // -------------------------------------------

  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        &larr; 목록으로
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {statusBadge(user.status)}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                취소
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              수정
            </Button>
          )}
          {user.status === "ACTIVE" && (
            <Button variant="destructive" onClick={handleDeactivate}>
              퇴사 처리
            </Button>
          )}
        </div>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 이름 */}
              <div className="space-y-1">
                <label className="text-sm font-medium">이름</label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              {/* 이메일 (read-only) */}
              <div className="space-y-1">
                <label className="text-sm font-medium">이메일</label>
                <Input value={user.email} disabled />
              </div>

              {/* 부서 */}
              <div className="space-y-1">
                <label className="text-sm font-medium">부서</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                >
                  <option value="">선택 없음</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 팀 */}
              <div className="space-y-1">
                <label className="text-sm font-medium">팀</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.teamId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, teamId: e.target.value }))
                  }
                  disabled={!form.departmentId}
                >
                  <option value="">선택 없음</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 직급 */}
              <div className="space-y-1">
                <label className="text-sm font-medium">직급</label>
                <Input
                  value={form.position}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, position: e.target.value }))
                  }
                />
              </div>

              {/* 입사일 */}
              <div className="space-y-1">
                <label className="text-sm font-medium">입사일</label>
                <Input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, joinDate: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">이름</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">이메일</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">부서</dt>
                <dd className="font-medium">
                  {user.departmentName ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">팀</dt>
                <dd className="font-medium">{user.teamName ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">직급</dt>
                <dd className="font-medium">{user.position ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">입사일</dt>
                <dd className="font-medium">
                  {user.joinDate
                    ? format(new Date(user.joinDate), "yyyy-MM-dd")
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">상태</dt>
                <dd>{statusBadge(user.status)}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Role management */}
      <Card>
        <CardHeader>
          <CardTitle>역할 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {ALL_ROLES.map((role) => {
              const checked = editing
                ? form.roles.includes(role)
                : user.roles.includes(role);
              const isEmployee = role === "EMPLOYEE";
              return (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!editing || isEmployee}
                    onChange={() => handleRoleToggle(role)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className={isEmployee ? "text-muted-foreground" : ""}>
                    {ROLE_LABELS[role]}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leave balance */}
      <LeaveBalanceSection userId={id as string} />
    </div>
  );
}

// ─── Leave Balance Sub-component ─────────────────────────

function LeaveBalanceSection({ userId }: { userId: string }) {
  const [balances, setBalances] = useState<
    { leaveType: string; grantedDays: number; usedDays: number; remainingDays: number; expiresAt?: string }[]
  >([]);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    leaveType: "ANNUAL",
    adjustment: 0,
    reason: "",
  });

  const year = new Date().getFullYear();

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/balance/${userId}?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        setBalances(json.data?.balances || []);
      }
    } catch {
      // silently fail
    }
  }, [userId, year]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleAdjust = async () => {
    if (!adjustForm.reason) {
      toast.error("사유를 입력하세요");
      return;
    }
    try {
      const res = await fetch(`/api/admin/balance/${userId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: adjustForm.leaveType,
          year,
          adjustment: adjustForm.adjustment,
          reason: adjustForm.reason,
        }),
      });
      if (res.ok) {
        toast.success("잔여일이 조정되었습니다");
        setAdjusting(false);
        setAdjustForm({ leaveType: "ANNUAL", adjustment: 0, reason: "" });
        fetchBalances();
      } else {
        const json = await res.json();
        toast.error(json.error || "조정에 실패했습니다");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    }
  };

  const BALANCE_LABELS: Record<string, string> = {
    ANNUAL: "연차",
    SICK: "병가",
    COMPENSATORY: "보상휴가",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>휴가 잔여 현황 ({year}년)</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setAdjusting(!adjusting)}>
          {adjusting ? "취소" : "조정"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {["ANNUAL", "SICK", "COMPENSATORY"].map((type) => {
            const b = balances.find((bal) => bal.leaveType === type);
            return (
              <div key={type} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{BALANCE_LABELS[type]}</p>
                <p className="text-2xl font-bold mt-1">
                  {b ? `${b.remainingDays}/${b.grantedDays}일` : "미설정"}
                </p>
                {b?.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    만료: {new Date(b.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {adjusting && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm">잔여일 조정</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">유형</label>
                <select
                  className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
                  value={adjustForm.leaveType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, leaveType: e.target.value })}
                >
                  <option value="ANNUAL">연차</option>
                  <option value="SICK">병가</option>
                  <option value="COMPENSATORY">보상휴가</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">증감량 (+ 증가, - 감소)</label>
                <Input
                  type="number"
                  step="0.5"
                  className="mt-1"
                  value={adjustForm.adjustment}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">사유 (필수)</label>
              <Input
                className="mt-1"
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="조정 사유를 입력하세요"
              />
            </div>
            <Button size="sm" onClick={handleAdjust}>
              조정 적용
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
