import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../app.js';
import { resolveCategorySpecs } from '../repositories/catalog.repository.js';
import { InMemoryCatalogRepository } from '../repositories/inMemoryCatalog.repository.js';
import { CatalogService } from '../services/catalog.service.js';

describe('Phase 2 — Unit Tests: Repository & Spec Resolution Logic', () => {
  const repo = new InMemoryCatalogRepository();
  const service = new CatalogService(repo);

  it('returns only category-appropriate spec definitions (smartwatch excludes camera)', async () => {
    const phoneDefs = await repo.getSpecDefinitionsByCategory('smartphone');
    const watchDefs = await repo.getSpecDefinitionsByCategory('smartwatch');

    assert.equal(phoneDefs.length, 12);
    assert.ok(phoneDefs.some((d) => d.specKey === 'camera'));
    assert.ok(phoneDefs.some((d) => d.specKey === 'refresh_rate'));

    assert.equal(watchDefs.length, 10);
    assert.equal(
      watchDefs.some((d) => d.specKey === 'camera'),
      false,
      'Smartwatch category must not include camera spec definition',
    );
  });

  it("sets displayValue to '정보 없음' when a specification value is null instead of fabricating values", async () => {
    const result = await service.getProductSpecifications('iphone-16-pro');
    const memorySpec = result.specifications.find((s) => s.specKey === 'memory');
    const batterySpec = result.specifications.find((s) => s.specKey === 'battery');
    const processorSpec = result.specifications.find((s) => s.specKey === 'processor');

    assert.ok(memorySpec);
    assert.equal(memorySpec.value, null);
    assert.equal(memorySpec.displayValue, '정보 없음');
    assert.equal(memorySpec.sourceScope, 'missing');

    assert.ok(batterySpec);
    assert.equal(batterySpec.value, null);
    assert.equal(batterySpec.displayValue, '정보 없음');

    assert.ok(processorSpec);
    assert.ok(processorSpec.value?.includes('A18 Pro'));
    assert.equal(processorSpec.sourceScope, 'product');
  });

  it('overrides base product spec when a specific variantId is provided', async () => {
    const spec128 = await service.getProductSpecifications('iphone-16-pro', 'v-ip16p-128');
    const spec256 = await service.getProductSpecifications('iphone-16-pro', 'v-ip16p-256');

    const storage128 = spec128.specifications.find((s) => s.specKey === 'storage');
    const storage256 = spec256.specifications.find((s) => s.specKey === 'storage');

    assert.equal(storage128?.displayValue, '128GB');
    assert.equal(storage128?.numericValue, 128);
    assert.equal(storage128?.sourceScope, 'variant');

    assert.equal(storage256?.displayValue, '256GB');
    assert.equal(storage256?.numericValue, 256);
    assert.equal(storage256?.sourceScope, 'variant');
  });

  it('resolveCategorySpecs preserves display_order and handles empty rawSpecs gracefully', async () => {
    const defs = await repo.getSpecDefinitionsByCategory('tablet');
    const resolved = resolveCategorySpecs(defs, [], null);

    assert.equal(resolved.length, 12);
    assert.ok(resolved.every((r) => r.displayValue === '정보 없음' && r.value === null));
  });
});

describe('Phase 2–4 — REST API Integration Tests (/api/v1/*)', () => {
  let server: Server;
  let baseUrl = '';

  before(async () => {
    const service = new CatalogService(new InMemoryCatalogRepository());
    const app = createApp(service);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /health returns 200 and non-secret configuration status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: { status: string; config: { supabase: { configured: boolean } } };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
    assert.equal(typeof body.data.config.supabase.configured, 'boolean');
  });

  it('GET /brands returns Apple and Samsung', async () => {
    const res = await fetch(`${baseUrl}/brands`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: Array<{ slug: string }> };
    assert.equal(body.success, true);
    assert.deepEqual(
      body.data.map((b) => b.slug),
      ['apple', 'samsung'],
    );
  });

  it('GET /categories returns smartphone, tablet, and smartwatch', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: Array<{ slug: string }> };
    assert.equal(body.success, true);
    assert.deepEqual(
      body.data.map((c) => c.slug),
      ['smartphone', 'tablet', 'smartwatch'],
    );
  });

  it('GET /products returns all 50 official products released on or after 2022-11-01', async () => {
    const res = await fetch(`${baseUrl}/products?limit=100`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ slug: string; releaseDate: string; baseModelNumber: string }>;
      meta: { total: number };
    };
    assert.equal(body.success, true);
    assert.equal(body.meta.total, 50);
    assert.equal(body.data.length, 50);

    // Every product must have a unique slug, unique model number, and releaseDate >= 2022-11-01
    const slugs = new Set(body.data.map((p) => p.slug));
    const models = new Set(body.data.map((p) => p.baseModelNumber));
    assert.equal(slugs.size, 50);
    assert.equal(models.size, 50);
    assert.ok(body.data.every((p) => p.releaseDate >= '2022-11-01'));
  });

  it('GET /products filters accurately by brand (Apple 25 / Samsung 25) and category (26 / 14 / 10)', async () => {
    const resApple = await fetch(`${baseUrl}/products?brand=apple&limit=100`);
    const bodyApple = (await resApple.json()) as {
      data: Array<{ brand: { slug: string } }>;
      meta: { total: number };
    };
    assert.equal(bodyApple.meta.total, 25);
    assert.ok(bodyApple.data.every((p) => p.brand.slug === 'apple'));

    const resSamsung = await fetch(`${baseUrl}/products?brand=samsung&limit=100`);
    const bodySamsung = (await resSamsung.json()) as {
      data: Array<{ brand: { slug: string } }>;
      meta: { total: number };
    };
    assert.equal(bodySamsung.meta.total, 25);
    assert.ok(bodySamsung.data.every((p) => p.brand.slug === 'samsung'));

    const resPhone = await fetch(`${baseUrl}/products?category=smartphone&limit=100`);
    const bodyPhone = (await resPhone.json()) as { meta: { total: number } };
    assert.equal(bodyPhone.meta.total, 26);

    const resTablet = await fetch(`${baseUrl}/products?category=tablet&limit=100`);
    const bodyTablet = (await resTablet.json()) as { meta: { total: number } };
    assert.equal(bodyTablet.meta.total, 14);

    const resWatch = await fetch(`${baseUrl}/products?category=smartwatch&limit=100`);
    const bodyWatch = (await resWatch.json()) as { meta: { total: number } };
    assert.equal(bodyWatch.meta.total, 10);
  });

  it('GET /products supports search by product name and model number, price range, and release/price sorting', async () => {
    // 1. Search by product name
    const resName = await fetch(`${baseUrl}/products/search?q=iPad%20mini`);
    assert.equal(resName.status, 200);
    const bodyName = (await resName.json()) as { data: Array<{ slug: string }> };
    assert.equal(bodyName.data.length, 1);
    assert.equal(bodyName.data[0]?.slug, 'ipad-mini-a17-pro');

    // 2. Search by model number (SM-S928N)
    const resSearch = await fetch(`${baseUrl}/products/search?q=SM-S928N`);
    assert.equal(resSearch.status, 200);
    const bodySearch = (await resSearch.json()) as {
      data: Array<{ slug: string }>;
    };
    assert.equal(bodySearch.data.length, 1);
    assert.equal(bodySearch.data[0]?.slug, 'galaxy-s24-ultra');

    // 3. Sort by release_desc & release_asc
    const resRelDesc = await fetch(`${baseUrl}/products?sort=release_desc&limit=50`);
    const bodyRelDesc = (await resRelDesc.json()) as { data: Array<{ releaseDate: string }> };
    for (let i = 1; i < bodyRelDesc.data.length; i++) {
      assert.ok((bodyRelDesc.data[i]?.releaseDate ?? '') <= (bodyRelDesc.data[i - 1]?.releaseDate ?? ''));
    }

    const resRelAsc = await fetch(`${baseUrl}/products?sort=release_asc&limit=50`);
    const bodyRelAsc = (await resRelAsc.json()) as { data: Array<{ releaseDate: string }> };
    for (let i = 1; i < bodyRelAsc.data.length; i++) {
      assert.ok((bodyRelAsc.data[i]?.releaseDate ?? '') >= (bodyRelAsc.data[i - 1]?.releaseDate ?? ''));
    }

    // 4. Sort by price_asc
    const resSort = await fetch(`${baseUrl}/products?sort=price_asc&limit=50`);
    const bodySort = (await resSort.json()) as {
      data: Array<{ launchPriceKrw: number }>;
    };
    for (let i = 1; i < bodySort.data.length; i++) {
      assert.ok((bodySort.data[i]?.launchPriceKrw ?? 0) >= (bodySort.data[i - 1]?.launchPriceKrw ?? 0));
    }
  });

  it('GET /products rejects invalid query parameters with 400 VALIDATION_ERROR', async () => {
    const resInvalidBrand = await fetch(`${baseUrl}/products?brand=xiaomi`);
    assert.equal(resInvalidBrand.status, 400);
    const body = (await resInvalidBrand.json()) as {
      success: boolean;
      error: { code: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');

    const resInvalidPriceRange = await fetch(`${baseUrl}/products?minPrice=2000000&maxPrice=500000`);
    assert.equal(resInvalidPriceRange.status, 400);
  });

  it('GET /products/:slug and /products/:slug/variants return product detail and variants', async () => {
    const resDetail = await fetch(`${baseUrl}/products/iphone-16-pro`);
    assert.equal(resDetail.status, 200);
    const bodyDetail = (await resDetail.json()) as {
      data: { slug: string; variants: Array<{ skuCode: string }> };
    };
    assert.equal(bodyDetail.data.slug, 'iphone-16-pro');
    assert.equal(bodyDetail.data.variants.length, 2);

    const resVariants = await fetch(`${baseUrl}/products/iphone-16-pro/variants`);
    assert.equal(resVariants.status, 200);
    const bodyVariants = (await resVariants.json()) as { data: Array<{ skuCode: string }> };
    assert.equal(bodyVariants.data.length, 2);
  });

  it('GET /products/:slug returns 404 PRODUCT_NOT_FOUND for unknown product', async () => {
    const res = await fetch(`${baseUrl}/products/non-existent-device`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: { code: string } };
    assert.equal(body.error.code, 'PRODUCT_NOT_FOUND');
  });

  it('GET /products/:slug/specs returns category-specific specs and variant overrides', async () => {
    const resWatch = await fetch(`${baseUrl}/products/apple-watch-series-10-46/specs`);
    assert.equal(resWatch.status, 200);
    const bodyWatch = (await resWatch.json()) as {
      data: { specifications: Array<{ specKey: string; displayValue: string }> };
    };
    assert.equal(bodyWatch.data.specifications.length, 10);
    assert.equal(
      bodyWatch.data.specifications.some((s) => s.specKey === 'camera'),
      false,
    );

    const resBadVariant = await fetch(`${baseUrl}/products/iphone-16-pro/specs?variantId=unknown-var`);
    assert.equal(resBadVariant.status, 404);
    const bodyBadVar = (await resBadVariant.json()) as { error: { code: string } };
    assert.equal(bodyBadVar.error.code, 'VARIANT_NOT_FOUND');
  });

  it('GET /categories/:slug/spec-definitions returns ordered definitions for category', async () => {
    const res = await fetch(`${baseUrl}/categories/tablet/spec-definitions`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      data: { category: { slug: string }; definitions: Array<{ specKey: string }> };
    };
    assert.equal(body.data.category.slug, 'tablet');
    assert.equal(body.data.definitions.length, 12);
  });

  it('GET /compare compares 2 cross-brand products in the same category and highlights differences/winners', async () => {
    const res = await fetch(`${baseUrl}/compare?items=iphone-16-pro,galaxy-s24-ultra`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        category: { slug: string };
        items: Array<{ product: { slug: string; brand: { slug: string } } }>;
        specRows: Array<{
          specKey: string;
          isDifferent: boolean;
          cells: Array<{ productSlug: string; displayValue: string; isWinner: boolean }>;
        }>;
        analysis: {
          priceInsight: string;
          lowestPriceProductSlug: string | null;
          priceGapKrw: number | null;
          scorecards: Array<{ productSlug: string; winningSpecsCount: number; winningLabels: string[] }>;
          highlights: string[];
        };
      };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.category.slug, 'smartphone');
    assert.equal(body.data.items.length, 2);
    assert.deepEqual(
      body.data.items.map((p) => p.product.brand.slug),
      ['apple', 'samsung'],
    );

    // Check weight row (lower_better: iPhone 16 Pro 199g wins over Galaxy S24 Ultra 232g)
    const weightRow = body.data.specRows.find((r) => r.specKey === 'weight');
    assert.ok(weightRow);
    assert.equal(weightRow.isDifferent, true);
    const ipWeight = weightRow.cells.find((v) => v.productSlug === 'iphone-16-pro');
    const s24Weight = weightRow.cells.find((v) => v.productSlug === 'galaxy-s24-ultra');
    assert.equal(ipWeight?.isWinner, true);
    assert.equal(s24Weight?.isWinner, false);

    // Check null spec in comparison returns '정보 없음'
    const memoryRow = body.data.specRows.find((r) => r.specKey === 'memory');
    assert.ok(memoryRow);
    const ipMemory = memoryRow.cells.find((v) => v.productSlug === 'iphone-16-pro');
    assert.equal(ipMemory?.displayValue, '정보 없음');

    // Check automated comparison analysis report
    assert.ok(body.data.analysis);
    assert.equal(body.data.analysis.lowestPriceProductSlug, 'iphone-16-pro');
    assert.equal(body.data.analysis.priceGapKrw, 148400);
    assert.equal(body.data.analysis.scorecards.length, 2);
    assert.ok(body.data.analysis.highlights.length >= 2);
  });

  it('GET /compare supports 4 products in the same category', async () => {
    const res = await fetch(
      `${baseUrl}/compare?items=iphone-16-pro-max,iphone-16-pro,galaxy-s24-ultra,galaxy-z-fold6`,
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: { items: Array<{ product: { slug: string } }> };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.items.length, 4);
  });

  it('GET /compare rejects cross-category comparison with 422 CATEGORY_MISMATCH', async () => {
    const res = await fetch(`${baseUrl}/compare?items=iphone-16-pro,ipad-pro-11-m4`);
    assert.equal(res.status, 422);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'CATEGORY_MISMATCH');
  });

  it('GET /admin/audit verifies 50 models, brand/category balance, and release date integrity', async () => {
    const res = await fetch(`${baseUrl}/admin/audit`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        totalProducts: number;
        appleCount: number;
        samsungCount: number;
        smartphoneCount: number;
        tabletCount: number;
        smartwatchCount: number;
        allReleaseDatesValid: boolean;
        uniqueSlugsCount: number;
        uniqueModelNumbersCount: number;
        items: Array<{ slug: string; releaseDateValid: boolean; filledSpecsCount: number }>;
      };
    };
    assert.equal(body.success, true);
    assert.equal(body.data.totalProducts, 50);
    assert.equal(body.data.appleCount, 25);
    assert.equal(body.data.samsungCount, 25);
    assert.equal(body.data.smartphoneCount, 26);
    assert.equal(body.data.tabletCount, 14);
    assert.equal(body.data.smartwatchCount, 10);
    assert.equal(body.data.allReleaseDatesValid, true);
    assert.equal(body.data.uniqueSlugsCount, 50);
    assert.equal(body.data.uniqueModelNumbersCount, 50);
    assert.ok(body.data.items.every((item) => item.releaseDateValid && item.filledSpecsCount >= 8));
  });

  it('POST, PUT, and DELETE /admin/products support Phase 7 Admin CRUD for products and specs', async () => {
    // 1. Create a temporary test model (in-memory only via ?persist=false)
    const createRes = await fetch(`${baseUrl}/admin/products?persist=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'galaxy-s24-fe-test',
        name: 'Galaxy S24 FE (검수 테스트)',
        brand: 'samsung',
        category: 'smartphone',
        series: 'Galaxy S24',
        baseModelNumber: 'SM-S721N-TEST',
        releaseDate: '2024-11-01',
        launchPriceKrw: 946000,
        storageCapacity: '256GB',
        connectivity: '5G',
        sourceUrl: 'https://www.samsung.com/sec/',
        specs: [
          { specKey: 'processor', specValue: 'Exynos 2400e', numericValue: null },
          { specKey: 'memory', specValue: '8GB', numericValue: 8 },
          { specKey: 'storage', specValue: '256GB', numericValue: 256 },
          { specKey: 'weight', specValue: '213g', numericValue: 213 },
        ],
      }),
    });
    assert.equal(createRes.status, 200);

    // 2. Update the model via PUT
    const updateRes = await fetch(`${baseUrl}/admin/products/galaxy-s24-fe-test?persist=false`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'galaxy-s24-fe-test',
        name: 'Galaxy S24 FE 256GB',
        brand: 'samsung',
        category: 'smartphone',
        series: 'Galaxy S24',
        baseModelNumber: 'SM-S721N-TEST',
        releaseDate: '2024-11-01',
        launchPriceKrw: 920000,
        storageCapacity: '256GB',
        connectivity: '5G',
        sourceUrl: 'https://www.samsung.com/sec/',
        specs: [
          { specKey: 'processor', specValue: 'Exynos 2400e', numericValue: null },
          { specKey: 'memory', specValue: '8GB', numericValue: 8 },
          { specKey: 'storage', specValue: '256GB', numericValue: 256 },
          { specKey: 'weight', specValue: '213g', numericValue: 213 },
        ],
      }),
    });
    assert.equal(updateRes.status, 200);
    const updatedBody = (await updateRes.json()) as { data: { launchPriceKrw: number; name: string } };
    assert.equal(updatedBody.data.launchPriceKrw, 920000);
    assert.equal(updatedBody.data.name, 'Galaxy S24 FE 256GB');

    // 3. Delete the temporary test model via DELETE
    const deleteRes = await fetch(`${baseUrl}/admin/products/galaxy-s24-fe-test?persist=false`, {
      method: 'DELETE',
    });
    assert.equal(deleteRes.status, 200);
  });
});
