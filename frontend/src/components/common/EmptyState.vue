<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  phase?: string
}>()
</script>

<template>
  <div class="empty card">
    <p v-if="phase" class="label">{{ phase }}</p>
    <h3 class="empty__title">{{ title }}</h3>
    <p v-if="description" class="empty__desc">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.empty__title {
  font-size: var(--t-card);
}

.empty__desc {
  color: var(--c-text);
  max-width: 62ch;
}
</style>
