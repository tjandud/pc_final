import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { CategorySlug } from '@/types/api'

export const COMPARE_MIN = 2
export const COMPARE_MAX = 4

export interface CompareItem {
  productSlug: string
  variantId: string | null
  name: string
  category: CategorySlug
}

export type AddResult = 'added' | 'duplicate' | 'full' | 'category_mismatch'

/**
 * Compare tray state (persisted in localStorage).
 * Rules: 2–4 items, same category only. Server re-validates in Phase 4.
 */
export const useCompareStore = defineStore('compare', () => {
  const items = useLocalStorage<CompareItem[]>('techcompare:compare', [])

  const category = computed<CategorySlug | null>(() => items.value[0]?.category ?? null)
  const count = computed(() => items.value.length)
  const canCompare = computed(() => count.value >= COMPARE_MIN)
  const isFull = computed(() => count.value >= COMPARE_MAX)

  function has(productSlug: string, variantId: string | null = null) {
    return items.value.some(
      (i) => i.productSlug === productSlug && (variantId === null || i.variantId === variantId),
    )
  }

  function add(item: CompareItem): AddResult {
    if (has(item.productSlug, item.variantId)) return 'duplicate'
    if (isFull.value) return 'full'
    if (category.value && category.value !== item.category) return 'category_mismatch'
    items.value = [...items.value, item]
    return 'added'
  }

  function remove(productSlug: string, variantId: string | null = null) {
    items.value = items.value.filter(
      (i) => !(i.productSlug === productSlug && (variantId === null || i.variantId === variantId)),
    )
  }

  function setFromResolved(nextItems: CompareItem[]) {
    if (nextItems.length === 0) return
    const firstCat = nextItems[0]!.category
    const valid = nextItems.filter((i) => i.category === firstCat).slice(0, COMPARE_MAX)
    items.value = valid
  }

  function toQueryParam(): string {
    return items.value
      .map((i) => (i.variantId ? `${i.productSlug}:${i.variantId}` : i.productSlug))
      .join(',')
  }

  function clear() {
    items.value = []
  }

  return {
    items,
    category,
    count,
    canCompare,
    isFull,
    has,
    add,
    remove,
    setFromResolved,
    toQueryParam,
    clear,
  }
})
