"use client";

import { useCurrentUser } from "@/hooks/use-current-user";

export default function AdminDashboardPage() {
  const { user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          안녕하세요, {user?.name ?? "관리자"}님
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-8 text-center text-orange-600">
        관리자 대시보드가 곧 준비됩니다.
      </div>
    </div>
  );
}
