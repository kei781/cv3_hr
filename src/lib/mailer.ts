import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { withRetry } from "./google-calendar";
import type { MailType } from "@prisma/client";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendMailRaw(options: { to: string; subject: string; html: string }): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.log("[Mail] SMTP not configured. Would send:", {
      to: options.to,
      subject: options.subject,
    });
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "CV3 People <noreply@cv3.com>",
    ...options,
  });
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  mailType: MailType;
  leaveRequestId?: string;
}): Promise<string> {
  const { to, subject, html, mailType, leaveRequestId } = params;

  const mailLog = await prisma.mailLog.create({
    data: {
      mailType,
      to,
      subject,
      body: html,
      status: "PENDING",
      leaveRequestId,
    },
  });

  try {
    await withRetry(() => sendMailRaw({ to, subject, html }), 3, 1000);
    await prisma.mailLog.update({
      where: { id: mailLog.id },
      data: { status: "SENT", sentAt: new Date(), attempts: 3 },
    });
  } catch (error) {
    await prisma.mailLog.update({
      where: { id: mailLog.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        attempts: 3,
      },
    });
  }

  return mailLog.id;
}

export async function sendInvitationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/invite/${token}`;

  await sendMail({
    to: email,
    subject: "CV3 People 계정 활성화 초대",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">CV3 People</h2>
        <p>${name}님, CV3 People에 초대되었습니다.</p>
        <p>아래 버튼을 클릭하여 계정을 활성화하세요:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          계정 활성화
        </a>
        <p style="color: #64748b; font-size: 14px;">
          링크: ${url}
        </p>
      </div>
    `,
    mailType: "INVITATION",
  });
}
