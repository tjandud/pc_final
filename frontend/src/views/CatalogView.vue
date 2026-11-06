<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'

const route = useRoute()
const activeQuery = computed(() => Object.entries(route.query).filter(([, v]) => v != null && v !== ''))
</script>

<template>
  <section class="wrap page">
    <h1 class="page__h1">제품 탐색</h1>
    <p v-if="activeQuery.length" class="muted page__query">
      현재 URL 조건:
      <span class="num">{{ activeQuery.map(([k, v]) => `${k}=${v}`).join(' · ') }}</span>
    </p>
    <EmptyState
      phase="Phase 3 예정"
      title="제품 목록은 DB 연결 후 표시됩니다"
      description="검색(디바운스), 브랜드·카테고리·출시 연도·가격 범위 필터와 정렬이 URL 쿼리 파라미터와 동기화되어 구현됩니다. 임의의 샘플 제품은 표시하지 않습니다."
    />
  </section>
</template>

<style scoped>
.page {
  padding-top: var(--s-8);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.page__h1 {
  font-size: var(--t-h2);
  letter-spacing: -0.03em;
}

.page__query {
  font-size: var(--t-small);
}
</style>
