# TechCompare

Apple과 Samsung의 스마트폰 · 태블릿 · 스마트워치 스펙과 가격 변동을 비교하는 웹 플랫폼.

> 현재 상태: **Phase 1 (프로젝트 기반 구축) 완료** — 제품 데이터, DB, 비교, 가격 기능은 아직 구현되지 않았습니다. 진행 현황은 [docs/development-roadmap.md](docs/development-roadmap.md) 참고.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | Vue 3, Vite, TypeScript, Vue Router, Pinia, VueUse, Lucide |
| Backend | Node.js, Express 5, TypeScript, Zod |
| Database | Supabase (PostgreSQL, Storage) — Phase 2 |
| External API | TechSpecs API v5 (서버 전용) — Phase 5 |
| Design | design-taste-frontend (Taste Skill), CSS 변수 토큰 |

## 폴더 구조

```
.
├── frontend/          # Vue 3 + Vite 앱
├── backend/           # Express REST API
├── supabase/          # SQL 마이그레이션 (Phase 2)
├── docs/              # 설계 문서
└── .agents/skills/    # Taste Skill (디자인 지침)
```

## 로컬 실행

요구 사항: Node.js 22 이상

```bash
# 1. 백엔드
cd backend
cp .env.example .env      # 실제 값은 .env에만 입력 (Git 제외됨)
npm install
npm run dev               # http://localhost:4000/api/v1/health

# 2. 프론트엔드 (새 터미널)
cd frontend
npm install
npm run dev               # http://localhost:5173  (/api → :4000 프록시)
```

## 스크립트

| 위치 | 명령 | 설명 |
| --- | --- | --- |
| backend | `npm run dev` | tsx watch 개발 서버 |
| backend | `npm run build` / `npm start` | TypeScript 빌드 / 실행 |
| backend | `npm run typecheck` | 타입 검사 |
| frontend | `npm run dev` | Vite 개발 서버 |
| frontend | `npm run build` | vue-tsc 타입 검사 + 프로덕션 빌드 |

## 보안 원칙

- `TECHSPECS_API_ID`, `TECHSPECS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 **`backend/.env`에만** 저장합니다.
- 프론트엔드는 상대 경로 `/api/*`만 호출하며 어떤 비밀값도 다루지 않습니다.
- `.env`, `.env.*`는 `.gitignore`로 제외되며 `.env.example`에는 실제 값을 넣지 않습니다.
- `TECHSPECS_LIVE_CALL_ENABLED=false`가 기본값이며, 사용량 및 라이선스 조건 확인 전에는 외부 API를 호출하지 않습니다.

## 문서

- [아키텍처](docs/architecture.md)
- [DB ERD](docs/database-erd.md)
- [API 명세](docs/api-specification.md)
- [데이터 수집](docs/data-collection.md)
- [개발 로드맵](docs/development-roadmap.md)
