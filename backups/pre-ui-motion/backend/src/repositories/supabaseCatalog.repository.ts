import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BrandRecord,
  BrandSlug,
  CategoryRecord,
  CategorySlug,
  DataSourceSummary,
  PaginatedResult,
  ProductDetailRecord,
  ProductFilterQuery,
  ProductSummaryRecord,
  ProductVariantRecord,
  SpecDefinitionRecord,
} from '../types/domain.js';
import {
  filterAndSortProducts,
  type ICatalogRepository,
  type RawSpecEntry,
} from './catalog.repository.js';

/**
 * Supabase PostgreSQL implementation of ICatalogRepository.
 * Activated automatically when SUPABASE_URL and SUPABASE_ANON_KEY are configured
 * for the new dedicated TechCompare Supabase project.
 */
export class SupabaseCatalogRepository implements ICatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getBrands(): Promise<BrandRecord[]> {
    const { data, error } = await this.client
      .from('brands')
      .select('id, slug, name, official_website, logo_url, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: String(row.id),
      slug: row.slug as BrandSlug,
      name: String(row.name),
      officialWebsite: row.official_website ?? null,
      logoUrl: row.logo_url ?? null,
      displayOrder: Number(row.display_order ?? 0),
    }));
  }

  async getCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('id, slug, name, name_en, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: String(row.id),
      slug: row.slug as CategorySlug,
      name: String(row.name),
      nameEn: String(row.name_en),
      displayOrder: Number(row.display_order ?? 0),
    }));
  }

  async getSpecDefinitionsByCategory(categorySlug: CategorySlug): Promise<SpecDefinitionRecord[]> {
    const { data: cat, error: catErr } = await this.client
      .from('categories')
      .select('id, slug')
      .eq('slug', categorySlug)
      .maybeSingle();
    if (catErr) throw catErr;
    if (!cat) return [];

    const { data, error } = await this.client
      .from('spec_definitions')
      .select(
        'id, spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order',
      )
      .eq('category_id', cat.id)
      .order('display_order', { ascending: true });
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: String(row.id),
      categorySlug,
      specKey: row.spec_key as SpecDefinitionRecord['specKey'],
      displayName: String(row.display_name),
      unit: row.unit ?? null,
      dataType: row.data_type as SpecDefinitionRecord['dataType'],
      comparisonRule: row.comparison_rule as SpecDefinitionRecord['comparisonRule'],
      isComparable: Boolean(row.is_comparable),
      isVariantSpecific: Boolean(row.is_variant_specific),
      displayOrder: Number(row.display_order ?? 0),
    }));
  }

  private async fetchAllActiveProducts(): Promise<ProductDetailRecord[]> {
    const { data, error } = await this.client
      .from('products')
      .select(
        `
        id, slug, name, series, base_model_number, release_date,
        verification_status, is_test_data, is_active, view_count, last_synced_at,
        brands!inner ( id, slug, name, official_website, logo_url, display_order ),
        categories!inner ( id, slug, name, name_en, display_order ),
        data_sources ( id, code, name, source_type, base_url ),
        product_variants (
          id, product_id, sku_code, model_number, storage_capacity, ram_capacity,
          connectivity, color_name, color_hex, launch_price_krw, launch_price_usd,
          is_default, is_active,
          product_prices ( current_price_krw, in_stock, is_test_data )
        ),
        product_images (
          id, image_url, image_type, alt_text, license_note, is_primary, display_order
        )
      `,
      )
      .eq('is_active', true)
      .eq('verification_status', 'verified');

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => {
      const brandRaw = row.brands as Record<string, unknown>;
      const catRaw = row.categories as Record<string, unknown>;
      const dsRaw = row.data_sources as Record<string, unknown> | null;
      const variantsRaw = (row.product_variants as Array<Record<string, unknown>>) ?? [];
      const imagesRaw = (row.product_images as Array<Record<string, unknown>>) ?? [];

      const variants: ProductVariantRecord[] = variantsRaw
        .filter((v) => v.is_active !== false)
        .map((v) => {
          const prices = ((v.product_prices as Array<Record<string, unknown>>) ?? [])
            .filter((pr) => pr.in_stock !== false && pr.current_price_krw != null)
            .map((pr) => Number(pr.current_price_krw));
          const lowest = prices.length > 0 ? Math.min(...prices) : null;
          return {
            id: String(v.id),
            productId: String(v.product_id),
            skuCode: String(v.sku_code),
            modelNumber: String(v.model_number),
            storageCapacity: (v.storage_capacity as string) ?? null,
            ramCapacity: (v.ram_capacity as string) ?? null,
            connectivity: (v.connectivity as string) ?? null,
            colorName: (v.color_name as string) ?? null,
            colorHex: (v.color_hex as string) ?? null,
            launchPriceKrw: v.launch_price_krw != null ? Number(v.launch_price_krw) : null,
            launchPriceUsd: v.launch_price_usd != null ? Number(v.launch_price_usd) : null,
            currentLowestPriceKrw: lowest,
            isDefault: Boolean(v.is_default),
            isActive: Boolean(v.is_active ?? true),
          };
        });

      const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0] ?? null;
      const allLowest = variants
        .map((v) => v.currentLowestPriceKrw)
        .filter((n): n is number => n !== null);
      const primaryImage =
        imagesRaw.find((img) => img.is_primary) ?? imagesRaw[0] ?? null;

      return {
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
        series: String(row.series),
        baseModelNumber: (row.base_model_number as string) ?? null,
        releaseDate: String(row.release_date),
        brand: {
          id: String(brandRaw.id),
          slug: brandRaw.slug as BrandSlug,
          name: String(brandRaw.name),
          officialWebsite: (brandRaw.official_website as string) ?? null,
          logoUrl: (brandRaw.logo_url as string) ?? null,
          displayOrder: Number(brandRaw.display_order ?? 0),
        },
        category: {
          id: String(catRaw.id),
          slug: catRaw.slug as CategorySlug,
          name: String(catRaw.name),
          nameEn: String(catRaw.name_en),
          displayOrder: Number(catRaw.display_order ?? 0),
        },
        thumbnailUrl: primaryImage ? String(primaryImage.image_url) : null,
        launchPriceKrw: defaultVariant?.launchPriceKrw ?? null,
        currentLowestPriceKrw: allLowest.length > 0 ? Math.min(...allLowest) : null,
        defaultVariantId: defaultVariant?.id ?? null,
        verificationStatus: row.verification_status as ProductDetailRecord['verificationStatus'],
        isTestData: Boolean(row.is_test_data),
        viewCount: Number(row.view_count ?? 0),
        lastSyncedAt: (row.last_synced_at as string) ?? null,
        dataSource: dsRaw
          ? {
              id: String(dsRaw.id),
              code: String(dsRaw.code),
              name: String(dsRaw.name),
              sourceType: dsRaw.source_type as DataSourceSummary['sourceType'],
              baseUrl: (dsRaw.base_url as string) ?? null,
            }
          : null,
        variants,
        images: imagesRaw.map((img) => ({
          id: String(img.id),
          imageUrl: String(img.image_url),
          imageType: img.image_type as ProductDetailRecord['images'][number]['imageType'],
          altText: (img.alt_text as string) ?? null,
          licenseNote: String(img.license_note ?? ''),
          isPrimary: Boolean(img.is_primary),
          displayOrder: Number(img.display_order ?? 0),
        })),
      };
    });
  }

  async listProducts(filter: ProductFilterQuery): Promise<PaginatedResult<ProductSummaryRecord>> {
    const all = await this.fetchAllActiveProducts();
    return filterAndSortProducts(all, filter);
  }

  async getProductBySlug(slug: string, includeTest = false): Promise<ProductDetailRecord | null> {
    const all = await this.fetchAllActiveProducts();
    const found = all.find((p) => p.slug === slug);
    if (!found) return null;
    if (!includeTest && found.isTestData) return null;
    return found;
  }

  async getVariantsByProductSlug(
    slug: string,
    includeTest = false,
  ): Promise<ProductVariantRecord[] | null> {
    const product = await this.getProductBySlug(slug, includeTest);
    if (!product) return null;
    return product.variants;
  }

  async getSpecsForProduct(slug: string, variantId?: string, includeTest = false) {
    const product = await this.getProductBySlug(slug, includeTest);
    if (!product) return null;

    const selectedVariant = variantId
      ? product.variants.find((v) => v.id === variantId || v.skuCode === variantId) ?? null
      : product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

    const definitions = await this.getSpecDefinitionsByCategory(product.category.slug);

    const { data, error } = await this.client
      .from('specifications')
      .select('product_id, variant_id, spec_value, numeric_value, spec_definitions!inner ( spec_key )')
      .eq('product_id', product.id);
    if (error) throw error;

    const rawSpecs: RawSpecEntry[] = (data ?? []).map((row: Record<string, unknown>) => {
      const sd = row.spec_definitions as Record<string, unknown>;
      return {
        productId: String(row.product_id),
        variantId: (row.variant_id as string) ?? null,
        specKey: sd.spec_key as SpecDefinitionRecord['specKey'],
        specValue: (row.spec_value as string) ?? null,
        numericValue: row.numeric_value != null ? Number(row.numeric_value) : null,
      };
    });

    return {
      product,
      selectedVariant,
      definitions,
      rawSpecs,
    };
  }
}
