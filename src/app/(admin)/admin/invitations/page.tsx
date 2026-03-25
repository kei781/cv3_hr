"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invitation {
  id: string;
  email: string;
  name: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  roles: string[];
  createdAt: string;
  expiresAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  ACCEPTED: "수락",
  EXPIRED: "만료",
  CANCELLED: "취소",
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invitations");
      const json = await res.json();
      setInvitations(json.data ?? []);
    } catch {
      toast.error("초대 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResend = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "재발송에 실패했습니다");
      }
      toast.success("초대가 재발송되었습니다");
      fetchInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invitations/${id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "취소에 실패했습니다");
      }
      toast.success("초대가 취소되었습니다");
      fetchInvitations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">초대 관리</h1>
        <Link href="/admin/users/invite">
          <Button>직원 초대</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">불러오는 중...</p>
      ) : invitations.length === 0 ? (
        <p className="text-muted-foreground">초대 내역이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>발송일</TableHead>
              <TableHead>만료일</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.email}</TableCell>
                <TableCell>{inv.name}</TableCell>
                <TableCell>
                  <Badge
                    className={STATUS_STYLES[inv.status] ?? ""}
                    variant="outline"
                  >
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </Badge>
                </TableCell>
                <TableCell>{inv.roles.join(", ")}</TableCell>
                <TableCell>
                  {format(new Date(inv.createdAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell>
                  {format(new Date(inv.expiresAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {(inv.status === "PENDING" ||
                      inv.status === "EXPIRED") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(inv.id)}
                      >
                        재발송
                      </Button>
                    )}
                    {inv.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancel(inv.id)}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
