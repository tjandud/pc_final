<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { api, ApiClientError } from '@/services/api'
import { useCompareStore, COMPARE_MAX, COMPARE_MIN } from '@/stores/compare'
import { buildShoppingMallLinks } from '@/utils/shopping'
import TechIcon from '@/components/common/TechIcon.vue'
import type { CategorySlug, CompareProductItem, CompareResult, ProductSummaryRecord } from '@/types/api'

const route = useRoute()
const router = useRouter()
const compareStore = useCompareStore()
const { items, category, count } = storeToRefs(compareStore)

const compareData = ref<CompareResult | null>(null)
const candidateProducts = ref<ProductSummaryRecord[]>([])
const selectedAddSlug = ref('')
const browseCategory = ref<CategorySlug>('smartphone')
const quickSlotA = ref('')
const quickSlotB = ref('')
const showDiffOnly = ref(false)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const copiedUrl = ref(false)

function formatPriceKrw(price: number | null | undefined): string {
  if (price === null || price === undefined) return '정보 없음'
  return `₩${price.toLocaleString('ko-KR')}`
}

function getEntryShoppingLinks(entry: CompareProductItem) {
  return buildShoppingMallLinks({
    name: entry.product.name,
    brandSlug: entry.product.brand.slug,
    baseModelNumber: entry.selectedVariant?.modelNumber ?? entry.product.baseModelNumber,
    storageCapacity: entry.selectedVariant?.storageCapacity,
    connectivity: entry.selectedVariant?.connectivity,
    officialUrl: entry.product.dataSource?.sourceUrl ?? entry.product.brand.officialWebsite,
  })
}

const PRESETS = [
  {
    title: 'iPhone 16 Pro Max vs Galaxy S24 Ultra',
    categoryLabel: '스마트폰 플래그십',
    items: 'iphone-16-pro-max,galaxy-s24-ultra',
  },
  {
    title: 'MacBook Pro 16 (M3 Max) vs Galaxy Book4 Ultra',
    categoryLabel: '최상급 고사양 노트북 플래그십',
    items: 'macbook-pro-16-m3-max,galaxy-book4-ultra',
  },
  {
    title: 'LG gram Pro 16 vs Galaxy Book4 Pro 16',
    categoryLabel: '초경량 16인치 프리미엄 노트북',
    items: 'lg-gram-pro-16,galaxy-book4-pro-16',
  },
  {
    title: 'AirPods Pro 2 vs Galaxy Buds3 Pro vs Sony WF-1000XM5',
    categoryLabel: '3대 플래그십 노이즈 캔슬링 이어폰',
    items: 'airpods-pro-2-usbc,galaxy-buds3-pro,sony-wf-1000xm5',
  },
  {
    title: 'Sony WH-1000XM5 vs Bose QC Ultra Headphones',
    categoryLabel: '하이엔드 노이즈 캔슬링 헤드폰 1:1',
    items: 'sony-wh-1000xm5,bose-quietcomfort-ultra-headphones',
  },
  {
    title: 'iPad Pro 13 (M4) vs Galaxy Tab S10 Ultra',
    categoryLabel: '태블릿 대화면 플래그십',
    items: 'ipad-pro-13-m4,galaxy-tab-s10-ultra',
  },
  {
    title: 'Apple Watch Ultra 2 vs Galaxy Watch Ultra',
    categoryLabel: '스마트워치 익스트림 플래그십',
    items: 'apple-watch-ultra-2,galaxy-watch-ultra',
  },
]

const filteredRows = computed(() => {
  if (!compareData.value) return []
  return showDiffOnly.value
    ? compareData.value.specRows.filter((row) => row.isDifferent)
    : compareData.value.specRows
})

const availableCandidates = computed(() => {
  const existingSlugs = new Set(items.value.map((i) => i.productSlug))
  return candidateProducts.value.filter((p) => !existingSlugs.has(p.slug))
})

async function loadCandidatesForCategory(cat: CategorySlug) {
  try {
    const res = await api.products({ category: cat, limit: 100, sort: 'release_desc' })
    candidateProducts.value = res.data
    const firstApple = res.data.find((p) => p.brand.slug === 'apple') ?? res.data[0]
    const firstSamsung =
      res.data.find((p) => p.brand.slug === 'samsung' && p.slug !== firstApple?.slug) ??
      res.data[1]
    if (!quickSlotA.value || !res.data.some((p) => p.slug === quickSlotA.value)) {
      quickSlotA.value = firstApple?.slug ?? ''
    }
    if (!quickSlotB.value || !res.data.some((p) => p.slug === quickSlotB.value)) {
      quickSlotB.value = firstSamsung?.slug ?? ''
    }
  } catch {
    candidateProducts.value = []
  }
}

async function switchCategoryAndCompare(cat: CategorySlug) {
  browseCategory.value = cat
  compareStore.clear()
  compareData.value = null
  errorMsg.value = null
  await loadCandidatesForCategory(cat)
  if (quickSlotA.value && quickSlotB.value && quickSlotA.value !== quickSlotB.value) {
    applyDirectTwoSlotCompare()
  }
}

function applyDirectTwoSlotCompare() {
  if (!quickSlotA.value || !quickSlotB.value || quickSlotA.value === quickSlotB.value) return
  const nextQuery: Record<string, string> = {
    items: `${quickSlotA.value},${quickSlotB.value}`,
  }
  if (typeof route.query.theme === 'string') nextQuery.theme = route.query.theme
  router.replace({ path: '/compare', query: nextQuery })
}

function parseQueryItems(): string[] {
  const raw = typeof route.query.items === 'string' ? route.query.items : ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function syncStoreToUrl() {
  const param = compareStore.toQueryParam()
  const currentParam = typeof route.query.items === 'string' ? route.query.items : ''
  const nextQuery: Record<string, string> = {}
  if (param) nextQuery.items = param
  if (typeof route.query.theme === 'string') nextQuery.theme = route.query.theme
  if (param !== currentParam) {
    router.replace({
      path: '/compare',
      query: nextQuery,
    })
  }
}

async function runComparison(slugTokens: string[]) {
  if (slugTokens.length < COMPARE_MIN) {
    compareData.value = null
    errorMsg.value = null
    const targetCat = category.value ?? browseCategory.value
    await loadCandidatesForCategory(targetCat)
    return
  }

  loading.value = true
  errorMsg.value = null
  try {
    const data = await api.compare(slugTokens)
    compareData.value = data
    compareStore.setFromResolved(
      data.items.map((entry) => ({
        productSlug: entry.product.slug,
        name: entry.product.name,
        category: entry.product.category.slug,
        variantId: entry.selectedVariant?.id ?? null,
      })),
    )
    browseCategory.value = data.category.slug
    await loadCandidatesForCategory(data.category.slug)
    if (data.items[0]) quickSlotA.value = data.items[0].product.slug
    if (data.items[1]) quickSlotB.value = data.items[1].product.slug
  } catch (err) {
    compareData.value = null
    errorMsg.value =
      err instanceof ApiClientError ? err.message : '제품 비교 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function addCandidateProduct() {
  if (!selectedAddSlug.value) return
  const found = candidateProducts.value.find((p) => p.slug === selectedAddSlug.value)
  if (!found) return

  const res = compareStore.add({
    productSlug: found.slug,
    variantId: found.defaultVariantId,
    name: found.name,
    category: found.category.slug,
  })

  if (res !== 'added') {
    if (res === 'category_mismatch') {
      errorMsg.value = '동일한 카테고리의 제품만 함께 비교할 수 있습니다.'
    } else if (res === 'full') {
      errorMsg.value = `최대 ${COMPARE_MAX}개 제품까지만 비교할 수 있습니다.`
    }
    return
  }

  selectedAddSlug.value = ''
  syncStoreToUrl()
  runComparison(
    items.value.map((i) => (i.variantId ? `${i.productSlug}:${i.variantId}` : i.productSlug)),
  )
}

function removeCompareItem(productSlug: string) {
  compareStore.remove(productSlug)
  syncStoreToUrl()
  runComparison(
    items.value.map((i) => (i.variantId ? `${i.productSlug}:${i.variantId}` : i.productSlug)),
  )
}

function clearAllCompare() {
  compareStore.clear()
  compareData.value = null
  errorMsg.value = null
  const nextQuery: Record<string, string> = {}
  if (typeof route.query.theme === 'string') nextQuery.theme = route.query.theme
  router.replace({ path: '/compare', query: nextQuery })
}

async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copiedUrl.value = true
    setTimeout(() => {
      copiedUrl.value = false
    }, 2000)
  } catch {
    copiedUrl.value = false
  }
}

watch(
  () => route.query.items,
  (newQueryItems) => {
    const queryTokens =
      typeof newQueryItems === 'string'
        ? newQueryItems
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    if (queryTokens.length >= COMPARE_MIN) {
      runComparison(queryTokens)
    } else if (items.value.length >= COMPARE_MIN && !newQueryItems) {
      syncStoreToUrl()
      runComparison(
        items.value.map((i) => (i.variantId ? `${i.productSlug}:${i.variantId}` : i.productSlug)),
      )
    } else {
      compareData.value = null
      loadCandidatesForCategory(category.value ?? browseCategory.value)
    }
  },
)

onMounted(async () => {
  const queryTokens = parseQueryItems()
  if (queryTokens.length >= COMPARE_MIN) {
    runComparison(queryTokens)
  } else if (items.value.length >= COMPARE_MIN) {
    syncStoreToUrl()
    runComparison(
      items.value.map((i) => (i.variantId ? `${i.productSlug}:${i.variantId}` : i.productSlug)),
    )
  } else {
    await loadCandidatesForCategory(category.value ?? browseCategory.value)
    if (quickSlotA.value && quickSlotB.value && quickSlotA.value !== quickSlotB.value) {
      applyDirectTwoSlotCompare()
    }
  }
})
</script>

<template>
  <div class="wrap compare-page">
    <header class="compare-head">
      <div>
        <p class="label">동일 카테고리 사양 및 출고가 매트릭스</p>
        <h1 class="compare-head__title">제품 사양 및 가격 비교 분석</h1>
        <p class="muted compare-head__sub">
          카테고리(스마트폰 · 태블릿 · 스마트워치)를 선택하고 기기 <span class="num">{{ COMPARE_MIN }}–{{ COMPARE_MAX }}</span>종을
          고르면, 가격 차이·우위 사양·전체 스펙을 즉시 비교 분석합니다.
        </p>
      </div>

      <div v-if="compareData" class="compare-head__actions">
        <label class="diff-toggle">
          <input v-model="showDiffOnly" type="checkbox" />
          <span>차이 있는 항목만 보기</span>
        </label>
        <button type="button" class="btn btn--secondary btn--compact" @click="copyShareUrl">
          {{ copiedUrl ? '공유 URL 복사됨' : '비교 URL 복사' }}
        </button>
        <button type="button" class="btn btn--secondary btn--compact" @click="clearAllCompare">
          초기화
        </button>
      </div>
    </header>

    <!-- Step 1 & 2: Intuitive Category + 2-Device Direct Picker + Multi-Device Add -->
    <section class="selector-strip" aria-label="비교 제품 선택">
      <div class="selector-strip__status">
        <div class="cat-tabs" role="tablist" aria-label="비교 카테고리 전환">
          <button
            type="button"
            class="cat-tab"
            :class="{ 'cat-tab--active': (category ?? browseCategory) === 'smartphone' }"
            @click="switchCategoryAndCompare('smartphone')"
          >
            스마트폰 (30)
          </button>
          <button
            type="button"
            class="cat-tab"
            :class="{ 'cat-tab--active': (category ?? browseCategory) === 'tablet' }"
            @click="switchCategoryAndCompare('tablet')"
          >
            태블릿 (19)
          </button>
          <button
            type="button"
            class="cat-tab"
            :class="{ 'cat-tab--active': (category ?? browseCategory) === 'laptop' }"
            @click="switchCategoryAndCompare('laptop')"
          >
            노트북 (20)
          </button>
          <button
            type="button"
            class="cat-tab"
            :class="{ 'cat-tab--active': (category ?? browseCategory) === 'smartwatch' }"
            @click="switchCategoryAndCompare('smartwatch')"
          >
            스마트워치 (10)
          </button>
          <button
            type="button"
            class="cat-tab"
            :class="{ 'cat-tab--active': (category ?? browseCategory) === 'audio' }"
            @click="switchCategoryAndCompare('audio')"
          >
            오디오/헤드셋 (20)
          </button>
        </div>

        <span class="selector-strip__badge">
          현재 비교 중 <strong class="num">{{ count }} / {{ COMPARE_MAX }}</strong>
        </span>
      </div>

      <!-- Direct 1:1 Selector Row -->
      <div class="pair-picker">
        <div class="pair-picker__field">
          <label class="label" for="cmp-slot-a">비교 기기 1</label>
          <select id="cmp-slot-a" v-model="quickSlotA" class="selector-strip__select">
            <option v-for="cand in candidateProducts" :key="cand.id" :value="cand.slug">
              [{{ cand.brand.name }}] {{ cand.name }} ({{ cand.baseModelNumber }})
            </option>
          </select>
        </div>

        <span class="pair-picker__vs num">VS</span>

        <div class="pair-picker__field">
          <label class="label" for="cmp-slot-b">비교 기기 2</label>
          <select id="cmp-slot-b" v-model="quickSlotB" class="selector-strip__select">
            <option v-for="cand in candidateProducts" :key="cand.id" :value="cand.slug">
              [{{ cand.brand.name }}] {{ cand.name }} ({{ cand.baseModelNumber }})
            </option>
          </select>
        </div>

        <button
          type="button"
          class="btn btn--primary pair-picker__btn"
          :disabled="!quickSlotA || !quickSlotB || quickSlotA === quickSlotB"
          @click="applyDirectTwoSlotCompare"
        >
          1:1 즉시 비교
        </button>
      </div>

      <!-- Optional 3rd / 4th Device Add Row -->
      <div v-if="count >= 2 && count < COMPARE_MAX" class="selector-strip__controls">
        <select
          v-model="selectedAddSlug"
          class="selector-strip__select"
          aria-label="3번째 또는 4번째 비교 제품 추가"
        >
          <option value="">
            + 3~4번째 비교 기기 추가 선택 ({{ availableCandidates.length }}개 가능)
          </option>
          <option v-for="cand in availableCandidates" :key="cand.id" :value="cand.slug">
            [{{ cand.brand.name }}] {{ cand.name }} ({{ cand.baseModelNumber }})
          </option>
        </select>
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="!selectedAddSlug"
          @click="addCandidateProduct"
        >
          + 비교 열 추가
        </button>
      </div>

      <div v-if="items.length > 0" class="selected-pills">
        <span v-for="item in items" :key="item.productSlug" class="selected-pill">
          <span>{{ item.name }}</span>
          <button type="button" aria-label="제거" @click="removeCompareItem(item.productSlug)">×</button>
        </span>
      </div>
    </section>

    <!-- Error Notice -->
    <div v-if="errorMsg" class="error-banner" role="alert">
      <p class="error-banner__title">비교 조건 안내</p>
      <p class="muted">{{ errorMsg }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="empty-box">
      <p class="muted">비교 데이터를 불러오는 중입니다...</p>
    </div>

    <!-- Less than 2 products selected: show preset shortcuts -->
    <section v-else-if="!compareData" class="empty-box">
      <h2 class="empty-box__title">
        위에서 ‘비교 기기 1’과 ‘비교 기기 2’를 선택하고 [1:1 즉시 비교]를 누르거나 대표 조합을 클릭하세요
      </h2>
      <div class="preset-ledger">
        <RouterLink
          v-for="preset in PRESETS"
          :key="preset.items"
          :to="`/compare?items=${preset.items}`"
          class="preset-row"
        >
          <span class="preset-row__cat">{{ preset.categoryLabel }}</span>
          <strong class="preset-row__title">{{ preset.title }}</strong>
          <span class="preset-row__cta">비교표 보기 →</span>
        </RouterLink>
      </div>
    </section>

    <!-- Comparison Analysis Report + Matrix Table -->
    <template v-else>
      <section class="analysis-panel" aria-label="핵심 비교 분석 리포트">
        <div class="analysis-panel__head">
          <div>
            <p class="label">스펙 · 출고가 비교 요약</p>
            <h2 class="analysis-panel__title">핵심 비교 분석 리포트</h2>
          </div>
          <span class="label num">
            전체 {{ compareData.analysis.totalSpecsCount }}개 항목 중
            {{ compareData.analysis.differingSpecsCount }}개 항목 차이
          </span>
        </div>

        <!-- Scorecards per product -->
        <div class="scorecard-grid">
          <div
            v-for="card in compareData.analysis.scorecards"
            :key="card.productSlug"
            class="scorecard"
          >
            <div class="scorecard__top">
              <span class="scorecard__brand">{{ card.brandName }}</span>
              <span class="scorecard__wins num">우위 항목 {{ card.winCount }}개</span>
            </div>
            <strong class="scorecard__name">{{ card.productName }}</strong>
            <span class="scorecard__price num">
              공식 출고가: {{ formatPriceKrw(card.launchPriceKrw) }}
            </span>
            <div v-if="card.winningSpecs.length > 0" class="scorecard__tags">
              <span v-for="w in card.winningSpecs" :key="w" class="win-tag">{{ w }} 우위</span>
            </div>
            <p v-else class="label">수치 우위 항목 없음 (동급 또는 중립 사양)</p>
          </div>
        </div>

        <!-- Factual Highlights -->
        <ul class="analysis-highlights">
          <li v-for="(hl, idx) in compareData.analysis.highlights" :key="idx">
            {{ hl }}
          </li>
        </ul>
      </section>

      <section class="table-wrap" aria-label="사양 비교 표">
        <div class="table-scroll">
          <table class="compare-table">
            <thead>
              <tr>
                <th scope="col" class="compare-table__corner">
                  <span class="label">{{ compareData.category.name }}</span>
                  <strong>비교 항목</strong>
                </th>
                <th
                  v-for="entry in compareData.items"
                  :key="entry.product.id"
                  scope="col"
                  class="compare-table__prod-head"
                >
                  <div class="prod-head">
                    <div class="prod-head__top">
                      <span class="brand-badge" :data-brand="entry.product.brand.slug">
                        <TechIcon :name="entry.product.brand.slug" :size="13" />
                        <span>{{ entry.product.brand.name }}</span>
                      </span>
                      <button
                        type="button"
                        class="prod-head__remove"
                        @click="removeCompareItem(entry.product.slug)"
                      >
                        제거
                      </button>
                    </div>
                    <RouterLink
                      v-if="entry.product.thumbnailUrl"
                      :to="`/products/${entry.product.slug}`"
                      class="prod-head__img-box"
                    >
                      <img :src="entry.product.thumbnailUrl" :alt="entry.product.name" />
                    </RouterLink>
                    <RouterLink :to="`/products/${entry.product.slug}`" class="prod-head__name">
                      {{ entry.product.name }}
                    </RouterLink>
                    <span class="prod-head__meta num">
                      {{ entry.product.baseModelNumber }} · {{ entry.product.releaseDate }}
                    </span>
                    <span v-if="entry.selectedVariant" class="prod-head__variant">
                      기준 변형: {{ entry.selectedVariant.storageCapacity ?? '기본' }} /
                      {{ entry.selectedVariant.connectivity ?? '기본' }}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              <!-- Price Comparison Rows -->
              <tr class="compare-row compare-row--price">
                <th scope="row" class="compare-row__label">
                  <span>공식 출고가</span>
                  <small class="label">KRW</small>
                </th>
                <td
                  v-for="entry in compareData.items"
                  :key="`launch-${entry.product.id}`"
                  class="compare-row__cell num"
                  :class="{
                    'compare-row__cell--winner':
                      compareData.analysis.lowestPriceProductSlug === entry.product.slug &&
                      (compareData.analysis.priceGapKrw ?? 0) > 0,
                  }"
                >
                  <strong>{{
                    formatPriceKrw(
                      entry.selectedVariant?.launchPriceKrw ?? entry.product.launchPriceKrw,
                    )
                  }}</strong>
                  <span
                    v-if="
                      compareData.analysis.lowestPriceProductSlug === entry.product.slug &&
                      (compareData.analysis.priceGapKrw ?? 0) > 0
                    "
                    class="winner-badge"
                  >
                    최저 출고가
                  </span>
                </td>
              </tr>

              <tr class="compare-row compare-row--shopping">
                <th scope="row" class="compare-row__label">
                  <span>실시간 쇼핑몰 최저가 조회</span>
                  <small class="label">다나와 · 네이버 · 쿠팡 자동검색</small>
                </th>
                <td
                  v-for="entry in compareData.items"
                  :key="`curr-${entry.product.id}`"
                  class="compare-row__cell"
                >
                  <div class="compare-shop-box">
                    <span class="compare-shop-query num">
                      검색어: {{ entry.product.name }}
                      {{ entry.selectedVariant?.storageCapacity ?? '' }}
                      ({{ entry.selectedVariant?.modelNumber ?? entry.product.baseModelNumber }})
                    </span>
                    <div class="compare-shop-btns">
                      <a
                        v-for="mall in getEntryShoppingLinks(entry)"
                        :key="mall.id"
                        :href="mall.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="compare-shop-btn"
                        :class="`compare-shop-btn--${mall.id}`"
                      >
                        <TechIcon :name="mall.id" :size="12" />
                        <span>
                          {{
                            mall.id === 'danawa'
                              ? '다나와 최저가 ↗'
                              : mall.id === 'naver'
                                ? '네이버쇼핑 ↗'
                                : mall.id === 'coupang'
                                  ? '쿠팡 로켓배송 ↗'
                                  : '공식스토어 ↗'
                          }}
                        </span>
                      </a>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Category Specification Rows -->
              <tr
                v-for="row in filteredRows"
                :key="row.specKey"
                class="compare-row"
                :class="{ 'compare-row--diff': row.isDifferent }"
              >
                <th scope="row" class="compare-row__label">
                  <span class="compare-row__label-main">
                    <TechIcon :name="row.specKey" :size="15" />
                    <span>{{ row.displayName }}</span>
                  </span>
                  <small v-if="row.unit" class="label">{{ row.unit }}</small>
                </th>
                <td
                  v-for="cell in row.cells"
                  :key="`${row.specKey}-${cell.productSlug}`"
                  class="compare-row__cell"
                  :class="{
                    'compare-row__cell--winner': cell.isWinner,
                    'compare-row__cell--null': cell.value === null,
                    num: cell.numericValue !== null,
                  }"
                >
                  <span>{{ cell.displayValue }}</span>
                  <span v-if="cell.isWinner" class="winner-badge">우위</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.compare-page {
  padding-top: var(--s-7);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.compare-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  flex-wrap: wrap;
}

.compare-head__title {
  font-size: var(--t-h2);
  margin-top: 4px;
}

.compare-head__sub {
  margin-top: var(--s-2);
  font-size: var(--t-small);
}

.compare-head__actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.diff-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--c-text);
  cursor: pointer;
}

.btn--compact {
  height: 38px;
  padding: 0 var(--s-4);
  font-size: var(--t-small);
}

/* Selector Strip */
.selector-strip {
  padding: var(--s-4) var(--s-5);
  background: var(--g-alt);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.selector-strip__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.selector-strip__badge {
  font-size: var(--t-small);
  color: var(--c-text);
}

.cat-tabs {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
}

.cat-tab {
  height: 34px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline);
  background: var(--card);
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.cat-tab--active {
  border-color: var(--action-border);
  color: var(--ink);
  background: var(--action-subtle);
}

.pair-picker {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: var(--s-3);
  align-items: end;
}

.pair-picker__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pair-picker__vs {
  height: var(--btn-h);
  display: inline-flex;
  align-items: center;
  padding: 0 var(--s-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.pair-picker__btn {
  white-space: nowrap;
}

.selector-strip__controls {
  display: flex;
  gap: var(--s-3);
  flex-wrap: wrap;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
}

.selector-strip__select {
  flex: 1;
  min-width: 220px;
  height: var(--btn-h);
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--card);
  color: var(--ink);
  font-size: var(--t-small);
}

.selected-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.selected-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  height: 30px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  background: var(--card);
  border: 1px solid var(--hairline-strong);
  font-size: 12px;
  color: var(--ink);
}

.selected-pill button {
  background: transparent;
  border: 0;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
}

/* Comparison Analysis Panel */
.analysis-panel {
  padding: var(--s-5);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  background: var(--g-alt);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.analysis-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.analysis-panel__title {
  font-size: var(--t-h3);
  margin-top: 2px;
}

.scorecard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--s-3);
}

.scorecard {
  padding: var(--s-4);
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scorecard__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scorecard__brand {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.scorecard__wins {
  font-size: 12px;
  font-weight: 600;
  color: var(--spec-win);
}

.scorecard__name {
  font-size: 17px;
  color: var(--ink);
}

.scorecard__price {
  font-size: 13px;
  color: var(--c-text);
}

.scorecard__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.win-tag {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--spec-win-bg);
  color: var(--spec-win);
  font-size: 11px;
  font-weight: 600;
}

.analysis-highlights {
  margin: 0;
  padding: var(--s-3) var(--s-4) 0 var(--s-5);
  border-top: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--t-small);
  color: var(--c-text);
}

.error-banner {
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--price-rise);
  border-radius: var(--r-md);
  background: var(--g-alt);
}

.error-banner__title {
  font-weight: 600;
  color: var(--price-rise);
  margin-bottom: 4px;
}

.empty-box {
  padding: var(--s-5) 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.empty-box__title {
  font-size: var(--t-h3);
}

.preset-ledger {
  margin-top: var(--s-2);
  border-top: 1px solid var(--hairline-strong);
}

.preset-row {
  display: grid;
  grid-template-columns: 160px 1fr 120px;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-3);
  border-bottom: 1px solid var(--hairline);
}

.preset-row:hover {
  background: var(--diff-row-bg);
}

.preset-row__cat {
  font-size: 12px;
  color: var(--muted);
}

.preset-row__title {
  font-size: 15px;
  color: var(--ink);
}

.preset-row__cta {
  text-align: right;
  font-size: 13px;
  color: var(--action);
}

/* Comparison Matrix Table */
.table-wrap {
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  background: var(--card);
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.compare-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  text-align: left;
}

.compare-table th,
.compare-table td {
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
}

.compare-table__corner {
  width: 180px;
  background: var(--g-alt);
  border-right: 1px solid var(--hairline);
}

.compare-table__corner strong {
  display: block;
  margin-top: 4px;
  font-size: var(--t-small);
  color: var(--ink);
}

.compare-table__prod-head {
  background: var(--g-alt);
  min-width: 220px;
}

.prod-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prod-head__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-apple);
}

.brand-badge[data-brand='samsung'] {
  color: var(--brand-samsung);
}

.prod-head__remove {
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
}

.prod-head__remove:hover {
  color: var(--ink);
}

.prod-head__name {
  font-size: var(--t-h3);
  font-weight: 600;
  color: var(--ink);
}

.prod-head__img-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 128px;
  padding: 10px;
  border-radius: var(--r-sm);
  background: #ffffff;
  border: 1px solid var(--hairline);
}

.prod-head__img-box img {
  max-height: 108px;
  max-width: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.prod-head__name:hover {
  color: var(--action);
}

.prod-head__meta {
  font-size: 12px;
  color: var(--muted);
}

.prod-head__variant {
  font-size: 12px;
  color: var(--c-text);
}

.compare-row__label {
  background: var(--g-alt);
  border-right: 1px solid var(--hairline);
  font-weight: 500;
  font-size: var(--t-small);
  color: var(--c-text);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compare-row__label-main {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.compare-shop-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--g-alt);
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.compare-row--diff td {
  background: var(--diff-row-bg);
}

.compare-row__cell {
  font-size: var(--t-small);
  color: var(--ink);
}

.compare-row__cell--winner {
  font-weight: 600;
  color: var(--spec-win);
}

.compare-row__cell--null {
  color: var(--muted);
}

.winner-badge {
  display: inline-block;
  margin-left: var(--s-2);
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--spec-win-bg);
  color: var(--spec-win);
  font-size: 11px;
  font-weight: 600;
}

.compare-shop-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-shop-query {
  font-size: 11px;
  color: var(--muted);
}

.compare-shop-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.compare-shop-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--g-alt);
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.compare-shop-btn:hover {
  border-color: var(--action);
  color: var(--action);
}

.compare-shop-btn--danawa {
  background: var(--action);
  border-color: var(--action);
  color: var(--action-ink);
}

.compare-shop-btn--danawa:hover {
  color: var(--action-ink);
  opacity: 0.92;
}

@media (max-width: 900px) {
  .pair-picker {
    grid-template-columns: 1fr;
  }
  .pair-picker__vs {
    display: none;
  }
}

@media (max-width: 768px) {
  .preset-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .preset-row__cta {
    text-align: left;
  }
}
</style>
