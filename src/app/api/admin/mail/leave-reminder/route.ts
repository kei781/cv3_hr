import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { sendMail } from "@/lib/mailer";
import { leaveReminderTemplate } from "@/lib/mail-templates";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  userIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const { user: admin, error, status } = await requireAdmin();
  if (!admin) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const currentYear = new Date().getFullYear();

  const where: Record<string, unknown> = { status: "ACTIVE" as const };
  if (parsed.data.userIds && parsed.data.userIds.length > 0) {
    where.id = { in: parsed.data.userIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      leaveBalances: {
        where: { year: currentYear, remainingDays: { gt: 0 } },
        select: { leaveType: true, remainingDays: true, expiresAt: true },
      },
    },
  });

  const eligible = users.filter((u) => u.leaveBalances.length > 0);
  let sent = 0;
  let failed = 0;

  for (const u of eligible) {
    try {
      const template = leaveReminderTemplate({
        employeeName: u.name,
        balances: u.leaveBalances.map((b) => ({
          type: b.leaveType,
          remaining: b.remainingDays,
          expiresAt: b.expiresAt,
        })),
      });
      await sendMail({
        to: u.email,
        ...template,
        mailType: "LEAVE_REMINDER",
      });
      sent++;
    } catch {
      failed++;
    }
  }

  await logAudit({
    actorId: admin.id,
    action: "LEAVE_REMINDER_SENT",
    targetType: "MailLog",
    targetId: "bulk",
    after: { total: eligible.length, sent, failed },
  });

  return NextResponse.json({ data: { total: eligible.length, sent, failed } });
}
