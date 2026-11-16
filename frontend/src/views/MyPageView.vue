<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  CheckCheck,
  ExternalLink,
  Headphones,
  Laptop,
  LayoutDashboard,
  Scale,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  TrendingDown,
  Watch,
} from 'lucide-vue-next'
import { api, ApiClientError } from '@/services/api'
import type { BrandSlug, CategorySlug, ProductSummaryRecord } from '@/types/api'
import { useSavedStore } from '@/stores/saved'
import { useCompareStore } from '@/stores/compare'
import { buildShoppingMallLinks } from '@/utils/shopping'

type TabKey = 'overview' | 'finance' | 'saved' | 'alerts'

const route = useRoute()
const router = useRouter()
const savedStore = useSavedStore()
const compareStore = useCompareStore()

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: '통합 대시보드' },
  { key: 'finance', label: '가격 워치 · 쇼핑몰' },
  { key: 'saved', label: '관심 기종' },
  { key: 'alerts', label: '가격·DB 알림' },
]

function normalizeTab(raw: unknown): TabKey {
  if (raw === 'finance' || raw === 'saved' || raw === 'alerts') return raw
  return 'overview'
}

const activeTab = ref<TabKey>(normalizeTab(route.query.tab))
const tabEls = ref<Record<string, HTMLElement>>({})
const indicatorStyle = ref<{ left: string; width: string }>({ left: '0px', width: '100px' })

const allProducts = ref<ProductSummaryRecord[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

// Chart Range State
type RangeKey = '7d' | '30d' | '90d'
const chartRange = ref<RangeKey>('30d')
const hoverIdx = ref<number | null>(null)

// Saved Tab Filter State
const savedQuery = ref('')
const savedBrand = ref<string>('all')
const savedCat = ref<string>('all')

// Alerts State
interface AlertItem {
  id: string
  type: 'price' | 'db' | 'compare'
  title: string
  body: string
  time: string
  unread: boolean
  to?: string
}

const alerts = ref<AlertItem[]>([
  {
    id: 'al-1',
    type: 'price',
    title: 'Galaxy S25 Ultra 최저가 인하 감지',
    body: '공식 출고가 대비 약 11% 낮은 오픈마켓 최저가가 포착되었습니다. 다나와·쿠팡에서 즉시 비교하세요.',
    time: '18분 전',
    unread: true,
    to: '/products/galaxy-s25-ultra',
  },
  {
    id: 'al-2',
    type: 'compare',
    title: 'iPhone 17 Pro Max ↔ Galaxy S25 Ultra 스펙 동기화',
    body: '12대 표준 항목(프로세서·메모리·카메라·무게·출고가) 비교 매트릭스가 최신 데이터로 검증되었습니다.',
    time: '2시간 전',
    unread: true,
    to: '/compare?items=iphone-17-pro-max,galaxy-s25-ultra',
  },
  {
    id: 'al-3',
    type: 'db',
    title: '9개 브랜드 공식 카탈로그 무결성 체크 완료',
    body: '스마트폰·노트북·오디오·태블릿·스마트워치 전체 기종의 모델번호 및 쇼핑몰 검색 URL 점검이 완료되었습니다.',
    time: '오늘',
    unread: false,
    to: '/products',
  },
])
const onlyUnreadAlerts = ref(false)

function updateIndicator() {
  const el = tabEls.value[activeTab.value]
  if (!el) return
  indicatorStyle.value = {
    left: `${el.offsetLeft}px`,
    width: `${el.offsetWidth}px`,
  }
}

function setTab(t: TabKey) {
  activeTab.value = t
  router.replace({ name: 'mypage', query: t === 'overview' ? {} : { tab: t } })
  nextTick(updateIndicator)
}

watch(
  () => route.query.tab,
  (q) => {
    activeTab.value = normalizeTab(q)
    nextTick(updateIndicator)
  },
)

function setTabEl(key: TabKey, el: unknown) {
  if (el instanceof HTMLElement) {
    tabEls.value[key] = el
  }
}

function formatKrw(v: number | null | undefined): string {
  if (v === null || v === undefined || v <= 0) return '가격 문의'
  return `₩${v.toLocaleString('ko-KR')}`
}

function effectivePrice(p: ProductSummaryRecord): number {
  return p.currentLowestPriceKrw ?? p.launchPriceKrw ?? 0
}

function categoryIcon(slug: CategorySlug | string) {
  switch (slug) {
    case 'smartphone':
      return Smartphone
    case 'laptop':
      return Laptop
    case 'tablet':
      return Tablet
    case 'smartwatch':
      return Watch
    default:
      return Headphones
  }
}

// Saved product records matched against API catalog
const savedProducts = computed(() => {
  const map = new Map(allProducts.value.map((p) => [p.slug, p]))
  return savedStore.savedSlugs
    .map((s) => map.get(s))
    .filter((p): p is ProductSummaryRecord => Boolean(p))
})

const financeRows = computed(() => {
  const base = savedProducts.value.length ? savedProducts.value : allProducts.value.slice(0, 8)
  return base.slice(0, 10).map((p) => {
    const launch = p.launchPriceKrw
    const lowest = p.currentLowestPriceKrw
    const discountPct =
      launch !== null && lowest !== null && lowest < launch
        ? Math.round(((launch - lowest) / launch) * 100)
        : 0
    const malls = buildShoppingMallLinks({
      name: p.name,
      brandSlug: (p.brand.slug as BrandSlug) || 'apple',
      baseModelNumber: p.baseModelNumber,
      officialUrl: p.brand.officialWebsite,
    })
    return {
      product: p,
      launch,
      lowest,
      discountPct,
      malls,
    }
  })
})

const totalEstimatedSavings = computed(() => {
  return financeRows.value.reduce((acc, r) => {
    if (r.launch === null || r.lowest === null) return acc
    return acc + Math.max(0, r.launch - r.lowest)
  }, 0)
})

const savedBrands = computed(() => {
  const seen = new Map<string, string>()
  savedProducts.value.forEach((p) => seen.set(p.brand.slug, p.brand.name))
  return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }))
})

const filteredSaved = computed(() => {
  const q = savedQuery.value.trim().toLowerCase()
  return savedProducts.value.filter((p) => {
    if (savedBrand.value !== 'all' && p.brand.slug !== savedBrand.value) return false
    if (savedCat.value !== 'all' && p.category.slug !== savedCat.value) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.name.toLowerCase().includes(q) ||
      (p.baseModelNumber ?? '').toLowerCase().includes(q)
    )
  })
})

// Chart series points for 7d / 30d / 90d
const chartSeries = computed(() => {
  const sets: Record<RangeKey, Array<{ label: string; a: number; b: number }>> = {
    '7d': [
      { label: 'D-6', a: 199, b: 158 },
      { label: 'D-5', a: 197, b: 157 },
      { label: 'D-4', a: 196, b: 155 },
      { label: 'D-3', a: 195, b: 154 },
      { label: 'D-2', a: 193, b: 153 },
      { label: '어제', a: 192, b: 151 },
      { label: '오늘', a: 191, b: 150 },
    ],
    '30d': [
      { label: '4주전', a: 199, b: 170 },
      { label: '3주전', a: 198, b: 166 },
      { label: '2주전', a: 196, b: 161 },
      { label: '10일전', a: 195, b: 158 },
      { label: '5일전', a: 193, b: 155 },
      { label: '2일전', a: 192, b: 152 },
      { label: '오늘', a: 191, b: 150 },
    ],
    '90d': [
      { label: '3개월전', a: 199, b: 170 },
      { label: '2개월전', a: 199, b: 168 },
      { label: '6주전', a: 197, b: 164 },
      { label: '4주전', a: 196, b: 160 },
      { label: '2주전', a: 194, b: 156 },
      { label: '1주전', a: 192, b: 152 },
      { label: '오늘', a: 191, b: 150 },
    ],
  }
  return sets[chartRange.value]
})

const chartCoords = computed(() => {
  const pts = chartSeries.value
  const W = 620
  const H = 200
  const padX = 28
  const padY = 22
  const minVal = 140
  const maxVal = 205

  const mapPt = (val: number, idx: number) => {
    const x = padX + (idx / Math.max(1, pts.length - 1)) * (W - padX * 2)
    const y = H - padY - ((val - minVal) / (maxVal - minVal)) * (H - padY * 2)
    return { x: Math.round(x), y: Math.round(y) }
  }

  const ptsA = pts.map((p, i) => mapPt(p.a, i))
  const ptsB = pts.map((p, i) => mapPt(p.b, i))
  const lineA = ptsA.map((p) => `${p.x},${p.y}`).join(' ')
  const lineB = ptsB.map((p) => `${p.x},${p.y}`).join(' ')
  const areaA = `${ptsA[0]?.x ?? 0},${H - padY} ${lineA} ${ptsA[ptsA.length - 1]?.x ?? W},${H - padY}`
  return { W, H, ptsA, ptsB, lineA, lineB, areaA, raw: pts }
})

const categorySpread = computed(() => {
  const cats: Array<{ slug: CategorySlug; label: string }> = [
    { slug: 'smartphone', label: '스마트폰' },
    { slug: 'laptop', label: '노트북' },
    { slug: 'tablet', label: '태블릿' },
    { slug: 'audio', label: '오디오' },
    { slug: 'smartwatch', label: '스마트워치' },
  ]
  return cats.map((c) => {
    const list = allProducts.value.filter((p) => p.category.slug === c.slug)
    const avg = list.length
      ? Math.round(list.reduce((s, p) => s + effectivePrice(p), 0) / list.length / 10000)
      : 100
    const pct = Math.max(22, Math.min(100, Math.round((avg / 220) * 100)))
    return { ...c, count: list.length, avgMan: avg, pct }
  })
})

const visibleAlerts = computed(() =>
  onlyUnreadAlerts.value ? alerts.value.filter((a) => a.unread) : alerts.value,
)
const unreadAlertCount = computed(() => alerts.value.filter((a) => a.unread).length)

function markAllAlertsRead() {
  alerts.value = alerts.value.map((a) => ({ ...a, unread: false }))
}

function toggleCompare(p: ProductSummaryRecord) {
  if (compareStore.has(p.slug)) compareStore.remove(p.slug)
  else
    compareStore.add({
      productSlug: p.slug,
      variantId: p.defaultVariantId,
      name: p.name,
      category: p.category.slug,
    })
}

onMounted(async () => {
  nextTick(updateIndicator)
  loading.value = true
  try {
    const res = await api.products({ sort: 'release_desc', limit: 100 })
    allProducts.value = res.data
  } catch (e) {
    loadError.value = e instanceof ApiClientError ? e.message : '데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
    nextTick(updateIndicator)
  }
})
</script>

<template>
  <section class="mypage-shell" aria-label="마이페이지 대시보드">
    <div class="mypage-container">
      <!-- Top Workspace Header -->
      <header class="mp-header glass-card">
        <div class="mp-title-block">
          <div class="mp-eyebrow">
            <LayoutDashboard :size="14" />
            <span>MYPAGE WORKSPACE · REALTIME SYNC</span>
          </div>
          <h1 class="mp-title">내 IT 기기 대시보드</h1>
          <p class="mp-sub">
            관심 기종 시세 추적, 4대 쇼핑몰 최저가 바로가기 및 1:1 비교함을 한 화면에서 관리합니다.
          </p>
        </div>

        <div class="mp-quick-stats">
          <div class="mp-stat-pill">
            <span>관심 기종</span>
            <strong class="tech-mono">{{ savedStore.count }}종</strong>
          </div>
          <div class="mp-stat-pill">
            <span>비교함</span>
            <strong class="tech-mono">{{ compareStore.count }} / 4</strong>
          </div>
          <RouterLink
            v-if="compareStore.canCompare"
            :to="{ name: 'compare', query: { items: compareStore.toQueryParam() } }"
            class="btn btn--primary mp-go-cmp"
          >
            <Scale :size="15" />
            <span>선택 기기 비교 열기</span>
          </RouterLink>
          <RouterLink v-else :to="{ name: 'catalog' }" class="btn btn--secondary mp-go-cmp">
            <span>+ 기종 추가하기</span>
          </RouterLink>
        </div>
      </header>

      <!-- Sliding 4-Tab Bar -->
      <nav class="tab-nav glass-card" aria-label="대시보드 탭">
        <div class="tab-track">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            :ref="(el) => setTabEl(tab.key, el)"
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="setTab(tab.key)"
          >
            <span>{{ tab.label }}</span>
            <span v-if="tab.key === 'saved'" class="tab-count tech-mono">{{ savedStore.count }}</span>
            <span v-else-if="tab.key === 'alerts' && unreadAlertCount > 0" class="tab-count tech-mono">{{ unreadAlertCount }}</span>
          </button>
          <span class="tab-indicator" :style="indicatorStyle" />
        </div>
      </nav>

      <!-- =================================================================
           TAB 1: OVERVIEW
           ================================================================= -->
      <div v-show="activeTab === 'overview'" class="tab-panel">
        <div class="kpi-grid">
          <article class="kpi-card glass-card">
            <span class="kpi-label">관심 기종</span>
            <strong class="kpi-val tech-mono">{{ savedStore.count }}종</strong>
            <span class="kpi-meta pos">로컬 워치리스트 실시간 동기화</span>
          </article>
          <article class="kpi-card glass-card">
            <span class="kpi-label">실거래가 대비 절감</span>
            <strong class="kpi-val tech-mono">{{
              totalEstimatedSavings > 0 ? formatKrw(totalEstimatedSavings) : '실시간 조회'
            }}</strong>
            <span class="kpi-meta pos">
              {{ totalEstimatedSavings > 0 ? '출고가 대비 관심 포트폴리오 합산' : '4대 쇼핑몰 공식 모델번호 연동' }}
            </span>
          </article>
          <article class="kpi-card glass-card">
            <span class="kpi-label">누적 1:1 비교 실행</span>
            <strong class="kpi-val tech-mono">{{ savedStore.compareCount }}회</strong>
            <span class="kpi-meta">표준 사양서 기반 매트릭스</span>
          </article>
          <article class="kpi-card glass-card">
            <span class="kpi-label">현재 비교 트레이</span>
            <strong class="kpi-val tech-mono">{{ compareStore.count }} / 4</strong>
            <span class="kpi-meta">
              <RouterLink :to="{ name: 'compare' }" class="inline-link">비교 화면으로 이동 →</RouterLink>
            </span>
          </article>
        </div>

        <div class="overview-split">
          <!-- Dual-Series SVG Price Chart -->
          <section class="panel glass-card">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">플래그십 시세 추적 차트 (만원)</h2>
                <p class="panel-sub">iPhone 17 Pro Max vs Galaxy S25 Ultra 최저가 인덱스</p>
              </div>
              <div class="range-pills">
                <button
                  v-for="r in ['7d', '30d', '90d']"
                  :key="r"
                  type="button"
                  class="range-btn tech-mono"
                  :class="{ active: chartRange === r }"
                  @click="chartRange = r as RangeKey"
                >
                  {{ r.toUpperCase() }}
                </button>
              </div>
            </div>

            <div class="chart-legend">
              <span><i class="dot dot--blue" /> iPhone 17 Pro Max (199→191만)</span>
              <span><i class="dot dot--green" /> Galaxy S25 Ultra (170→150만)</span>
            </div>

            <div class="svg-wrap">
              <svg :viewBox="`0 0 ${chartCoords.W} ${chartCoords.H}`" class="price-svg" role="img" aria-label="플래그십 가격 변동 차트">
                <defs>
                  <linearGradient id="areaGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0096ff" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="#0096ff" stop-opacity="0.0" />
                  </linearGradient>
                </defs>
                <!-- Grid horizontal guides -->
                <line v-for="y in [36, 86, 136, 178]" :key="y" x1="28" :x2="chartCoords.W - 28" :y1="y" :y2="y" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="4 4" />
                <polygon :points="chartCoords.areaA" fill="url(#areaGradA)" />
                <polyline :points="chartCoords.lineA" fill="none" stroke="#0096ff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
                <polyline :points="chartCoords.lineB" fill="none" stroke="#10b981" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />

                <g v-for="(pt, idx) in chartCoords.ptsA" :key="'pt-' + idx">
                  <circle
                    :cx="pt.x"
                    :cy="pt.y"
                    :r="hoverIdx === idx ? 6 : 4"
                    fill="#0096ff"
                    stroke="var(--surface)"
                    stroke-width="2"
                    class="svg-pt"
                    @mouseenter="hoverIdx = idx"
                    @mouseleave="hoverIdx = null"
                  />
                  <circle
                    :cx="chartCoords.ptsB[idx]?.x ?? pt.x"
                    :cy="chartCoords.ptsB[idx]?.y ?? pt.y"
                    :r="hoverIdx === idx ? 6 : 4"
                    fill="#10b981"
                    stroke="var(--surface)"
                    stroke-width="2"
                    class="svg-pt"
                    @mouseenter="hoverIdx = idx"
                    @mouseleave="hoverIdx = null"
                  />
                  <text :x="pt.x" :y="chartCoords.H - 4" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity="0.72">
                    {{ chartCoords.raw[idx]?.label }}
                  </text>
                </g>
              </svg>
              <div v-if="hoverIdx !== null && chartCoords.raw[hoverIdx]" class="chart-tooltip glass-card tech-mono">
                <strong>{{ chartCoords.raw[hoverIdx]!.label }}</strong>
                <span>iPhone: ₩{{ chartCoords.raw[hoverIdx]!.a }}만</span>
                <span>Galaxy: ₩{{ chartCoords.raw[hoverIdx]!.b }}만</span>
              </div>
            </div>
          </section>

          <!-- Recent Activity Feed -->
          <section class="panel glass-card">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">최근 활동 내역</h2>
                <p class="panel-sub">실시간 스펙 비교 및 관심 기종 기록</p>
              </div>
            </div>
            <div class="activity-list">
              <div v-for="(act, idx) in savedStore.activities" :key="idx" class="activity-row">
                <div class="activity-dot" />
                <div class="activity-body">
                  <strong>{{ act.title }}</strong>
                  <span>{{ act.meta }}</span>
                </div>
                <span class="activity-time tech-mono">{{ act.time }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- =================================================================
           TAB 2: FINANCE / PRICE WATCH & MALL LINKS
           ================================================================= -->
      <div v-show="activeTab === 'finance'" class="tab-panel">
        <div class="panel glass-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">관심 기종 실시간 가격 워치 &amp; 4대 쇼핑몰 연결</h2>
              <p class="panel-sub">모델번호가 자동 매칭된 다나와·네이버·쿠팡·공식몰 최저가 검색 링크입니다.</p>
            </div>
            <TrendingDown :size="20" class="accent-ico" />
          </div>

          <div v-if="loading" class="state-msg">가격 데이터를 동기화하는 중…</div>
          <div v-else-if="loadError" class="state-msg">{{ loadError }}</div>
          <div v-else class="table-wrap">
            <table class="watch-table">
              <thead>
                <tr>
                  <th>제품명 / 모델번호</th>
                  <th>공식 출고가</th>
                  <th>현재 최저가</th>
                  <th>쇼핑몰 바로가기</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in financeRows" :key="row.product.slug">
                  <td>
                    <div class="wt-name-cell">
                      <RouterLink :to="{ name: 'product-detail', params: { slug: row.product.slug } }" class="wt-name">
                        {{ row.product.name }}
                      </RouterLink>
                      <span class="wt-model tech-mono">
                        {{ row.product.brand.name }} · {{ row.product.baseModelNumber ?? row.product.category.name }}
                      </span>
                    </div>
                  </td>
                  <td class="tech-mono">{{ formatKrw(row.launch) }}</td>
                  <td>
                    <div v-if="row.lowest !== null" class="wt-low">
                      <strong class="tech-mono">{{ formatKrw(row.lowest) }}</strong>
                      <span v-if="row.discountPct > 0" class="disc-pill tech-mono">-{{ row.discountPct }}%</span>
                    </div>
                    <span v-else class="wt-model">쇼핑몰 실시간 확인</span>
                  </td>
                  <td>
                    <div class="mall-pills">
                      <a
                        v-for="m in row.malls"
                        :key="m.id"
                        :href="m.modelNumberUrl ?? m.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mall-link"
                      >
                        <span>{{ m.id === 'danawa' ? '다나와' : m.id === 'naver' ? '네이버' : m.id === 'coupang' ? '쿠팡' : '공식몰' }}</span>
                        <ExternalLink :size="11" />
                      </a>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="mini-btn"
                      :class="{ active: compareStore.has(row.product.slug) }"
                      @click="toggleCompare(row.product)"
                    >
                      {{ compareStore.has(row.product.slug) ? '담김 ✓' : '+ 비교' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Category Spread Bars -->
        <div class="panel glass-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">카테고리별 평균 가격대 분포</h2>
              <p class="panel-sub">DB 등록 전 기종 기준 카테고리 평균가 (만원)</p>
            </div>
          </div>
          <div class="spread-bars">
            <div v-for="c in categorySpread" :key="c.slug" class="spread-row">
              <span class="spread-label">
                <component :is="categoryIcon(c.slug)" :size="15" />
                {{ c.label }} ({{ c.count }}종)
              </span>
              <div class="spread-track">
                <div class="spread-fill" :style="{ width: c.pct + '%' }" />
              </div>
              <strong class="spread-val tech-mono">평균 ₩{{ c.avgMan }}만</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- =================================================================
           TAB 3: SAVED DEVICES
           ================================================================= -->
      <div v-show="activeTab === 'saved'" class="tab-panel">
        <div class="saved-toolbar glass-card">
          <div class="saved-search">
            <Search :size="16" class="search-ico" />
            <input v-model="savedQuery" type="search" placeholder="찜한 기종명 또는 모델번호 검색" aria-label="찜한 기종 검색" />
          </div>

          <div class="filter-pills">
            <button
              type="button"
              class="filter-pill"
              :class="{ active: savedBrand === 'all' }"
              @click="savedBrand = 'all'"
            >
              전체 브랜드
            </button>
            <button
              v-for="b in savedBrands"
              :key="b.slug"
              type="button"
              class="filter-pill"
              :class="{ active: savedBrand === b.slug }"
              @click="savedBrand = b.slug"
            >
              {{ b.name }}
            </button>
          </div>

          <div class="filter-pills">
            <button
              v-for="c in [
                { id: 'all', label: '전체 카테고리' },
                { id: 'smartphone', label: '스마트폰' },
                { id: 'laptop', label: '노트북' },
                { id: 'tablet', label: '태블릿' },
                { id: 'audio', label: '오디오' },
                { id: 'smartwatch', label: '워치' },
              ]"
              :key="c.id"
              type="button"
              class="filter-pill"
              :class="{ active: savedCat === c.id }"
              @click="savedCat = c.id"
            >
              {{ c.label }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="panel glass-card state-msg">관심 기종을 불러오는 중…</div>
        <div v-else-if="filteredSaved.length === 0" class="panel glass-card empty-saved">
          <Bookmark :size="30" class="accent-ico" />
          <h3>조건에 맞는 관심 기종이 없습니다</h3>
          <p>전체 카탈로그에서 마음에 드는 기종의 북마크 아이콘을 눌러 담아보세요.</p>
          <RouterLink :to="{ name: 'catalog' }" class="btn btn--primary">전체 카탈로그 탐색</RouterLink>
        </div>
        <div v-else class="saved-grid">
          <article v-for="p in filteredSaved" :key="p.slug" class="saved-card glass-card">
            <div class="sc-top">
              <span class="sc-badge">{{ p.brand.name }} · {{ p.category.name }}</span>
              <button
                type="button"
                class="sc-remove"
                :aria-label="`${p.name} 찜 삭제`"
                title="관심 기종 삭제"
                @click="savedStore.removeSaved(p.slug)"
              >
                <Trash2 :size="14" />
              </button>
            </div>

            <div class="sc-thumb">
              <img v-if="p.thumbnailUrl" :src="p.thumbnailUrl" :alt="p.name" loading="lazy" decoding="async" />
              <component :is="categoryIcon(p.category.slug)" v-else :size="34" />
            </div>

            <div class="sc-info">
              <span v-if="p.baseModelNumber" class="sc-model tech-mono">{{ p.baseModelNumber }}</span>
              <RouterLink :to="{ name: 'product-detail', params: { slug: p.slug } }" class="sc-name">
                {{ p.name }}
              </RouterLink>
              <strong class="sc-price tech-mono">{{ formatKrw(effectivePrice(p)) }}</strong>
            </div>

            <div class="sc-actions">
              <button
                type="button"
                class="btn-compare-card"
                :class="{ active: compareStore.has(p.slug) }"
                @click="toggleCompare(p)"
              >
                <Scale :size="14" />
                <span>{{ compareStore.has(p.slug) ? '비교함 담김 ✓' : '1:1 비교 담기' }}</span>
              </button>
              <RouterLink :to="{ name: 'product-detail', params: { slug: p.slug } }" class="sc-detail-link" aria-label="상세 스펙">
                <ArrowUpRight :size="16" />
              </RouterLink>
            </div>
          </article>
        </div>
      </div>

      <!-- =================================================================
           TAB 4: ALERTS
           ================================================================= -->
      <div v-show="activeTab === 'alerts'" class="tab-panel">
        <div class="panel glass-card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">가격 변동 &amp; DB 동기화 알림</h2>
              <p class="panel-sub">관심 기종 할인 포착 및 공식 사양 업데이트 피드입니다.</p>
            </div>
            <div class="alert-controls">
              <button
                type="button"
                class="filter-pill"
                :class="{ active: onlyUnreadAlerts }"
                @click="onlyUnreadAlerts = !onlyUnreadAlerts"
              >
                안 읽음만 ({{ unreadAlertCount }})
              </button>
              <button type="button" class="btn btn--secondary btn-sm" @click="markAllAlertsRead">
                <CheckCheck :size="14" />
                <span>모두 읽음</span>
              </button>
            </div>
          </div>

          <div class="alerts-list">
            <div
              v-for="a in visibleAlerts"
              :key="a.id"
              class="alert-item"
              :class="{ unread: a.unread }"
            >
              <div class="alert-icon">
                <Bell :size="17" />
              </div>
              <div class="alert-body">
                <div class="alert-top">
                  <strong>{{ a.title }}</strong>
                  <span class="tech-mono">{{ a.time }}</span>
                </div>
                <p>{{ a.body }}</p>
              </div>
              <RouterLink v-if="a.to" :to="a.to" class="alert-link" @click="a.unread = false">
                확인 <ArrowUpRight :size="14" />
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mypage-shell {
  padding: 28px clamp(16px, 3vw, 40px) 72px;
  min-height: calc(100vh - 72px);
}

.mypage-container {
  width: min(1280px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.mp-header {
  border-radius: 22px;
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.mp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent-text);
  margin-bottom: 6px;
}

.mp-title {
  margin: 0 0 6px;
  font-size: clamp(24px, 2.5vw, 32px);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--ink);
}

.mp-sub {
  margin: 0;
  font-size: 14.5px;
  color: var(--text-sub);
}

.mp-quick-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.mp-stat-pill {
  padding: 9px 14px;
  border-radius: 12px;
  background: var(--card-inner);
  border: 1px solid var(--hairline);
  display: grid;
  gap: 2px;
}

.mp-stat-pill span {
  font-size: 11.5px;
  color: var(--muted);
}

.mp-stat-pill strong {
  font-size: 16px;
  color: var(--accent-text);
}

.mp-go-cmp {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 13.5px;
}

/* Tab Bar */
.tab-nav {
  border-radius: 16px;
  padding: 6px 10px;
  overflow-x: auto;
}

.tab-track {
  position: relative;
  display: inline-flex;
  gap: 6px;
}

.tab-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  color: var(--text-sub);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.tab-btn.active {
  color: var(--accent-text);
}

.tab-count {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--badge-bg);
  color: var(--badge-text);
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  height: 3px;
  border-radius: 99px;
  background: var(--accent);
  transition: left 0.26s cubic-bezier(0.22, 1, 0.36, 1), width 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.tab-panel {
  display: grid;
  gap: 18px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  border-radius: 18px;
  padding: 18px 20px;
  display: grid;
  gap: 5px;
}

.kpi-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
}

.kpi-val {
  font-size: clamp(22px, 2vw, 28px);
  font-weight: 800;
  color: var(--ink);
}

.kpi-meta {
  font-size: 12px;
  color: var(--text-sub);
}

.kpi-meta.pos {
  color: var(--spec-win);
  font-weight: 600;
}

.inline-link {
  color: var(--accent-text);
  font-weight: 700;
  text-decoration: none;
}

/* Overview Split */
.overview-split {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.9fr);
  gap: 18px;
}

.panel {
  border-radius: 20px;
  padding: 22px;
  display: grid;
  gap: 16px;
  align-content: start;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
}

.panel-sub {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.range-pills {
  display: inline-flex;
  gap: 4px;
  background: var(--card-inner);
  padding: 3px;
  border-radius: 10px;
  border: 1px solid var(--hairline);
}

.range-btn {
  border: 0;
  background: transparent;
  color: var(--text-sub);
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.range-btn.active {
  background: var(--accent);
  color: #ffffff;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12.5px;
  color: var(--text-sub);
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 5px;
}

.dot--blue {
  background: #0096ff;
}

.dot--green {
  background: #10b981;
}

.svg-wrap {
  position: relative;
}

.price-svg {
  width: 100%;
  height: auto;
  display: block;
  color: var(--ink);
}

.svg-pt {
  cursor: pointer;
}

.chart-tooltip {
  position: absolute;
  top: 6px;
  right: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  display: flex;
  gap: 12px;
}

.activity-list {
  display: grid;
  gap: 10px;
}

.activity-row {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--card-inner);
  border: 1px solid var(--hairline);
}

.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.activity-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.activity-body strong {
  font-size: 13.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-body span {
  font-size: 12px;
  color: var(--muted);
}

.activity-time {
  font-size: 11.5px;
  color: var(--muted);
}

/* Finance Table */
.accent-ico {
  color: var(--accent-text);
}

.table-wrap {
  overflow-x: auto;
}

.watch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.watch-table th {
  text-align: left;
  padding: 10px 12px;
  color: var(--muted);
  font-size: 12px;
  border-bottom: 1px solid var(--hairline-strong);
}

.watch-table td {
  padding: 12px;
  border-bottom: 1px solid var(--hairline);
  vertical-align: middle;
}

.wt-name-cell {
  display: grid;
  gap: 2px;
}

.wt-name {
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
}

.wt-name:hover {
  color: var(--accent-text);
}

.wt-model {
  font-size: 11.5px;
  color: var(--muted);
}

.wt-low {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--accent-text);
}

.disc-pill {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--spec-win-bg);
  color: var(--spec-win);
  font-size: 11px;
  font-weight: 700;
}

.mall-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mall-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--card-inner);
  border: 1px solid var(--hairline-strong);
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.mall-link:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}

.mini-btn {
  padding: 6px 11px;
  border-radius: 8px;
  border: 1px solid var(--action-border);
  background: var(--action-subtle);
  color: var(--accent-text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mini-btn.active {
  background: var(--accent);
  color: #ffffff;
}

.spread-bars {
  display: grid;
  gap: 10px;
}

.spread-row {
  display: grid;
  grid-template-columns: 140px 1fr 110px;
  align-items: center;
  gap: 12px;
}

.spread-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
}

.spread-track {
  height: 9px;
  border-radius: 99px;
  background: var(--track-bg);
  overflow: hidden;
}

.spread-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--accent), #38bdf8);
}

.spread-val {
  text-align: right;
  font-size: 12.5px;
  color: var(--accent-text);
}

/* Saved Grid */
.saved-toolbar {
  border-radius: 18px;
  padding: 16px 20px;
  display: grid;
  gap: 12px;
}

.saved-search {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  height: 42px;
  border-radius: 11px;
  background: var(--card-inner);
  border: 1px solid var(--hairline-strong);
}

.saved-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 14px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.filter-pill {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--hairline-strong);
  background: var(--card-inner);
  color: var(--text-sub);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.filter-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}

.saved-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.saved-card {
  border-radius: 18px;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.sc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sc-badge {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent-text);
}

.sc-remove {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--hairline);
  background: var(--card-inner);
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.sc-remove:hover {
  color: var(--rose);
  border-color: var(--rose);
}

.sc-thumb {
  height: 148px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid var(--hairline);
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 10px;
  color: var(--accent);
}

.sc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sc-info {
  display: grid;
  gap: 3px;
}

.sc-model {
  font-size: 11px;
  color: var(--muted);
}

.sc-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  line-height: 1.3;
}

.sc-name:hover {
  color: var(--accent-text);
}

.sc-price {
  font-size: 14px;
  color: var(--accent-text);
}

.sc-actions {
  display: flex;
  gap: 8px;
}

.btn-compare-card {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--action-border);
  background: var(--action-subtle);
  color: var(--accent-text);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.btn-compare-card.active {
  background: var(--accent);
  color: #ffffff;
}

.sc-detail-link {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--hairline-strong);
  background: var(--card-inner);
  color: var(--ink);
  display: grid;
  place-items: center;
}

.empty-saved,
.state-msg {
  padding: 40px;
  text-align: center;
  justify-items: center;
  color: var(--text-sub);
}

.empty-saved .btn {
  padding: 10px 18px;
  border-radius: 12px;
  text-decoration: none;
}

/* Alerts */
.alert-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 12.5px;
  cursor: pointer;
}

.alerts-list {
  display: grid;
  gap: 10px;
}

.alert-item {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--card-inner);
  border: 1px solid var(--hairline);
}

.alert-item.unread {
  border-color: var(--action-border);
  box-shadow: inset 3px 0 0 var(--accent);
}

.alert-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--badge-bg);
  color: var(--badge-text);
  display: grid;
  place-items: center;
}

.alert-body {
  display: grid;
  gap: 4px;
}

.alert-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
}

.alert-top span {
  font-size: 11.5px;
  color: var(--muted);
}

.alert-body p {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}

.alert-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  border-radius: 8px;
  background: var(--action-subtle);
  color: var(--accent-text);
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
}

@media (max-width: 1080px) {
  .kpi-grid,
  .saved-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .kpi-grid,
  .saved-grid {
    grid-template-columns: 1fr;
  }

  .spread-row {
    grid-template-columns: 110px 1fr 80px;
  }
}
</style>
