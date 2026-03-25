# Prisma Schema & Seed QA 문서

> 최종 검증: 2026-03-25

## 시드 데이터

| 데이터 | 수량 | 비고 |
|--------|------|------|
| Department | 2 | 개발팀, 디자인팀 |
| Team | 3 | 프론트엔드, 백엔드, UX |
| User (ADMIN) | 1 | admin@cv3.com / admin1234 |
| User (HR) | 1 | hr@cv3.com / user1234 |
| User (TEAM_LEAD) | 2 | lead1@cv3.com, lead2@cv3.com / user1234 |
| User (EMPLOYEE) | 5 | emp1~5@cv3.com / user1234 |
| LeaveBalance | 18 | 9명 × (ANNUAL + SICK) |
| Attendance | ~180 | 이번 달 평일 × 9명 (5% 지각, 2% 결근) |
| LeaveRequest | 3 | 1 APPROVED, 1 PENDING_L1, 1 APPROVED(proxy) |
| PolicyConfig | 14 | 근무시간/연차/병가/추가근무/초대 정책 |

## seed 실행 시 유의사항

- `prisma db push` 먼저 실행 (스키마 동기화)
- Team에 fixed ID 사용 (`seed-team-fe` 등) → upsert 안전
- LeaveRequest에 fixed ID 사용 (`seed-leave-1` 등) → 중복 방지
- 비밀번호: bcrypt hash (rounds=12)
- 시드는 **멱등** (upsert 패턴) → 재실행 안전

## 스키마-프론트엔드 필드명 매핑

| Prisma 필드 | 프론트엔드에서 사용할 때 | 주의 |
|------------|----------------------|------|
| `leaveType` | `leaveType` | ~~`type`~~ 사용 금지 |
| `l1ApproverId` | `l1ApproverId` | ~~`approverId`~~ 사용 금지 |
| `date` (DateTime) | `.substring(0, 10)` | ISO string → yyyy-MM-dd 변환 필요 |
| `grantedDays` | `grantedDays` | ~~`total`~~ 사용 금지 |
| `remainingDays` | `remainingDays` | ~~`remaining`~~ 사용 금지 |
| `passwordHash` | 절대 클라이언트 노출 금지 | select에서 제외 |

## Unique 제약조건

| 모델 | 필드 | 용도 |
|------|------|------|
| User | `email` | 이메일 중복 방지 |
| Attendance | `userId + date` | 일별 1개 기록 |
| LeaveBalance | `userId + leaveType + year` | 연도별 잔여 관리 |
| Department | `name` | 부서명 중복 방지 |
| PolicyConfig | `key` | 정책 키 유일성 |
