<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import CompareTray from '@/components/layout/CompareTray.vue'
</script>

<template>
  <a class="skip-link" href="#main">본문으로 건너뛰기</a>
  <AppHeader />
  <main id="main" class="app-main">
    <RouterView />
  </main>
  <AppFooter />
  <CompareTray />
</template>

<style scoped>
.app-main {
  padding-top: var(--nav);
  min-height: calc(100svh - var(--nav));
}

.skip-link {
  position: absolute;
  left: var(--s-4);
  top: var(--s-2);
  z-index: 20;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.skip-link:focus {
  width: auto;
  height: auto;
  clip-path: none;
  padding: var(--s-2) var(--s-4);
  background: var(--card);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-sm);
}
</style>
