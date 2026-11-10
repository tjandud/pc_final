<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  {
    size: 16,
  },
)
</script>

<template>
  <!-- Apple Official Vector Silhouette -->
  <svg
    v-if="name === 'brand-apple' || name === 'apple'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    class="tech-icon"
    aria-hidden="true"
  >
    <path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3"
    />
  </svg>

  <!-- Samsung Geometric Emblem Vector -->
  <svg
    v-else-if="name === 'brand-samsung' || name === 'samsung'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <ellipse cx="12" cy="12" rx="10" ry="5.5" transform="rotate(-12 12 12)" />
    <path d="M8.5 10.5h2.2m-2.2 1.5h2.2m-2.2 1.5h2.2M13.5 10.5l1.2 3 1.2-3" stroke-width="1.5" />
  </svg>

  <!-- Shopping Mall: Danawa (Price Pulse / Tag) -->
  <svg
    v-else-if="name === 'mall-danawa' || name === 'danawa'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
    <circle cx="19" cy="9" r="1.5" fill="currentColor" />
  </svg>

  <!-- Shopping Mall: Naver Shopping (Geometric N Badge) -->
  <svg
    v-else-if="name === 'mall-naver' || name === 'naver'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z" />
  </svg>

  <!-- Shopping Mall: Coupang (Rocket Vector) -->
  <svg
    v-else-if="name === 'mall-coupang' || name === 'coupang'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path
      d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
    />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>

  <!-- Shopping Mall: Official Store (Verified Shield) -->
  <svg
    v-else-if="name === 'mall-official' || name === 'official'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>

  <!-- Spec: processor (Silicon Die / CPU) -->
  <svg
    v-else-if="name === 'spec-processor' || name === 'processor'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
  </svg>

  <!-- Spec: memory (RAM Module) -->
  <svg
    v-else-if="name === 'spec-memory' || name === 'memory'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M8 11V9M16 11V9M12 11V9M2 15h20" />
    <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
  </svg>

  <!-- Spec: storage (NVMe / Flash Storage) -->
  <svg
    v-else-if="name === 'spec-storage' || name === 'storage'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <line x1="22" x2="2" y1="12" y2="12" />
    <path
      d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
    />
    <line x1="6" x2="6.01" y1="16" y2="16" />
    <line x1="10" x2="10.01" y1="16" y2="16" />
  </svg>

  <!-- Spec: display (OLED Screen) -->
  <svg
    v-else-if="name === 'spec-display' || name === 'display'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
    <path d="m9 9 6-3m-6 7 6-3" opacity="0.6" />
  </svg>

  <!-- Spec: resolution (Pixel Density / Frame) -->
  <svg
    v-else-if="name === 'spec-resolution' || name === 'resolution'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>

  <!-- Spec: refresh_rate (120Hz High Frequency Gauge) -->
  <svg
    v-else-if="name === 'spec-refresh_rate' || name === 'refresh_rate'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>

  <!-- Spec: battery (Battery Capacity) -->
  <svg
    v-else-if="name === 'spec-battery' || name === 'battery'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
    <line x1="22" x2="22" y1="11" y2="13" />
    <path d="m11 10-2 2h3l-2 2" />
  </svg>

  <!-- Spec: camera (Optical Lens Aperture) -->
  <svg
    v-else-if="name === 'spec-camera' || name === 'camera'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path
      d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
    />
    <circle cx="12" cy="13" r="3.5" />
  </svg>

  <!-- Spec: weight (Precision Scale) -->
  <svg
    v-else-if="name === 'spec-weight' || name === 'weight'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <circle cx="12" cy="5" r="3" />
    <path
      d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"
    />
  </svg>

  <!-- Spec: dimensions (Chassis Caliper) -->
  <svg
    v-else-if="name === 'spec-dimensions' || name === 'dimensions'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path
      d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"
    />
    <path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
  </svg>

  <!-- Spec: connectivity (5G / Wi-Fi 7 Signal) -->
  <svg
    v-else-if="name === 'spec-connectivity' || name === 'connectivity'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <path d="M12 20h.01" />
    <path d="M2 8.82a15 15 0 0 1 20 0" />
    <path d="M5 12.859a10 10 0 0 1 14 0" />
    <path d="M8.5 16.429a5 5 0 0 1 7 0" />
  </svg>

  <!-- Spec: os (Operating System Layers) -->
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="tech-icon"
    aria-hidden="true"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
</template>

<style scoped>
.tech-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
