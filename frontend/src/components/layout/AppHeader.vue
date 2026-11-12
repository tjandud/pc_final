<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Menu, X } from 'lucide-vue-next'
import { useThemeStore, type ThemeId } from '@/stores/theme'

const route = useRoute()
const menuOpen = ref(false)
const themeStore = useThemeStore()
const { current: currentTheme, isWhite } = storeToRefs(themeStore)

const links = [
  { to: '/products', label: '전체', path: '/products', category: null },
  { to: '/products?category=smartphone', label: '스마트폰', path: '/products', category: 'smartphone' },
  { to: '/products?category=tablet', label: '태블릿', path: '/products', category: 'tablet' },
  { to: '/products?category=laptop', label: '노트북', path: '/products', category: 'laptop' },
  { to: '/products?category=smartwatch', label: '워치', path: '/products', category: 'smartwatch' },
  { to: '/products?category=audio', label: '오디오', path: '/products', category: 'audio' },
  { to: '/compare', label: '스펙 비교', path: '/compare', category: null },
] as const

function isActive(l: (typeof links)[number]) {
  if (route.path !== l.path) return false
  const current = typeof route.query.category === 'string' ? route.query.category : null
  return l.path === '/products' ? current === l.category : true
}

watch(
  () => route.query.theme,
  (q) => {
    if (themeStore.options.some((o) => o.id === q)) themeStore.setTheme(q as ThemeId)
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)
</script>

<template>
  <header class="nav top-bar">
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
        <!-- Uiverse Animated Dual-Theme Toggle + Mode Pill -->
        <div class="theme-control" role="group" aria-label="Spotlight 테마 전환">
          <span class="theme-control__label tech-mono">
            {{ isWhite ? 'WHITE' : 'DARK' }}
          </span>

          <label class="uiverse-switch" :title="isWhite ? 'Spotlight Blue 다크 모드로 전환' : 'Spotlight White 라이트 모드로 전환'">
            <input
              type="checkbox"
              class="uiverse-switch__input"
              :checked="isWhite"
              aria-label="다크/화이트 테마 토글"
              @change="themeStore.toggleTheme()"
            />
            <span class="uiverse-switch__slider">
              <span class="uiverse-switch__stars" aria-hidden="true">
                <span class="star star--1"></span>
                <span class="star star--2"></span>
                <span class="star star--3"></span>
              </span>
              <span class="uiverse-switch__clouds" aria-hidden="true"></span>
              <span class="uiverse-switch__knob" aria-hidden="true">
                <!-- Moon craters (Dark mode) -->
                <span class="crater crater--1"></span>
                <span class="crater crater--2"></span>
              </span>
            </span>
          </label>
        </div>

        <RouterLink to="/products" class="btn btn--primary nav__cta">실시간 비교 시작</RouterLink>
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
        <p class="label">SPOTLIGHT 테마 모드</p>
        <div class="sheet__theme-row">
          <button
            v-for="t in themeStore.options"
            :key="t.id"
            type="button"
            class="mode-pill"
            :class="{ 'is-active': currentTheme === t.id }"
            @click="themeStore.setTheme(t.id)"
          >
            <span class="mode-pill__dot" :style="{ backgroundColor: t.swatch }" aria-hidden="true" />
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
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--divider);
  z-index: 30;
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
  gap: 10px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.nav__mark {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--accent-text);
  font-size: 13px;
  font-weight: 800;
  font-family: var(--font-mono);
  box-shadow: 0 6px 18px -4px rgba(0, 150, 255, 0.55);
}

.nav__links {
  display: flex;
  gap: var(--s-5);
  margin-left: var(--s-3);
}

.nav__link {
  position: relative;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
  white-space: nowrap;
  transition: color var(--m-in) var(--m-ease);
}

.nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--m-out) var(--m-ease);
}

.nav__link:hover {
  color: var(--text-main);
}

.nav__link:hover::after {
  transform: scaleX(1);
}

.nav__link.is-active {
  color: var(--text-main);
}

.nav__link.is-active::after {
  transform: scaleX(1);
}

.nav__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

/* Uiverse Animated Theme Switch Container */
.theme-control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 10px;
  border-radius: 999px;
  background: var(--card-inner);
  border: 1px solid var(--card-border);
}

.theme-control__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--badge-text);
  min-width: 40px;
  text-align: center;
}

.uiverse-switch {
  position: relative;
  display: inline-block;
  width: 58px;
  height: 30px;
  cursor: pointer;
  user-select: none;
}

.uiverse-switch__input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.uiverse-switch__slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #05070a 0%, #0d1b36 55%, #004e98 100%);
  border: 1px solid rgba(0, 150, 255, 0.45);
  overflow: hidden;
  transition:
    background 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.4s ease,
    box-shadow 0.4s ease;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.6);
}

.uiverse-switch__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e2e8f0;
  box-shadow:
    inset -3px -2px 0 0 #94a3b8,
    0 0 10px rgba(0, 150, 255, 0.6);
  transition:
    transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.35s ease,
    box-shadow 0.35s ease;
}

.crater {
  position: absolute;
  background: #94a3b8;
  border-radius: 50%;
  transition: opacity 0.25s ease;
}

.crater--1 {
  width: 5px;
  height: 5px;
  top: 5px;
  left: 10px;
}

.crater--2 {
  width: 3px;
  height: 3px;
  top: 12px;
  left: 6px;
}

.uiverse-switch__stars {
  position: absolute;
  inset: 0;
  transition:
    transform 0.35s ease,
    opacity 0.35s ease;
}

.star {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 4px #60bfff;
}

.star--1 {
  width: 3px;
  height: 3px;
  top: 7px;
  right: 12px;
}

.star--2 {
  width: 2px;
  height: 2px;
  top: 16px;
  right: 20px;
}

.star--3 {
  width: 2.5px;
  height: 2.5px;
  top: 11px;
  right: 7px;
}

.uiverse-switch__clouds {
  position: absolute;
  bottom: -10px;
  left: 10px;
  width: 24px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 10px -2px 0 2px rgba(255, 255, 255, 0.75);
  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

/* Checked = Spotlight White Mode */
.uiverse-switch__input:checked + .uiverse-switch__slider {
  background: linear-gradient(135deg, #0077ff 0%, #38bdf8 60%, #bae6fd 100%);
  border-color: rgba(0, 119, 255, 0.45);
  box-shadow: inset 0 1px 4px rgba(0, 65, 160, 0.35);
}

.uiverse-switch__input:checked + .uiverse-switch__slider .uiverse-switch__knob {
  transform: translateX(28px);
  background: #fde047;
  box-shadow:
    0 0 12px 2px rgba(250, 204, 21, 0.85),
    inset 0 0 0 2px #fef08a;
}

.uiverse-switch__input:checked + .uiverse-switch__slider .crater {
  opacity: 0;
}

.uiverse-switch__input:checked + .uiverse-switch__slider .uiverse-switch__stars {
  opacity: 0;
  transform: translateY(-8px);
}

.uiverse-switch__input:checked + .uiverse-switch__slider .uiverse-switch__clouds {
  opacity: 1;
  transform: translateY(-10px);
}

.uiverse-switch__input:focus-visible + .uiverse-switch__slider {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.nav__cta {
  border-radius: 999px;
  height: 38px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 700;
}

.nav__menu {
  display: none;
  width: 42px;
  padding: 0;
}

.sheet {
  position: fixed;
  inset: var(--nav) 0 0 0;
  background: var(--bg-main);
  padding: var(--s-4) var(--gut);
  display: flex;
  flex-direction: column;
}

.sheet__link {
  height: 52px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--divider);
  font-size: 16px;
  font-weight: 600;
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

.mode-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid var(--card-border);
  background: var(--card-inner);
  color: var(--text-sub);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mode-pill.is-active {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.mode-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
  .nav__cta,
  .theme-control__label {
    display: none;
  }
  .theme-control {
    padding: 3px;
  }
}
</style>
