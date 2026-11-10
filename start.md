# TechCompare — AI Agent Onboarding & Project Manual (`start.md`)

> **시스템 지시문 (For AI Agents)**: 이 문서는 레포지토리를 처음 접한 AI 코딩 에이전트가 추가 탐색 없이도 프로젝트 구조, 데이터 스키마, 실행 방법, 작업 제약 조건을 즉시 파악하고 작업할 수 있도록 작성된 단일 기준 문서(Single Source of Truth)이다. 코드 수정이나 기능 추가 전 반드시 아래 규칙을 준수하라.

---

## 1. 프로젝트 개요 (Project Overview)

* **서비스명**: **TechCompare** (Apple · Samsung 스마트 기기 정밀 사양 및 실구매가 비교 플랫폼)
* **대상 기기**: 정식 출시 검증 완료된 **총 50종** (`Apple 25종 : Samsung 25종` / `스마트폰 26종 · 태블릿 14종 · 스마트워치 10종`)
* **핵심 기능**:
  1. **카탈로그 탐색 (`/products`)**: 브랜드(`apple`, `samsung`), 카테고리(`smartphone`, `tablet`, `smartwatch`), 시리즈, 출시 연도, 가격 범위, 키워드(제품명·모델 번호·SKU) 필터링 및 정렬
  2. **제품 상세 및 변형 선택 (`/products/:slug`)**: 용량·통신 방식별 변형(Variant) 선택 시 모델 번호·출고가·변형 전용 스펙이 즉시 병합되어 표시
  3. **쇼핑몰 최저가 자동 검색 연동**: 선택된 기기명 + 저장 용량 + 공식 모델 번호(예: `SM-S938N`, `A3526`)를 조합해 **다나와 · 네이버쇼핑 · 쿠팡 · 공식 스토어** 검색 결과 URL을 자동 생성
  4. **동일 카테고리 1:1 ~ 4종 정밀 비교 (`/compare`)**: 12대 표준 하드웨어 스펙 비교 매트릭스, 차이점만 보기 필터, 수치형 스펙(`higher_better` / `lower_better`) 우위(`isWinner`) 자동 판별 및 종합 스코어카드 생성
  5. **관리자 데이터 검수 및 CRUD (`/admin`)**: 50개 모델 데이터 정확도 감사(Audit) 리포트 조회 및 신규 제품 등록·기존 제품 수정·삭제(로컬 `products.json`에 즉시 영구 반영)
  6. **Spotlight 듀얼 테마 시스템**: `Spotlight Blue` (다크 기본값) ↔ `Spotlight White` (`[data-theme="white"]` 라이트 모드) 60:30:10 컬러 시스템 및 Uiverse 토글 스위치 제공

---

## 2. 기술 스택과 버전 (Tech Stack & Versions)

### 2.1 Frontend (`frontend/package.json`)
* **Runtime / Bundler**: `Vite ^8.3.6`, `TypeScript ~6.0.3`, `vue-tsc ^3.3.14`
* **Framework**: `Vue ^3.5.44` (`<script setup lang="ts">` Composition API)
* **State & Routing**: `Pinia ^4.1.0`, `Vue Router ^5.4.0`, `@vueuse/core ^15.0.0`
* **Icons & Graphics**: 자체 제작 SVG 벡터 컴포넌트(`TechIcon.vue`), `lucide-vue-next ^1.0.0`, 순수 WebGL Fragment Shader(`PrismBg.vue`)
* **Typography**: `Pretendard Variable` + `Inter` (UI 본문/제목, 세리프 금지), `JetBrains Mono` (`.tech-mono` / `.num`, `font-variant-numeric: tabular-nums` 고정폭 숫자 정렬)

### 2.2 Backend (`backend/package.json`)
* **Runtime / Framework**: `Node.js (ESM)`, `Express ^5.3.0`, `TypeScript ^7.0.2`, `tsx ^4.23.15`
* **Validation & Security**: `Zod ^4.6.7`, `cors ^2.8.6`, `helmet ^8.3.0`, `dotenv ^18.0.9`
* **Database Client**: `@supabase/supabase-js ^2.119.0` (Dual-Repository 구조: 기본값은 로컬 JSON 저장소 `inMemoryCatalog.repository.ts`, `.env` 설정 시 `supabaseCatalog.repository.ts` 사용)
* **Testing**: Node 내장 테스트 러너 (`node --import tsx --test src/tests/*.test.ts`, 총 20개 통합 테스트)

---

## 3. 폴더 및 파일 구조 (Directory & File Structure)

```text
pc_bit/
├── start.md                                       # [본 문서] AI 에이전트 온보딩 및 프로젝트 기술 매뉴얼
├── plan.md                                        # 단계별 작업 진행 기록 및 변경 이력 로그 (작업 완료 시마다 갱신 필수)
├── .cursorrules                                   # AI 에이전트 상시 적용 규칙 (Auto-Trigger 스킬 라우팅 및 코딩 제약)
├── skills-lock.json                               # 설치된 GitHub 에이전트 스킬 버전/해시 잠금 파일
├── install.bat                                    # Windows 원클릭 의존성 설치 스크립트 (backend + frontend)
├── start.bat                                      # Windows 원클릭 백엔드(4000) + 프론트엔드(5173) 동시 실행기
├── create_backup.bat                              # 현재 소스/에셋 타임스탬프 스냅샷 백업 생성기
├── restore_backup.bat                             # backups/pre-ui-motion 스냅샷으로 1클릭 복원 스크립트
├── .agents/skills/                                # 설치된 에이전트 스킬 디렉토리 (내부 파일 수정 절대 금지)
├── docs/
│   ├── skills-workflow.md                         # 상황별 에이전트 스킬 자동/수동 호출 1페이지 치트시트
│   ├── architecture.md                            # 시스템 레이어 구조 및 데이터 흐름 문서
│   ├── api-specification.md                       # REST API 엔드포인트 명세서
│   ├── database-erd.md                            # PostgreSQL 8개 정규화 테이블 ERD 명세
│   └── data-collection.md                         # 외부 수집 안전 가드 및 12단계 검증 파이프라인 문서
├── supabase/migrations/
│   ├── 20261106000001_init_techcompare_schema.sql # PostgreSQL 테이블·인덱스·RLS 초기화 DDL
│   └── 20261106000002_seed_real_catalog.sql       # 초기 정식 모델 시드 데이터 SQL
├── backend/
│   └── src/
│       ├── server.ts                              # HTTP 서버 엔트리포인트 (기본 포트: 4000)
│       ├── app.ts                                 # Express 앱 설정, 미들웨어, 라우터 마운트 (/api/v1)
│       ├── config/env.ts                          # 환경변수 로드 및 TechSpecs API 호출 차단 하드 가드
│       ├── config/supabase.ts                     # Supabase 클라이언트 초기화 (미설정 시 안전하게 로컬 모드 유지)
│       ├── data/products.json                     # 50개 정식 모델 + 변형 + 600개(50×12) 스펙 로컬 영구 DB
│       ├── types/domain.ts                        # 백엔드 도메인 인터페이스 및 API 응답 타입 정의
│       ├── validators/product.validator.ts        # 검색·필터·비교·Admin CRUD 요청 검증용 Zod 스키마
│       ├── repositories/
│       │   ├── catalog.repository.ts              # ICatalogRepository 인터페이스, 스펙 병합(resolveCategorySpecs), 검색/정렬 함수
│       │   ├── inMemoryCatalog.repository.ts      # products.json 기반 기본 로컬 저장소 (Admin CRUD 시 디스크 즉시 저장)
│       │   └── supabaseCatalog.repository.ts      # Supabase PostgreSQL 연동 저장소 구현체
│       ├── services/catalog.service.ts            # 비즈니스 로직, 비교 매트릭스 생성, 우위(winner) 판별, 스코어카드 계산
│       ├── controllers/catalog.controller.ts      # Express 요청/응답 컨트롤러
│       ├── routes/catalog.routes.ts               # /api/v1/brands, /categories, /products, /compare, /admin 라우트 정의
│       ├── routes/health.routes.ts                # /api/v1/health 서버 및 데이터 모드 상태 확인 라우트
│       └── tests/catalog.test.ts                  # API·비교 로직·Admin CRUD 20개 자동화 검증 테스트
└── frontend/
    ├── public/images/products/                    # 50개 전 모델 고화질 공식 제품 이미지 (<slug>.jpg)
    └── src/
        ├── main.ts                                # Vue 앱 부트스트랩 (Pinia, Router 연결)
        ├── App.vue                                # 루트 레이아웃 (AppHeader + RouterView + AppFooter + CompareTray)
        ├── styles/
        │   ├── tokens.css                         # Spotlight Blue(Dark) & Spotlight White(Light) CSS 변수 토큰
        │   └── main.css                           # 전역 스타일, .tech-mono/.num, .glass-card/.card, 버튼 규칙
        ├── types/api.ts                           # 프론트엔드 API 응답 및 도메인 타입 (백엔드 domain.ts와 1:1 대응)
        ├── services/api.ts                        # 백엔드 REST API 호출 클라이언트 (/api/v1 프록시 연동)
        ├── stores/
        │   ├── compare.ts                         # 비교함 Pinia 스토어 (최대 4개, 동일 카테고리 락, localStorage 영속화)
        │   └── theme.ts                           # 다크('dark') / 라이트('white') 테마 전환 및 html[data-theme] 동기화
        ├── utils/shopping.ts                      # 다나와·네이버쇼핑·쿠팡·공식몰 자동 검색 URL 빌더
        ├── components/
        │   ├── common/PrismBg.vue                 # ReactBits 스타일 3D 회전 스펙트럼 프리즘 WebGL 배경 컴포넌트
        │   ├── common/TechIcon.vue                # 브랜드(Apple/Samsung)·쇼핑몰·12대 스펙 전용 정밀 SVG 벡터 아이콘
        │   ├── common/EmptyState.vue              # 빈 결과 안내 공통 컴포넌트
        │   ├── layout/AppHeader.vue               # 상단 네비게이션 + Uiverse 애니메이션 테마 토글 스위치
        │   ├── layout/AppFooter.vue               # 하단 푸터
        │   ├── layout/CompareTray.vue             # 화면 하단 플로팅 비교함 트레이 바
        │   └── product/ProductCard.vue            # 제품 카드 (스튜디오 썸네일 + 가격 + 쇼핑몰 퀵링크 + 비교 담기)
        └── views/
            ├── HomeView.vue                       # 프리즘 히어로 + Bento 1:1 매치업 대시보드 + 추천 매치업 + 최신 출시작
            ├── CatalogView.vue                    # 조건별 필터링 및 검색 카탈로그 페이지
            ├── ProductDetailView.vue              # 변형 선택기 + 4대 쇼핑몰 최저가 박스 + 12개 표준 스펙표
            ├── CompareView.vue                    # 2~4개 기기 나란히 비교 매트릭스 + 차이점 필터 + 우위 하이라이트
            ├── NotFoundView.vue                   # 404 페이지
            └── admin/AdminHomeView.vue            # 데이터 정합성 전수 검수 리포트 및 제품 등록·수정·삭제(CRUD) 콘솔
```

---

## 4. 데이터 수집 방식 및 현재 보유 데이터 전체 명세 (Data Collection & Current Dataset Inventory)

### 4.1 공식 사이트에서 정보를 어떻게 가져왔는가 (수집 출처 · 방법 · 정규화 파이프라인)

1. **공식 데이터 수집 출처 (`dataSource`)**:
   - **Apple 제품군 (25종)**: Apple 코리아 공식 기술 사양 페이지 (`https://www.apple.com/kr/<제품슬러그>/specs/`) 및 Apple 공식 스토어 출고가 기준
   - **Samsung 제품군 (25종)**: 삼성전자 코리아 공식 기술 사양 페이지 (`https://www.samsung.com/sec/<카테고리>/<모델>/specs/`) 및 삼성닷컴 공식 출고가 기준
   - 모든 제품 객체의 `dataSource` 필드에 원문 URL(`sourceUrl`), 출처 코드(`official_apple_kr` / `official_samsung_kr`), 검증 완료일(`verifiedAt`)이 함께 저장되어 있다.

2. **스펙 정규화 및 추출 방법 (12대 표준 스펙 + 수치 분리)**:
   - 제조사마다 다르게 표기하는 사양서 항목을 카테고리 공통 **12개 표준 `specKey`**(`processor`, `memory`, `storage`, `display`, `resolution`, `refresh_rate`, `battery`, `camera`, `weight`, `dimensions`, `connectivity`, `os`)로 정규화했다.
   - 각 스펙 항목은 **화면 표시용 원문 문자열(`specValue`)**과 **비교 연산용 숫자(`numericValue`)**로 분리해 저장했다.
     - 예시: `iPhone 17 Pro Max`의 `refresh_rate` → `specValue: "1~120Hz 가변 주사율 (ProMotion)"`, `numericValue: 120`
     - 예시: `iPhone 16`의 `refresh_rate` → `specValue: "60Hz"`, `numericValue: 60`
   - **결측치(미공개 사양) 정직 표기 원칙**: 제조사 공식 사양서에 명시되지 않은 값(예: 일부 Apple 기기의 RAM 용량이나 mAh 배터리 수치 등)은 임의로 추정하지 않고 `specValue: null, numericValue: null`로 저장하여 UI에서 `"정보 없음"`으로 표시한다.

3. **고화질 공식 제품 이미지 수집 및 로컬화**:
   - 각 제품의 공식 스튜디오 정면 이미지를 수집하여 `frontend/public/images/products/<slug>.jpg` (총 50개 `.jpg` 파일)에 로컬 에셋으로 저장했다.
   - `backend/src/data/products.json` 내 각 제품의 `thumbnailUrl`과 `images[0].imageUrl`이 `/images/products/<slug>.jpg`를 가리키므로 외부 서버 장애나 CORS/핫링크 차단 없이 즉시 렌더링된다.

4. **쇼핑몰 실시간 가격 연동 방식 (`frontend/src/utils/shopping.ts`)**:
   - 유료 크롤러나 외부 과금 API(`TECHSPECS_LIVE_CALL_ENABLED=false`로 차단됨)에 의존하지 않고, DB에 저장된 **제품명 + 선택된 변형 용량(`storageCapacity`) + 공식 모델 번호(`modelNumber`)**를 조합해 **다나와 · 네이버쇼핑 · 쿠팡 · 공식 스토어**의 실시간 최저가 검색 URL을 동적으로 생성한다.

5. **협업자(친구들)가 새 기기 데이터를 추가·수정하는 방법**:
   - **방법 A — 웹 관리자 콘솔(`/admin`) 사용 (권장)**:
     1. 서버 실행 후 `http://localhost:5173/admin` 접속
     2. `+ 신규 제품 등록` 버튼 클릭 (또는 기존 모델의 `수정` 클릭)
     3. 기본 정보(이름, 슬러그, 브랜드, 카테고리, 모델번호, 출시일, 출고가, 썸네일 경로)와 12개 스펙을 입력 후 저장하면 `POST /api/v1/admin/products` API가 호출되어 **`backend/src/data/products.json` 파일에 즉시 영구 저장**된다.
   - **방법 B — JSON 직접 편집**:
     - `backend/src/data/products.json`의 `products` 배열에 제품 객체를 추가하고, `rawSpecs` 배열에 해당 `productId`의 12개 스펙을 추가한 뒤, `frontend/public/images/products/<slug>.jpg`에 이미지를 넣으면 즉시 반영된다.

---

### 4.2 현재 프로젝트가 보유한 전체 데이터 목록 (총 50종 모델 · 600개 스펙)

현재 `backend/src/data/products.json`에 저장되어 있는 **50개 정식 모델(`Apple 25종 + Samsung 25종`)**의 전체 명세는 다음과 같다. 각 모델은 기본 메타데이터, 용량·통신별 변형(`variants`), 공식 사양서 출처(`dataSource`), 로컬 이미지(`images`), 그리고 12개 표준 스펙(`rawSpecs`, `50 × 12 = 600개`)을 모두 보유하고 있다.

#### ① 스마트폰 (총 26종 — Apple 13종 · Samsung 13종)
| 브랜드 | 제품명 (`name`) | 슬러그 (`slug`) | 공식 모델 번호 | 기준 출고가 (`launchPriceKrw`) |
| :--- | :--- | :--- | :--- | :--- |
| **Apple** | iPhone 17 Pro Max | `iphone-17-pro-max` | `A3526` | ₩1,990,000 |
| **Apple** | iPhone 17 Pro | `iphone-17-pro` | `A3523` | ₩1,790,000 |
| **Apple** | iPhone Air | `iphone-17-air` | `A3517` | ₩1,590,000 |
| **Apple** | iPhone 17 | `iphone-17` | `A3520` | ₩1,290,000 |
| **Apple** | iPhone 16e | `iphone-16e` | `A3409` | ₩990,000 |
| **Apple** | iPhone 16 Pro Max | `iphone-16-pro-max` | `A3296` | ₩1,900,000 |
| **Apple** | iPhone 16 Pro | `iphone-16-pro` | `A3293` | ₩1,550,000 |
| **Apple** | iPhone 16 Plus | `iphone-16-plus` | `A3290` | ₩1,350,000 |
| **Apple** | iPhone 16 | `iphone-16` | `A3287` | ₩1,250,000 |
| **Apple** | iPhone 15 Pro Max | `iphone-15-pro-max` | `A3106` | ₩1,900,000 |
| **Apple** | iPhone 15 Pro | `iphone-15-pro` | `A3102` | ₩1,550,000 |
| **Apple** | iPhone 15 Plus | `iphone-15-plus` | `A3094` | ₩1,350,000 |
| **Apple** | iPhone 15 | `iphone-15` | `A3090` | ₩1,250,000 |
| **Samsung** | Galaxy S25 Ultra | `galaxy-s25-ultra` | `SM-S938N` | ₩1,698,400 |
| **Samsung** | Galaxy S25+ | `galaxy-s25-plus` | `SM-S936N` | ₩1,353,000 |
| **Samsung** | Galaxy S25 | `galaxy-s25` | `SM-S931N` | ₩1,155,000 |
| **Samsung** | Galaxy Z Fold7 | `galaxy-z-fold7` | `SM-F966N` | ₩2,379,300 |
| **Samsung** | Galaxy Z Flip7 | `galaxy-z-flip7` | `SM-F766N` | ₩1,485,000 |
| **Samsung** | Galaxy S24 Ultra | `galaxy-s24-ultra` | `SM-S928N` | ₩1,698,400 |
| **Samsung** | Galaxy S24+ | `galaxy-s24-plus` | `SM-S926N` | ₩1,353,000 |
| **Samsung** | Galaxy S24 | `galaxy-s24` | `SM-S921N` | ₩1,155,000 |
| **Samsung** | Galaxy S24 FE | `galaxy-s24-fe` | `SM-S721N` | ₩946,000 |
| **Samsung** | Galaxy Z Fold6 | `galaxy-z-fold6` | `SM-F956N` | ₩2,229,700 |
| **Samsung** | Galaxy Z Flip6 | `galaxy-z-flip6` | `SM-F741N` | ₩1,485,000 |
| **Samsung** | Galaxy S23 Ultra | `galaxy-s23-ultra` | `SM-S918N` | ₩1,599,400 |
| **Samsung** | Galaxy A35 5G | `galaxy-a35-5g` | `SM-A356N` | ₩499,400 |

#### ② 태블릿 (총 14종 — Apple 7종 · Samsung 7종)
| 브랜드 | 제품명 (`name`) | 슬러그 (`slug`) | 공식 모델 번호 | 기준 출고가 (`launchPriceKrw`) |
| :--- | :--- | :--- | :--- | :--- |
| **Apple** | iPad Pro 13 (M4) | `ipad-pro-13-m4` | `A2925` | ₩1,999,000 |
| **Apple** | iPad Pro 11 (M4) | `ipad-pro-11-m4` | `A2836` | ₩1,499,000 |
| **Apple** | iPad Air 13 (M3) | `ipad-air-13-m3` | `A3268` | ₩1,249,000 |
| **Apple** | iPad Air 11 (M3) | `ipad-air-11-m3` | `A3266` | ₩949,000 |
| **Apple** | iPad Air 13 (M2) | `ipad-air-13-m2` | `A2898` | ₩1,199,000 |
| **Apple** | iPad mini (A17 Pro) | `ipad-mini-a17-pro` | `A2993` | ₩749,000 |
| **Apple** | iPad (A16) | `ipad-a16` | `A3354` | ₩529,000 |
| **Samsung** | Galaxy Tab S10 Ultra | `galaxy-tab-s10-ultra` | `SM-X920` | ₩1,598,300 |
| **Samsung** | Galaxy Tab S10+ | `galaxy-tab-s10-plus` | `SM-X820` | ₩1,248,500 |
| **Samsung** | Galaxy Tab S9 Ultra | `galaxy-tab-s9-ultra` | `SM-X910` | ₩1,598,300 |
| **Samsung** | Galaxy Tab S9+ | `galaxy-tab-s9-plus` | `SM-X810` | ₩1,248,500 |
| **Samsung** | Galaxy Tab S9 | `galaxy-tab-s9` | `SM-X710` | ₩998,800 |
| **Samsung** | Galaxy Tab S9 FE+ | `galaxy-tab-s9-fe-plus` | `SM-X610` | ₩668,800 |
| **Samsung** | Galaxy Tab S9 FE | `galaxy-tab-s9-fe` | `SM-X510` | ₩629,200 |

#### ③ 스마트워치 (총 10종 — Apple 5종 · Samsung 5종)
| 브랜드 | 제품명 (`name`) | 슬러그 (`slug`) | 공식 모델 번호 | 기준 출고가 (`launchPriceKrw`) |
| :--- | :--- | :--- | :--- | :--- |
| **Apple** | Apple Watch Ultra 2 49mm | `apple-watch-ultra-2` | `A2986` | ₩1,149,000 |
| **Apple** | Apple Watch Series 11 46mm | `apple-watch-series-11-46` | `A3331` | ₩639,000 |
| **Apple** | Apple Watch Series 10 46mm | `apple-watch-series-10-46` | `A2999` | ₩649,000 |
| **Apple** | Apple Watch Series 10 42mm | `apple-watch-series-10-42` | `A2997` | ₩599,000 |
| **Apple** | Apple Watch Series 9 45mm | `apple-watch-series-9-45` | `A2980` | ₩639,000 |
| **Samsung** | Galaxy Watch Ultra 47mm | `galaxy-watch-ultra` | `SM-L705N` | ₩899,800 |
| **Samsung** | Galaxy Watch8 44mm | `galaxy-watch8-44` | `SM-L330` | ₩459,000 |
| **Samsung** | Galaxy Watch7 44mm | `galaxy-watch7-44` | `SM-L310` | ₩389,000 |
| **Samsung** | Galaxy Watch6 Classic 47mm | `galaxy-watch6-classic-47` | `SM-R960` | ₩469,000 |
| **Samsung** | Galaxy Watch FE 40mm | `galaxy-watch-fe` | `SM-R861` | ₩229,000 |

---

## 5. 데이터 구조 및 비교 엔진 로직 (Data Schema & Comparison Engine)

### 5.1 12대 표준 스펙 키 (`SpecKey`)
모든 카테고리(`smartphone`, `tablet`, `smartwatch`)는 아래 12개 표준 스펙 키만 사용한다 (`inMemoryCatalog.repository.ts`의 `SPEC_DEFINITIONS`에 정의):
* `processor`(프로세서), `memory`(메모리), `storage`(저장 공간), `display`(디스플레이), `resolution`(해상도), `refresh_rate`(주사율), `battery`(배터리), `camera`(카메라/센서), `weight`(무게), `dimensions`(크기), `connectivity`(연결 방식), `os`(운영체제)

### 5.2 기본 스펙 + 변형(Variant) 오버라이드 병합 (`resolveCategorySpecs`)
* 위치: `backend/src/repositories/catalog.repository.ts`
* 동작 규칙:
  1. 요청된 제품의 카테고리에 해당하는 12개 `SpecDefinitionRecord`를 순서(`displayOrder`)대로 순회한다.
  2. 선택된 `variantId`가 있으면 `rawSpecs`에서 `variantId`가 일치하는 스펙을 먼저 찾고, 없으면 제품 기본 스펙(`variantId === null`)을 사용한다.
  3. 제조사가 공개하지 않거나 미지원인 값(`null`)은 절대 추측하여 채우지 않고 `displayValue: "정보 없음"`, `sourceScope: "missing"`으로 반환한다.

### 5.3 다중 기기 비교 및 우위(`winnerSlugs`) 자동 판별 (`compareProducts`)
* 위치: `backend/src/services/catalog.service.ts`
* 동작 규칙:
  1. **동일 카테고리 강제**: 서로 다른 카테고리(예: 스마트폰 vs 태블릿) 비교 요청 시 `400 CATEGORY_MISMATCH_COMPARE` 에러를 반환한다.
  2. **차이점 감지 (`isDifferent`)**: 비교 대상 기기들의 정규화된 스펙 문자열 또는 수치(`numericValue`)가 하나라도 다르면 `isDifferent = true`로 표시한다.
  3. **우위 항목 하이라이트 (`winnerSlugs`)**:
     - `comparisonRule === 'higher_better'` (메모리, 저장 공간, 디스플레이 크기, 주사율, 배터리, 카메라 화소): `numericValue`가 가장 큰 기기(들)를 승자로 판별하되, 모든 기기의 수치가 동일하면 승자를 표시하지 않는다.
     - `comparisonRule === 'lower_better'` (무게 `weight`): `numericValue`가 가장 작은(가벼운) 기기를 승자로 판별한다.
     - `comparisonRule === 'neutral'` (프로세서, 해상도, 크기, 연결 방식, OS): 승패 판별 없이 객관적 텍스트만 대조한다.

---

## 6. 실행 및 테스트 방법 (How to Run, Build & Test)

### 6.1 Windows 원클릭 배치 파일 실행
* 최초 1회 패키지 설치: 루트 폴더에서 `install.bat` 실행
* 개발 서버 통합 실행: 루트 폴더에서 `start.bat` 실행 (백엔드 `http://localhost:4000` + 프론트엔드 `http://localhost:5173` 자동 기동)

### 6.2 터미널 수동 명령어
```bash
# 1. 백엔드 설치 · 개발 서버 · 테스트 · 빌드
cd backend
npm install
npm run dev          # http://localhost:4000 (tsx watch)
npm test             # 20개 API/비교/Admin 통합 테스트 실행
npm run build        # TypeScript 컴파일 (dist/)

# 2. 프론트엔드 설치 · 개발 서버 · 타입체크/빌드
cd ../frontend
npm install
npm run dev          # http://localhost:5173 (Vite HMR, /api 요청은 localhost:4000으로 자동 프록시)
npm run build        # vue-tsc -b && vite build (프로덕션 빌드 검증)
```

---

## 7. 작업 규칙 및 절대 건드리면 안 되는 부분 (Strict Rules & Guardrails)

1. **`plan.md` 갱신 의무**: 단위 작업이 끝날 때마다 루트의 `plan.md` 파일 하단 `작업 이력 로그`에 날짜, 단계, 작업 요약, 검증 결과를 반드시 추가하라.
2. **타이포그래피 및 숫자 정렬 규칙**:
   - 명조체(Serif) 폰트는 절대 사용하지 마라 (`Pretendard Variable`, `Inter` 고딕 계열만 사용).
   - 가격, 모델 번호, 주사율(`Hz`), 무게(`g`), 용량(`GB`) 등 모든 숫자·코드 요소에는 반드시 `.tech-mono` 또는 `.num` 클래스(`JetBrains Mono`, `tabular-nums`)를 적용하라.
3. **듀얼 테마 보존 (`tokens.css`)**:
   - 기본 다크 모드(`:root` / `Spotlight Blue`)와 라이트 모드(`:root[data-theme='white']` / `Spotlight White`) 양쪽 모두에서 텍스트 대비와 카드 경계가 뚜렷해야 한다.
   - 스크롤 성능을 떨어뜨리는 `body { background-attachment: fixed }`나 일반 `.card` 전체에 걸리는 `backdrop-filter: blur(...)`를 다시 추가하지 마라 (배경 광원은 `body::before` 고정 합성 레이어 사용).
4. **절대 건드리면 안 되는 부분 (Do NOT Touch)**:
   - `.agents/skills/` 내부의 원본 스킬 파일들은 직접 수정하지 마라.
   - 일반 기능 개발이나 리팩터링 중 기존 브랜드 로고(`TC`), `TechIcon.vue` 벡터 아이콘, 제품 이미지 에셋을 사용자 명시적 요청 없이 임의로 변경하지 마라.
   - 백엔드의 Zod 입력 검증(`product.validator.ts`), 에러 처리 미들웨어, `TECHSPECS_LIVE_CALL_ENABLED=false` 보호 로직을 축소하거나 제거하지 마라.
   - 외부 타 프로젝트의 클라우드 DB(예: 기존 `pc_fit` Supabase 프로젝트)에 절대 연결하지 마라.

---

## 8. 프로젝트에 설정된 에이전트 스킬 및 도구 (Installed Agent Skills)

이 프로젝트에는 `.cursorrules`의 `[Auto-Trigger Skill Routing]`과 `docs/skills-workflow.md`를 통해 다음 GitHub 스킬들이 연결되어 있다:

| 스킬 / 도구명 | 경로 | 용도 및 작동 시점 |
| :--- | :--- | :--- |
| **`ponytail`** | `.agents/skills/ponytail/` | **[상시 자동]** 불필요한 오버엔지니어링·래퍼 생성을 막고 가장 작은 코드 변경(Minimal Diff)으로 작업을 완수. 의도적 단순화 지점에는 `// shortcut: <한계>, <업그레이드 시점>` 주석 기록 |
| **`design-taste-frontend`** | `.agents/skills/design-taste-frontend/` | **[UI 작업 시 자동]** AI 특유의 과장된 장식과 무의미한 카드를 배제하고 스펙·가격 중심의 정보 밀도와 여백 위계를 유지 |
| **`logo-design`** | `.agents/skills/logo-design/` | **[명시적 요청 시에만]** 사용자가 로고·아이콘·파비콘 제작/수정을 직접 요청했을 때만 기하학 SVG 그리드 및 16px 시인성 기준으로 작동 |
| **`ponytail-review`** | `.agents/skills/ponytail-review/` | **[기능 완료 / `/ponytail-review` 호출 시]** 변경된 Diff와 연결된 호출부(Callers)를 추적해 버그·보안·성능·불필요한 코드를 점검하는 리포트 생성 |
| **`ponytail-audit` / `debt`** | `.agents/skills/ponytail-audit/`, `ponytail-debt/` | **[수동 호출 시]** 레포지토리 전체 품질 감사(`/ponytail-audit`) 및 코드 내 `shortcut:` 기술 부채 대장 출력(`/ponytail-debt`) |
