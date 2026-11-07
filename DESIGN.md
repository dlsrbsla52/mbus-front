# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-07-19
- Primary product surfaces: 공개 사이트, 로그인 사용자 영역, 관리자 콘솔. 이 문서의 현재 상세 범위는 관리자 계약 관리(`/manager/contract`)와 연계된 내 계약(`/contract`)이다.
- Evidence reviewed:
  - `app/globals.css`: 브랜드·상태 색상과 Noto Sans KR 토큰
  - `components/manager/ManagerShell.tsx`, `components/manager/Sidebar.tsx`, `constants/navigation.ts`: 관리자 레이아웃, 반응형 내비게이션, 거래 메뉴 구조
  - `components/common/{PageHeader,DataTable,Pagination,PageSizeSelect,EmptyState,Modal,StatCard}.tsx`: 목록·상세·상태 UI의 공통 패턴
  - `app/(manager)/manager/{reservation,stop,contract}/page.tsx`: 관리자 검색, 테이블, 상세 모달, 계약 전환 흐름
  - `app/(protected)/contract/**`: 사용자 계약 목록·상세·갱신 흐름
  - `lib/api/{contract,admin/contract,admin/reservation}.ts`: 현재 프런트 계약 모델과 서비스 경계
  - `/Users/hig/IdeaProjects/reservation/modules/reservation/build/docs/openapi/openapi-reservation.yaml`: 계약 생성·본인 목록·상세, 관리자 결합 응답의 실제 필드와 enum
- Evidence boundary: 저장소에 별도 디자인 문서, 화면 캡처, Figma 링크, Storybook 또는 시각 회귀 기준 이미지는 확인되지 않았다. 아래 방향은 기존 코드와 OpenAPI에서 관찰한 사실을 우선하고, 제품 정책이 필요한 부분은 명시적 가정 또는 질문으로 남긴다.

## Brand

- Personality: 정확하고 절제된 B2B 운영 도구. 장식보다 계약 상태, 기간, 금액, 납부 현황의 빠른 판독을 우선한다.
- Trust signals: 일관된 한국어 용어, 원화 천 단위 표기, 날짜 범위, 상태 배지, 전체 건수와 페이지, 오류 원인, 처리 중 상태를 명확히 표시한다.
- Avoid: 새로운 색상 체계, 과도한 그라데이션·그림자·애니메이션, 영문 enum의 그대로 노출, API가 지원하지 않는 수정·취소·결제 액션의 활성화.

## Product goals

- Goals:
  - 관리자가 계약명, 정류장, 계약자, 기간, 계약 상태와 납부 상태를 한 화면에서 훑는다.
  - 계약의 핵심 금액·납부 조건을 상세 보기에서 검증한다.
  - 예약에서 계약으로 전환된 결과를 계약 관리에서 다시 확인할 수 있다.
  - 데이터 부재, 조회 실패, 일부 연계 정보 누락을 서로 다른 상태로 구분한다.
- Non-goals:
  - 현재 OpenAPI에 없는 계약 수정, 해지, 관리자 결제 처리, 전자서명, 파일 다운로드 기능을 디자인상 약속하지 않는다.
  - 프런트엔드에서 `/api/v1/internal/...` S2S API를 직접 호출하지 않는다.
  - 계약 관리 기능을 별도 대시보드·차트 중심 제품으로 확장하지 않는다.
- Success signals: 관리자가 목록에서 계약을 식별하고 상세 정보를 열 수 있으며, 모든 OpenAPI 상태와 nullable 필드가 깨지지 않고 표현되고, 작은 화면에서도 정보 손실 없이 탐색할 수 있다.

## Personas and jobs

- Primary personas: `MANAGE` 권한을 가진 운영 관리자 및 영업 담당자. 최종 접근 범위는 백엔드 권한 정책이 결정한다.
- User jobs: 담당 계약 찾기, 활성/대기/만료/취소 상태 확인, 계약 기간과 총액 확인, 납부 주기·방법·미납 여부 확인, 예약 전환 결과 검증.
- Key contexts of use: 데스크톱에서 반복적인 운영 조회가 주 사용 맥락이며, 태블릿·모바일에서는 긴급 확인과 단건 열람을 지원한다.

## Information architecture

- Primary navigation: 기존 관리자 사이드바의 `거래 > 계약 관리`를 유지한다. 계약 생성은 독립 진입점보다 `예약 관리 > 상담 완료 및 계약 생성` 흐름을 우선한다.
- Core routes/screens:
  - `/manager/contract`: 계약 목록, 검색/필터, 페이지 크기, 페이지네이션
  - `/manager/contract`의 상세 모달 또는 후속 `/manager/contract/[id]`: 계약 기본 정보와 납부 정보
  - `/contract`, `/contract/[id]`: 로그인 사용자의 본인 계약 목록과 상세
- Content hierarchy:
  1. 페이지 제목과 목적
  2. 계약 상태·납부 상태·기간 중심 필터
  3. 결과 테이블과 핵심 상태
  4. 전체 건수와 페이지 이동
  5. 선택 계약 상세
- Recommended manager list columns: 계약명/정류장, 계약 상태, 계약 기간, 계약자 식별값, 총 계약금액, 납부 상태. 생성일과 납부 조건은 상세에서 제공해 표 밀도를 제한한다.
- Recommended detail groups: `계약 정보`(계약명, 정류장, 계약자, 상태, 기간, 생성일)와 `납부 정보`(총액, 회당 납부액, 주기, 방법, 납부 상태, 납부액, 납부일)를 구분한다.

## Design principles

- Operational scan first: 목록에는 비교 빈도가 높은 정보만 두고 세부 결제 필드는 상세로 이동한다.
- State before action: 사용자가 지금 가능한 작업을 오해하지 않도록 상태와 조회 결과를 먼저 보여주며, 미지원 액션은 숨기거나 연동 대기임을 명시한다.
- Honest degradation: 정류장 서비스 장애로 `stopName`/`stopNumber`가 null이면 계약 자체를 숨기지 않고 `정류장 정보 없음`과 축약 ID를 표시한다.
- Consistency over novelty: `PageHeader`, `DataTable`, `Pagination`, `PageSizeSelect`, `EmptyState`, `Modal`을 재사용한다.
- Tradeoffs: 한 행의 정보량보다 모바일 가독성과 빠른 스캔을 우선한다. 관리자 API가 제공하는 모든 필드를 목록 열로 만들지 않는다.

## Visual language

- Color: `brand-black`을 주요 액션과 제목에, `brand-blue`를 포커스·링크·선택 강조에 쓴다. 성공/주의/위험 토큰은 의미 상태에만 사용한다.
- Typography: Noto Sans KR, 페이지 제목 `text-2xl font-black`, 본문·표 `text-sm`, 보조 정보 `text-xs`의 기존 위계를 유지한다. UUID·정류장 번호만 고정폭 글꼴을 허용한다.
- Spacing/layout rhythm: 관리자 본문 `max-w-7xl`, 섹션 간 `gap-6`, 카드·표 내부 12~20px 패턴을 따른다.
- Shape/radius/elevation: 기본 `rounded-md`/`rounded-lg`와 1px 회색 테두리를 사용한다. 상세 모달 외에는 강한 그림자를 추가하지 않는다.
- Motion: hover, focus, 모달 등장 등 기능 피드백 수준으로 제한한다. 데이터 상태 변화에 장식 애니메이션을 사용하지 않는다.
- Imagery/iconography: Lucide 아이콘을 기존 크기(16~20px)로 사용한다. 계약 상태 전달을 아이콘에만 의존하지 않는다.

## Components

- Existing components to reuse: `PageHeader`, `DataTable`, `Pagination`, `PageSizeSelect`, `EmptyState`, `Modal`; 요약 수치가 실제 API로 제공될 때만 `StatCard`.
- New/changed components:
  - `ContractStatusBadge`: `PENDING`, `ACTIVE`, `EXPIRED`, `CANCELLED`의 한국어 라벨과 고정 색상 매핑
  - `PaymentStatusBadge`: `UNPAID`, `PAID`, `OVERDUE`의 한국어 라벨과 고정 색상 매핑
  - 계약 상세 정보 행/섹션: nullable 값을 일관되게 `—`로 처리
- Variants and states:
  - 계약 상태: 대기(주의), 진행 중(성공), 만료(중립), 취소(위험 또는 낮은 강조)
  - 납부 상태: 미납(주의), 납부 완료(성공), 연체(위험)
  - 상태는 색상과 한국어 텍스트를 함께 사용한다.
- Token/component ownership: 색상 토큰은 `app/globals.css`, 공통 UI는 `components/common`, 도메인 enum 라벨과 포맷은 계약 API 모듈 또는 계약 전용 컴포넌트가 소유한다. 페이지에 중복 매핑을 흩뿌리지 않는다.

## Accessibility

- Target standard: WCAG 2.1 AA 수준을 목표로 한다.
- Keyboard/focus behavior: 모든 필터와 행 상세 진입은 키보드로 가능해야 한다. 클릭 가능한 행은 링크/버튼 의미를 제공하고, 모달은 열릴 때 포커스를 내부로 이동하며 닫을 때 원래 트리거로 복원해야 한다.
- Contrast/readability: 배지의 배경색만으로 상태를 전달하지 않으며 작은 회색 글자의 대비를 검토한다. 금액과 날짜는 줄바꿈으로 의미가 갈라지지 않게 한다.
- Screen-reader semantics: 표 헤더는 `scope="col"`, 필터에는 가시적 label, 오류에는 적절한 알림 의미, 모달에는 제목 연결을 제공한다.
- Reduced motion and sensory considerations: 필수 모션이 없으며 `prefers-reduced-motion` 환경에서 정보 손실이 없어야 한다.

## Responsive behavior

- Supported breakpoints/devices: 기존 Tailwind `sm`, `md` 패턴과 관리자 사이드바의 `md` 전환을 따른다.
- Layout adaptations:
  - 데스크톱: 필터를 한 행에 배치하고 전체 테이블을 표시한다.
  - 좁은 화면: 필터를 줄바꿈하고 페이지 크기 선택을 독립 행으로 둔다. 테이블은 가로 스크롤을 허용하되 계약명/정류장과 상태를 앞쪽에 고정된 정보 순서로 둔다.
  - 상세 모달은 작은 화면에서 화면 너비와 높이를 활용하고 내용 영역을 스크롤한다.
- Touch/hover differences: 행 hover는 보조 피드백일 뿐이며, 터치 환경에서도 명시적 상세 진입 affordance와 충분한 터치 영역을 제공한다.

## Interaction states

- Loading: 기존 `DataTable` 로딩 상태를 사용하고 필터 변경 후 결과가 확정되기 전임을 표시한다. 상세은 별도 로딩 상태를 갖는다.
- Empty: 기본 빈 상태와 필터 결과 없음 상태를 구분한다. 필터 결과 없음에는 `검색 조건을 변경하거나 초기화해보세요.`를 제공한다.
- Error: 테이블과 같은 위치에 위험 토큰 박스를 표시하고, 안전한 경우 `다시 시도`를 제공한다. 기존 데이터가 있으면 오류 때문에 즉시 지우지 않는다.
- Success: 조회 화면에는 불필요한 성공 토스트를 쓰지 않는다. 향후 변경 액션이 추가되면 완료 메시지와 최신 데이터 재조회로 확인한다.
- Disabled: OpenAPI에 없는 액션은 비활성 버튼으로 상시 노출하기보다 숨기는 것을 기본으로 한다. 로드맵 전달이 꼭 필요할 때만 `연동 대기` 설명과 함께 비활성화한다.
- Offline/slow network: 타임아웃·네트워크 오류를 빈 데이터로 오해시키지 않으며 재시도 경로를 제공한다.

## Content voice

- Tone: 짧고 직접적인 존댓말. 운영자가 다음 행동을 판단할 수 있는 사실 중심 문장을 사용한다.
- Terminology: `계약`, `정류장`, `계약 기간`, `총 계약금액`, `회당 납부금액`, `납부 주기`, `납부 방법`, `납부 상태`를 표준어로 사용한다.
- Microcopy rules: enum은 `대기`, `진행 중`, `만료`, `취소`, `미납`, `납부 완료`, `연체`, `월납`, `분기납`, `연납`, `계좌이체`, `카드`, `현금`으로 번역한다. 금액은 `원`, 날짜는 한국 로케일로 표시하며 원본 UTC 문자열을 그대로 노출하지 않는다.

## Implementation constraints

- Framework/styling system: Next.js 16.2.2 App Router, React 19, TypeScript strict, Tailwind CSS v4 `@theme inline`.
- Design-token constraints: `app/globals.css`의 기존 브랜드·상태 토큰을 우선한다. 상태별 일회성 임의 색상을 페이지마다 추가하지 않는다.
- API constraints:
  - 공개 프런트 계약 API는 `POST /api/v1/contract`, `GET /api/v1/contract/me`, `GET /api/v1/contract/{contractId}`이다.
  - OpenAPI의 관리자 결합 목록은 현재 `GET /api/v1/internal/reservation/contract/member/{memberId}`뿐이며 S2S 전용이다. 브라우저가 이를 직접 호출해서는 안 된다. 관리자 화면 구현 전 게이트웨이의 비내부 관리자 프록시 경로와 권한 정책을 확인하거나 추가해야 한다.
  - 실제 `ContractResponse`는 `contractName`, `contractStartDate`, `contractEndDate`를 사용한다. 현재 `lib/api/contract.ts`의 `startDate`, `endDate`, `ownerId`, `amount`, `signedAt` 모델은 제공된 OpenAPI와 불일치하므로 UI 구현 전에 정렬해야 한다.
  - 관리자 응답의 `totalAmount`, `payAmount`, `paymentCycle`, `paymentMethod`, `paymentStatus`, `paidAmount`, `paidAt`, `stopName`, `stopNumber`는 일부 null일 수 있다.
  - 요청 날짜는 `lib/api/date-serializer.ts`를 사용하며 `new Date().toISOString()`을 직접 쓰지 않는다.
- Performance constraints: 서버 페이지네이션을 유지하고, 클라이언트에서 전체 계약을 받아 필터링하지 않는다. 필터 입력은 명시적 검색 제출 또는 적절한 debounce를 사용한다.
- Compatibility constraints: `withCredentials`와 메모리 access token 인증 흐름, 관리자 `MANAGE` guard, 백엔드 최종 권한 강제를 유지한다.
- Test/screenshot expectations: 변경 후 lint, TypeScript, build 순으로 검증한다. 계약 상태별·nullable 필드·빈 결과·API 오류·모바일 가로 스크롤을 수동 확인한다. `next/font/google` 네트워크 실패는 코드 실패와 구분한다.

## Open questions

- [ ] 관리자 계약 목록의 브라우저 호출용 비내부 API 경로와 인증 주체는 무엇인가? / backend·gateway owner / 구현 차단
- [ ] 관리자에게 전체 계약을 보여줄지, 로그인한 영업 담당자의 계약만 보여줄지? / product·backend owner / 조회 범위와 필터 결정
- [ ] 계약 상세는 목록 내 모달로 유지할지 별도 URL을 제공할지? / product owner / 딥링크·뒤로가기 UX
- [ ] 계약 상태 `CANCELLED`와 기존 프런트 타입의 `TERMINATED`, 납부 상태 `OVERDUE`와 기존 `REFUNDED` 중 실제 운영 enum은 무엇인가? / reservation backend owner / 타입·라벨·필터 정확성
- [ ] 관리자가 실행할 수 있는 계약 수정·취소·납부 상태 변경 API가 추가될 예정인가? / product·backend owner / 상세 액션 범위
- [ ] 사용자 계약 화면의 결제·전자서명·갱신 API는 현재 제공된 OpenAPI 범위에 없는데 유지할 로드맵 기능인가? / product owner / 미지원 버튼 노출 정책

