<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ProductSummaryRecord } from '@/types/api'

const props = defineProps<{
  products: ProductSummaryRecord[]
}>()

const router = useRouter()

const defaultCards = [
  { name: 'iPhone 17 Pro Max', code: 'A3526 · 6.9" 120Hz', price: '₩1,990,000', slug: 'iphone-17-pro-max', img: 'iphone-17-pro-max.jpg' },
  { name: 'Galaxy S25 Ultra', code: 'SM-S938N · 200MP', price: '₩1,698,400', slug: 'galaxy-s25-ultra', img: 'galaxy-s25-ultra.jpg' },
  { name: 'iPad Pro 13 (M4)', code: 'A2925 · Tandem OLED', price: '₩1,999,000', slug: 'ipad-pro-13-m4', img: 'ipad-pro-13-m4.jpg' },
  { name: 'Galaxy Z Fold7', code: 'SM-F966N · 8.0" Fold', price: '₩2,379,300', slug: 'galaxy-z-fold7', img: 'galaxy-z-fold7.jpg' },
  { name: 'iPhone Air', code: 'A3517 · Ultra-Thin', price: '₩1,590,000', slug: 'iphone-air', img: 'iphone-17-air.jpg' },
  { name: 'Galaxy Tab S10 Ultra', code: 'SM-X920 · 14.6" 120Hz', price: '₩1,598,300', slug: 'galaxy-tab-s10-ultra', img: 'galaxy-tab-s10-ultra.jpg' },
  { name: 'Apple Watch Ultra 2', code: 'A2986 · 49mm Titanium', price: '₩1,149,000', slug: 'apple-watch-ultra-2', img: 'apple-watch-ultra-2.jpg' },
  { name: 'Galaxy Watch Ultra', code: 'SM-L705N · 47mm', price: '₩899,800', slug: 'galaxy-watch-ultra', img: 'galaxy-watch-ultra.jpg' },
  { name: 'iPhone 16 Pro Max', code: 'A3296 · A18 Pro', price: '₩1,900,000', slug: 'iphone-16-pro-max', img: 'iphone-16-pro-max.jpg' },
  { name: 'Galaxy Z Flip7', code: 'SM-F766N · FlexWindow', price: '₩1,485,000', slug: 'galaxy-z-flip7', img: 'galaxy-z-flip7.jpg' },
  { name: 'iPad Air 13 (M3)', code: 'A3268 · Apple M3', price: '₩1,249,000', slug: 'ipad-air-13-m3', img: 'ipad-air-13-m3.jpg' },
  { name: 'Apple Watch Series 11', code: 'A3331 · 46mm', price: '₩639,000', slug: 'apple-watch-series-11-46', img: 'apple-watch-series-11-46.jpg' },
]

function formatKrw(val: number | null | undefined): string {
  if (!val) return '정보 없음'
  return `₩${val.toLocaleString('ko-KR')}`
}

const displayItems = computed(() => {
  if (props.products.length >= 6) {
    const list = props.products.slice(0, 12).map((p) => ({
      name: p.name,
      code: `${p.baseModelNumber} · ${p.category.name}`,
      price: formatKrw(p.launchPriceKrw),
      slug: p.slug,
      img: p.thumbnailUrl ? p.thumbnailUrl.replace('/images/products/', '') : `${p.slug}.jpg`,
    }))
    return [...list, ...list]
  }
  return [...defaultCards, ...defaultCards]
})

function handleClick(slug: string) {
  router.push({ name: 'product-detail', params: { slug } })
}
</script>

<template>
  <section class="flex-carousel-section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="section-kicker tech-mono">FLEX CAROUSEL · LIQUID GLASS EDGES</p>
          <h2 class="section-title">리퀴드 글래스 엣지를 통과하는 플렉스 캐러셀</h2>
        </div>
        <p class="section-desc">
          양쪽 끝의 투명한 액체 유리(Liquid Glass) 굴절 영역을 통과하며 무한히 흐르는 이미지 캐러셀입니다. 기기 카드에 마우스를 올리면 부드럽게 확장(Flex)됩니다.
        </p>
      </div>

      <div class="flex-carousel-shell">
        <!-- Liquid Glass Refractive Edge Lenses -->
        <div class="liquid-edge liquid-edge--left" aria-hidden="true"></div>

        <div class="flex-carousel-track">
          <article
            v-for="(item, idx) in displayItems"
            :key="`${item.slug}-${idx}`"
            class="flex-card"
            @click="handleClick(item.slug)"
          >
            <div class="flex-card__stage">
              <img
                :src="`/images/products/${item.img}`"
                :alt="item.name"
                loading="lazy"
                @error="($event.target as HTMLImageElement).src = '/images/products/iphone-17-pro-max.jpg'"
              />
            </div>
            <div class="flex-card__meta">
              <div>
                <div class="flex-card__title">{{ item.name }}</div>
                <div class="flex-card__spec tech-mono">{{ item.code }}</div>
              </div>
              <span class="flex-card__price tech-mono">{{ item.price }}</span>
            </div>
          </article>
        </div>

        <div class="liquid-edge liquid-edge--right" aria-hidden="true"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.flex-carousel-section {
  padding: 84px 0;
  border-bottom: 1px solid var(--divider);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.section-kicker {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.08em;
}

.section-title {
  font-size: clamp(24px, 2vw + 14px, 36px);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-top: 4px;
}

.section-desc {
  color: var(--text-sub);
  font-size: 15px;
  max-width: 54ch;
}

.flex-carousel-shell {
  position: relative;
  height: 310px;
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
}

.liquid-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 145px;
  z-index: 6;
  pointer-events: none;
  backdrop-filter: blur(18px) saturate(190%) contrast(112%);
  -webkit-backdrop-filter: blur(18px) saturate(190%) contrast(112%);
}

.liquid-edge--left {
  left: 0;
  mask-image: linear-gradient(90deg, #000 0%, rgba(0, 0, 0, 0.85) 45%, transparent 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0, 0, 0, 0.85) 45%, transparent 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(90deg, rgba(0, 150, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 65%, transparent 100%);
  box-shadow: inset -14px 0 28px -12px rgba(0, 150, 255, 0.35);
}

.liquid-edge--right {
  right: 0;
  mask-image: linear-gradient(270deg, #000 0%, rgba(0, 0, 0, 0.85) 45%, transparent 100%);
  -webkit-mask-image: linear-gradient(270deg, #000 0%, rgba(0, 0, 0, 0.85) 45%, transparent 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(270deg, rgba(0, 150, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 65%, transparent 100%);
  box-shadow: inset 14px 0 28px -12px rgba(0, 150, 255, 0.35);
}

:root[data-theme='white'] .liquid-edge--left {
  border-right: 1px solid rgba(10, 132, 255, 0.22);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.85) 0%, rgba(224, 242, 254, 0.45) 65%, transparent 100%);
  box-shadow: inset -14px 0 28px -12px rgba(10, 132, 255, 0.22);
}

:root[data-theme='white'] .liquid-edge--right {
  border-left: 1px solid rgba(10, 132, 255, 0.22);
  background: linear-gradient(270deg, rgba(255, 255, 255, 0.85) 0%, rgba(224, 242, 254, 0.45) 65%, transparent 100%);
  box-shadow: inset 14px 0 28px -12px rgba(10, 132, 255, 0.22);
}

.flex-carousel-track {
  display: flex;
  align-items: center;
  gap: 18px;
  width: max-content;
  padding: 0 24px;
  animation: flex-flow 32s linear infinite;
}

.flex-carousel-shell:hover .flex-carousel-track {
  animation-play-state: paused;
}

@keyframes flex-flow {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

.flex-card {
  width: 195px;
  height: 256px;
  border-radius: 22px;
  background: var(--card-inner);
  border: 1px solid var(--card-border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  overflow: hidden;
  transition:
    width 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.3s ease;
}

.flex-card:hover {
  width: 310px;
  border-color: var(--accent);
  box-shadow: 0 18px 40px -12px var(--accent-glow);
  transform: translateY(-4px);
}

.flex-card__stage {
  height: 145px;
  border-radius: 16px;
  background: radial-gradient(circle at 50% 42%, #ffffff 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.flex-card__stage img {
  max-height: 124px;
  max-width: 100%;
  object-fit: contain;
  mix-blend-mode: multiply;
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.flex-card:hover .flex-card__stage img {
  transform: scale(1.1);
}

.flex-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.flex-card__title {
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.flex-card__spec {
  font-size: 11px;
  color: var(--text-sub);
  white-space: nowrap;
}

.flex-card__price {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  white-space: nowrap;
}
</style>
