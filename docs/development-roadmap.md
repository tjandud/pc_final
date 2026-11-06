# Development Roadmap

| Phase | 내용 | 상태 |
| --- | --- | --- |
| 0 | 환경 · 설계 검증 | ✅ 완료 |
| 1 | 프로젝트 기반 (Vue/Vite/TS, Express/TS, 라우팅, Pinia, 토큰, 레이아웃, Git, 문서) | ✅ 완료 |
| 2 | Supabase 15개 테이블 SQL 마이그레이션, RLS, 시드, Repository/Service, 제품/변형/스펙 조회 API, 단위/통합 테스트 | ✅ 완료 (신규 Supabase 원격 프로젝트 적용 대기) |
| 3 | 메인 · 목록 · 검색 · 상세 페이지 | ⏳ 다음 |
| 4 | 제품 비교 · 공유 URL | ⏳ |
| 5 | TechSpecs 수집 파이프라인 | ⏳ (약관 확인 선행) |
| 6 | 가격 데이터 · 그래프 | ⏳ (가격 공급자 결정 선행) |
| 7 | 관리자 페이지 · 권한 | ⏳ |
| 8 | 최종 검증 · 배포 준비 | ⏳ |

## Phase 2 결과

- **SQL 마이그레이션 & 시드**:
  - `supabase/migrations/00001_initial_schema.sql`: 15개 핵심 테이블, 고유 제약 조건, 검색/필터/가격 복합 인덱스, `price_history` 자동 누적 트리거 및 덮어쓰기 방지 트리거 작성 완료.
  - `supabase/migrations/00002_rls_policies.sql`: 15개 전 테이블 RLS 활성화 및 일반 사용자 / 로그인 사용자 / 관리자(`is_admin()`) 권한 분리 정책 작성 완료.
  - `supabase/seed/00001_base_reference.sql`: 브랜드, 카테고리, 카테고리별 스펙 정의(스마트워치 카메라 제외), 데이터 출처, 제조사 공식 공개 사양 기반 대표 기기 6종 및 변형 모델 시드 작성 완료.
- **백엔드 구현 및 테스트**:
  - `SupabaseCatalogRepository` 및 원격 연결 전 로컬 검증용 `InMemoryCatalogRepository` 이중 어댑터 구현.
  - 제품 목록, 검색, 브랜드/카테고리별 조회, 상세, 변형 모델, 스펙 조회 REST API 10개 엔드포인트 구현.
  - 단위 테스트 4건 + REST API 통합 테스트 9건(총 13건) 모두 통과 (`npm test`).
- **보류 사항 (사용자 지시 준수)**:
  - 기존 `pc_fit` 프로젝트는 일체 조회하거나 수정하지 않았으며, 신규 TechCompare 전용 Supabase 프로젝트 준비 후 원격 마이그레이션을 적용하기 직전 상태에서 대기 중.
