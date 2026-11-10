<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Plus } from 'lucide-vue-next'
import type { ProductSummaryRecord } from '@/types/api'
import { useCompareStore } from '@/stores/compare'
import { buildShoppingMallLinks } from '@/utils/shopping'
import TechIcon from '@/components/common/TechIcon.vue'

const props = defineProps<{
  product: ProductSummaryRecord
}>()

const compareStore = useCompareStore()
const feedbackMsg = ref<string | null>(null)

const shoppingLinks = computed(() =>
  buildShoppingMallLinks({
    name: props.product.name,
    brandSlug: props.product.brand.slug,
    baseModelNumber: props.product.baseModelNumber,
    officialUrl: props.product.brand.officialWebsite,
  }).slice(0, 3),
)

const inCompare = computed(() => compareStore.has(props.product.slug))
const isCategoryLocked = computed(
  () => compareStore.category !== null && compareStore.category !== props.product.category.slug,
)

function formatKrw(amount: number | null): string {
  if (amount === null) return '정보 없음'
  return `₩${amount.toLocaleString('ko-KR')}`
}

function toggleCompare(e: Event) {
  e.preventDefault()
  e.stopPropagation()

  if (inCompare.value) {
    compareStore.remove(props.product.slug)
    feedbackMsg.value = null
    return
  }

  const res = compareStore.add({
    productSlug: props.product.slug,
    variantId: props.product.defaultVariantId,
    name: props.product.name,
    category: props.product.category.slug,
  })

  if (res === 'category_mismatch') {
    feedbackMsg.value = '동일 카테고리 제품만 비교할 수 있습니다.'
  } else if (res === 'full') {
    feedbackMsg.value = '최대 4개 제품까지만 비교할 수 있습니다.'
  } else {
    feedbackMsg.value = null
  }
}
</script>

<template>
  <article class="pcard" :class="{ 'is-selected': inCompare }">
    <RouterLink :to="{ name: 'product-detail', params: { slug: product.slug } }" class="pcard__link">
      <div class="pcard__stage" :data-brand="product.brand.slug">
        <div class="pcard__stage-top">
          <span class="pcard__brand" :data-brand="product.brand.slug">
            <TechIcon :name="product.brand.slug" :size="12" />
            <span>{{ product.brand.name }}</span>
          </span>
          <span class="pcard__code num">{{ product.baseModelNumber ?? product.series }}</span>
        </div>

        <img
          v-if="product.thumbnailUrl"
          :src="product.thumbnailUrl"
          :alt="product.name"
          class="pcard__img"
          loading="lazy"
        />

        <!-- Hardware CAD Silhouette Render when official image is not attached -->
        <div v-else class="pcard__cad" aria-hidden="true">
          <svg
            v-if="product.category.slug === 'smartphone'"
            viewBox="0 0 120 140"
            class="cad-svg"
            fill="none"
          >
            <rect x="31" y="10" width="58" height="120" rx="10" stroke="currentColor" stroke-width="1.5" />
            <rect x="35" y="14" width="50" height="112" rx="7" stroke="currentColor" stroke-opacity="0.35" />
            <rect x="51" y="18" width="18" height="4" rx="2" fill="currentColor" fill-opacity="0.45" />
            <circle cx="44" cy="28" r="4" stroke="currentColor" stroke-opacity="0.5" />
            <circle cx="44" cy="39" r="4" stroke="currentColor" stroke-opacity="0.5" />
          </svg>

          <svg
            v-else-if="product.category.slug === 'tablet'"
            viewBox="0 0 160 120"
            class="cad-svg"
            fill="none"
          >
            <rect x="18" y="14" width="124" height="92" rx="8" stroke="currentColor" stroke-width="1.5" />
            <rect x="24" y="20" width="112" height="80" rx="4" stroke="currentColor" stroke-opacity="0.35" />
            <circle cx="80" cy="17" r="1.5" fill="currentColor" fill-opacity="0.6" />
          </svg>

          <svg v-else viewBox="0 0 120 140" class="cad-svg" fill="none">
            <path d="M46 12H74L77 34H43L46 12Z" stroke="currentColor" stroke-opacity="0.4" />
            <path d="M43 106H77L74 128H46L43 106Z" stroke="currentColor" stroke-opacity="0.4" />
            <rect x="34" y="32" width="52" height="74" rx="14" stroke="currentColor" stroke-width="1.5" />
            <rect x="39" y="37" width="42" height="64" rx="10" stroke="currentColor" stroke-opacity="0.35" />
            <rect x="86" y="48" width="3" height="12" rx="1.5" fill="currentColor" fill-opacity="0.6" />
          </svg>
        </div>
      </div>

      <div class="pcard__body">
        <div class="pcard__kicker">
          <span>{{ product.category.name }} · {{ product.series }}</span>
          <span class="num">{{ product.releaseDate }}</span>
        </div>

        <h3 class="pcard__title">{{ product.name }}</h3>

        <dl class="pcard__specs">
          <div class="pcard__spec-item">
            <dt>기본 모델 번호</dt>
            <dd class="num">{{ product.baseModelNumber ?? '정보 없음' }}</dd>
          </div>
          <div class="pcard__spec-item">
            <dt>공식 출시 가격</dt>
            <dd class="num pcard__price">{{ formatKrw(product.launchPriceKrw) }}</dd>
          </div>
        </dl>
      </div>
    </RouterLink>

    <div class="pcard__foot">
      <div class="pcard__malls" aria-label="실시간 쇼핑몰 최저가 자동 검색">
        <span class="pcard__malls-label">실시간 가격조회</span>
        <div class="pcard__malls-links">
          <a
            v-for="mall in shoppingLinks"
            :key="mall.id"
            :href="mall.url"
            target="_blank"
            rel="noopener noreferrer"
            class="pcard__mall-chip"
            @click.stop
          >
            <TechIcon :name="mall.id" :size="11" />
            <span>{{ mall.id === 'danawa' ? '다나와' : mall.id === 'naver' ? '네이버' : '쿠팡' }}</span>
          </a>
        </div>
      </div>

      <button
        type="button"
        class="btn pcard__compare-btn"
        :class="inCompare ? 'btn--primary' : 'btn--secondary'"
        :disabled="!inCompare && isCategoryLocked"
        :title="isCategoryLocked ? '비교함에 담긴 카테고리와 동일한 카테고리만 선택할 수 있습니다' : ''"
        @click="toggleCompare"
      >
        <Check v-if="inCompare" :size="15" aria-hidden="true" />
        <Plus v-else :size="15" aria-hidden="true" />
        <span>{{ inCompare ? '비교함 담김' : isCategoryLocked ? '다른 카테고리' : '비교 담기' }}</span>
      </button>
      <p v-if="feedbackMsg" class="pcard__feedback">{{ feedbackMsg }}</p>
    </div>
  </article>
</template>

<style scoped>
.pcard {
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    transform var(--m-out) var(--m-ease),
    border-color var(--m-in) var(--m-ease);
}

.pcard.is-selected {
  border-color: var(--action);
}

@media (hover: hover) and (pointer: fine) {
  .pcard:hover {
    transform: translateY(-2px);
    border-color: var(--hairline-strong);
  }
}

.pcard__link {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.pcard__stage {
  position: relative;
  height: 196px;
  padding: var(--s-3) var(--s-4);
  background: radial-gradient(circle at 50% 42%, #ffffff 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--hairline);
  border-radius: calc(var(--r-md) - 1px) calc(var(--r-md) - 1px) 0 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.pcard__stage-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.pcard__brand {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 2px 7px;
  border-radius: 3px;
  background: #f1f5f9;
  color: #0f172a;
}

.pcard__brand[data-brand='samsung'] {
  background: #eff6ff;
  color: #1d4ed8;
}

.pcard__code {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.pcard__img {
  max-height: 136px;
  max-width: 86%;
  width: auto;
  margin: auto;
  object-fit: contain;
  mix-blend-mode: multiply;
  transition: transform 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .pcard:hover .pcard__img {
    transform: scale(1.03);
  }
}

.pcard__cad {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text);
  opacity: 0.72;
}

.cad-svg {
  height: 112px;
  width: auto;
}

.pcard__body {
  padding: var(--s-4) var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.pcard__kicker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}

.pcard__title {
  font-size: var(--t-card);
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
}

.pcard__specs {
  margin: var(--s-2) 0 0;
  padding-top: var(--s-3);
  border-top: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pcard__spec-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.pcard__spec-item dt {
  color: var(--muted);
}

.pcard__spec-item dd {
  margin: 0;
  color: var(--c-text);
}

.pcard__price {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink) !important;
}

.pcard__foot {
  padding: 0 var(--s-5) var(--s-4);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.pcard__malls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid var(--hairline);
}

.pcard__malls-label {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
}

.pcard__malls-links {
  display: flex;
  gap: 4px;
}

.pcard__mall-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 3px;
  border: 1px solid var(--hairline-strong);
  background: var(--g-alt);
  color: var(--c-text);
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 150ms ease, color 150ms ease;
}

.pcard__mall-chip:hover {
  border-color: var(--action);
  color: var(--action);
}

.pcard__compare-btn {
  width: 100%;
  height: 38px;
  font-size: 13px;
}

.pcard__compare-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pcard__feedback {
  font-size: 12px;
  color: var(--warn);
}
</style>
