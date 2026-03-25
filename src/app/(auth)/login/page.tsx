"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";

    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        window.location.href = "/employee/dashboard";
        return;
      }
    } catch {
      toast.error("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClassName =
    "h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-blue-700">
          CV3 People
        </CardTitle>
        <CardDescription>HR ERP 시스템에 로그인하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              placeholder="you@company.com"
              required
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <input
              ref={passwordRef}
              id="password"
              type="password"
              required
              className={inputClassName}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full")}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
