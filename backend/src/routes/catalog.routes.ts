import { Router } from 'express';
import { createCatalogController } from '../controllers/catalog.controller.js';
import type { CatalogService } from '../services/catalog.service.js';

export function createCatalogRouter(service?: CatalogService): Router {
  const router = Router();
  const ctrl = createCatalogController(service);

  // Brands
  router.get('/brands', ctrl.listBrands);
  router.get('/brands/:slug/products', ctrl.listBrandProducts);

  // Categories & Category Spec Definitions
  router.get('/categories', ctrl.listCategories);
  router.get('/categories/:slug/products', ctrl.listCategoryProducts);
  router.get('/categories/:slug/spec-definitions', ctrl.getCategorySpecDefinitions);

  // Products, Search, Variants & Specifications
  router.get('/products', ctrl.listProducts);
  router.get('/products/search', ctrl.listProducts);
  router.get('/products/:slug', ctrl.getProductDetail);
  router.get('/products/:slug/variants', ctrl.getProductVariants);
  router.get('/products/:slug/specs', ctrl.getProductSpecifications);

  // Compare (2–4 products, same category only)
  router.get('/compare', ctrl.compareProducts);

  // Phase 7 — Admin Inspection, Audit & CRUD
  router.get('/admin/audit', ctrl.getDataAudit);
  router.post('/admin/products', ctrl.adminUpsertProduct);
  router.put('/admin/products/:slug', ctrl.adminUpsertProduct);
  router.delete('/admin/products/:slug', ctrl.adminDeleteProduct);

  return router;
}
