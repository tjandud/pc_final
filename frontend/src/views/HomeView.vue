<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, ArrowRight, Smartphone, Tablet, Laptop, Watch, Headphones, Scale, ExternalLink, ShoppingBag } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api, ApiClientError } from '@/services/api'
import type { CategorySlug, ProductSummaryRecord, ResolvedSpecItem } from '@/types/api'
import ProductCard from '@/components/product/ProductCard.vue'
import LightRaysBg from '@/components/common/LightRaysBg.vue'
import HeroTrophyStage from '@/components/common/HeroTrophyStage.vue'
import FlexCarousel from '@/components/common/FlexCarousel.vue'
import AiLaserAdvisor from '@/components/common/AiLaserAdvisor.vue'
import TechIcon from '@/components/common/TechIcon.vue'
import { buildShoppingMallLinks } from '@/utils/shopping'

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

// Dynamic Shopping Mall Links for Slot A (from ide.html)
const slotAShoppingLinks = computed(() => {
  if (!slotAProduct.value) return []
  return buildShoppingMallLinks({
    name: slotAProduct.value.name,
    brandSlug: slotAProduct.value.brand.slug as 'apple' | 'samsung',
    baseModelNumber: slotAProduct.value.baseModelNumber,
  })
})

const brandLinks = [
  {
    slug: 'apple',
    name: 'Apple',
    countLabel: '34종 수록',
    desc: 'iPhone 17/16 · MacBook Pro/Air M3 · iPad Pro · AirPods Pro/Max 공식 사양',
    series: ['iPhone', 'MacBook', 'iPad', 'AirPods', 'Apple Watch'],
  },
  {
    slug: 'samsung',
    name: 'Samsung',
    countLabel: '34종 수록',
    desc: 'Galaxy S25/S24 · Galaxy Book4 Ultra/Pro · Tab S10 · Galaxy Buds3 Pro 공식 사양',
    series: ['Galaxy S', 'Galaxy Book', 'Galaxy Tab', 'Galaxy Buds', 'Galaxy Watch'],
  },
  {
    slug: 'lg',
    name: 'LG Electronics',
    countLabel: '4종 수록',
    desc: 'LG gram Pro 16 · gram 16/14 · UltraGear 17 게이밍 등 대표 초경량 라인업',
    series: ['LG gram', 'LG gram Pro', 'LG UltraGear'],
  },
  {
    slug: 'sony',
    name: 'Sony',
    countLabel: '9종 수록',
    desc: 'WH-1000XM5/XM4 · WF-1000XM5 · LinkBuds S · Xperia 1 VI 고음질 & 카메라 사양',
    series: ['1000X 시리즈', 'LinkBuds', 'ULT WEAR', 'Xperia'],
  },
]

const categoryShortcuts = [
  { slug: 'smartphone' as CategorySlug, name: '스마트폰', count: 30, icon: Smartphone },
  { slug: 'tablet' as CategorySlug, name: '태블릿', count: 19, icon: Tablet },
  { slug: 'laptop' as CategorySlug, name: '노트북', count: 20, icon: Laptop },
  { slug: 'smartwatch' as CategorySlug, name: '스마트워치', count: 10, icon: Watch },
  { slug: 'audio' as CategorySlug, name: '오디오/헤드셋', count: 20, icon: Headphones },
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
  <!-- 1. HERO: Official ReactBits WebGL2 LightRays + Pure 3D Smartphone Trophy Stage (from ide.html) -->
  <section id="top" class="hero">
    <LightRaysBg />

    <div class="hero__content">
      <div class="hero__badge tech-mono">
        <span class="pulse-dot"></span>
        <span>REACTBITS WEBGL2 LIGHT RAYS · 3D SMARTPHONE TROPHY</span>
      </div>
      <h1 class="hero__title">
        빛으로 조각된 두 거인의 대결,<br />
        <span class="accent">스펙과 최저가를 한눈에 비교하세요</span>
      </h1>
      <p class="hero__desc">
        마우스 커서가 볼류메트릭 광선을 조종하며 실시간 그림자를 드리우고, 광선 중앙의 3D 스마트폰 트로피를 드래그해 360°로 회전해 볼 수 있습니다.
      </p>

      <!-- Fast Search Bar -->
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

      <!-- Category Quick Links -->
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

    <!-- 3D Smartphone Trophy Stage (Three.js Floating Flagships with 360° Drag) -->
    <HeroTrophyStage />
  </section>

  <!-- 2. FLEX CAROUSEL: Infinite Image Row through Invisible Liquid Glass Edges (from ide.html) -->
  <FlexCarousel :products="allProducts" />

  <!-- 3. AI HARDWARE ADVISOR & VOLUMETRIC LASERFLOW (Replacing Drift Wall with AI & Lightning!) -->
  <AiLaserAdvisor />

  <!-- 4. BENTO 1:1 SPEC MATCHUP & SHOPPING MALLS (from ide.html & Phase 6 Core) -->
  <section id="matchup" class="wrap bento-section">
    <div class="section-head">
      <div>
        <p class="section-kicker tech-mono">PRECISION 12-SPEC MATRIX &amp; LIVE PRICE</p>
        <h2 class="section-title">스마트폰 · 태블릿 · 워치 1:1 스펙 매치업 대시보드</h2>
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

          <!-- Dual Comparison Progress Bars (from ide.html) -->
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
                {{ totalCount || 99 }}<span class="mini-card__unit">종</span>
              </div>
              <div class="text-sub mini-card__sub">노트북·오디오 포함 9대 브랜드 99종 수록</div>
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

        <!-- Real-Time Shopping Mall Quick Links Card (from ide.html) -->
        <div class="glass-card mall-search-card">
          <div class="mall-search-head">
            <div class="mall-title-box">
              <span class="section-kicker tech-mono">REAL-TIME SHOPPING LINKS</span>
              <h3 class="mall-h3">
                <span>{{ slotAProduct ? slotAProduct.name : '4대 쇼핑몰' }}</span>
                <span class="text-accent">최저가 즉시 검색</span>
              </h3>
            </div>
            <span class="badge-style tech-mono mall-badge">
              <ShoppingBag :size="11" />
              <span>실시간 연동</span>
            </span>
          </div>

          <p class="mall-desc">
            선택된 모델명과 공식 모델 번호({{ slotAProduct?.baseModelNumber ?? 'SM-S938N' }})로 각 쇼핑몰의 최저가 검색 결과를 바로 엽니다.
          </p>

          <div class="mall-list">
            <a
              v-for="link in slotAShoppingLinks"
              :key="link.id"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="mall-item"
            >
              <span>{{ link.mallName }}</span>
              <ExternalLink :size="13" class="text-accent" />
            </a>
          </div>
        </div>

        <!-- Bottom Brand Index & AI Comparison Summary Card -->
        <div class="glass-card coaching-card">
          <div>
            <div class="coaching-card__head">
              <span class="text-accent coaching-card__title">✦ TechCompare 라인업 색인 & 코칭</span>
              <span class="badge-style coaching-card__badge tech-mono">제조사 정식 라인업</span>
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

    <!-- Preset Matchup Ledger (from ide.html) -->
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

  <!-- 5. Recent Verified Products Grid -->
  <section class="wrap section-block">
    <div class="section-head">
      <div>
        <p class="section-kicker tech-mono">LATEST VERIFIED RELEASES</p>
        <h2 class="section-title">최근 출시 제품</h2>
      </div>
      <RouterLink :to="{ name: 'catalog', query: { sort: 'release_desc' } }" class="btn btn--secondary tech-mono">
        전체 카탈로그 보기 ({{ totalCount || 99 }})
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
/* 1. HERO SECTION (from ide.html) */
.hero {
  position: relative;
  min-height: 880px;
  padding-top: 56px;
  padding-bottom: 48px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid var(--divider);
}

.hero__content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 820px;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--badge-bg);
  color: var(--badge-text);
  border: 1px solid var(--card-border);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 16px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

.hero__title {
  font-size: clamp(34px, 3.8vw + 14px, 58px);
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.hero__title .accent {
  color: var(--accent);
  text-shadow: 0 0 32px rgba(0, 150, 255, 0.35);
}

.hero__desc {
  margin-top: 14px;
  font-size: 16px;
  color: var(--text-sub);
  max-width: 58ch;
  line-height: 1.6;
}

.search {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  width: 100%;
  max-width: 640px;
  height: 52px;
  padding: 0 6px 0 var(--s-4);
  border-radius: 999px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
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
  height: 40px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.hero__cats {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
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
  background: var(--card-inner);
  border: 1px solid var(--card-border);
  transition: all 0.2s;
}

.cat-link:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-2px);
}

.cat-link__count {
  font-size: 11px;
  color: var(--text-sub);
}

/* 4. BENTO SECTION & 1:1 MATCHUP (from ide.html) */
.bento-section {
  padding-top: 88px;
  padding-bottom: 64px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.section-kicker {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.08em;
}

.section-title {
  font-size: clamp(24px, 2vw + 14px, 36px);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-top: 4px;
}

.cat-Step-tabs {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--card-inner);
  border: 1px solid var(--card-border);
  border-radius: 999px;
}

.cat-step-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 0;
  background: transparent;
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cat-step-btn.is-active {
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-bottom: 28px;
}

.bento-main {
  grid-column: span 7;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
}

.bento-main__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
  gap: 16px;
  margin-bottom: 20px;
}

.device-slot {
  padding: 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--card-inner);
  border: 1px solid var(--card-border);
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
  height: 38px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--card-border);
  background: var(--bg-main);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
}

.device-slot__preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.device-slot__thumb {
  width: 60px;
  height: 60px;
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
  font-size: 15px;
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
  font-size: 16px;
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
  height: 11px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  gap: 4px;
  padding: 2px;
  background: var(--track-bg);
}

.bar-item__track > div {
  height: 100%;
  border-radius: 999px;
}

.bento-main__foot {
  padding-top: 16px;
  border-top: 1px solid var(--divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.bento-side {
  grid-column: span 5;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.mini-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.mini-card__body {
  margin: 8px 0;
}

.mini-card__val {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
}

.mini-card__unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sub);
  margin-left: 2px;
}

.mini-card__sub {
  font-size: 11px;
  margin-top: 4px;
}

.mini-card__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--track-bg);
}

.mini-card__bar > div {
  height: 100%;
  border-radius: 999px;
}

/* Mall Search Card (from ide.html) */
.mall-search-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mall-search-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.mall-title-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mall-h3 {
  font-size: 18px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mall-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}

.mall-desc {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

.mall-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
}

.mall-item {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--card-inner);
  border: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
  transition: transform 0.2s, border-color 0.2s;
}

.mall-item:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}

/* Coaching Card */
.coaching-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
}

.coaching-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
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
  padding: 10px 0;
}

.brand-ledger__row + .brand-ledger__row {
  border-top: 1px solid var(--divider);
}

.brand-ledger__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.brand-ledger__title {
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.brand-ledger__title[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.brand-ledger__all {
  font-size: 11px;
  color: var(--accent);
  text-decoration: none;
}

.brand-ledger__desc {
  font-size: 11px;
  color: var(--text-sub);
  margin-bottom: 6px;
  line-height: 1.4;
}

.brand-ledger__series {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  list-style: none;
}

.series-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--card-inner);
  border: 1px solid var(--divider);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-sub);
  text-decoration: none;
}

.series-tag:hover {
  border-color: var(--accent);
  color: var(--text-main);
}

.coaching-card__cta {
  height: 40px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
}

/* Preset Matchup Ledger */
.matchup-ledger {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 18px;
}

.matchup-row {
  display: grid;
  grid-template-columns: 180px 1fr 150px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-main);
  transition: all 0.2s;
}

.matchup-row:hover {
  background: var(--card-inner);
}

.matchup-row + .matchup-row {
  border-top: 1px solid var(--divider);
}

.matchup-row__cat {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
}

.matchup-row__pair {
  display: flex;
  align-items: center;
  gap: 14px;
}

.matchup-row__device {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.matchup-row__device strong {
  font-size: 14px;
  font-weight: 800;
}

.matchup-row__device small {
  font-size: 11px;
  color: var(--text-sub);
}

.matchup-row__vs {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 150, 255, 0.1);
}

.matchup-row__cta {
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

/* 5. Recent products block */
.section-block {
  padding: 64px 0 96px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

@media (max-width: 980px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-main,
  .bento-side {
    grid-column: span 12;
  }
  .matchup-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .matchup-row__cta {
    text-align: left;
  }
}
</style>
