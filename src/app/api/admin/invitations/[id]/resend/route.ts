import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { sendInvitationEmail } from "@/lib/mailer";
import crypto from "crypto";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: actor, error, status } = await requireAdmin();
  if (!actor) return NextResponse.json({ error }, { status });

  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "PENDING" && invitation.status !== "EXPIRED") {
    return NextResponse.json({ error: "재발송할 수 없는 상태입니다" }, { status: 400 });
  }

  const expiryConfig = await prisma.policyConfig.findUnique({
    where: { key: "invitation.expiry_hours" },
  });
  const expiryHours = expiryConfig ? Number(expiryConfig.value) : 72;

  const newToken = crypto.randomUUID();

  const updated = await prisma.invitation.update({
    where: { id },
    data: {
      token: newToken,
      status: "PENDING",
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    },
  });

  try {
    await sendInvitationEmail(invitation.email, invitation.name, newToken);
  } catch (err) {
    console.error("[Invitation] Resend email failed:", err);
  }

  await logAudit({
    actorId: actor.id,
    action: "INVITATION_RESENT",
    targetType: "Invitation",
    targetId: id,
    after: { newToken: newToken.slice(0, 8) + "..." },
  });

  return NextResponse.json({ data: updated });
}
