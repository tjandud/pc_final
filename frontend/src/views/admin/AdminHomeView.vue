<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <section class="wrap page">
    <h1 class="page__h1">관리자</h1>
    <EmptyState
      phase="Phase 7 예정"
      title="관리자 기능은 서버 권한 검증과 함께 구현됩니다"
      description="관리자 권한은 프론트엔드 화면 숨김이 아니라 Express 미들웨어와 Supabase RLS에서 검증합니다. 현재는 어떤 관리 작업도 수행할 수 없습니다."
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
