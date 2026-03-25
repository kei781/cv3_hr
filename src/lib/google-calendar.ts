import { google, calendar_v3 } from "googleapis";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "연차",
  HALF_AM: "오전반차",
  HALF_PM: "오후반차",
  QUARTER: "반반차",
  SICK: "병가",
  COMPENSATORY: "보상휴가",
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(3, attempt - 1)));
    }
  }
  throw new Error("unreachable");
}

function getCalendarClient(): calendar_v3.Calendar | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    console.warn("[Calendar] Service account not configured, skipping calendar sync");
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function createLeaveEvent(params: {
  calendarId: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
}): Promise<string | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  const { calendarId, employeeName, leaveType, startDate, endDate } = params;
  const summary = `${employeeName} | ${LEAVE_TYPE_LABELS[leaveType] || leaveType}`;

  let event: calendar_v3.Schema$Event;

  if (leaveType === "HALF_AM") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "09:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "13:00"), timeZone: "Asia/Seoul" },
    };
  } else if (leaveType === "HALF_PM") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "13:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "18:00"), timeZone: "Asia/Seoul" },
    };
  } else if (leaveType === "QUARTER") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "09:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "11:00"), timeZone: "Asia/Seoul" },
    };
  } else {
    // All-day event for ANNUAL, SICK, COMPENSATORY
    const endPlusOne = new Date(endDate);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    event = {
      summary,
      start: { date: toDateString(startDate) },
      end: { date: toDateString(endPlusOne) },
    };
  }

  const res = await calendar.events.insert({ calendarId, requestBody: event });
  return res.data.id ?? null;
}

export async function deleteLeaveEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendarClient();
  if (!calendar) return;

  await calendar.events.delete({ calendarId, eventId });
}

export async function updateLeaveEvent(
  calendarId: string,
  eventId: string,
  params: {
    employeeName: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
  }
): Promise<void> {
  const calendar = getCalendarClient();
  if (!calendar) return;

  const { employeeName, leaveType, startDate, endDate } = params;
  const summary = `${employeeName} | ${LEAVE_TYPE_LABELS[leaveType] || leaveType}`;

  let event: calendar_v3.Schema$Event;

  if (leaveType === "HALF_AM") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "09:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "13:00"), timeZone: "Asia/Seoul" },
    };
  } else if (leaveType === "HALF_PM") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "13:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "18:00"), timeZone: "Asia/Seoul" },
    };
  } else if (leaveType === "QUARTER") {
    event = {
      summary,
      start: { dateTime: toDateTimeString(startDate, "09:00"), timeZone: "Asia/Seoul" },
      end: { dateTime: toDateTimeString(startDate, "11:00"), timeZone: "Asia/Seoul" },
    };
  } else {
    const endPlusOne = new Date(endDate);
    endPlusOne.setDate(endPlusOne.getDate() + 1);
    event = {
      summary,
      start: { date: toDateString(startDate) },
      end: { date: toDateString(endPlusOne) },
    };
  }

  await calendar.events.update({ calendarId, eventId, requestBody: event });
}

export async function syncLeaveToCalendar(leaveId: string): Promise<void> {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      user: { select: { name: true, teamId: true, team: { select: { calendarId: true } } } },
    },
  });

  if (!leave) return;

  const calendarId = leave.user.team?.calendarId;
  if (!calendarId) {
    console.warn(`[Calendar] No calendarId for team of user ${leave.userId}, skipping sync`);
    return;
  }

  try {
    const eventId = await withRetry(() =>
      createLeaveEvent({
        calendarId,
        employeeName: leave.user.name,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
      })
    );

    if (eventId) {
      await prisma.leaveRequest.update({
        where: { id: leaveId },
        data: { calendarEventId: eventId, calendarSynced: true },
      });
    }
  } catch (error) {
    console.error(`[Calendar] Sync failed for leave ${leaveId}:`, error);
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { calendarSynced: false },
    });
    await logAudit({
      actorId: leave.userId,
      action: "CALENDAR_SYNC_FAILED",
      targetType: "LeaveRequest",
      targetId: leaveId,
      after: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

export async function deleteLeaveFromCalendar(leaveId: string): Promise<void> {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      user: { select: { team: { select: { calendarId: true } } } },
    },
  });

  if (!leave || !leave.calendarEventId) return;

  const calendarId = leave.user.team?.calendarId;
  if (!calendarId) return;

  try {
    await withRetry(() => deleteLeaveEvent(calendarId, leave.calendarEventId!));
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { calendarEventId: null, calendarSynced: false },
    });
  } catch (error) {
    console.error(`[Calendar] Delete failed for leave ${leaveId}:`, error);
    await logAudit({
      actorId: leave.userId,
      action: "CALENDAR_DELETE_FAILED",
      targetType: "LeaveRequest",
      targetId: leaveId,
      after: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toDateTimeString(date: Date, time: string): string {
  return `${toDateString(date)}T${time}:00`;
}
