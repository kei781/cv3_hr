import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { user: null, error: "Unauthorized" as const, status: 401 as const };
  const roles = user.roles ?? [];
  if (!roles.includes("HR") && !roles.includes("ADMIN")) {
    return { user: null, error: "Forbidden" as const, status: 403 as const };
  }
  return { user, error: null, status: 200 as const };
}
