<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import { Search, RotateCcw } from 'lucide-vue-next'
import { api, ApiClientError } from '@/services/api'
import type {
  BrandSlug,
  CategorySlug,
  ProductSortOption,
  ProductSummaryRecord,
} from '@/types/api'
import ProductCard from '@/components/product/ProductCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const router = useRouter()

const qInput = ref(typeof route.query.q === 'string' ? route.query.q : '')
const brand = ref<BrandSlug | ''>((route.query.brand as BrandSlug) || '')
const category = ref<CategorySlug | ''>((route.query.category as CategorySlug) || '')
const series = ref<string>(typeof route.query.series === 'string' ? route.query.series : '')
const year = ref<string>(typeof route.query.year === 'string' ? route.query.year : '')
const sort = ref<ProductSortOption>((route.query.sort as ProductSortOption) || 'release_desc')

const products = ref<ProductSummaryRecord[]>([])
const total = ref(0)
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const hasAnyPriceData = ref(false)

const seriesOptions = [
  'iPhone',
  'iPad',
  'Apple Watch',
  'Galaxy S',
  'Galaxy Z Fold',
  'Galaxy Z Flip',
  'Galaxy A',
  'Galaxy Tab',
  'Galaxy Watch',
]

const yearOptions = ['2025', '2024', '2023', '2022']

function syncQueryToUrl() {
  const nextQuery: Record<string, string> = {}
  if (qInput.value.trim()) nextQuery.q = qInput.value.trim()
  if (brand.value) nextQuery.brand = brand.value
  if (category.value) nextQuery.category = category.value
  if (series.value) nextQuery.series = series.value
  if (year.value) nextQuery.year = year.value
  if (sort.value && sort.value !== 'release_desc') nextQuery.sort = sort.value

  router.replace({ name: 'catalog', query: nextQuery })
}

const debouncedSyncSearch = useDebounceFn(() => {
  syncQueryToUrl()
}, 300)

function onSearchInput() {
  debouncedSyncSearch()
}

function resetFilters() {
  qInput.value = ''
  brand.value = ''
  category.value = ''
  series.value = ''
  year.value = ''
  sort.value = 'release_desc'
  router.replace({ name: 'catalog', query: {} })
}

async function fetchCatalog() {
  loading.value = true
  errorMsg.value = null
  try {
    const res = await api.products({
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
      brand: (route.query.brand as BrandSlug) || undefined,
      category: (route.query.category as CategorySlug) || undefined,
      series: typeof route.query.series === 'string' ? route.query.series : undefined,
      year: route.query.year ? Number(route.query.year) : undefined,
      sort: (route.query.sort as ProductSortOption) || 'release_desc',
      limit: 100,
    })
    products.value = res.data
    total.value = res.meta?.total ?? res.data.length
    hasAnyPriceData.value = res.data.some(
      (p) => p.launchPriceKrw !== null || p.currentLowestPriceKrw !== null,
    )
  } catch (e) {
    errorMsg.value = e instanceof ApiClientError ? e.message : '제품 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query,
  (q) => {
    qInput.value = typeof q.q === 'string' ? q.q : ''
    brand.value = (q.brand as BrandSlug) || ''
    category.value = (q.category as CategorySlug) || ''
    series.value = typeof q.series === 'string' ? q.series : ''
    year.value = typeof q.year === 'string' ? q.year : ''
    sort.value = (q.sort as ProductSortOption) || 'release_desc'
    fetchCatalog()
  },
  { immediate: true },
)

const activeFilterCount = computed(() => {
  let c = 0
  if (qInput.value.trim()) c++
  if (brand.value) c++
  if (category.value) c++
  if (series.value) c++
  if (year.value) c++
  return c
})
</script>

<template>
  <section class="wrap page">
    <div class="page__head">
      <div>
        <p class="label">Apple · Samsung 공식 사양 카탈로그</p>
        <h1 class="page__h1">제품 탐색</h1>
      </div>
      <p class="muted num">총 {{ total }}개 기기</p>
    </div>

    <!-- 검색 및 필터 바 -->
    <div class="filter-bar card">
      <div class="filter-bar__search">
        <Search :size="18" class="filter-bar__icon" aria-hidden="true" />
        <label for="catalog-search" class="sr-only">제품명, 모델명, 모델 번호 검색</label>
        <input
          id="catalog-search"
          v-model="qInput"
          type="search"
          class="filter-bar__input"
          placeholder="제품명, 시리즈 또는 모델 번호 검색 (예: Galaxy S24, A3293, SM-X920)"
          autocomplete="off"
          @input="onSearchInput"
        />
      </div>

      <div class="filter-bar__controls">
        <div class="field-group">
          <label for="filter-brand" class="label">브랜드</label>
          <select id="filter-brand" v-model="brand" class="select" @change="syncQueryToUrl">
            <option value="">전체 브랜드</option>
            <option value="apple">Apple</option>
            <option value="samsung">Samsung</option>
          </select>
        </div>

        <div class="field-group">
          <label for="filter-category" class="label">카테고리</label>
          <select id="filter-category" v-model="category" class="select" @change="syncQueryToUrl">
            <option value="">전체 카테고리</option>
            <option value="smartphone">스마트폰</option>
            <option value="tablet">태블릿</option>
            <option value="smartwatch">스마트워치</option>
          </select>
        </div>

        <div class="field-group">
          <label for="filter-series" class="label">시리즈</label>
          <select id="filter-series" v-model="series" class="select" @change="syncQueryToUrl">
            <option value="">전체 시리즈</option>
            <option v-for="s in seriesOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div class="field-group">
          <label for="filter-year" class="label">출시 연도</label>
          <select id="filter-year" v-model="year" class="select" @change="syncQueryToUrl">
            <option value="">전체 연도</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}년</option>
          </select>
        </div>

        <div class="field-group">
          <label for="filter-sort" class="label">정렬</label>
          <select id="filter-sort" v-model="sort" class="select" @change="syncQueryToUrl">
            <option value="release_desc">최신 출시순</option>
            <option value="release_asc">오래된 출시순</option>
            <option value="name_asc">이름순</option>
            <option value="price_asc" :disabled="!hasAnyPriceData">
              가격 낮은순 {{ !hasAnyPriceData ? '(가격 정보 없음)' : '' }}
            </option>
            <option value="price_desc" :disabled="!hasAnyPriceData">
              가격 높은순 {{ !hasAnyPriceData ? '(가격 정보 없음)' : '' }}
            </option>
          </select>
        </div>

        <button
          v-if="activeFilterCount > 0 || sort !== 'release_desc'"
          type="button"
          class="btn btn--secondary filter-bar__reset"
          @click="resetFilters"
        >
          <RotateCcw :size="15" aria-hidden="true" />
          <span>초기화</span>
        </button>
      </div>
    </div>

    <!-- 상태 및 결과 그리드 -->
    <div v-if="loading" class="card state-box">제품 데이터를 불러오는 중입니다…</div>

    <div v-else-if="errorMsg" class="card state-box bad">
      <p>{{ errorMsg }}</p>
      <button type="button" class="btn btn--secondary" style="margin-top: 12px" @click="fetchCatalog">
        다시 시도
      </button>
    </div>

    <EmptyState
      v-else-if="products.length === 0"
      title="조건에 맞는 제품이 없습니다"
      description="검색어나 브랜드·카테고리·출시 연도 필터를 변경해 보세요."
    >
      <div>
        <button type="button" class="btn btn--secondary" @click="resetFilters">필터 초기화</button>
      </div>
    </EmptyState>

    <div v-else class="catalog-grid">
      <ProductCard v-for="item in products" :key="item.id" :product="item" />
    </div>
  </section>
</template>

<style scoped>
.page {
  padding-top: var(--s-7);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  flex-wrap: wrap;
}

.page__h1 {
  font-size: var(--t-h2);
  letter-spacing: -0.03em;
  margin-top: 4px;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.filter-bar__search {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 48px;
  padding: 0 var(--s-4);
  background: var(--frag);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
}

.filter-bar__search:focus-within {
  border-color: var(--action);
}

.filter-bar__icon {
  color: var(--muted);
  flex: none;
}

.filter-bar__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  outline: none;
}

.filter-bar__input::placeholder {
  color: var(--muted);
}

.filter-bar__controls {
  display: grid;
  grid-template-columns: repeat(5, 1fr) auto;
  gap: var(--s-3);
  align-items: end;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.select {
  height: 44px;
  padding: 0 var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--frag);
  color: var(--ink);
  font: inherit;
  font-size: var(--t-small);
}

.select:focus {
  outline: 2px solid var(--action);
  outline-offset: 1px;
}

.filter-bar__reset {
  height: 44px;
  padding: 0 var(--s-4);
  font-size: var(--t-small);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--grid-gap);
}

.state-box {
  padding: var(--s-7);
  text-align: center;
}

.bad {
  color: var(--price-rise);
}

@media (max-width: 1023px) {
  .filter-bar__controls {
    grid-template-columns: repeat(3, 1fr);
  }
  .catalog-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .filter-bar__controls {
    grid-template-columns: 1fr;
  }
  .catalog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
