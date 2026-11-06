<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, ArrowRight, Smartphone, Tablet, Watch, Scale } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api, ApiClientError } from '@/services/api'
import type { CategorySlug, ProductSummaryRecord } from '@/types/api'
import ProductCard from '@/components/product/ProductCard.vue'

const router = useRouter()
const query = ref('')
const allProducts = ref<ProductSummaryRecord[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

// Interactive 1:1 Quick Compare Builder state
const pickerCategory = ref<CategorySlug>('smartphone')
const slotASlug = ref('iphone-16-pro-max')
const slotBSlug = ref('galaxy-s24-ultra')

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
  <!-- 1. Hero: Architectural Split + Brand Index Ledger -->
  <section class="hero">
    <div class="wrap hero__grid">
      <div class="hero__main">
        <p class="label hero__fact">
          스마트폰 · 태블릿 · 스마트워치 ·
          <span class="num">Apple · Samsung {{ totalCount || 50 }}종 수록</span>
        </p>
        <h1 class="hero__h1">원하는 두 기기를 골라 스펙과 최저가를 한눈에 비교하세요</h1>
        <p class="hero__lead">
          프로세서·디스플레이·주사율·카메라·무게·출고가 비교부터 다나와·네이버쇼핑·쿠팡 최저가 조회까지 한 화면에서 확인할 수 있습니다.
        </p>

        <form class="search" role="search" @submit.prevent="submit">
          <Search :size="18" class="search__icon" aria-hidden="true" />
          <label for="home-search" class="sr-only">제품명 또는 모델 번호 검색</label>
          <input
            id="home-search"
            v-model="query"
            class="search__input"
            type="search"
            placeholder="제품명 또는 모델 번호 검색 (예: iPhone 16 Pro, SM-S928N, A2836)"
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
            class="cat-link"
          >
            <component :is="cat.icon" :size="15" aria-hidden="true" />
            <span>{{ cat.name }}</span>
            <span class="num cat-link__count">{{ cat.count }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Right Column: Structured Brand Index -->
      <aside class="brand-ledger" aria-label="브랜드별 제품군 색인">
        <div class="brand-ledger__header">
          <span class="label">제조사 공식 라인업 색인</span>
          <span class="label num">2 Brands · {{ totalCount || 30 }} Models</span>
        </div>

        <div v-for="b in brandLinks" :key="b.slug" class="brand-ledger__row">
          <div class="brand-ledger__top">
            <div>
              <h2 class="brand-ledger__title" :data-brand="b.slug">{{ b.name }}</h2>
              <p class="brand-ledger__desc">{{ b.desc }}</p>
            </div>
            <RouterLink :to="{ name: 'catalog', query: { brand: b.slug } }" class="brand-ledger__all">
              <span class="num">{{ b.countLabel }}</span> →
            </RouterLink>
          </div>

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
      </aside>
    </div>
  </section>

  <!-- 2. Interactive 2-Device Selector & Quick Matchup Builder -->
  <section class="matchup-band">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="label">카테고리별 직관적 1:1 비교 선택기</p>
          <h2 class="section-h2">스마트폰 · 태블릿 · 워치 두 기기를 선택해 바로 비교하세요</h2>
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
            <small class="num">({{ cat.count }})</small>
          </button>
        </div>
      </div>

      <!-- Visual 2-Slot Device Selector -->
      <div class="quick-builder">
        <div class="quick-slot">
          <div class="quick-slot__head">
            <span class="label">비교 기기 1</span>
            <span v-if="slotAProduct" class="quick-slot__brand" :data-brand="slotAProduct.brand.slug">
              {{ slotAProduct.brand.name }}
            </span>
          </div>
          <select v-model="slotASlug" class="quick-slot__select" aria-label="비교 기기 1 선택">
            <option v-for="p in categoryProducts" :key="p.id" :value="p.slug">
              [{{ p.brand.name }}] {{ p.name }} ({{ p.baseModelNumber }})
            </option>
          </select>
          <div v-if="slotAProduct" class="quick-slot__preview">
            <div v-if="slotAProduct.thumbnailUrl" class="quick-slot__thumb">
              <img :src="slotAProduct.thumbnailUrl" :alt="slotAProduct.name" />
            </div>
            <div class="quick-slot__meta num">
              <strong>{{ slotAProduct.name }}</strong>
              <span>모델명: {{ slotAProduct.baseModelNumber }} · 출시: {{ slotAProduct.releaseDate }}</span>
              <span class="quick-slot__price">출고가: {{ formatKrw(slotAProduct.launchPriceKrw) }}</span>
            </div>
          </div>
        </div>

        <div class="quick-vs">
          <span class="quick-vs__badge num">VS</span>
        </div>

        <div class="quick-slot">
          <div class="quick-slot__head">
            <span class="label">비교 기기 2</span>
            <span v-if="slotBProduct" class="quick-slot__brand" :data-brand="slotBProduct.brand.slug">
              {{ slotBProduct.brand.name }}
            </span>
          </div>
          <select v-model="slotBSlug" class="quick-slot__select" aria-label="비교 기기 2 선택">
            <option v-for="p in categoryProducts" :key="p.id" :value="p.slug">
              [{{ p.brand.name }}] {{ p.name }} ({{ p.baseModelNumber }})
            </option>
          </select>
          <div v-if="slotBProduct" class="quick-slot__preview">
            <div v-if="slotBProduct.thumbnailUrl" class="quick-slot__thumb">
              <img :src="slotBProduct.thumbnailUrl" :alt="slotBProduct.name" />
            </div>
            <div class="quick-slot__meta num">
              <strong>{{ slotBProduct.name }}</strong>
              <span>모델명: {{ slotBProduct.baseModelNumber }} · 출시: {{ slotBProduct.releaseDate }}</span>
              <span class="quick-slot__price">출고가: {{ formatKrw(slotBProduct.launchPriceKrw) }}</span>
            </div>
          </div>
        </div>

        <div class="quick-action">
          <button
            type="button"
            class="btn btn--primary quick-action__btn"
            :disabled="!slotASlug || !slotBSlug || slotASlug === slotBSlug"
            @click="runQuickCompare"
          >
            <Scale :size="16" aria-hidden="true" />
            <span>{{
              slotASlug === slotBSlug ? '서로 다른 기기를 선택하세요' : '두 기기 비교 결과 보기'
            }}</span>
          </button>
        </div>
      </div>

      <!-- Preset Matchup Ledger -->
      <div class="matchup-ledger" role="list">
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
              <small class="num">{{ m.leftCode }}</small>
            </span>
            <span class="matchup-row__vs num">VS</span>
            <span class="matchup-row__device">
              <strong>{{ m.rightName }}</strong>
              <small class="num">{{ m.rightCode }}</small>
            </span>
          </div>
          <span class="matchup-row__cta">사양 비교표 열기 →</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <!-- 3. Recent Verified Products Grid -->
  <section class="wrap section-block">
    <div class="section-head">
      <div>
        <p class="label">출시일 기준 최신 등록 모델</p>
        <h2 class="section-h2">최근 출시 제품</h2>
      </div>
      <RouterLink :to="{ name: 'catalog', query: { sort: 'release_desc' } }" class="btn btn--secondary">
        전체 카탈로그 보기 ({{ totalCount || 30 }})
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
  padding: var(--s-8) 0;
  border-bottom: 1px solid var(--hairline);
}

.hero__grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--grid-gap);
  align-items: start;
}

.hero__main {
  grid-column: 1 / span 7;
}

.hero__fact {
  margin-bottom: var(--s-3);
}

.hero__h1 {
  font-size: var(--t-h1);
  line-height: 1.12;
  letter-spacing: -0.03em;
  max-width: 19ch;
}

.hero__lead {
  margin-top: var(--s-4);
  font-size: var(--t-lead);
  line-height: 1.6;
  color: var(--c-text);
  max-width: 52ch;
}

.search {
  margin-top: var(--s-6);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 52px;
  padding: 0 6px 0 var(--s-4);
  background: var(--g-alt);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  max-width: 600px;
  transition: border-color var(--m-in) var(--m-ease);
}

.search:focus-within {
  border-color: var(--action);
}

.search__icon {
  color: var(--muted);
  flex: none;
}

.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 15px;
  outline: none;
}

.search__input::placeholder {
  color: var(--muted);
}

.search__btn {
  height: 40px;
  padding: 0 var(--s-4);
  font-size: 14px;
}

.hero__cats {
  margin-top: var(--s-5);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
}

.cat-link {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  height: 36px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline);
  background: transparent;
  font-size: var(--t-small);
  color: var(--c-text);
  transition:
    border-color var(--m-in) var(--m-ease),
    color var(--m-in) var(--m-ease);
}

.cat-link:hover {
  border-color: var(--action);
  color: var(--ink);
}

.cat-link__count {
  font-size: 12px;
  color: var(--muted);
}

.brand-ledger {
  grid-column: 8 / span 5;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  background: var(--g-alt);
}

.brand-ledger__header {
  padding: var(--s-3) var(--s-5);
  border-bottom: 1px solid var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-ledger__row {
  padding: var(--s-5);
}

.brand-ledger__row + .brand-ledger__row {
  border-top: 1px solid var(--hairline);
}

.brand-ledger__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--s-3);
}

.brand-ledger__title {
  font-size: var(--t-h3);
  font-weight: 600;
}

.brand-ledger__title[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.brand-ledger__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}

.brand-ledger__all {
  font-size: 13px;
  font-weight: 500;
  color: var(--action);
  white-space: nowrap;
}

.brand-ledger__series {
  list-style: none;
  margin: var(--s-4) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.series-tag {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  font-size: 12px;
  color: var(--c-text);
  background: var(--card);
  transition: border-color var(--m-in) var(--m-ease);
}

.series-tag:hover {
  border-color: var(--action);
  color: var(--ink);
}

/* 2. Matchup Band & Interactive Builder */
.matchup-band {
  padding: var(--s-8) 0;
  background: var(--g-alt);
  border-bottom: 1px solid var(--hairline);
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
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--card);
  color: var(--c-text);
  font-size: var(--t-small);
  font-weight: 500;
  cursor: pointer;
}

.cat-step-btn.is-active {
  border-color: var(--action-border);
  background: var(--action-subtle);
  color: var(--ink);
}

.quick-builder {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: var(--s-4);
  align-items: stretch;
  padding: var(--s-5);
  background: var(--card);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  margin-bottom: var(--s-6);
}

.quick-slot {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.quick-slot__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-slot__brand {
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-apple);
}

.quick-slot__brand[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.quick-slot__select {
  height: 44px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--g-alt);
  color: var(--ink);
  font-size: var(--t-small);
  font-weight: 500;
}

.quick-slot__preview {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline);
  background: var(--g-alt);
}

.quick-slot__thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid var(--hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px;
}

.quick-slot__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.quick-slot__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--muted);
}

.quick-slot__meta strong {
  font-size: 14px;
  color: var(--ink);
}

.quick-slot__price {
  color: var(--c-text);
  font-weight: 600;
}

.quick-vs {
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-vs__badge {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--hairline-strong);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.quick-action {
  display: flex;
  align-items: center;
}

.quick-action__btn {
  height: 100%;
  min-height: 44px;
  white-space: nowrap;
}

.quick-action__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
  border-top: 1px solid var(--hairline-strong);
}

.matchup-row {
  display: grid;
  grid-template-columns: 180px 1fr 160px;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-3);
  border-bottom: 1px solid var(--hairline);
  transition: background-color var(--m-in) var(--m-ease);
}

.matchup-row:hover {
  background: var(--diff-row-bg);
}

.matchup-row__cat {
  font-size: 13px;
  color: var(--muted);
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
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.matchup-row__device small {
  font-size: 12px;
  color: var(--muted);
}

.matchup-row__vs {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--hairline-strong);
  color: var(--muted);
}

.matchup-row__cta {
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  color: var(--action);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--grid-gap);
}

.state-line {
  padding: var(--s-6) 0;
  color: var(--muted);
}

.bad {
  color: var(--price-rise);
}

.policy-ledger {
  margin-top: var(--s-8);
  padding-top: var(--s-6);
  border-top: 1px solid var(--hairline-strong);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--s-7);
}

.policy-ledger__title {
  font-size: var(--t-h3);
  margin-top: 6px;
}

.policy-ledger__body {
  margin-top: var(--s-2);
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--muted);
}

.policy-link {
  display: inline-block;
  margin-left: var(--s-2);
  color: var(--action);
  font-weight: 500;
}

@media (max-width: 1023px) {
  .hero__main,
  .brand-ledger {
    grid-column: 1 / -1;
  }
  .quick-builder {
    grid-template-columns: 1fr;
  }
  .quick-action__btn {
    width: 100%;
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
  .hero {
    padding: var(--s-7) 0;
  }
  .product-grid,
  .policy-ledger {
    grid-template-columns: 1fr;
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
