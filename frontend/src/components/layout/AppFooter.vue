<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="wrap footer__inner">
      <div>
        <p class="footer__brand">TechCompare</p>
        <p class="muted footer__desc">Apple · Samsung 스마트폰, 태블릿, 스마트워치 스펙 및 가격 비교</p>
      </div>
      <nav class="footer__links" aria-label="하단 메뉴">
        <RouterLink to="/products">제품</RouterLink>
        <RouterLink to="/compare">비교</RouterLink>
      </nav>
    </div>
    <div class="wrap footer__legal muted">
      <span>© {{ year }} TechCompare</span>
      <span>제품 사양 및 가격은 각 데이터 출처 기준이며 수집 시각이 함께 표시됩니다.</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--hairline);
  background: var(--g-alt);
  padding: var(--s-8) 0 var(--s-7);
  margin-top: var(--s-9);
}

.footer__inner {
  display: flex;
  justify-content: space-between;
  gap: var(--s-6);
  flex-wrap: wrap;
}

.footer__brand {
  font-size: 20px;
  font-weight: 500;
}

.footer__desc {
  margin-top: var(--s-2);
  font-size: var(--t-small);
}

.footer__links {
  display: flex;
  gap: var(--s-5);
  font-size: 15px;
}

.footer__legal {
  margin-top: var(--s-7);
  padding-top: var(--s-5);
  border-top: 1px solid var(--hairline);
  display: flex;
  justify-content: space-between;
  gap: var(--s-4);
  flex-wrap: wrap;
  font-size: var(--t-label);
}

/* Keep footer clear of the compare tray */
:global(body.has-tray) .footer {
  padding-bottom: calc(var(--s-7) + 88px);
}
</style>
