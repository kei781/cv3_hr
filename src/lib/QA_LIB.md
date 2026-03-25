# Lib/인프라 QA 문서

> 최종 검증: 2026-03-25

## 라이브러리 파일 상태

| 파일 | 상태 | 역할 |
|------|------|------|
| `prisma.ts` | ✅ | PrismaClient 싱글턴 |
| `auth.ts` | ✅ | NextAuth 설정 (JWT, CredentialsProvider) |
| `api-auth.ts` | ✅ | `getSessionUser()`, `requireAdmin()` |
| `utils.ts` | ✅ | `cn()` (clsx + twMerge) |
| `mailer.ts` | ✅ | Nodemailer + 재시도 로직 (3회, 지수 백오프) |
| `mail-templates.ts` | ✅ | 승인요청/결과/대리등록/연차촉진 메일 템플릿 |
| `leave-notifications.ts` | ✅ | 상태 변경 시 메일+캘린더 오케스트레이션 |
| `google-calendar.ts` | ✅ | CalendarService (서비스 계정 JWT) |
| `audit.ts` | ✅ | `logAudit()` — AuditLog 기록 |
| `policy-engine.ts` | ✅ | `calculateLeaveDays()`, 연차 자동 부여 로직 |
| `excel-parser.ts` | ✅ | Excel 파싱 (xlsx 패키지) |

## Prisma Schema 핵심 모델

### User
- `roles: String[]` — ["EMPLOYEE", "TEAM_LEAD", "HR", "ADMIN"]
- `status: UserStatus` — INVITED, ACTIVE, INACTIVE
- `departmentId`, `teamId` (optional relations)
- `hireDate: DateTime` — 연차 계산 기준

### Attendance
- Unique: `userId + date`
- `status: AttendanceStatus` — NORMAL, LATE, EARLY_LEAVE, ABSENT, INCOMPLETE, ON_LEAVE, ON_SICK_LEAVE
- `source: AttendanceSource` — EXCEL_UPLOAD, MANUAL

### LeaveBalance
- Unique: `userId + leaveType + year`
- `leaveType: LeaveType` — ANNUAL, SICK, COMPENSATORY
- `grantedDays`, `usedDays`, `remainingDays`

### LeaveRequest
- `leaveType: LeaveRequestType` — ANNUAL, HALF_AM, HALF_PM, QUARTER, SICK, COMPENSATORY
- `status: LeaveStatus` — DRAFT, PENDING_L1, PENDING_L2, APPROVED, REJECTED_L1, REJECTED_L2, CANCELLED
- `l1ApproverId`, `l2ApproverId` — 승인자 참조
- `calendarEventId`, `calendarSynced` — Google Calendar 동기화
- `isProxy: Boolean` — 대리 등록 여부
- `registeredById` — 등록자 (본인 or 관리자)

### AuditLog
- `actorId`, `action`, `targetType`, `targetId`
- `beforeValue: Json?`, `afterValue: Json?`
- `ipAddress: String?`

### MailLog
- `mailType: MailType` — INVITATION, APPROVAL_REQUEST, APPROVAL_RESULT, PROXY_LEAVE_NOTIFICATION, LEAVE_REMINDER
- `status: MailStatus` — PENDING, SENT, FAILED
- `attempts: Int`

## 인증 흐름

```
로그인 → NextAuth signIn("credentials") → JWT 발급
  → middleware.ts: 라우트 보호 (/admin/*, /employee/*)
  → API: getSessionUser() / requireAdmin()
  → 클라이언트: useCurrentUser() 훅
```

### 미들웨어 라우트 규칙
- `/login`: 비인증만 접근 → 인증 시 `/employee/dashboard` 리다이렉트
- `/employee/*`: 인증 필요
- `/admin/*`: 인증 + HR/ADMIN 역할 필요
- `/invite/*`: 공개 (토큰 기반)

### 모드 전환
- `POST /api/auth/switch-mode` — JWT의 `currentMode` 필드 업데이트
- Zustand `auth-store`에서 클라이언트 상태 관리
- ⚠️ **알려진 제한**: 페이지 새로고침 시 Zustand 초기화됨 → 사이드바가 기본 employee 모드로 복귀

## 알려진 미해결 이슈

### 중요 (기능 제한)
1. **모드 전환 미저장 (CRITICAL ARCHITECTURE ISSUE)**
   - `POST /api/auth/switch-mode` 가 JWT 토큰을 업데이트하지 않음
   - currentMode는 Zustand 클라이언트 상태로만 존재
   - **증상**: 새로고침/새탭 시 항상 employee 모드로 초기화
   - **영향**: 사이드바 메뉴 초기화, 서버 API는 mode 인식 불가
   - **수정 방향**: switch-mode API에서 JWT re-encode + 쿠키 갱신, 또는 별도 cookie 사용
   - **참고 파일**: `src/app/api/auth/switch-mode/route.ts`, `src/lib/auth.ts` (line 56), `src/stores/auth-store.ts`

### 비치명적 (기능 동작에 영향 없음)
1. `reject-l2` API: `l2ApprovedAt` 필드명 → `l2RejectedAt` 이 정확 (데이터 의미 불일치)
2. SMTP 미설정 시 메일 발송은 console.log 후 SENT 처리 (개발 편의)
3. Google Calendar 서비스 계정 미설정 시 calendarSynced=false + 에러 로그

### Phase 2/3 범위 (미구현)
- 승인 위임 기능
- 근태 리포트/대시보드 차트
- 정책 설정 UI (현재 읽기 전용)
- 모바일 최적화
- 다국어 지원
