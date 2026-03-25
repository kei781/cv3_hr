# Employee 모드 QA 문서

> 최종 검증: 2026-03-25
> 빌드: PASS (Next.js 16.2.1 Turbopack)

## 페이지 상태

| 경로 | 상태 | 비고 |
|------|------|------|
| `/employee/dashboard` | ✅ PASS | 오늘근태/잔여연차/다가오는휴가/승인대기(TEAM_LEAD) 카드 |
| `/employee/attendance` | ✅ PASS | 월별 캘린더, 출퇴근 기록, 정상/지각/결근 상태 |
| `/employee/leaves` | ✅ PASS | 탭 필터(전체/대기/승인/반려/취소), 취소 기능 |
| `/employee/leaves/new` | ✅ PASS | 유형선택, 날짜, 자동계산, 잔여연차, 병가시 승인자선택 |
| `/employee/balance` | ✅ PASS | 연차/병가/보상휴가 프로그레스 바 |
| `/employee/approvals` | ✅ PASS | 대기중/완료 탭, 승인/반려 기능 |
| `/employee/profile` | ✅ PASS | 세션 기반 프로필 표시 |

## 수정 이력

### 로그인 (login/page.tsx)
- **문제**: `@base-ui/react`의 ButtonPrimitive가 `type="button"` 강제 → form submit 불가
- **해결**: 네이티브 `<input>`, `<button type="submit">` 사용, uncontrolled ref 패턴
- **문제**: `router.push()` 가 세션 쿠키 반영 전 실행 → 로그인 후 리다이렉트 실패
- **해결**: `window.location.href` 로 full page navigation

### 근태 (attendance/page.tsx)
- **문제**: `setRecords(data)` → API가 `{ data: [...] }` 반환하므로 `records is not iterable`
- **해결**: `setRecords(json.data ?? [])`
- **문제**: ISO datetime key (`2026-03-25T00:00:00.000Z`) vs `yyyy-MM-dd` → 캘린더에 기록 미표시
- **해결**: `r.date.substring(0, 10)` 으로 key 정규화

### 잔여현황 (balance/page.tsx)
- **문제**: API가 `{ data: { balances: [...], recentLeaves: [...] } }` 반환 → 페이지가 `{ annual: {...} }` 형태 기대
- **해결**: `toBalanceCategory()` 변환 함수 추가, `balances` 배열에서 타입별 추출

### 휴가 목록 (leaves/page.tsx)
- **문제**: `leave.type` → Prisma 필드명은 `leaveType`
- **해결**: 인터페이스 및 렌더링 코드에서 `leaveType`으로 통일
- **문제**: `data.leaves ?? data` → API가 `{ data: [...] }` 반환
- **해결**: `json.data ?? []`

### 휴가 신청 (leaves/new/page.tsx)
- **문제**: 프론트 `type` → API `leaveType`, 프론트 `approverId` → API `l1ApproverId`
- **해결**: 필드명 통일
- **문제**: `<Card size="sm">` → Card에 size prop 미지원
- **해결**: `<Card>` 로 변경
- **문제**: balance/approver API 응답 `.data` 미추출
- **해결**: `json.data.balances`, `json.data` 추출

### 승인함 (approvals/page.tsx)
- **문제**: API가 `{ data: { pending: [...], completed: [...] } }` 반환 → `items.filter` 크래시
- **해결**: `[...(d.pending ?? []), ...(d.completed ?? [])]` 병합

## 핵심 유의사항

### @base-ui/react 제약
- `ButtonPrimitive`는 항상 `type="button"` 렌더링 → **form submit이 필요한 곳에서는 네이티브 `<button type="submit">` 사용 필수**
- `InputPrimitive`는 브라우저 자동화 도구의 `type` 이벤트에 React state 업데이트 안 됨 (실제 사용자 키보드 입력은 정상)

### API 응답 규칙
- **모든 API는 `{ data: ... }` 래핑** → 프론트에서 반드시 `json.data` 추출
- 페이지네이션 있는 경우: `{ data: [...], pagination: { page, limit, total, totalPages } }`
- 에러: `{ error: "메시지" }` 또는 `{ error: { code, message } }`

### Prisma 필드명 규칙
- 휴가 유형: `leaveType` (NOT `type`)
- 승인자: `l1ApproverId`, `l2ApproverId` (NOT `approverId`)
- 날짜: ISO datetime string → 프론트에서 `.substring(0, 10)` 로 `yyyy-MM-dd` 변환

### 인증 흐름
- NextAuth JWT + session strategy
- middleware에서 `/admin/*`, `/employee/*` 보호
- `getSessionUser()` — API 라우트용
- `requireAdmin()` — HR/ADMIN 역할 체크
- `useCurrentUser()` — 클라이언트 훅
