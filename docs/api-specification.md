# API Specification (`/api/v1`)

> 범례: ✅ 구현됨 · ⏳ 예정 (해당 Phase)

## 공통

- 성공: `{ success: true, data, meta? }`
- 실패: `{ success: false, error: { code, message, details? } }`

| HTTP | code 예시 | 상황 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 쿼리/바디 검증 실패 |
| 401 | UNAUTHORIZED | 인증 필요 |
| 403 | FORBIDDEN | 관리자 권한 없음 |
| 404 | NOT_FOUND | 리소스/라우트 없음 |
| 409 | DUPLICATE | 중복 등록 |
| 422 | CATEGORY_MISMATCH, COMPARE_LIMIT | 비교 규칙 위반 |
| 429 | RATE_LIMITED, QUOTA_GUARD | 호출 제한 |
| 502 | PROVIDER_ERROR | 외부 API 오류 |
| 500 | INTERNAL_ERROR | 서버 오류 |

## 엔드포인트

| 상태 | Method | Path | 설명 | 권한 |
| --- | --- | --- | --- | --- |
| ✅ | GET | `/health` | 서버 상태 및 설정 여부 (비밀값 미포함, boolean만) | Public |
| ⏳ P2 | GET | `/products` | 목록 · 검색 · 필터 · 정렬 (`q, brand, category, year, minPrice, maxPrice, sort, page, limit`) | Public |
| ⏳ P3 | GET | `/products/featured` | 인기 · 최근 출시 · 최근 가격 변동 | Public |
| ⏳ P2 | GET | `/products/:slug` | 상세 + 변형 + 출처 | Public |
| ⏳ P2 | GET | `/products/:slug/variants` | 변형 모델 | Public |
| ⏳ P2 | GET | `/products/:slug/specs` | 스펙 (`variantId` 선택) | Public |
| ⏳ P2 | GET | `/categories/:slug/spec-definitions` | 카테고리별 스펙 정의 | Public |
| ⏳ P4 | GET | `/compare?items=slug:variant,...` | 2–4개, 동일 카테고리 검증 | Public |
| ⏳ P6 | GET | `/variants/:id/prices` | 출시가 · 판매처별 현재가 | Public |
| ⏳ P6 | GET | `/variants/:id/price-history` | 이력 + 통계 (`period, storeId`) | Public |
| ⏳ P7 | GET/POST/DELETE | `/favorites` | 즐겨찾기 | User |
| ⏳ P7 | CRUD | `/admin/products`, `/admin/products/:id/specs`, `/admin/products/:id/images`, `/admin/prices` | 관리 | Admin |
| ⏳ P7 | GET | `/admin/audit` | 중복 · 누락 · 검수 대기 | Admin |
| ⏳ P5 | GET | `/admin/ingestion/search` | 외부 검색 | Admin |
| ⏳ P5 | POST | `/admin/ingestion/collect` | 상세 수집 + 검증 + 저장 | Admin |
| ⏳ P5 | GET | `/admin/ingestion/jobs` | 작업 · 로그 | Admin |
