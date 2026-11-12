import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type {
  AdminProductUpsertInput,
  BrandRecord,
  CategoryRecord,
  CategorySlug,
  DataAuditItem,
  DataAuditSummary,
  PaginatedResult,
  ProductDetailRecord,
  ProductFilterQuery,
  ProductSummaryRecord,
  ProductVariantRecord,
  SpecDefinitionRecord,
} from '../types/domain.js';
import {
  filterAndSortProducts,
  resolveCategorySpecs,
  type ICatalogRepository,
  type RawSpecEntry,
} from './catalog.repository.js';

const BRANDS: BrandRecord[] = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    slug: 'apple',
    name: 'Apple',
    officialWebsite: 'https://www.apple.com/kr',
    logoUrl: null,
    displayOrder: 1,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    slug: 'samsung',
    name: 'Samsung',
    officialWebsite: 'https://www.samsung.com/sec',
    logoUrl: null,
    displayOrder: 2,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000008',
    slug: 'lg',
    name: 'LG',
    officialWebsite: 'https://www.lge.co.kr',
    logoUrl: null,
    displayOrder: 3,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000005',
    slug: 'sony',
    name: 'Sony',
    officialWebsite: 'https://store.sony.co.kr',
    logoUrl: null,
    displayOrder: 4,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000006',
    slug: 'lenovo',
    name: 'Lenovo',
    officialWebsite: 'https://www.lenovo.com/kr',
    logoUrl: null,
    displayOrder: 5,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000009',
    slug: 'asus',
    name: 'ASUS',
    officialWebsite: 'https://www.asus.com/kr',
    logoUrl: null,
    displayOrder: 6,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000010',
    slug: 'bose',
    name: 'Bose',
    officialWebsite: 'https://www.bose.co.kr',
    logoUrl: null,
    displayOrder: 7,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000011',
    slug: 'sennheiser',
    name: 'Sennheiser',
    officialWebsite: 'https://www.sennheiser-korea.com',
    logoUrl: null,
    displayOrder: 8,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000012',
    slug: 'beats',
    name: 'Beats',
    officialWebsite: 'https://www.beatsbydre.com/kr',
    logoUrl: null,
    displayOrder: 9,
  },
];

const CATEGORIES: CategoryRecord[] = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    slug: 'smartphone',
    name: '스마트폰',
    nameEn: 'Smartphones',
    displayOrder: 1,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    slug: 'tablet',
    name: '태블릿',
    nameEn: 'Tablets',
    displayOrder: 2,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000004',
    slug: 'laptop',
    name: '노트북',
    nameEn: 'Laptops',
    displayOrder: 3,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    slug: 'smartwatch',
    name: '스마트워치',
    nameEn: 'Smartwatches',
    displayOrder: 4,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    slug: 'audio',
    name: '오디오',
    nameEn: 'Audio',
    displayOrder: 5,
  },
];

const SPEC_DEFINITIONS: SpecDefinitionRecord[] = [
  // Smartphone (12 specs)
  { id: 'sd-sm-1', categorySlug: 'smartphone', specKey: 'processor', displayName: '프로세서', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 1 },
  { id: 'sd-sm-2', categorySlug: 'smartphone', specKey: 'memory', displayName: '메모리', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 2 },
  { id: 'sd-sm-3', categorySlug: 'smartphone', specKey: 'storage', displayName: '저장 공간', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 3 },
  { id: 'sd-sm-4', categorySlug: 'smartphone', specKey: 'display', displayName: '디스플레이', unit: '인치', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 4 },
  { id: 'sd-sm-5', categorySlug: 'smartphone', specKey: 'resolution', displayName: '해상도', unit: 'px', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 5 },
  { id: 'sd-sm-6', categorySlug: 'smartphone', specKey: 'refresh_rate', displayName: '주사율', unit: 'Hz', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 6 },
  { id: 'sd-sm-7', categorySlug: 'smartphone', specKey: 'battery', displayName: '배터리', unit: 'mAh', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 7 },
  { id: 'sd-sm-8', categorySlug: 'smartphone', specKey: 'camera', displayName: '카메라', unit: 'MP', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 8 },
  { id: 'sd-sm-9', categorySlug: 'smartphone', specKey: 'weight', displayName: '무게', unit: 'g', dataType: 'number', comparisonRule: 'lower_better', isComparable: true, isVariantSpecific: false, displayOrder: 9 },
  { id: 'sd-sm-10', categorySlug: 'smartphone', specKey: 'dimensions', displayName: '크기', unit: 'mm', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 10 },
  { id: 'sd-sm-11', categorySlug: 'smartphone', specKey: 'connectivity', displayName: '연결 방식', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: true, displayOrder: 11 },
  { id: 'sd-sm-12', categorySlug: 'smartphone', specKey: 'os', displayName: '운영체제', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 12 },

  // Tablet (12 specs)
  { id: 'sd-tb-1', categorySlug: 'tablet', specKey: 'processor', displayName: '프로세서', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 1 },
  { id: 'sd-tb-2', categorySlug: 'tablet', specKey: 'memory', displayName: '메모리', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 2 },
  { id: 'sd-tb-3', categorySlug: 'tablet', specKey: 'storage', displayName: '저장 공간', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 3 },
  { id: 'sd-tb-4', categorySlug: 'tablet', specKey: 'display', displayName: '디스플레이', unit: '인치', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 4 },
  { id: 'sd-tb-5', categorySlug: 'tablet', specKey: 'resolution', displayName: '해상도', unit: 'px', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 5 },
  { id: 'sd-tb-6', categorySlug: 'tablet', specKey: 'refresh_rate', displayName: '주사율', unit: 'Hz', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 6 },
  { id: 'sd-tb-7', categorySlug: 'tablet', specKey: 'battery', displayName: '배터리', unit: 'Wh', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 7 },
  { id: 'sd-tb-8', categorySlug: 'tablet', specKey: 'camera', displayName: '카메라', unit: 'MP', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 8 },
  { id: 'sd-tb-9', categorySlug: 'tablet', specKey: 'weight', displayName: '무게', unit: 'g', dataType: 'number', comparisonRule: 'lower_better', isComparable: true, isVariantSpecific: true, displayOrder: 9 },
  { id: 'sd-tb-10', categorySlug: 'tablet', specKey: 'dimensions', displayName: '크기', unit: 'mm', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 10 },
  { id: 'sd-tb-11', categorySlug: 'tablet', specKey: 'connectivity', displayName: '연결 방식', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: true, displayOrder: 11 },
  { id: 'sd-tb-12', categorySlug: 'tablet', specKey: 'os', displayName: '운영체제', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 12 },

  // Smartwatch (10 specs — camera excluded per category rule)
  { id: 'sd-sw-1', categorySlug: 'smartwatch', specKey: 'processor', displayName: '프로세서', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 1 },
  { id: 'sd-sw-2', categorySlug: 'smartwatch', specKey: 'memory', displayName: '메모리', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 2 },
  { id: 'sd-sw-3', categorySlug: 'smartwatch', specKey: 'storage', displayName: '저장 공간', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 3 },
  { id: 'sd-sw-4', categorySlug: 'smartwatch', specKey: 'display', displayName: '디스플레이', unit: 'mm', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 4 },
  { id: 'sd-sw-5', categorySlug: 'smartwatch', specKey: 'resolution', displayName: '해상도', unit: 'px', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 5 },
  { id: 'sd-sw-6', categorySlug: 'smartwatch', specKey: 'battery', displayName: '배터리', unit: '시간', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 6 },
  { id: 'sd-sw-7', categorySlug: 'smartwatch', specKey: 'weight', displayName: '무게', unit: 'g', dataType: 'number', comparisonRule: 'lower_better', isComparable: true, isVariantSpecific: true, displayOrder: 7 },
  { id: 'sd-sw-8', categorySlug: 'smartwatch', specKey: 'dimensions', displayName: '크기', unit: 'mm', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 8 },
  { id: 'sd-sw-9', categorySlug: 'smartwatch', specKey: 'connectivity', displayName: '연결 방식', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: true, displayOrder: 9 },
  { id: 'sd-sw-10', categorySlug: 'smartwatch', specKey: 'os', displayName: '운영체제', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 10 },

  // Laptop (12 specs)
  { id: 'sd-lt-1', categorySlug: 'laptop', specKey: 'processor', displayName: '프로세서', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 1 },
  { id: 'sd-lt-2', categorySlug: 'laptop', specKey: 'memory', displayName: '메모리', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 2 },
  { id: 'sd-lt-3', categorySlug: 'laptop', specKey: 'storage', displayName: '저장 공간', unit: 'GB', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: true, displayOrder: 3 },
  { id: 'sd-lt-4', categorySlug: 'laptop', specKey: 'display', displayName: '디스플레이', unit: '인치', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 4 },
  { id: 'sd-lt-5', categorySlug: 'laptop', specKey: 'resolution', displayName: '해상도', unit: 'px', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 5 },
  { id: 'sd-lt-6', categorySlug: 'laptop', specKey: 'refresh_rate', displayName: '주사율', unit: 'Hz', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 6 },
  { id: 'sd-lt-7', categorySlug: 'laptop', specKey: 'battery', displayName: '배터리', unit: 'Wh', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 7 },
  { id: 'sd-lt-8', categorySlug: 'laptop', specKey: 'camera', displayName: '웹캠', unit: 'MP', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 8 },
  { id: 'sd-lt-9', categorySlug: 'laptop', specKey: 'weight', displayName: '무게', unit: 'g', dataType: 'number', comparisonRule: 'lower_better', isComparable: true, isVariantSpecific: false, displayOrder: 9 },
  { id: 'sd-lt-10', categorySlug: 'laptop', specKey: 'dimensions', displayName: '크기', unit: 'mm', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 10 },
  { id: 'sd-lt-11', categorySlug: 'laptop', specKey: 'connectivity', displayName: '연결 방식', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: true, displayOrder: 11 },
  { id: 'sd-lt-12', categorySlug: 'laptop', specKey: 'os', displayName: '운영체제', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 12 },

  // Audio (6 specs)
  { id: 'sd-au-1', categorySlug: 'audio', specKey: 'processor', displayName: '오디오 칩셋', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 1 },
  { id: 'sd-au-2', categorySlug: 'audio', specKey: 'battery', displayName: '재생 시간', unit: '시간', dataType: 'number', comparisonRule: 'higher_better', isComparable: true, isVariantSpecific: false, displayOrder: 2 },
  { id: 'sd-au-3', categorySlug: 'audio', specKey: 'weight', displayName: '무게', unit: 'g', dataType: 'number', comparisonRule: 'lower_better', isComparable: true, isVariantSpecific: false, displayOrder: 3 },
  { id: 'sd-au-4', categorySlug: 'audio', specKey: 'dimensions', displayName: '크기', unit: 'mm', dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 4 },
  { id: 'sd-au-5', categorySlug: 'audio', specKey: 'connectivity', displayName: '블루투스/코덱', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: true, displayOrder: 5 },
  { id: 'sd-au-6', categorySlug: 'audio', specKey: 'os', displayName: '지원 환경', unit: null, dataType: 'text', comparisonRule: 'neutral', isComparable: true, isVariantSpecific: false, displayOrder: 6 },
];

interface ProductsDatasetFile {
  version?: string;
  generatedAt?: string;
  counts?: Record<string, number>;
  products: ProductDetailRecord[];
  rawSpecs: RawSpecEntry[];
}

function resolveDatasetFilePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const srcCandidate = path.resolve(currentDir, '../../src/data/products.json');
  if (fs.existsSync(srcCandidate)) return srcCandidate;

  const localCandidate = path.resolve(currentDir, '../data/products.json');
  if (fs.existsSync(localCandidate)) return localCandidate;

  throw new Error('Could not locate backend/src/data/products.json');
}

function loadProductsDataset(): ProductsDatasetFile {
  const filePath = resolveDatasetFilePath();
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as ProductsDatasetFile;
}

function parseAutoNumeric(val: string | null): number | null {
  if (!val) return null;
  const cleaned = val.replace(/,/g, '');
  const match = cleaned.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export class InMemoryCatalogRepository implements ICatalogRepository {
  private products: ProductDetailRecord[];
  private rawSpecs: RawSpecEntry[];

  constructor() {
    const dataset = loadProductsDataset();
    this.products = structuredClone(dataset.products);
    this.rawSpecs = structuredClone(dataset.rawSpecs);
  }

  private saveToDisk() {
    const filePath = resolveDatasetFilePath();
    const countTotal = this.products.length;
    const countApple = this.products.filter((p) => p.brand.slug === 'apple').length;
    const countSamsung = this.products.filter((p) => p.brand.slug === 'samsung').length;
    const countPhone = this.products.filter((p) => p.category.slug === 'smartphone').length;
    const countTablet = this.products.filter((p) => p.category.slug === 'tablet').length;
    const countWatch = this.products.filter((p) => p.category.slug === 'smartwatch').length;

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          version: '1.0.0',
          generatedAt: new Date().toISOString(),
          counts: {
            total: countTotal,
            apple: countApple,
            samsung: countSamsung,
            smartphone: countPhone,
            tablet: countTablet,
            smartwatch: countWatch,
          },
          products: this.products,
          rawSpecs: this.rawSpecs,
        },
        null,
        2,
      ),
      'utf8',
    );
  }

  async getBrands(): Promise<BrandRecord[]> {
    return BRANDS;
  }

  async getCategories(): Promise<CategoryRecord[]> {
    return CATEGORIES;
  }

  async getSpecDefinitionsByCategory(categorySlug: CategorySlug): Promise<SpecDefinitionRecord[]> {
    return SPEC_DEFINITIONS.filter((d) => d.categorySlug === categorySlug).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }

  async listProducts(filter: ProductFilterQuery): Promise<PaginatedResult<ProductSummaryRecord>> {
    return filterAndSortProducts(this.products, filter);
  }

  async getProductBySlug(slug: string, includeTest = false): Promise<ProductDetailRecord | null> {
    const found = this.products.find((p) => p.slug === slug);
    if (!found) return null;
    if (!includeTest && found.isTestData) return null;
    if (found.verificationStatus !== 'verified') return null;
    return found;
  }

  async getVariantsByProductSlug(
    slug: string,
    includeTest = false,
  ): Promise<ProductVariantRecord[] | null> {
    const product = await this.getProductBySlug(slug, includeTest);
    if (!product) return null;
    return product.variants.filter((v) => v.isActive);
  }

  async getSpecsForProduct(slug: string, variantId?: string, includeTest = false) {
    const product = await this.getProductBySlug(slug, includeTest);
    if (!product) return null;

    const selectedVariant = variantId
      ? product.variants.find((v) => v.id === variantId || v.skuCode === variantId) ?? null
      : product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;

    const definitions = await this.getSpecDefinitionsByCategory(product.category.slug);
    const rawSpecs = this.rawSpecs.filter((s) => s.productId === product.id);

    return {
      product,
      selectedVariant,
      definitions,
      rawSpecs,
    };
  }

  async getDataAudit(): Promise<DataAuditSummary> {
    const items: DataAuditItem[] = [];
    for (const p of this.products) {
      const defs = await this.getSpecDefinitionsByCategory(p.category.slug);
      const pSpecs = this.rawSpecs.filter((s) => s.productId === p.id);
      const resolved = resolveCategorySpecs(defs, pSpecs, p.defaultVariantId);
      const missingSpecKeys = resolved.filter((r) => r.value === null).map((r) => r.specKey);

      items.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        brandSlug: p.brand.slug,
        brandName: p.brand.name,
        categorySlug: p.category.slug,
        categoryName: p.category.name,
        series: p.series,
        baseModelNumber: p.baseModelNumber,
        releaseDate: p.releaseDate,
        releaseDateValid: p.releaseDate >= '2022-11-01',
        launchPriceKrw: p.launchPriceKrw,
        variantCount: p.variants.length,
        filledSpecsCount: defs.length - missingSpecKeys.length,
        totalCategorySpecs: defs.length,
        missingSpecKeys,
        verificationStatus: p.verificationStatus,
        sourceUrl: p.dataSource?.sourceUrl ?? p.dataSource?.baseUrl ?? null,
      });
    }

    const slugs = new Set(this.products.map((p) => p.slug));
    const models = new Set(this.products.map((p) => p.baseModelNumber).filter(Boolean));

    return {
      totalProducts: this.products.length,
      appleCount: this.products.filter((p) => p.brand.slug === 'apple').length,
      samsungCount: this.products.filter((p) => p.brand.slug === 'samsung').length,
      smartphoneCount: this.products.filter((p) => p.category.slug === 'smartphone').length,
      tabletCount: this.products.filter((p) => p.category.slug === 'tablet').length,
      smartwatchCount: this.products.filter((p) => p.category.slug === 'smartwatch').length,
      laptopCount: this.products.filter((p) => p.category.slug === 'laptop').length,
      audioCount: this.products.filter((p) => p.category.slug === 'audio').length,
      allReleaseDatesValid: items.every((i) => i.releaseDateValid),
      uniqueSlugsCount: slugs.size,
      uniqueModelNumbersCount: models.size,
      items,
    };
  }

  async upsertProduct(
    input: AdminProductUpsertInput,
    persistToDisk = true,
  ): Promise<ProductDetailRecord> {
    const brand = BRANDS.find((b) => b.slug === input.brand) ?? BRANDS[0]!;
    const category = CATEGORIES.find((c) => c.slug === input.category) ?? CATEGORIES[0]!;

    const existingIdx = this.products.findIndex((p) => p.slug === input.slug);
    const nextSeq = this.products.length + 1 + Math.floor(Math.random() * 9000);
    const productId =
      existingIdx >= 0
        ? this.products[existingIdx]!.id
        : `p0000000-0000-4000-8000-${String(Date.now() + nextSeq).slice(-12)}`;
    const defaultVariantId =
      existingIdx >= 0 && this.products[existingIdx]!.defaultVariantId
        ? this.products[existingIdx]!.defaultVariantId!
        : `v-${input.slug}-default`;

    const existingVariants = existingIdx >= 0 ? this.products[existingIdx]!.variants : [];
    const updatedDefaultVariant: ProductVariantRecord = {
      id: defaultVariantId,
      productId,
      skuCode: `${input.brand.toUpperCase()}-${input.baseModelNumber}-DEFAULT`,
      modelNumber: input.baseModelNumber,
      storageCapacity: input.storageCapacity ?? existingVariants[0]?.storageCapacity ?? '256GB',
      ramCapacity: existingVariants[0]?.ramCapacity ?? null,
      connectivity: input.connectivity ?? existingVariants[0]?.connectivity ?? '5G / Wi-Fi',
      colorName: input.colorName ?? existingVariants[0]?.colorName ?? '기본 색상',
      colorHex: existingVariants[0]?.colorHex ?? '#64748B',
      launchPriceKrw: input.launchPriceKrw,
      launchPriceUsd: existingVariants[0]?.launchPriceUsd ?? null,
      currentLowestPriceKrw: null,
      isDefault: true,
      isActive: true,
    };

    const variants =
      existingVariants.length > 1
        ? [updatedDefaultVariant, ...existingVariants.slice(1)]
        : [updatedDefaultVariant];

    const record: ProductDetailRecord = {
      id: productId,
      slug: input.slug,
      name: input.name,
      series: input.series,
      baseModelNumber: input.baseModelNumber,
      releaseDate: input.releaseDate,
      brand,
      category,
      thumbnailUrl: existingIdx >= 0 ? this.products[existingIdx]!.thumbnailUrl : null,
      launchPriceKrw: input.launchPriceKrw,
      currentLowestPriceKrw: null,
      defaultVariantId,
      verificationStatus: 'verified',
      isTestData: false,
      viewCount: existingIdx >= 0 ? this.products[existingIdx]!.viewCount : 0,
      lastSyncedAt: new Date().toISOString(),
      dataSource: {
        id:
          brand.slug === 'apple'
            ? 'd0000000-0000-4000-8000-000000000001'
            : 'd0000000-0000-4000-8000-000000000002',
        code: brand.slug === 'apple' ? 'official_apple_kr' : 'official_samsung_kr',
        name:
          brand.slug === 'apple'
            ? 'Apple 코리아 공식 공개 기술 사양'
            : '삼성전자 공식 홈페이지 공개 사양',
        sourceType: 'official_manufacturer',
        baseUrl: brand.officialWebsite,
        sourceUrl: input.sourceUrl ?? brand.officialWebsite,
        verifiedAt: new Date().toISOString().slice(0, 10),
      },
      images: existingIdx >= 0 ? this.products[existingIdx]!.images : [],
      variants,
    };

    if (existingIdx >= 0) {
      this.products[existingIdx] = record;
    } else {
      this.products.unshift(record);
    }

    if (input.specs && input.specs.length > 0) {
      // Remove existing base product specs for the keys being updated
      const updatedKeys = new Set(input.specs.map((s) => s.specKey));
      this.rawSpecs = this.rawSpecs.filter(
        (rs) => !(rs.productId === productId && rs.variantId === null && updatedKeys.has(rs.specKey)),
      );

      for (const spec of input.specs) {
        const cleanVal = spec.specValue && spec.specValue.trim() !== '' ? spec.specValue.trim() : null;
        const numVal =
          spec.numericValue !== undefined ? spec.numericValue : parseAutoNumeric(cleanVal);
        this.rawSpecs.push({
          productId,
          variantId: null,
          specKey: spec.specKey,
          specValue: cleanVal,
          numericValue: numVal,
        });
      }
    }

    if (persistToDisk) {
      this.saveToDisk();
    }

    return record;
  }

  async deleteProduct(slug: string, persistToDisk = true): Promise<boolean> {
    const idx = this.products.findIndex((p) => p.slug === slug);
    if (idx < 0) return false;
    const removed = this.products[idx]!;
    this.products.splice(idx, 1);
    this.rawSpecs = this.rawSpecs.filter((rs) => rs.productId !== removed.id);
    if (persistToDisk) {
      this.saveToDisk();
    }
    return true;
  }
}
