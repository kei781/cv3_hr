"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  name: string;
  email: string;
  department?: { name: string } | null;
  team?: { name: string } | null;
  position?: string | null;
  hireDate?: string | null;
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  role: "ADMIN" | "HR" | "TEAM_LEAD" | "EMPLOYEE";
}

interface Department {
  id: string;
  name: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "INVITED", label: "INVITED" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "INACTIVE", label: "INACTIVE" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INVITED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  HR: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  TEAM_LEAD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EMPLOYEE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentId) params.set("departmentId", departmentId);
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: UsersResponse = await res.json();

      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [search, departmentId, status, page]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      setDepartments(data.departments ?? data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, departmentId, status]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">직원 관리</h1>
          <p className="text-sm text-muted-foreground">
            전체 {total}명
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/invite">
            <Plus className="mr-2 h-4 w-4" />
            직원 초대
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름/이메일 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">전체 부서</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>팀</TableHead>
              <TableHead>직급</TableHead>
              <TableHead>입사일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>역할</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department?.name ?? "-"}</TableCell>
                  <TableCell>{user.team?.name ?? "-"}</TableCell>
                  <TableCell>{user.position ?? "-"}</TableCell>
                  <TableCell>
                    {user.hireDate
                      ? format(new Date(user.hireDate), "yyyy-MM-dd")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={STATUS_COLORS[user.status]}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={ROLE_COLORS[user.role]}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
