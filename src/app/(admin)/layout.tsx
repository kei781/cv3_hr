"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, canAccessAdmin, currentMode } =
    useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    } else if (!isLoading && !canAccessAdmin) {
      router.push("/employee/dashboard");
    }
  }, [isLoading, isAuthenticated, canAccessAdmin, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-white p-6">{children}</main>
      </div>
    </div>
  );
}
