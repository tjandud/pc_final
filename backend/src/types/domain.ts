export type BrandSlug =
  | 'apple'
  | 'samsung'
  | 'sony'
  | 'lenovo'
  | 'lg'
  | 'asus'
  | 'bose'
  | 'sennheiser'
  | 'beats'
  | 'google'
  | 'xiaomi'
  | 'garmin';
export type CategorySlug = 'smartphone' | 'tablet' | 'smartwatch' | 'laptop' | 'audio';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'needs_review';
export type SpecKey =
  | 'processor'
  | 'memory'
  | 'storage'
  | 'display'
  | 'resolution'
  | 'refresh_rate'
  | 'battery'
  | 'camera'
  | 'weight'
  | 'dimensions'
  | 'connectivity'
  | 'os';

export type ComparisonRule = 'higher_better' | 'lower_better' | 'neutral';

export interface BrandRecord {
  id: string;
  slug: BrandSlug;
  name: string;
  officialWebsite: string | null;
  logoUrl: string | null;
  displayOrder: number;
}

export interface CategoryRecord {
  id: string;
  slug: CategorySlug;
  name: string;
  nameEn: string;
  displayOrder: number;
}

export interface DataSourceSummary {
  id: string;
  code: string;
  name: string;
  sourceType: 'official_manufacturer' | 'external_api' | 'manual_admin' | 'verified_retailer' | 'test_seed';
  baseUrl: string | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
}

export interface ProductVariantRecord {
  id: string;
  productId: string;
  skuCode: string;
  modelNumber: string;
  storageCapacity: string | null;
  ramCapacity: string | null;
  connectivity: string | null;
  colorName: string | null;
  colorHex: string | null;
  launchPriceKrw: number | null;
  launchPriceUsd: number | null;
  currentLowestPriceKrw: number | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface ProductSummaryRecord {
  id: string;
  slug: string;
  name: string;
  series: string;
  baseModelNumber: string | null;
  releaseDate: string;
  brand: BrandRecord;
  category: CategoryRecord;
  thumbnailUrl: string | null;
  launchPriceKrw: number | null;
  currentLowestPriceKrw: number | null;
  defaultVariantId: string | null;
  verificationStatus: VerificationStatus;
  isTestData: boolean;
  viewCount: number;
  lastSyncedAt: string | null;
}

export interface ProductImageRecord {
  id: string;
  imageUrl: string;
  imageType: 'thumbnail' | 'front' | 'back' | 'side' | 'gallery';
  altText: string | null;
  licenseNote: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductDetailRecord extends ProductSummaryRecord {
  dataSource: DataSourceSummary | null;
  variants: ProductVariantRecord[];
  images: ProductImageRecord[];
}

export interface SpecDefinitionRecord {
  id: string;
  categorySlug: CategorySlug;
  specKey: SpecKey;
  displayName: string;
  unit: string | null;
  dataType: 'text' | 'number' | 'boolean';
  comparisonRule: ComparisonRule;
  isComparable: boolean;
  isVariantSpecific: boolean;
  displayOrder: number;
}

export interface ResolvedSpecItem {
  specKey: SpecKey;
  displayName: string;
  unit: string | null;
  value: string | null;
  displayValue: string; // Returns '정보 없음' when value is null
  numericValue: number | null;
  comparisonRule: ComparisonRule;
  isVariantSpecific: boolean;
  sourceScope: 'variant' | 'product' | 'missing';
}

export type ProductSortOption =
  | 'release_desc'
  | 'release_asc'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc';

export interface ProductFilterQuery {
  q?: string;
  brand?: BrandSlug;
  category?: CategorySlug;
  series?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSortOption;
  page: number;
  limit: number;
  includeTest: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CompareSpecCell {
  productSlug: string;
  variantId: string | null;
  value: string | null;
  displayValue: string;
  numericValue: number | null;
  isWinner: boolean;
}

export interface CompareSpecRow {
  specKey: SpecKey;
  displayName: string;
  unit: string | null;
  comparisonRule: ComparisonRule;
  isDifferent: boolean;
  cells: CompareSpecCell[];
}

export interface CompareProductItem {
  product: ProductDetailRecord;
  selectedVariant: ProductVariantRecord | null;
}

export interface CompareScorecard {
  productSlug: string;
  productName: string;
  brandName: string;
  winCount: number;
  winningSpecs: string[];
  launchPriceKrw: number | null;
}

export interface CompareAnalysisSummary {
  priceInsight: string;
  lowestPriceProductSlug: string | null;
  priceGapKrw: number | null;
  differingSpecsCount: number;
  totalSpecsCount: number;
  scorecards: CompareScorecard[];
  highlights: string[];
}

export interface CompareResult {
  category: CategoryRecord;
  items: CompareProductItem[];
  specRows: CompareSpecRow[];
  hasLaunchPrices: boolean;
  hasCurrentPrices: boolean;
  analysis: CompareAnalysisSummary;
}

export interface DataAuditItem {
  id: string;
  slug: string;
  name: string;
  brandSlug: BrandSlug;
  brandName: string;
  categorySlug: CategorySlug;
  categoryName: string;
  series: string;
  baseModelNumber: string | null;
  releaseDate: string;
  releaseDateValid: boolean;
  launchPriceKrw: number | null;
  variantCount: number;
  filledSpecsCount: number;
  totalCategorySpecs: number;
  missingSpecKeys: SpecKey[];
  verificationStatus: VerificationStatus;
  sourceUrl: string | null;
}

export interface DataAuditSummary {
  totalProducts: number;
  appleCount: number;
  samsungCount: number;
  smartphoneCount: number;
  tabletCount: number;
  smartwatchCount: number;
  laptopCount: number;
  audioCount: number;
  allReleaseDatesValid: boolean;
  uniqueSlugsCount: number;
  uniqueModelNumbersCount: number;
  items: DataAuditItem[];
}

export interface AdminProductSpecInput {
  specKey: SpecKey;
  specValue: string | null;
  numericValue?: number | null;
}

export interface AdminProductUpsertInput {
  slug: string;
  name: string;
  brand: BrandSlug;
  category: CategorySlug;
  series: string;
  baseModelNumber: string;
  releaseDate: string;
  launchPriceKrw: number | null;
  storageCapacity?: string | null;
  connectivity?: string | null;
  colorName?: string | null;
  sourceUrl?: string | null;
  specs?: AdminProductSpecInput[];
}
