"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  CheckSquare,
  UserCircle,
  Users,
  Timer,
  Palmtree,
  Calendar,
  Mail,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ClipboardCheck,
  Hourglass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";

const employeeNav = [
  { href: "/employee/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/employee/attendance", label: "내 근태", icon: Clock },
  { href: "/employee/leaves", label: "휴가", icon: Palmtree },
  { href: "/employee/balance", label: "잔여 현황", icon: Wallet },
  { href: "/employee/approvals", label: "승인함", icon: CheckSquare },
  { href: "/employee/profile", label: "내 정보", icon: UserCircle },
];

const adminNav = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/users", label: "직원관리", icon: Users },
  { href: "/admin/attendance", label: "근태관리", icon: Timer },
  { href: "/admin/leaves", label: "휴가관리", icon: CalendarDays },
  { href: "/admin/approvals", label: "휴가 승인", icon: ClipboardCheck },
  { href: "/admin/overtime", label: "추가근무", icon: Hourglass },
  { href: "/admin/calendar", label: "캘린더", icon: Calendar },
  { href: "/admin/mail", label: "메일", icon: Mail },
  { href: "/admin/settings", label: "설정", icon: Settings },
  { href: "/admin/audit-log", label: "감사로그", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentMode } = useCurrentUser();
  const { isOpen, toggle } = useSidebarStore();
  const navItems = currentMode === "admin" ? adminNav : employeeNav;
  const isAdmin = currentMode === "admin";

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r transition-all duration-200",
        isOpen ? "w-60" : "w-16",
        isAdmin
          ? "border-orange-200 bg-orange-50"
          : "border-blue-200 bg-blue-50"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b px-4",
          isAdmin ? "border-orange-200" : "border-blue-200"
        )}
      >
        {isOpen && (
          <span
            className={cn(
              "text-lg font-bold",
              isAdmin ? "text-orange-700" : "text-blue-700"
            )}
          >
            CV3 People
          </span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "ml-auto rounded-md p-1 hover:bg-white/50",
            !isOpen && "mx-auto"
          )}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                !isOpen && "justify-center px-2",
                isActive
                  ? isAdmin
                    ? "bg-orange-200/70 text-orange-900"
                    : "bg-blue-200/70 text-blue-900"
                  : isAdmin
                    ? "text-orange-700 hover:bg-orange-100"
                    : "text-blue-700 hover:bg-blue-100"
              )}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Mode indicator */}
      <div
        className={cn(
          "border-t p-3 text-center text-xs font-medium",
          isAdmin
            ? "border-orange-200 text-orange-600"
            : "border-blue-200 text-blue-600"
        )}
      >
        {isOpen && (isAdmin ? "관리자 모드" : "직원 모드")}
      </div>
    </aside>
  );
}
