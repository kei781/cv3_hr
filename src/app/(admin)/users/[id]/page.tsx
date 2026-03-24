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
  EMPLOYEE: "EMPLOYEE",
  TEAM_LEAD: "TEAM_LEAD",
  HR: "HR",
  ADMIN: "ADMIN",
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
      const data: User = await res.json();
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
      const data: Department[] = await res.json();
      setDepartments(data);
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
      const data: Team[] = await res.json();
      setTeams(data);
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
          {!editing && (
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

      {/* Edit action buttons */}
      {editing && (
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
          <Button variant="outline" onClick={handleCancelEdit}>
            취소
          </Button>
        </div>
      )}

      {/* Leave balance (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>휴가 잔여 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card size="sm">
              <CardContent>
                <p className="text-sm text-muted-foreground">연차</p>
                <p className="text-2xl font-bold mt-1">--/15일</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent>
                <p className="text-sm text-muted-foreground">병가</p>
                <p className="text-2xl font-bold mt-1">--/3일</p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent>
                <p className="text-sm text-muted-foreground">보상휴가</p>
                <p className="text-2xl font-bold mt-1">--일</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Phase 3에서 연동 예정
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
