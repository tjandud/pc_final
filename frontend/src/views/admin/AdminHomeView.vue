<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useCompareStore } from '@/stores/compare'
import { buildShoppingMallLinks } from '@/utils/shopping'
import type {
  AdminProductSpecInput,
  AdminProductUpsertInput,
  BrandSlug,
  CategorySlug,
  DataAuditItem,
  DataAuditSummary,
  HealthStatus,
  SpecDefinitionRecord,
  SpecKey,
} from '@/types/api'

const router = useRouter()
const compareStore = useCompareStore()

const auditData = ref<DataAuditSummary | null>(null)
const healthStatus = ref<HealthStatus | null>(null)
const loading = ref(true)
const errorMsg = ref<string | null>(null)
const feedbackMsg = ref<string | null>(null)

// Filters for audit table
const filterBrand = ref<'all' | BrandSlug>('all')
const filterCategory = ref<'all' | CategorySlug>('all')
const searchQuery = ref('')

// Editor state (Phase 7 CRUD)
const editorOpen = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSaving = ref(false)
const editorError = ref<string | null>(null)
const categorySpecDefs = ref<SpecDefinitionRecord[]>([])

interface SpecFormRow {
  specKey: SpecKey
  label: string
  unit: string | null
  value: string
  numericValueText: string
}

const form = reactive<{
  slug: string
  name: string
  brand: BrandSlug
  category: CategorySlug
  series: string
  baseModelNumber: string
  releaseDate: string
  launchPriceKrwText: string
  storageCapacity: string
  connectivity: string
  sourceUrl: string
  specs: SpecFormRow[]
}>({
  slug: '',
  name: '',
  brand: 'apple',
  category: 'smartphone',
  series: '',
  baseModelNumber: '',
  releaseDate: '2024-09-20',
  launchPriceKrwText: '1550000',
  storageCapacity: '256GB',
  connectivity: '5G',
  sourceUrl: 'https://www.apple.com/kr/specs/',
  specs: [],
})

function formatPriceKrw(price: number | null | undefined): string {
  if (price === null || price === undefined) return '정보 없음'
  return `₩${price.toLocaleString('ko-KR')}`
}

function getAuditItemShoppingLinks(item: DataAuditItem) {
  return buildShoppingMallLinks({
    name: item.name,
    brandSlug: item.brandSlug,
    baseModelNumber: item.baseModelNumber,
    officialUrl: item.sourceUrl,
  }).slice(0, 3)
}

const filteredAuditItems = computed<DataAuditItem[]>(() => {
  if (!auditData.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  return auditData.value.items.filter((item) => {
    if (filterBrand.value !== 'all' && item.brandSlug !== filterBrand.value) return false
    if (filterCategory.value !== 'all' && item.categorySlug !== filterCategory.value) return false
    if (q) {
      const hay = `${item.name} ${item.slug} ${item.baseModelNumber ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

async function loadAudit() {
  loading.value = true
  errorMsg.value = null
  try {
    const [audit, health] = await Promise.all([api.adminAudit(), api.health()])
    auditData.value = audit
    healthStatus.value = health
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '데이터 검수 원장을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadSpecDefsForCategory(
  category: CategorySlug,
  existingMap?: Map<SpecKey, { value: string | null; numericValue: number | null }>,
) {
  const res = await api.categorySpecDefinitions(category)
  categorySpecDefs.value = res.definitions
  form.specs = res.definitions.map((def: SpecDefinitionRecord) => {
    const found = existingMap?.get(def.specKey)
    return {
      specKey: def.specKey,
      label: def.displayName,
      unit: def.unit,
      value: found?.value ?? '',
      numericValueText: found?.numericValue !== null && found?.numericValue !== undefined ? String(found.numericValue) : '',
    }
  })
}

async function openCreateForm() {
  editorMode.value = 'create'
  editorError.value = null
  feedbackMsg.value = null
  form.slug = ''
  form.name = ''
  form.brand = 'apple'
  form.category = 'smartphone'
  form.series = ''
  form.baseModelNumber = ''
  form.releaseDate = '2024-10-01'
  form.launchPriceKrwText = '1250000'
  form.storageCapacity = '256GB'
  form.connectivity = '5G'
  form.sourceUrl = 'https://www.apple.com/kr/'
  await loadSpecDefsForCategory('smartphone')
  editorOpen.value = true
}

async function openEditForm(slug: string) {
  editorMode.value = 'edit'
  editorError.value = null
  feedbackMsg.value = null
  try {
    const [p, specsBundle] = await Promise.all([api.productDetail(slug), api.productSpecs(slug)])
    form.slug = p.slug
    form.name = p.name
    form.brand = p.brand.slug
    form.category = p.category.slug
    form.series = p.series ?? ''
    form.baseModelNumber = p.baseModelNumber ?? ''
    form.releaseDate = p.releaseDate ?? '2024-01-01'
    form.launchPriceKrwText = p.launchPriceKrw !== null ? String(p.launchPriceKrw) : '0'
    const firstVar = p.variants[0]
    form.storageCapacity = firstVar?.storageCapacity ?? ''
    form.connectivity = firstVar?.connectivity ?? ''
    form.sourceUrl =
      p.brand.slug === 'apple' ? 'https://www.apple.com/kr/' : 'https://www.samsung.com/sec/'

    const specMap = new Map<SpecKey, { value: string | null; numericValue: number | null }>()
    for (const s of specsBundle.specifications) {
      specMap.set(s.specKey, { value: s.value, numericValue: s.numericValue })
    }
    await loadSpecDefsForCategory(p.category.slug, specMap)
    editorOpen.value = true
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '제품 상세 정보를 불러오지 못했습니다.'
  }
}

watch(
  () => form.category,
  async (newCategory, oldCategory) => {
    if (!editorOpen.value || editorMode.value === 'edit' || newCategory === oldCategory) return
    await loadSpecDefsForCategory(newCategory)
  },
)

async function handleSaveProduct() {
  editorError.value = null
  feedbackMsg.value = null

  const cleanSlug = form.slug.trim().toLowerCase()
  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    editorError.value = '슬러그(slug)는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.'
    return
  }
  if (!form.name.trim() || !form.baseModelNumber.trim()) {
    editorError.value = '제품명과 모델 번호는 필수 항목입니다.'
    return
  }

  const parsedPrice = Number(form.launchPriceKrwText)
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    editorError.value = '공식 출고가는 0 이상의 숫자여야 합니다.'
    return
  }

  const specsPayload: AdminProductSpecInput[] = form.specs.map((row) => {
    const trimmedVal = row.value.trim()
    const trimmedNum = row.numericValueText.trim()
    const numVal = trimmedNum !== '' && Number.isFinite(Number(trimmedNum)) ? Number(trimmedNum) : null
    return {
      specKey: row.specKey,
      specValue: trimmedVal !== '' ? trimmedVal : null,
      numericValue: numVal,
    }
  })

  const payload: AdminProductUpsertInput = {
    slug: cleanSlug,
    name: form.name.trim(),
    brand: form.brand,
    category: form.category,
    series: form.series.trim() || form.name.trim(),
    baseModelNumber: form.baseModelNumber.trim(),
    releaseDate: form.releaseDate.trim(),
    launchPriceKrw: Math.round(parsedPrice),
    storageCapacity: form.storageCapacity.trim() || null,
    connectivity: form.connectivity.trim() || null,
    sourceUrl: form.sourceUrl.trim() || null,
    specs: specsPayload,
  }

  editorSaving.value = true
  try {
    await api.adminUpsertProduct(payload)
    feedbackMsg.value =
      editorMode.value === 'create'
        ? `'${payload.name}' 신규 모델이 등록 및 저장되었습니다.`
        : `'${payload.name}' 모델 및 스펙 정보가 수정되었습니다.`
    editorOpen.value = false
    await loadAudit()
  } catch (err) {
    editorError.value = err instanceof Error ? err.message : '제품 저장 중 오류가 발생했습니다.'
  } finally {
    editorSaving.value = false
  }
}

async function handleDeleteProduct(item: DataAuditItem) {
  if (!window.confirm(`'${item.name} (${item.baseModelNumber})' 모델을 카탈로그에서 삭제하시겠습니까?`)) {
    return
  }
  feedbackMsg.value = null
  try {
    await api.adminDeleteProduct(item.slug)
    feedbackMsg.value = `'${item.name}' 모델이 삭제되었습니다.`
    await loadAudit()
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '제품 삭제에 실패했습니다.'
  }
}

function sendToCompare(item: DataAuditItem) {
  if (compareStore.has(item.slug)) {
    compareStore.remove(item.slug)
    feedbackMsg.value = `비교함에서 '${item.name}' 모델이 제외되었습니다. (${compareStore.count}/4)`
    return
  }
  const result = compareStore.add({
    productSlug: item.slug,
    variantId: null,
    name: item.name,
    category: item.categorySlug,
  })
  if (result === 'full') {
    feedbackMsg.value = '비교함에는 최대 4개 모델까지만 담을 수 있습니다.'
    return
  }
  if (result === 'category_mismatch') {
    feedbackMsg.value = '비교함에는 동일한 카테고리의 기기만 함께 담을 수 있습니다.'
    return
  }
  feedbackMsg.value = `비교함에 '${item.name}' 모델이 반영되었습니다. (${compareStore.count}/4)`
}

function goCompareNow() {
  router.push({
    name: 'compare',
    query: compareStore.count >= 2 ? { items: compareStore.toQueryParam() } : {},
  })
}

onMounted(() => {
  loadAudit()
})
</script>

<template>
  <div class="wrap admin-page">
    <header class="admin-head">
      <div class="admin-head__copy">
        <p class="label">카탈로그 관리 · 데이터 검수</p>
        <h1 class="admin-head__title">등록 제품 검수 및 스펙 관리</h1>
        <p class="muted admin-head__sub">
          등록된 전체 모델의 출시일·모델번호·스펙 완성도를 확인하고 신규 기기 등록, 상세 스펙 수정, 삭제를 관리합니다.
        </p>
      </div>
      <div class="admin-head__actions">
        <button type="button" class="btn-ghost" @click="goCompareNow">
          1:1 비교 분석 화면으로 이동 ({{ compareStore.count }}/4)
        </button>
        <button type="button" class="btn-primary" @click="openCreateForm">
          + 신규 제품·스펙 등록
        </button>
      </div>
    </header>

    <div v-if="feedbackMsg" class="feedback-banner" role="status">
      <span>{{ feedbackMsg }}</span>
      <button type="button" class="feedback-close" @click="feedbackMsg = null">닫기</button>
    </div>

    <!-- 0. DB 연결 및 쇼핑몰 자동 검색 연동 상태 -->
    <section class="db-status-bar" aria-label="데이터베이스 및 쇼핑몰 연동 상태">
      <div class="db-status-bar__item">
        <span class="label">현재 활성 DB 저장소</span>
        <strong class="num">
          {{
            healthStatus?.config.supabase.configured
              ? 'Supabase PostgreSQL 원격 DB 연결됨'
              : '로컬 JSON DB (backend/src/data/products.json · InMemoryCatalogRepository)'
          }}
        </strong>
      </div>
      <div class="db-status-bar__item">
        <span class="label">Supabase 스키마 · RLS 준비 상태</span>
        <strong class="num">
          15개 테이블 SQL · RLS 정책 준비 완료 (pc_fit 프로젝트 격리 준수 중)
        </strong>
      </div>
      <div class="db-status-bar__item">
        <span class="label">쇼핑몰 실시간 가격 검색 연동</span>
        <strong class="num status-ok">다나와 · 네이버쇼핑 · 쿠팡 · 공식몰 자동 검색 활성화됨</strong>
      </div>
    </section>

    <!-- 1. 데이터 무결성 자동 검증 요약 -->
    <section v-if="auditData" class="audit-strip" aria-label="데이터 정확성 검증 요약">
      <div class="audit-cell">
        <span class="label">총 등록 모델 · 고유성 검증</span>
        <strong class="audit-cell__val num">{{ auditData.totalProducts }}개 모델</strong>
        <span class="audit-cell__meta num">
          고유 슬러그 {{ auditData.uniqueSlugsCount }}개 · 고유 모델번호 {{ auditData.uniqueModelNumbersCount }}개
        </span>
      </div>
      <div class="audit-cell">
        <span class="label">브랜드 균형 (Apple : Samsung)</span>
        <strong class="audit-cell__val num">
          Apple {{ auditData.appleCount }} · Samsung {{ auditData.samsungCount }}
        </strong>
        <span class="audit-cell__meta">양사 공식 사양서 기반 1:1 교차 비교 대응</span>
      </div>
      <div class="audit-cell">
        <span class="label">카테고리 분포 (폰 · 태블릿 · 워치)</span>
        <strong class="audit-cell__val num">
          폰 {{ auditData.smartphoneCount }} · 태블릿 {{ auditData.tabletCount }} · 워치 {{ auditData.smartwatchCount }}
        </strong>
        <span class="audit-cell__meta">워치 카메라 자동 제외 규칙 적용됨</span>
      </div>
      <div class="audit-cell">
        <span class="label">출시일 기준 (2022-11-01 이후)</span>
        <strong
          class="audit-cell__val"
          :class="auditData.allReleaseDatesValid ? 'status-ok' : 'status-warn'"
        >
          {{ auditData.allReleaseDatesValid ? '전 모델 기준 충족 (PASS)' : '기준 미달 모델 포함' }}
        </strong>
        <span class="audit-cell__meta">미공개 스펙(Apple RAM 등)은 '정보 없음' 정직 표기</span>
      </div>
    </section>

    <!-- 2. Phase 7 제품 등록 / 상세 스펙 편집 패널 -->
    <section v-if="editorOpen" class="editor-ledger" aria-label="제품 및 스펙 편집 폼">
      <div class="editor-ledger__head">
        <div>
          <span class="label">{{ editorMode === 'create' ? '신규 기기 등록' : '기기 및 상세 스펙 수정' }}</span>
          <h2 class="editor-ledger__title">
            {{ editorMode === 'create' ? '신규 제품 및 카테고리 스펙 등록' : `'${form.name}' 모델 및 상세 스펙 수정` }}
          </h2>
        </div>
        <button type="button" class="btn-ghost" @click="editorOpen = false">편집 닫기</button>
      </div>

      <p v-if="editorError" class="editor-error">{{ editorError }}</p>

      <form class="editor-form" @submit.prevent="handleSaveProduct">
        <div class="editor-grid">
          <label class="field">
            <span class="field__label">브랜드</span>
            <select v-model="form.brand" class="field__input">
              <option value="apple">Apple</option>
              <option value="samsung">Samsung</option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">카테고리</span>
            <select v-model="form.category" class="field__input" :disabled="editorMode === 'edit'">
              <option value="smartphone">스마트폰 (12개 스펙)</option>
              <option value="tablet">태블릿 (12개 스펙)</option>
              <option value="smartwatch">스마트워치 (10개 스펙)</option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">슬러그 (URL 식별자)</span>
            <input
              v-model="form.slug"
              type="text"
              class="field__input num"
              :disabled="editorMode === 'edit'"
              placeholder="예: iphone-16-pro"
              required
            />
          </label>

          <label class="field">
            <span class="field__label">제품명</span>
            <input v-model="form.name" type="text" class="field__input" placeholder="예: iPhone 16 Pro" required />
          </label>

          <label class="field">
            <span class="field__label">공식 모델 번호</span>
            <input
              v-model="form.baseModelNumber"
              type="text"
              class="field__input num"
              placeholder="예: A3293 또는 SM-S928N"
              required
            />
          </label>

          <label class="field">
            <span class="field__label">시리즈명</span>
            <input v-model="form.series" type="text" class="field__input" placeholder="예: iPhone 16" />
          </label>

          <label class="field">
            <span class="field__label">출시일 (YYYY-MM-DD)</span>
            <input v-model="form.releaseDate" type="date" min="2022-11-01" class="field__input num" required />
          </label>

          <label class="field">
            <span class="field__label">한국 공식 출고가 (KRW)</span>
            <input
              v-model="form.launchPriceKrwText"
              type="number"
              min="0"
              step="1000"
              class="field__input num"
              required
            />
          </label>

          <label class="field">
            <span class="field__label">기본 저장 용량/크기</span>
            <input v-model="form.storageCapacity" type="text" class="field__input num" placeholder="예: 256GB / 46mm" />
          </label>

          <label class="field">
            <span class="field__label">네트워크 연결 방식</span>
            <input v-model="form.connectivity" type="text" class="field__input" placeholder="예: 5G / Wi-Fi / GPS" />
          </label>

          <label class="field field--wide">
            <span class="field__label">공식 제조사 출처 URL</span>
            <input v-model="form.sourceUrl" type="url" class="field__input num" placeholder="https://..." />
          </label>
        </div>

        <div class="spec-editor-block">
          <div class="spec-editor-block__head">
            <h3 class="spec-editor-block__title">
              카테고리 표준 스펙 입력 ({{ form.specs.length }}개 항목 · 미공개 항목은 비워두면 '정보 없음'으로 처리)
            </h3>
          </div>
          <div class="spec-editor-grid">
            <div v-for="spec in form.specs" :key="spec.specKey" class="spec-edit-row">
              <div class="spec-edit-row__meta">
                <strong>{{ spec.label }}</strong>
                <span class="muted num">{{ spec.specKey }}{{ spec.unit ? ` (${spec.unit})` : '' }}</span>
              </div>
              <input
                v-model="spec.value"
                type="text"
                class="field__input"
                :placeholder="`${spec.label} 표기 텍스트 (비워두면 '정보 없음')`"
              />
              <input
                v-model="spec.numericValueText"
                type="text"
                class="field__input num"
                :placeholder="spec.unit ? `비교용 수치 (${spec.unit})` : '비교 수치 (선택)'"
              />
            </div>
          </div>
        </div>

        <div class="editor-actions">
          <button type="button" class="btn-ghost" @click="editorOpen = false">취소</button>
          <button type="submit" class="btn-primary" :disabled="editorSaving">
            {{ editorSaving ? '저장 중...' : editorMode === 'create' ? '신규 모델 저장' : '변경사항 저장' }}
          </button>
        </div>
      </form>
    </section>

    <!-- 3. 필터 바 -->
    <section class="filter-bar" aria-label="검수 목록 필터">
      <div class="filter-bar__group">
        <button
          type="button"
          class="filter-pill"
          :class="{ 'is-active': filterCategory === 'all' }"
          @click="filterCategory = 'all'"
        >
          전체 카테고리
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ 'is-active': filterCategory === 'smartphone' }"
          @click="filterCategory = 'smartphone'"
        >
          스마트폰
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ 'is-active': filterCategory === 'tablet' }"
          @click="filterCategory = 'tablet'"
        >
          태블릿
        </button>
        <button
          type="button"
          class="filter-pill"
          :class="{ 'is-active': filterCategory === 'smartwatch' }"
          @click="filterCategory = 'smartwatch'"
        >
          스마트워치
        </button>
      </div>

      <div class="filter-bar__right">
        <select v-model="filterBrand" class="field__input filter-select" aria-label="브랜드 필터">
          <option value="all">모든 브랜드 (Apple + Samsung)</option>
          <option value="apple">Apple</option>
          <option value="samsung">Samsung</option>
        </select>
        <input
          v-model="searchQuery"
          type="search"
          class="field__input filter-search"
          placeholder="제품명, 모델 번호(A3293, SM-S928N) 검색..."
        />
      </div>
    </section>

    <div v-if="loading" class="admin-box">
      <p class="muted">제품 검수 원장을 불러오는 중입니다...</p>
    </div>

    <div v-else-if="errorMsg" class="admin-box">
      <p class="muted">{{ errorMsg }}</p>
    </div>

    <!-- 4. 제품 검수 및 CRUD 원장 테이블 -->
    <section v-else class="table-wrap" aria-label="제품 검수 및 관리 목록">
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th scope="col">브랜드 · 카테고리</th>
              <th scope="col">제품명</th>
              <th scope="col">모델 번호</th>
              <th scope="col">출시일 검증</th>
              <th scope="col">공식 출고가 · 쇼핑몰 가격조회</th>
              <th scope="col">스펙 채움률 · 미공개 항목</th>
              <th scope="col">비교 · 관리자 작업 (CRUD)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredAuditItems" :key="item.slug">
              <td>
                <span class="brand-tag">{{ item.brandName }}</span>
                <span class="muted cat-text">{{ item.categoryName }}</span>
              </td>
              <td>
                <RouterLink :to="`/products/${item.slug}`" class="prod-link prod-link--with-thumb">
                  <span class="admin-thumb">
                    <img
                      :src="`/images/products/${item.slug}.jpg`"
                      :alt="item.name"
                      loading="lazy"
                      @error="($event.target as HTMLImageElement).style.display = 'none'"
                    />
                  </span>
                  <span>{{ item.name }}</span>
                </RouterLink>
              </td>
              <td class="num">{{ item.baseModelNumber ?? '정보 없음' }}</td>
              <td class="num">
                <span>{{ item.releaseDate }}</span>
                <span class="status-badge" :class="{ 'is-warn': !item.releaseDateValid }">
                  {{ item.releaseDateValid ? '정상' : '기준이전' }}
                </span>
              </td>
              <td class="num">
                <div class="price-shop-cell">
                  <strong>{{ formatPriceKrw(item.launchPriceKrw) }}</strong>
                  <div class="mini-mall-links">
                    <a
                      v-for="mall in getAuditItemShoppingLinks(item)"
                      :key="mall.id"
                      :href="mall.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mini-mall-a"
                    >
                      {{ mall.id === 'danawa' ? '다나와' : mall.id === 'naver' ? '네이버' : '쿠팡' }}↗
                    </a>
                  </div>
                </div>
              </td>
              <td>
                <div class="spec-audit-cell">
                  <strong class="num">{{ item.filledSpecsCount }} / {{ item.totalCategorySpecs }}</strong>
                  <span v-if="item.missingSpecKeys.length === 0" class="muted">전 항목 입력됨</span>
                  <span v-else class="muted" :title="item.missingSpecKeys.join(', ')">
                    미공개('정보 없음'): {{ item.missingSpecKeys.join(', ') }}
                  </span>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <button
                    type="button"
                    class="row-btn"
                    :class="{ 'is-selected': compareStore.has(item.slug) }"
                    @click="sendToCompare(item)"
                  >
                    {{ compareStore.has(item.slug) ? '비교담김' : '비교담기' }}
                  </button>
                  <button type="button" class="row-btn" @click="openEditForm(item.slug)">
                    수정·스펙편집
                  </button>
                  <button type="button" class="row-btn row-btn--danger" @click="handleDeleteProduct(item)">
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  padding-top: var(--s-7);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.admin-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--s-4);
  flex-wrap: wrap;
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--hairline-strong);
}

.admin-head__title {
  font-size: var(--t-h2);
  margin-top: 4px;
}

.admin-head__sub {
  margin-top: var(--s-2);
  max-width: 72ch;
  font-size: var(--t-small);
}

.admin-head__actions {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
}

.btn-primary,
.btn-ghost {
  padding: 9px 14px;
  border-radius: var(--r-sm);
  font-size: var(--t-small);
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: var(--action);
  color: var(--action-ink);
  border: 1px solid var(--action);
}

.btn-ghost {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--hairline-strong);
}

.feedback-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--action);
  border-radius: var(--r-sm);
  background: var(--g-alt);
  font-size: var(--t-small);
  font-weight: 500;
}

.feedback-close {
  background: transparent;
  border: 0;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
}

.db-status-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
  background: var(--card);
  font-size: 12px;
}

.db-status-bar__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-shop-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-mall-links {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.mini-mall-a {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--hairline-strong);
  color: var(--muted);
  text-decoration: none;
}

.mini-mall-a:hover {
  border-color: var(--action);
  color: var(--action);
}

.audit-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 2px solid var(--ink);
  border-bottom: 1px solid var(--hairline-strong);
  background: var(--g-alt);
}

.audit-cell {
  padding: var(--s-4);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audit-cell + .audit-cell {
  border-left: 1px solid var(--hairline);
}

.audit-cell__val {
  font-size: var(--t-h3);
  color: var(--ink);
}

.audit-cell__meta {
  font-size: 12px;
  color: var(--muted);
}

.status-ok {
  color: var(--price-drop);
}

.status-warn {
  color: var(--price-rise);
}

/* Editor Ledger */
.editor-ledger {
  border-top: 2px solid var(--action);
  border-bottom: 1px solid var(--hairline-strong);
  padding: var(--s-5) 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.editor-ledger__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-ledger__title {
  font-size: var(--t-h3);
  margin-top: 2px;
}

.editor-error {
  color: var(--price-rise);
  font-size: var(--t-small);
  font-weight: 600;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field--wide {
  grid-column: span 2;
}

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.field__input {
  padding: 8px 10px;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
  background: var(--card);
  color: var(--ink);
  font-size: var(--t-small);
}

.spec-editor-block {
  border-top: 1px solid var(--hairline);
  padding-top: var(--s-4);
}

.spec-editor-block__title {
  font-size: var(--t-small);
  font-weight: 600;
  margin-bottom: var(--s-3);
}

.spec-editor-grid {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--hairline);
}

.spec-edit-row {
  display: grid;
  grid-template-columns: 220px 1fr 180px;
  gap: var(--s-3);
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--hairline);
}

.spec-edit-row__meta {
  display: flex;
  flex-direction: column;
  font-size: var(--t-small);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-2);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.filter-bar__group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 7px 12px;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--muted);
  font-size: var(--t-small);
  font-weight: 600;
  cursor: pointer;
}

.filter-pill.is-active {
  background: var(--action);
  color: var(--action-ink);
  border-color: var(--action);
}

.filter-bar__right {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
}

.filter-select {
  min-width: 180px;
}

.filter-search {
  min-width: 260px;
}

/* Table */
.table-wrap {
  border-top: 2px solid var(--ink);
  border-bottom: 1px solid var(--hairline-strong);
}

.table-scroll {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  text-align: left;
  font-size: var(--t-small);
}

.admin-table th,
.admin-table td {
  padding: var(--s-3) var(--s-3);
  border-bottom: 1px solid var(--hairline);
  vertical-align: middle;
}

.admin-table th {
  background: var(--g-alt);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.brand-tag {
  font-weight: 600;
  margin-right: 6px;
}

.cat-text {
  font-size: 12px;
}

.prod-link {
  font-weight: 600;
  color: var(--ink);
}

.prod-link--with-thumb {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.admin-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: #ffffff;
  border: 1px solid var(--hairline);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  flex-shrink: 0;
}

.admin-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.prod-link:hover {
  color: var(--action);
}

.status-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(16, 185, 129, 0.14);
  color: var(--price-drop);
  font-size: 11px;
  font-weight: 600;
}

.status-badge.is-warn {
  background: rgba(239, 68, 68, 0.14);
  color: var(--price-rise);
}

.spec-audit-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.row-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.row-btn {
  padding: 5px 9px;
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.row-btn:hover {
  border-color: var(--action);
  color: var(--action);
}

.row-btn.is-selected {
  background: var(--action);
  border-color: var(--action);
  color: var(--action-ink);
}

.row-btn--danger:hover {
  border-color: var(--price-rise);
  color: var(--price-rise);
}

@media (max-width: 1024px) {
  .audit-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .editor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .spec-edit-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .audit-strip,
  .editor-grid {
    grid-template-columns: 1fr;
  }
  .field--wide {
    grid-column: span 1;
  }
}
</style>
