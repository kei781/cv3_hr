"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  getDay,
  format,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { Badge } from "@/components/ui/badge";

type AttendanceStatus =
  | "NORMAL"
  | "LATE"
  | "EARLY_LEAVE"
  | "ABSENT"
  | "ON_LEAVE"
  | "ON_SICK_LEAVE"
  | "INCOMPLETE";

interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  NORMAL: "정상",
  LATE: "지각",
  EARLY_LEAVE: "조퇴",
  ABSENT: "결근",
  ON_LEAVE: "휴가",
  ON_SICK_LEAVE: "병가",
  INCOMPLETE: "미완료",
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  NORMAL: "bg-green-100 text-green-700",
  LATE: "bg-yellow-100 text-yellow-700",
  EARLY_LEAVE: "bg-orange-100 text-orange-700",
  ABSENT: "bg-red-100 text-red-700",
  ON_LEAVE: "bg-blue-100 text-blue-700",
  ON_SICK_LEAVE: "bg-purple-100 text-purple-700",
  INCOMPLETE: "bg-gray-100 text-gray-500 border-dashed",
};

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

export default function MyAttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await fetch(`/api/attendance?year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setRecords(json.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance(currentMonth);
  }, [currentMonth, fetchAttendance]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDayOfWeek = getDay(monthStart);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of records) {
    // r.date comes as ISO string from API, normalize to yyyy-MM-dd
    const key = r.date.substring(0, 10);
    recordMap.set(key, r);
  }

  // Build calendar grid cells
  const totalCells = startDayOfWeek + daysInMonth.length;
  const rows = Math.ceil(totalCells / 7);
  const gridCells: (Date | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    gridCells.push(null);
  }
  for (const day of daysInMonth) {
    gridCells.push(day);
  }
  while (gridCells.length < rows * 7) {
    gridCells.push(null);
  }

  const handlePrev = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNext = () => setCurrentMonth((prev) => addMonths(prev, 1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">내 근태</h1>

      {/* Year/Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          &lt;
        </button>
        <span className="text-lg font-semibold min-w-[140px] text-center">
          {format(currentMonth, "yyyy")}년 {format(currentMonth, "MM")}월
        </span>
        <button
          onClick={handleNext}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          &gt;
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px]">
          {/* Day Headers */}
          {DAY_HEADERS.map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-sm font-semibold border-b ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
              }`}
            >
              {day}
            </div>
          ))}

          {/* Day Cells */}
          {gridCells.map((date, idx) => {
            const colIndex = idx % 7;
            const isWeekend = colIndex === 0 || colIndex === 6;
            const dateStr = date ? format(date, "yyyy-MM-dd") : null;
            const record = dateStr ? recordMap.get(dateStr) : null;
            const today = date ? isToday(date) : false;
            const inMonth = date ? isSameMonth(date, currentMonth) : false;

            return (
              <div
                key={idx}
                className={`min-h-[100px] border p-1.5 ${
                  isWeekend ? "bg-gray-50" : ""
                } ${today ? "ring-2 ring-blue-500 ring-inset" : ""} ${
                  !inMonth && date ? "opacity-30" : ""
                }`}
              >
                {date && (
                  <>
                    <div
                      className={`text-xs font-medium mb-1 ${
                        colIndex === 0
                          ? "text-red-500"
                          : colIndex === 6
                            ? "text-blue-500"
                            : "text-foreground"
                      }`}
                    >
                      {format(date, "d")}
                    </div>

                    {record && (
                      <div className="space-y-0.5">
                        {record.clockIn && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            IN {record.clockIn}
                          </div>
                        )}
                        {record.clockOut && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            OUT {record.clockOut}
                          </div>
                        )}
                        <Badge
                          className={`${STATUS_COLORS[record.status]} text-[10px] px-1.5 py-0 h-4 border`}
                        >
                          {STATUS_LABELS[record.status]}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-muted-foreground">
          로딩 중...
        </div>
      )}
    </div>
  );
}
