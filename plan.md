# TechCompare 프로젝트 종합 작업 계획 및 진행 기록 (`plan.md`)

> **문서 관리 규칙**: 본 `plan.md` 파일은 TechCompare 프로젝트의 **기술 스택, 완료된 작업 내역, 생성된 결과물, 향후 로드맵**을 기록하는 공식 기준 문서입니다. **모든 단위 작업이 완료될 때마다 반드시 최신 상태로 업데이트**합니다.
>
> **최종 업데이트**: `2026-11-06`

---

## 1. 프로젝트 개요 (Project Overview)

* **서비스명**: **TechCompare** (모바일 · 태블릿 · 스마트워치 정밀 사양 및 실구매가 비교 플랫폼)
* **핵심 목적**:
  - **Apple**과 **Samsung**의 스마트폰·태블릿·스마트워치 정식 출시 모델을 대상으로, 제조사 공식 기술 사양서 기반의 **12대 표준 스펙 비교**, **용량·통신 방식별 변형(Variant) 선택**, 그리고 **다나와·네이버쇼핑·쿠팡·공식스토어 실시간 최저가 자동 검색 연동**을 한 화면에서 직관적으로 제공하는 웹 서비스.
* **핵심 설계 원칙**:
  - 허위·추측 데이터 금지 (미지원·미공개 사양은 명확히 `정보 없음(null)` 처리)
  - 동일 카테고리 간 정밀 비교 및 수치형 스펙(RAM, 배터리, 주사율, 무게 등) **우위 항목 자동 하이라이트**
  - `design-taste-frontend` 원칙을 준수한 고밀도 에디토리얼 UI 및 3종 블루 테마(`Classic Blue`, `Sky Blue`, `Navy Blue`) 실시간 전환
  - 외부 유료 API 과금 방지 (`TECHSPECS_LIVE_CALL_ENABLED=false` 하드 가드 유지) 및 기존 타 프로젝트(`pc_fit`) DB와의 완벽한 격리

---

## 2. 사용 기술 스택 (Tech Stack)

### 2.1 프론트엔드 (`frontend/`)
| 구분 | 사용 기술 | 적용 내용 |
| :--- | :--- | :--- |
| **프레임워크** | **Vue 3 (Composition API, `<script setup>`) + TypeScript** | 컴포넌트 모듈화, 엄격한 타입 검증 (`vue-tsc`) |
| **빌드 도구** | **Vite 8** | 초고속 HMR 개발 서버(`5173`) 및 프로덕션 번들링 |
| **상태 관리** | **Pinia** | 비교함 상태(`compare.ts`, 최대 4개 모델 + 카테고리 락 + `localStorage` 영속화), 테마 상태(`theme.ts`) |
| **라우팅** | **Vue Router 5** | 홈(`/`), 제품 탐색(`/products`), 제품 상세(`/products/:slug`), 스펙 비교(`/compare`), 관리자(`/admin`) |
| **스타일 & 디자인** | **CSS Custom Properties (Design Tokens) + Scoped CSS** | `tokens.css` 기반 3가지 블루 테마(`classic-blue`, `sky-blue`, `navy-blue`), Pretendard Variable + JetBrains Mono 타이포그래피 |
| **아이콘 시스템** | **자체 제작 SVG 벡터 시스템 (`TechIcon.vue`) + `lucide-vue-next`** | AI 이모지 배제, 브랜드(Apple/Samsung)·쇼핑몰(다나와/네이버/쿠팡/공식몰)·12개 하드웨어 스펙 전용 정밀 벡터 아이콘 |
| **인터랙션 & 모션** | **HTML5 Canvas (`LetterGlitchBg.vue`) + `DecryptedText.vue` + Uiverse Micro-UI** | ReactBits 스타일 하드웨어 코드 글리치 배경, 디코드/쉬머 텍스트, 버튼 광택(Sheen) 스윕 및 라이브 펄스 배지 |

### 2.2 백엔드 (`backend/`)
| 구분 | 사용 기술 | 적용 내용 |
| :--- | :--- | :--- |
| **런타임 & 서버** | **Node.js + Express 5 + TypeScript (`tsx`)** | RESTful API 서버(`http://localhost:4000/api/v1`), CORS·에러 핸들링 미들웨어 |
| **유효성 검증** | **Zod 4** | 검색·필터 쿼리 파라미터(`limit` 최대 100 등), 비교 요청 슬러그, 관리자 CRUD 페이로드 스키마 검증 |
| **데이터 저장소** | **Dual-Engine 아키텍처 (Local JSON Engine + Supabase PostgreSQL 호환)** | 기본값으로 로컬 `backend/src/data/products.json`에 즉시 영구 저장하며, `.env`에 전용 Supabase 자격증명 설정 시 동일 스키마로 자동 연동 |
| **테스트** | **Vitest + Supertest** | 카탈로그 조회, 상세/변형 스펙 병합, 카테고리별 비교 매트릭스, 관리자 검수 및 CRUD 통합 테스트 **20/20 통과** |

### 2.3 데이터베이스 및 인프라 (`supabase/`, `.bat`)
| 구분 | 사용 기술 | 적용 내용 |
| :--- | :--- | :--- |
| **DB 마이그레이션** | **PostgreSQL DDL (`supabase/migrations/`)** | `brands`, `categories`, `products`, `product_variants`, `spec_definitions`, `product_specifications`, `variant_specifications` 등 8개 정규화 테이블 + RLS 정책 + 시드 SQL |
| **원클릭 실행/백업** | **Windows Batch Scripts (`.bat`) + Git Tag** | `install.bat`(환경 구축), `start.bat`(백엔드+프론트엔드 동시 실행), `create_backup.bat`(스냅샷 생성), `restore_backup.bat`(원클릭 복원) |

---

## 3. 단계별 수행 내역 요약 (What We Did)

### Phase 0 ~ 1: 프로젝트 아키텍처 설계 및 디자인 시스템 구축
* **오픈소스 레퍼런스 분석 및 아키텍처 수립**:
  - `Product-Comparison-System`, `techspecs-io`, ` vue-tailwind-product-comparison` 등의 장단점을 분석하여 **제품 기본(Base) 스펙 + 모델 변형(Variant: 용량/통신/모델번호/출고가) 오버라이드** 구조 설계.
* **GitHub `design-taste-frontend` 스킬 적용 & 3종 테마 시스템**:
  - 획일적인 SaaS 카드 남발과 네온/글래스모피즘을 배제하고, 데이터 가독성 중심의 레이아웃과 `Classic Blue`, `Sky Blue`, `Navy Blue` 3가지 테마 토큰(`frontend/src/styles/tokens.css`) 완성.

### Phase 2 ~ 3: 데이터베이스 스키마 및 백엔드 REST API 구축
* **Supabase PostgreSQL 마이그레이션 및 시드 설계**:
  - `supabase/migrations/20261106000001_init_techcompare_schema.sql` 및 `20261106000002_seed_real_catalog.sql` 작성.
* **백엔드 핵심 서비스 및 API 엔드포인트 구현**:
  - `GET /api/v1/brands`, `GET /api/v1/categories`, `GET /api/v1/products`(검색·브랜드·카테고리·정렬·페이징)
  - `GET /api/v1/products/:slug`, `GET /api/v1/products/:slug/specs?variant=...` (변형별 스펙 자동 병합)
  - `GET /api/v1/compare?products=slug1:variant1,slug2:variant2` (동일 카테고리 검증, 12개 표준 스펙 매트릭스 생성, 수치형 스펙 승자 `winnerSlugs` 자동 계산)

### Phase 4 ~ 5: 프론트엔드 핵심 화면 및 원클릭 실행 환경 구축
* **프론트엔드 주요 뷰 구현**:
  - 홈 화면(`HomeView.vue`), 카탈로그 검색/필터(`CatalogView.vue`), 제품 상세(`ProductDetailView.vue`), 1:1 및 다중 비교표(`CompareView.vue`), 하단 플로팅 비교 트레이(`CompareTrayBar.vue`).
* **원클릭 설치 및 실행 배치 스크립트 제작**:
  - `install.bat` (Node.js/npm 확인 및 백엔드·프론트엔드 패키지 일괄 설치)
  - `start.bat` (포트 충돌 정리 후 백엔드 `4000` + 프론트엔드 `5173` 동시 기동 및 브라우저 자동 오픈)

### Phase 6 ~ 7: 카탈로그 50개 모델 확장, 관리자(Admin) CRUD 및 쇼핑몰 연동
* **정식 출시 모델 30개 → 50개 대폭 확장 (`Apple 25 : Samsung 25`)**:
  - **스마트폰 (26종)**: iPhone 17 Pro Max / 17 Pro / Air / 17 / 16e, iPhone 16 시리즈, iPhone 15 시리즈, iPhone 14/13/SE3 vs Galaxy S25 Ultra / S25+ / S25 / S25 Edge, Z Fold7 / Z Flip7, S24 시리즈(FE 포함), Z Fold6 / Z Flip6, A56 / A36 / A16 등
  - **태블릿 (14종)**: iPad Pro M4 13/11, iPad Air M3 13/11, iPad Air M2 13/11, iPad mini A17 Pro, iPad A16, iPad 10세대 vs Galaxy Tab S10 Ultra / S10+ / S10 FE, Tab S9 / S9 FE, Tab A9+
  - **스마트워치 (10종)**: Apple Watch Series 11, Ultra 2, Series 10, SE 2, Series 9 vs Galaxy Watch8 Classic, Watch8, Watch Ultra, Watch7, Watch FE
* **관리자(Admin) 7단계 데이터 정확도 검수 및 CRUD 완성 (`AdminHomeView.vue`)**:
  - DB 연결 상태 배너, 50개 모델 전수 검수 리포트, **신규 제품 등록 / 기존 제품 수정(가격·모델번호·스펙·변형) / 삭제** 기능 및 로컬 JSON 즉시 영구 반영 구현.
* **실시간 쇼핑몰 최저가 자동 검색 연동 (`shopping.ts`)**:
  - 선택된 모델명 + 용량(Variant) + 공식 모델번호를 조합하여 **다나와 · 네이버쇼핑 · 쿠팡 · 공식스토어** 검색 결과 페이지로 즉시 연결되는 가격 비교 박스 및 원클릭 버튼 탑재.

### Phase 8: 고화질 제품 이미지 50종, 공식 벡터 아이콘 및 ReactBits/Uiverse 모션 고도화
* **사전 백업 및 원클릭 복원 안전장치 구축**:
  - `backups/pre-ui-motion/` 전체 백업, Git 태그 `backup-pre-ui-motion`, `restore_backup.bat` 및 `create_backup.bat` 생성.
* **50개 전 모델 고화질 공식 스튜디오 이미지 로컬화**:
  - `frontend/public/images/products/<slug>.jpg` 50개 고화질 이미지 다운로드 및 `products.json` 연동 완료.
  - 스튜디오 방사형 조명 배경(`radial-gradient`) + `mix-blend-mode: multiply` + 입체 드롭 섀도우 적용.
* **AI 문구 제거 & 커스텀 벡터 아이콘(`TechIcon.vue`) + 세련된 애니메이션 적용**:
  - 불필요한 개발자용 안내 문구 전면 제거.
  - `TechIcon.vue`로 브랜드·쇼핑몰·12개 하드웨어 스펙 아이콘을 모두 정밀 SVG 벡터로 교체.
  - 홈 히어로 영역에 `LetterGlitchBg.vue`(ReactBits 스타일 하드웨어 코드 글리치 캔버스)와 `DecryptedText.vue`(디코드 & 메탈릭 쉬머 텍스트), Uiverse 스타일 광택(Sheen) 버튼을 절제되게 적용.

---

## 4. 무엇을 만들었는가 ( 주요 산출물 및 파일 구조 )

```text
e:\pc_bit\
├── plan.md                                  # [본 문서] 작업 요약, 기술 스택, 진행 내역 및 향후 계획서
├── install.bat                              # Node/npm 점검 및 백엔드·프론트엔드 의존성 원클릭 설치
├── start.bat                                # 백엔드(4000) + 프론트엔드(5173) 원클릭 통합 실행기
├── create_backup.bat                        # 현재 소스코드/에셋 타임스탬프 백업 생성 스크립트
├── restore_backup.bat                       # UI/모션 작업 이전 상태(pre-ui-motion)로 1클릭 복원 스크립트
├── backups\
│   └── pre-ui-motion\                       # 작업 전 전체 소스 및 이미지 물리 백업본
├── supabase\
│   └── migrations\                          # PostgreSQL 정규화 스키마 DDL 및 초기 시드 SQL
├── backend\
│   └── src\
│       ├── data\products.json               # 50개 정식 모델(Apple 25, Samsung 25) 정밀 스펙 & 이미지 DB
│       ├── services\catalog.service.ts      # 검색, 필터, 스펙 병합, 승자 판별, Admin 검수/CRUD 엔진
│       ├── routes\                          # products, compare, brands, categories, admin 라우터
│       ├── validators\product.validator.ts  # Zod 요청 검증 스키마
│       └── tests\catalog.test.ts            # 20개 API/비교/관리자 자동화 검증 테스트
└── frontend\
    ├── public\images\products\              # 50개 모델 고화질 공식 제품 이미지 (*.jpg)
    └── src\
        ├── styles\tokens.css                # 3종 블루 테마(Classic, Sky, Navy) 디자인 토큰
        ├── utils\shopping.ts                # 다나와·네이버쇼핑·쿠팡·공식몰 자동 검색 URL 생성기
        ├── stores\                          # Pinia 스토어 (compare.ts, theme.ts)
        ├── components\
        │   ├── common\TechIcon.vue          # 브랜드·쇼핑몰·12대 스펙 전용 정밀 SVG 벡터 아이콘
        │   ├── common\LetterGlitchBg.vue    # ReactBits 스타일 하드웨어 코드 글리치 Canvas 배경
        │   ├── common\DecryptedText.vue     # 문자 디코드 & 메탈릭 쉬머 텍스트 애니메이션
        │   ├── layout\                      # AppHeader.vue (테마 전환기 포함), AppFooter.vue, CompareTrayBar.vue
        │   └── product\ProductCard.vue      # 스튜디오 이미지 + 핵심 스펙 + 쇼핑몰 퀵링크 카드
        └── views\
            ├── HomeView.vue                 # 글리치 히어로 + 빠른 매치업 + 추천 대결 + 최신 카탈로그
            ├── CatalogView.vue              # 브랜드/카테고리/키워드/정렬 필터링 탐색 뷰
            ├── ProductDetailView.vue        # 변형 선택 + 쇼핑몰 최저가 박스 + 12대 정밀 스펙표
            ├── CompareView.vue              # 2~4개 모델 스펙 비교 매트릭스 + 차이점 필터 + 우위 하이라이트
            └── admin\AdminHomeView.vue      # 데이터 정확도 검수 및 제품 등록·수정·삭제(CRUD) 콘솔
```

---

## 5. 다음 작업 계획 및 향후 로드맵 (Next Steps)

현재 Phase 0부터 Phase 8까지의 핵심 기능과 UI/UX 고도화가 완료되어 즉시 사용 가능한 상태입니다. 다음 단계로 진행할 수 있는 우선순위 작업은 아래와 같습니다.

### Step 1. 실시간 쇼핑몰 최저가 API 자동 수집기 (Price Sync Worker) 연동 *(선택 사항)*
* **현재 상태**: 다나와·네이버쇼핑·쿠팡 검색 결과 페이지로 모델명/모델번호를 자동 전달하여 실시간 가격을 즉시 조회할 수 있도록 연동됨.
* **다음 고도화**:
  - **네이버 오픈 API (쇼핑 검색 API)** 키(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)를 백엔드 `.env`에 연결하여, 제품 상세 페이지 진입 시 네이버 최저가와 판매처 썸네일/링크를 백엔드가 실시간 조회·캐싱해 `currentLowestPriceKrw`에 자동 반영하는 기능.

### Step 2. 비교 결과 공유 및 리포트 내보내기 (Share & Export) 고도화
* **현재 상태**: 비교 화면 URL 쿼리(`?products=slug1:var1,slug2:var2`) 공유 지원.
* **다음 고도화**:
  - 비교 매트릭스 화면에서 **'비교표 이미지(PNG) 저장'** 또는 **'클립보드에 비교 요약 복사'** 버튼을 추가하여 커뮤니티나 메신저에 두 모델의 스펙 비교 결과를 바로 공유할 수 있는 기능.

### Step 3. 스마트 추천 필터 (사용 목적별 맞춤 기기 추천)
* **다음 고도화**:
  - 사용자가 예산 범위(예: `100만 원 이하`), 선호 무게(`200g 이하`), 화면 크기, 주사율(`120Hz 필수`) 등 조건을 체크하면 50개 모델 중 최적의 모델을 점수순으로 추천하고 바로 1:1 비교로 넘겨주는 **맞춤 탐색 필터**.

### Step 4. 전용 클라우드 DB (Supabase 새 프로젝트) 전환 및 배포
* **현재 상태**: 로컬 `products.json` 엔진으로 설정 없이 100% 동작하며, 기존 `pc_fit` DB는 안전하게 분리됨.
* **다음 고도화**:
  - 추후 외부 웹 배포(Vercel / Railway 등)가 필요할 때, TechCompare 전용 신규 Supabase 프로젝트를 생성하여 `supabase/migrations/` SQL을 1클릭 적용하고 `.env`만 연결해 클라우드 DB 모드로 전환.

---

## 6. 작업 이력 로그 (Work History Log)

| 날짜 | 단계 | 작업 요약 | 검증 결과 |
| :--- | :--- | :--- | :--- |
| `2026-11-05` | Phase 0~4 | 프로젝트 구조 설계, Supabase 정규화 DDL 작성, Express+Zod 백엔드 API 및 Vue 3 프론트엔드(3종 블루 테마) 구축 | 백엔드 테스트 통과, 프론트엔드 빌드 성공 |
| `2026-11-06` | Phase 5 | `install.bat`, `start.bat` 원클릭 설치·실행 스크립트 제작 및 GitHub `design-taste-frontend` 디자인 원칙 전면 반영 | 로컬 서버(`4000`, `5173`) 정상 기동 확인 |
| `2026-11-06` | Phase 6~7 | 정식 출시 모델 50종(`Apple 25 : Samsung 25`) 확장, `/admin` 데이터 검수 및 등록·수정·삭제(CRUD) 구현, 다나와·네이버·쿠팡·공식몰 최저가 자동 검색 연동 | Vitest `20/20` 통과, API 응답 검증 완료 |
| `2026-11-06` | Phase 8 | 사전 백업/복원 시스템(`restore_backup.bat`, `create_backup.bat`) 구축, 50개 전 모델 고화질 스튜디오 이미지 적용, 정밀 SVG 벡터 아이콘(`TechIcon.vue`) 및 ReactBits(`LetterGlitchBg`, `DecryptedText`)/Uiverse 애니메이션 적용 | `vue-tsc -b && vite build` 오류 `0`건 확인 |
| `2026-11-06` | 문서화 | 프로젝트 루트에 `plan.md` 최초 작성 (사용 기술, 완료 내역, 산출물, 향후 로드맵 및 지속 업데이트 규칙 수립) | `e:\pc_bit\plan.md` 생성 완료 |
| `2026-11-10` | 스킬/규칙 확장 | `DietrichGebert/ponytail`, `kaankiziltug/logo-design-skill` 설치 및 `.cursorrules`(Ponytail + Impeccable/Frontend 규칙) 중복 없이 병합 (`design-taste-frontend` 기설치 확인 후 유지) | [skills-lock.json](file:///e:/pc_bit/skills-lock.json), [.cursorrules](file:///e:/pc_bit/.cursorrules) 반영 완료 |
| `2026-11-10` | 스킬 자동화 & 검증 | [.cursorrules](file:///e:/pc_bit/.cursorrules) 자동 트리거 라우팅(Zod/보안 축소 금지·`shortcut:` 예외·`logo-design` 명시 요청 시에만 작동) 반영, [skills-workflow.md](file:///e:/pc_bit/docs/skills-workflow.md) 치트시트 생성, [AppHeader.vue](file:///e:/pc_bit/frontend/src/components/layout/AppHeader.vue) 테마 쿼리 1줄 압축 반영(TC 로고 원복) | `vue-tsc -b` 오류 `0`건 확인 |
| `2026-11-10` | Spotlight 듀얼 테마 이식 | 레퍼런스(`gemini-code-1794289047371.html`) 기반 Spotlight Blue(다크) / Spotlight White(라이트) 60:30:10 듀얼 테마([tokens.css](file:///e:/pc_bit/frontend/src/styles/tokens.css), [main.css](file:///e:/pc_bit/frontend/src/styles/main.css)), Pretendard/Inter + `.tech-mono`(`JetBrains Mono`, `tabular-nums`), Uiverse 애니메이션 토글 스위치([AppHeader.vue](file:///e:/pc_bit/frontend/src/components/layout/AppHeader.vue), [theme.ts](file:///e:/pc_bit/frontend/src/stores/theme.ts)) 및 Bento 1:1 매치업 대시보드([HomeView.vue](file:///e:/pc_bit/frontend/src/views/HomeView.vue)) 이식 (데모용 컬러 안내 배지·스와치 카드 제거 완료) | `npm run build` 오류 `0`건 확인 |
| `2026-11-10` | Prism 배경 교체 & `/ponytail-review` | `LetterGlitchBg.vue` 및 `DecryptedText.vue`(마우스 호버 시 숫자로 깨지는 텍스트 효과) 완전 삭제 후 ReactBits 스타일 3D 회전 프리즘 광원([PrismBg.vue](file:///e:/pc_bit/frontend/src/components/common/PrismBg.vue)) 적용 및 `/ponytail-review` 코드 리뷰 수행 | `vue-tsc -b && vite build` 통과 |
| `2026-11-10` | 리뷰 1·2·3번 수정 & 라이트 테마 개선 | [PrismBg.vue](file:///e:/pc_bit/frontend/src/components/common/PrismBg.vue) WebGL 메모리 해제·Uniform 캐싱·라이트 모드 뿌연 `multiply` 제거 및 고채도 프리즘 보정, [HomeView.vue](file:///e:/pc_bit/frontend/src/views/HomeView.vue) 실시간 주사율(`60Hz vs 120Hz`) API 연동, [tokens.css](file:///e:/pc_bit/frontend/src/styles/tokens.css) 라이트 모드(`white`) 대비·카드 분리·`#0A84FF` 포인트 개선 (다크 테마 값 보존) | 빌드 오류 `0`건 & `60Hz` 연동 확인 |
| `2026-11-10` | 스크롤·GPU 렌더링 렉 최적화 | 3대 프레임 저하 원인(`body`의 `background-attachment: fixed`, 모든 카드의 `backdrop-filter: blur(20px)`, `PrismBg.vue` 루프 내 삼각함수 중복 연산) 제거 및 GPU 합성 레이어(`body::before`)·셰이더 연산량 약 75% 경량화 | `vue-tsc -b` 오류 `0`건 확인 |
| `2026-11-10` | GitHub 공유용 `start.md` 작성 | 다른 AI 에이전트와 협업자가 즉시 프로젝트를 파악할 수 있도록 8대 항목(개요, 스택/버전, 폴더 트리, 데이터 수집/저장 구조, 비교 로직, 실행법, 가드레일, 스킬 시스템)을 정리한 [start.md](file:///e:/pc_bit/start.md) 작성 | `e:\pc_bit\start.md` 생성 완료 |
| `2026-11-10` | `start.md` 50종 전수 명세 보강 & GitHub(`pc_final`) 배포 | 공식 홈페이지 수집·정규화 방법 및 현재 보유 중인 50개 모델(스마트폰 26·태블릿 14·스마트워치 10) 전체 표를 [start.md](file:///e:/pc_bit/start.md)에 추가하고 GitHub `pc_final` 저장소에 업로드 | GitHub 원격 저장소 푸시 완료 |
| `2026-11-10` | 로컬 전용 `ide.html` 시안 제작 | 기존 프로젝트 코드 미수정 상태로 ReactBits 원본 WebGL2 `LightRays`(커서 그림자·클릭 펄스·헤이즈 셰이더) + 3D 트로피 기기 3종 쇼케이스 + `Flex Carousel`(리퀴드 글래스 엣지 무한 캐러셀) + `Electric Logo`(방전 아크) + `Drift Wall`(50종 기기 3D 타일 월)을 담은 [ide.html](file:///e:/pc_bit/ide.html) 생성 및 `.gitignore` 등록 | 로컬 단독 실행 확인 |
| `2026-11-12` | `ide.html` 3D 스마트폰 모델 & 섹션 정리 | [ide.html](file:///e:/pc_bit/ide.html)에서 불필요한 Electric Logo 설명·라인업 섹션 제거(상단 헤더 로고에 전기 아크 적용) 및 히어로 중앙 카드/텍스트 라벨을 모두 빼고 Three.js WebGL 기반 **3D 스마트폰 모델 3개 트로피 쇼케이스**(티타늄 베벨 바디·Dynamic Island/펀치홀 OLED·사파이어 3D 카메라 링, 360° 드래그 회전 지원)로 교체 | [ide.html](file:///e:/pc_bit/ide.html) 반영 완료 |
| `2026-11-12` | `ide.html` 화이트 모드 색감 보정 & 3D 기기·트로피 받침대 고도화 | 화이트 모드(`[data-theme="white"]`)에서 어둡게 남던 `LightRays` 셰이더 잉크 톤·드리프트 월 배경·타일·리퀴드 글래스 엣지를 밝은 코발트/아크틱 톤으로 교정하고, Three.js IBL(`PMREMGenerator`) 금속 반사·다중 사파이어 카메라 경통·락스크린 위젯 디테일 및 **3단 아키텍처 트로피 받침대(중앙 1위 단상·좌우 윙 단상·24핀 티타늄 코어·네온 링·홀로그램 업라이트)** 구현 | [ide.html](file:///e:/pc_bit/ide.html) 반영 완료 |
| `2026-11-12` | `ide.html` 6종 종합 IT 기기 3D 쇼케이스 확장 & 링 받침대 복원 | 스마트폰 3종 양옆에 **3D 노트북(`createLaptop3D`) · 3D 스마트워치(`createWatch3D`) · 실시간 회전 트리플 팬 3D 그래픽카드(`createGPU3D`)**를 추가해 종합 IT 비교 사이트 정체성을 표현하고, 하단 받침대는 원래처럼 은은하게 빛나는 더블 라이트 링(`outerRing`, `innerRing`)으로 심플하게 정리 | [ide.html](file:///e:/pc_bit/ide.html) 반영 완료 |
| `2026-11-12` | `ide.html` 노트북·스마트워치·GPU 3D 모델 정밀도 대폭 고도화 | [ide.html](file:///e:/pc_bit/ide.html)의 **3D 노트북**(6열 70+개 독립 입체 키캡·스피커 그릴·전면 썸노치·썬더볼트 포트·힌지 배럴·후면 미러 로고·macOS XDR 대시보드 UI), **3D 스마트워치**(크라운 가드 브릿지·14단 기어 널링 디지털 크라운·후면 세라믹 PPG 심박 센서·22분절 완전 곡면 3D 오션밴드 루프 & 티타늄 버클·3 서브다이얼 크로노그래프), **3D GPU**(34단 알루미늄 방열핀 어레이·4개 구리 히트파이프·상단 듀얼슬롯 PCIe I/O 브래킷 및 골드 DP/HDMI 단자·16핀 전원소켓·터빈 배리어 링 일체형 11블레이드 팬·후면 브러시드 백플레이트) 메쉬 디테일 업그레이드 | [ide.html](file:///e:/pc_bit/ide.html) 반영 완료 |
| `2026-11-12` | `ide.html` 3D 쇼케이스 스마트폰 3종 집중 구성 | 노트북·스마트워치·GPU 3D 모델을 제거하고, 히어로 광선 중앙에 고품질 **3D 스마트폰 3종 트로피(`Galaxy S25 Ultra` · `iPhone 17 Pro Max` · `Pro Flagship`) + 은은한 라이트 링 받침대**만 깔끔하게 배치 | [ide.html](file:///e:/pc_bit/ide.html) 반영 완료 |
| `2026-11-12` | GitHub 스킬 요약 및 설치 가이드 `install.md` 작성 & 푸시 | 프로젝트에 설치된 3대 GitHub 스킬 패키지(`Leonxlnx/taste-skill`, `DietrichGebert/ponytail` 6종, `kaankiziltug/logo-design-skill`)의 요약표, `npx skills add` CLI 설치 명령어, `.agents/skills/` 폴더 구조 및 `.cursorrules` 자동 트리거 사용법을 정리한 [install.md](file:///e:/pc_bit/install.md) 생성 후 GitHub(`pc_final`)에 푸시 | GitHub 원격 저장소 푸시 완료 |
| `2026-11-12` | `ide.html` GitHub 저장소 업로드 | `.gitignore`에서 `ide.html` 제외 설정을 해제하고 [ide.html](file:///e:/pc_bit/ide.html)을 GitHub(`pc_final`) `main` 브랜치에 커밋 및 푸시 | GitHub 원격 저장소 푸시 완료 |
