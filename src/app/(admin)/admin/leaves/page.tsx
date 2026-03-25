"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function LeavesManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">휴가관리</h1>
        <Link href="/admin/leaves/proxy">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            대리 등록
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/approvals"
          className="block rounded-lg border p-6 hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-semibold text-lg">휴가 승인 (2차)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            1차 승인이 완료된 병가 건의 최종 승인/반려
          </p>
        </Link>
        <Link
          href="/admin/leaves/proxy"
          className="block rounded-lg border p-6 hover:bg-muted/50 transition-colors"
        >
          <h3 className="font-semibold text-lg">대리 등록</h3>
          <p className="text-sm text-muted-foreground mt-1">
            관리자가 직원 대신 휴가를 등록합니다
          </p>
        </Link>
      </div>
    </div>
  );
}
