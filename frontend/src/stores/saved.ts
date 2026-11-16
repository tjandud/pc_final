import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface ActivityEntry {
  title: string
  meta: string
  time: string
}

const DEFAULT_SAVED_SLUGS = [
  'iphone-17-pro-max',
  'galaxy-s25-ultra',
  'ipad-pro-13-m4',
  'galaxy-tab-s10-ultra',
  'macbook-pro-14-m3-pro',
  'galaxy-book4-ultra',
  'apple-watch-ultra-2',
  'airpods-pro-2-usbc',
]

const DEFAULT_ACTIVITIES: ActivityEntry[] = [
  { title: 'Galaxy S25 Ultra vs iPhone 17 Pro Max', meta: '1:1 스펙 비교 완료 · 카메라·배터리 항목 대조', time: '방금 전' },
  { title: 'Galaxy S25 Ultra 최저가 알림', meta: '₩1,510,000 (-11.1% 하락)', time: '24분 전' },
  { title: 'MacBook Pro 14 vs Galaxy Book4 Ultra', meta: '노트북 GPU · 무게 · 디스플레이 비교', time: '2시간 전' },
  { title: 'AirPods Pro 2 (USB-C) 찜 추가', meta: '오디오 카테고리 최저가 추적 시작', time: '어제' },
]

export const useSavedStore = defineStore('saved', () => {
  const savedSlugs = useLocalStorage<string[]>('techcompare:saved', DEFAULT_SAVED_SLUGS)
  const activities = useLocalStorage<ActivityEntry[]>('techcompare:activity', DEFAULT_ACTIVITIES)
  const compareCount = useLocalStorage<number>('techcompare:cmp_count', 42)

  const count = computed(() => savedSlugs.value.length)

  function hasSaved(slug: string): boolean {
    return savedSlugs.value.includes(slug)
  }

  function toggleSaved(slug: string): boolean {
    if (hasSaved(slug)) {
      savedSlugs.value = savedSlugs.value.filter((s) => s !== slug)
      return false
    }
    savedSlugs.value = [slug, ...savedSlugs.value]
    return true
  }

  function removeSaved(slug: string) {
    savedSlugs.value = savedSlugs.value.filter((s) => s !== slug)
  }

  function recordComparison(names: string[], categoryLabel: string) {
    if (names.length < 2) return
    compareCount.value += 1
    const title = names.slice(0, 2).join(' vs ') + (names.length > 2 ? ` 외 ${names.length - 2}종` : '')
    const entry: ActivityEntry = {
      title,
      meta: `${categoryLabel} · ${names.length}대 표준 스펙 비교 완료`,
      time: '방금 전',
    }
    activities.value = [entry, ...activities.value.filter((a) => a.title !== title)].slice(0, 8)
  }

  return {
    savedSlugs,
    activities,
    compareCount,
    count,
    hasSaved,
    toggleSaved,
    removeSaved,
    recordComparison,
  }
})
