"use client";

import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/auth-store";

export function useCurrentUser() {
  const { data: session, status } = useSession();
  const { currentMode, setCurrentMode } = useAuthStore();

  const roles = session?.user?.roles ?? [];
  const canAccessAdmin = roles.includes("HR") || roles.includes("ADMIN");
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

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
