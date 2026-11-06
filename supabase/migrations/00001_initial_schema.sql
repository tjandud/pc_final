-- =============================================================================
-- TechCompare — 00001_initial_schema.sql
-- Initial PostgreSQL Schema for Supabase (15 Core Tables, Indexes, Triggers)
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Helper trigger function for updated_at columns
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. brands (브랜드 정보: Apple, Samsung)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  official_website VARCHAR(255),
  logo_url VARCHAR(500),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 2. categories (제품 카테고리: 스마트폰, 태블릿, 스마트워치)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_categories_slug CHECK (slug IN ('smartphone', 'tablet', 'smartwatch'))
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 11. data_sources (데이터 출처 및 라이선스/저장 정책)
-- Created before products/prices so FK references resolve cleanly.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  base_url VARCHAR(500),
  terms_url VARCHAR(500),
  terms_policy JSONB NOT NULL DEFAULT '{
    "allow_raw_storage": false,
    "allow_normalized_facts": true,
    "allow_redistribution": false,
    "allow_image_storage": false,
    "requires_license_verification": true
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_data_sources_type CHECK (
    source_type IN ('official_manufacturer', 'external_api', 'manual_admin', 'verified_retailer', 'test_seed')
  )
);

CREATE TRIGGER trg_data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 3. products (제품 공통 정보)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  series VARCHAR(100) NOT NULL,
  base_model_number VARCHAR(100),
  release_date DATE NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_products_brand_name_release UNIQUE (brand_id, name, release_date),
  CONSTRAINT chk_products_verification_status CHECK (
    verification_status IN ('pending', 'verified', 'rejected', 'needs_review')
  ),
  CONSTRAINT chk_products_release_date_min CHECK (release_date >= DATE '2022-11-01')
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 4. product_variants (저장 공간, 모델 번호, 통신 방식 등 변형 모델)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku_code VARCHAR(120) NOT NULL UNIQUE,
  model_number VARCHAR(100) NOT NULL,
  storage_capacity VARCHAR(50),
  ram_capacity VARCHAR(50),
  connectivity VARCHAR(50),
  color_name VARCHAR(80),
  color_hex VARCHAR(7),
  launch_price_krw NUMERIC(12, 0) CHECK (launch_price_krw IS NULL OR launch_price_krw >= 0),
  launch_price_usd NUMERIC(10, 2) CHECK (launch_price_usd IS NULL OR launch_price_usd >= 0),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_variants_combo UNIQUE NULLS NOT DISTINCT (
    product_id, model_number, storage_capacity, connectivity, color_name
  )
);

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 5. spec_definitions (카테고리별 스펙 정의)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.spec_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  spec_key VARCHAR(60) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  unit VARCHAR(30),
  data_type VARCHAR(20) NOT NULL DEFAULT 'text',
  comparison_rule VARCHAR(20) NOT NULL DEFAULT 'neutral',
  is_comparable BOOLEAN NOT NULL DEFAULT TRUE,
  is_variant_specific BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_spec_definitions_cat_key UNIQUE (category_id, spec_key),
  CONSTRAINT chk_spec_definitions_key CHECK (
    spec_key IN (
      'processor', 'memory', 'storage', 'display', 'resolution',
      'battery', 'camera', 'weight', 'dimensions', 'connectivity', 'os'
    )
  ),
  CONSTRAINT chk_spec_definitions_data_type CHECK (data_type IN ('text', 'number', 'boolean')),
  CONSTRAINT chk_spec_definitions_rule CHECK (
    comparison_rule IN ('higher_better', 'lower_better', 'neutral')
  )
);

-- =============================================================================
-- 6. specifications (실제 스펙 값 — 제품 공통 또는 변형 모델 연결)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  spec_definition_id UUID NOT NULL REFERENCES public.spec_definitions(id) ON DELETE CASCADE,
  spec_value TEXT,
  numeric_value NUMERIC(14, 4),
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_specifications_target UNIQUE NULLS NOT DISTINCT (
    product_id, variant_id, spec_definition_id
  )
);

CREATE TRIGGER trg_specifications_updated_at
  BEFORE UPDATE ON public.specifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 7. product_images (이미지와 출처)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  image_url VARCHAR(1000) NOT NULL,
  storage_path VARCHAR(500),
  image_type VARCHAR(30) NOT NULL DEFAULT 'front',
  alt_text VARCHAR(255),
  license_note VARCHAR(500) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_product_images_type CHECK (
    image_type IN ('thumbnail', 'front', 'back', 'side', 'gallery')
  )
);

-- =============================================================================
-- 8. stores (판매처)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  website_url VARCHAR(500),
  logo_url VARCHAR(500),
  country_code CHAR(2) NOT NULL DEFAULT 'KR',
  is_official_store BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 9. product_prices (판매처별 현재 판매 가격)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  current_price_krw NUMERIC(12, 0) NOT NULL CHECK (current_price_krw > 0),
  currency CHAR(3) NOT NULL DEFAULT 'KRW',
  product_url VARCHAR(1000),
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_prices_variant_store UNIQUE (variant_id, store_id)
);

CREATE TRIGGER trg_product_prices_updated_at
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 10. price_history (시간순 가격 이력 — Append-only, 덮어쓰기/삭제 금지)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  data_source_id UUID REFERENCES public.data_sources(id) ON DELETE SET NULL,
  price_krw NUMERIC(12, 0) NOT NULL CHECK (price_krw > 0),
  currency CHAR(3) NOT NULL DEFAULT 'KRW',
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger 1: Automatically append to price_history whenever product_prices is inserted or updated
CREATE OR REPLACE FUNCTION public.append_price_history_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND (
       OLD.current_price_krw IS DISTINCT FROM NEW.current_price_krw OR
       OLD.in_stock IS DISTINCT FROM NEW.in_stock OR
       OLD.collected_at IS DISTINCT FROM NEW.collected_at
     )) THEN
    INSERT INTO public.price_history (
      variant_id, store_id, data_source_id, price_krw, currency, in_stock, is_test_data, recorded_at
    ) VALUES (
      NEW.variant_id, NEW.store_id, NEW.data_source_id, NEW.current_price_krw,
      NEW.currency, NEW.in_stock, NEW.is_test_data, NEW.collected_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_prices_append_history
  AFTER INSERT OR UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.append_price_history_on_change();

-- Trigger 2: Prevent overwriting price_krw or recorded_at in price_history (Immutable History Rule)
CREATE OR REPLACE FUNCTION public.prevent_price_history_overwrite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'price_history is append-only; updating existing historical price records is forbidden.';
END;
$$;

CREATE TRIGGER trg_price_history_immutable
  BEFORE UPDATE ON public.price_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_price_history_overwrite();

-- =============================================================================
-- 12. external_product_mappings (외부 API 제품 ID와 자체 DB 제품 ID 매핑)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.external_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  external_product_id VARCHAR(150) NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  external_model_number VARCHAR(120),
  response_hash VARCHAR(64),
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_external_product_mapping UNIQUE (data_source_id, external_product_id)
);

-- =============================================================================
-- 13. ingestion_jobs (데이터 수집 작업)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  triggered_by UUID,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_processed INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT chk_ingestion_jobs_type CHECK (
    job_type IN ('product_search', 'product_detail_sync', 'price_import', 'manual_seed')
  ),
  CONSTRAINT chk_ingestion_jobs_status CHECK (
    status IN ('running', 'completed', 'failed', 'partial')
  )
);

-- =============================================================================
-- 14. ingestion_logs (수집 성공 및 실패 내역 + 데이터 수정 감사 로그)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ingestion_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id UUID REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id VARCHAR(150),
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  detail_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ingestion_logs_action CHECK (
    action IN (
      'inserted', 'updated', 'skipped_duplicate', 'rejected_brand',
      'rejected_category', 'rejected_release_date', 'rejected_license_policy',
      'needs_review', 'admin_edit', 'error'
    )
  ),
  CONSTRAINT chk_ingestion_logs_status CHECK (status IN ('success', 'warning', 'error'))
);

-- =============================================================================
-- 15. user_favorites (사용자별 즐겨찾기)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_favorites_item UNIQUE NULLS NOT DISTINCT (user_id, product_id, variant_id)
);

-- =============================================================================
-- Indexes for Search, Filtering, and Price Queries
-- =============================================================================

-- Product filtering & sorting indexes
CREATE INDEX IF NOT EXISTS idx_products_public_filter
  ON public.products (brand_id, category_id, release_date DESC)
  WHERE is_active = TRUE AND verification_status = 'verified';

CREATE INDEX IF NOT EXISTS idx_products_popularity
  ON public.products (view_count DESC, release_date DESC)
  WHERE is_active = TRUE AND verification_status = 'verified';

CREATE INDEX IF NOT EXISTS idx_products_release_date
  ON public.products (release_date DESC);

-- Trigram indexes for fast product name & model number search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_base_model_trgm
  ON public.products USING GIN (base_model_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_model_trgm
  ON public.product_variants USING GIN (model_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON public.product_variants (product_id, is_default DESC);

-- Specification lookup indexes
CREATE INDEX IF NOT EXISTS idx_specifications_product_variant
  ON public.specifications (product_id, variant_id, spec_definition_id);

CREATE INDEX IF NOT EXISTS idx_spec_definitions_category_order
  ON public.spec_definitions (category_id, display_order ASC);

-- Price & Price History composite indexes
CREATE INDEX IF NOT EXISTS idx_product_prices_variant_price
  ON public.product_prices (variant_id, current_price_krw ASC)
  WHERE in_stock = TRUE;

CREATE INDEX IF NOT EXISTS idx_price_history_variant_time
  ON public.price_history (variant_id, recorded_at DESC, store_id);

CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at
  ON public.price_history (recorded_at DESC);

-- External mapping & ingestion indexes
CREATE INDEX IF NOT EXISTS idx_external_mappings_product
  ON public.external_product_mappings (product_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_job_status
  ON public.ingestion_logs (job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user
  ON public.user_favorites (user_id, created_at DESC);
