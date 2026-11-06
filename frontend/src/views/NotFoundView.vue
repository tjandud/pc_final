<template>
  <section class="wrap page">
    <p class="label num">404</p>
    <h1 class="page__h1">페이지를 찾을 수 없습니다</h1>
    <div>
      <RouterLink to="/" class="btn btn--secondary">홈으로 이동</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.page {
  padding-top: var(--s-9);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.page__h1 {
  font-size: var(--t-h2);
  letter-spacing: -0.03em;
}
</style>
