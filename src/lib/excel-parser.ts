import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────

export interface ColumnMappingConfig {
  employee_identifier: { column: string; type: "employee_id" | "name" | "email" };
  date: { column: string; format: string };
  clock_in: { column: string; format: string };
  clock_out: { column: string; format: string };
  department?: { column: string; optional: true };
  note?: { column: string; optional: true };
  header_row: number;
  data_start_row: number;
}

export const DEFAULT_TEMPLATE: ColumnMappingConfig = {
  employee_identifier: { column: "A", type: "name" },
  date: { column: "B", format: "YYYY-MM-DD" },
  clock_in: { column: "C", format: "HH:mm" },
  clock_out: { column: "D", format: "HH:mm" },
  header_row: 1,
  data_start_row: 2,
};

export type RowSeverity = "OK" | "ERROR" | "WARNING";

export interface ParsedRow {
  rowNum: number;
  severity: RowSeverity;
  messages: string[];
  raw: Record<string, string>;
  parsed: {
    employeeIdentifier: string | null;
    date: string | null;
    clockIn: string | null;
    clockOut: string | null;
  };
  computed: {
    userId: string | null;
    userName: string | null;
    actualWorkHours: number | null;
    overtimeHours: number | null;
    status: string | null;
  };
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  summary: {
    total: number;
    ok: number;
    errors: number;
    warnings: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────

function colLetterToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

function getCellValue(row: unknown[], colLetter: string): string {
  const idx = colLetterToIndex(colLetter.toUpperCase());
  const val = row[idx];
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function parseTimeString(val: string): string | null {
  if (!val) return null;
  // Handle HH:mm format
  const timeMatch = val.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, "0");
    const m = timeMatch[2];
    return `${h}:${m}`;
  }
  // Handle Excel serial time (0.0 - 1.0)
  const num = Number(val);
  if (!isNaN(num) && num >= 0 && num < 2) {
    const totalMinutes = Math.round(num * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  return null;
}

function parseDateString(val: string): string | null {
  if (!val) return null;
  // Handle YYYY-MM-DD
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // Handle YYYY/MM/DD
  const slashMatch = val.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (slashMatch) return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  // Handle Excel serial date
  const num = Number(val);
  if (!isNaN(num) && num > 30000 && num < 100000) {
    const date = XLSX.SSF.parse_date_code(num);
    if (date) {
      const y = String(date.y);
      const mo = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${mo}-${d}`;
    }
  }
  return null;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// ─── Main Parser ─────────────────────────────────────────

export function parseExcelBuffer(
  buffer: Buffer,
  mapping: ColumnMappingConfig,
  users: { id: string; name: string; email: string }[],
  policyConfig: { standardStart: string; standardEnd: string; lunchMinutes: number }
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = (allRows[mapping.header_row - 1] || []).map(String);
  const dataRows = allRows.slice(mapping.data_start_row - 1);

  // Build lookup maps
  const userByName = new Map(users.map((u) => [u.name.toLowerCase(), u]));
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  const seenDates = new Map<string, number>(); // "userId:date" → rowNum

  const rows: ParsedRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i] as unknown[];
    if (!raw || raw.every((c) => c === undefined || c === null || c === "")) continue;

    const rowNum = mapping.data_start_row + i;
    const messages: string[] = [];
    let severity: RowSeverity = "OK";

    // Extract raw values
    const empIdRaw = getCellValue(raw, mapping.employee_identifier.column);
    const dateRaw = getCellValue(raw, mapping.date.column);
    const clockInRaw = getCellValue(raw, mapping.clock_in.column);
    const clockOutRaw = getCellValue(raw, mapping.clock_out.column);

    const rawRecord: Record<string, string> = {
      employee: empIdRaw,
      date: dateRaw,
      clockIn: clockInRaw,
      clockOut: clockOutRaw,
    };

    // Parse date
    const dateStr = parseDateString(dateRaw);
    if (!dateStr) {
      severity = "ERROR";
      messages.push("날짜 형식 오류");
    }

    // Parse times
    const clockIn = parseTimeString(clockInRaw);
    const clockOut = parseTimeString(clockOutRaw);

    if (!clockIn) {
      if (severity !== "ERROR") severity = "WARNING";
      messages.push("출근시간 누락");
    }

    if (!clockOut) {
      if (severity !== "ERROR") severity = "WARNING";
      messages.push("퇴근시간 누락");
    }

    // Resolve user
    let resolvedUser: { id: string; name: string } | null = null;
    if (empIdRaw) {
      const idLower = empIdRaw.toLowerCase();
      if (mapping.employee_identifier.type === "email") {
        const found = userByEmail.get(idLower);
        if (found) resolvedUser = found;
      } else if (mapping.employee_identifier.type === "name") {
        const found = userByName.get(idLower);
        if (found) resolvedUser = found;
      }
    }

    if (!resolvedUser) {
      severity = "ERROR";
      messages.push(`직원 미존재: ${empIdRaw}`);
    }

    // Check duplicate
    if (resolvedUser && dateStr) {
      const key = `${resolvedUser.id}:${dateStr}`;
      const prevRow = seenDates.get(key);
      if (prevRow) {
        if (severity !== "ERROR") severity = "WARNING";
        messages.push(`${prevRow}행과 동일날짜 중복`);
      } else {
        seenDates.set(key, rowNum);
      }
    }

    // Compute work hours
    let actualWorkHours: number | null = null;
    let overtimeHours: number | null = null;
    let status: string | null = null;

    if (clockIn && clockOut) {
      let inMin = timeToMinutes(clockIn);
      let outMin = timeToMinutes(clockOut);

      // 야간근무: clockOut < clockIn
      if (outMin < inMin) {
        if (severity !== "ERROR") severity = "WARNING";
        messages.push("야간근무 감지 (퇴근 < 출근)");
        outMin += 24 * 60;
      }

      const totalMin = outMin - inMin;
      actualWorkHours = Math.max(0, (totalMin - policyConfig.lunchMinutes) / 60);
      actualWorkHours = Math.round(actualWorkHours * 100) / 100;
      overtimeHours = Math.max(0, actualWorkHours - 8);
      overtimeHours = Math.round(overtimeHours * 100) / 100;

      // Status
      const stdStartMin = timeToMinutes(policyConfig.standardStart);
      const stdEndMin = timeToMinutes(policyConfig.standardEnd);

      if (inMin > stdStartMin) {
        status = "LATE";
      } else if (outMin < stdEndMin) {
        status = "EARLY_LEAVE";
      } else {
        status = "NORMAL";
      }
    } else if (clockIn && !clockOut) {
      status = "INCOMPLETE";
    } else {
      status = "ABSENT";
    }

    rows.push({
      rowNum,
      severity,
      messages,
      raw: rawRecord,
      parsed: {
        employeeIdentifier: empIdRaw || null,
        date: dateStr,
        clockIn,
        clockOut,
      },
      computed: {
        userId: resolvedUser?.id ?? null,
        userName: resolvedUser?.name ?? null,
        actualWorkHours,
        overtimeHours,
        status,
      },
    });
  }

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => r.severity === "OK").length,
    errors: rows.filter((r) => r.severity === "ERROR").length,
    warnings: rows.filter((r) => r.severity === "WARNING").length,
  };

  return { headers, rows, summary };
}
