<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Menu, X } from 'lucide-vue-next'
import { useThemeStore, type ThemeId } from '@/stores/theme'

const route = useRoute()
const menuOpen = ref(false)
const themeStore = useThemeStore()
const { current: currentTheme } = storeToRefs(themeStore)

const links = [
  { to: '/products', label: '제품', path: '/products', category: null },
  { to: '/products?category=smartphone', label: '스마트폰', path: '/products', category: 'smartphone' },
  { to: '/products?category=tablet', label: '태블릿', path: '/products', category: 'tablet' },
  { to: '/products?category=smartwatch', label: '워치', path: '/products', category: 'smartwatch' },
  { to: '/compare', label: '비교', path: '/compare', category: null },
] as const

function isActive(l: (typeof links)[number]) {
  if (route.path !== l.path) return false
  const current = typeof route.query.category === 'string' ? route.query.category : null
  return l.path === '/products' ? current === l.category : true
}

watch(
  () => route.query.theme,
  (qTheme) => {
    if (
      qTheme === 'classic-blue' ||
      qTheme === 'sky-blue' ||
      qTheme === 'navy-blue'
    ) {
      themeStore.setTheme(qTheme as ThemeId)
    }
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)
</script>

<template>
  <header class="nav">
    <div class="wrap nav__inner">
      <RouterLink to="/" class="nav__brand" aria-label="TechCompare 홈">
        <span class="nav__mark" aria-hidden="true">TC</span>
        <span>TechCompare</span>
      </RouterLink>

      <nav class="nav__links" aria-label="주요 메뉴">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="nav__link"
          :class="{ 'is-active': isActive(l) }"
          :aria-current="isActive(l) ? 'page' : undefined"
          >{{ l.label }}</RouterLink
        >
      </nav>

      <div class="nav__actions">
        <div class="theme-switch" role="group" aria-label="테마 선택">
          <button
            v-for="t in themeStore.options"
            :key="t.id"
            type="button"
            class="theme-switch__btn"
            :class="{ 'is-active': currentTheme === t.id }"
            :aria-pressed="currentTheme === t.id"
            @click="themeStore.setTheme(t.id)"
          >
            <span class="theme-switch__dot" :style="{ backgroundColor: t.swatch }" aria-hidden="true" />
            <span>{{ t.label }}</span>
          </button>
        </div>

        <RouterLink to="/products" class="btn btn--primary nav__cta">제품 찾기</RouterLink>
        <button
          class="btn btn--secondary nav__menu"
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="20" aria-hidden="true" />
          <Menu v-else :size="20" aria-hidden="true" />
          <span class="sr-only">메뉴</span>
        </button>
      </div>
    </div>

    <div v-if="menuOpen" id="mobile-menu" class="sheet">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="sheet__link">{{ l.label }}</RouterLink>
      <div class="sheet__themes">
        <p class="label">컬러 테마 선택</p>
        <div class="sheet__theme-row">
          <button
            v-for="t in themeStore.options"
            :key="t.id"
            type="button"
            class="theme-switch__btn"
            :class="{ 'is-active': currentTheme === t.id }"
            @click="themeStore.setTheme(t.id)"
          >
            <span class="theme-switch__dot" :style="{ backgroundColor: t.swatch }" aria-hidden="true" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 0 auto 0;
  height: var(--nav);
  background: var(--g-main);
  border-bottom: 1px solid var(--hairline);
  z-index: 10;
}

.nav__inner {
  height: 100%;
  display: flex;
  align-items: center;
  gap: var(--s-5);
}

.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.nav__mark {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: var(--action);
  color: var(--action-ink);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
}

.nav__links {
  display: flex;
  gap: var(--s-5);
  margin-left: var(--s-3);
}

.nav__link {
  position: relative;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
  transition: color var(--m-in) var(--m-ease);
}

.nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -4px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--m-out) var(--m-ease);
}

.nav__link:hover {
  color: var(--ink);
}

.nav__link:hover::after {
  transform: scaleX(1);
}

.nav__link.is-active {
  color: var(--ink);
}

.nav__link.is-active::after {
  height: 2px;
  bottom: -5px;
  background: var(--action);
  transform: scaleX(1);
}

.nav__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.theme-switch {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  background: var(--g-alt);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  gap: 2px;
}

.theme-switch__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.theme-switch__btn:hover {
  color: var(--ink);
}

.theme-switch__btn.is-active {
  background: var(--card);
  color: var(--ink);
  border-color: var(--action-border);
}

.theme-switch__dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}

.nav__menu {
  display: none;
  width: 44px;
  padding: 0;
}

.sheet {
  position: fixed;
  inset: var(--nav) 0 0 0;
  background: var(--g-main);
  padding: var(--s-4) var(--gut);
  display: flex;
  flex-direction: column;
}

.sheet__link {
  height: 52px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--hairline);
  font-size: 17px;
}

.sheet__themes {
  margin-top: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.sheet__theme-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

@media (max-width: 1120px) {
  .theme-switch {
    display: none;
  }
}

@media (max-width: 1023px) {
  .nav__links {
    display: none;
  }
  .nav__menu {
    display: inline-flex;
  }
}

@media (max-width: 639px) {
  .nav__cta {
    display: none;
  }
  .nav__menu {
    width: 44px;
  }
}
</style>
