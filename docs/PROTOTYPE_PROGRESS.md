# TechCompare 프로토타입 진행 상황 (Phase 3–4 & 초기 제품 30개 데이터셋)

- **최종 갱신 시각**: 2026-11-06
- **데이터 저장소**: `backend/src/data/products.json` (`InMemoryCatalogRepository` 연동)
- **외부 API / 원격 DB 정책**:
  - `pc_fit` Supabase 접근 및 원격 마이그레이션: **미실행 (엄격 차단)**
  - TechSpecs API 호출: **0회 (`TECHSPECS_LIVE_CALL_ENABLED=false`)**

---

## 1단계: 30개 공식 출시 제품 마스터 목록 확정 (`2022-11-01` 이후 출시)

모든 제품은 단일 용량 변형이 아닌 **서로 다른 30개의 실제 출시 모델**이며, Apple 15개 / Samsung 15개, 스마트폰 14개 / 태블릿 8개 / 스마트워치 8개로 구성됩니다.

### A. 스마트폰 (14개 — Apple 7 + Samsung 7)

| # | 브랜드 | 제품명 | slug | 시리즈 | 기본 모델 번호 | 출시일 | 공식 출처 URL |
|---|---|---|---|---|---|---|---|
| 1 | Apple | iPhone 16 Pro Max | `iphone-16-pro-max` | iPhone | A3296 | 2024-09-20 | https://www.apple.com/kr/iphone-16-pro/specs/ |
| 2 | Apple | iPhone 16 Pro | `iphone-16-pro` | iPhone | A3293 | 2024-09-20 | https://www.apple.com/kr/iphone-16-pro/specs/ |
| 3 | Apple | iPhone 16 Plus | `iphone-16-plus` | iPhone | A3290 | 2024-09-20 | https://www.apple.com/kr/iphone-16/specs/ |
| 4 | Apple | iPhone 16 | `iphone-16` | iPhone | A3287 | 2024-09-20 | https://www.apple.com/kr/iphone-16/specs/ |
| 5 | Apple | iPhone 15 Pro Max | `iphone-15-pro-max` | iPhone | A3106 | 2023-09-22 | https://support.apple.com/ko-kr/111828 |
| 6 | Apple | iPhone 15 Pro | `iphone-15-pro` | iPhone | A3102 | 2023-09-22 | https://support.apple.com/ko-kr/111829 |
| 7 | Apple | iPhone 15 | `iphone-15` | iPhone | A3090 | 2023-09-22 | https://support.apple.com/ko-kr/111831 |
| 8 | Samsung | Galaxy S24 Ultra | `galaxy-s24-ultra` | Galaxy S | SM-S928N | 2024-01-31 | https://www.samsung.com/sec/smartphones/galaxy-s24-ultra/specs/ |
| 9 | Samsung | Galaxy S24+ | `galaxy-s24-plus` | Galaxy S | SM-S926N | 2024-01-31 | https://www.samsung.com/sec/smartphones/galaxy-s24/specs/ |
| 10 | Samsung | Galaxy S24 | `galaxy-s24` | Galaxy S | SM-S921N | 2024-01-31 | https://www.samsung.com/sec/smartphones/galaxy-s24/specs/ |
| 11 | Samsung | Galaxy Z Fold6 | `galaxy-z-fold6` | Galaxy Z | SM-F956N | 2024-07-24 | https://www.samsung.com/sec/smartphones/galaxy-z-fold6/specs/ |
| 12 | Samsung | Galaxy Z Flip6 | `galaxy-z-flip6` | Galaxy Z | SM-F741N | 2024-07-24 | https://www.samsung.com/sec/smartphones/galaxy-z-flip6/specs/ |
| 13 | Samsung | Galaxy S23 Ultra | `galaxy-s23-ultra` | Galaxy S | SM-S918N | 2023-02-17 | https://www.samsung.com/sec/smartphones/galaxy-s23-ultra/specs/ |
| 14 | Samsung | Galaxy A35 5G | `galaxy-a35-5g` | Galaxy A | SM-A356N | 2024-06-21 | https://www.samsung.com/sec/smartphones/galaxy-a35-5g-a356/SM-A356NLBKKOO/ |

### B. 태블릿 (8개 — Apple 4 + Samsung 4)

| # | 브랜드 | 제품명 | slug | 시리즈 | 기본 모델 번호 | 출시일 | 공식 출처 URL |
|---|---|---|---|---|---|---|---|
| 15 | Apple | iPad Pro 13 (M4) | `ipad-pro-13-m4` | iPad | A2925 | 2024-05-15 | https://www.apple.com/kr/ipad-pro/specs/ |
| 16 | Apple | iPad Pro 11 (M4) | `ipad-pro-11-m4` | iPad | A2836 | 2024-05-15 | https://www.apple.com/kr/ipad-pro/specs/ |
| 17 | Apple | iPad Air 13 (M2) | `ipad-air-13-m2` | iPad | A2898 | 2024-05-15 | https://www.apple.com/kr/ipad-air/specs/ |
| 18 | Apple | iPad mini (A17 Pro) | `ipad-mini-a17-pro` | iPad | A2993 | 2024-10-23 | https://www.apple.com/kr/ipad-mini/specs/ |
| 19 | Samsung | Galaxy Tab S10 Ultra | `galaxy-tab-s10-ultra` | Galaxy Tab | SM-X920 | 2024-10-04 | https://www.samsung.com/sec/tablets/galaxy-tab-s10/specs/ |
| 20 | Samsung | Galaxy Tab S10+ | `galaxy-tab-s10-plus` | Galaxy Tab | SM-X820 | 2024-10-04 | https://www.samsung.com/sec/tablets/galaxy-tab-s10/specs/ |
| 21 | Samsung | Galaxy Tab S9 Ultra | `galaxy-tab-s9-ultra` | Galaxy Tab | SM-X910 | 2023-08-11 | https://www.samsung.com/sec/tablets/galaxy-tab-s9/specs/ |
| 22 | Samsung | Galaxy Tab S9 FE | `galaxy-tab-s9-fe` | Galaxy Tab | SM-X510 | 2023-10-16 | https://www.samsung.com/sec/tablets/galaxy-tab-s9-fe/specs/ |

### C. 스마트워치 (8개 — Apple 4 + Samsung 4)

| # | 브랜드 | 제품명 | slug | 시리즈 | 기본 모델 번호 | 출시일 | 공식 출처 URL |
|---|---|---|---|---|---|---|---|
| 23 | Apple | Apple Watch Series 10 46mm | `apple-watch-series-10-46` | Apple Watch | A2999 | 2024-09-20 | https://www.apple.com/kr/apple-watch-series-10/specs/ |
| 24 | Apple | Apple Watch Series 10 42mm | `apple-watch-series-10-42` | Apple Watch | A2997 | 2024-09-20 | https://www.apple.com/kr/apple-watch-series-10/specs/ |
| 25 | Apple | Apple Watch Ultra 2 49mm | `apple-watch-ultra-2` | Apple Watch | A2986 | 2023-09-22 | https://www.apple.com/kr/apple-watch-ultra-2/specs/ |
| 26 | Apple | Apple Watch Series 9 45mm | `apple-watch-series-9-45` | Apple Watch | A2980 | 2023-09-22 | https://support.apple.com/ko-kr/111833 |
| 27 | Samsung | Galaxy Watch Ultra 47mm | `galaxy-watch-ultra` | Galaxy Watch | SM-L705N | 2024-07-24 | https://www.samsung.com/sec/watches/galaxy-watch-ultra/specs/ |
| 28 | Samsung | Galaxy Watch7 44mm | `galaxy-watch7-44` | Galaxy Watch | SM-L310 | 2024-07-24 | https://www.samsung.com/sec/watches/galaxy-watch7/specs/ |
| 29 | Samsung | Galaxy Watch6 Classic 47mm | `galaxy-watch6-classic-47` | Galaxy Watch | SM-R960 | 2023-08-11 | https://www.samsung.com/sec/watches/galaxy-watch6-classic/specs/ |
| 30 | Samsung | Galaxy Watch FE 40mm | `galaxy-watch-fe` | Galaxy Watch | SM-R861 | 2024-06-24 | https://www.samsung.com/sec/watches/galaxy-watch-fe/SM-R861NZKAKOO/ |

---

## 배치 진행 상태

- [x] **1단계**: 30개 제품 마스터 목록 및 출시일(`>= 2022-11-01`) 검증 완료
- [x] **2단계 (배치 1)**: 제품 #1 ~ #10 상세 스펙 및 변형 데이터 구축
- [x] **3단계 (배치 2)**: 제품 #11 ~ #20 상세 스펙 및 변형 데이터 구축
- [x] **4단계 (배치 3)**: 제품 #21 ~ #30 상세 스펙 및 변형 데이터 구축
- [x] **5단계**: 중복 제거, 스키마 검증 및 `InMemoryCatalogRepository` 연동 완료
- [x] **6단계 (비교 분석 리포트)**: 스마트폰·태블릿·스마트워치 직관적 1:1 선택 빌더 및 자동 비교 분석 리포트(`핵심 비교 분석 리포트`: 우위 스펙 집계, 출고가 차이, 무게/화면/칩셋 요약) 구현 완료
- [x] **7단계 (Phase 7 Admin CRUD & 데이터 정확성 검수)**: `/admin` 실시간 30개 모델 무결성 검수(`GET /api/v1/admin/audit`) 및 제품·스펙 신규 등록/수정/삭제(`POST/PUT/DELETE /api/v1/admin/products`) 구현 완료
