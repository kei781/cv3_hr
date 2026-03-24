"use client";

import { useCurrentUser } from "@/hooks/use-current-user";

export default function EmployeeDashboardPage() {
  const { user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          안녕하세요, {user?.name ?? "직원"}님
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-8 text-center text-blue-600">
        직원 대시보드가 곧 준비됩니다.
      </div>
    </div>
  );
}
