import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { teamId: true, departmentId: true },
  });

  // 후보 순서: 본인 팀 TEAM_LEAD > 상위 부서 TEAM_LEAD > HR
  const candidates = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: { not: user.id },
      OR: [
        { roles: { has: "TEAM_LEAD" }, teamId: currentUser?.teamId },
        { roles: { has: "TEAM_LEAD" }, departmentId: currentUser?.departmentId },
        { roles: { has: "HR" } },
      ],
    },
    select: { id: true, name: true, position: true, roles: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: candidates });
}
