-- =============================================================================
-- TechCompare — 00002_rls_policies.sql
-- Row Level Security (RLS) Policies for Public Users, Authenticated Users, and Admins
-- =============================================================================

-- Helper function: Checks if the current JWT belongs to an administrator.
-- Checks both app_metadata.role = 'admin' and user_role = 'admin' claims.
-- Note: Backend operations using SUPABASE_SERVICE_ROLE_KEY automatically bypass RLS,
-- and are guarded by the Express admin authentication middleware.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'user_role') = 'admin',
    FALSE
  );
$$;

-- =============================================================================
-- Enable RLS on all 15 tables
-- =============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 1. Reference Tables (brands, categories, spec_definitions, stores, data_sources)
-- Public: Read active records. Admin: Full CRUD.
-- =============================================================================
CREATE POLICY "brands_public_read" ON public.brands
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "brands_admin_write" ON public.brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "spec_definitions_public_read" ON public.spec_definitions
  FOR SELECT USING (TRUE);

CREATE POLICY "spec_definitions_admin_write" ON public.spec_definitions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "stores_public_read" ON public.stores
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "stores_admin_write" ON public.stores
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "data_sources_public_read" ON public.data_sources
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "data_sources_admin_write" ON public.data_sources
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- 2. Product & Spec Tables (products, product_variants, specifications, product_images)
-- Public: Read only active AND verified products. Unverified/pending data is hidden.
-- Admin: Full read & write access.
-- =============================================================================
CREATE POLICY "products_public_read_verified" ON public.products
  FOR SELECT USING (
    (is_active = TRUE AND verification_status = 'verified')
    OR public.is_admin()
  );

CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_public_read" ON public.product_variants
  FOR SELECT USING (
    (
      is_active = TRUE
      AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id
          AND p.is_active = TRUE
          AND p.verification_status = 'verified'
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "product_variants_admin_write" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "specifications_public_read" ON public.specifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = specifications.product_id
        AND p.is_active = TRUE
        AND p.verification_status = 'verified'
    )
    OR public.is_admin()
  );

CREATE POLICY "specifications_admin_write" ON public.specifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_images_public_read" ON public.product_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.is_active = TRUE
        AND p.verification_status = 'verified'
    )
    OR public.is_admin()
  );

CREATE POLICY "product_images_admin_write" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- 3. Price Tables (product_prices, price_history)
-- Public: Read prices of active variants.
-- Admin: Insert/Update current prices, Insert price history.
-- =============================================================================
CREATE POLICY "product_prices_public_read" ON public.product_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = product_prices.variant_id
        AND pv.is_active = TRUE
        AND p.is_active = TRUE
        AND p.verification_status = 'verified'
    )
    OR public.is_admin()
  );

CREATE POLICY "product_prices_admin_write" ON public.product_prices
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "price_history_public_read" ON public.price_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = price_history.variant_id
        AND pv.is_active = TRUE
        AND p.is_active = TRUE
        AND p.verification_status = 'verified'
    )
    OR public.is_admin()
  );

CREATE POLICY "price_history_admin_insert" ON public.price_history
  FOR INSERT WITH CHECK (public.is_admin());

-- =============================================================================
-- 4. Internal Ingestion & Mapping Tables (Admin Only)
-- =============================================================================
CREATE POLICY "external_mappings_admin_only" ON public.external_product_mappings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ingestion_jobs_admin_only" ON public.ingestion_jobs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "ingestion_logs_admin_only" ON public.ingestion_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- 5. User Favorites (Authenticated User owns their rows; Admin can inspect)
-- =============================================================================
CREATE POLICY "user_favorites_select_own" ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_favorites_insert_own" ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_favorites_delete_own" ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());
