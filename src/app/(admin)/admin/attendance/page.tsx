"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  getDay,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  id: string;
  name: string;
  department: string;
}

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  NORMAL: "정상",
  LATE: "지각",
  EARLY_LEAVE: "조퇴",
  ABSENT: "결근",
  ON_LEAVE: "휴가",
  ON_SICK_LEAVE: "병가",
  INCOMPLETE: "미완료",
};

const STATUS_VARIANT: Record<string, string> = {
  NORMAL: "bg-green-100 text-green-800",
  LATE: "bg-yellow-100 text-yellow-800",
  EARLY_LEAVE: "bg-orange-100 text-orange-800",
  ABSENT: "bg-red-100 text-red-800",
  ON_LEAVE: "bg-blue-100 text-blue-800",
  ON_SICK_LEAVE: "bg-purple-100 text-purple-800",
  INCOMPLETE: "bg-gray-100 text-gray-800",
};

const DAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AttendancePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // Fetch departments
  useEffect(() => {
    fetch("/api/admin/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch(() => {});
  }, []);

  // Fetch users
  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data: User[]) => {
        setUsers(data);
        setFilteredUsers(data);
      })
      .catch(() => {});
  }, []);

  // Fetch teams when department changes
  useEffect(() => {
    setSelectedTeamId("");
    if (selectedDepartmentId) {
      fetch(`/api/admin/teams?departmentId=${selectedDepartmentId}`)
        .then((res) => res.json())
        .then((data) => setTeams(data))
        .catch(() => {});
    } else {
      setTeams([]);
    }
  }, [selectedDepartmentId]);

  // Filter users by department
  useEffect(() => {
    let list = users;
    if (selectedDepartmentId) {
      list = list.filter((u) => u.department === selectedDepartmentId);
    }
    setFilteredUsers(list);
    setSelectedUserId("");
  }, [selectedDepartmentId, users]);

  // Fetch attendance data
  const fetchAttendance = useCallback(() => {
    if (!selectedUserId) {
      setAttendance([]);
      return;
    }
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    fetch(`/api/attendance?userId=${selectedUserId}&year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => setAttendance(data))
      .catch(() => setAttendance([]));
  }, [selectedUserId, currentMonth]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const attendanceMap = new Map<string, AttendanceRecord>();
  attendance.forEach((record) => {
    attendanceMap.set(record.date, record);
  });

  // Summary calculation
  const summary = {
    totalWork: 0,
    normal: 0,
    late: 0,
    earlyLeave: 0,
    absent: 0,
    incomplete: 0,
  };
  attendance.forEach((record) => {
    summary.totalWork++;
    switch (record.status) {
      case "NORMAL":
        summary.normal++;
        break;
      case "LATE":
        summary.late++;
        break;
      case "EARLY_LEAVE":
        summary.earlyLeave++;
        break;
      case "ABSENT":
        summary.absent++;
        break;
      case "INCOMPLETE":
        summary.incomplete++;
        break;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">근태관리</h1>
        <Link href="/admin/attendance/upload">
          <Button variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            엑셀 업로드
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          <option value="">전체 부서</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
          disabled={!selectedDepartmentId}
        >
          <option value="">전체 팀</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <select
          className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">직원 선택</option>
          {filteredUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Year/Month Selector */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold">
          {format(currentMonth, "yyyy")}년 {format(currentMonth, "MM")}월
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {/* Day headers */}
            {DAY_HEADERS.map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-sm font-medium ${
                  i === 0
                    ? "text-red-500"
                    : i === 6
                      ? "text-blue-500"
                      : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border p-1" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const record = attendanceMap.get(dateStr);
              const dayOfWeek = getDay(day);

              return (
                <div
                  key={dateStr}
                  className="min-h-[100px] border p-1"
                >
                  <div
                    className={`text-xs font-medium ${
                      dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                          ? "text-blue-500"
                          : ""
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {record && (
                    <div className="mt-1 space-y-1">
                      {record.clockIn && (
                        <div className="text-[10px] text-muted-foreground">
                          출근 {record.clockIn}
                        </div>
                      )}
                      {record.clockOut && (
                        <div className="text-[10px] text-muted-foreground">
                          퇴근 {record.clockOut}
                        </div>
                      )}
                      {record.status && (
                        <Badge
                          className={`text-[10px] ${STATUS_VARIANT[record.status] ?? ""}`}
                        >
                          {STATUS_LABEL[record.status] ?? record.status}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedUserId && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "총 근무일", value: summary.totalWork },
            { label: "정상 출근", value: summary.normal },
            { label: "지각", value: summary.late },
            { label: "조퇴", value: summary.earlyLeave },
            { label: "결근", value: summary.absent },
            { label: "미완료", value: summary.incomplete },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
