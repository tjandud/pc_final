<script setup lang="ts">
import { storeToRefs } from 'pinia'
import EmptyState from '@/components/common/EmptyState.vue'
import { useCompareStore, COMPARE_MAX, COMPARE_MIN } from '@/stores/compare'

const { count } = storeToRefs(useCompareStore())
</script>

<template>
  <section class="wrap page">
    <h1 class="page__h1">제품 비교</h1>
    <p class="muted">
      동일 카테고리 제품 <span class="num">{{ COMPARE_MIN }}–{{ COMPARE_MAX }}</span>개를 비교할 수 있습니다. 현재
      비교함: <span class="num">{{ count }}</span>개
    </p>
    <EmptyState
      phase="Phase 4 예정"
      title="비교 표는 제품 데이터 연결 후 구현됩니다"
      description="카테고리별 비교 항목, 서로 다른 사양 강조, 가격 비교, 장단점 요약, 그리고 같은 결과를 복원하는 공유 URL이 제공됩니다."
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
