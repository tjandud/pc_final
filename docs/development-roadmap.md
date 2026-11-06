# Development Roadmap

| Phase | 내용 | 상태 |
| --- | --- | --- |
| 0 | 환경 · 설계 검증 | ✅ 완료 (TechSpecs 약관 원문 일부 확인 필요) |
| 1 | 프로젝트 기반 (Vue/Vite/TS, Express/TS, 라우팅, Pinia, 토큰, 레이아웃, Git, 문서) | ✅ 완료 |
| 2 | Supabase 연결, 마이그레이션, RLS, Repository/Service, 제품 조회 API | ⏳ 다음 |
| 3 | 메인 · 목록 · 검색 · 상세 페이지 | ⏳ |
| 4 | 제품 비교 · 공유 URL | ⏳ |
| 5 | TechSpecs 수집 파이프라인 | ⏳ (약관 확인 선행) |
| 6 | 가격 데이터 · 그래프 | ⏳ (가격 공급자 결정 선행) |
| 7 | 관리자 페이지 · 권한 | ⏳ |
| 8 | 최종 검증 · 배포 준비 | ⏳ |

## Phase 1 결과

- 구현: Vue 3 + Vite + TS 앱, Vue Router(6개 라우트, lazy), Pinia 비교함 스토어(2–4개, 동일 카테고리 규칙, localStorage), 디자인 토큰, 헤더 · 푸터 · 비교함 트레이, Express 5 + TS 서버, Zod 환경변수 검증, 공통 응답 · 오류 미들웨어, `/api/v1/health`
- 실행 확인: 프론트 `vue-tsc + vite build` 통과, 백엔드 `tsc` 빌드 통과, health 200 · 미존재 라우트 404, Vite 프록시 경유 호출 성공, 프론트 번들 내 API 키 문자열 0건
- 미구현: 제품 데이터, DB, 비교 로직, 가격, 관리자, 자동화 테스트 프레임워크
