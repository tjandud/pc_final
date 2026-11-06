# API Specification (`/api/v1`)

> 범례: ✅ 구현 및 테스트 완료 · ⏳ 예정 (해당 Phase)

## 공통 응답 규격

- 성공: `{ "success": true, "data": ..., "meta"?: { "page": 1, "limit": 20, "total": 6 } }`
- 실패: `{ "success": false, "error": { "code": "...", "message": "...", "details"?: ... } }`

| HTTP | code 예시 | 상황 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 쿼리/바디 검증 실패 |
| 401 | `UNAUTHORIZED` | 인증 토큰 누락 또는 만료 |
| 403 | `FORBIDDEN` | 관리자 권한 없음 |
| 404 | `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `VARIANT_NOT_FOUND`, `CATEGORY_NOT_FOUND` | 리소스/라우트 없음 |
| 409 | `DUPLICATE` | 중복 등록 |
| 422 | `CATEGORY_MISMATCH`, `COMPARE_LIMIT` | 비교 규칙 위반 |
| 429 | `RATE_LIMITED`, `QUOTA_GUARD` | 호출 제한 |
| 503 | `SUPABASE_NOT_CONFIGURED` | 원격 Supabase 미설정 시 관리자 인증 시도 |
| 500 | `INTERNAL_ERROR` | 서버 오류 |

## 엔드포인트

| 상태 | Method | Path | 설명 | 권한 |
| --- | --- | --- | --- | --- |
| ✅ P1 | GET | `/health` | 서버 상태 및 설정 여부 (비밀값 미포함, boolean/모드만) | Public |
| ✅ P2 | GET | `/brands` | 지원 브랜드 목록 (`apple`, `samsung`) | Public |
| ✅ P2 | GET | `/brands/:slug/products` | 특정 브랜드 제품 목록 · 검색 · 정렬 | Public |
| ✅ P2 | GET | `/categories` | 지원 카테고리 목록 (`smartphone`, `tablet`, `smartwatch`) | Public |
| ✅ P2 | GET | `/categories/:slug/products` | 특정 카테고리 제품 목록 · 검색 · 정렬 | Public |
| ✅ P2 | GET | `/categories/:slug/spec-definitions` | 카테고리별 표준 스펙 정의 (워치는 카메라 제외) | Public |
| ✅ P2 | GET | `/products` | 제품 목록 · 검색 · 필터 · 정렬 (`q, brand, category, series, year, minPrice, maxPrice, sort, page, limit, includeTest`) | Public |
| ✅ P2 | GET | `/products/search` | 제품명 · 모델 번호 검색 (`/products`와 동일 쿼리 지원) | Public |
| ✅ P2 | GET | `/products/:slug` | 제품 상세 기본 정보 + 변형 모델 + 이미지 + 데이터 출처 | Public |
| ✅ P2 | GET | `/products/:slug/variants` | 특정 제품의 저장 공간 · 모델 번호 · 통신 방식별 변형 모델 목록 | Public |
| ✅ P2 | GET | `/products/:slug/specs` | 제품 상세 스펙 조회 (`?variantId=` 선택, 미확인 값은 `'정보 없음'` 반환) | Public |
| ⏳ P3 | GET | `/products/featured` | 인기 · 최근 출시 · 최근 가격 변동 | Public |
| ⏳ P4 | GET | `/compare?items=slug:variant,...` | 2–4개, 동일 카테고리 검증 | Public |
| ⏳ P6 | GET | `/variants/:id/prices` | 출시가 · 판매처별 현재가 | Public |
| ⏳ P6 | GET | `/variants/:id/price-history` | 이력 + 통계 (`period, storeId`) | Public |
| ⏳ P7 | GET/POST/DELETE | `/favorites` | 즐겨찾기 | User |
| ⏳ P7 | CRUD | `/admin/products`, `/admin/products/:id/specs`, `/admin/products/:id/images`, `/admin/prices` | 관리 | Admin |
| ⏳ P7 | GET | `/admin/audit` | 중복 · 누락 · 검수 대기 | Admin |
| ⏳ P5 | GET | `/admin/ingestion/search` | 외부 검색 | Admin |
| ⏳ P5 | POST | `/admin/ingestion/collect` | 상세 수집 + 검증 + 저장 | Admin |
| ⏳ P5 | GET | `/admin/ingestion/jobs` | 작업 · 로그 | Admin |
