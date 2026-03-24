# CV3 People — 상세 PRD

> 최종 수정: 2026-03-24  
> 대상 독자: 개발팀, PM, HR 운영팀  
> 구현 도구: Claude Code (CLI 기반 에이전틱 코딩)

---

## 1. 서비스 한 줄 정의

**CV3 People** — 직원 출퇴근(지문인식기 Excel 파싱), 연차·병가·보상휴가 관리, 다단계 승인, Google Calendar 연동, 메일 발송을 하나의 플랫폼에서 처리하는 자사 HR ERP.

---

## 2. 문제 정의

| # | 기존 문제 | CV3 People 해결 방향 |
|---|----------|---------------------|
| P1 | 관리자/직원 화면 구분 없음 | employee mode / admin mode 명확 분리, 동일 계정 전환 |
| P2 | 관리자 대리 등록 휴가 → Google Calendar 미연동 | 휴가 상태 기반 동기화 (등록 주체 무관) |
| P3 | Excel 업로드만 되고 파싱 안 됨 | 업로드 → 미리보기 → 컬럼 매핑 → 검증 → 반영 파이프라인 |
| P4 | 병가 승인자 선택 불가 | 신청 시 1차 승인자 선택 UI + 2차 HR 자동 라우팅 |
| P5 | 직원 초대 기능 없음 | 이메일 초대 → 링크 활성화 → 역할/부서 자동 배정 |
| P6 | 보상휴가 수동 계산 | 승인된 추가근무 × 1.5 자동 적립 |
| P7 | 연차 촉진 없음 | 분기별 잔여 연차 안내 메일 (관리자 수동 트리거) |

---

## 3. 기대 효과

- HR 운영 공수 50% 이상 절감 (수기 Excel 관리 → 자동 파싱·집계)
- 휴가 현황 실시간 가시성 (Google Calendar 자동 반영)
- 승인 누락·지연 제거 (워크플로우 자동화 + 알림)
- 연차 소멸 리스크 감소 (분기별 촉진 메일)
- 감사 추적 가능 (모든 변경에 audit log)

---

## 4. 사용자 역할 및 권한

### 4.1 역할 정의

| 역할(Role) | 설명 | 기본 모드 |
|------------|------|----------|
| `EMPLOYEE` | 모든 사용자의 기본 역할. 본인 근태 조회, 휴가 신청 | employee mode |
| `TEAM_LEAD` | 팀원 휴가 승인(1차), 팀 근태 조회 | employee mode + 승인 기능 |
| `HR` | 병가 2차 승인, 연차 수동 조정, 직원 관리, 메일 발송 | admin mode |
| `ADMIN` | 시스템 설정, 직원 초대, Excel 업로드, 모든 데이터 접근 | admin mode |

> **핵심 원칙**: 한 사용자는 복수 역할 보유 가능. 예) 베키 = `ADMIN` + `EMPLOYEE`.  
> 모든 사용자는 반드시 `EMPLOYEE` 역할을 포함.

### 4.2 권한 매트릭스

| 기능 | EMPLOYEE | TEAM_LEAD | HR | ADMIN |
|------|----------|-----------|-----|-------|
| 본인 근태 조회 | ✅ | ✅ | ✅ | ✅ |
| 본인 휴가 신청 | ✅ | ✅ | ✅ | ✅ |
| 팀원 근태 조회 | ❌ | ✅ (본인 팀) | ✅ (전체) | ✅ (전체) |
| 휴가 1차 승인 | ❌ | ✅ | ❌ | ❌ |
| 휴가 2차 승인(병가) | ❌ | ❌ | ✅ | ❌ |
| 휴가 대리 등록 | ❌ | ❌ | ✅ | ✅ |
| 추가근무 승인 | ❌ | ✅ | ✅ | ✅ |
| Excel 업로드 | ❌ | ❌ | ✅ | ✅ |
| 연차 수동 조정 | ❌ | ❌ | ✅ | ✅ |
| 직원 초대 | ❌ | ❌ | ✅ | ✅ |
| 시스템 설정 | ❌ | ❌ | ❌ | ✅ |
| 감사 로그 조회 | ❌ | ❌ | ✅ (읽기) | ✅ |
| 메일 발송 | ❌ | ❌ | ✅ | ✅ |

---

## 5. Employee Mode / Admin Mode 구조

### 5.1 모드 전환 UX

```
┌─────────────────────────────────────────────┐
│  CV3 People          [👤 베키 ▾]            │
│                      ┌──────────────────┐   │
│                      │ 직원 모드    ✅   │   │
│                      │ 관리자 모드       │   │
│                      │─────────────────│   │
│                      │ 프로필 설정       │   │
│                      │ 로그아웃          │   │
│                      └──────────────────┘   │
└─────────────────────────────────────────────┘
```

- 우측 상단 프로필 드롭다운에서 모드 전환
- 현재 모드는 시각적으로 명확히 표시 (색상 구분: employee = 파랑, admin = 주황)
- EMPLOYEE만 가진 사용자에게는 전환 옵션 미노출
- 모드 전환 시 사이드바 메뉴 즉시 변경 (페이지 새로고침 없음)

### 5.2 모드별 메뉴 구조

**Employee Mode (직원 모드)**
```
├── 대시보드 (내 근태 요약, 잔여 연차, 다가오는 휴가)
├── 내 근태
│   ├── 출퇴근 캘린더
│   └── 월별 근태 상세
├── 휴가
│   ├── 휴가 신청
│   ├── 내 휴가 내역
│   └── 잔여 연차 현황
├── 승인함 (TEAM_LEAD인 경우에만 노출)
│   ├── 대기 중인 승인
│   └── 승인 이력
└── 내 정보
```

**Admin Mode (관리자 모드)**
```
├── 대시보드 (전사 근태 요약, 오늘 휴가자, 승인 대기 건수)
├── 직원 관리
│   ├── 직원 목록
│   ├── 직원 초대
│   └── 직원 상세 (연차 수동 조정 포함)
├── 근태 관리
│   ├── Excel 업로드
│   ├── 업로드 이력
│   ├── 근태 집계 (부서별/월별)
│   └── 추가근무 승인
├── 휴가 관리
│   ├── 전사 휴가 현황
│   ├── 휴가 대리 등록
│   ├── 승인 관리 (HR 2차 승인 포함)
│   └── 보상휴가 관리
├── 캘린더
│   └── Google Calendar 연동 설정
├── 메일
│   └── 연차 촉진 메일 발송
├── 설정 (ADMIN만)
│   ├── 연차 정책 설정
│   ├── 승인 워크플로우 설정
│   ├── 부서/팀 관리
│   └── 시스템 설정
└── 감사 로그
```

### 5.3 모드 전환 규칙

| 조건 | 동작 |
|------|------|
| EMPLOYEE만 보유 | employee mode 고정, 전환 버튼 미노출 |
| TEAM_LEAD 보유 | employee mode 기본, 승인함 메뉴 추가 노출 |
| HR 또는 ADMIN 보유 | 로그인 시 employee mode 기본, admin mode 전환 가능 |
| admin mode에서 본인 휴가 신청 시도 | "직원 모드에서 신청해주세요" 안내 + 전환 링크 |

---

## 6. 상세 기능 요구사항

### 6.1 직원 관리

**[Admin Mode — HR, ADMIN]**

- 직원 CRUD (이름, 이메일, 부서, 팀, 직급, 입사일, 역할)
- 직원 상태: `INVITED` → `ACTIVE` → `INACTIVE`(퇴사)
- 퇴사 처리 시: 잔여 연차 정산, 진행 중 승인 건 자동 취소, Google Calendar 일정 제거
- 직원 상세 화면에서 연차/병가 잔여일 조회 및 수동 조정 가능
- 수동 조정 시 사유 입력 필수 → audit log 기록

### 6.2 직원 초대

**[Admin Mode — HR, ADMIN]**

**플로우:**
```
관리자가 초대 정보 입력
  → 초대 이메일 발송 (Google Workspace SMTP)
  → 직원이 초대 링크 클릭
  → 비밀번호 설정 + 프로필 확인
  → 계정 활성화 (INVITED → ACTIVE)
```

**초대 시 입력 항목:**
- 이메일 (필수)
- 이름 (필수)
- 부서/팀 (필수)
- 직급 (선택)
- 입사일 (필수) — 연차 계산 기준
- 역할 (기본: EMPLOYEE)
- 기본 1차 승인자 (선택) — 팀장 자동 추천

**초대 상태 관리:**

| 상태 | 설명 |
|------|------|
| `PENDING` | 발송됨, 미수락 |
| `ACCEPTED` | 계정 활성화 완료 |
| `EXPIRED` | 72시간(설정 가능) 후 만료 |
| `CANCELLED` | 관리자가 취소 |

- 재발송: PENDING/EXPIRED 상태에서 가능, 기존 토큰 무효화 후 새 토큰 발급
- 취소: PENDING 상태에서만 가능

### 6.3 근태 Excel 업로드 및 파싱

**[Admin Mode — HR, ADMIN]**

**핵심 원칙: 단순 파일 저장이 아닌, 실제 데이터 파싱 파이프라인**

**플로우:**
```
① 파일 선택 (xlsx/xls/csv)
  → ② 파일 유효성 검사 (용량, 형식, 시트 수)
  → ③ 기본 템플릿 자동 감지 OR 컬럼 매핑 UI 제공
  → ④ 미리보기 (파싱 결과 테이블, 최대 50행)
  → ⑤ 검증 리포트 (오류/경고 건수, 행별 상세)
  → ⑥ 관리자 확인 → 최종 반영
  → ⑦ 반영 결과 요약 (성공/스킵/오류 건수)
```

**기본 템플릿 (V1):**
- 지문인식기 기본 출력 형식 기준
- 필수 컬럼: 사번(or 이름), 날짜, 출근시각, 퇴근시각
- 선택 컬럼: 부서, 비고

**컬럼 매핑 구조:**
```json
{
  "template_name": "지문인식기_기본",
  "mappings": {
    "employee_identifier": { "column": "A", "type": "employee_id | name | email" },
    "date": { "column": "B", "format": "YYYY-MM-DD" },
    "clock_in": { "column": "C", "format": "HH:mm" },
    "clock_out": { "column": "D", "format": "HH:mm" },
    "department": { "column": "E", "optional": true },
    "note": { "column": "F", "optional": true }
  },
  "header_row": 1,
  "data_start_row": 2
}
```

- 관리자가 커스텀 매핑 생성/저장 가능
- 매핑 재사용 지원 (저장된 템플릿 목록에서 선택)

**검증 규칙:**

| 규칙 | 수준 | 처리 |
|------|------|------|
| 사번/이름이 시스템에 없음 | ERROR | 해당 행 스킵 |
| 날짜 형식 오류 | ERROR | 해당 행 스킵 |
| 출근 > 퇴근 (야간근무 아닌 경우) | WARNING | 익일 퇴근 여부 확인 필요 |
| 동일 사원 + 동일 날짜 중복 | WARNING | 기존 데이터 덮어쓰기 or 스킵 선택 |
| 퇴근 시각 누락 | WARNING | 누락 타각 플래그 |
| 출근 시각 누락 | WARNING | 누락 타각 플래그 |

**오류 리포트 UI:**
- 행 번호, 컬럼, 원본 값, 오류 유형, 권장 조치 표시
- ERROR 행은 자동 제외, WARNING 행은 관리자 선택

### 6.4 근태 집계

**[Admin Mode — HR, ADMIN] / [Employee Mode — 본인 데이터만]**

**기본 근무 정책 (설정 가능):**
- 표준 근무시간: 09:00 ~ 18:00 (8시간, 점심 1시간 제외)
- 주 40시간 기준
- 지각 기준: 출근 시각 > 09:00 (설정 가능)
- 조퇴 기준: 퇴근 시각 < 18:00 (설정 가능)

**집계 항목:**
- 일별: 출근시각, 퇴근시각, 실근무시간, 추가근무시간, 지각/조퇴 여부, 근무상태(정상/지각/조퇴/결근/휴가/병가)
- 월별: 총 근무일, 총 근무시간, 총 추가근무시간, 지각 횟수, 결근 횟수, 휴가 사용일
- 연별: 위 월별 합산

### 6.5 출퇴근 캘린더

**[Employee Mode — 본인] / [Admin Mode — 전직원]**

- 월간 캘린더 뷰 기본
- 각 날짜 셀에 표시: 출근시각, 퇴근시각, 근무상태 배지(정상/지각/휴가/병가 등)
- 색상 코딩:
  - 정상 근무: 기본색
  - 지각: 노랑
  - 결근: 빨강
  - 연차: 파랑
  - 병가: 보라
  - 보상휴가: 초록
  - 누락 타각: 회색 점선

### 6.6 추가근무 후보 산출

**[자동 처리]**

- 일별 실근무시간 > 8시간인 경우 초과분을 추가근무 후보로 자동 산출
- 상태: `CANDIDATE` → `APPROVED` → `COMPENSATED` 또는 `REJECTED`
- 산출 시점: Excel 업로드 반영 직후 배치 처리

### 6.7 추가근무 승인

**[Admin Mode — TEAM_LEAD, HR, ADMIN]**

- 추가근무 후보 목록 조회 (부서별/기간별 필터)
- 건별 승인/반려
- 일괄 승인 지원
- 반려 시 사유 입력 필수

### 6.8 보상휴가 적립

**[자동 처리]**

- 추가근무 승인 즉시 보상휴가 자동 적립
- **산식: 승인된 추가근무 시간 × 1.5 = 보상휴가 시간**
- 보상휴가 단위: 시간 (8시간 = 1일로 환산)
- 예시: 3시간 추가근무 승인 → 4.5시간 보상휴가 적립 → 0.5625일

**보상휴가 소멸 정책:** ⚠️ 확정 필요
- 권장 기본값: 발생일로부터 1년 후 소멸
- 대안: 회계연도 말 소멸
- 설정 가능 구조로 구현

### 6.9 연차 자동 부여

**[자동 처리 — 설정 기반]**

**정책:**

| 구분 | 규칙 |
|------|------|
| 입사 첫해 | 매월 만근 시 1일 부여 (최대 11일) |
| 2년차 이상 | 회계연도(1/1) 기준 일괄 부여 |
| 부여 일수 (2년차) | 15일 (근로기준법 기준, 설정 가능) |
| 3년차 이후 가산 | 2년마다 +1일 (설정 가능) |

**소멸 규칙:**

| 구분 | 소멸 시점 |
|------|----------|
| 입사 첫해 발생분 | 입사일 + 1년 |
| 회계연도 발생분 | 다음 회계연도 시작일 (1/1) |

**반차/반반차:**
- 반차 = 0.5일
- 반반차 = 0.25일
- 설정에서 반반차 활성화/비활성화 가능

### 6.10 병가 자동 부여

**[자동 처리]**

- 연 3일 (회계연도 기준 1/1 부여)
- 입사 첫해: 입사월 기준 월할 계산 (권장) 또는 3일 전체 부여 (설정 가능)
- 미사용 병가 소멸: 회계연도 말 소멸 (이월 없음)

### 6.11 휴가 신청

**[Employee Mode — 모든 사용자]**

**신청 화면 입력 항목:**
- 휴가 유형: 연차 / 반차(오전·오후) / 반반차 / 병가 / 보상휴가
- 시작일, 종료일
- 사유 (병가 시 필수, 연차 시 선택)
- 1차 승인자 선택 (병가만 — 아래 상세)
- 첨부파일 (병가 시 진단서 등, 선택)

**병가 신청 시 승인자 선택:**
- 1차 승인자 후보 노출 기준:
  1. 신청자의 소속 팀 TEAM_LEAD (우선 표시)
  2. 신청자의 상위 부서 TEAM_LEAD
  3. HR 역할 보유자
- 후보 목록에서 1명 선택 필수
- 선택 후 화면에 승인 워크플로우 시각화:
  ```
  [신청자] → [1차: 홍길동(팀장)] → [2차: HR] → 완료
  ```

**연차 신청:**
- 잔여 연차 ≥ 신청일수 → 즉시 자동 승인
- 잔여 연차 < 신청일수 → 신청 불가 (에러 메시지)

### 6.12 휴가 대리 등록

**[Admin Mode — HR, ADMIN]**

- 관리자가 특정 직원의 휴가를 대리 등록
- 입력 항목: 대상 직원, 휴가 유형, 기간, 사유
- **핵심: 대리 등록도 직접 신청과 동일하게 Google Calendar 연동**
- 대리 등록 시 승인 처리:
  - 권장 기본값: 즉시 승인 (관리자 권한으로 등록 = 승인 간주)
  - 대안: 대리 등록도 승인 워크플로우 태움
  - 설정 가능 구조: `admin_proxy_leave.auto_approve = true | false`
- 대리 등록 시 해당 직원에게 알림 (이메일 또는 인앱)
- 등록자 정보 audit log 기록 (registered_by 필드)

### 6.13 승인 워크플로우

**공통 상태 머신:**
```
DRAFT → PENDING_L1 → PENDING_L2 (병가만) → APPROVED → (USED)
                ↓                    ↓
            REJECTED_L1         REJECTED_L2
                
APPROVED → CANCELLED (신청자 또는 관리자 취소)
```

**연차 워크플로우:**
```
신청 → 잔여연차 검증 → APPROVED (자동) → Google Calendar 동기화
```

**병가 워크플로우:**
```
신청 (승인자 선택)
  → PENDING_L1 (1차 승인자에게 알림)
  → 1차 승인 → PENDING_L2 (HR에게 알림)
  → 2차 승인 → APPROVED → Google Calendar 동기화
```

**승인 알림:**
- 승인 요청 시: 승인자에게 이메일 + 인앱 알림
- 승인/반려 시: 신청자에게 이메일 + 인앱 알림
- 48시간 무응답 시: 승인자에게 리마인더 (설정 가능)

**승인 위임:** ⚠️ 2차 개발 범위
- 승인자 부재 시 위임 처리

### 6.14 Google Calendar 연동

**핵심 정책: 등록 주체가 아닌 휴가 상태 기반 동기화**

**동기화 규칙:**

| 조건 | 동작 |
|------|------|
| 휴가 상태 = APPROVED | 캘린더에 일정 생성 |
| 휴가 상태 = CANCELLED 또는 REJECTED | 캘린더에서 일정 삭제 |
| 휴가 수정 (날짜 변경) | 기존 일정 삭제 → 새 일정 생성 |
| 직원이 직접 신청 + 승인 | 동기화 ✅ |
| 관리자가 대리 등록 + 승인 | 동기화 ✅ |
| 관리자가 대리 등록 + 자동승인 | 동기화 ✅ |

**일정 형식:**
- 캘린더: 팀별 공용 캘린더 (설정에서 팀↔캘린더 매핑)
- 제목: `{이름} | {휴가유형}` (예: `홍길동 | 연차`)
- 종일 이벤트
- 반차: 오전(09:00~13:00) 또는 오후(13:00~18:00)
- 반반차: 2시간 블록 (시간대 설정 가능)
- 설명(description): 자동 생성 — 유형, 기간, 승인 상태

**연동 방식:**
- Google Calendar API (OAuth 2.0, 서비스 계정)
- 팀별 캘린더 ID를 설정에서 관리
- 동기화 실패 시: 재시도 3회 → 실패 시 admin 대시보드에 경고 표시

**설정 항목:**
```
calendar_sync:
  enabled: true
  scope: team | company  # 팀별 or 전사 단일 캘린더
  calendars:
    - team_id: "dev"
      calendar_id: "abc@group.calendar.google.com"
    - team_id: "design"
      calendar_id: "def@group.calendar.google.com"
  event_title_format: "{name} | {leave_type}"
  sync_trigger: on_status_change  # APPROVED, CANCELLED, REJECTED
```

### 6.15 분기별 잔여 연차 안내 메일

**[Admin Mode — HR, ADMIN]**

- 관리자가 수동 트리거 (발송 버튼)
- 대상: ACTIVE 직원 중 잔여 연차 > 0인 직원
- 발송 채널: Google Workspace SMTP
- 메일 내용:
  - 이름, 잔여 연차 일수, 소멸 예정일, 사용 권고 문구
  - CV3 People 휴가 신청 링크
- 발송 이력 기록 (발송일, 대상자 수, 성공/실패 건수)
- 개별 발송 실패 시: 실패 목록 표시, 재발송 가능

### 6.16 관리자 수동 조정

**[Admin Mode — HR, ADMIN]**

- 연차/병가/보상휴가 잔여일 수동 증감
- 조정 사유 입력 필수
- 조정 이력 전체 조회 가능
- 최대 연차일수 수동 오버라이드 가능 (특수 계약 등)

### 6.17 감사 로그

**[Admin Mode — HR(읽기), ADMIN(읽기)]**

모든 주요 동작에 대해 자동 기록:
- 대상: 휴가 생성/수정/삭제/승인/반려, 연차 조정, 직원 생성/수정/퇴사, Excel 업로드, 설정 변경
- 기록 항목: timestamp, actor_id, action, target_type, target_id, before_value, after_value, ip_address
- 필터: 기간, 행위자, 액션 유형, 대상
- 내보내기: CSV

---

## 7. 핵심 정책 제안

### 7.1 근태 집계 규칙
- 표준 근무시간: 설정 값 (기본 09:00~18:00)
- 실근무시간 = 퇴근시각 - 출근시각 - 점심시간(1시간)
- 야간근무 판정: 퇴근시각 < 출근시각이면 익일 퇴근으로 처리
- 야간근무 시 퇴근시각에 +24h 보정 후 계산

### 7.2 추가근무 인정 규칙
- 일 실근무시간 > 8시간인 초과분만 후보로 산출
- **관리자 승인된 건만 인정** (자동 인정 아님)
- 추가근무 최소 단위: 30분 (미만 절사, 설정 가능)

### 7.3 보상휴가 적립 규칙
- 산식: 승인된 추가근무 시간 × 1.5
- 적립 단위: 시간 (1일 = 8시간)
- 적립 시점: 추가근무 승인 즉시

### 7.4 연차 부여/소멸 규칙
- 상기 6.9 참조
- 모든 산식은 설정 테이블에서 관리:
```
leave_policy:
  annual:
    first_year_monthly_grant: 1
    first_year_max: 11
    base_days_from_second_year: 15
    additional_per_2_years: 1
    max_cap: 25
  half_day_enabled: true
  quarter_day_enabled: true
  expiry:
    first_year: entry_date + 1Y
    subsequent: next_fiscal_year_start
```

### 7.5 병가 부여 규칙
- 연 3일, 회계연도 기준
- 이월 없음

### 7.6 승인 규칙 요약
| 유형 | 승인 방식 |
|------|----------|
| 연차 | 잔여일 검증 후 자동 승인 |
| 반차/반반차 | 연차와 동일 |
| 병가 | 1차 팀장(선택) → 2차 HR |
| 보상휴가 | 잔여 보상휴가 검증 후 자동 승인 (권장) |

### 7.7 관리자 대리 등록 시 규칙
- 기본값: 즉시 승인 (`admin_proxy_leave.auto_approve = true`)
- 즉시 승인이면 바로 Google Calendar 동기화
- 수정/취소 시: 관리자가 직접 처리, 캘린더도 자동 갱신
- 대리 등록된 휴가도 해당 직원의 잔여일에서 차감

### 7.8 Google Calendar 동기화 규칙
- 상기 6.14 참조
- 동기화 트리거: 휴가 상태 변경 이벤트 (APPROVED / CANCELLED / REJECTED)
- 등록 주체 무관 — 상태 기반

### 7.9 메일 발송 규칙
- 관리자 수동 트리거
- Google Workspace SMTP (OAuth 2.0)
- 발송 실패 시 3회 재시도, 최종 실패 시 로그 기록

---

## 8. 예외 상황 및 운영 시나리오

### 8.1 근태 관련

| 예외 | 처리 |
|------|------|
| 누락 타각 (출근만 or 퇴근만) | `INCOMPLETE` 플래그, 관리자 수동 보정 필요 |
| 중복 타각 (동일 날짜 2건 이상) | 첫 출근 + 마지막 퇴근 채택 (설정 가능: 최후 기록 우선 / 관리자 선택) |
| 야간근무 (퇴근 < 출근) | 익일 퇴근 자동 판정, 실근무시간 계산 보정 |
| 동일 사원+동일 날짜 Excel 중복 | 업로드 시 WARNING 표시, 덮어쓰기 or 스킵 선택 |
| 잘못된 Excel 형식 | 파싱 실패 → 오류 메시지 + 기본 템플릿 다운로드 링크 |
| 템플릿 인식 실패 | 컬럼 매핑 UI로 안내 |

### 8.2 휴가 관련

| 예외 | 처리 |
|------|------|
| 병가 승인 중 취소 | PENDING_L1/L2 상태에서 신청자가 취소 가능 → 상태: CANCELLED |
| 관리자 대리 등록 후 수정 | 관리자가 날짜/유형 수정 가능, 캘린더 자동 갱신, audit log 기록 |
| 관리자 대리 등록 후 취소 | 관리자가 취소, 잔여일 복원, 캘린더 일정 삭제 |
| 승인 중 잔여일 변동 (타 신청 승인) | 승인 시점에 잔여일 재검증, 부족 시 승인 불가 알림 |
| 동일 날짜 중복 휴가 신청 | 기존 APPROVED 건이 있으면 신청 차단 |

### 8.3 연동/발송 관련

| 예외 | 처리 |
|------|------|
| Google Calendar 연동 실패 | 재시도 3회 → 실패 시 `sync_failed` 플래그 + admin 대시보드 경고 |
| 캘린더 일정 수동 삭제 | 주기적 동기화(1일 1회)로 재생성 (설정 가능) |
| 이메일 발송 실패 | 재시도 3회 → 실패 로그 + 재발송 UI |
| 초대 링크 만료 | 72시간 후 만료 → 재발송 가능 |
| 초대 수락 후 중복 초대 | 이미 ACTIVE 상태이면 초대 차단 |

### 8.4 입퇴사 처리

| 시나리오 | 처리 |
|---------|------|
| 퇴사자 | INACTIVE 전환, 미사용 연차 정산 기록, 진행 중 승인 건 자동 취소, 캘린더 미래 일정 삭제 |
| 입사자 (월 중간) | 해당 월 만근 판정: 입사일~말일 기준 소정근무일 80% 이상 시 1일 부여 |

---

## 9. 데이터 모델 초안

### 핵심 엔터티

```
┌─────────────────┐     ┌──────────────────┐
│    User          │     │   Department     │
│─────────────────│     │──────────────────│
│ id (PK)          │     │ id (PK)          │
│ email (UQ)       │     │ name             │
│ name             │     │ parent_id (FK)   │
│ password_hash    │     └──────────────────┘
│ department_id(FK)│             │
│ team_id (FK)     │     ┌──────────────────┐
│ position         │     │      Team        │
│ hire_date        │     │──────────────────│
│ status           │     │ id (PK)          │
│ roles (JSON)     │     │ name             │
│ created_at       │     │ department_id(FK)│
│ updated_at       │     │ calendar_id      │
└─────────────────┘     └──────────────────┘

┌─────────────────┐
│  Invitation      │
│─────────────────│
│ id (PK)          │
│ email            │
│ name             │
│ department_id    │
│ team_id          │
│ hire_date        │
│ roles (JSON)     │
│ token (UQ)       │
│ status           │  ← PENDING/ACCEPTED/EXPIRED/CANCELLED
│ invited_by (FK)  │
│ expires_at       │
│ created_at       │
└─────────────────┘

┌──────────────────────┐
│  Attendance          │
│──────────────────────│
│ id (PK)              │
│ user_id (FK)         │
│ date                 │
│ clock_in             │
│ clock_out            │
│ actual_work_hours    │  ← 자동 계산
│ overtime_hours       │  ← 자동 계산
│ status               │  ← NORMAL/LATE/EARLY_LEAVE/ABSENT/INCOMPLETE
│ source               │  ← EXCEL_UPLOAD/MANUAL
│ upload_batch_id (FK) │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────┐
│  UploadBatch         │
│──────────────────────│
│ id (PK)              │
│ file_name            │
│ file_url             │
│ template_id (FK)     │
│ uploaded_by (FK)     │
│ total_rows           │
│ success_count        │
│ error_count          │
│ skip_count           │
│ status               │  ← PROCESSING/COMPLETED/FAILED
│ error_report (JSON)  │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│  ColumnMapping       │
│──────────────────────│
│ id (PK)              │
│ name                 │
│ mappings (JSON)      │
│ created_by (FK)      │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│  OvertimeRequest     │
│──────────────────────│
│ id (PK)              │
│ user_id (FK)         │
│ attendance_id (FK)   │
│ date                 │
│ overtime_hours       │
│ status               │  ← CANDIDATE/APPROVED/REJECTED/COMPENSATED
│ approved_by (FK)     │
│ approved_at          │
│ reject_reason        │
│ created_at           │
└──────────────────────┘

┌──────────────────────────┐
│  LeaveBalance            │
│──────────────────────────│
│ id (PK)                  │
│ user_id (FK)             │
│ leave_type               │  ← ANNUAL/SICK/COMPENSATORY
│ year                     │
│ granted_days             │
│ used_days                │
│ remaining_days           │  ← 계산 필드 or granted - used
│ expires_at               │
│ granted_reason           │  ← AUTO/MANUAL/OVERTIME
│ adjusted_by (FK, null)   │
│ created_at               │
│ updated_at               │
└──────────────────────────┘

┌──────────────────────────┐
│  LeaveRequest            │
│──────────────────────────│
│ id (PK)                  │
│ user_id (FK)             │
│ leave_type               │  ← ANNUAL/HALF_AM/HALF_PM/QUARTER/SICK/COMPENSATORY
│ start_date               │
│ end_date                 │
│ days                     │  ← 자동 계산 (반차=0.5, 반반차=0.25)
│ reason                   │
│ status                   │  ← DRAFT/PENDING_L1/PENDING_L2/APPROVED/REJECTED_L1/REJECTED_L2/CANCELLED
│ registered_by (FK)       │  ← 본인 or 대리등록자
│ is_proxy                 │  ← true/false
│ l1_approver_id (FK)      │  ← 병가: 신청자 선택, 연차: null
│ l1_approved_at           │
│ l1_reject_reason         │
│ l2_approver_id (FK)      │  ← HR (자동 배정 or 설정)
│ l2_approved_at           │
│ l2_reject_reason         │
│ calendar_event_id        │  ← Google Calendar event ID
│ calendar_synced          │  ← true/false
│ created_at               │
│ updated_at               │
└──────────────────────────┘

┌──────────────────────────┐
│  AuditLog                │
│──────────────────────────│
│ id (PK)                  │
│ actor_id (FK)            │
│ action                   │  ← CREATE/UPDATE/DELETE/APPROVE/REJECT/...
│ target_type              │  ← USER/LEAVE/ATTENDANCE/BALANCE/SETTING/...
│ target_id                │
│ before_value (JSON)      │
│ after_value (JSON)       │
│ ip_address               │
│ created_at               │
└──────────────────────────┘

┌──────────────────────────┐
│  MailLog                 │
│──────────────────────────│
│ id (PK)                  │
│ type                     │  ← LEAVE_REMINDER/APPROVAL_REQUEST/...
│ recipient_id (FK)        │
│ recipient_email          │
│ subject                  │
│ status                   │  ← SENT/FAILED/RETRYING
│ retry_count              │
│ sent_at                  │
│ created_at               │
└──────────────────────────┘

┌──────────────────────────┐
│  PolicyConfig            │
│──────────────────────────│
│ id (PK)                  │
│ key                      │  ← "annual_leave.first_year_monthly", "work_hours.standard", ...
│ value (JSON)             │
│ updated_by (FK)          │
│ updated_at               │
└──────────────────────────┘
```

### 주요 인덱스
- `Attendance`: (user_id, date) UNIQUE
- `LeaveRequest`: (user_id, start_date, end_date) — 중복 검사용
- `LeaveBalance`: (user_id, leave_type, year) UNIQUE
- `AuditLog`: (target_type, target_id), (actor_id, created_at)
- `Invitation`: (token) UNIQUE, (email)

---

## 10. API / 도메인 구조 초안

### 도메인 모듈 구조

```
cv3-people/
├── src/
│   ├── modules/
│   │   ├── auth/           # 인증, 세션, 모드 전환
│   │   ├── user/           # 직원 CRUD, 초대
│   │   ├── attendance/     # 근태, Excel 파싱, 집계
│   │   ├── overtime/       # 추가근무 후보, 승인
│   │   ├── leave/          # 휴가 신청, 승인, 대리등록
│   │   ├── balance/        # 연차/병가/보상휴가 잔고 관리
│   │   ├── calendar/       # Google Calendar 연동
│   │   ├── mail/           # 메일 발송
│   │   ├── policy/         # 정책 설정 관리
│   │   └── audit/          # 감사 로그
│   ├── shared/
│   │   ├── middleware/     # auth, role guard, mode check
│   │   ├── utils/          # date, excel parser
│   │   └── types/
│   └── infra/
│       ├── database/
│       ├── google/         # Calendar API, SMTP
│       └── storage/        # 파일 저장
```

### 주요 API 엔드포인트

```
# Auth
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/switch-mode          # { mode: "employee" | "admin" }
GET    /api/auth/me                    # 현재 사용자 + 역할 + 모드

# Users (Admin)
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/deactivate

# Invitations (Admin)
POST   /api/admin/invitations
GET    /api/admin/invitations
POST   /api/admin/invitations/:id/resend
POST   /api/admin/invitations/:id/cancel
POST   /api/invitations/:token/accept   # 공개 엔드포인트

# Attendance (Admin)
POST   /api/admin/attendance/upload     # Excel 업로드
GET    /api/admin/attendance/upload/:batchId/preview
POST   /api/admin/attendance/upload/:batchId/confirm
GET    /api/admin/attendance/batches
GET    /api/admin/attendance?userId=&month=&year=
GET    /api/admin/attendance/summary?department=&month=

# Attendance (Employee)
GET    /api/employee/attendance/me?month=&year=

# Column Mappings (Admin)
GET    /api/admin/column-mappings
POST   /api/admin/column-mappings
PUT    /api/admin/column-mappings/:id

# Overtime (Admin)
GET    /api/admin/overtime/candidates
POST   /api/admin/overtime/:id/approve
POST   /api/admin/overtime/:id/reject
POST   /api/admin/overtime/bulk-approve

# Leave (Employee)
POST   /api/employee/leaves             # 휴가 신청
GET    /api/employee/leaves/me
GET    /api/employee/leaves/:id
POST   /api/employee/leaves/:id/cancel
GET    /api/employee/balance/me          # 잔여 연차/병가/보상

# Leave (Admin - 대리등록)
POST   /api/admin/leaves/proxy
GET    /api/admin/leaves?status=&type=&userId=
PATCH  /api/admin/leaves/:id             # 수정
POST   /api/admin/leaves/:id/cancel      # 취소

# Approval
GET    /api/approvals/pending            # 내가 승인해야 할 건
POST   /api/approvals/:leaveId/approve-l1
POST   /api/approvals/:leaveId/reject-l1
POST   /api/approvals/:leaveId/approve-l2    # HR만
POST   /api/approvals/:leaveId/reject-l2     # HR만

# Balance (Admin)
GET    /api/admin/balance/:userId
POST   /api/admin/balance/:userId/adjust  # 수동 조정

# Calendar (Admin)
GET    /api/admin/calendar/settings
PUT    /api/admin/calendar/settings
POST   /api/admin/calendar/sync-check     # 동기화 상태 확인
POST   /api/admin/calendar/force-sync     # 수동 재동기화

# Mail (Admin)
POST   /api/admin/mail/leave-reminder     # 연차 촉진 메일 발송
GET    /api/admin/mail/logs

# Policy (Admin)
GET    /api/admin/policies
PUT    /api/admin/policies/:key

# Audit (Admin)
GET    /api/admin/audit-logs?actor=&action=&target=&from=&to=
GET    /api/admin/audit-logs/export       # CSV 내보내기

# Approver Candidates (Employee - 병가 신청 시)
GET    /api/employee/approver-candidates   # 1차 승인자 후보 목록
```

---

## 11. 화면 구성 초안

### Employee Mode 화면

| # | 화면명 | 대상 | 설명 |
|---|--------|------|------|
| E1 | 직원 대시보드 | 전체 | 오늘 근태, 잔여 연차, 다가오는 휴가, 승인 대기 건수 |
| E2 | 출퇴근 캘린더 | 전체 | 월간 캘린더, 날짜별 출퇴근+상태 |
| E3 | 월별 근태 상세 | 전체 | 리스트 뷰, 필터, 지각/조퇴/결근 하이라이트 |
| E4 | 휴가 신청 폼 | 전체 | 유형 선택, 날짜, 사유, 승인자 선택(병가) |
| E5 | 내 휴가 내역 | 전체 | 상태별 필터, 승인 진행 상황 표시 |
| E6 | 잔여 연차 현황 | 전체 | 유형별 잔여일, 소멸 예정일, 사용 이력 |
| E7 | 승인함 | TEAM_LEAD | 대기/완료 탭, 승인/반려 액션 |
| E8 | 내 정보 | 전체 | 프로필, 비밀번호 변경 |

### Admin Mode 화면

| # | 화면명 | 대상 | 설명 |
|---|--------|------|------|
| A1 | 관리자 대시보드 | HR/ADMIN | 전사 요약, 오늘 휴가자, 승인 대기, 최근 알림 |
| A2 | 직원 목록 | HR/ADMIN | 검색, 필터, 상태 배지 |
| A3 | 직원 상세 | HR/ADMIN | 프로필, 근태, 연차, 수동 조정 |
| A4 | 직원 초대 | HR/ADMIN | 초대 폼 + 초대 상태 목록 |
| A5 | Excel 업로드 | HR/ADMIN | 업로드 → 매핑 → 미리보기 → 검증 → 반영 |
| A6 | 업로드 이력 | HR/ADMIN | 배치별 결과 요약 |
| A7 | 근태 집계 | HR/ADMIN | 부서별/월별 피벗, 내보내기 |
| A8 | 추가근무 승인 | HR/ADMIN/TL | 후보 목록, 건별/일괄 승인 |
| A9 | 전사 휴가 현황 | HR/ADMIN | 캘린더 뷰 + 리스트 뷰 |
| A10 | 휴가 대리 등록 | HR/ADMIN | 직원 선택 → 휴가 등록 폼 |
| A11 | 승인 관리 | HR | 2차 승인 대기 목록 |
| A12 | 보상휴가 관리 | HR/ADMIN | 적립 이력, 잔고 조회 |
| A13 | Google Calendar 설정 | ADMIN | 팀↔캘린더 매핑, 동기화 상태 |
| A14 | 연차 촉진 메일 | HR/ADMIN | 대상자 미리보기 → 발송 → 이력 |
| A15 | 설정 | ADMIN | 정책, 워크플로우, 부서/팀 관리 |
| A16 | 감사 로그 | HR/ADMIN | 필터, 검색, CSV 내보내기 |

---

## 12. 사용자 플로우

### Flow 1: 근태 Excel 업로드 (관리자)
```
[관리자] Admin Mode → 근태 관리 → Excel 업로드
  → 파일 선택 (드래그앤드롭 or 파일 탐색기)
  → 시스템: 파일 유효성 검사
  → 시스템: 기본 템플릿 자동 감지 시도
  → (감지 실패 시) 컬럼 매핑 UI 표시 → 관리자가 매핑 지정 → 저장
  → 미리보기 화면 (파싱된 50행 + 오류/경고 하이라이트)
  → 검증 리포트 확인 (ERROR 자동 제외, WARNING 선택)
  → [반영] 버튼 클릭
  → 시스템: 근태 데이터 저장 + 추가근무 후보 자동 산출
  → 결과 요약 (성공 150건, 스킵 3건, 오류 2건)
```

### Flow 2: 병가 신청 (직원)
```
[직원] Employee Mode → 휴가 → 휴가 신청
  → 유형: 병가 선택
  → 날짜 입력
  → 사유 입력 (필수)
  → 1차 승인자 선택 (팀장 후보 목록)
  → 진단서 첨부 (선택)
  → 승인 워크플로우 미리보기:
    [나] → [1차: 김팀장] → [2차: HR]
  → [신청] 클릭
  → 시스템: 1차 승인자에게 이메일 + 인앱 알림
  → 1차 승인 → 시스템: HR에게 알림
  → 2차 승인 → APPROVED → Google Calendar 동기화
  → 신청자에게 승인 완료 알림
```

### Flow 3: 연차 신청 (직원)
```
[직원] Employee Mode → 휴가 → 휴가 신청
  → 유형: 연차 (or 반차/반반차) 선택
  → 날짜 입력
  → 시스템: 잔여 연차 실시간 표시
  → (잔여 충분) → [신청] 클릭
  → 시스템: 자동 승인 → APPROVED → Google Calendar 동기화
  → 즉시 승인 완료 메시지
```

### Flow 4: 관리자 대리 등록 (관리자)
```
[관리자] Admin Mode → 휴가 관리 → 대리 등록
  → 대상 직원 검색/선택
  → 휴가 유형, 기간, 사유 입력
  → [등록] 클릭
  → 시스템: auto_approve=true → 즉시 APPROVED
  → Google Calendar 동기화
  → 해당 직원에게 알림 ("관리자가 휴가를 등록했습니다")
  → audit log 기록 (registered_by = 관리자)
```

### Flow 5: 직원 초대 (관리자)
```
[관리자] Admin Mode → 직원 관리 → 직원 초대
  → 이메일, 이름, 부서, 팀, 입사일, 역할 입력
  → [초대 발송] 클릭
  → 시스템: 초대 이메일 발송 (활성화 링크 포함)
  → 직원: 이메일 수신 → 링크 클릭
  → 비밀번호 설정 + 프로필 확인
  → [활성화] 클릭
  → 시스템: 상태 INVITED → ACTIVE, 연차/병가 자동 부여
```

### Flow 6: 추가근무 → 보상휴가 (관리자)
```
[시스템] Excel 업로드 반영 후 → 추가근무 후보 자동 산출
[관리자] Admin Mode → 근태 관리 → 추가근무 승인
  → 후보 목록 확인 (직원명, 날짜, 추가시간)
  → 건별 or 일괄 승인
  → 시스템: 승인된 시간 × 1.5 = 보상휴가 자동 적립
  → 해당 직원의 보상휴가 잔고 갱신
```

---

## 13. MVP / 2차 / 3차 범위

### MVP (1차 — 8~10주)

| 기능 | 상세 |
|------|------|
| 인증 + 역할 | 로그인, 역할 기반 접근, employee/admin 모드 전환 |
| 직원 관리 | CRUD, 상태 관리 |
| 직원 초대 | 이메일 초대, 링크 활성화 |
| 근태 Excel 업로드 | 기본 템플릿 파서, 미리보기, 검증, 반영 |
| 출퇴근 캘린더 | 월간 캘린더 뷰 |
| 연차 자동 부여 | 첫해 월별 + 2년차 회계연도 부여 |
| 병가 자동 부여 | 연 3일 |
| 휴가 신청 | 연차(자동승인), 병가(2단계 승인) |
| 승인 워크플로우 | 연차 자동, 병가 L1+L2 |
| 잔여 연차 현황 | 유형별 조회 |
| 감사 로그 | 기본 기록 + 조회 |
| 기본 UI | employee/admin 모드별 사이드바, 대시보드 |

### 2차 (4~6주)

| 기능 | 상세 |
|------|------|
| Google Calendar 연동 | 팀별 캘린더, 상태 기반 동기화 |
| 휴가 대리 등록 | 관리자 대리 등록 + 캘린더 연동 |
| 추가근무 승인 | 후보 산출, 건별/일괄 승인 |
| 보상휴가 적립 | 자동 적립 + 보상휴가 사용 |
| 컬럼 매핑 커스터마이징 | 관리자 매핑 생성/저장 |
| 연차 촉진 메일 | 수동 발송, 이력 관리 |
| 연차 수동 조정 | HR/ADMIN 조정 + 사유 기록 |

### 3차 (4주)

| 기능 | 상세 |
|------|------|
| 승인 위임 | 승인자 부재 시 자동 위임 |
| 근태 집계 리포트 | 부서별/월별 피벗, 내보내기 |
| 대시보드 고도화 | 차트, 트렌드, 알림 센터 |
| 정책 설정 UI | 관리자가 UI에서 정책 수정 |
| 모바일 반응형 | 모바일 최적화 |
| 다국어 | 영어 지원 |

---

## 14. 리스크 및 미확정 항목

### 확정 필요 항목

| # | 항목 | 권장 기본값 | 대안 | 비고 |
|---|------|-----------|------|------|
| U1 | 보상휴가 소멸 기한 | 발생일 + 1년 | 회계연도 말 | 정책 설정으로 구현 |
| U2 | 보상휴가 사용 시 승인 방식 | 자동 승인 (잔여 검증) | 1차 승인 필요 | |
| U3 | 입사 첫해 월할 병가 여부 | 월할 계산 | 3일 전체 부여 | |
| U4 | 관리자 대리 등록 시 자동 승인 | true | false (승인 필요) | |
| U5 | 추가근무 최소 인정 단위 | 30분 | 1시간 | |
| U6 | 초대 만료 시간 | 72시간 | 24시간 / 7일 | |
| U7 | 캘린더 연동 범위 | 팀별 공용 캘린더 | 전사 단일 캘린더 | |
| U8 | 반반차 시간 블록 | 09:00~11:00 / 11:00~13:00 / 13:00~15:00 / 15:00~17:00 | 자유 시간대 | |
| U9 | 연차 촉진 메일 자동 발송 여부 | 수동만 (MVP) | 분기 시작 자동 발송 | 2차 검토 |
| U10 | 야간근무 기준 시각 | 22:00 | 없음 (순수 시간차만) | |

### 기술 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Google Calendar API 할당량 | 대량 동기화 시 rate limit | 배치 처리 + 지수 백오프 |
| Excel 파싱 다양성 | 지문인식기마다 형식 다름 | 컬럼 매핑 기능으로 대응 |
| Google Workspace SMTP 제한 | 대량 메일 발송 제한 | 배치 분할 + 발송 큐 |
| 동시 승인 경합 | 잔여일 동시 차감 | DB 트랜잭션 + 낙관적 잠금 |

---

## 15. Claude Code 전달용 최종 구현 브리프

> 아래는 Claude Code CLI에서 바로 사용할 수 있도록 작성한 구현 브리프입니다.
> 각 Phase별로 독립 실행 가능하며, 복사-붙여넣기 후 Claude Code에 전달하세요.

---

### Phase 0: 프로젝트 초기 설정

```
당신은 시니어 풀스택 엔지니어입니다.
"CV3 People"이라는 HR ERP 웹 앱을 처음부터 만듭니다.

# 기술 스택
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes (Route Handlers)
- DB: PostgreSQL + Prisma ORM
- Auth: NextAuth.js (Credentials Provider)
- File Processing: xlsx (SheetJS) 라이브러리
- Email: Nodemailer (Google Workspace SMTP)
- Calendar: Google Calendar API (@googleapis/calendar)
- State: Zustand (클라이언트), React Query (서버 상태)

# 프로젝트 초기화
1. `npx create-next-app@latest cv3-people --typescript --tailwind --app --src-dir`
2. 필요한 패키지 설치:
   - prisma, @prisma/client
   - next-auth
   - xlsx
   - nodemailer, @types/nodemailer
   - googleapis
   - zustand, @tanstack/react-query
   - zod (유효성 검증)
   - date-fns (날짜 처리)
   - lucide-react (아이콘)
   - shadcn/ui 컴포넌트 (button, input, select, dialog, table, calendar, badge, toast, dropdown-menu, tabs, card)
3. Prisma 초기화 + PostgreSQL 연결 설정
4. .env.example 생성:
   DATABASE_URL=
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_SERVICE_ACCOUNT_KEY=
   SMTP_HOST=
   SMTP_PORT=
   SMTP_USER=
   SMTP_PASS=
   INVITATION_EXPIRY_HOURS=72

# 디렉토리 구조
src/
├── app/
│   ├── (auth)/           # 로그인, 초대 수락
│   ├── (employee)/       # employee mode 페이지들
│   ├── (admin)/          # admin mode 페이지들
│   ├── api/              # Route Handlers
│   └── layout.tsx
├── components/
│   ├── ui/               # shadcn/ui 컴포넌트
│   ├── layout/           # Sidebar, Header, ModeSwitch
│   └── shared/           # 공용 컴포넌트
├── lib/
│   ├── prisma.ts         # Prisma 클라이언트
│   ├── auth.ts           # NextAuth 설정
│   ├── google-calendar.ts
│   ├── mailer.ts
│   ├── excel-parser.ts
│   ├── policy-engine.ts  # 정책 계산 로직
│   └── audit.ts          # 감사 로그 헬퍼
├── hooks/
├── stores/               # Zustand stores
├── types/
└── prisma/
    └── schema.prisma

이 구조로 프로젝트를 초기화하고, Prisma 스키마에 기본 모델들을 정의해주세요.
```

---

### Phase 1: 데이터 모델 + 인증 + 모드 전환

```
CV3 People Phase 1을 구현합니다.

# Prisma Schema
아래 모델들을 prisma/schema.prisma에 정의하세요:

## User
- id: String @id @default(cuid())
- email: String @unique
- name: String
- passwordHash: String
- departmentId: String? → Department
- teamId: String? → Team
- position: String?
- hireDate: DateTime
- status: UserStatus (INVITED, ACTIVE, INACTIVE)
- roles: Role[] (배열 — EMPLOYEE, TEAM_LEAD, HR, ADMIN)
- createdAt, updatedAt

## Department
- id, name, parentId (자기참조)

## Team
- id, name, departmentId → Department, calendarId: String?

## Invitation
- id, email, name, departmentId, teamId, hireDate, roles, token (unique)
- status: InvitationStatus (PENDING, ACCEPTED, EXPIRED, CANCELLED)
- invitedBy → User, expiresAt, createdAt

## PolicyConfig
- id, key (unique), value (Json), updatedBy → User, updatedAt

## AuditLog
- id, actorId → User, action, targetType, targetId
- beforeValue (Json?), afterValue (Json?), ipAddress, createdAt

enum 정의: UserStatus, InvitationStatus, Role

# 인증 (NextAuth.js)
- Credentials Provider: email + password
- 세션에 userId, roles, currentMode 포함
- currentMode 기본값: "employee"
- /api/auth/switch-mode 엔드포인트: 세션의 currentMode를 "employee" ↔ "admin" 전환
- admin 전환은 HR 또는 ADMIN 역할 보유 시에만 허용

# 미들웨어
- src/middleware.ts에서 인증 + 역할 기반 라우트 보호:
  - /(admin)/* → HR 또는 ADMIN 역할 + currentMode === "admin"
  - /(employee)/* → 모든 인증 사용자
  - /(auth)/* → 비인증 사용자만

# Layout
- RootLayout: NextAuth SessionProvider + React Query Provider
- EmployeeLayout: 좌측 사이드바 (대시보드, 내 근태, 휴가, 승인함, 내 정보)
- AdminLayout: 좌측 사이드바 (대시보드, 직원관리, 근태관리, 휴가관리, 캘린더, 메일, 설정, 감사로그)
- Header: 우측에 사용자명 + 모드 전환 드롭다운
  - employee mode: 파랑 테마
  - admin mode: 주황 테마
- 모드 전환 시 사이드바 메뉴 즉시 변경 (클라이언트 상태)

# 시드 데이터
- 기본 ADMIN 계정 1개 (admin@cv3.com / admin1234)
- 부서 2개 (개발팀, 디자인팀)
- 팀 3개
- 정책 기본값 (PolicyConfig):
  - work_hours.standard_start: "09:00"
  - work_hours.standard_end: "18:00"
  - work_hours.lunch_minutes: 60
  - leave.annual.first_year_monthly: 1
  - leave.annual.base_days: 15
  - leave.annual.additional_per_2_years: 1
  - leave.annual.max_cap: 25
  - leave.sick.days_per_year: 3
  - leave.half_day_enabled: true
  - leave.quarter_day_enabled: true
  - overtime.min_unit_minutes: 30
  - overtime.compensation_rate: 1.5
  - admin_proxy_leave.auto_approve: true
  - invitation.expiry_hours: 72

로그인 → 대시보드(빈 화면이라도 됨) → 모드 전환이 작동하는 것까지 구현하세요.
```

---

### Phase 2: 직원 관리 + 초대

```
CV3 People Phase 2를 구현합니다.

# 직원 관리 (Admin Mode)
## /admin/users 페이지
- 직원 목록 테이블: 이름, 이메일, 부서, 팀, 직급, 입사일, 상태, 역할
- 검색 (이름/이메일), 부서 필터, 상태 필터
- "직원 초대" 버튼 → /admin/users/invite
- 행 클릭 → /admin/users/[id]

## /admin/users/[id] 상세 페이지
- 프로필 정보 표시 + 편집
- 역할 변경 (체크박스)
- 상태 변경 (ACTIVE → INACTIVE: 퇴사 처리)
- 퇴사 처리 시: 확인 다이얼로그 → status를 INACTIVE로 변경 + audit log
- 연차/병가/보상휴가 잔여일 표시 (Phase 3에서 실제 데이터 연결, 지금은 UI만)

## API
- GET /api/admin/users - 목록 (검색, 필터, 페이지네이션)
- GET /api/admin/users/[id] - 상세
- PATCH /api/admin/users/[id] - 수정
- POST /api/admin/users/[id]/deactivate - 퇴사 처리

# 직원 초대
## /admin/users/invite 페이지
- 폼: 이메일(필수), 이름(필수), 부서(드롭다운), 팀(부서 연동 드롭다운), 직급, 입사일(필수), 역할(체크박스, 기본 EMPLOYEE)
- "초대 발송" 버튼

## /admin/invitations 페이지 (또는 직원 관리 하위 탭)
- 초대 목록: 이메일, 이름, 상태, 발송일, 만료일
- 액션: 재발송 (PENDING/EXPIRED), 취소 (PENDING)

## /(auth)/invite/[token] 페이지 (공개)
- 토큰 유효성 검증
- 유효: 비밀번호 설정 폼 + 프로필 확인 (이름, 부서, 팀 표시)
- 만료/취소: 에러 메시지
- 활성화 완료 → 로그인 페이지로 리다이렉트

## API
- POST /api/admin/invitations - 초대 생성 + 이메일 발송
  - crypto.randomUUID()로 토큰 생성
  - expiresAt = now + INVITATION_EXPIRY_HOURS
  - Nodemailer로 이메일 발송 (활성화 링크: {BASE_URL}/invite/{token})
- GET /api/admin/invitations - 초대 목록
- POST /api/admin/invitations/[id]/resend - 재발송 (기존 토큰 무효화 → 새 토큰)
- POST /api/admin/invitations/[id]/cancel - 취소
- POST /api/invitations/[token]/accept - 활성화
  - 토큰 검증 (존재 + PENDING + 미만료)
  - 비밀번호 해싱 (bcrypt)
  - User 생성 (status: ACTIVE)
  - Invitation status → ACCEPTED

# Audit Log
- 모든 생성/수정/삭제 API에 audit log 기록 함수 호출 추가
- lib/audit.ts:
  async function logAudit({ actorId, action, targetType, targetId, before?, after?, ipAddress? })

모든 API에 Zod 스키마로 입력 유효성 검증을 적용하세요.
역할 체크는 미들웨어 또는 각 API에서 세션의 roles 확인으로 수행하세요.
```

---

### Phase 3: 근태 Excel 업로드 + 파싱

```
CV3 People Phase 3를 구현합니다.

# Prisma 모델 추가

## Attendance
- id, userId → User, date (DateTime), clockIn (String), clockOut (String?)
- actualWorkHours (Float?), overtimeHours (Float?), status (AttendanceStatus)
- source (EXCEL_UPLOAD, MANUAL), uploadBatchId → UploadBatch?
- createdAt, updatedAt
- @@unique([userId, date])

## UploadBatch
- id, fileName, fileUrl (String?), templateId → ColumnMapping?
- uploadedBy → User, totalRows, successCount, errorCount, skipCount
- status (PROCESSING, COMPLETED, FAILED), errorReport (Json?)
- createdAt

## ColumnMapping
- id, name (unique), mappings (Json), createdBy → User, createdAt

enum AttendanceStatus: NORMAL, LATE, EARLY_LEAVE, ABSENT, INCOMPLETE, ON_LEAVE, ON_SICK_LEAVE

# Excel 파서 (lib/excel-parser.ts)

```typescript
interface ColumnMappingConfig {
  employee_identifier: { column: string; type: "employee_id" | "name" | "email" };
  date: { column: string; format: string };
  clock_in: { column: string; format: string };
  clock_out: { column: string; format: string };
  department?: { column: string; optional: true };
  note?: { column: string; optional: true };
  header_row: number;
  data_start_row: number;
}

// 기본 템플릿
const DEFAULT_TEMPLATE: ColumnMappingConfig = {
  employee_identifier: { column: "A", type: "name" },
  date: { column: "B", format: "YYYY-MM-DD" },
  clock_in: { column: "C", format: "HH:mm" },
  clock_out: { column: "D", format: "HH:mm" },
  header_row: 1,
  data_start_row: 2,
};
```

- xlsx 라이브러리로 파일 읽기
- 행별로 파싱 + 검증:
  - ERROR: 직원 미존재, 날짜 형식 오류 → 해당 행 스킵
  - WARNING: 출퇴근 누락, 동일날짜 중복, 출근>퇴근(야간) → 관리자 확인 필요
- 자동 계산:
  - actualWorkHours = (clockOut - clockIn) - lunchMinutes/60
  - 야간근무 판정: clockOut < clockIn → clockOut에 24h 보정
  - overtimeHours = max(0, actualWorkHours - 8)
  - status 판정: clockIn > standard_start → LATE, clockOut < standard_end → EARLY_LEAVE, clockOut 누락 → INCOMPLETE

# 업로드 플로우 API

1. POST /api/admin/attendance/upload
   - multipart/form-data로 파일 수신
   - UploadBatch 생성 (status: PROCESSING)
   - 파일 파싱 → 미리보기 데이터 + 검증 결과를 UploadBatch.errorReport에 저장
   - 응답: batchId + 미리보기 데이터 (최대 50행) + 오류/경고 요약

2. GET /api/admin/attendance/upload/[batchId]/preview
   - UploadBatch의 파싱 결과 조회

3. POST /api/admin/attendance/upload/[batchId]/confirm
   - body: { skipWarnings: boolean, warningRowActions: { [rowNum]: "include" | "skip" } }
   - ERROR 행 자동 제외
   - WARNING 행: 관리자 선택에 따라 반영 or 스킵
   - Attendance 레코드 upsert (동일 userId+date 시 덮어쓰기 or 스킵: 요청 옵션)
   - 추가근무 후보 자동 생성 (overtimeHours > 0인 레코드)
   - UploadBatch 상태 업데이트: success/error/skip 카운트
   - audit log 기록

# 컬럼 매핑 API
- GET /api/admin/column-mappings - 저장된 매핑 목록
- POST /api/admin/column-mappings - 새 매핑 저장
- PUT /api/admin/column-mappings/[id] - 수정

# 출퇴근 캘린더
## Employee Mode: /(employee)/attendance
- 월간 캘린더 뷰 (date-fns로 날짜 계산)
- 각 날짜 셀에: 출근시각, 퇴근시각, 상태 배지 (색상 코딩)
- 색상: NORMAL=기본, LATE=노랑, ABSENT=빨강, ON_LEAVE=파랑, ON_SICK_LEAVE=보라, INCOMPLETE=회색점선

## Admin Mode: /(admin)/attendance
- 직원 선택 드롭다운 + 월간 캘린더 뷰
- 부서/팀 필터
- 근태 집계 요약 (총 근무일, 지각 횟수, 결근 등)

# Excel 업로드 UI
## /(admin)/attendance/upload
1. 드래그앤드롭 영역 + 파일 선택 버튼
2. 템플릿 선택 (기본 or 저장된 매핑)
3. (매핑 미존재 시) 컬럼 매핑 UI: 각 필수 필드에 드롭다운으로 컬럼 지정
4. 미리보기 테이블: 파싱 결과, 오류 행 빨간 배경, 경고 행 노란 배경
5. 검증 리포트 요약: "성공: 150건, 오류: 3건(자동 제외), 경고: 5건"
6. 경고 행 개별 포함/제외 토글
7. [반영] 버튼 → 확인 다이얼로그 → 결과 요약
```

---

### Phase 4: 연차/병가 자동 부여 + 휴가 신청 + 승인

```
CV3 People Phase 4를 구현합니다.

# Prisma 모델 추가

## LeaveBalance
- id, userId → User, leaveType (ANNUAL, SICK, COMPENSATORY)
- year (Int), grantedDays (Float), usedDays (Float), remainingDays (Float)
- expiresAt (DateTime?), grantedReason (AUTO, MANUAL, OVERTIME)
- adjustedBy → User?, createdAt, updatedAt
- @@unique([userId, leaveType, year])

## LeaveRequest
- id, userId → User
- leaveType (ANNUAL, HALF_AM, HALF_PM, QUARTER, SICK, COMPENSATORY)
- startDate, endDate, days (Float)
- reason (String?), status (LeaveStatus)
- registeredBy → User (본인 or 대리등록자)
- isProxy (Boolean, default: false)
- l1ApproverId → User?, l1ApprovedAt?, l1RejectReason?
- l2ApproverId → User?, l2ApprovedAt?, l2RejectReason?
- calendarEventId (String?), calendarSynced (Boolean, default: false)
- createdAt, updatedAt

## OvertimeRequest
- id, userId → User, attendanceId → Attendance
- date, overtimeHours (Float)
- status (CANDIDATE, APPROVED, REJECTED, COMPENSATED)
- approvedBy → User?, approvedAt?, rejectReason?
- createdAt

enum LeaveStatus: DRAFT, PENDING_L1, PENDING_L2, APPROVED, REJECTED_L1, REJECTED_L2, CANCELLED

# 정책 엔진 (lib/policy-engine.ts)

## 연차 부여 로직
```typescript
function calculateAnnualLeave(hireDate: Date, currentDate: Date, policyConfig: PolicyConfig): {
  grantedDays: number;
  expiresAt: Date;
} {
  const yearsWorked = differenceInYears(currentDate, hireDate);
  
  if (yearsWorked < 1) {
    // 첫해: 매월 만근 시 1일 (별도 월별 트리거)
    return { grantedDays: 0, expiresAt: addYears(hireDate, 1) };
  }
  
  // 2년차 이상: base + floor((yearsWorked - 1) / 2)
  const baseDays = policyConfig.leave.annual.base_days; // 15
  const additional = Math.floor((yearsWorked - 1) / 2) * policyConfig.leave.annual.additional_per_2_years;
  const total = Math.min(baseDays + additional, policyConfig.leave.annual.max_cap);
  
  return {
    grantedDays: total,
    expiresAt: new Date(currentDate.getFullYear() + 1, 0, 1), // 다음해 1/1
  };
}
```

## 첫해 월별 부여 (배치/크론 or API 트리거)
- 매월 1일 실행: 입사 첫해 직원 중 전월 만근자에게 1일 부여
- 만근 판정: 소정근무일의 80% 이상 출근 (설정 가능)
- LeaveBalance 레코드 생성/갱신

## 회계연도 일괄 부여 (1/1 배치)
- 매년 1/1: 2년차 이상 ACTIVE 직원에게 연차 일괄 부여
- 기존 연도 잔여 연차 소멸 처리

## 병가 부여
- 매년 1/1: ACTIVE 직원에게 3일 부여
- 이전 연도 미사용분 소멸

# 휴가 신청 (Employee Mode)

## /(employee)/leaves/new 페이지
- 유형 선택: 연차, 반차(오전), 반차(오후), 반반차, 병가, 보상휴가
- 시작일, 종료일 (DatePicker)
- 자동 일수 계산: 연차=영업일 계산, 반차=0.5, 반반차=0.25
- 사유 입력 (병가 시 필수)
- 잔여일 실시간 표시 ("잔여 연차: 12일, 이번 신청: 2일 → 신청 후: 10일")
- 첨부파일 (선택)
- 병가 시: 1차 승인자 선택 드롭다운
  - 후보: 본인 팀 TEAM_LEAD > 상위 부서 TEAM_LEAD > HR
  - GET /api/employee/approver-candidates 에서 조회
- 병가 시 승인 워크플로우 미리보기 표시:
  "[신청자] → [1차: 선택한 팀장] → [2차: HR] → 완료"
- [신청] 버튼

## API: POST /api/employee/leaves
- Zod 유효성 검증
- 잔여일 검증 (부족 시 400 에러)
- 동일 날짜 기존 APPROVED 건 검증 (중복 시 400)
- 연차/반차/반반차/보상휴가: status → APPROVED (자동승인), 잔여일 차감
- 병가: status → PENDING_L1, l1ApproverId 설정
- audit log 기록
- 자동승인 시: Google Calendar 동기화 트리거 (Phase 5에서 실제 연동, 여기서는 calendarSynced 플래그만)

## /(employee)/leaves 페이지
- 내 휴가 목록: 상태 배지, 유형, 기간, 승인 진행 상황
- 상태 필터 탭: 전체 / 대기 중 / 승인 / 반려 / 취소
- 각 건 클릭 → 상세 (승인 이력 타임라인)
- PENDING 상태에서 취소 가능

# 승인 (Employee Mode — TEAM_LEAD)

## /(employee)/approvals 페이지
- "대기 중" 탭: 내가 승인해야 할 건 목록
- "완료" 탭: 승인/반려 이력
- 각 건에 승인/반려 버튼
- 반려 시 사유 입력 필수

## API
- GET /api/approvals/pending - 내가 l1_approver인 PENDING_L1 건 목록
- POST /api/approvals/[leaveId]/approve-l1
  - status → PENDING_L2 (병가), l1ApprovedAt 설정
  - HR에게 알림 (Phase 5에서 이메일, 여기서는 로직만)
  - l2ApproverId: HR 역할 보유자 중 자동 배정 (첫 번째 HR, 설정 가능)
- POST /api/approvals/[leaveId]/reject-l1
  - status → REJECTED_L1, 사유 저장

## HR 2차 승인 (Admin Mode)
- /(admin)/approvals 페이지
- PENDING_L2 건 목록
- POST /api/approvals/[leaveId]/approve-l2
  - status → APPROVED, 잔여일 차감, calendarSynced 플래그
- POST /api/approvals/[leaveId]/reject-l2
  - status → REJECTED_L2

# 휴가 대리 등록 (Admin Mode)

## /(admin)/leaves/proxy 페이지
- 대상 직원 검색/선택
- 휴가 유형, 기간, 사유 입력
- [등록] 버튼

## API: POST /api/admin/leaves/proxy
- isProxy: true, registeredBy: 관리자 ID
- auto_approve 설정 확인:
  - true → 즉시 APPROVED, 잔여일 차감
  - false → 해당 유형의 승인 워크플로우 적용
- audit log 기록

# 추가근무 승인 + 보상휴가 적립

## /(admin)/overtime 페이지
- OvertimeRequest 목록 (CANDIDATE 상태)
- 직원명, 날짜, 추가근무 시간, 상태
- 건별 승인/반려 + 체크박스 일괄 승인
- 반려 시 사유 입력

## API
- GET /api/admin/overtime/candidates
- POST /api/admin/overtime/[id]/approve
  - status → APPROVED → 보상휴가 적립:
    - compensatoryHours = overtimeHours × 1.5
    - compensatoryDays = compensatoryHours / 8
    - LeaveBalance (COMPENSATORY) 갱신: grantedDays += compensatoryDays
  - status → COMPENSATED
- POST /api/admin/overtime/[id]/reject
- POST /api/admin/overtime/bulk-approve (ids 배열)

# 연차 수동 조정 (Admin Mode)

## /(admin)/users/[id] 페이지 하단에 추가
- 현재 잔여일 표시 (연차, 병가, 보상휴가)
- "조정" 버튼 → 모달: 유형 선택, 증감량, 사유(필수)
- POST /api/admin/balance/[userId]/adjust
  - grantedDays 또는 usedDays 조정
  - 사유 + adjustedBy 기록
  - audit log

# 잔여 연차 현황 (Employee Mode)

## /(employee)/balance 페이지
- 카드 형태: 연차 (잔여/총), 병가 (잔여/총), 보상휴가 (잔여/총)
- 각 유형별 소멸 예정일 표시
- 사용 이력 목록
```

---

### Phase 5: Google Calendar 연동 + 메일 발송

```
CV3 People Phase 5를 구현합니다.

# Google Calendar 연동 (lib/google-calendar.ts)

## 서비스 계정 설정
- Google Cloud Console에서 서비스 계정 생성
- Calendar API 활성화
- 서비스 계정에 팀별 캘린더 쓰기 권한 부여
- GOOGLE_SERVICE_ACCOUNT_KEY 환경변수로 키 파일 경로 또는 JSON 전달

## Calendar 서비스 모듈
```typescript
import { google } from 'googleapis';

class CalendarService {
  private calendar;
  
  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    this.calendar = google.calendar({ version: 'v3', auth });
  }
  
  async createLeaveEvent(params: {
    calendarId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    isHalfDay?: 'AM' | 'PM';
  }): Promise<string> // returns eventId
  
  async deleteLeaveEvent(calendarId: string, eventId: string): Promise<void>
  
  async updateLeaveEvent(calendarId: string, eventId: string, params: Partial<...>): Promise<void>
}
```

## 동기화 트리거
- 휴가 상태 변경 시 자동 호출:
  - APPROVED → createLeaveEvent → calendarEventId 저장, calendarSynced = true
  - CANCELLED / REJECTED → deleteLeaveEvent → calendarEventId 제거, calendarSynced = false
  - 날짜 수정 → deleteLeaveEvent + createLeaveEvent (새 eventId)

## 일정 형식
- 제목: "{이름} | {휴가유형}" (예: "홍길동 | 연차")
- 종일 이벤트 (연차, 병가, 보상휴가)
- 반차: 시간 이벤트 (오전 09:00~13:00, 오후 13:00~18:00)
- 반반차: 2시간 블록 (시간대는 신청 시 선택, 설정 가능)

## 동기화 실패 처리
- try-catch로 감싸기
- 실패 시: calendarSynced = false, 재시도 3회 (지수 백오프: 1s, 3s, 9s)
- 최종 실패: AuditLog에 CALENDAR_SYNC_FAILED 기록
- Admin 대시보드에 "캘린더 동기화 실패" 경고 배너 표시
  - GET /api/admin/calendar/sync-failures → calendarSynced = false인 APPROVED 건 목록
  - "재동기화" 버튼 → POST /api/admin/calendar/force-sync

## 캘린더 설정 UI (Admin Mode)
- /(admin)/calendar/settings 페이지
- 팀별 Google Calendar ID 매핑 테이블
  - 팀 이름 | 캘린더 ID | 연동 상태
- 테스트 버튼: 해당 캘린더에 테스트 이벤트 생성/삭제

## 핵심: 관리자 대리 등록도 동일하게 동기화
- 동기화 트리거는 LeaveRequest.status 변경에 바인딩
- registeredBy나 isProxy는 동기화 조건에 영향 없음
- 동기화 여부는 오직: status === APPROVED → sync, status !== APPROVED → unsync

# 메일 발송 (lib/mailer.ts)

## Nodemailer 설정
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

## 메일 유형
1. 초대 메일: 활성화 링크 포함
2. 승인 요청 알림: 승인자에게 (병가 신청 시)
3. 승인/반려 결과 알림: 신청자에게
4. 대리 등록 알림: 해당 직원에게
5. 연차 촉진 메일: 잔여 연차 안내

## MailLog 모델 추가
```prisma
model MailLog {
  id             String   @id @default(cuid())
  type           MailType
  recipientId    String?
  recipientEmail String
  subject        String
  status         MailStatus // SENT, FAILED, RETRYING
  retryCount     Int      @default(0)
  sentAt         DateTime?
  errorMessage   String?
  createdAt      DateTime @default(now())
}

enum MailType {
  INVITATION
  APPROVAL_REQUEST
  APPROVAL_RESULT
  PROXY_LEAVE_NOTIFICATION
  LEAVE_REMINDER
}

enum MailStatus {
  SENT
  FAILED
  RETRYING
}
```

## 발송 + 재시도 로직
```typescript
async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  type: MailType;
  recipientId?: string;
}) {
  const mailLog = await prisma.mailLog.create({ ... status: 'RETRYING' });
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await transporter.sendMail({ from: SMTP_USER, ...params });
      await prisma.mailLog.update({ id: mailLog.id, status: 'SENT', sentAt: new Date() });
      return;
    } catch (error) {
      await prisma.mailLog.update({ id: mailLog.id, retryCount: attempt + 1 });
      if (attempt < 2) await sleep(Math.pow(3, attempt) * 1000);
    }
  }
  await prisma.mailLog.update({ id: mailLog.id, status: 'FAILED', errorMessage: ... });
}
```

## 연차 촉진 메일 (Admin Mode)

### /(admin)/mail/leave-reminder 페이지
- "대상자 미리보기" 버튼: 잔여 연차 > 0인 ACTIVE 직원 목록
  - 이름, 이메일, 잔여 연차, 소멸 예정일
- "발송" 버튼 → 확인 다이얼로그 → 일괄 발송
- 발송 이력 탭: 발송일, 대상자 수, 성공/실패 건수
- 실패 건 재발송 버튼

### API
- GET /api/admin/mail/leave-reminder/preview - 대상자 목록
- POST /api/admin/mail/leave-reminder - 발송 실행
  - 각 대상자에게 개별 메일 발송 (배치)
  - MailLog 기록
- GET /api/admin/mail/logs?type=LEAVE_REMINDER - 이력 조회

## 알림 메일 자동 발송 (승인 관련)
- 병가 신청 → 1차 승인자에게 APPROVAL_REQUEST 메일
- L1 승인 → HR에게 APPROVAL_REQUEST 메일
- 승인/반려 완료 → 신청자에게 APPROVAL_RESULT 메일
- 대리 등록 → 해당 직원에게 PROXY_LEAVE_NOTIFICATION 메일

각 메일에 CV3 People 해당 화면 딥링크 포함.
```

---

### Phase 6: 대시보드 + 감사 로그 + 마무리

```
CV3 People Phase 6을 구현합니다.

# Employee 대시보드 — /(employee)/dashboard

## 카드 레이아웃:
1. "오늘 근태" 카드: 출근시각, 퇴근시각, 상태 배지 (데이터 없으면 "기록 없음")
2. "잔여 연차" 카드: 연차 잔여일 / 총 일수, 프로그레스 바
3. "다가오는 휴가" 카드: 다음 예정된 APPROVED 휴가 (없으면 "예정된 휴가 없음")
4. "승인 대기" 카드 (TEAM_LEAD만): 내가 승인해야 할 건수, 클릭 → 승인함

# Admin 대시보드 — /(admin)/dashboard

## 카드 + 차트:
1. "오늘 현황" 카드: 출근 인원/전체 인원, 오늘 휴가자 수
2. "승인 대기" 카드: 병가 L1 대기, L2 대기, 추가근무 대기 건수
3. "이번 달 근태 요약": 총 지각, 결근, 조퇴 건수 (간단한 수치)
4. "캘린더 동기화 실패" 경고 (있는 경우만 표시)
5. "오늘 휴가자 목록": 이름, 유형, 기간

# 감사 로그 — /(admin)/audit-logs

## 테이블:
- 일시, 행위자, 액션, 대상 유형, 대상, 상세 (before/after 축약)
- 필터: 기간 (DateRangePicker), 행위자 (드롭다운), 액션 유형, 대상 유형
- 행 클릭 → 상세 모달 (before/after JSON diff 뷰)
- CSV 내보내기 버튼

## API:
- GET /api/admin/audit-logs?actor=&action=&targetType=&from=&to=&page=&limit=
- GET /api/admin/audit-logs/export → CSV 다운로드

# 전역 미완성 사항 마무리

## 1. 에러 핸들링
- 모든 API에 일관된 에러 응답 형식: { error: { code, message, details? } }
- 프론트엔드: React Query의 onError에서 toast 알림

## 2. 로딩 상태
- 모든 데이터 페칭에 Skeleton UI 적용

## 3. 빈 상태
- 데이터 없을 때 일러스트 + 안내 문구 (예: "아직 근태 기록이 없습니다")

## 4. 반응형
- 최소 데스크톱 (1280px+) 최적화
- 태블릿 (768px+) 기본 대응

## 5. 페이지네이션
- 목록 API 모두: page, limit, totalCount 응답
- 프론트엔드: shadcn/ui Pagination 컴포넌트

## 6. 토스트 알림
- 성공/실패 시 하단 토스트 (shadcn/ui toast)

## 7. 확인 다이얼로그
- 삭제, 퇴사 처리, 대량 작업 시 AlertDialog

## 8. DB 시드 스크립트 업데이트
prisma/seed.ts:
- ADMIN 1명 (admin@cv3.com)
- HR 1명 (hr@cv3.com)
- TEAM_LEAD 2명
- EMPLOYEE 5명
- 부서 2개, 팀 3개
- 각 직원에게 연차/병가 LeaveBalance
- 샘플 Attendance 데이터 (이번 달)
- 샘플 LeaveRequest 2-3건

전체 앱이 잘 동작하는지 확인하고, 빠진 import나 타입 에러를 수정해주세요.
```

---

## 부록: Claude Code 실행 가이드

### 사용 방법

1. 터미널에서 프로젝트 디렉토리 생성 후 Claude Code 시작
2. Phase 0부터 순서대로 각 브리프를 Claude Code에 입력
3. 각 Phase 완료 후 `npm run dev`로 확인
4. 문제 발생 시 에러 메시지와 함께 Claude Code에 수정 요청

### Phase별 예상 작업량

| Phase | 예상 시간 | 핵심 산출물 |
|-------|----------|------------|
| Phase 0 | 10분 | 프로젝트 스캐폴딩 |
| Phase 1 | 30~40분 | DB 모델, 인증, 모드 전환 UI |
| Phase 2 | 30~40분 | 직원 CRUD, 초대 플로우 |
| Phase 3 | 40~50분 | Excel 파서, 업로드 UI, 캘린더 뷰 |
| Phase 4 | 50~60분 | 연차/병가 엔진, 휴가 신청, 승인 |
| Phase 5 | 40~50분 | Google Calendar, 메일 발송 |
| Phase 6 | 30~40분 | 대시보드, 감사 로그, 마무리 |

### 주의사항
- 각 Phase는 이전 Phase의 코드 위에 빌드됨
- Phase 간 DB 마이그레이션 필요: `npx prisma migrate dev --name phase_N`
- 환경변수 (.env)는 Phase 0에서 설정, Google 관련은 Phase 5 전에 준비
- Phase 4의 연차 자동 부여 배치는 MVP에서는 수동 트리거 API로 대체 가능 (크론은 배포 환경에 따라 별도 설정)
