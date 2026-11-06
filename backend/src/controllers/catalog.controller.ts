import type { NextFunction, Request, Response } from 'express';
import { createDefaultCatalogService, type CatalogService } from '../services/catalog.service.js';
import { ok } from '../utils/apiResponse.js';
import {
  adminProductUpsertSchema,
  brandSlugSchema,
  categorySlugParamSchema,
  compareQuerySchema,
  productListQuerySchema,
  productSpecsQuerySchema,
  slugParamSchema,
} from '../validators/product.validator.js';

export function createCatalogController(service: CatalogService = createDefaultCatalogService()) {
  return {
    listBrands: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const brands = await service.listBrands();
        ok(res, brands);
      } catch (err) {
        next(err);
      }
    },

    listBrandProducts: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const brandSlug = brandSlugSchema.parse(req.params.slug);
        const query = productListQuerySchema.parse({ ...req.query, brand: brandSlug });
        const result = await service.listProducts(query);
        ok(res, result.items, { page: result.page, limit: result.limit, total: result.total });
      } catch (err) {
        next(err);
      }
    },

    listCategories: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const categories = await service.listCategories();
        ok(res, categories);
      } catch (err) {
        next(err);
      }
    },

    listCategoryProducts: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = categorySlugParamSchema.parse(req.params);
        const query = productListQuerySchema.parse({ ...req.query, category: slug });
        const result = await service.listProducts(query);
        ok(res, result.items, { page: result.page, limit: result.limit, total: result.total });
      } catch (err) {
        next(err);
      }
    },

    getCategorySpecDefinitions: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = categorySlugParamSchema.parse(req.params);
        const result = await service.getCategorySpecDefinitions(slug);
        ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    listProducts: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const query = productListQuerySchema.parse(req.query);
        const result = await service.listProducts(query);
        ok(res, result.items, { page: result.page, limit: result.limit, total: result.total });
      } catch (err) {
        next(err);
      }
    },

    getProductDetail: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = slugParamSchema.parse(req.params);
        const includeTest = req.query.includeTest === 'true';
        const product = await service.getProductDetail(slug, includeTest);
        ok(res, product);
      } catch (err) {
        next(err);
      }
    },

    getProductVariants: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = slugParamSchema.parse(req.params);
        const includeTest = req.query.includeTest === 'true';
        const variants = await service.getProductVariants(slug, includeTest);
        ok(res, variants);
      } catch (err) {
        next(err);
      }
    },

    getProductSpecifications: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = slugParamSchema.parse(req.params);
        const { variantId } = productSpecsQuerySchema.parse(req.query);
        const includeTest = req.query.includeTest === 'true';
        const specs = await service.getProductSpecifications(slug, variantId, includeTest);
        ok(res, specs);
      } catch (err) {
        next(err);
      }
    },

    compareProducts: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { items } = compareQuerySchema.parse(req.query);
        const includeTest = req.query.includeTest === 'true';
        const result = await service.compareProducts(items, includeTest);
        ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    getDataAudit: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await service.getDataAudit();
        ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    adminUpsertProduct: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const bodyInput = req.params.slug ? { ...req.body, slug: req.params.slug } : req.body;
        const parsed = adminProductUpsertSchema.parse(bodyInput);
        const persistToDisk = req.query.persist !== 'false';
        const saved = await service.adminUpsertProduct(parsed, persistToDisk);
        ok(res, saved);
      } catch (err) {
        next(err);
      }
    },

    adminDeleteProduct: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { slug } = slugParamSchema.parse(req.params);
        const persistToDisk = req.query.persist !== 'false';
        const result = await service.adminDeleteProduct(slug, persistToDisk);
        ok(res, result);
      } catch (err) {
        next(err);
      }
    },
  };
}
