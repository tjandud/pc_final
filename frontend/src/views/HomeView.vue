<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import type { CategorySlug, ProductSummaryRecord } from '@/types/api'
import AuraRibbonBg from '@/components/common/AuraRibbonBg.vue'
import HeroNeonGlobe from '@/components/common/HeroNeonGlobe.vue'
import { useSavedStore } from '@/stores/saved'
import { useCompareStore } from '@/stores/compare'

const HeroTrophyStage = defineAsyncComponent(() => import('@/components/common/HeroTrophyStage.vue'))

const router = useRouter()
const savedStore = useSavedStore()
const compareStore = useCompareStore()

const SLIDES = [
  { id: 'how', label: '01 · 개요' },
  { id: 'glue', label: '02 · 라인업 · DB' },
  { id: 'alerts', label: '03 · 맞춤 추천' },
  { id: 'explore', label: '04 · 예산 탐색' },
  { id: 'foot', label: '05 · 빠른 비교 · 마이페이지' },
] as const

const activeSlide = ref(0)
const isSnapMode = ref(typeof window !== 'undefined' ? window.innerWidth > 900 && window.innerHeight >= 640 : true)
let lockUntil = 0
let wheelAcc = 0

const allProducts = ref<ProductSummaryRecord[]>([])
const searchQuery = ref('')
const mountTrophyStage = ref(!isSnapMode.value)

// Slide 1: Interactive 5-category DB breakdown
const selectedCatIdx = ref(0)
const DB_CATS: Array<{
  slug: CategorySlug
  ico: string
  lb: string
  fallbackCnt: number
  pct: number
  sample: string
}> = [
  {
    slug: 'smartphone',
    ico: '#ico-phone',
    lb: '스마트폰',
    fallbackCnt: 30,
    pct: 100,
    sample: 'iPhone 17 Pro Max · Galaxy S25 Ultra · Z Fold7',
  },
  {
    slug: 'laptop',
    ico: '#ico-laptop',
    lb: '노트북',
    fallbackCnt: 20,
    pct: 67,
    sample: 'MacBook Pro 16 M3 · Book4 Ultra · LG gram Pro',
  },
  {
    slug: 'audio',
    ico: '#ico-audio',
    lb: '오디오',
    fallbackCnt: 20,
    pct: 67,
    sample: 'AirPods Pro 2 · Sony WH-1000XM5 · Bose QC',
  },
  {
    slug: 'tablet',
    ico: '#ico-tab',
    lb: '태블릿',
    fallbackCnt: 19,
    pct: 63,
    sample: 'iPad Pro 13 M4 · Tab S10 Ultra · Legion Tab',
  },
  {
    slug: 'smartwatch',
    ico: '#ico-watch',
    lb: '스마트워치',
    fallbackCnt: 10,
    pct: 33,
    sample: 'Watch Series 11 · Galaxy Watch8 · Ultra',
  },
]

const totalCount = computed(() => allProducts.value.length || 99)

const dbRows = computed(() => {
  const counts = DB_CATS.map((c) => {
    const live = allProducts.value.filter((p) => p.category.slug === c.slug).length
    return allProducts.value.length > 0 ? live : c.fallbackCnt
  })
  const maxC = Math.max(30, ...counts)
  return DB_CATS.map((c, idx) => {
    const cnt = counts[idx] ?? c.fallbackCnt
    const liveNames = allProducts.value
      .filter((p) => p.category.slug === c.slug)
      .slice(0, 3)
      .map((p) => p.name)
      .join(' · ')
    return {
      ...c,
      countLabel: `${cnt}종`,
      barW: `${Math.max(16, Math.round((cnt / maxC) * 100))}%`,
      sampleText: liveNames || c.sample,
    }
  })
})

const selectedDbCat = computed(() => dbRows.value[selectedCatIdx.value] ?? dbRows.value[0]!)

// Slide 2: Real AI + Objective Weighted-Scoring Engine over 99-device DB
type AiProfileKey = 'balanced' | 'flagship' | 'value' | 'portable'

const aiPrompt = ref('촬영과 배터리가 뛰어난 플래그십 스마트폰 추천해줘')
const aiObjective = ref<AiProfileKey>('flagship')
const activePresetIdx = ref(0)

const AI_PRESETS: Array<{
  label: string
  prompt: string
  objective: AiProfileKey
  fallbackSlugA: string
  fallbackSlugB: string
  fallbackNameA: string
  fallbackNameB: string
}> = [
  {
    label: '📷 카메라·배터리 (폰)',
    prompt: '촬영과 배터리가 뛰어난 플래그십 스마트폰 추천해줘',
    objective: 'flagship',
    fallbackSlugA: 'iphone-17-pro-max',
    fallbackSlugB: 'galaxy-s25-ultra',
    fallbackNameA: 'iPhone 17 Pro Max',
    fallbackNameB: 'Galaxy S25 Ultra',
  },
  {
    label: '🪶 초경량 작업 (노트북)',
    prompt: '이동 작업용 가벼운 고성능 노트북 추천해줘',
    objective: 'portable',
    fallbackSlugA: 'lg-gram-pro-16',
    fallbackSlugB: 'galaxy-book4-pro-16',
    fallbackNameA: 'LG gram Pro 16',
    fallbackNameB: 'Galaxy Book4 Pro 16',
  },
  {
    label: '✏️ 대화면 필기 (태블릿)',
    prompt: '대화면 필기 및 영상 편집용 최상급 태블릿',
    objective: 'flagship',
    fallbackSlugA: 'ipad-pro-13-m4',
    fallbackSlugB: 'galaxy-tab-s10-ultra',
    fallbackNameA: 'iPad Pro 13 (M4)',
    fallbackNameB: 'Galaxy Tab S10 Ultra',
  },
  {
    label: '🎧 100만원 이하 노캔·가성비',
    prompt: '100만원 이하 가성비 좋은 노이즈캔슬링 오디오 추천',
    objective: 'value',
    fallbackSlugA: 'sony-wh-1000xm5',
    fallbackSlugB: 'bose-quietcomfort-ultra-headphones',
    fallbackNameA: 'Sony WH-1000XM5',
    fallbackNameB: 'Bose QuietComfort Ultra Headphones',
  },
]

const AI_OBJECTIVE_LABELS: Array<{ id: AiProfileKey; label: string }> = [
  { id: 'balanced', label: '종합 밸런스' },
  { id: 'flagship', label: '성능·플래그십' },
  { id: 'value', label: '예산·가성비' },
  { id: 'portable', label: '최신·휴대성' },
]

function applyAiPreset(idx: number) {
  const p = AI_PRESETS[idx]
  if (!p) return
  activePresetIdx.value = idx
  aiPrompt.value = p.prompt
  aiObjective.value = p.objective
}

function submitAiPrompt() {
  // Pure reactive evaluation triggers automatically; blur keeps mobile keyboard tidy
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const aiAnalysis = computed(() => {
  const text = aiPrompt.value.trim().toLowerCase()

  // 1. Parse natural language signals: budget, category, brand, and profile intent
  const budgetMatch = text.match(/(\d{2,3})\s*만/)
  const maxWon = budgetMatch ? Number(budgetMatch[1]) * 10000 : null

  let cat: CategorySlug | null = null
  if (/(노트북|맥북|macbook|그램|gram|싱크패드|thinkpad|zenbook|젠북|코딩|개발)/.test(text)) cat = 'laptop'
  else if (/(태블릿|아이패드|ipad|갤럭시\s*탭|tab|필기|드로잉)/.test(text)) cat = 'tablet'
  else if (/(이어폰|헤드폰|오디오|노캔|노이즈|airpods|에어팟|버즈|buds|wh-|wf-|bose|젠하이저)/.test(text)) cat = 'audio'
  else if (/(워치|시계|watch|가민|garmin|러닝|헬스)/.test(text)) cat = 'smartwatch'
  else if (/(폰|스마트폰|아이폰|iphone|갤럭시\s*s|플립|폴드|카메라|줌)/.test(text)) cat = 'smartphone'

  let brandPref: string | null = null
  if (/(애플|apple|아이폰|아이패드|맥북|에어팟|애플워치)/.test(text)) brandPref = 'apple'
  else if (/(삼성|samsung|갤럭시|울트라|플립|폴드)/.test(text)) brandPref = 'samsung'
  else if (/(엘지|lg|그램)/.test(text)) brandPref = 'lg'
  else if (/(소니|sony|xm5)/.test(text)) brandPref = 'sony'
  else if (/(보스|bose)/.test(text)) brandPref = 'bose'

  // Determine objective weights dynamically
  let prof: AiProfileKey = aiObjective.value
  if (/(가성비|저렴|실속|보급)/.test(text) && prof === 'balanced') prof = 'value'
  else if (/(플래그십|최고|프로|울트라|편집|고사양)/.test(text) && prof === 'balanced') prof = 'flagship'
  else if (/(가벼|경량|휴대|이동|최신)/.test(text) && prof === 'balanced') prof = 'portable'

  const wSpec = prof === 'flagship' ? 42 : prof === 'balanced' ? 30 : 20
  const wBudget = maxWon || prof === 'value' ? 38 : prof === 'balanced' ? 24 : 14
  const wFresh = prof === 'portable' ? 38 : prof === 'balanced' ? 26 : 20
  const wIntent = 100 - (wSpec + wBudget + wFresh)

  const wantsCamera = /(촬영|카메라|줌|사진|영상)/.test(text)
  const wantsFlagship = /(플래그십|최상급|최고|프로|울트라|편집|고사양)/.test(text)

  const poolBase = cat
    ? allProducts.value.filter((p) => p.category.slug === cat)
    : allProducts.value
  const pool =
    maxWon && poolBase.some((p) => (p.currentLowestPriceKrw ?? p.launchPriceKrw ?? 0) <= maxWon)
      ? poolBase.filter((p) => {
          const pr = p.currentLowestPriceKrw ?? p.launchPriceKrw
          return pr === null || pr <= maxWon
        })
      : poolBase

  const ranked = pool
    .map((p) => {
      const nameL = p.name.toLowerCase()
      const price = p.currentLowestPriceKrw ?? p.launchPriceKrw ?? 1200000
      const ts = new Date(p.releaseDate).getTime() || Date.parse('2024-06-01')
      const recencyNorm = Math.max(
        0.58,
        Math.min(1, 0.55 + 0.45 * ((ts - Date.parse('2022-06-01')) / (Date.parse('2026-06-01') - Date.parse('2022-06-01')))),
      )
      const priceNorm = Math.min(1, price / 2400000)
      const isLightweight = /(air|gram|zenbook|slim|mini|flip|buds|wf-|qc ultra|watch)/.test(nameL)
      const isCameraTier = /(ultra|pro max|\bpro\b|15 ultra|16 pro|17 pro|s25 ultra|s24 ultra|find)/.test(nameL)

      const specFit = Math.min(
        0.99,
        (prof === 'flagship' ? 0.56 + 0.42 * priceNorm : 0.68 + 0.3 * recencyNorm) +
          (wantsCamera && isCameraTier ? 0.08 : wantsFlagship && isCameraTier ? 0.04 : 0),
      )
      const budgetFit = maxWon
        ? Math.min(0.98, 0.84 + 0.14 * (1 - Math.min(1, Math.abs(price - maxWon * 0.72) / maxWon)))
        : prof === 'value'
          ? Math.max(0.45, Math.min(0.96, 1.05 - price / 2800000))
          : 0.88 - Math.abs(0.55 - priceNorm) * 0.18
      const portFit = Math.min(
        0.98,
        recencyNorm * 0.72 + (isLightweight ? 0.26 : nameL.includes('pro') ? 0.18 : 0.14),
      )
      const catHit = cat ? (p.category.slug === cat ? 0.55 : 0.15) : 0.45
      const brandHit = brandPref ? (p.brand.slug === brandPref ? 0.45 : 0.08) : 0.43
      const intentHit = Math.min(0.99, catHit + brandHit)

      const total = Math.round(specFit * wSpec + budgetFit * wBudget + portFit * wFresh + intentHit * wIntent)
      return {
        product: p,
        score: Math.min(98, Math.max(76, total)),
        specScore: Math.round(specFit * 100),
        budgetScore: Math.round(budgetFit * 100),
        portScore: Math.round(portFit * 100),
        matchScore: Math.round(intentHit * 100),
      }
    })
    .sort((a, b) => b.score - a.score)

  const top1 = ranked[0]
  const top2 =
    ranked.find((r, idx) => idx > 0 && r.product.category.slug === top1?.product.category.slug && r.product.slug !== top1?.product.slug) ??
    ranked[1]

  const preset = AI_PRESETS[activePresetIdx.value] ?? AI_PRESETS[0]!
  const slugA = top1?.product.slug ?? preset.fallbackSlugA
  const slugB = top2?.product.slug ?? preset.fallbackSlugB
  const nameA = top1?.product.name ?? preset.fallbackNameA
  const nameB = top2?.product.name ?? preset.fallbackNameB
  const priceA = top1?.product.currentLowestPriceKrw ?? top1?.product.launchPriceKrw
  const priceB = top2?.product.currentLowestPriceKrw ?? top2?.product.launchPriceKrw

  const detectedParts: string[] = []
  if (cat) {
    const labelMap: Record<CategorySlug, string> = {
      smartphone: '스마트폰',
      laptop: '노트북',
      tablet: '태블릿',
      audio: '오디오',
      smartwatch: '워치',
    }
    detectedParts.push(labelMap[cat])
  } else {
    detectedParts.push('전 카테고리')
  }
  if (brandPref) detectedParts.push(brandPref.toUpperCase())
  if (maxWon) detectedParts.push(`≤₩${Math.round(maxWon / 10000)}만`)

  return {
    detectedSummary: `${detectedParts.join(' · ')} (${pool.length || 99}종 분석)`,
    rows: [
      ['사양·성능 Fit', `비중 ${wSpec}%`, Math.max(58, top1?.specScore ?? 94)],
      ['예산·가격 효율', `비중 ${wBudget}%`, Math.max(58, top1?.budgetScore ?? 90)],
      ['최신·휴대성', `비중 ${wFresh}%`, Math.max(58, top1?.portScore ?? 92)],
      ['조건 매칭률', `적합 ${top1?.score ?? 96}%`, top1?.score ?? 96],
    ] as Array<[string, string, number]>,
    slugA,
    slugB,
    nameA,
    nameB,
    priceA: priceA ? `₩${priceA.toLocaleString('ko-KR')}` : '',
    priceB: priceB ? `₩${priceB.toLocaleString('ko-KR')}` : '',
    scoreA: top1?.score ?? 97,
    scoreB: top2?.score ?? 94,
    compareItems: slugA !== slugB ? `${slugA},${slugB}` : slugA,
  }
})

// Slide 3: Budget Explorer (1:1 visual parity with 예시_영상맞춤 #explore)
const budget = ref(140)
const budgetPct = computed(() => `${((budget.value - 20) / 330) * 100}%`)
const activePlanIdx = computed(() => (budget.value <= 60 ? 0 : budget.value <= 180 ? 1 : 2))

const BUDGET_REC = [
  { name: '오디오 · 워치 엔트리', pair: 'Buds3 ↔ XM5', sub: '실속형', compareItems: 'airpods-pro-2-usbc,galaxy-buds3-pro,sony-wf-1000xm5' },
  { name: '스마트폰 · 태블릿 주력', pair: '17 Pro Max ↔ S25U', sub: '주력형', compareItems: 'iphone-17-pro-max,galaxy-s25-ultra' },
  { name: '프로 노트북 워크스테이션', pair: 'MBP16 ↔ Book4U', sub: '풀스펙', compareItems: 'macbook-pro-16-m3-max,galaxy-book4-ultra' },
]
const currentRec = computed(() => BUDGET_REC[activePlanIdx.value] ?? BUDGET_REC[1]!)

const PLANS = [
  {
    name: '오디오 · 워치',
    price: '₩20~60만',
    cap: '실속 · 엔트리',
    features: ['AirPods Pro 2 ↔ Buds3 Pro', 'Sony WF-1000XM5 ↔ Bose', '다나와·쿠팡 최저가 연동'],
    cta: '실속형 비교',
    compareItems: 'airpods-pro-2-usbc,galaxy-buds3-pro,sony-wf-1000xm5',
  },
  {
    name: '스마트폰 · 태블릿',
    price: '₩70~180만',
    cap: '주력 플래그십',
    features: ['iPhone 17 Pro Max ↔ S25U', 'iPad Pro M4 ↔ Tab S10U', '12대 표준 스펙 우위 비교'],
    cta: '주력형 비교',
    compareItems: 'iphone-17-pro-max,galaxy-s25-ultra',
  },
  {
    name: '프로 노트북',
    price: '₩190~350만',
    cap: '워크스테이션',
    features: ['MacBook Pro M3 ↔ Book4U', 'LG gram Pro ↔ ThinkPad', '최대 4대 동시 매트릭스'],
    cta: '풀스펙 비교',
    compareItems: 'macbook-pro-16-m3-max,galaxy-book4-ultra',
  },
]

const matchingBudgetCount = computed(() => {
  if (!allProducts.value.length) return budget.value <= 60 ? 28 : budget.value <= 180 ? 74 : 99
  const maxWon = budget.value * 10000
  return allProducts.value.filter((p) => {
    const pr = p.currentLowestPriceKrw ?? p.launchPriceKrw ?? 0
    return pr > 0 && pr <= maxWon
  }).length
})

const scrollUv = computed(() => activeSlide.value / Math.max(1, SLIDES.length - 1))

function goSlide(idx: number) {
  const next = Math.max(0, Math.min(SLIDES.length - 1, idx))
  activeSlide.value = next
  if (!isSnapMode.value) {
    const el = document.getElementById(SLIDES[next]!.id)
    el?.scrollIntoView({ behavior: 'smooth' })
  }
}

function onWheel(e: WheelEvent) {
  if (!isSnapMode.value || e.ctrlKey || e.metaKey) return
  const t = e.target as HTMLElement | null
  if (t?.closest('input[type="range"]')) return
  e.preventDefault()
  const now = performance.now()
  if (now < lockUntil) {
    wheelAcc = 0
    return
  }
  wheelAcc += e.deltaY * (e.deltaMode === 1 ? 36 : 1)
  if (Math.abs(wheelAcc) >= 14) {
    const dir = wheelAcc > 0 ? 1 : -1
    wheelAcc = 0
    lockUntil = now + 480
    goSlide(activeSlide.value + dir)
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!isSnapMode.value) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault()
    goSlide(activeSlide.value + 1)
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault()
    goSlide(activeSlide.value - 1)
  } else if (e.key === 'Home') {
    e.preventDefault()
    goSlide(0)
  } else if (e.key === 'End') {
    e.preventDefault()
    goSlide(SLIDES.length - 1)
  }
}

function onResize() {
  isSnapMode.value = window.innerWidth > 900 && window.innerHeight >= 640
}

function openCompare(itemsCsv: string) {
  router.push({ name: 'compare', query: { items: itemsCsv } })
}

function submitQuickSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    router.push({ name: 'compare', query: { items: 'macbook-pro-16-m3-max,galaxy-book4-ultra' } })
    return
  }
  router.push({ name: 'catalog', query: { q } })
}

watch(
  activeSlide,
  (s) => {
    if (s === 1) mountTrophyStage.value = true
  },
  { immediate: true },
)

watch(
  isSnapMode,
  (snap) => {
    if (!snap) mountTrophyStage.value = true
    document.documentElement.classList.toggle('snap-lock', snap)
  },
  { immediate: true },
)

onMounted(async () => {
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  try {
    const res = await api.products({ sort: 'release_desc', limit: 100 })
    allProducts.value = res.data
  } catch {
    // Graceful fallback counts remain ready
  }
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('snap-lock')
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="yt-home" :class="{ 'snap-mode': isSnapMode }" @wheel="onWheel">
    <!-- Hidden SVG Sprites matching 예시_영상맞춤.html icons -->
    <svg width="0" height="0" style="position: absolute" aria-hidden="true">
      <symbol id="g" viewBox="0 0 24 24">
        <path
          d="M5 6l6 6-6 6M12 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          stroke-width="2.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </symbol>
      <symbol id="ico-phone" viewBox="0 0 24 24">
        <rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M10 5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="12" cy="18.5" r="1" fill="currentColor" />
      </symbol>
      <symbol id="ico-laptop" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M2 19h20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </symbol>
      <symbol id="ico-audio" viewBox="0 0 24 24">
        <path d="M4 13a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8" />
        <rect x="3" y="13" width="4" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
        <rect x="17" y="13" width="4" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
      </symbol>
      <symbol id="ico-tab" viewBox="0 0 24 24">
        <rect x="4" y="3" width="16" height="18" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
        <circle cx="12" cy="18" r=".9" fill="currentColor" />
      </symbol>
      <symbol id="ico-watch" viewBox="0 0 24 24">
        <rect x="7" y="6" width="10" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M9 6V3h6v3M9 18v3h6v-3" stroke="currentColor" stroke-width="1.6" />
      </symbol>
    </svg>

    <!-- Exact Aura WebGL Plasma Ribbon + Shimmer Particles -->
    <AuraRibbonBg :scroll-uv="scrollUv" :paused="false" />

    <!-- Right Pager Dots Pill -->
    <aside v-if="isSnapMode" id="pager" class="pager" aria-label="화면 이동">
      <button
        v-for="(s, idx) in SLIDES"
        :key="s.id"
        type="button"
        :class="{ on: activeSlide === idx }"
        :aria-label="s.label"
        :title="s.label"
        @click="goSlide(idx)"
      />
    </aside>

    <!-- Main Track -->
    <div
      class="main-track"
      :style="isSnapMode ? { transform: `translate3d(0, ${activeSlide * -100}vh, 0)` } : undefined"
    >
      <!-- =================================================================
           SLIDE 0: HERO + GLOBE (#how)
           ================================================================= -->
      <section id="how" class="slide hero" :class="{ active: activeSlide === 0, far: isSnapMode && Math.abs(activeSlide - 0) > 1 }">
        <div class="wrap">
          <div>
            <span class="tag"><i></i>5대 카테고리 · {{ totalCount }}개 공식 모델</span>
            <h1>
              기기 비교,<br />
              <em>한 화면에서 끝납니다.</em>
            </h1>
            <p class="sub">
              5대 카테고리 {{ totalCount }}종의 공식 사양과 4대 쇼핑몰 최저가를 한곳에 모았습니다.
            </p>
            <div class="ctas">
              <button type="button" class="btn btn-acc" @click="goSlide(3)">
                예산별 추천 보기
              </button>
              <RouterLink :to="{ name: 'catalog' }" class="btn btn-ghost">
                {{ totalCount }}종 둘러보기
              </RouterLink>
              <RouterLink :to="{ name: 'mypage' }" class="btn btn-ghost">
                마이페이지 ({{ savedStore.count }})
              </RouterLink>
            </div>
          </div>

          <HeroNeonGlobe :paused="isSnapMode ? activeSlide !== 0 : false" />
        </div>
      </section>

      <!-- =================================================================
           SLIDE 1: 3-PHONE STAGE + CATEGORY DB BREAKDOWN (#glue)
           ================================================================= -->
      <section id="glue" class="slide" :class="{ active: activeSlide === 1, far: isSnapMode && Math.abs(activeSlide - 1) > 1 }">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <span class="tag"><i></i>라인업 · DB 규모</span>
              <h2 class="h2">{{ totalCount }}개 공식 기종, 한눈에 비교.</h2>
            </div>
            <p class="lead">9개 브랜드 5대 카테고리 공식 라인업입니다.</p>
          </div>

          <div class="trophy-db-grid">
            <div id="trophyStage" class="glass trophy-panel">
              <div class="trophy-stage3d">
                <div class="trophy-podium-glow" />
                <HeroTrophyStage v-if="mountTrophyStage" :paused="isSnapMode ? activeSlide !== 1 : false" />
              </div>
              <div class="trophy-foot">
                <RouterLink :to="{ name: 'compare', query: { items: 'galaxy-s25-ultra,iphone-17-pro-max' } }">
                  Galaxy S25 Ultra · iPhone 17 Pro Max · iPhone 17 Pro →
                </RouterLink>
              </div>
            </div>

            <div id="dbPanel" class="glass db-panel">
              <div class="ph" style="margin-bottom: 6px">
                <b>카테고리별 DB 현황</b>
                <span class="chip">총 {{ totalCount }}종</span>
              </div>

              <div id="catRows" class="cat-rows">
                <div
                  v-for="(c, idx) in dbRows"
                  :key="c.slug"
                  class="crow"
                  :class="{ on: selectedCatIdx === idx }"
                  @click="selectedCatIdx = idx"
                  @dblclick="router.push({ name: 'catalog', query: { category: c.slug } })"
                >
                  <span class="clb">
                    <svg><use :href="c.ico" /></svg>
                    {{ c.lb }}
                  </span>
                  <div class="bar">
                    <i :style="{ width: c.barW }" />
                  </div>
                  <span class="cnt">{{ c.countLabel }}</span>
                </div>
              </div>

              <div class="db-detail">
                <span id="dbSample">
                  <b>대표:</b> {{ selectedDbCat.sampleText }}
                </span>
                <RouterLink
                  :to="{ name: 'catalog', query: { category: selectedDbCat.slug } }"
                  class="db-go-link"
                >
                  {{ selectedDbCat.lb }} 전체 →
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================
           SLIDE 2: AI NATURAL-LANGUAGE + OBJECTIVE RECOMMENDER (#alerts)
           ================================================================= -->
      <section id="alerts" class="slide feat" :class="{ active: activeSlide === 2, far: isSnapMode && Math.abs(activeSlide - 2) > 1 }">
        <div class="wrap">
          <div class="zrow rev in">
            <div class="zcopy">
              <span class="n">AI 가중치 추천</span>
              <h3>
                자연어나 조건만 주면<br />
                최적의 기기를 계산합니다.
              </h3>
              <p>
                대화형 질문 입력이나 객관식 우선순위를 고르면 가중치 알고리즘이 {{ totalCount }}종 공식 DB를 스캔해 최적 조합을 추천합니다.
              </p>
              <div class="ctas" style="margin-top: 22px">
                <button
                  type="button"
                  class="btn btn-acc btn-sm-h"
                  @click="openCompare(aiAnalysis.compareItems)"
                >
                  추천 조합 1:1 비교 →
                </button>
                <RouterLink :to="{ name: 'mypage' }" class="btn btn-ghost btn-sm-h">
                  내 찜 목록 ({{ savedStore.count }})
                </RouterLink>
              </div>
            </div>

            <div id="aiPanel" class="glass zpanel">
              <div class="ph">
                <b>AI 자연어 · 객관식 추천 엔진</b>
                <span class="chip">{{ aiAnalysis.detectedSummary }}</span>
              </div>

              <!-- Objective Quick Questions -->
              <div id="aiTabs" class="ai-tabs">
                <button
                  v-for="(c, i) in AI_PRESETS"
                  :key="c.label"
                  type="button"
                  class="ai-tab"
                  :class="{ on: activePresetIdx === i && aiPrompt === c.prompt }"
                  @click="applyAiPreset(i)"
                >
                  {{ c.label }}
                </button>
              </div>

              <!-- Natural Language Prompt Box -->
              <form class="ai-q ai-prompt-form" @submit.prevent="submitAiPrompt">
                <input
                  v-model="aiPrompt"
                  type="text"
                  class="ai-input"
                  placeholder="예: 150만원 이하 사진 잘 나오는 삼성 폰 추천해줘"
                  aria-label="AI 자연어 추천 조건 입력"
                />
                <button type="submit" class="ai-run-btn">분석</button>
              </form>

              <!-- Objective Weight Selector -->
              <div class="ai-weights" role="group" aria-label="알고리즘 우선 기준">
                <button
                  v-for="obj in AI_OBJECTIVE_LABELS"
                  :key="obj.id"
                  type="button"
                  class="ai-weight-pill"
                  :class="{ on: aiObjective === obj.id }"
                  @click="aiObjective = obj.id"
                >
                  {{ obj.label }}
                </button>
              </div>

              <!-- Live Computed Score Breakdown -->
              <div id="aiScores" class="ai-scores">
                <div v-for="[lb, sv, w] in aiAnalysis.rows" :key="lb" class="srow">
                  <span>{{ lb }}</span>
                  <div class="sbar"><i :style="{ width: w + '%' }" /></div>
                  <span class="sv">{{ sv }}</span>
                </div>
              </div>

              <!-- Live Algorithm Ranked Output -->
              <div id="aiVerdict" class="ai-verdict ai-verdict-grid">
                <RouterLink :to="{ name: 'product-detail', params: { slug: aiAnalysis.slugA } }" class="ai-pick">
                  <span class="ai-pick-tag tech-mono">1위 · {{ aiAnalysis.scoreA }}% 적합</span>
                  <strong>{{ aiAnalysis.nameA }}</strong>
                  <span v-if="aiAnalysis.priceA" class="ai-pick-price tech-mono">{{ aiAnalysis.priceA }}</span>
                </RouterLink>
                <RouterLink :to="{ name: 'product-detail', params: { slug: aiAnalysis.slugB } }" class="ai-pick">
                  <span class="ai-pick-tag tech-mono">2위 · {{ aiAnalysis.scoreB }}% 적합</span>
                  <strong>{{ aiAnalysis.nameB }}</strong>
                  <span v-if="aiAnalysis.priceB" class="ai-pick-price tech-mono">{{ aiAnalysis.priceB }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================
           SLIDE 3: BUDGET EXPLORER (#explore)
           ================================================================= -->
      <section id="explore" class="slide" :class="{ active: activeSlide === 3, far: isSnapMode && Math.abs(activeSlide - 3) > 1 }">
        <div class="wrap">
          <div class="sec-head">
            <div>
              <span class="tag"><i></i>예산 추천</span>
              <h2 class="h2">예산에 맞춰 고르세요.</h2>
            </div>
            <p class="lead">예산 구간별 대표 비교 조합을 바로 확인합니다 (선택 가능 {{ matchingBudgetCount }}종).</p>
          </div>

          <div class="glass calc">
            <div>
              <span class="cap" style="font-size: 14px">예산 설정</span>
              <div class="q">기기 예산 범위</div>
              <input
                v-model.number="budget"
                type="range"
                name="budget"
                min="20"
                max="350"
                step="10"
                aria-label="예산 범위 선택"
                :style="{ '--p': budgetPct }"
              />
              <div class="ticks">
                <span>₩20만</span>
                <b>₩{{ budget }}만 이하 ({{ matchingBudgetCount }}종)</b>
                <span>₩350만</span>
              </div>
            </div>

            <div class="rec-box">
              <span class="cap">추천 매치업</span>
              <div class="pl">{{ currentRec.name }}</div>
              <div class="pr">
                <span>{{ currentRec.pair }}</span>
                <small>{{ currentRec.sub }}</small>
              </div>
              <button
                type="button"
                class="btn btn-acc"
                @click="openCompare(currentRec.compareItems)"
              >
                1:1 비교하기
              </button>
            </div>
          </div>

          <div class="plans">
            <div
              v-for="(plan, idx) in PLANS"
              :key="plan.name"
              class="glass plan"
              :class="{ rec: activePlanIdx === idx }"
            >
              <div class="nm">
                {{ plan.name }}
                <span class="badge">예산 맞춤</span>
              </div>
              <div class="pp">{{ plan.price }}</div>
              <span class="cap">{{ plan.cap }}</span>
              <ul>
                <li v-for="feat in plan.features" :key="feat">{{ feat }}</li>
              </ul>
              <button
                type="button"
                class="btn btn-ghost"
                @click="openCompare(plan.compareItems)"
              >
                {{ plan.cta }} →
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- =================================================================
           SLIDE 4: QUICK COMPARE + MYPAGE CONNECT + FOOTER (#foot)
           ================================================================= -->
      <section id="foot" class="slide" :class="{ active: activeSlide === 4, far: isSnapMode && Math.abs(activeSlide - 4) > 1 }">
        <div class="wrap">
          <div class="foot-cards">
            <div class="glass fl">
              <RouterLink :to="{ name: 'home' }" class="brand">
                <span class="logo"><svg><use href="#g" /></svg></span>
                TechCompare
              </RouterLink>
              <svg class="chev" viewBox="0 0 24 24"><use href="#g" /></svg>
              <h5>
                9개 브랜드 {{ totalCount }}종 IT 기기를 공식 스펙으로 비교하고 마이페이지에서 최저가를 관리합니다.
              </h5>
              <div class="row">
                <RouterLink :to="{ name: 'mypage' }" class="btn btn-acc btn-sm">
                  마이페이지 대시보드 ({{ savedStore.count }}) →
                </RouterLink>
                <div class="socials">
                  <span>VUE3</span>
                  <span>3D</span>
                  <span>ZOD</span>
                  <span>DB99</span>
                </div>
              </div>
            </div>

            <div class="fr">
              <div>
                <span class="cap">빠른 검색 · 1:1 비교</span>
                <h5>
                  두 모델을 나란히<br />
                  바로 비교하세요.
                </h5>
              </div>
              <div>
                <form @submit.prevent="submitQuickSearch">
                  <input
                    v-model="searchQuery"
                    name="q"
                    placeholder="모델명·키워드 검색 (예: MacBook Pro, Galaxy S25 Ultra)"
                    aria-label="모델명 검색"
                  />
                  <button type="submit" class="btn">
                    {{ searchQuery.trim() ? '검색 보기 →' : '비교 보기 →' }}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="tele">
            <span><i></i>5대 카테고리 · 9개 브랜드 ({{ totalCount }}종)</span>
            <span><i></i>1,093개 공식 사양 · 12대 표준 항목</span>
            <span><i></i>다나와 · 네이버 · 쿠팡 · 공식몰 · 마이페이지 ({{ compareStore.count }}개 담김)</span>
          </div>

          <div class="sitemap">
            <div class="sm-brand">
              <RouterLink :to="{ name: 'home' }" class="brand">
                <span class="logo"><svg><use href="#g" /></svg></span>
                TechCompare
              </RouterLink>
              <p>5대 카테고리 9개 브랜드 {{ totalCount }}종을 공식 스펙과 최저가로 비교합니다.</p>
            </div>

            <div class="sm-col">
              <b>섹션</b>
              <a href="#how" @click.prevent="goSlide(0)">개요</a>
              <a href="#glue" @click.prevent="goSlide(1)">라인업 · DB</a>
              <a href="#alerts" @click.prevent="goSlide(2)">맞춤 추천</a>
              <a href="#explore" @click.prevent="goSlide(3)">예산 추천</a>
            </div>

            <div class="sm-col">
              <b>카탈로그</b>
              <RouterLink :to="{ name: 'catalog', query: { category: 'smartphone' } }">스마트폰 30종</RouterLink>
              <RouterLink :to="{ name: 'catalog', query: { category: 'laptop' } }">노트북 20종</RouterLink>
              <RouterLink :to="{ name: 'catalog', query: { category: 'audio' } }">오디오 20종</RouterLink>
              <RouterLink :to="{ name: 'catalog', query: { category: 'tablet' } }">태블릿 · 워치</RouterLink>
            </div>

            <div class="sm-col">
              <b>개인화</b>
              <RouterLink :to="{ name: 'mypage' }">마이페이지 대시보드</RouterLink>
              <RouterLink :to="{ name: 'mypage', query: { tab: 'finance' } }">최저가 워치표</RouterLink>
              <RouterLink :to="{ name: 'mypage', query: { tab: 'saved' } }">관심 기종 ({{ savedStore.count }})</RouterLink>
              <RouterLink :to="{ name: 'compare' }">1:1 스펙 비교</RouterLink>
            </div>

            <div class="sm-col">
              <b>시스템</b>
              <RouterLink :to="{ name: 'admin' }">관리자 검수</RouterLink>
              <RouterLink :to="{ name: 'catalog' }">전체 검색</RouterLink>
              <a href="#how" @click.prevent="goSlide(0)">맨 위로</a>
            </div>
          </div>

          <div class="foot-bot">
            <span class="cap">2026 TechCompare · Vue 3 + Three.js + Express + Zod</span>
            <span class="cap">Seoul</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.yt-home {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
  letter-spacing: -0.015em;
}

.yt-home.snap-mode {
  height: 100vh;
  overflow: hidden;
}

.main-track {
  position: relative;
  z-index: 2;
  will-change: transform;
  transition: transform 0.76s var(--ease);
}

.wrap {
  max-width: min(1380px, 93vw);
  width: 100%;
  margin: 0 auto;
  padding: 0 clamp(20px, 2.6vw, 42px);
}

.slide {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: clamp(68px, 7.5vh, 86px) 0 clamp(16px, 2.4vh, 28px);
  position: relative;
}

.slide.far {
  visibility: hidden;
  pointer-events: none;
}

.pager {
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 45;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 9px 6px;
  border-radius: 99px;
  background: var(--chip);
  border: 1px solid var(--line);
}

.pager button {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  border: 0;
  background: var(--fill2);
  cursor: pointer;
  padding: 0;
  transition:
    height 0.35s var(--ease),
    background 0.3s;
}

.pager button.on {
  height: 22px;
  background: var(--acc);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: 600 13.5px var(--font-sans);
  color: var(--text2);
  padding: 6px 14px;
  border: 1px solid var(--line2);
  border-radius: 8px;
  background: var(--chip);
}

.tag i {
  width: 6px;
  height: 6px;
  background: var(--acc);
  border-radius: 1px;
  flex-shrink: 0;
}

em {
  font-family: var(--font-sans);
  font-style: normal;
  font-weight: 800;
  color: var(--acc2);
  letter-spacing: -0.04em;
}

.h2 {
  font-size: clamp(34px, 4vw, 56px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--text);
}

.lead {
  color: var(--mute);
  font-size: clamp(16px, 1.3vw, 18.5px);
  line-height: 1.6;
  max-width: 460px;
}

.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 36px;
  margin-bottom: clamp(16px, 2.4vh, 28px);
}

.sec-head .tag {
  margin-bottom: clamp(10px, 1.4vh, 14px);
}

.glass {
  background: var(--glass);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  contain: layout style;
  transition:
    border-color 0.3s,
    background 0.35s;
}

.cap {
  font: 500 13px var(--font-sans);
  color: var(--dim);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 26px;
  border-radius: 99px;
  font: 600 15px var(--font-sans);
  border: 0;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  transition:
    transform 0.24s var(--ease),
    background 0.24s,
    box-shadow 0.24s;
}

.btn-acc {
  background: var(--acc);
  color: #ffffff;
}

.btn-acc:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -6px var(--a40);
}

.btn-ghost {
  background: var(--fill);
  color: var(--text);
  border: 1px solid var(--line2);
}

.btn-ghost:hover {
  background: var(--fill2);
  transform: translateY(-2px);
}

.btn-sm {
  height: 36px;
  padding: 0 18px;
  font-size: 13.5px;
}

.btn-sm-h {
  height: 42px;
  padding: 0 20px;
  font-size: 14px;
}

/* Text legibility shadow on radial ribbons matching 예시_영상맞춤.html */
:root[data-theme='dark'] .lead,
:root[data-theme='dark'] .hero p.sub,
:root[data-theme='dark'] .zcopy p,
:root[data-theme='dark'] .sitemap a,
:root[data-theme='dark'] .tele {
  text-shadow:
    0 2px 18px rgba(2, 5, 12, 0.98),
    0 0 8px rgba(2, 5, 12, 0.92);
}

:root[data-theme='white'] .lead,
:root[data-theme='white'] .hero p.sub,
:root[data-theme='white'] .zcopy p,
:root[data-theme='white'] .sitemap a,
:root[data-theme='white'] .tele {
  text-shadow:
    0 1px 12px rgba(255, 255, 255, 0.98),
    0 0 6px rgba(237, 242, 249, 0.95);
}

/* Slide 0 Hero */
.hero .wrap {
  display: grid;
  grid-template-columns: 0.92fr 1.18fr;
  gap: clamp(28px, 3.6vw, 56px);
  align-items: center;
}

.hero h1 {
  font-size: clamp(36px, 4.1vw, 56px);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.14;
  margin: 18px 0 18px;
}

.hero h1 em {
  font-size: 1em;
  color: var(--acc2);
}

.hero p.sub {
  color: var(--mute);
  font-size: clamp(16.5px, 1.35vw, 19.5px);
  line-height: 1.65;
  max-width: 480px;
}

.hero .ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 28px 0 0;
}

/* Slide 1 Lineup + 3D Phones + DB */
.trophy-db-grid {
  display: grid;
  grid-template-columns: 1.12fr 0.98fr;
  gap: clamp(16px, 2.2vw, 28px);
  align-items: stretch;
}

.trophy-panel {
  position: relative;
  height: clamp(360px, 49vh, 470px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: var(--glass-s);
}

.trophy-stage3d {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.trophy-podium-glow {
  position: absolute;
  bottom: 10px;
  width: 82%;
  height: 74px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 150, 255, 0.46) 0%,
    rgba(0, 150, 255, 0.14) 44%,
    rgba(0, 150, 255, 0) 76%
  );
  transform: rotateX(76deg);
  pointer-events: none;
}

:root[data-theme='white'] .trophy-podium-glow {
  background: radial-gradient(ellipse at center, rgba(0, 114, 229, 0.28) 0%, rgba(56, 189, 248, 0.12) 52%, transparent 78%);
}

.trophy-foot {
  display: flex;
  justify-content: center;
  font: 700 14.5px var(--font-sans);
  color: var(--text);
  position: relative;
  z-index: 6;
  padding-top: 4px;
}

.trophy-foot a:hover {
  color: var(--acc2);
}

.db-panel {
  height: clamp(360px, 49vh, 470px);
  padding: clamp(18px, 2.2vw, 26px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ph {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.ph b {
  font: 700 17px var(--font-sans);
}

.chip {
  font: 600 13px var(--font-sans);
  color: var(--acc2);
  border: 1px solid var(--a25);
  background: var(--a08);
  padding: 5px 11px;
  border-radius: 7px;
  white-space: nowrap;
}

.cat-rows {
  display: grid;
  gap: clamp(7px, 1vh, 11px);
}

.crow {
  display: grid;
  grid-template-columns: 126px 1fr 56px;
  gap: 12px;
  align-items: center;
  padding: clamp(7px, 1vh, 10px) 12px;
  border-radius: 11px;
  border: 1px solid transparent;
  background: var(--fill);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.crow.on,
.crow:hover {
  border-color: var(--a40);
  background: var(--a08);
}

.crow .clb {
  font: 700 15.5px var(--font-sans);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 9px;
}

.crow .clb svg {
  width: 17px;
  height: 17px;
  color: var(--acc2);
  flex-shrink: 0;
}

.crow .cnt {
  text-align: right;
  font: 700 15.5px var(--font-mono);
  color: var(--acc2);
}

.crow .bar {
  height: 8px;
  border-radius: 99px;
  background: var(--fill2);
  overflow: hidden;
}

.crow .bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--acc-d), var(--acc2));
  transition: width 0.7s var(--ease);
}

.db-detail {
  font: 600 14.5px var(--font-sans);
  color: var(--text2);
  padding-top: 11px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.db-detail b {
  color: var(--text);
  font-weight: 700;
}

.db-go-link {
  font: 700 13px var(--font-sans);
  color: var(--acc2);
  white-space: nowrap;
}

/* Slide 2 Merged Condition Recommender */
.zrow {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: clamp(28px, 3.6vw, 56px);
  align-items: center;
}

.zrow.rev {
  grid-template-columns: 1.25fr 0.85fr;
}

.zrow.rev .zcopy {
  order: 2;
}

.zrow.rev .zpanel {
  order: 1;
}

.zcopy .n {
  font: 600 13.5px var(--font-mono);
  color: var(--acc2);
  margin-bottom: 12px;
  display: block;
}

.zcopy h3 {
  font-size: clamp(32px, 3.7vw, 50px);
  letter-spacing: -0.04em;
  line-height: 1.14;
  margin-bottom: 14px;
}

.zcopy p {
  color: var(--mute);
  font-size: clamp(16px, 1.25vw, 18px);
  line-height: 1.65;
  max-width: 440px;
}

.zpanel {
  padding: clamp(22px, 2.4vw, 30px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ai-tabs {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.ai-tab {
  padding: 7px 14px;
  border-radius: 99px;
  border: 1px solid var(--line2);
  background: var(--fill);
  color: var(--mute);
  font: 600 13.5px var(--font-sans);
  cursor: pointer;
  transition: 0.2s;
}

.ai-tab.on {
  background: var(--acc);
  color: #fff;
  border-color: var(--acc);
}

.ai-q {
  padding: 8px 10px 8px 14px;
  border-radius: 12px;
  background: var(--fill);
  border: 1px solid var(--line2);
  margin-bottom: 11px;
}

.ai-prompt-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  font: 600 14px var(--font-sans);
  color: var(--text);
}

.ai-input::placeholder {
  color: var(--dim);
}

.ai-run-btn {
  border: 0;
  border-radius: 8px;
  background: var(--acc);
  color: #fff;
  padding: 6px 13px;
  font: 700 12.5px var(--font-sans);
  cursor: pointer;
  white-space: nowrap;
}

.ai-weights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 13px;
}

.ai-weight-pill {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--mute);
  padding: 4px 10px;
  border-radius: 7px;
  font: 600 12px var(--font-sans);
  cursor: pointer;
  transition: 0.18s;
}

.ai-weight-pill.on {
  border-color: var(--acc);
  background: var(--a15);
  color: var(--acc2);
}

.ai-verdict-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 10px;
}

.ai-pick {
  display: grid;
  gap: 3px;
  padding: 9px 12px;
  border-radius: 9px;
  background: var(--chip);
  border: 1px solid var(--line);
  text-decoration: none;
  color: var(--text);
  transition: border-color 0.2s;
}

.ai-pick:hover {
  border-color: var(--acc);
}

.ai-pick-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--acc2);
}

.ai-pick strong {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-pick-price {
  font-size: 12px;
  color: var(--mute);
}

.ai-scores {
  display: grid;
  gap: 11px;
  margin-bottom: 14px;
}

.srow {
  display: grid;
  grid-template-columns: 126px 1fr 98px;
  gap: 12px;
  align-items: center;
  font: 600 14px var(--font-sans);
  color: var(--text2);
}

.srow .sbar {
  height: 8px;
  border-radius: 99px;
  background: var(--fill2);
  overflow: hidden;
}

.srow .sbar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--acc-d), var(--acc2));
  transition: width 0.7s var(--ease);
}

.srow .sv {
  text-align: right;
  font: 700 13.5px var(--font-mono);
  color: var(--acc2);
}

.ai-verdict {
  padding: 13px 16px;
  border-radius: 11px;
  background: var(--a08);
  border: 1px solid var(--a25);
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--text);
  font-weight: 500;
}

.ai-verdict b {
  color: var(--acc2);
}

/* Slide 3 Budget Explorer */
.calc {
  display: grid;
  grid-template-columns: 1fr 290px;
  gap: 36px;
  padding: clamp(18px, 2vh, 26px) 28px;
  align-items: center;
}

.calc .q {
  font-size: clamp(18px, 1.45vw, 21px);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 6px 0 16px;
}

.calc input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 7px;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(90deg, var(--acc) 0 var(--p, 36%), var(--fill2) var(--p, 36%) 100%);
}

.calc input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--acc);
  border: 3px solid var(--bg);
  box-shadow: 0 0 0 1px var(--acc);
}

.ticks {
  display: flex;
  justify-content: space-between;
  font: 600 13.5px var(--font-mono);
  color: var(--dim);
  margin-top: 10px;
}

.ticks b {
  color: var(--text);
  font-weight: 700;
}

.rec-box .cap {
  display: block;
}

.rec-box .pl {
  font: 700 15.5px var(--font-sans);
  margin: 6px 0 2px;
}

.rec-box .pr {
  font: 700 clamp(22px, 2.4vh, 28px) var(--font-mono);
  letter-spacing: -0.04em;
}

.rec-box .pr small {
  font: 500 13.5px var(--font-sans);
  color: var(--mute);
  margin-left: 8px;
}

.rec-box .btn {
  width: 100%;
  margin-top: 12px;
  height: 44px;
  border-radius: 12px;
  font-size: 14.5px;
}

.plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: clamp(12px, 1.5vh, 18px);
}

.plan {
  padding: clamp(18px, 2.2vh, 26px) clamp(20px, 2.1vw, 28px);
  display: flex;
  flex-direction: column;
  transition:
    transform 0.4s var(--ease),
    border-color 0.3s;
}

.plan:hover {
  transform: translateY(-4px);
}

.plan .nm {
  font: 600 15px var(--font-sans);
  color: var(--text2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan .pp {
  font: 700 clamp(26px, 3vh, 32px) var(--font-mono);
  letter-spacing: -0.05em;
  margin: 8px 0 4px;
}

.plan ul {
  list-style: none;
  margin: clamp(10px, 1.5vh, 16px) 0 clamp(14px, 1.9vh, 20px);
  display: grid;
  gap: 9px;
  font-size: clamp(14px, 1.1vw, 15px);
  color: var(--mute);
  font-weight: 500;
}

.plan li::before {
  content: '✓';
  color: var(--acc2);
  margin-right: 10px;
  font-weight: 700;
}

.plan .btn {
  margin-top: auto;
  border-radius: 12px;
  height: 44px;
  font-size: 14.5px;
}

.plan.rec {
  border-color: var(--a60);
  transform: translateY(-5px);
}

.badge {
  font: 700 12px var(--font-sans);
  background: var(--acc);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  opacity: 0;
  transform: scale(0.85);
  transition: 0.25s var(--ease);
}

.plan.rec .badge {
  opacity: 1;
  transform: none;
}

.plan.rec .btn-ghost {
  background: var(--acc);
  color: #fff;
  border-color: transparent;
}

/* Slide 4 Footer Cards + Blue CTA + Sitemap */
.foot-cards {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 18px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 16.5px;
  color: var(--text);
}

.logo {
  width: 29px;
  height: 29px;
  border-radius: 8px;
  background: var(--acc);
  color: #fff;
  display: grid;
  place-items: center;
}

.logo svg {
  width: 16px;
  height: 16px;
}

.fl {
  padding: clamp(22px, 2.4vh, 30px);
  position: relative;
  overflow: hidden;
  min-height: clamp(200px, 25vh, 270px);
  display: flex;
  flex-direction: column;
}

.fl .chev {
  position: absolute;
  right: 26px;
  top: 30px;
  width: 160px;
  opacity: 0.07;
  color: var(--text);
}

.fl h5 {
  font-size: clamp(20px, 1.7vw, 24px);
  letter-spacing: -0.04em;
  line-height: 1.25;
  margin-top: auto;
  max-width: 400px;
}

.fl .row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.fl .socials {
  display: flex;
  gap: 7px;
}

.fl .socials span {
  width: 48px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--line2);
  display: grid;
  place-items: center;
  font: 600 12px var(--font-mono);
  color: var(--text2);
}

.fr {
  background: var(--acc);
  border-radius: 18px;
  padding: clamp(24px, 2.6vh, 32px);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.fr .cap {
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
}

.fr h5 {
  font-size: clamp(26px, 2.8vw, 40px);
  letter-spacing: -0.04em;
  line-height: 1.1;
  font-weight: 700;
  margin-top: 6px;
}

.fr form {
  display: flex;
  gap: 8px;
  background: #fff;
  border: 0;
  border-radius: 12px;
  padding: 5px;
  margin-top: 20px;
}

.fr input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: #0f172a;
  font: 500 14.5px var(--font-sans);
  padding: 0 14px;
}

.fr input::placeholder {
  color: #64748b;
}

.fr form .btn {
  border-radius: 9px;
  background: var(--badge-dark);
  color: #fff;
  height: 42px;
  font-size: 14px;
}

.tele {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: clamp(14px, 1.9vh, 18px) 0;
  margin-top: clamp(18px, 2.5vh, 28px);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  font: 500 13.5px var(--font-sans);
  color: var(--mute);
}

.tele span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tele i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--acc);
}

.sitemap {
  display: grid;
  grid-template-columns: 1.5fr repeat(4, 1fr);
  gap: 28px;
  padding: clamp(18px, 2.5vh, 28px) 0 clamp(14px, 2vh, 22px);
}

.sm-brand p {
  font-size: 14.5px;
  color: var(--mute);
  line-height: 1.6;
  margin: 10px 0;
  max-width: 290px;
}

.sm-col b {
  display: block;
  font: 600 13.5px var(--font-mono);
  color: var(--mute);
  margin-bottom: 10px;
  text-transform: lowercase;
}

.sm-col a {
  display: block;
  font-size: 14.5px;
  color: var(--text2);
  padding: 4px 0;
  transition: color 0.2s;
}

.sm-col a:hover {
  color: var(--acc2);
}

.foot-bot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

@media (max-width: 900px) {
  .wrap {
    padding: 0 20px;
  }

  .pager {
    display: none;
  }

  .slide {
    min-height: auto;
    padding: 86px 0 42px;
  }

  .hero .wrap,
  .trophy-db-grid,
  .zrow,
  .plans,
  .calc,
  .foot-cards,
  .sitemap {
    grid-template-columns: 1fr;
  }

  .zrow.rev .zcopy,
  .zrow.rev .zpanel {
    order: unset;
  }

  .sec-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .srow {
    grid-template-columns: 95px 1fr 78px;
  }
}

@media (max-width: 560px) {
  .ai-verdict-grid {
    grid-template-columns: 1fr;
  }
}
</style>
