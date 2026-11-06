import type {
  AdminProductUpsertInput,
  BrandRecord,
  BrandSlug,
  CategoryRecord,
  CategorySlug,
  DataAuditSummary,
  PaginatedResult,
  ProductDetailRecord,
  ProductFilterQuery,
  ProductSummaryRecord,
  ProductVariantRecord,
  ResolvedSpecItem,
  SpecDefinitionRecord,
} from '../types/domain.js';

export interface RawSpecEntry {
  productId: string;
  variantId: string | null;
  specKey: SpecDefinitionRecord['specKey'];
  specValue: string | null;
  numericValue: number | null;
}

export interface ICatalogRepository {
  getBrands(): Promise<BrandRecord[]>;
  getCategories(): Promise<CategoryRecord[]>;
  getSpecDefinitionsByCategory(categorySlug: CategorySlug): Promise<SpecDefinitionRecord[]>;
  listProducts(filter: ProductFilterQuery): Promise<PaginatedResult<ProductSummaryRecord>>;
  getProductBySlug(slug: string, includeTest?: boolean): Promise<ProductDetailRecord | null>;
  getVariantsByProductSlug(slug: string, includeTest?: boolean): Promise<ProductVariantRecord[] | null>;
  getSpecsForProduct(
    slug: string,
    variantId?: string,
    includeTest?: boolean,
  ): Promise<{
    product: ProductDetailRecord;
    selectedVariant: ProductVariantRecord | null;
    definitions: SpecDefinitionRecord[];
    rawSpecs: RawSpecEntry[];
  } | null>;
  getDataAudit?(): Promise<DataAuditSummary>;
  upsertProduct?(input: AdminProductUpsertInput, persistToDisk?: boolean): Promise<ProductDetailRecord>;
  deleteProduct?(slug: string, persistToDisk?: boolean): Promise<boolean>;
}

/**
 * Resolves category-filtered specifications for a product and optional variant.
 * Rule 1: Only specs defined in `spec_definitions` for the product's category are returned.
 * Rule 2: Variant-level spec overrides product-level spec when available.
 * Rule 3: Missing or null values are never fabricated; `displayValue` is set to '정보 없음'.
 */
export function resolveCategorySpecs(
  definitions: SpecDefinitionRecord[],
  rawSpecs: RawSpecEntry[],
  variantId: string | null,
): ResolvedSpecItem[] {
  const sortedDefs = [...definitions].sort((a, b) => a.displayOrder - b.displayOrder);

  return sortedDefs.map((def) => {
    const variantSpec = variantId
      ? rawSpecs.find((s) => s.specKey === def.specKey && s.variantId === variantId && s.specValue !== null)
      : undefined;

    const baseSpec = rawSpecs.find(
      (s) => s.specKey === def.specKey && s.variantId === null && s.specValue !== null,
    );

    const chosen = variantSpec ?? baseSpec;
    const rawValue = chosen?.specValue?.trim() || null;

    return {
      specKey: def.specKey,
      displayName: def.displayName,
      unit: def.unit,
      value: rawValue,
      displayValue: rawValue ?? '정보 없음',
      numericValue: chosen?.numericValue ?? null,
      comparisonRule: def.comparisonRule,
      isVariantSpecific: def.isVariantSpecific,
      sourceScope: variantSpec ? 'variant' : baseSpec ? 'product' : 'missing',
    };
  });
}

export function getEffectivePrice(item: {
  currentLowestPriceKrw: number | null;
  launchPriceKrw: number | null;
}): number | null {
  return item.currentLowestPriceKrw ?? item.launchPriceKrw ?? null;
}

export function matchesSearchQuery(
  product: ProductSummaryRecord,
  variants: ProductVariantRecord[],
  q: string,
): boolean {
  const needle = q.toLowerCase();
  if (product.name.toLowerCase().includes(needle)) return true;
  if (product.series.toLowerCase().includes(needle)) return true;
  if (product.baseModelNumber?.toLowerCase().includes(needle)) return true;
  return variants.some(
    (v) =>
      v.modelNumber.toLowerCase().includes(needle) ||
      v.skuCode.toLowerCase().includes(needle) ||
      (v.storageCapacity?.toLowerCase().includes(needle) ?? false),
  );
}

export function filterAndSortProducts(
  allProducts: ProductDetailRecord[],
  filter: ProductFilterQuery,
): PaginatedResult<ProductSummaryRecord> {
  const filtered = allProducts.filter((p) => {
    if (!filter.includeTest && p.isTestData) return false;
    if (p.verificationStatus !== 'verified') return false;
    if (filter.brand && p.brand.slug !== (filter.brand as BrandSlug)) return false;
    if (filter.category && p.category.slug !== (filter.category as CategorySlug)) return false;
    if (filter.series && p.series.toLowerCase() !== filter.series.toLowerCase()) return false;
    if (filter.year !== undefined) {
      const releaseYear = Number(p.releaseDate.slice(0, 4));
      if (releaseYear !== filter.year) return false;
    }
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      const price = getEffectivePrice(p);
      if (price === null) return false;
      if (filter.minPrice !== undefined && price < filter.minPrice) return false;
      if (filter.maxPrice !== undefined && price > filter.maxPrice) return false;
    }
    if (filter.q && !matchesSearchQuery(p, p.variants, filter.q)) {
      return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    switch (filter.sort) {
      case 'price_asc': {
        const pa = getEffectivePrice(a) ?? Number.MAX_SAFE_INTEGER;
        const pb = getEffectivePrice(b) ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      case 'price_desc': {
        const pa = getEffectivePrice(a) ?? -1;
        const pb = getEffectivePrice(b) ?? -1;
        return pb - pa;
      }
      case 'name_asc':
        return a.name.localeCompare(b.name, 'ko');
      case 'release_asc':
        return a.releaseDate.localeCompare(b.releaseDate) || a.name.localeCompare(b.name, 'ko');
      case 'release_desc':
      default:
        return b.releaseDate.localeCompare(a.releaseDate) || a.name.localeCompare(b.name, 'ko');
    }
  });

  const total = filtered.length;
  const start = (filter.page - 1) * filter.limit;
  const paged = filtered.slice(start, start + filter.limit).map(({ variants, images, dataSource, ...summary }) => {
    void variants;
    void images;
    void dataSource;
    return summary;
  });

  return {
    items: paged,
    total,
    page: filter.page,
    limit: filter.limit,
  };
}
