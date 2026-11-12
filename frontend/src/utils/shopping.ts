import type { BrandSlug } from '@/types/api'

export interface ShoppingMallLink {
  id: 'danawa' | 'naver' | 'coupang' | 'official'
  mallName: string
  badge: string
  description: string
  searchQuery: string
  url: string
  modelNumberUrl?: string
}

export interface ShoppingLinkInput {
  name: string
  brandSlug: BrandSlug
  baseModelNumber?: string | null
  storageCapacity?: string | null
  connectivity?: string | null
  officialUrl?: string | null
}

const OFFICIAL_MALL_NAMES: Record<BrandSlug, string> = {
  apple: 'Apple 공식 스토어',
  samsung: '삼성닷컴 공식몰',
  lg: 'LGE.COM 공식몰',
  sony: '소니 스토어 공식몰',
  lenovo: '레노버 공식 스토어',
  asus: 'ASUS 코리아 공식몰',
  bose: 'Bose 코리아 공식몰',
  sennheiser: '젠하이저 공식몰',
  beats: 'Beats 공식몰',
  google: 'Google Store',
  xiaomi: '샤오미 공식몰',
  garmin: '가민 코리아 공식몰',
}

const OFFICIAL_SEARCH_URLS: Record<BrandSlug, (name: string) => string> = {
  apple: (name) => `https://www.apple.com/kr/search/${encodeURIComponent(name)}?src=globalnav`,
  samsung: (name) => `https://www.samsung.com/sec/aisearch/?searchvalue=${encodeURIComponent(name)}`,
  lg: (name) => `https://www.lge.co.kr/search/searchResult?search=${encodeURIComponent(name)}`,
  sony: (name) => `https://store.sony.co.kr/search?keyword=${encodeURIComponent(name)}`,
  lenovo: (name) => `https://www.lenovo.com/kr/ko/search?text=${encodeURIComponent(name)}`,
  asus: (name) => `https://www.asus.com/kr/searchresult?searchType=products&searchKey=${encodeURIComponent(name)}`,
  bose: (name) => `https://www.bose.co.kr/search?q=${encodeURIComponent(name)}`,
  sennheiser: (name) => `https://www.sennheiser-korea.com/product/search.html?keyword=${encodeURIComponent(name)}`,
  beats: (name) => `https://www.beatsbydre.com/kr/search?q=${encodeURIComponent(name)}`,
  google: (name) => `https://store.google.com/search?q=${encodeURIComponent(name)}`,
  xiaomi: (name) => `https://www.mi.com/kr/search/${encodeURIComponent(name)}`,
  garmin: (name) => `https://www.garmin.co.kr/products/?search=${encodeURIComponent(name)}`,
}

/**
 * Builds accurate auto-search URLs for Danawa, Naver Shopping, Coupang, and Official Store
 * using the product name, selected storage capacity, and official model number.
 */
export function buildShoppingMallLinks(input: ShoppingLinkInput): ShoppingMallLink[] {
  const cleanName = input.name.trim()
  const storage = input.storageCapacity?.trim() ?? ''
  const modelNo = input.baseModelNumber?.trim() ?? ''

  // Primary shopping search keyword (e.g., "iPhone 17 Pro 256GB" or "Galaxy S25 Ultra 256GB")
  const primaryQuery = storage && !cleanName.includes(storage) ? `${cleanName} ${storage}` : cleanName

  // Model-number exact search keyword (e.g., "Galaxy S25 Ultra SM-S938N" or "iPhone 17 Pro A3523")
  const modelQuery = modelNo ? `${cleanName} ${modelNo}` : primaryQuery

  const danawaUrl = `https://search.danawa.com/dsearch.php?k1=${encodeURIComponent(primaryQuery)}`
  const danawaModelUrl = modelNo
    ? `https://search.danawa.com/dsearch.php?k1=${encodeURIComponent(modelQuery)}`
    : undefined

  const naverUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(primaryQuery)}&frm=NVSHATC`
  const naverModelUrl = modelNo
    ? `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(modelQuery)}&frm=NVSHATC`
    : undefined

  const coupangUrl = `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(primaryQuery)}`
  const coupangModelUrl = modelNo
    ? `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(modelQuery)}`
    : undefined

  const defaultOfficial =
    OFFICIAL_SEARCH_URLS[input.brandSlug]?.(cleanName) ??
    `https://search.naver.com/search.naver?query=${encodeURIComponent(cleanName)}`

  return [
    {
      id: 'danawa',
      mallName: '다나와 (Danawa)',
      badge: '가격비교',
      description: '오픈마켓·종합몰 최저가 및 조건별 가격 비교',
      searchQuery: primaryQuery,
      url: danawaUrl,
      modelNumberUrl: danawaModelUrl,
    },
    {
      id: 'naver',
      mallName: '네이버쇼핑',
      badge: 'N페이·최저가',
      description: '네이버플러스 멤버십·도착보장 및 최저가 검색',
      searchQuery: primaryQuery,
      url: naverUrl,
      modelNumberUrl: naverModelUrl,
    },
    {
      id: 'coupang',
      mallName: '쿠팡 (Coupang)',
      badge: '로켓배송',
      description: '쿠팡 자급제 로켓배송·카드 즉시할인 실구매가 확인',
      searchQuery: primaryQuery,
      url: coupangUrl,
      modelNumberUrl: coupangModelUrl,
    },
    {
      id: 'official',
      mallName: OFFICIAL_MALL_NAMES[input.brandSlug] ?? '제조사 공식몰',
      badge: '공식출고가',
      description: '제조사 공식 출고가·보상판매 및 정품 사양서 확인',
      searchQuery: modelNo || cleanName,
      url: input.officialUrl || defaultOfficial,
    },
  ]
}
