import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { sendMail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ mailLogId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const { user, error, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const mailLog = await prisma.mailLog.findUnique({ where: { id: parsed.data.mailLogId } });
  if (!mailLog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mailLog.status !== "FAILED") {
    return NextResponse.json({ error: "실패한 메일만 재발송할 수 있습니다" }, { status: 400 });
  }

  await sendMail({
    to: mailLog.to,
    subject: mailLog.subject,
    html: mailLog.body || "",
    mailType: mailLog.mailType,
    leaveRequestId: mailLog.leaveRequestId || undefined,
  });

  await logAudit({
    actorId: user.id,
    action: "MAIL_RETRY",
    targetType: "MailLog",
    targetId: mailLog.id,
  });

  return NextResponse.json({ success: true });
}
