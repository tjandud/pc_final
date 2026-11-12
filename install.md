# 설치된 GitHub 에이전트 스킬 요약 및 설치 가이드 (`install.md`)

현재 프로젝트(`e:\pc_bit`)에 설치되어 있는 **GitHub 오픈소스 AI 에이전트 스킬(총 3개 저장소 · 8개 세부 스킬)**의 역할 요약, CLI 설치 명령어, 폴더 구조 및 사용 방법을 정리한 문서입니다.

---

## 1. 설치된 GitHub 스킬 한눈에 보기

| 분류 | 스킬 이름 (`SKILL.md`) | GitHub 원본 저장소 | 작동 방식 | 핵심 역할 한 줄 요약 |
| :--- | :--- | :--- | :---: | :--- |
| **프론트엔드 디자인** | **`design-taste-frontend`** | [`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) | **자동 적용** | AI 특유의 흔한 템플릿 느낌(Anti-Slop)을 배제하고, 정돈된 타이포그래피·여백·고정폭 숫자(`tabular-nums`) 중심의 하이엔드 테크 웹 UI를 설계합니다. |
| **코드 다이어트 & 최소 변경** | **`ponytail`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **자동 적용** | 과잉 설계(Over-engineering)와 불필요한 래퍼·헬퍼를 막고, 요구사항을 가장 간결하고 명확한 최소한의 코드 변경(Minimal Diff)으로 해결합니다. |
| **변경 코드 정밀 리뷰** | **`ponytail-review`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **자동 + `/ponytail-review`** | 변경된 코드뿐만 아니라 연결된 호출부(Callers)까지 추적하여 로직 오류, 보안, 엣지 케이스, 성능 저하, 불필요한 라인을 점검합니다. |
| **전체 코드베이스 감사** | **`ponytail-audit`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **`/ponytail-audit`** | 저장소 전체를 스캔해 버그, 보안 취약점, 부하 시 병목 구간, 삭제하거나 합칠 수 있는 중복/데드 코드를 중요도 순으로 리포트합니다. |
| **기술 부채 대장 조회** | **`ponytail-debt`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **`/ponytail-debt`** | 빠른 구현을 위해 의도적으로 타협하고 남긴 `// shortcut:` 주석들을 전수 수집하여 해결 우선순위 대장으로 정리해 보여줍니다. |
| **절감 효과 벤치마크** | **`ponytail-gain`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **`/ponytail-gain`** | Ponytail 적용 시 절약되는 코드 라인 수, 토큰 비용, 응답 속도 벤치마크 수치를 요약해 출력합니다. |
| **Ponytail 도움말** | **`ponytail-help`** | [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail) | **`/ponytail-help`** | Ponytail의 강도 레벨(`lite`, `full`, `ultra`)과 하위 명령어 사용법을 빠르게 안내합니다. |
| **로고 · 브랜드 마크 디자인** | **`logo-design`** | [`kaankiziltug/logo-design-skill`](https://github.com/kaankiziltug/logo-design-skill) | **명시적 요청 시에만** | 1,400+ 실제 SVG 로고 레퍼런스와 기하학적 그리드 검증을 기반으로 정밀 SVG 로고·워드마크·모노그램·파비콘을 디자인합니다. |

---

## 2. 스킬 설치 방법 (CLI 명령어)

다른 PC나 새로운 프로젝트 폴더에서 동일한 GitHub 스킬들을 설치할 때는 터미널(PowerShell / CMD)에서 **`npx skills add`** 명령어를 실행하면 됩니다.

### ① 3대 GitHub 스킬 패키지 개별 설치 명령어
```powershell
# 1. 프론트엔드 디자인 스킬 (design-taste-frontend)
npx skills add https://github.com/Leonxlnx/taste-skill -y

# 2. Ponytail 코드 최적화 & 리뷰 스킬 세트 (ponytail 외 5종 일괄 설치)
npx skills add https://github.com/DietrichGebert/ponytail -y

# 3. 전문 SVG 로고·아이콘 디자인 스킬 (logo-design)
npx skills add https://github.com/kaankiziltug/logo-design-skill -y
```

### ② 한 줄로 3개 패키지 한꺼번에 설치하기 (PowerShell)
```powershell
npx skills add Leonxlnx/taste-skill -y; npx skills add DietrichGebert/ponytail -y; npx skills add kaankiziltug/logo-design-skill -y
```

> **참고**: 이미 이 GitHub 저장소(`pc_final`)를 `git clone` 받은 친구들은 프로젝트 내부의 `.agents/skills/` 폴더에 스킬 파일들이 이미 포함되어 있으므로 별도로 다시 설치할 필요가 없습니다.

---

## 3. 설치 위치 및 파일 구조

`npx skills add`를 실행하면 프로젝트 루트에 아래와 같이 파일이 생성·관리됩니다.

```text
e:\pc_bit\
├── .cursorrules                                     # 스킬 자동 라우팅 및 프로젝트 코딩 가드레일 규칙
├── skills-lock.json                                 # 설치된 GitHub 스킬 출처 및 해시(버전) 잠금 파일
├── docs\
│   └── skills-workflow.md                           # 상황별 스킬 활용 치트시트
└── .agents\
    └── skills\
        ├── design-taste-frontend\SKILL.md           # 프론트엔드 Anti-Slop 디자인 시스템 지침
        ├── logo-design\SKILL.md                     # SVG 로고·아이콘 설계 지침 및 1,400+ 레퍼런스 DB
        ├── ponytail\SKILL.md                        # 최소 변경(Minimal Diff) & 간결한 코드 작성 지침
        ├── ponytail-review\SKILL.md                 # 변경분 + 연결 코드(Callers) 품질 리뷰 지침
        ├── ponytail-audit\SKILL.md                  # 전체 레포지토리 버그·보안·블로트 감사 지침
        ├── ponytail-debt\SKILL.md                   # shortcut: 기술 부채 주석 추적 지침
        ├── ponytail-gain\SKILL.md                   # 토큰/코드 절감 효과 출력 지침
        └── ponytail-help\SKILL.md                   # Ponytail 레벨 및 명령어 레퍼런스
```

---

## 4. 스킬별 상세 특징 및 사용법

### ① `design-taste-frontend` (`Leonxlnx/taste-skill`)
* **언제 쓰나**: 메인 페이지, 비교 페이지, 카드 UI, 다크/화이트 테마, 타이포그래피, 애니메이션 등 프론트엔드 화면을 만들거나 다듬을 때 **자동으로 적용**됩니다.
* **핵심 효과**:
  - 모든 스펙 수치·클럭·가격·모델번호에 고정폭 숫자(`font-variant-numeric: tabular-nums`, `JetBrains Mono`)를 강제하여 비교표 자릿수를 칼같이 맞춥니다.
  - 과도한 블러 남발이나 스크롤 렉을 유발하는 무거운 CSS 효과를 제어하고, 실제 제품 사진과 깔끔한 보더·명암비를 우선시합니다.

### ② `ponytail` 시리즈 (`DietrichGebert/ponytail`)
* **언제 쓰나**: 백엔드/프론트엔드 코드 수정 시 기본(`full` 레벨)으로 **자동 작동**하며, 리뷰나 감사가 필요할 때 채팅창에 슬래시 명령어를 입력해 호출합니다.
* **주요 명령어**:
  - **`/ponytail-review`** : *"방금 수정한 코드에 사이드이펙트나 렉 걸리는 부분 없는지 `/ponytail-review`로 봐줘"*
  - **`/ponytail-audit`** : *"프로젝트 전체에서 안 쓰는 코드나 버그 있는지 `/ponytail-audit` 돌려줘"*
  - **`/ponytail-debt`** : *"지금까지 `shortcut:`으로 남겨둔 기술 부채 목록 정리해줘"*
  - **`/ponytail lite` / `full` / `ultra`** : 코드 압축 및 단순화 강도 조절

### ③ `logo-design` (`kaankiziltug/logo-design-skill`)
* **언제 쓰나**: `.cursorrules` 보호 규칙에 따라 **사용자가 명시적으로 로고·심볼·아이콘·파비콘 디자인을 요청했을 때만** 작동합니다. (일반 기능 수정 중에는 기존 로고를 건드리지 않습니다.)
* **사용 예시**: *"우리 사이트 헤더에 들어갈 새 심볼 로고를 `logo-design` 스킬 써서 SVG로 3가지 시안 만들어줘"*

---

## 5. `.cursorrules` 자동 트리거 설정 요약

스킬을 설치한 뒤 AI 에이전트가 매번 프롬프트 지시 없이도 알아서 스킬을 적용하도록 프로젝트 루트의 [`.cursorrules`](file:///e:/pc_bit/.cursorrules)에 아래 규칙이 연결되어 있습니다.

1. **모든 코드 작성/수정** → `ponytail` 최소 변경 원칙 자동 적용 (단, Zod 입력 검증·보안·에러 핸들링은 절대 축소 금지)
2. **프론트엔드 UI/테마 작업** → `design-taste-frontend` 자동 적용
3. **로고/파비콘 작업** → 명시적 요청 시에만 `logo-design` 적용
4. **기능 구현 완료 후** → `ponytail-review` 기준으로 호출부(Callers) 영향도 및 성능 점검
