"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { ModeSwitch } from "./mode-switch";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, currentMode } = useCurrentUser();
  const { toggle } = useSidebarStore();
  const isAdmin = currentMode === "admin";

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b px-4",
        isAdmin
          ? "border-orange-200 bg-orange-50/50"
          : "border-blue-200 bg-blue-50/50"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-md p-2 hover:bg-white/50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ModeSwitch />

        <span className="text-sm text-muted-foreground">
          {user?.name ?? user?.email}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="로그아웃"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
