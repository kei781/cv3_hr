const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "오전반차",
  HALF_PM: "오후반차",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "승인",
  REJECTED_L1: "반려",
  REJECTED_L2: "반려",
};

function baseUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function emailWrapper(content: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1d4ed8; margin-bottom: 24px;">CV3 People</h2>
      ${content}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">본 메일은 CV3 People 시스템에서 자동 발송되었습니다.</p>
    </div>
  `;
}

function linkButton(href: string, text: string): string {
  return `<a href="${href}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; margin: 12px 0;">${text}</a>`;
}

export function approvalRequestTemplate(params: {
  requesterName: string;
  approverName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string | null;
  isL2?: boolean;
}): { subject: string; html: string } {
  const { requesterName, approverName, leaveType, startDate, endDate, days, reason, isL2 } = params;
  const level = isL2 ? "최종 승인" : "1차 승인";
  const link = isL2 ? `${baseUrl()}/admin/approvals` : `${baseUrl()}/employee/approvals`;

  return {
    subject: `[CV3 People] ${requesterName}님의 ${LEAVE_TYPE_LABELS[leaveType] || leaveType} ${level} 요청`,
    html: emailWrapper(`
      <p>${approverName}님, 안녕하세요.</p>
      <p><strong>${requesterName}</strong>님이 휴가를 신청했습니다. ${level}을 요청드립니다.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">유형</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${LEAVE_TYPE_LABELS[leaveType] || leaveType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">기간</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatDate(startDate)} ~ ${formatDate(endDate)} (${days}일)</td></tr>
        ${reason ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">사유</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${reason}</td></tr>` : ""}
      </table>
      ${linkButton(link, "승인 페이지로 이동")}
    `),
  };
}

export function approvalResultTemplate(params: {
  requesterName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: string;
  rejectReason?: string | null;
}): { subject: string; html: string } {
  const { requesterName, leaveType, startDate, endDate, days, status, rejectReason } = params;
  const statusLabel = STATUS_LABELS[status] || status;
  const isApproved = status === "APPROVED";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";

  return {
    subject: `[CV3 People] 휴가 신청 ${statusLabel} 안내`,
    html: emailWrapper(`
      <p>${requesterName}님, 안녕하세요.</p>
      <p>신청하신 휴가가 <strong style="color: ${statusColor};">${statusLabel}</strong>되었습니다.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">유형</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${LEAVE_TYPE_LABELS[leaveType] || leaveType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">기간</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatDate(startDate)} ~ ${formatDate(endDate)} (${days}일)</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">결과</td><td style="padding: 8px; border: 1px solid #e2e8f0; color: ${statusColor}; font-weight: bold;">${statusLabel}</td></tr>
        ${rejectReason ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">반려 사유</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${rejectReason}</td></tr>` : ""}
      </table>
      ${linkButton(`${baseUrl()}/employee/leaves`, "내 휴가 현황 보기")}
    `),
  };
}

export function proxyLeaveNotificationTemplate(params: {
  employeeName: string;
  adminName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string | null;
}): { subject: string; html: string } {
  const { employeeName, adminName, leaveType, startDate, endDate, days, reason } = params;

  return {
    subject: `[CV3 People] ${adminName}님이 휴가를 대리 등록했습니다`,
    html: emailWrapper(`
      <p>${employeeName}님, 안녕하세요.</p>
      <p><strong>${adminName}</strong>님이 귀하의 휴가를 대리 등록했습니다.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">유형</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${LEAVE_TYPE_LABELS[leaveType] || leaveType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">기간</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${formatDate(startDate)} ~ ${formatDate(endDate)} (${days}일)</td></tr>
        ${reason ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">사유</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${reason}</td></tr>` : ""}
      </table>
      ${linkButton(`${baseUrl()}/employee/leaves`, "내 휴가 현황 보기")}
    `),
  };
}

export function leaveReminderTemplate(params: {
  employeeName: string;
  balances: Array<{ type: string; remaining: number; expiresAt?: Date | null }>;
}): { subject: string; html: string } {
  const { employeeName, balances } = params;
  const balanceTypeLabels: Record<string, string> = {
    ANNUAL: "연차",
    SICK: "병가",
    COMPENSATORY: "보상휴가",
  };

  const rows = balances
    .map(
      (b) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e2e8f0;">${balanceTypeLabels[b.type] || b.type}</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${b.remaining}일</td>
      <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${b.expiresAt ? formatDate(b.expiresAt) : "-"}</td>
    </tr>
  `
    )
    .join("");

  return {
    subject: `[CV3 People] 잔여 연차 안내`,
    html: emailWrapper(`
      <p>${employeeName}님, 안녕하세요.</p>
      <p>현재 잔여 휴가를 안내드립니다. 소멸 전 사용을 권장합니다.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
        <tr style="background: #f8fafc;">
          <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">유형</th>
          <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">잔여일</th>
          <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">소멸일</th>
        </tr>
        ${rows}
      </table>
      ${linkButton(`${baseUrl()}/employee/leaves`, "휴가 신청하기")}
    `),
  };
}
