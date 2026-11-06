<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Plus,
  Smartphone,
  Tablet,
  Watch,
} from 'lucide-vue-next'
import { api, ApiClientError } from '@/services/api'
import type {
  ProductDetailRecord,
  ProductVariantRecord,
  ResolvedSpecItem,
} from '@/types/api'
import { useCompareStore } from '@/stores/compare'
import { buildShoppingMallLinks } from '@/utils/shopping'

const props = defineProps<{ slug: string }>()

const compareStore = useCompareStore()

const product = ref<ProductDetailRecord | null>(null)
const selectedVariant = ref<ProductVariantRecord | null>(null)
const specs = ref<ResolvedSpecItem[]>([])
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const compareFeedback = ref<string | null>(null)

async function loadProduct(slug: string, variantId?: string | null) {
  loading.value = true
  errorMsg.value = null
  try {
    const [detail, specBundle] = await Promise.all([
      api.productDetail(slug),
      api.productSpecs(slug, variantId),
    ])
    product.value = detail
    selectedVariant.value = specBundle.selectedVariant
    specs.value = specBundle.specifications
  } catch (e) {
    errorMsg.value = e instanceof ApiClientError ? e.message : '제품 상세 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function selectVariant(variant: ProductVariantRecord) {
  if (!product.value) return
  selectedVariant.value = variant
  try {
    const specBundle = await api.productSpecs(product.value.slug, variant.id)
    specs.value = specBundle.specifications
  } catch (e) {
    errorMsg.value = e instanceof ApiClientError ? e.message : '모델 변형 사양을 불러오지 못했습니다.'
  }
}

watch(
  () => props.slug,
  (newSlug) => {
    loadProduct(newSlug)
  },
  { immediate: true },
)

const inCompare = computed(() =>
  product.value ? compareStore.has(product.value.slug, selectedVariant.value?.id ?? null) : false,
)

const isCategoryLocked = computed(
  () =>
    product.value !== null &&
    compareStore.category !== null &&
    compareStore.category !== product.value.category.slug,
)

function toggleCompare() {
  if (!product.value) return
  const vId = selectedVariant.value?.id ?? product.value.defaultVariantId
  if (compareStore.has(product.value.slug, vId)) {
    compareStore.remove(product.value.slug, vId)
    compareFeedback.value = null
    return
  }

  const label = selectedVariant.value?.storageCapacity
    ? `${product.value.name} (${selectedVariant.value.storageCapacity})`
    : product.value.name

  const res = compareStore.add({
    productSlug: product.value.slug,
    variantId: vId,
    name: label,
    category: product.value.category.slug,
  })

  if (res === 'category_mismatch') {
    compareFeedback.value = '동일 카테고리 제품만 비교함에 담을 수 있습니다.'
  } else if (res === 'full') {
    compareFeedback.value = '비교함에는 최대 4개 제품까지만 담을 수 있습니다.'
  } else {
    compareFeedback.value = null
  }
}

function formatKrw(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '정보 없음'
  return `₩${amount.toLocaleString('ko-KR')}`
}

const activeLaunchPrice = computed(
  () => selectedVariant.value?.launchPriceKrw ?? product.value?.launchPriceKrw ?? null,
)
const activeCurrentPrice = computed(
  () => selectedVariant.value?.currentLowestPriceKrw ?? product.value?.currentLowestPriceKrw ?? null,
)
const officialSourceUrl = computed(
  () =>
    product.value?.dataSource?.sourceUrl ??
    product.value?.dataSource?.baseUrl ??
    product.value?.brand.officialWebsite ??
    null,
)

const shoppingLinks = computed(() => {
  if (!product.value) return []
  return buildShoppingMallLinks({
    name: product.value.name,
    brandSlug: product.value.brand.slug,
    baseModelNumber: selectedVariant.value?.modelNumber ?? product.value.baseModelNumber,
    storageCapacity: selectedVariant.value?.storageCapacity,
    connectivity: selectedVariant.value?.connectivity,
    officialUrl: officialSourceUrl.value,
  })
})
</script>

<template>
  <section class="wrap page">
    <div>
      <RouterLink :to="{ name: 'catalog' }" class="back-link">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>제품 목록으로 돌아가기</span>
      </RouterLink>
    </div>

    <div v-if="loading" class="card state-box">제품 상세 사양을 불러오는 중입니다…</div>
    <div v-else-if="errorMsg || !product" class="card state-box bad">
      {{ errorMsg ?? '제품을 찾을 수 없습니다.' }}
    </div>

    <template v-else>
      <!-- 상단 기본 정보 & 모델 변형(Variant) 선택 -->
      <div class="detail-hero card">
        <div class="detail-hero__visual">
          <img
            v-if="product.thumbnailUrl"
            :src="product.thumbnailUrl"
            :alt="product.name"
            class="detail-hero__img"
          />
          <div v-else class="detail-hero__placeholder">
            <Smartphone v-if="product.category.slug === 'smartphone'" :size="64" />
            <Tablet v-else-if="product.category.slug === 'tablet'" :size="64" />
            <Watch v-else :size="64" />
            <span class="num">{{ selectedVariant?.modelNumber ?? product.baseModelNumber }}</span>
          </div>
        </div>

        <div class="detail-hero__info">
          <div class="detail-hero__badges">
            <span class="pill">{{ product.brand.name }}</span>
            <span class="pill">{{ product.category.name }}</span>
            <span class="pill">{{ product.series }}</span>
            <span v-if="product.isTestData" class="badge-test">TEST DATA</span>
          </div>

          <h1 class="detail-hero__title">{{ product.name }}</h1>

          <dl class="meta-grid">
            <div>
              <dt class="label">출시일</dt>
              <dd class="num">{{ product.releaseDate }}</dd>
            </div>
            <div>
              <dt class="label">모델 번호</dt>
              <dd class="num">{{ selectedVariant?.modelNumber ?? product.baseModelNumber ?? '정보 없음' }}</dd>
            </div>
            <div>
              <dt class="label">제조사 출시 가격</dt>
              <dd class="num">{{ formatKrw(activeLaunchPrice) }}</dd>
            </div>
            <div>
              <dt class="label">현재 판매 가격</dt>
              <dd class="num">
                <span v-if="activeCurrentPrice !== null" class="ok">{{ formatKrw(activeCurrentPrice) }}</span>
                <span v-else class="muted">현재 판매 가격 정보 없음</span>
              </dd>
            </div>
          </dl>

          <!-- Variant 선택기 -->
          <div v-if="product.variants.length > 0" class="variants-box">
            <p class="label">모델 변형 (저장 공간 · 통신 방식 · 모델 번호)</p>
            <div class="variants-list">
              <button
                v-for="v in product.variants"
                :key="v.id"
                type="button"
                class="variant-chip"
                :class="{ 'is-active': selectedVariant?.id === v.id }"
                @click="selectVariant(v)"
              >
                <span class="variant-chip__main">
                  {{ v.storageCapacity ?? '기본' }}
                  <template v-if="v.connectivity"> · {{ v.connectivity }}</template>
                </span>
                <span class="variant-chip__sub num">
                  {{ v.modelNumber }}
                  <template v-if="v.launchPriceKrw !== null">
                    · ₩{{ v.launchPriceKrw.toLocaleString('ko-KR') }}
                  </template>
                </span>
              </button>
            </div>
          </div>

          <div class="detail-hero__actions">
            <button
              type="button"
              class="btn"
              :class="inCompare ? 'btn--primary' : 'btn--secondary'"
              :disabled="!inCompare && isCategoryLocked"
              @click="toggleCompare"
            >
              <Check v-if="inCompare" :size="18" aria-hidden="true" />
              <Plus v-else :size="18" aria-hidden="true" />
              <span>{{ inCompare ? '비교함에 담김' : '비교함에 추가' }}</span>
            </button>

            <a
              v-if="officialSourceUrl"
              :href="officialSourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--secondary"
            >
              <span>공식 출처 확인</span>
              <ExternalLink :size="16" aria-hidden="true" />
            </a>
          </div>
          <p v-if="compareFeedback" class="feedback-msg">{{ compareFeedback }}</p>
        </div>
      </div>

      <!-- 실시간 쇼핑몰 가격 조회 & 자동 검색 연동 (다나와 · 네이버쇼핑 · 쿠팡 · 공식몰) -->
      <div class="shopping-section card" aria-label="실시간 쇼핑몰 최저가 자동 검색">
        <div class="shopping-section__head">
          <div>
            <p class="label">다나와 · 네이버쇼핑 · 쿠팡 최저가 조회</p>
            <h2 class="spec-section__title">쇼핑몰별 실구매가 비교 및 구매처 바로가기</h2>
            <p class="muted shopping-section__sub">
              선택된 용량·모델 번호(<strong class="num">{{
                selectedVariant?.storageCapacity
                  ? `${product.name} ${selectedVariant.storageCapacity}`
                  : product.name
              }}</strong>
              · <span class="num">{{ selectedVariant?.modelNumber ?? product.baseModelNumber }}</span>)로 각 쇼핑몰 검색 결과를 바로 엽니다.
            </p>
          </div>
          <div class="shopping-section__price-ref">
            <span class="label">기준 공식 출고가</span>
            <strong class="num shopping-section__launch">{{ formatKrw(activeLaunchPrice) }}</strong>
          </div>
        </div>

        <div class="shopping-grid">
          <div v-for="mall in shoppingLinks" :key="mall.id" class="mall-box">
            <div class="mall-box__top">
              <div class="mall-box__title-row">
                <strong class="mall-box__name">{{ mall.mallName }}</strong>
                <span class="mall-badge" :class="`mall-badge--${mall.id}`">{{ mall.badge }}</span>
              </div>
              <p class="muted mall-box__desc">{{ mall.description }}</p>
              <p class="mall-box__query num">자동 검색어: "{{ mall.searchQuery }}"</p>
            </div>
            <div class="mall-box__actions">
              <a
                :href="mall.url"
                target="_blank"
                rel="noopener noreferrer"
                class="mall-btn mall-btn--primary"
              >
                <span>{{ mall.mallName }}에서 가격 보기</span>
                <ExternalLink :size="14" aria-hidden="true" />
              </a>
              <a
                v-if="mall.modelNumberUrl"
                :href="mall.modelNumberUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mall-btn mall-btn--sub num"
              >
                <span>모델명({{ selectedVariant?.modelNumber ?? product.baseModelNumber }}) 정밀 검색 ↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 상세 사양표 (카테고리별 스펙만 표시, 미확인 값은 '정보 없음') -->
      <div class="spec-section card">
        <div class="spec-section__head">
          <div>
            <p class="label">{{ product.category.name }} 표준 사양표</p>
            <h2 class="spec-section__title">상세 스펙</h2>
          </div>
          <span v-if="selectedVariant" class="label num">
            선택된 변형: {{ selectedVariant.skuCode }}
          </span>
        </div>

        <ul class="rows spec-rows">
          <li v-for="s in specs" :key="s.specKey" class="spec-row">
            <span class="spec-row__label">
              {{ s.displayName }}
              <span v-if="s.sourceScope === 'variant'" class="spec-scope">변형 사양</span>
            </span>
            <span
              class="spec-row__value"
              :class="{ 'is-missing': s.value === null, num: s.numericValue !== null }"
            >
              {{ s.displayValue }}
            </span>
          </li>
        </ul>

        <div class="spec-section__foot">
          <span class="muted">
            출처: {{ product.dataSource?.name ?? '제조사 공식 기술 사양' }} · 모델코드:
            <strong class="num">{{ product.slug }} ({{ selectedVariant?.skuCode ?? '기본' }})</strong>
          </span>
          <a
            v-if="officialSourceUrl"
            :href="officialSourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="source-link"
          >
            제조사 공식 사양서 원문 보기 ↗
          </a>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page {
  padding-top: var(--s-7);
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--muted);
}

.back-link:hover {
  color: var(--ink);
}

.detail-hero {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: var(--s-7);
  align-items: start;
}

.detail-hero__visual {
  height: 320px;
  padding: var(--s-5);
  border-radius: var(--r-md);
  background: #ffffff;
  border: 1px solid var(--hairline-strong);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-hero__img {
  max-height: 260px;
  max-width: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.detail-hero__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
  color: var(--muted);
}

.detail-hero__info {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.detail-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.pill {
  padding: 2px var(--s-3);
  border-radius: 6px;
  border: 1px solid var(--hairline);
  background: var(--frag);
  font-size: var(--t-label);
}

.detail-hero__title {
  font-size: var(--t-h2);
  letter-spacing: -0.03em;
}

.meta-grid {
  margin: 0;
  padding: var(--s-4) 0;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s-4);
}

.meta-grid dd {
  margin: 4px 0 0;
  font-size: 17px;
  font-weight: 500;
}

.variants-box {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.variants-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.variant-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-sm);
  border: 1px solid var(--hairline-strong);
  background: var(--frag);
  cursor: pointer;
  transition: border-color var(--m-in) var(--m-ease);
}

.variant-chip.is-active {
  border-color: var(--action-border);
  background: var(--action-subtle);
}

.variant-chip__main {
  font-size: var(--t-small);
  font-weight: 500;
}

.variant-chip__sub {
  font-size: var(--t-label);
  color: var(--muted);
}

.detail-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  margin-top: var(--s-2);
}

.feedback-msg {
  font-size: var(--t-small);
  color: var(--warn);
}

.shopping-section {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.shopping-section__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--s-4);
  flex-wrap: wrap;
  padding-bottom: var(--s-3);
  border-bottom: 1px solid var(--hairline);
}

.shopping-section__sub {
  margin-top: 6px;
  font-size: var(--t-small);
  max-width: 72ch;
}

.shopping-section__price-ref {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.shopping-section__launch {
  font-size: var(--t-h3);
  color: var(--ink);
}

.shopping-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
}

.mall-box {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
  background: var(--g-alt);
}

.mall-box__top {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mall-box__title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.mall-box__name {
  font-size: var(--t-body);
  font-weight: 600;
}

.mall-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 3px;
  border: 1px solid var(--hairline-strong);
  color: var(--ink);
}

.mall-box__desc {
  font-size: 12px;
  line-height: 1.45;
}

.mall-box__query {
  font-size: 11px;
  color: var(--muted);
}

.mall-box__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mall-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.mall-btn--primary {
  background: var(--action);
  color: var(--action-ink);
  border: 1px solid var(--action);
}

.mall-btn--sub {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--hairline-strong);
}

.mall-btn--sub:hover {
  color: var(--ink);
  border-color: var(--action);
}

.spec-section__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-3);
  margin-bottom: var(--s-4);
}

.spec-section__title {
  font-size: var(--t-h3);
  margin-top: 4px;
}

.spec-row {
  align-items: baseline;
}

.spec-row__label {
  color: var(--muted);
  font-size: var(--t-small);
  min-width: 140px;
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
}

.spec-scope {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--frag);
  border: 1px solid var(--hairline);
  font-size: 11px;
  color: var(--c-text);
}

.spec-row__value {
  text-align: right;
  font-size: var(--t-body);
  color: var(--ink);
}

.spec-row__value.is-missing {
  color: var(--muted);
}

.spec-section__foot {
  margin-top: var(--s-4);
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-2);
  font-size: 12px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--grid-gap);
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.info-card__title {
  font-size: var(--t-card);
}

.source-link {
  color: var(--action);
  font-size: var(--t-small);
}

.state-box {
  padding: var(--s-7);
  text-align: center;
}

.ok {
  color: var(--spec-win);
}

.bad {
  color: var(--price-rise);
}

@media (max-width: 1023px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }
  .detail-hero__visual {
    height: 220px;
  }
  .shopping-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .shopping-grid {
    grid-template-columns: 1fr;
  }
  .meta-grid {
    grid-template-columns: 1fr;
  }
  .spec-row {
    flex-direction: column;
    gap: 4px;
  }
  .spec-row__value {
    text-align: left;
  }
}
</style>
