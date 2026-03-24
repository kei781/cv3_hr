"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

const ROLE_OPTIONS = [
  { value: "EMPLOYEE", label: "EMPLOYEE", disabled: true },
  { value: "TEAM_LEAD", label: "TEAM_LEAD", disabled: false },
  { value: "HR", label: "HR", disabled: false },
  { value: "ADMIN", label: "ADMIN", disabled: false },
] as const;

export default function InvitePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [roles, setRoles] = useState<string[]>(["EMPLOYEE"]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((res) => res.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => toast.error("부서 목록을 불러오지 못했습니다"));
  }, []);

  useEffect(() => {
    setTeamId("");
    if (!departmentId) {
      setTeams([]);
      return;
    }
    fetch(`/api/admin/teams?departmentId=${departmentId}`)
      .then((res) => res.json())
      .then((json) => setTeams(json.data ?? []))
      .catch(() => toast.error("팀 목록을 불러오지 못했습니다"));
  }, [departmentId]);

  const handleRoleToggle = (role: string) => {
    if (role === "EMPLOYEE") return;
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          departmentId: departmentId || undefined,
          teamId: teamId || undefined,
          position: position || undefined,
          hireDate,
          roles,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "초대 발송에 실패했습니다");
      }

      toast.success("초대가 발송되었습니다");
      router.push("/admin/invitations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; 직원 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">직원 초대</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일 *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">부서</Label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">선택하세요</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">팀</Label>
          <select
            id="team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={!departmentId}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">선택하세요</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">직급</Label>
          <Input
            id="position"
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hireDate">입사일 *</Label>
          <Input
            id="hireDate"
            type="date"
            value={hireDate}
            onChange={(e) => setHireDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>역할</Label>
          <div className="flex flex-wrap gap-4">
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={roles.includes(role.value)}
                  disabled={role.disabled}
                  onChange={() => handleRoleToggle(role.value)}
                  className="rounded border-gray-300"
                />
                {role.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "발송 중..." : "초대 발송"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
