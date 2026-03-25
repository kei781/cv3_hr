# Admin 모드 QA 문서

> 최종 검증: 2026-03-25
> 빌드: PASS (Next.js 16.2.1 Turbopack)

## 페이지 상태

| 경로 | 상태 | 비고 |
|------|------|------|
| `/admin/dashboard` | ✅ PASS | 출근현황/승인대기/근태요약/캘린더경고/휴가자목록 |
| `/admin/users` | ✅ PASS | 직원 목록, 검색/필터, 페이지네이션 |
| `/admin/users/[id]` | ✅ PASS | 직원 상세, 역할/부서/팀 수정 |
| `/admin/users/invite` | ✅ PASS | 직원 초대 폼 |
| `/admin/attendance` | ✅ PASS | 부서/직원 선택 → 캘린더 근태 조회 |
| `/admin/attendance/upload` | ⚠️ 부분 | Excel 파싱은 excel-parser.ts 의존 |
| `/admin/leaves` | ✅ PASS | 휴가관리 네비게이션 (대리등록 링크) |
| `/admin/leaves/proxy` | ✅ PASS | 대리 휴가 등록 폼 |
| `/admin/approvals` | ✅ PASS | L2 승인 대기 목록, 승인/반려 |
| `/admin/overtime` | ✅ PASS | 추가근무 후보 목록, 승인/반려/일괄승인 |
| `/admin/invitations` | ✅ PASS | 초대 목록, 재발송/취소 |
| `/admin/calendar` | ✅ PASS | 팀별 캘린더 ID 매핑, 동기화실패 목록 |
| `/admin/mail` | ✅ PASS | 연차촉진 미리보기/발송, 발송이력 |
| `/admin/settings` | ✅ PASS | 14개 정책 설정 테이블 (읽기전용) |
| `/admin/audit-log` | ✅ PASS | 필터/페이지네이션/CSV내보내기/상세모달 |

## 수정 이력

### 직원관리 (users/page.tsx)
- **문제**: `data.users` → API가 `{ data: [...], pagination: {...} }` 반환
- **해결**: `json.data`, `json.pagination.total`, `json.pagination.totalPages`
- **문제**: departments API `data.departments ?? data`
- **해결**: `data.data ?? []`

### 직원 상세 (users/[id]/page.tsx)
- **문제**: user/departments/teams fetch에서 `.data` 미추출
- **해결**: `json.data ?? json` 패턴 적용

### 근태관리 (attendance/page.tsx)
- **문제**: departments/users/teams/attendance 4개 fetch 모두 `.data` 미추출
- **해결**: 전부 `json.data ?? []` 패턴 적용

## API 엔드포인트 상태

### 인증/권한
| 엔드포인트 | 인증 | 비고 |
|-----------|------|------|
| `GET /api/admin/*` | `requireAdmin()` | HR 또는 ADMIN 역할 필요 |
| `POST /api/admin/*` | `requireAdmin()` | 동일 |

### 주요 API
| 엔드포인트 | 상태 | 응답 형식 |
|-----------|------|----------|
| `GET /api/admin/dashboard` | ✅ | `{ data: { totalActiveUsers, todayAttendanceCount, ... } }` |
| `GET /api/admin/users` | ✅ | `{ data: users[], pagination }` |
| `GET /api/admin/users/[id]` | ✅ | `{ data: user }` |
| `PATCH /api/admin/users/[id]` | ✅ | `{ data: updated }` |
| `POST /api/admin/users/[id]/deactivate` | ✅ | `{ data: user }` |
| `GET /api/admin/departments` | ✅ | `{ data: departments[] }` |
| `GET /api/admin/teams` | ✅ | `{ data: teams[] }` |
| `GET /api/admin/invitations` | ✅ | `{ data: invitations[] }` |
| `POST /api/admin/invitations` | ✅ | `{ data: invitation }` |
| `GET /api/admin/approvals` | ✅ | `{ data: pending[] }` |
| `POST /api/approvals/[id]/approve-l2` | ✅ | 잔여일 차감 포함 |
| `POST /api/approvals/[id]/reject-l2` | ⚠️ | `l2ApprovedAt` → `l2RejectedAt` 필드명 오류 (비치명적) |
| `GET /api/admin/overtime/candidates` | ✅ | `{ data: candidates[] }` |
| `POST /api/admin/overtime/[id]/approve` | ✅ | 보상휴가 자동 적립 |
| `POST /api/admin/overtime/bulk-approve` | ✅ | 일괄 승인 |
| `GET /api/admin/calendar/sync-failures` | ✅ | APPROVED && !calendarSynced |
| `POST /api/admin/calendar/force-sync` | ✅ | calendarSynced 업데이트 |
| `GET /api/admin/mail/logs` | ✅ | 페이지네이션 포함 |
| `POST /api/admin/mail/leave-reminder` | ✅ | 일괄 발송 |
| `GET /api/admin/audit-logs` | ✅ | 필터/페이지네이션 |
| `GET /api/admin/audit-logs/export` | ✅ | CSV 다운로드 (BOM UTF-8) |
| `GET /api/admin/settings` | ✅ | PolicyConfig 목록 |

## 핵심 유의사항

### 승인 워크플로우
- **연차**: 잔여일 충분 → 자동 APPROVED (L1/L2 불필요)
- **병가**: PENDING_L1 → (TEAM_LEAD 승인) → PENDING_L2 → (HR 승인) → APPROVED
- **대리 등록**: `admin_proxy_leave.auto_approve` 정책에 따라 자동 승인 가능
- 승인 시 `notifyLeaveStatusChange()` fire-and-forget 호출 → 메일 + 캘린더 동기화

### Google Calendar 동기화
- APPROVED → `syncLeaveToCalendar()` → `calendarEventId` 저장
- CANCELLED/REJECTED → `deleteLeaveFromCalendar()`
- 동기화 조건은 **status 기반** (isProxy, registeredBy 무관)
- 실패 시: `calendarSynced = false`, 3회 재시도 (지수 백오프 1s, 3s, 9s)
- 최종 실패: AuditLog에 CALENDAR_SYNC_FAILED

### 보상휴가 계산
- 승인된 추가근무 시간 × 1.5 = 보상휴가 시간
- 8시간 = 1일
- `overtime/[id]/approve` API에서 자동 적립

### 감사 로그
- `logAudit(actorId, action, targetType, targetId, { before, after })` 패턴
- 모든 상태 변경에서 호출
- CSV 내보내기: BOM 포함 UTF-8 (`\uFEFF` prefix)
