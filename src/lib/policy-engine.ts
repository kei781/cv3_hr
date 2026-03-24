import { differenceInYears, differenceInMonths, addYears } from "date-fns";
import { prisma } from "./prisma";

interface PolicyValues {
  annualBaseDays: number;
  annualAdditionalPer2Years: number;
  annualMaxCap: number;
  annualFirstYearMonthly: number;
  sickDaysPerYear: number;
  overtimeCompensationRate: number;
}

export async function loadPolicyValues(): Promise<PolicyValues> {
  const configs = await prisma.policyConfig.findMany({
    where: {
      key: {
        in: [
          "leave.annual.base_days",
          "leave.annual.additional_per_2_years",
          "leave.annual.max_cap",
          "leave.annual.first_year_monthly",
          "leave.sick.days_per_year",
          "overtime.compensation_rate",
        ],
      },
    },
  });
  const m = new Map(configs.map((c) => [c.key, c.value]));
  return {
    annualBaseDays: Number(m.get("leave.annual.base_days")) || 15,
    annualAdditionalPer2Years: Number(m.get("leave.annual.additional_per_2_years")) || 1,
    annualMaxCap: Number(m.get("leave.annual.max_cap")) || 25,
    annualFirstYearMonthly: Number(m.get("leave.annual.first_year_monthly")) || 1,
    sickDaysPerYear: Number(m.get("leave.sick.days_per_year")) || 3,
    overtimeCompensationRate: Number(m.get("overtime.compensation_rate")) || 1.5,
  };
}

export function calculateAnnualLeave(
  hireDate: Date,
  currentDate: Date,
  policy: PolicyValues
): { grantedDays: number; expiresAt: Date } {
  const yearsWorked = differenceInYears(currentDate, hireDate);

  if (yearsWorked < 1) {
    return { grantedDays: 0, expiresAt: addYears(hireDate, 1) };
  }

  const additional = Math.floor((yearsWorked - 1) / 2) * policy.annualAdditionalPer2Years;
  const total = Math.min(policy.annualBaseDays + additional, policy.annualMaxCap);

  return {
    grantedDays: total,
    expiresAt: new Date(currentDate.getFullYear() + 1, 0, 1),
  };
}

export function calculateFirstYearMonthlyLeave(
  hireDate: Date,
  currentDate: Date,
  policy: PolicyValues
): number {
  const months = differenceInMonths(currentDate, hireDate);
  if (months <= 0 || months > 11) return 0;
  return months * policy.annualFirstYearMonthly;
}

export function calculateCompensatoryDays(
  overtimeHours: number,
  compensationRate: number
): number {
  const compensatoryHours = overtimeHours * compensationRate;
  return Math.round((compensatoryHours / 8) * 100) / 100;
}

export function calculateLeaveDays(
  leaveType: string,
  startDate: Date,
  endDate: Date
): number {
  if (leaveType === "HALF_AM" || leaveType === "HALF_PM") return 0.5;
  if (leaveType === "QUARTER") return 0.25;

  // Count business days between start and end (inclusive)
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
