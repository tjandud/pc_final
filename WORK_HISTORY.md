# TechCompare 프로젝트 작업 기록 및 개발 인수인계서 (WORK_HISTORY.md)

> **문서 목적**: 본 문서는 지금까지 진행된 모든 작업 내역, 데이터베이스 구조, 프론트엔드/백엔드 아키텍처, 제품 카탈로그 및 이미지 동기화 내역을 상세히 기록하여, 다음 작업자가 본 문서를 읽고 즉시 작업을 이어서 진행할 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

- **프로젝트명**: TechCompare (IT 하드웨어 스펙 비교 및 추천 플랫폼)
- **주요 기능**:
  - 스마트폰, 태블릿, 노트북, 스마트워치, 오디오(이어폰/헤드폰) 5대 IT 기기 카탈로그 탐색
  - 1:1 및 다자간(최대 4개) 카테고리별 정밀 스펙 비교 테이블
  - Three.js 3D 레이저 플로우 인터랙티브 메인 쇼케이스
  - 제조사 공식 홈페이지 스펙 및 실제 스튜디오 정품 사진 기반 투명한 정보 제공
- **기술 스택**:
  - **Frontend**: Vue 3 (Composition API), TypeScript, Vite, Pinia, Vue Router, Three.js, Lucide Icons, TailwindCSS
  - **Backend**: Node.js, Express, TypeScript, Zod (Validation), Supabase (연동 준비)

---

## 2. 지금까지 진행된 핵심 작업 상세 내역

### 2.1. 메인 디자인 리뉴얼 및 3D 인터랙티브 쇼케이스 구축
- **레퍼런스 반영**: `ide.html`의 사이버펑크/네온 다크 테마 및 HUD 스타일 레이아웃 반영.
- **Three.js Laserflow 쇼케이스 탑재**: 기존 정적 타일 섹션을 대체하여 `laserflow_scrolling_showcase.html`의 3D 레이저 파티클 애니메이션과 인터랙티브 AI 쇼케이스 섹션 결합.
- **비교 화면 및 카탈로그 UI 개편**: 카테고리 탭(스마트폰, 태블릿, 노트북, 스마트워치, 오디오) 및 9개 활성 브랜드 필터 적용.

### 2.2. 브랜드 및 카테고리 재편 (DB 개편)
- **제거된 브랜드 및 기종**:
  - Google (8종), Xiaomi (8종), Garmin (5종) 완전 제거
- **신규 카테고리 추가**:
  - **노트북 (laptop)**: 총 20개 모델 (Apple MacBook 5종, 삼성 갤럭시북 5종, LG 그램/울트라기어 4종, Lenovo ThinkPad/Legion/Yoga 3종, ASUS ROG/Zenbook/TUF 3종)
  - **오디오 / 이어폰·헤드폰 (audio)**: 총 20개 모델 (Apple AirPods 4종, Beats 1종, 삼성 갤럭시 버즈 4종, 소니 WH/WF/LinkBuds 5종, Bose QC 4종, 젠하이저 MOMENTUM 2종)
- **카테고리별 최종 기종 분포 (총 99개)**:
  - `smartphone` (스마트폰): **30종**
  - `tablet` (태블릿): **19종**
  - `laptop` (노트북): **20종**
  - `smartwatch` (스마트워치): **10종**
  - `audio` (오디오): **20종**
  - **총 9개 브랜드**: Apple, Samsung, LG, Sony, Lenovo, ASUS, Bose, Sennheiser, Beats

### 2.3. 공식 홈페이지 실제 제품 스튜디오 사진 구축 (완료)
- **문제 해결**: 초기에 임시 생성되었던 자체 제작 SVG 벡터 그래픽들을 전면 폐기.
- **제조사 공식 사진 반영**: 각 제조사(Apple CDN, 삼성전자 공식몰/뉴스룸, LG전자, 소니, Lenovo, ASUS, Bose, 젠하이저)의 **실제 스튜디오/누끼 정품 사진(`.jpg`)**을 다운로드하여 99개 전 기종 전수 구축.
- **저장 위치**:
  - `frontend/public/images/products/${slug}.jpg`
  - `frontend/dist/images/products/${slug}.jpg`

### 2.4. DB 메타데이터 및 공식 스펙 URL 동기화
- 파일 경로: `backend/src/data/products.json`
- **1,093개**의 세부 사양 정의(`rawSpecs`) 검증 완료.
- 각 기종의 `dataSource.sourceUrl`에 실제 한국 공식 홈페이지/공식 지원 사양서 URL 매칭.
- 모든 기종의 `thumbnailUrl` 및 `images[0].imageUrl`을 `/images/products/${slug}.jpg`로 일치화.

### 2.5. 백엔드 및 프론트엔드 검증
- **백엔드 테스트**: 20개 전체 통합/단위 테스트 100% 통과 (`backend/src/tests/catalog.test.ts`)
- **프론트엔드 빌드**: `vue-tsc -b && vite build` 0 에러 성공 검증.

---

## 3. 핵심 디렉토리 및 파일 맵

```
pc_final-main/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── products.json          # 99개 제품 카탈로그 및 1,093개 상세 스펙 DB
│   │   ├── repositories/
│   │   │   └── inMemoryCatalog.repository.ts  # 카탈로그 메모리 저장소, 브랜드/카테고리 정의
│   │   ├── types/
│   │   │   └── domain.ts              # 카테고리, 브랜드, 도메인 타입 정의
│   │   ├── validators/
│   │   │   └── product.validator.ts   # Zod 유효성 검사기
│   │   └── tests/
│   │       └── catalog.test.ts        # 20개 통합/단위 테스트 스위트
├── frontend/
│   ├── public/
│   │   └── images/
│   │       └── products/              # 99개 공식 실물 제품 사진 (*.jpg)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/AppHeader.vue   # 상단 네비게이션 (5개 카테고리)
│   │   │   └── product/ProductCard.vue# 제품 카드 컴포넌트
│   │   ├── views/
│   │   │   ├── HomeView.vue           # 메인 3D 레이저 쇼케이스 및 카테고리 진입
│   │   │   ├── CatalogView.vue        # 카탈로그 필터링 및 검색
│   │   │   ├── CompareView.vue        # 5개 카테고리 1:1 및 다자 비교 뷰
│   │   │   └── ProductDetailView.vue  # 기종 상세 스펙 및 공식 링크 뷰
│   │   ├── utils/shopping.ts          # 9개 브랜드별 공식몰 링크 매핑
│   │   └── types/api.ts               # 프론트엔드 카테고리/브랜드 타입
├── WORK_HISTORY.md                    # 본 작업 기록서
├── README.md                          # 프로젝트 안내서
└── start.bat / install.bat            # 실행 및 설치 스크립트
```

---

## 4. 로컬 실행 방법

### 1) 백엔드 실행
```bash
cd backend
npm install
npm run dev
# 포트 4000에서 실행됨 (http://localhost:4000)
```

### 2) 백엔드 테스트 실행
```bash
cd backend
npm test
# 20개 테스트 통과 확인
```

### 3) 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
# 포트 5173에서 실행됨 (http://localhost:5173)
```

---

## 5. 다음 작업 시 가이드라인

1. **제품 추가/수정 시**:
   - `backend/src/data/products.json`에 기종 정보를 추가하고, 공식 이미지(`.jpg`)를 `frontend/public/images/products/${slug}.jpg`에 추가합니다.
   - 제품 스펙 카테고리가 5개(`smartphone`, `tablet`, `laptop`, `smartwatch`, `audio`)에 부합하는지 확인합니다.
2. **비교 화면 기능 확장 시**:
   - `frontend/src/views/CompareView.vue` 내 프리셋 콤보 및 스펙 하이라이트 로직을 참조합니다.
