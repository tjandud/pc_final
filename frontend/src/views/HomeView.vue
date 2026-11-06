<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Search, ArrowRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { api, ApiClientError } from '@/services/api'
import type { HealthStatus } from '@/types/api'

const router = useRouter()
const query = ref('')
const health = ref<HealthStatus | null>(null)
const healthError = ref<string | null>(null)

onMounted(async () => {
  try {
    health.value = await api.health()
  } catch (e) {
    healthError.value = e instanceof ApiClientError ? e.message : '알 수 없는 오류'
  }
})

function submit() {
  const q = query.value.trim()
  router.push({ name: 'catalog', query: q ? { q } : {} })
}

const families = [
  { brand: 'Apple', items: ['iPhone', 'iPad', 'Apple Watch'] },
  { brand: 'Samsung', items: ['Galaxy S', 'Galaxy Z Fold', 'Galaxy Z Flip', 'Galaxy A', 'Galaxy Tab', 'Galaxy Watch'] },
]
</script>

<template>
  <section class="hero">
    <div class="wrap hero__grid">
      <div class="hero__text">
        <h1 class="hero__h1">Apple과 Samsung 기기, 스펙과 가격을 한 화면에서 비교하세요</h1>
        <p class="hero__lead">
          스마트폰, 태블릿, 스마트워치의 상세 사양과 판매 가격 변동을 출처와 수집 시각과 함께 보여드립니다.
        </p>
        <form class="search" role="search" @submit.prevent="submit">
          <Search :size="20" class="search__icon" aria-hidden="true" />
          <label for="home-search" class="sr-only">제품명 또는 모델 번호 검색</label>
          <input
            id="home-search"
            v-model="query"
            class="search__input"
            type="search"
            placeholder="제품명 또는 모델 번호 (예: Galaxy S25, A3293)"
            autocomplete="off"
          />
          <button class="btn btn--primary" type="submit">
            검색
            <ArrowRight :size="18" aria-hidden="true" />
          </button>
        </form>
      </div>

      <div class="hero__families">
        <div v-for="f in families" :key="f.brand" class="family card">
          <p class="label">{{ f.brand }}</p>
          <ul class="family__list">
            <li v-for="name in f.items" :key="name">{{ name }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap status">
    <h2 class="status__h2">개발 상태 <span class="muted">Phase 1 기반 구축</span></h2>
    <ul class="rows status__rows">
      <li>
        <span>백엔드 API 연결</span>
        <span v-if="health" class="ok">정상</span>
        <span v-else-if="healthError" class="bad">{{ healthError }}</span>
        <span v-else class="muted">확인 중…</span>
      </li>
      <li>
        <span>TechSpecs 인증 정보 (서버)</span>
        <span v-if="health" :class="health.config.techspecs.credentialsConfigured ? 'ok' : 'bad'">
          {{ health.config.techspecs.credentialsConfigured ? '설정됨' : '미설정' }}
        </span>
        <span v-else class="muted">—</span>
      </li>
      <li>
        <span>TechSpecs 실시간 호출</span>
        <span v-if="health" class="muted">{{ health.config.techspecs.liveCallEnabled ? '활성' : '비활성 (보호 모드)' }}</span>
        <span v-else class="muted">—</span>
      </li>
      <li>
        <span>Supabase 연결</span>
        <span v-if="health" :class="health.config.supabase.configured ? 'ok' : 'muted'">
          {{ health.config.supabase.configured ? '설정됨' : 'Phase 2 예정' }}
        </span>
        <span v-else class="muted">—</span>
      </li>
    </ul>
    <p class="muted status__note">
      인기 제품, 최근 출시 제품, 최근 가격 변동 제품은 실제 DB 데이터가 연결되는 Phase 3에서 표시됩니다.
    </p>
  </section>
</template>

<style scoped>
.hero {
  padding: var(--s-9) 0 var(--s-8);
  border-bottom: 1px solid var(--hairline);
}

.hero__grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--grid-gap);
  align-items: start;
}

.hero__text {
  grid-column: 1 / span 7;
}

.hero__families {
  grid-column: 9 / span 4;
  display: grid;
  gap: var(--grid-gap);
}

.hero__h1 {
  font-size: var(--t-h1);
  line-height: 1.06;
  letter-spacing: -0.035em;
  max-width: 18ch;
}

.hero__lead {
  margin-top: var(--s-5);
  font-size: var(--t-lead);
  line-height: 1.55;
  color: var(--c-text);
  max-width: 46ch;
}

.search {
  margin-top: var(--s-6);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  height: 56px;
  padding: 0 var(--s-2) 0 var(--s-4);
  background: var(--card);
  border: 1px solid var(--hairline-strong);
  border-radius: var(--r-md);
  max-width: 620px;
  transition: border-color var(--m-in) var(--m-ease);
}

.search:focus-within {
  border-color: var(--action);
}

.search__icon {
  color: var(--muted);
  flex: none;
}

.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  outline: none;
}

.search__input::placeholder {
  color: var(--muted);
}

.family__list {
  list-style: none;
  margin: var(--s-3) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.family__list li {
  padding: var(--s-1) var(--s-3);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  font-size: var(--t-small);
}

.status {
  padding-top: var(--s-8);
}

.status__h2 {
  font-size: var(--t-h3);
}

.status__rows {
  margin-top: var(--s-5);
  max-width: 720px;
}

.status__note {
  margin-top: var(--s-4);
  font-size: var(--t-small);
}

.ok {
  color: var(--spec-win);
}

.bad {
  color: var(--price-rise);
}

@media (max-width: 1023px) {
  .hero__text,
  .hero__families {
    grid-column: 1 / -1;
  }
  .hero__families {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 639px) {
  .hero {
    padding: var(--s-8) 0 var(--s-7);
  }
  .hero__families {
    grid-template-columns: 1fr;
  }
  .search {
    height: auto;
    flex-wrap: wrap;
    padding: var(--s-2);
  }
  .search__icon {
    display: none;
  }
  .search__input {
    height: 44px;
    flex-basis: 100%;
    padding: 0 var(--s-2);
  }
}
</style>
