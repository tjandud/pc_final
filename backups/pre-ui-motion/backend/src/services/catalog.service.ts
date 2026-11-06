import { getSupabasePublicClient } from '../config/supabase.js';
import {
  resolveCategorySpecs,
  type ICatalogRepository,
} from '../repositories/catalog.repository.js';
import { InMemoryCatalogRepository } from '../repositories/inMemoryCatalog.repository.js';
import { SupabaseCatalogRepository } from '../repositories/supabaseCatalog.repository.js';
import type {
  AdminProductUpsertInput,
  CategorySlug,
  CompareAnalysisSummary,
  CompareProductItem,
  CompareResult,
  CompareScorecard,
  CompareSpecCell,
  CompareSpecRow,
  ProductFilterQuery,
} from '../types/domain.js';
import { ApiError } from '../utils/apiResponse.js';

export const COMPARE_MIN_ITEMS = 2;
export const COMPARE_MAX_ITEMS = 4;

function buildCompareAnalysis(
  items: CompareProductItem[],
  specRows: CompareSpecRow[],
): CompareAnalysisSummary {
  const scorecards: CompareScorecard[] = items.map((entry) => {
    const winningSpecs = specRows
      .filter((r) => r.cells.some((c) => c.productSlug === entry.product.slug && c.isWinner))
      .map((r) => r.displayName);

    return {
      productSlug: entry.product.slug,
      productName: entry.product.name,
      brandName: entry.product.brand.name,
      winCount: winningSpecs.length,
      winningSpecs,
      launchPriceKrw:
        entry.selectedVariant?.launchPriceKrw ?? entry.product.launchPriceKrw ?? null,
    };
  });

  const priced = scorecards.filter(
    (s): s is CompareScorecard & { launchPriceKrw: number } => s.launchPriceKrw !== null,
  );
  let priceInsight = '비교 대상 제품의 공식 출고가 정보가 충분하지 않습니다.';
  let lowestPriceProductSlug: string | null = null;
  let priceGapKrw: number | null = null;

  if (priced.length >= 2) {
    const sortedByPrice = [...priced].sort((a, b) => a.launchPriceKrw - b.launchPriceKrw);
    const cheapest = sortedByPrice[0]!;
    const mostExpensive = sortedByPrice[sortedByPrice.length - 1]!;
    lowestPriceProductSlug = cheapest.productSlug;
    priceGapKrw = mostExpensive.launchPriceKrw - cheapest.launchPriceKrw;

    if (priceGapKrw === 0) {
      priceInsight = `비교 제품의 공식 출고가가 ₩${cheapest.launchPriceKrw.toLocaleString('ko-KR')}으로 동일합니다.`;
    } else {
      priceInsight = `${cheapest.productName}(₩${cheapest.launchPriceKrw.toLocaleString('ko-KR')})이 ${mostExpensive.productName}(₩${mostExpensive.launchPriceKrw.toLocaleString('ko-KR')})보다 출고가가 ₩${priceGapKrw.toLocaleString('ko-KR')} 저렴합니다.`;
    }
  }

  const highlights: string[] = [priceInsight];

  // Weight comparison highlight
  const weightRow = specRows.find((r) => r.specKey === 'weight');
  if (weightRow && weightRow.isDifferent) {
    const validWeights = weightRow.cells
      .filter((c) => c.numericValue !== null)
      .map((c) => ({
        cell: c,
        name: items.find((i) => i.product.slug === c.productSlug)?.product.name ?? c.productSlug,
        val: c.numericValue!,
      }))
      .sort((a, b) => a.val - b.val);

    if (validWeights.length >= 2) {
      const lightest = validWeights[0]!;
      const heaviest = validWeights[validWeights.length - 1]!;
      const diffG = Number((heaviest.val - lightest.val).toFixed(1));
      if (diffG > 0) {
        highlights.push(
          `휴대성(무게): ${lightest.name}(${lightest.val}g)이 ${heaviest.name}(${heaviest.val}g)보다 ${diffG}g 더 가볍습니다.`,
        );
      }
    }
  }

  // Display comparison highlight
  const displayRow = specRows.find((r) => r.specKey === 'display');
  if (displayRow && displayRow.isDifferent) {
    const validDisplays = displayRow.cells
      .filter((c) => c.numericValue !== null)
      .map((c) => ({
        name: items.find((i) => i.product.slug === c.productSlug)?.product.name ?? c.productSlug,
        val: c.numericValue!,
        unit: displayRow.unit ?? '',
      }))
      .sort((a, b) => b.val - a.val);

    if (validDisplays.length >= 2) {
      const largest = validDisplays[0]!;
      const smallest = validDisplays[validDisplays.length - 1]!;
      if (largest.val !== smallest.val) {
        highlights.push(
          `화면 크기: ${largest.name}(${largest.val}${largest.unit})이 ${smallest.name}(${smallest.val}${smallest.unit})보다 더 큰 화면을 탑재했습니다.`,
        );
      }
    }
  }

  // Processor summary highlight
  const procRow = specRows.find((r) => r.specKey === 'processor');
  if (procRow) {
    const procPairs = procRow.cells
      .filter((c) => c.value !== null)
      .map((c) => {
        const name = items.find((i) => i.product.slug === c.productSlug)?.product.name ?? c.productSlug;
        return `${name}: ${c.displayValue}`;
      });
    if (procPairs.length >= 2) {
      highlights.push(`탑재 프로세서 — ${procPairs.join(' vs ')}`);
    }
  }

  const differingSpecsCount = specRows.filter((r) => r.isDifferent).length;

  return {
    priceInsight,
    lowestPriceProductSlug,
    priceGapKrw,
    differingSpecsCount,
    totalSpecsCount: specRows.length,
    scorecards,
    highlights,
  };
}

export class CatalogService {
  constructor(private readonly repo: ICatalogRepository) {}

  async listBrands() {
    return this.repo.getBrands();
  }

  async listCategories() {
    return this.repo.getCategories();
  }

  async getCategorySpecDefinitions(categorySlug: CategorySlug) {
    const categories = await this.repo.getCategories();
    const category = categories.find((c) => c.slug === categorySlug);
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', `Category not found: ${categorySlug}`);
    }
    const definitions = await this.repo.getSpecDefinitionsByCategory(categorySlug);
    return {
      category,
      definitions,
    };
  }

  async listProducts(filter: ProductFilterQuery) {
    return this.repo.listProducts(filter);
  }

  async getProductDetail(slug: string, includeTest = false) {
    const product = await this.repo.getProductBySlug(slug, includeTest);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found: ${slug}`);
    }
    return product;
  }

  async getProductVariants(slug: string, includeTest = false) {
    const variants = await this.repo.getVariantsByProductSlug(slug, includeTest);
    if (!variants) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found: ${slug}`);
    }
    return variants;
  }

  async getProductSpecifications(slug: string, variantId?: string, includeTest = false) {
    const bundle = await this.repo.getSpecsForProduct(slug, variantId, includeTest);
    if (!bundle) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found: ${slug}`);
    }

    if (variantId && !bundle.selectedVariant) {
      throw new ApiError(
        404,
        'VARIANT_NOT_FOUND',
        `Variant '${variantId}' not found for product '${slug}'`,
      );
    }

    const specs = resolveCategorySpecs(
      bundle.definitions,
      bundle.rawSpecs,
      bundle.selectedVariant?.id ?? null,
    );

    return {
      product: {
        id: bundle.product.id,
        slug: bundle.product.slug,
        name: bundle.product.name,
        brand: bundle.product.brand,
        category: bundle.product.category,
        releaseDate: bundle.product.releaseDate,
        dataSource: bundle.product.dataSource,
        lastSyncedAt: bundle.product.lastSyncedAt,
      },
      selectedVariant: bundle.selectedVariant,
      specifications: specs,
    };
  }

  /**
   * Compares 2 to 4 products within the exact same category.
   * Each entry in `rawItems` can be `slug` or `slug:variantId`.
   */
  async compareProducts(rawItems: string[], includeTest = false): Promise<CompareResult> {
    if (rawItems.length < COMPARE_MIN_ITEMS || rawItems.length > COMPARE_MAX_ITEMS) {
      throw new ApiError(
        422,
        'COMPARE_LIMIT',
        `제품 비교는 최소 ${COMPARE_MIN_ITEMS}개에서 최대 ${COMPARE_MAX_ITEMS}개까지만 가능합니다.`,
        { min: COMPARE_MIN_ITEMS, max: COMPARE_MAX_ITEMS, received: rawItems.length },
      );
    }

    const bundles = await Promise.all(
      rawItems.map(async (token) => {
        const [slugPart, variantPart] = token.split(':');
        const slug = slugPart?.trim() ?? '';
        const variantId = variantPart?.trim() || undefined;
        if (!slug) {
          throw new ApiError(400, 'VALIDATION_ERROR', `Invalid compare item token: '${token}'`);
        }
        return this.getProductSpecifications(slug, variantId, includeTest);
      }),
    );

    const firstCategory = bundles[0]!.product.category;
    for (const b of bundles) {
      if (b.product.category.slug !== firstCategory.slug) {
        throw new ApiError(
          422,
          'CATEGORY_MISMATCH',
          '서로 다른 카테고리의 제품은 비교할 수 없습니다. 동일 카테고리 제품만 선택해 주세요.',
          {
            expected: firstCategory.slug,
            received: b.product.category.slug,
          },
        );
      }
    }

    const detailedItems: CompareProductItem[] = await Promise.all(
      bundles.map(async (b) => {
        const fullProduct = await this.getProductDetail(b.product.slug, includeTest);
        return {
          product: fullProduct,
          selectedVariant: b.selectedVariant,
        };
      }),
    );

    const definitions = await this.repo.getSpecDefinitionsByCategory(firstCategory.slug);
    const specRows: CompareSpecRow[] = definitions.map((def) => {
      const cells: CompareSpecCell[] = bundles.map((b) => {
        const found = b.specifications.find((s) => s.specKey === def.specKey);
        return {
          productSlug: b.product.slug,
          variantId: b.selectedVariant?.id ?? null,
          value: found?.value ?? null,
          displayValue: found?.displayValue ?? '정보 없음',
          numericValue: found?.numericValue ?? null,
          isWinner: false,
        };
      });

      const normalizedValues = cells.map((c) => (c.value ? c.value.trim().toLowerCase() : '__null__'));
      const uniqueNonNull = new Set(normalizedValues.filter((v) => v !== '__null__'));
      const hasNullMix = normalizedValues.some((v) => v === '__null__') && uniqueNonNull.size > 0;
      const isDifferent = uniqueNonNull.size > 1 || hasNullMix;

      if (isDifferent && def.comparisonRule !== 'neutral') {
        const validNums = cells
          .map((c) => c.numericValue)
          .filter((n): n is number => n !== null && !Number.isNaN(n));
        if (validNums.length >= 2) {
          const target =
            def.comparisonRule === 'higher_better'
              ? Math.max(...validNums)
              : Math.min(...validNums);
          const minVal = Math.min(...validNums);
          const maxVal = Math.max(...validNums);
          if (minVal !== maxVal) {
            for (const c of cells) {
              if (c.numericValue === target) {
                c.isWinner = true;
              }
            }
          }
        }
      }

      return {
        specKey: def.specKey,
        displayName: def.displayName,
        unit: def.unit,
        comparisonRule: def.comparisonRule,
        isDifferent,
        cells,
      };
    });

    const hasLaunchPrices = detailedItems.some(
      (i) => (i.selectedVariant?.launchPriceKrw ?? i.product.launchPriceKrw) !== null,
    );
    const hasCurrentPrices = detailedItems.some(
      (i) => (i.selectedVariant?.currentLowestPriceKrw ?? i.product.currentLowestPriceKrw) !== null,
    );

    const analysis = buildCompareAnalysis(detailedItems, specRows);

    return {
      category: firstCategory,
      items: detailedItems,
      specRows,
      hasLaunchPrices,
      hasCurrentPrices,
      analysis,
    };
  }

  async getDataAudit() {
    if (!this.repo.getDataAudit) {
      throw new ApiError(501, 'NOT_IMPLEMENTED', 'Audit not supported by current repository');
    }
    return this.repo.getDataAudit();
  }

  async adminUpsertProduct(input: AdminProductUpsertInput, persistToDisk = true) {
    if (!this.repo.upsertProduct) {
      throw new ApiError(501, 'NOT_IMPLEMENTED', 'Upsert not supported by current repository');
    }
    return this.repo.upsertProduct(input, persistToDisk);
  }

  async adminDeleteProduct(slug: string, persistToDisk = true) {
    if (!this.repo.deleteProduct) {
      throw new ApiError(501, 'NOT_IMPLEMENTED', 'Delete not supported by current repository');
    }
    const removed = await this.repo.deleteProduct(slug, persistToDisk);
    if (!removed) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found: ${slug}`);
    }
    return { deleted: true, slug };
  }
}

export function createDefaultCatalogService(): CatalogService {
  const supabaseClient = getSupabasePublicClient();
  const repo: ICatalogRepository = supabaseClient
    ? new SupabaseCatalogRepository(supabaseClient)
    : new InMemoryCatalogRepository();
  return new CatalogService(repo);
}
