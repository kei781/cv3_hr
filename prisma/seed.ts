import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Departments ───────────────────────────────────────
  const devDept = await prisma.department.upsert({
    where: { name: "개발팀" },
    update: {},
    create: { name: "개발팀" },
  });

  const designDept = await prisma.department.upsert({
    where: { name: "디자인팀" },
    update: {},
    create: { name: "디자인팀" },
  });

  console.log(`Created departments: ${devDept.name}, ${designDept.name}`);

  // ─── Teams ─────────────────────────────────────────────
  const feTeam = await prisma.team.upsert({
    where: { id: "seed-team-fe" },
    update: {},
    create: { id: "seed-team-fe", name: "프론트엔드", departmentId: devDept.id },
  });

  const beTeam = await prisma.team.upsert({
    where: { id: "seed-team-be" },
    update: {},
    create: { id: "seed-team-be", name: "백엔드", departmentId: devDept.id },
  });

  const uxTeam = await prisma.team.upsert({
    where: { id: "seed-team-ux" },
    update: {},
    create: { id: "seed-team-ux", name: "UX", departmentId: designDept.id },
  });

  console.log(`Created teams: ${feTeam.name}, ${beTeam.name}, ${uxTeam.name}`);

  // ─── Users ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin1234", 12);
  const userHash = await bcrypt.hash("user1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cv3.com" },
    update: {},
    create: {
      email: "admin@cv3.com",
      name: "관리자",
      passwordHash,
      position: "시스템 관리자",
      hireDate: new Date("2024-01-01"),
      status: "ACTIVE",
      roles: ["ADMIN", "HR", "EMPLOYEE"],
      departmentId: devDept.id,
      teamId: feTeam.id,
    },
  });

  const hr = await prisma.user.upsert({
    where: { email: "hr@cv3.com" },
    update: {},
    create: {
      email: "hr@cv3.com",
      name: "김인사",
      passwordHash: userHash,
      position: "HR 매니저",
      hireDate: new Date("2024-02-01"),
      status: "ACTIVE",
      roles: ["HR", "EMPLOYEE"],
      departmentId: devDept.id,
      teamId: feTeam.id,
    },
  });

  const teamLead1 = await prisma.user.upsert({
    where: { email: "lead1@cv3.com" },
    update: {},
    create: {
      email: "lead1@cv3.com",
      name: "박팀장",
      passwordHash: userHash,
      position: "프론트엔드 리드",
      hireDate: new Date("2023-06-01"),
      status: "ACTIVE",
      roles: ["TEAM_LEAD", "EMPLOYEE"],
      departmentId: devDept.id,
      teamId: feTeam.id,
    },
  });

  const teamLead2 = await prisma.user.upsert({
    where: { email: "lead2@cv3.com" },
    update: {},
    create: {
      email: "lead2@cv3.com",
      name: "정팀장",
      passwordHash: userHash,
      position: "백엔드 리드",
      hireDate: new Date("2023-03-01"),
      status: "ACTIVE",
      roles: ["TEAM_LEAD", "EMPLOYEE"],
      departmentId: devDept.id,
      teamId: beTeam.id,
    },
  });

  const employees = [];
  const empData = [
    { email: "emp1@cv3.com", name: "이개발", position: "프론트엔드 개발자", hireDate: "2024-03-01", teamId: feTeam.id, deptId: devDept.id },
    { email: "emp2@cv3.com", name: "최개발", position: "프론트엔드 개발자", hireDate: "2024-05-01", teamId: feTeam.id, deptId: devDept.id },
    { email: "emp3@cv3.com", name: "한개발", position: "백엔드 개발자", hireDate: "2024-01-15", teamId: beTeam.id, deptId: devDept.id },
    { email: "emp4@cv3.com", name: "유개발", position: "백엔드 개발자", hireDate: "2024-07-01", teamId: beTeam.id, deptId: devDept.id },
    { email: "emp5@cv3.com", name: "서디자인", position: "UX 디자이너", hireDate: "2024-04-01", teamId: uxTeam.id, deptId: designDept.id },
  ];

  for (const e of empData) {
    const emp = await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        name: e.name,
        passwordHash: userHash,
        position: e.position,
        hireDate: new Date(e.hireDate),
        status: "ACTIVE",
        roles: ["EMPLOYEE"],
        departmentId: e.deptId,
        teamId: e.teamId,
      },
    });
    employees.push(emp);
  }

  console.log(`Created users: admin, hr, 2 team leads, ${employees.length} employees`);

  // ─── Leave Balances ────────────────────────────────────
  const allUsers = [admin, hr, teamLead1, teamLead2, ...employees];
  const currentYear = new Date().getFullYear();

  for (const u of allUsers) {
    // Annual leave
    await prisma.leaveBalance.upsert({
      where: { userId_leaveType_year: { userId: u.id, leaveType: "ANNUAL", year: currentYear } },
      update: {},
      create: {
        userId: u.id,
        leaveType: "ANNUAL",
        year: currentYear,
        grantedDays: 15,
        usedDays: 0,
        remainingDays: 15,
        grantedReason: "AUTO",
      },
    });
    // Sick leave
    await prisma.leaveBalance.upsert({
      where: { userId_leaveType_year: { userId: u.id, leaveType: "SICK", year: currentYear } },
      update: {},
      create: {
        userId: u.id,
        leaveType: "SICK",
        year: currentYear,
        grantedDays: 3,
        usedDays: 0,
        remainingDays: 3,
        grantedReason: "AUTO",
      },
    });
  }

  console.log(`Created leave balances for ${allUsers.length} users`);

  // ─── Sample Attendance (this month) ────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const u of allUsers) {
    for (let d = new Date(monthStart); d <= now; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day === 0 || day === 6) continue; // Skip weekends

      const dateStr = new Date(d);
      dateStr.setHours(0, 0, 0, 0);

      // Random variation: 5% late, 2% absent
      const roll = Math.random();
      let status: "NORMAL" | "LATE" | "ABSENT" = "NORMAL";
      let clockIn = "09:00";
      let clockOut: string | null = "18:00";

      if (roll < 0.02) {
        status = "ABSENT";
        clockIn = "00:00";
        clockOut = null;
      } else if (roll < 0.07) {
        status = "LATE";
        const lateMin = Math.floor(Math.random() * 30) + 5;
        const h = Math.floor(lateMin / 60) + 9;
        const m = lateMin % 60;
        clockIn = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }

      await prisma.attendance.upsert({
        where: { userId_date: { userId: u.id, date: dateStr } },
        update: {},
        create: {
          userId: u.id,
          date: dateStr,
          clockIn,
          clockOut,
          actualWorkHours: status === "ABSENT" ? 0 : 8,
          overtimeHours: 0,
          status,
          source: "EXCEL_UPLOAD",
        },
      });
    }
  }

  console.log("Created sample attendance records");

  // ─── Sample Leave Requests ─────────────────────────────
  const emp1 = employees[0];
  const emp2 = employees[1];
  const emp3 = employees[2];

  // Approved annual leave for emp1 (next week)
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
  nextMonday.setHours(0, 0, 0, 0);
  const nextTuesday = new Date(nextMonday);
  nextTuesday.setDate(nextMonday.getDate() + 1);

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-1" },
    update: {},
    create: {
      id: "seed-leave-1",
      userId: emp1.id,
      registeredById: emp1.id,
      leaveType: "ANNUAL",
      startDate: nextMonday,
      endDate: nextTuesday,
      days: 2,
      reason: "개인 사유",
      status: "APPROVED",
    },
  });

  // Update balance for emp1
  await prisma.leaveBalance.update({
    where: { userId_leaveType_year: { userId: emp1.id, leaveType: "ANNUAL", year: currentYear } },
    data: { usedDays: 2, remainingDays: 13 },
  });

  // Pending SICK leave for emp2 (awaiting L1)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-2" },
    update: {},
    create: {
      id: "seed-leave-2",
      userId: emp2.id,
      registeredById: emp2.id,
      leaveType: "SICK",
      startDate: tomorrow,
      endDate: tomorrow,
      days: 1,
      reason: "병원 진료",
      status: "PENDING_L1",
      l1ApproverId: teamLead1.id,
    },
  });

  // Proxy leave for emp3 (created by admin, auto-approved)
  const nextFriday = new Date(nextMonday);
  nextFriday.setDate(nextMonday.getDate() + 4);

  await prisma.leaveRequest.upsert({
    where: { id: "seed-leave-3" },
    update: {},
    create: {
      id: "seed-leave-3",
      userId: emp3.id,
      registeredById: admin.id,
      leaveType: "HALF_AM",
      startDate: nextFriday,
      endDate: nextFriday,
      days: 0.5,
      reason: "관리자 대리 등록",
      status: "APPROVED",
      isProxy: true,
    },
  });

  await prisma.leaveBalance.update({
    where: { userId_leaveType_year: { userId: emp3.id, leaveType: "ANNUAL", year: currentYear } },
    data: { usedDays: 0.5, remainingDays: 14.5 },
  });

  console.log("Created sample leave requests");

  // ─── Policy Configs ────────────────────────────────────
  const policies = [
    { key: "work_hours.standard_start", value: "09:00" },
    { key: "work_hours.standard_end", value: "18:00" },
    { key: "work_hours.lunch_minutes", value: 60 },
    { key: "leave.annual.first_year_monthly", value: 1 },
    { key: "leave.annual.base_days", value: 15 },
    { key: "leave.annual.additional_per_2_years", value: 1 },
    { key: "leave.annual.max_cap", value: 25 },
    { key: "leave.sick.days_per_year", value: 3 },
    { key: "leave.half_day_enabled", value: true },
    { key: "leave.quarter_day_enabled", value: true },
    { key: "overtime.min_unit_minutes", value: 30 },
    { key: "overtime.compensation_rate", value: 1.5 },
    { key: "admin_proxy_leave.auto_approve", value: true },
    { key: "invitation.expiry_hours", value: 72 },
  ];

  for (const p of policies) {
    await prisma.policyConfig.upsert({
      where: { key: p.key },
      update: { value: p.value, updatedById: admin.id },
      create: { key: p.key, value: p.value, updatedById: admin.id },
    });
  }

  console.log(`Created ${policies.length} policy configs`);
  console.log("\nSeeding complete!");
  console.log("\nTest accounts:");
  console.log("  admin@cv3.com / admin1234 (ADMIN, HR)");
  console.log("  hr@cv3.com / user1234 (HR)");
  console.log("  lead1@cv3.com / user1234 (TEAM_LEAD, 프론트엔드)");
  console.log("  lead2@cv3.com / user1234 (TEAM_LEAD, 백엔드)");
  console.log("  emp1~5@cv3.com / user1234 (EMPLOYEE)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
