"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Shield, User } from "lucide-react";

export function ModeSwitch() {
  const router = useRouter();
  const { currentMode, switchMode, canAccessAdmin } = useCurrentUser();

  if (!canAccessAdmin) return null;

  const handleSwitch = async (mode: "employee" | "admin") => {
    if (mode === currentMode) return;
    await switchMode(mode);
    router.push(mode === "admin" ? "/admin/dashboard" : "/employee/dashboard");
  };

  return (
    <div className="flex items-center rounded-lg border bg-white p-0.5 shadow-sm">
      <button
        onClick={() => handleSwitch("employee")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          currentMode === "employee"
            ? "bg-blue-500 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="h-3.5 w-3.5" />
        직원
      </button>
      <button
        onClick={() => handleSwitch("admin")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          currentMode === "admin"
            ? "bg-orange-500 text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Shield className="h-3.5 w-3.5" />
        관리자
      </button>
    </div>
  );
}
