## CV3 People 프로젝트 아키텍처 분석

### 프로젝트 구조

```
src/
├── app/                          # Next.js 16 App Router
│   ├── (admin)/                  # Admin 라우트 그룹 (오렌지 테마)
│   │   ├── admin/dashboard/      
│   │   ├── admin/users/          # 직원관리 + [id] 상세
│   │   ├── admin/attendance/     # 근태관리 + upload
│   │   ├── admin/leaves/         # 휴가관리 + proxy
│   │   ├── admin/approvals/      # 2차 승인
│   │   ├── admin/overtime/       # 추가근무
│   │   ├── admin/calendar/       # Google Calendar 설정
│   │   ├── admin/mail/           # 메일 관리
│   │   ├── admin/settings/       # 정책 설정
│   │   ├── admin/audit-log/      # 감사 로그
│   │   ├── admin/invitations/    # 초대 관리
│   │   └── layout.tsx            # Admin 레이아웃 (인증+권한 가드)
│   ├── (employee)/               # Employee 라우트 그룹 (파란 테마)
│   │   ├── employee/dashboard/
│   │   ├── employee/attendance/
│   │   ├── employee/leaves/      # 목록 + new (신청)
│   │   ├── employee/balance/
│   │   ├── employee/approvals/   # 1차 승인함
│   │   ├── employee/profile/
│   │   └── layout.tsx            # Employee 레이아웃 (인증 가드)
│   ├── (auth)/login/             # 로그인 페이지
│   ├── api/                      # 47개 API 라우트 핸들러
│   └── invite/[token]/           # 공개 초대 수락 페이지
├── components/
│   ├── layout/                   # sidebar, header, mode-switch
│   └── ui/                       # 21개 shadcn/ui 컴포넌트
├── lib/                          # 11개 핵심 비즈니스 로직 모듈
├── hooks/                        # use-current-user 커스텀 훅
├── stores/                       # Zustand 스토어 2개
├── types/                        # TypeScript 타입 정의
└── middleware.ts                  # 라우트 보호 미들웨어
```

### 파일 통계

| 구분 | 수량 |
|------|------|
| 전체 TS/TSX 파일 | 119개 |
| 페이지 컴포넌트 | 25개 |
| API 라우트 | 47개 |
| shadcn/ui 컴포넌트 | 21개 |
| 핵심 라이브러리 | 11개 |

---

### 사용된 디자인 패턴

**1. Singleton Pattern — Prisma Client**
```
prisma.ts: globalThis에 캐싱하여 dev 모드에서 다중 연결 방지
```
- `globalForPrisma.prisma ?? new PrismaClient()` 로 단일 인스턴스 보장

**2. Observer Pattern — 상태 관리**
- **Zustand Store**: `auth-store`(currentMode), `sidebar-store`(isOpen) — 구독 기반 반응형 상태
- **NextAuth SessionProvider**: 세션 변경 시 하위 컴포넌트에 자동 전파

**3. Strategy Pattern — 비즈니스 로직 분리**
- **Policy Engine**: 연차/병가/보상휴가 각각 다른 계산 전략
- **Mail Templates**: 승인요청/결과/대리등록/연차촉진 등 알림 유형별 템플릿 전략
- **Leave Status Handler**: `notifyLeaveStatusChange()`에서 상태별 switch-case 분기

**4. Guard/Middleware Pattern — 인증·인가**
- **Route Middleware** (`middleware.ts`): JWT 검증으로 라우트 레벨 보호
- **API Guard** (`api-auth.ts`): `getSessionUser()`, `requireAdmin()` — 엔드포인트 레벨 보호
- **Layout Guard**: Admin/Employee 레이아웃에서 클라이언트 사이드 인증 확인

**5. Retry with Exponential Backoff — 외부 API 회복성**
- `withRetry<T>(fn, maxAttempts=3, baseDelay=1000)` — 1s, 3s, 9s 간격
- Google Calendar API, 메일 발송(Nodemailer)에 적용

**6. Repository Pattern (암묵적) — Prisma ORM**
- Prisma Client가 데이터 접근 추상화 역할
- 모델별 `findMany`, `create`, `update`, `upsert` 인터페이스

**7. Factory Pattern — Provider 구성**
- `query-provider.tsx`: QueryClient 생성 + 설정 (staleTime 60s, refetchOnFocus false)
- `providers.tsx`: SessionProvider + QueryClientProvider 합성

**8. Facade Pattern — 알림 오케스트레이션**
- `leave-notifications.ts`: 메일 발송 + 캘린더 동기화 + 감사 로그를 단일 함수(`notifyLeaveStatusChange`)로 통합

---

### 계층 구조 (Layered Architecture)

```
┌─────────────────────────────────────────────┐
│  Pages (UI)                                  │
│  - React Components + shadcn/ui             │
│  - Zustand (client state)                    │
│  - React Query (server state cache)          │
├─────────────────────────────────────────────┤
│  API Routes (Controller)                     │
│  - Zod 검증                                  │
│  - NextResponse                              │
├─────────────────────────────────────────────┤
│  Auth Guards (Middleware)                     │
│  - middleware.ts (라우트 보호)                 │
│  - api-auth.ts (API 보호)                     │
├─────────────────────────────────────────────┤
│  Business Logic (Service)                    │
│  - policy-engine.ts (연차 계산)               │
│  - leave-notifications.ts (알림 오케스트레이션)│
│  - google-calendar.ts (캘린더 동기화)         │
│  - mailer.ts (메일 발송)                      │
│  - audit.ts (감사 로그)                       │
├─────────────────────────────────────────────┤
│  Data Access (Repository)                    │
│  - Prisma ORM                                │
│  - PostgreSQL                                │
└─────────────────────────────────────────────┘
```

---

### 인증 아키텍처

```
로그인 → NextAuth CredentialsProvider → bcrypt 검증 → JWT 발급
       ↓
middleware.ts → JWT 유효성 + 역할 체크 → 라우트 허용/차단
       ↓
API 호출 → getSessionUser() / requireAdmin() → 비즈니스 로직
       ↓
클라이언트 → useCurrentUser() 훅 → URL 경로 기반 모드 자동 감지
```

**RBAC (Role-Based Access Control)**:
- `EMPLOYEE`: 본인 근태/휴가 조회·신청
- `TEAM_LEAD`: + 팀원 1차 승인
- `HR`: + 2차 승인, 연차 조정, 직원 관리, 메일 발송
- `ADMIN`: + 시스템 설정, 전체 데이터 접근

---

### 데이터 흐름 — 휴가 신청 라이프사이클

```
직원 신청 → [잔여일 검증 → 중복 검증 → LeaveRequest 생성]
  ↓ 연차: 자동 APPROVED → 캘린더 동기화 + 잔여일 차감
  ↓ 병가: PENDING_L1 → 메일 알림(1차 승인자)
          ↓ L1 승인 → PENDING_L2 → 메일 알림(HR)
                      ↓ L2 승인 → APPROVED → 캘린더 동기화 + 잔여일 차감 + 결과 메일
                      ↓ L2 반려 → REJECTED_L2 → 결과 메일
          ↓ L1 반려 → REJECTED_L1 → 결과 메일
  ↓ 취소: CANCELLED → 캘린더 이벤트 삭제 + 잔여일 복구
```

---

### 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.2.1 |
| 언어 | TypeScript (Strict) | 5.x |
| UI | React + shadcn/ui | 19.2.4 |
| 스타일링 | Tailwind CSS | 4.x |
| DB ORM | Prisma | 6.19.2 |
| DB | PostgreSQL | - |
| 인증 | NextAuth.js (JWT) | 4.24.13 |
| 상태관리 | Zustand + React Query | 5.0.12 / 5.95.2 |
| 검증 | Zod | 4.3.6 |
| 메일 | Nodemailer | - |
| 캘린더 | Google APIs (googleapis) | - |
| Excel | xlsx | - |
| 날짜 | date-fns | - |
| 암호화 | bcryptjs | - |
| 토스트 | Sonner | - |