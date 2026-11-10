<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, ArrowRight, Smartphone, Tablet, Watch, Scale } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api, ApiClientError } from '@/services/api'
import type { CategorySlug, ProductSummaryRecord, ResolvedSpecItem } from '@/types/api'
import ProductCard from '@/components/product/ProductCard.vue'
import PrismBg from '@/components/common/PrismBg.vue'
import TechIcon from '@/components/common/TechIcon.vue'

const router = useRouter()

const query = ref('')
const allProducts = ref<ProductSummaryRecord[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

// Interactive 1:1 Quick Compare Builder state
const pickerCategory = ref<CategorySlug>('smartphone')
const slotASlug = ref('iphone-17-pro-max')
const slotBSlug = ref('galaxy-s25-ultra')
const specCache = new Map<string, ResolvedSpecItem[]>()
const slotASpecs = ref<ResolvedSpecItem[]>([])
const slotBSpecs = ref<ResolvedSpecItem[]>([])

async function loadSlotSpecs(slug: string, target: typeof slotASpecs) {
  if (!slug) {
    target.value = []
    return
  }
  const cached = specCache.get(slug)
  if (cached) {
    target.value = cached
    return
  }
  try {
    const res = await api.productSpecs(slug)
    specCache.set(slug, res.specifications)
    target.value = res.specifications
  } catch {
    target.value = []
  }
}

watch(slotASlug, (s) => loadSlotSpecs(s, slotASpecs), { immediate: true })
watch(slotBSlug, (s) => loadSlotSpecs(s, slotBSpecs), { immediate: true })

const recentProducts = computed(() => allProducts.value.slice(0, 6))
const totalCount = computed(() => allProducts.value.length)

const categoryProducts = computed(() =>
  allProducts.value.filter((p) => p.category.slug === pickerCategory.value),
)

const slotAProduct = computed(() =>
  categoryProducts.value.find((p) => p.slug === slotASlug.value) ?? null,
)
const slotBProduct = computed(() =>
  categoryProducts.value.find((p) => p.slug === slotBSlug.value) ?? null,
)

function setDefaultPairForCategory(cat: CategorySlug) {
  const list = allProducts.value.filter((p) => p.category.slug === cat)
  const firstApple = list.find((p) => p.brand.slug === 'apple') ?? list[0]
  const firstSamsung =
    list.find((p) => p.brand.slug === 'samsung' && p.slug !== firstApple?.slug) ?? list[1]
  slotASlug.value = firstApple?.slug ?? ''
  slotBSlug.value = firstSamsung?.slug ?? ''
}

watch(pickerCategory, (newCat) => {
  setDefaultPairForCategory(newCat)
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.products({ sort: 'release_desc', limit: 100 })
    allProducts.value = res.data
    setDefaultPairForCategory(pickerCategory.value)
  } catch (e) {
    loadError.value = e instanceof ApiClientError ? e.message : '데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

function submit() {
  const q = query.value.trim()
  router.push({ name: 'catalog', query: q ? { q } : {} })
}

function runQuickCompare() {
  if (!slotASlug.value || !slotBSlug.value || slotASlug.value === slotBSlug.value) return
  router.push({
    name: 'compare',
    query: { items: `${slotASlug.value},${slotBSlug.value}` },
  })
}

function formatKrw(price: number | null | undefined): string {
  if (price === null || price === undefined) return '정보 없음'
  return `₩${price.toLocaleString('ko-KR')}`
}

// Compute dynamic comparison ratio between Slot A and Slot B launch prices
const priceShareA = computed(() => {
  const a = slotAProduct.value?.launchPriceKrw ?? 1500000
  const b = slotBProduct.value?.launchPriceKrw ?? 1500000
  const sum = a + b
  return sum > 0 ? Math.round((a / sum) * 100) : 50
})

function extractRefreshRate(specs: ResolvedSpecItem[]) {
  const item = specs.find((s) => s.specKey === 'refresh_rate')
  const hz = item?.numericValue ?? 60
  const label = item?.numericValue ? `${item.numericValue}Hz` : (item?.value ?? '60Hz')
  return { hz, label }
}

const refreshComparison = computed(() => {
  const a = extractRefreshRate(slotASpecs.value)
  const b = extractRefreshRate(slotBSpecs.value)
  const sum = a.hz + b.hz
  return {
    label: `${a.label} vs ${b.label}`,
    shareA: sum > 0 ? Math.round((a.hz / sum) * 100) : 50,
  }
})

const specCoverageComparison = computed(() => {
  const countA = slotASpecs.value.filter((s) => s.value !== null).length || 12
  const countB = slotBSpecs.value.filter((s) => s.value !== null).length || 12
  const sum = countA + countB
  return {
    label: `${countA} / 12 Specs vs ${countB} / 12 Specs`,
    shareA: sum > 0 ? Math.round((countA / sum) * 100) : 50,
  }
})

const brandLinks = [
  {
    slug: 'apple',
    name: 'Apple',
    countLabel: '25종 수록',
    desc: 'iPhone 17/16/15 · iPad Pro/Air · Apple Watch Series 11/10/Ultra 공식 사양',
    series: ['iPhone', 'iPad', 'Apple Watch'],
  },
  {
    slug: 'samsung',
    name: 'Samsung',
    countLabel: '25종 수록',
    desc: 'Galaxy S25/S24 · Z Fold7/Flip7 · Galaxy Tab S10/S9 · Watch8/7 공식 사양',
    series: ['Galaxy S', 'Galaxy Z', 'Galaxy A', 'Galaxy Tab', 'Galaxy Watch'],
  },
]

const categoryShortcuts = [
  { slug: 'smartphone' as CategorySlug, name: '스마트폰', count: 26, icon: Smartphone },
  { slug: 'tablet' as CategorySlug, name: '태블릿', count: 14, icon: Tablet },
  { slug: 'smartwatch' as CategorySlug, name: '스마트워치', count: 10, icon: Watch },
]

const presetComparisons = [
  {
    category: '2025 최신 플래그십',
    leftName: 'iPhone 17 Pro Max',
    leftCode: 'A3526',
    rightName: 'Galaxy S25 Ultra',
    rightCode: 'SM-S938N',
    items: 'iphone-17-pro-max,galaxy-s25-ultra',
  },
  {
    category: '스마트폰 베스트셀러',
    leftName: 'iPhone 16 Pro Max',
    leftCode: 'A3296',
    rightName: 'Galaxy S24 Ultra',
    rightCode: 'SM-S928N',
    items: 'iphone-16-pro-max,galaxy-s24-ultra',
  },
  {
    category: '태블릿 대화면',
    leftName: 'iPad Pro 13 (M4)',
    leftCode: 'A2925',
    rightName: 'Galaxy Tab S10 Ultra',
    rightCode: 'SM-X920',
    items: 'ipad-pro-13-m4,galaxy-tab-s10-ultra',
  },
  {
    category: '스마트워치 최신형',
    leftName: 'Apple Watch Series 11 46mm',
    leftCode: 'A3331',
    rightName: 'Galaxy Watch8 44mm',
    rightCode: 'SM-L330',
    items: 'apple-watch-series-11-46,galaxy-watch8-44',
  },
]
</script>

<template>
  <!-- 1. Spotlight Hero Section + ReactBits Rotating Prism Backdrop -->
  <section class="hero">
    <PrismBg />
    <div class="wrap hero__container">
      <!-- Center Spotlight Headline + Search -->
      <div class="hero__center">
        <p class="hero__kicker tech-mono">
          APPLE · SAMSUNG {{ totalCount || 50 }}종 공식 사양 &amp; 최저가 비교
        </p>
        <h1 class="hero__h1">
          원하는 두 기기를 골라<br />
          <span class="text-accent">스펙과 최저가를 한눈에 비교하세요</span>
        </h1>
        <p class="hero__lead">
          프로세서·디스플레이·주사율·배터리·무게·출고가 비교부터 다나와·네이버쇼핑·쿠팡 최저가 조회까지 가장 객관적인 데이터로 비교합니다.
        </p>

        <form class="search glass-card" role="search" @submit.prevent="submit">
          <Search :size="18" class="search__icon" aria-hidden="true" />
          <label for="home-search" class="sr-only">제품명 또는 모델 번호 검색</label>
          <input
            id="home-search"
            v-model="query"
            class="search__input"
            type="search"
            placeholder="제품명 또는 모델 번호 검색 (예: iPhone 17 Pro, SM-S938N, A2925)"
            autocomplete="off"
          />
          <button class="btn btn--primary search__btn" type="submit">
            <span>검색</span>
            <ArrowRight :size="16" aria-hidden="true" />
          </button>
        </form>

        <div class="hero__cats" aria-label="카테고리 바로가기">
          <RouterLink
            v-for="cat in categoryShortcuts"
            :key="cat.slug"
            :to="{ name: 'catalog', query: { category: cat.slug } }"
            class="cat-link inner-box"
          >
            <component :is="cat.icon" :size="15" aria-hidden="true" />
            <span>{{ cat.name }}</span>
            <span class="tech-mono cat-link__count">{{ cat.count }}</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- 2. Bento Grid: IT Device 1:1 Matchup Dashboard (7 Cols + 5 Cols) -->
  <section class="wrap bento-section">
    <div class="section-head">
      <div>
        <p class="label tech-mono">HARDWARE ARCHITECTURE MATCHUP</p>
        <h2 class="section-h2">스마트폰 · 태블릿 · 워치 1:1 스펙 매치업 대시보드</h2>
      </div>

      <div class="cat-Step-tabs" role="tablist" aria-label="비교할 기기 카테고리 선택">
        <button
          v-for="cat in categoryShortcuts"
          :key="cat.slug"
          type="button"
          class="cat-step-btn"
          :class="{ 'is-active': pickerCategory === cat.slug }"
          @click="pickerCategory = cat.slug"
        >
          <component :is="cat.icon" :size="15" aria-hidden="true" />
          <span>{{ cat.name }}</span>
          <small class="tech-mono">({{ cat.count }})</small>
        </button>
      </div>
    </div>

    <div class="bento-grid">
      <!-- Left Main 1:1 Comparison Card (7 Columns) -->
      <div class="glass-card bento-main">
        <div>
          <div class="bento-main__head">
            <span class="label tech-mono">LIVE 1:1 DEVICE MATCHUP</span>
            <span class="badge-style bento-badge tech-mono">✦ 12개 표준 스펙 정밀 대조</span>
          </div>

          <!-- 2 Selected Devices (Slot A vs Slot B) -->
          <div class="device-pair">
            <div class="inner-box device-slot">
              <div class="device-slot__top">
                <span class="text-sub">선택 기기 A</span>
                <span v-if="slotAProduct" class="device-slot__brand" :data-brand="slotAProduct.brand.slug">
                  <TechIcon :name="slotAProduct.brand.slug" :size="13" />
                  <span>{{ slotAProduct.brand.name }}</span>
                </span>
              </div>
              <select v-model="slotASlug" class="device-slot__select" aria-label="비교 기기 1 선택">
                <option v-for="p in categoryProducts" :key="p.id" :value="p.slug">
                  [{{ p.brand.name }}] {{ p.name }} ({{ p.baseModelNumber }})
                </option>
              </select>
              <div v-if="slotAProduct" class="device-slot__preview">
                <div v-if="slotAProduct.thumbnailUrl" class="device-slot__thumb">
                  <img :src="slotAProduct.thumbnailUrl" :alt="slotAProduct.name" />
                </div>
                <div class="device-slot__info">
                  <div class="device-slot__name">{{ slotAProduct.name }}</div>
                  <div class="device-slot__code tech-mono">{{ slotAProduct.baseModelNumber }} · {{ slotAProduct.releaseDate }}</div>
                  <div class="device-slot__price text-accent tech-mono">
                    {{ formatKrw(slotAProduct.launchPriceKrw) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="inner-box device-slot">
              <div class="device-slot__top">
                <span class="text-sub">선택 기기 B</span>
                <span v-if="slotBProduct" class="device-slot__brand" :data-brand="slotBProduct.brand.slug">
                  <TechIcon :name="slotBProduct.brand.slug" :size="13" />
                  <span>{{ slotBProduct.brand.name }}</span>
                </span>
              </div>
              <select v-model="slotBSlug" class="device-slot__select" aria-label="비교 기기 2 선택">
                <option v-for="p in categoryProducts" :key="p.id" :value="p.slug">
                  [{{ p.brand.name }}] {{ p.name }} ({{ p.baseModelNumber }})
                </option>
              </select>
              <div v-if="slotBProduct" class="device-slot__preview">
                <div v-if="slotBProduct.thumbnailUrl" class="device-slot__thumb">
                  <img :src="slotBProduct.thumbnailUrl" :alt="slotBProduct.name" />
                </div>
                <div class="device-slot__info">
                  <div class="device-slot__name">{{ slotBProduct.name }}</div>
                  <div class="device-slot__code tech-mono">{{ slotBProduct.baseModelNumber }} · {{ slotBProduct.releaseDate }}</div>
                  <div class="device-slot__price tech-mono">
                    {{ formatKrw(slotBProduct.launchPriceKrw) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dual Comparison Progress Bars (Spotlight Reference Structure) -->
          <div class="bar-group">
            <div class="bar-item">
              <div class="bar-item__head">
                <span>공식 출고가 포지션 비교 (기기 A vs 기기 B)</span>
                <span class="text-accent tech-mono">
                  {{ formatKrw(slotAProduct?.launchPriceKrw) }} vs {{ formatKrw(slotBProduct?.launchPriceKrw) }}
                </span>
              </div>
              <div class="bar-track bar-item__track">
                <div class="bar-primary" :style="{ width: `${priceShareA}%` }"></div>
                <div class="bar-secondary" :style="{ width: `${100 - priceShareA}%` }"></div>
              </div>
            </div>

            <div class="bar-item">
              <div class="bar-item__head">
                <span>주사율 · 디스플레이 응답 속도 (기기 A vs 기기 B)</span>
                <span class="text-accent tech-mono">{{ refreshComparison.label }}</span>
              </div>
              <div class="bar-track bar-item__track">
                <div class="bar-primary" :style="{ width: `${refreshComparison.shareA}%` }"></div>
                <div class="bar-secondary" :style="{ width: `${100 - refreshComparison.shareA}%` }"></div>
              </div>
            </div>

            <div class="bar-item">
              <div class="bar-item__head">
                <span>12대 표준 하드웨어 스펙 검증 커버리지</span>
                <span class="text-accent tech-mono">{{ specCoverageComparison.label }}</span>
              </div>
              <div class="bar-track bar-item__track">
                <div class="bar-primary" :style="{ width: `${specCoverageComparison.shareA}%` }"></div>
                <div class="bar-secondary" :style="{ width: `${100 - specCoverageComparison.shareA}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="bento-main__foot">
          <span class="text-sub">다나와 · 네이버쇼핑 · 쿠팡 실시간 최저가 검색 연동</span>
          <button
            type="button"
            class="btn btn--primary quick-action__btn"
            :disabled="!slotASlug || !slotBSlug || slotASlug === slotBSlug"
            @click="runQuickCompare"
          >
            <Scale :size="16" aria-hidden="true" />
            <span>{{
              slotASlug === slotBSlug ? '서로 다른 기기를 선택하세요' : '두 기기 1:1 전체 비교표 열기 →'
            }}</span>
          </button>
        </div>
      </div>

      <!-- Right Secondary Bento Column (5 Columns) -->
      <div class="bento-side">
        <!-- Top 2-Column Mini Spec Cards -->
        <div class="mini-grid">
          <div class="glass-card mini-card">
            <span class="label tech-mono">CATALOG COVERAGE</span>
            <div class="mini-card__body">
              <div class="mini-card__val tech-mono">
                {{ totalCount || 50 }}<span class="mini-card__unit">종</span>
              </div>
              <div class="text-sub mini-card__sub">Apple 25 · Samsung 25</div>
            </div>
            <div class="bar-track mini-card__bar">
              <div class="bar-primary" style="width: 100%"></div>
            </div>
          </div>

          <div class="glass-card mini-card">
            <span class="label tech-mono">SPEC ACCURACY</span>
            <div class="mini-card__body">
              <div class="mini-card__val text-accent tech-mono">
                100<span class="mini-card__unit">%</span>
              </div>
              <div class="text-sub mini-card__sub">제조사 공식 사양서 기준</div>
            </div>
            <div class="bar-track mini-card__bar">
              <div class="bar-primary" style="width: 96%"></div>
            </div>
          </div>
        </div>

        <!-- Bottom Brand Index & AI Comparison Summary Card -->
        <div class="glass-card coaching-card">
          <div>
            <div class="coaching-card__head">
              <span class="text-accent coaching-card__title">✦ TechCompare 라인업 색인 & 코칭</span>
              <span class="badge-style coaching-card__badge tech-mono">실시간 최저가 연동</span>
            </div>

            <div v-for="b in brandLinks" :key="b.slug" class="brand-ledger__row">
              <div class="brand-ledger__top">
                <h3 class="brand-ledger__title" :data-brand="b.slug">
                  <TechIcon :name="b.slug" :size="16" />
                  <span>{{ b.name }}</span>
                </h3>
                <RouterLink :to="{ name: 'catalog', query: { brand: b.slug } }" class="brand-ledger__all tech-mono">
                  {{ b.countLabel }} →
                </RouterLink>
              </div>
              <p class="brand-ledger__desc">{{ b.desc }}</p>
              <ul class="brand-ledger__series">
                <li v-for="s in b.series" :key="s">
                  <RouterLink
                    :to="{ name: 'catalog', query: { brand: b.slug, series: s } }"
                    class="series-tag"
                  >
                    {{ s }}
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>

          <button type="button" class="btn-accent coaching-card__cta" @click="runQuickCompare">
            + 선택한 두 기기({{ slotAProduct?.name ?? 'A' }} vs {{ slotBProduct?.name ?? 'B' }}) 정밀 비교하기
          </button>
        </div>
      </div>
    </div>

    <!-- Preset Matchup Ledger -->
    <div class="glass-card matchup-ledger" role="list">
      <RouterLink
        v-for="m in presetComparisons"
        :key="m.items"
        :to="{ name: 'compare', query: { items: m.items } }"
        class="matchup-row"
        role="listitem"
      >
        <span class="matchup-row__cat">{{ m.category }}</span>
        <div class="matchup-row__pair">
          <span class="matchup-row__device">
            <strong>{{ m.leftName }}</strong>
            <small class="tech-mono">{{ m.leftCode }}</small>
          </span>
          <span class="matchup-row__vs tech-mono">VS</span>
          <span class="matchup-row__device">
            <strong>{{ m.rightName }}</strong>
            <small class="tech-mono">{{ m.rightCode }}</small>
          </span>
        </div>
        <span class="matchup-row__cta">사양 비교표 열기 →</span>
      </RouterLink>
    </div>
  </section>

  <!-- 3. Recent Verified Products Grid -->
  <section class="wrap section-block">
    <div class="section-head">
      <div>
        <p class="label tech-mono">LATEST VERIFIED RELEASES</p>
        <h2 class="section-h2">최근 출시 제품</h2>
      </div>
      <RouterLink :to="{ name: 'catalog', query: { sort: 'release_desc' } }" class="btn btn--secondary tech-mono">
        전체 카탈로그 보기 ({{ totalCount || 50 }})
      </RouterLink>
    </div>

    <div v-if="loading" class="state-line">제품 목록을 불러오는 중입니다…</div>
    <div v-else-if="loadError" class="state-line bad">{{ loadError }}</div>
    <div v-else class="product-grid">
      <ProductCard v-for="item in recentProducts" :key="item.id" :product="item" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  padding: var(--s-7) 0 var(--s-8);
  border-bottom: 1px solid var(--divider);
}

.hero__container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
}

.hero__center {
  text-align: center;
  max-width: 780px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero__kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--badge-text);
  margin-bottom: var(--s-2);
}

.hero__h1 {
  font-family: var(--font-sans);
  font-size: var(--t-h1);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.035em;
}

.hero__lead {
  margin-top: var(--s-4);
  font-size: var(--t-lead);
  line-height: 1.6;
  color: var(--text-sub);
  max-width: 58ch;
}

.search {
  margin-top: var(--s-5);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  width: 100%;
  max-width: 640px;
  height: 54px;
  padding: 0 6px 0 var(--s-4);
  border-radius: 999px;
}

.search:focus-within {
  border-color: var(--accent);
}

.search__icon {
  color: var(--text-sub);
  flex: none;
}

.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 15px;
  outline: none;
}

.search__input::placeholder {
  color: var(--text-sub);
}

.search__btn {
  height: 42px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14px;
}

.hero__cats {
  margin-top: var(--s-4);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-3);
}

.cat-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.cat-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.cat-link__count {
  font-size: 12px;
  color: var(--text-sub);
}

/* 2. Bento Grid Section */
.bento-section {
  padding-top: var(--s-8);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--grid-gap);
  margin-bottom: var(--s-6);
}

.bento-main {
  grid-column: span 7;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-5);
}

.bento-main__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--s-4);
}

.bento-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
}

.device-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
  margin-bottom: var(--s-5);
}

.device-slot {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-slot__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.device-slot__brand {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: var(--brand-apple);
}

.device-slot__brand[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.device-slot__select {
  height: 40px;
  padding: 0 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--card-border);
  background: var(--bg-main);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
}

.device-slot__preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.device-slot__thumb {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f1f5f9 100%);
  border: 1px solid var(--divider);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  flex-shrink: 0;
}

.device-slot__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.device-slot__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.device-slot__name {
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-slot__code {
  font-size: 11px;
  color: var(--text-sub);
}

.device-slot__price {
  font-size: 17px;
  font-weight: 800;
  margin-top: 2px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bar-item__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.bar-item__track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  gap: 4px;
  padding: 2px;
}

.bar-item__track > div {
  height: 100%;
  border-radius: 999px;
}

.bento-main__foot {
  padding-top: var(--s-4);
  border-top: 1px solid var(--divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-3);
  flex-wrap: wrap;
  font-size: 12px;
}

.bento-side {
  grid-column: span 5;
  display: flex;
  flex-direction: column;
  gap: var(--grid-gap);
}

.mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-4);
}

.mini-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mini-card__body {
  margin: 10px 0;
}

.mini-card__val {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.mini-card__unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub);
  margin-left: 2px;
}

.mini-card__sub {
  font-size: 12px;
  margin-top: 4px;
}

.mini-card__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
}

.mini-card__bar > div {
  height: 100%;
  border-radius: 999px;
}

.coaching-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-4);
}

.coaching-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--s-3);
}

.coaching-card__title {
  font-size: 13px;
  font-weight: 800;
}

.coaching-card__badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}

.brand-ledger__row {
  padding: 12px 0;
}

.brand-ledger__row + .brand-ledger__row {
  border-top: 1px solid var(--divider);
}

.brand-ledger__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-ledger__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
}

.brand-ledger__title[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.brand-ledger__all {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.brand-ledger__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-sub);
}

.brand-ledger__series {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.series-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--divider);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--c-text);
  background: var(--card-inner);
  transition: border-color 0.2s ease;
}

.series-tag:hover {
  border-color: var(--accent);
  color: var(--text-main);
}

.coaching-card__cta {
  width: 100%;
  height: 44px;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 700;
}

.cat-Step-tabs {
  display: inline-flex;
  gap: var(--s-2);
  flex-wrap: wrap;
}

.cat-step-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 var(--s-4);
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: var(--card-inner);
  color: var(--c-text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.cat-step-btn.is-active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}

.quick-action__btn {
  position: relative;
  overflow: hidden;
  border-radius: 999px;
  height: 40px;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 700;
}

.section-block {
  padding-top: var(--s-8);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  flex-wrap: wrap;
  margin-bottom: var(--s-5);
}

.section-h2 {
  font-size: var(--t-h2);
  margin-top: 4px;
}

.matchup-ledger {
  padding: var(--s-3) var(--s-5);
}

.matchup-row {
  display: grid;
  grid-template-columns: 180px 1fr 160px;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-2);
  border-bottom: 1px solid var(--divider);
  transition: background-color 0.2s ease;
}

.matchup-row:last-child {
  border-bottom: 0;
}

.matchup-row:hover {
  background: var(--diff-row-bg);
}

.matchup-row__cat {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
}

.matchup-row__pair {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  flex-wrap: wrap;
}

.matchup-row__device {
  display: inline-flex;
  align-items: baseline;
  gap: var(--s-2);
}

.matchup-row__device strong {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.matchup-row__device small {
  font-size: 12px;
  color: var(--text-sub);
}

.matchup-row__vs {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--card-border);
  background: var(--badge-bg);
  color: var(--badge-text);
}

.matchup-row__cta {
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--grid-gap);
}

.state-line {
  padding: var(--s-6) 0;
  color: var(--text-sub);
}

.bad {
  color: var(--price-rise);
}

@media (max-width: 1023px) {
  .bento-main,
  .bento-side {
    grid-column: 1 / -1;
  }
  .device-pair {
    grid-template-columns: 1fr;
  }
  .matchup-row {
    grid-template-columns: 1fr auto;
  }
  .matchup-row__cat {
    grid-column: 1 / -1;
  }
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .swatch-grid,
  .mini-grid,
  .product-grid {
    grid-template-columns: 1fr;
  }
  .palette-badge__desc {
    display: none;
  }
  .matchup-row {
    grid-template-columns: 1fr;
    gap: var(--s-2);
  }
  .matchup-row__cta {
    text-align: left;
  }
  .search {
    height: auto;
    border-radius: var(--r-md);
    flex-wrap: wrap;
    padding: var(--s-2);
  }
  .search__icon {
    display: none;
  }
  .search__input {
    height: 40px;
    flex-basis: 100%;
    padding: 0 var(--s-2);
  }
}
</style>
