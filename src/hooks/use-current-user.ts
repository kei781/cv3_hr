"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { currentMode, setCurrentMode } = useAuthStore();

  const roles = session?.user?.roles ?? [];
  const canAccessAdmin = roles.includes("HR") || roles.includes("ADMIN");
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Auto-detect mode from URL path — this is the source of truth
  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      if (canAccessAdmin && currentMode !== "admin") {
        setCurrentMode("admin");
      }
    } else if (pathname.startsWith("/employee")) {
      if (currentMode !== "employee") {
        setCurrentMode("employee");
      }
    }
  }, [pathname, canAccessAdmin, currentMode, setCurrentMode]);

  const switchMode = async (mode: "employee" | "admin") => {
    if (mode === "admin" && !canAccessAdmin) return;

    const res = await fetch("/api/auth/switch-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (res.ok) {
      setCurrentMode(mode);
    }
  };

  return {
    user: session?.user,
    currentMode,
    switchMode,
    canAccessAdmin,
    roles,
    isLoading,
    isAuthenticated,
  };
}
