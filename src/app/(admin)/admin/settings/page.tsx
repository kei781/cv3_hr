"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface PolicyConfig {
  id: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

const POLICY_LABELS: Record<string, string> = {
  "work_hours.standard_start": "출근 시간",
  "work_hours.standard_end": "퇴근 시간",
  "work_hours.lunch_minutes": "점심 시간 (분)",
  "leave.annual.first_year_monthly": "1년차 월별 부여",
  "leave.annual.base_days": "연차 기본일수",
  "leave.annual.additional_per_2_years": "2년 근속당 추가일",
  "leave.annual.max_cap": "연차 최대한도",
  "leave.sick.days_per_year": "병가 연간 일수",
  "leave.half_day_enabled": "반차 사용 여부",
  "leave.quarter_day_enabled": "반반차 사용 여부",
  "overtime.min_unit_minutes": "추가근무 최소단위 (분)",
  "overtime.compensation_rate": "보상휴가 환산율",
  "admin_proxy_leave.auto_approve": "대리 등록 자동승인",
  "invitation.expiry_hours": "초대 만료 시간",
};

export default function SettingsPage() {
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const json = await res.json();
        setPolicies(json.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>정책 설정</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>설정</TableHead>
                  <TableHead>키</TableHead>
                  <TableHead>값</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{POLICY_LABELS[p.key] || p.key}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.key}</TableCell>
                    <TableCell>{String(p.value)}</TableCell>
                  </TableRow>
                ))}
                {policies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      설정된 정책이 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
