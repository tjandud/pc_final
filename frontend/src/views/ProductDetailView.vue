<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'

defineProps<{ slug: string }>()
</script>

<template>
  <section class="wrap page">
    <p class="label num">/products/{{ slug }}</p>
    <h1 class="page__h1">제품 상세</h1>
    <EmptyState
      phase="Phase 3 예정"
      title="제품 상세 정보는 DB 연결 후 표시됩니다"
      description="기본 정보, 변형 모델별 사양, 카테고리별 상세 스펙(없는 값은 '정보 없음'), 출시 가격·현재 판매 가격·과거 가격 이력이 구분되어 표시됩니다."
    />
  </section>
</template>

<style scoped>
.page {
  padding-top: var(--s-8);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.page__h1 {
  font-size: var(--t-h2);
  letter-spacing: -0.03em;
}
</style>
