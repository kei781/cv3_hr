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
  const feTeam = await prisma.team.create({
    data: { name: "프론트엔드", departmentId: devDept.id },
  });

  const beTeam = await prisma.team.create({
    data: { name: "백엔드", departmentId: devDept.id },
  });

  const uxTeam = await prisma.team.create({
    data: { name: "UX", departmentId: designDept.id },
  });

  console.log(`Created teams: ${feTeam.name}, ${beTeam.name}, ${uxTeam.name}`);

  // ─── Admin User ────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin1234", 12);

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

  console.log(`Created admin user: ${admin.email}`);

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
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
