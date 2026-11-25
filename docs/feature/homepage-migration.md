# 홈페이지 이관 (기존 mbus.co.kr → Next.js)

> 기존 cafe24 홈페이지(`https://www.mbus.co.kr/default/...`)의 메뉴·내용·레이아웃을 이 저장소로 옮기고,
> 포트폴리오·공지사항·FAQ는 관리자 화면에서 편집, 온라인 문의는 DB에 저장해 관리자가 처리하게 한다.
> 브랜치: 화면 `feature/site/homepage-migration`(이 저장소), 백엔드 `feature/content/homepage-cms`(`~/IdeaProjects/reservation`)

## 1. 결정 사항 (2026-11-25)

| 항목 | 결정 |
| --- | --- |
| 공지사항·FAQ | 백엔드 `content` 모듈에 저장하고 관리자 화면에서 편집 |
| 온라인 문의 | DB 저장 + 관리자 문의 목록 + IP별 호출 제한(기존 캡차는 두지 않음) |
| 디자인 | 기존 사이트 레이아웃 재현(메인 슬라이더, 서브 비주얼, 하위 메뉴 탭, 푸터). cafe24 템플릿 CSS·JS는 가져오지 않고 Tailwind로 다시 만든다 |
| 콘텐츠 편집 권한 | 포트폴리오·공지사항·FAQ는 `ADMIN_MASTER`·`ADMIN_DEVELOPER` + `MANAGE` (정류장 관리와 동일). 온라인 문의는 관리자 중 조회 `READ`, 처리·삭제 `WRITE` |

## 2. 페이지 대응

| 메뉴 | 기존 URL (`/default/...`) | 새 경로 | 데이터 |
| --- | --- | --- | --- |
| 홈 | `main/home.php` | `/` | 정적 + 최근 공지 5건(API) |
| 회사소개 > 인사말 | `company/greeting.php` | `/company` | 정적 |
| 회사소개 > 오시는 길 | `company/location.php` | `/company/location` | 정적 (`KakaoMap`, 키 없으면 약도 이미지) |
| 매체소개 > 매체소개 | `business/areas.php` | `/media` | 정적 |
| 매체소개 > 매체안내 | `business/introduction.php` | `/media/guide` | 정적 |
| 포트폴리오 | `gallery/gallery1.php` | `/portfolio` | API (카테고리 탭, 그리드, 모달) |
| 온라인 문의 | `cs/qa.php` | `/inquiry` | API (등록) |
| 고객센터 > 공지사항 | `customer/notice.php` | `/support/notice`, `/support/notice/detail?id=` | API |
| 고객센터 > FAQ | `customer/faq.php` | `/support/faq` | API |
| 개인정보처리방침 | `member/policy.php` | `/privacy` | 정적 |

- 정적 export(Cloudflare Pages) 호환: 동적 세그먼트 대신 쿼리 파라미터를 쓰고, API 데이터는 클라이언트(SWR)에서 불러온다.
- 기존 주소는 `public/_redirects`(Cloudflare Pages)로 새 경로에 301 연결한다. 쿼리(`com_board_idx` 등)는 버리고 목록으로 보낸다.
- 정적 자산(메인·서브 비주얼, 본문 이미지, 로고, 파트너 로고)은 WebP로 변환해 `public/images/site/`에 둔다. 파트너 로고는 지금 협력사 사이트 이미지를 직접 링크하고 있어 내려받아 둔다.
- 푸터 정보: 서울특별시 강남구 선릉로 511, L101 (07797) / 전화 02-6398-1200 / 팩스 02-6951-5890 / 사업자등록번호 381-87-04003 / 대표 최영미 / 개인정보관리책임자 김용환 / ym.choi@mbus.co.kr

## 3. 백엔드 `content` 모듈

iam·stop·reservation 어디에도 속하지 않는 홈페이지 콘텐츠라 도메인 모듈을 새로 둔다. 스키마 `content`, changelog `db/changelog/content/`.

### 3.1 테이블

| 테이블 | 주요 컬럼 |
| --- | --- |
| `content.portfolio` | 제목, 카테고리(`HOSPITAL`·`ACADEMY`·`FNB`·`ETC`), 설명, 원본·썸네일 이미지 키, 정렬 순서, 노출 여부, `legacy_idx`(이관 중복 방지), 생성·수정일 |
| `content.notice` | 제목, 본문(텍스트), 상단 고정, 노출 여부, 게시일, `legacy_idx`, 생성·수정일 |
| `content.notice_image` | 공지 ID, 이미지 키, 정렬 순서 (본문 아래에 순서대로 표시) |
| `content.faq` | 분류(`MEDIA`·`HOSPITAL`), 질문, 답변, 정렬 순서, 노출 여부, 생성·수정일 |
| `content.inquiry` | 이름, 전화, 이메일, 내용, 개인정보 동의, 접수 IP, 처리 상태(`RECEIVED`·`DONE`), 처리 메모, 처리자, 처리일, 접수일 |

- 공지 본문은 XSS를 피하려고 HTML 대신 텍스트로 저장하고 줄바꿈을 유지해 보여준다. 이미지는 첨부 순서대로 본문 아래에 둔다.
- 기존 FAQ는 글 2개 안에 Q1·Q2… 형태로 들어 있어 문답 단위로 나눠 옮긴다.

### 3.2 이미지 저장

- R2(운영)에 S3 presigned PUT으로 브라우저가 직접 올린다. `common`의 AWS SDK s3 의존성을 쓴다.
- **로컬 확인용 저장소: RustFS** (reservation `docker-compose-local.yml`의 `rustfs`·`rustfs-init`, `localhost:9000`). 운영에는 배포되지 않는다. MinIO는 2025-10 커뮤니티 이미지 배포 중단으로 받을 수 없어 대신 쓴다.
- 키: `portfolio/{uuid}.webp`, `portfolio/{uuid}_thumb.webp`, `notice/{uuid}.webp`. 형식 webp·jpeg·png, 10MB 이하. 등록 시 서버가 키 형식과 객체 존재를 확인한다.
- 항목 삭제·이미지 교체 시 이전 객체를 지운다(실패는 로그만 남기고 진행).

### 3.3 API

공개 (`/api/v1/content/**`, `ApiPathPolicy`의 라우트·공개 목록에 등록):

| 메서드·경로 | 용도 |
| --- | --- |
| `GET /api/v1/content/portfolio?category=&page=&size=` | 노출 중인 포트폴리오 목록 |
| `GET /api/v1/content/notice?page=&size=` | 공지 목록(고정 글 우선) |
| `GET /api/v1/content/notice/detail?id=` | 공지 상세 (공개 경로는 정확 일치라 경로 변수 대신 쿼리) |
| `GET /api/v1/content/faq` | FAQ 전체 |
| `POST /api/v1/content/inquiry` | 문의 등록. IP당 호출 제한(Redis) |

관리자 (`/api/v1/admin/content/**`, iam admin 컨트롤러 → `ContentAdminPort` → app 어댑터 → content Facade):

| 경로 | 기능 |
| --- | --- |
| `POST /images/upload-url` | presigned URL 발급 |
| `/portfolio` | 목록(숨김 포함)·등록·수정·삭제·순서 변경 |
| `/notice` | 목록·상세·등록·수정·삭제 |
| `/faq` | 목록·등록·수정·삭제·순서 변경 |
| `/inquiry` | 목록(상태 필터)·상세(READ), 처리 상태 변경·삭제(WRITE) |

## 4. 화면

- 공통: 헤더(투명 → 스크롤 시 배경, 드롭다운 메뉴), 서브 비주얼 + 하위 메뉴 탭, 푸터(메뉴, 회사 정보, SNS, 관련 사이트).
- 관리자 메뉴 "콘텐츠" 그룹: 포트폴리오·공지사항·FAQ(MASTER·DEVELOPER), 온라인 문의(관리자 전체).
- 이미지 업로드: 브라우저에서 WebP로 변환하고 리사이즈(원본 긴 변 1600px, 썸네일 600px) → presigned PUT → 등록.

## 5. 기존 데이터 이관

- `scripts/legacy/`: 기존 사이트에서 포트폴리오 97건, 공지 5건, FAQ 2건을 크롤링해 매니페스트(JSON)와 원본 이미지를 만든다.
- 같은 폴더의 가져오기 스크립트가 관리자 API(업로드 URL → PUT → 등록)로 올린다. `legacy_idx`로 중복을 막아 다시 실행해도 안전하다. 로컬(RustFS, 로컬 확인용)에서 검증한 뒤 운영 전환 때 다시 실행한다.

## 6. 단계

| 단계 | 저장소 | 내용 |
| --- | --- | --- |
| 1 | mbus | 공통 레이아웃, 정적 페이지, 자산, 리다이렉트 |
| 2 | reservation | `content` 모듈, 공개·관리자 API, 로컬 확인용 RustFS 구성, 테스트 |
| 3 | mbus | 포트폴리오·공지·FAQ·문의 공개 화면, 관리자 화면 |
| 4 | mbus | 이관 스크립트, 로컬 이관 검증 |
| 5 | 양쪽 | `npm run check`·`build`, 백엔드 테스트, 로컬 E2E, 기존 사이트와 화면 비교 |

## 7. 운영 전환 시 할 일 (`hosting-setup.md`와 연계)

- R2 버킷(`img.mbus.co.kr`) CORS에 PUT 허용, 백엔드 환경변수(R2 접속값) 등록
- 이관 스크립트를 운영 API에 다시 실행
- 카카오 지도 키에 운영 도메인 등록

## 8. 진행 상태 (2026-11-25, 모두 미커밋)

### 완료·검증
- **1단계(mbus)**: 공통 레이아웃, 정적 페이지 6개, 자산(`public/images`), `public/_redirects`.
- **2단계(reservation, `feature/content/homepage-cms`)**: `content` 모듈, iam 관리자 API·포트, app 어댑터, 경로 정책, Liquibase, 로컬 확인용 RustFS compose, 문서.
- **3단계(mbus)**: 공개 화면 `/portfolio`·`/support/notice`(+detail)·`/support/faq`·`/inquiry`, 관리자 화면 `/manager/{portfolio,notice,faq,inquiry}`.
- **4단계**: `scripts/legacy/{crawl,import}.mjs`(`npm run legacy:crawl`·`legacy:import`). 로컬에 포트폴리오 97·공지 5·FAQ 27건 이관, 재실행 시 전부 건너뜀, 고아·깨진 이미지 0.
- **검증**
  - reservation `./gradlew clean build` 통과(테스트 441개, busLint 포함), `app.jar`에 content 포함
  - mbus `npm run check`·`npm run build` 통과(새 페이지 14개 모두 정적 생성)
  - 로컬 E2E(API): 업로드 → 등록 → 공개 조회 → 교체·삭제 시 이미지 정리, 문의 호출 제한 429
  - 헤드리스 Chrome: 공개 화면 전체, 관리자 포트폴리오 등록(JPEG → WebP 변환 → RustFS 직접 PUT)·수정·순서·삭제, 공지(이미지 2장), FAQ 순서, 문의 처리
- 기존 사이트는 포트폴리오 97건이 전부 "병원" 분류다(학원·F&B·기타는 비어 있음).

### 코드 리뷰 반영 (2026-11-25)
- 서브에이전트 리뷰(백엔드·프런트)에서 확인된 문제를 모두 고쳤다. reservation 테스트 469개, mbus `check`·`build` 통과, 로컬 E2E(API·브라우저)로 재확인.
- 사용자 결정: 문의 조회 `READ`·처리(상태 변경·삭제) `WRITE`, 문의 삭제 API(`DELETE /api/v1/admin/content/inquiry/{id}`)와 처리 완료 후 90일 자동 파기(`content.inquiry.retention`, 매일 03:30), `.editorconfig` 주석 정책에 `content` 추가.
- 주요 수정: 프록시 뒤 실제 클라이언트 IP(`TRUSTED_PROXIES`), 문의 개인정보 접근 로그 제외, Redis·S3 호출을 트랜잭션 밖으로 이동과 타임아웃, 이미지 키 소유권 검사(W0019), 포트폴리오 키 맞바꾸기 삭제 오류, 요청 DTO 생략 필드, 공지 편집 캐시·게시 시각, 공개 상세 재조회, 모달 스크롤, 업로드 재시도 재사용, lint 경계(`content-model.ts`), 이관 스크립트 안전성, 접근성.
- 처리 메모: 상태 변경의 `memo`가 null이면 유지, 빈 문자열이면 삭제.
- 로컬 저장소 변수는 `LOCAL_CONTENT_STORAGE_*`로 분리했다(운영 `.env`의 `CONTENT_STORAGE_*`를 로컬 실행이 읽지 않게).
- 기존 문제(이번 변경과 무관): `auth-contract`의 `ClaimCipherTest.암호문을 변조하면 복호화가 실패한다`가 약 1/4 확률로 실패한다. 마지막 Base64 글자만 바꿔 채움 비트만 바뀌는 경우가 있어서다.

### 남은 결정·확인
- 개인정보처리방침(`constants/privacy.ts`)과 문의 수집 안내(`INQUIRY_PRIVACY_NOTICE`)는 기존 cafe24 템플릿 문구 그대로다. 실제 수집 항목(접수 IP 포함)·보관 기간(처리 완료 후 90일)·위탁업체(Cloudflare·AWS)·자리표시자(OO신용평가 등)를 운영 전에 검토한다.
- 오시는 길 우편번호 `07797`은 기존 사이트 값이다(선릉로 511은 강남구라 확인 필요). 지도는 기존 사이트와 같은 Google 지도 임베드를 쓴다.
- 운영 전환
  - `.env`에 `TRUSTED_PROXIES`(cloudflared 컨테이너 IP 하나)를 지정한다. 비우면 루프백만 믿어 문의 호출 제한을 방문자 전체가 공유한다.
  - R2 버킷 CORS: origin `https://www.mbus.co.kr`(관리자 별도 호스트면 추가), 메서드 PUT·GET, `AllowedHeaders: content-type`.
  - `CONTENT_STORAGE_*` 환경변수 등록 후 `npm run legacy:import -- --allow-remote`(https 주소만 허용)로 이관을 다시 실행한다.
- 정류장 사진 업로드(stop 모듈)는 범위 밖이다(`hosting-setup.md`에 남김).

### 다시 띄우는 방법
```bash
cd ~/IdeaProjects/reservation
docker compose -f docker-compose-local.yml up -d database valkey rustfs   # 버킷이 없으면 rustfs-init 도 실행
./gradlew :modules:app:bootRun --args='--spring.profiles.active=local'
cd ~/WebstormProjects/mbus && npm run dev   # 포트 3000(CORS 기준)
# 이관(필요 시): npm run legacy:crawl && ADMIN_LOGIN_ID=... npm run legacy:import   # 비밀번호는 실행 중 숨김 입력
```
