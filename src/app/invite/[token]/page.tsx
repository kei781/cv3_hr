"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InvitationInfo {
  email: string;
  name: string;
  status: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkToken() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (res.ok) {
          const json = await res.json();
          setInvitation(json.data);
        } else {
          const json = await res.json();
          setError(json.error || "유효하지 않은 초대 링크입니다");
        }
      } catch {
        setError("오류가 발생했습니다");
      } finally {
        setIsLoading(false);
      }
    }
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("비밀번호는 최소 8자 이상이어야 합니다");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast.success("계정이 활성화되었습니다. 로그인해주세요.");
        router.push("/login");
      } else {
        const json = await res.json();
        toast.error(json.error || "활성화에 실패했습니다");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="text-muted-foreground">확인 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-700">
              CV3 People
            </CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push("/login")}>
              로그인 페이지로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-700">
            CV3 People
          </CardTitle>
          <CardDescription>계정 활성화</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <p className="font-medium">{invitation?.name}님 환영합니다!</p>
            <p className="text-blue-600">{invitation?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 8자"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "활성화 중..." : "계정 활성화"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
