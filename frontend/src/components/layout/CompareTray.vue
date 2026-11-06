<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { X } from 'lucide-vue-next'
import { useCompareStore, COMPARE_MAX, COMPARE_MIN } from '@/stores/compare'

const route = useRoute()
const store = useCompareStore()
const { items, count, canCompare } = storeToRefs(store)
const showTray = computed(() => count.value > 0 && route.name !== 'compare')

watchEffect(() => {
  document.body.classList.toggle('has-tray', showTray.value)
})
</script>

<template>
  <aside v-if="showTray" class="tray" aria-label="비교함">
    <div class="wrap tray__inner">
      <ul class="tray__items">
        <li v-for="i in items" :key="i.productSlug + (i.variantId ?? '')" class="tray__chip">
          <span>{{ i.name }}</span>
          <button type="button" class="tray__remove" @click="store.remove(i.productSlug, i.variantId)">
            <X :size="14" aria-hidden="true" />
            <span class="sr-only">{{ i.name }} 비교함에서 제거</span>
          </button>
        </li>
      </ul>
      <span class="label num">{{ count }} / {{ COMPARE_MAX }}</span>
      <button type="button" class="btn btn--secondary" @click="store.clear()">비우기</button>
      <RouterLink
        :to="{ name: 'compare', query: canCompare ? { items: store.toQueryParam() } : {} }"
        class="btn btn--primary"
        :aria-disabled="!canCompare"
        :class="{ 'is-disabled': !canCompare }"
      >
        {{ canCompare ? '비교하기' : `${COMPARE_MIN}개 이상 선택` }}
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.tray {
  position: fixed;
  inset: auto 0 0 0;
  background: var(--card);
  border-top: 1px solid var(--hairline-strong);
  z-index: 9;
  padding: var(--s-3) 0 calc(var(--s-3) + env(safe-area-inset-bottom));
}

.tray__inner {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.tray__items {
  display: flex;
  gap: var(--s-2);
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-x: auto;
}

.tray__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  height: 36px;
  padding: 0 var(--s-2) 0 var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  font-size: var(--t-small);
  white-space: nowrap;
}

.tray__remove {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
}

.tray__remove:hover {
  color: var(--ink);
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

@media (max-width: 639px) {
  .tray__inner {
    flex-wrap: wrap;
  }
  .tray__items {
    flex-basis: 100%;
  }
  .tray .btn {
    width: auto;
    flex: 1;
  }
}
</style>
