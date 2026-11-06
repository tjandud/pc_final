-- =============================================================================
-- TechCompare — 00001_base_reference.sql
-- Base Reference Data & Verified Official Manufacturer Product Seed
--
-- RULES FOLLOWED:
-- 1. Zero TechSpecs API data is stored here (TechSpecs terms & storage rights pending).
-- 2. Only real, officially released Apple and Samsung devices (released after 2022-11)
--    with publicly documented manufacturer specifications and launch prices are included.
-- 3. Missing or inapplicable specs are left NULL (displayed as '정보 없음' in UI).
-- 4. Sample retail prices for development testing are explicitly marked is_test_data = TRUE.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Brands (Apple, Samsung)
-- -----------------------------------------------------------------------------
INSERT INTO public.brands (slug, name, official_website, display_order, is_active)
VALUES
  ('apple', 'Apple', 'https://www.apple.com/kr', 1, TRUE),
  ('samsung', 'Samsung', 'https://www.samsung.com/sec', 2, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    official_website = EXCLUDED.official_website,
    display_order = EXCLUDED.display_order;

-- -----------------------------------------------------------------------------
-- 2. Categories (스마트폰, 태블릿, 스마트워치)
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (slug, name, name_en, display_order, is_active)
VALUES
  ('smartphone', '스마트폰', 'Smartphones', 1, TRUE),
  ('tablet', '태블릿', 'Tablets', 2, TRUE),
  ('smartwatch', '스마트워치', 'Smartwatches', 3, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    name_en = EXCLUDED.name_en,
    display_order = EXCLUDED.display_order;

-- -----------------------------------------------------------------------------
-- 3. Data Sources
-- -----------------------------------------------------------------------------
INSERT INTO public.data_sources (code, name, source_type, base_url, terms_url, terms_policy, is_active)
VALUES
  (
    'official_manufacturer_kr',
    '제조사 공식 공개 사양 (Apple 코리아 / 삼성전자 공식 홈페이지)',
    'official_manufacturer',
    'https://www.apple.com/kr',
    NULL,
    '{"allow_raw_storage": false, "allow_normalized_facts": true, "allow_redistribution": true, "allow_image_storage": false, "requires_license_verification": false}'::jsonb,
    TRUE
  ),
  (
    'techspecs_v5',
    'TechSpecs API v5',
    'external_api',
    'https://api.techspecs.io/v5',
    'https://www.techspecs.io/terms',
    '{"allow_raw_storage": false, "allow_normalized_facts": false, "allow_redistribution": false, "allow_image_storage": false, "requires_license_verification": true}'::jsonb,
    TRUE
  ),
  (
    'manual_admin',
    '관리자 직접 입력 및 검수',
    'manual_admin',
    NULL,
    NULL,
    '{"allow_raw_storage": true, "allow_normalized_facts": true, "allow_redistribution": true, "allow_image_storage": true, "requires_license_verification": false}'::jsonb,
    TRUE
  ),
  (
    'dev_test_price_seed',
    '개발 테스트용 모의 가격 시드 (실제 거래 가격 아님)',
    'test_seed',
    NULL,
    NULL,
    '{"allow_raw_storage": true, "allow_normalized_facts": true, "allow_redistribution": false, "allow_image_storage": false, "requires_license_verification": false}'::jsonb,
    TRUE
  )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    terms_policy = EXCLUDED.terms_policy;

-- -----------------------------------------------------------------------------
-- 4. Stores (공식 스토어 등록)
-- -----------------------------------------------------------------------------
INSERT INTO public.stores (slug, name, website_url, country_code, is_official_store, is_active)
VALUES
  ('apple-store-kr', 'Apple 공식 스토어 (대한민국)', 'https://www.apple.com/kr', 'KR', TRUE, TRUE),
  ('samsung-store-kr', '삼성닷컴 공식 스토어', 'https://www.samsung.com/sec', 'KR', TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    website_url = EXCLUDED.website_url;

-- -----------------------------------------------------------------------------
-- 5. Category-Specific Spec Definitions (카테고리에 맞는 스펙 항목만 정의)
-- -----------------------------------------------------------------------------
-- 5-A. 스마트폰 (11개 스펙 항목 전체)
INSERT INTO public.spec_definitions (category_id, spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
SELECT c.id, v.spec_key, v.display_name, v.unit, v.data_type, v.comparison_rule, v.is_comparable, v.is_variant_specific, v.display_order
FROM public.categories c
CROSS JOIN (
  VALUES
    ('processor',    '프로세서',   NULL,   'text',   'neutral',       TRUE, FALSE, 1),
    ('memory',       '메모리',     'GB',   'number', 'higher_better', TRUE, TRUE,  2),
    ('storage',      '저장 공간',  'GB',   'number', 'higher_better', TRUE, TRUE,  3),
    ('display',      '디스플레이', '인치', 'number', 'higher_better', TRUE, FALSE, 4),
    ('resolution',   '해상도',     'px',   'text',   'neutral',       TRUE, FALSE, 5),
    ('battery',      '배터리',     'mAh',  'number', 'higher_better', TRUE, FALSE, 6),
    ('camera',       '카메라',     'MP',   'number', 'higher_better', TRUE, FALSE, 7),
    ('weight',       '무게',       'g',    'number', 'lower_better',  TRUE, FALSE, 8),
    ('dimensions',   '크기',       'mm',   'text',   'neutral',       TRUE, FALSE, 9),
    ('connectivity', '연결 방식',  NULL,   'text',   'neutral',       TRUE, TRUE,  10),
    ('os',           '운영체제',   NULL,   'text',   'neutral',       TRUE, FALSE, 11)
) AS v(spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
WHERE c.slug = 'smartphone'
ON CONFLICT (category_id, spec_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    unit = EXCLUDED.unit,
    comparison_rule = EXCLUDED.comparison_rule,
    is_variant_specific = EXCLUDED.is_variant_specific,
    display_order = EXCLUDED.display_order;

-- 5-B. 태블릿 (11개 스펙 항목)
INSERT INTO public.spec_definitions (category_id, spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
SELECT c.id, v.spec_key, v.display_name, v.unit, v.data_type, v.comparison_rule, v.is_comparable, v.is_variant_specific, v.display_order
FROM public.categories c
CROSS JOIN (
  VALUES
    ('processor',    '프로세서',   NULL,   'text',   'neutral',       TRUE, FALSE, 1),
    ('memory',       '메모리',     'GB',   'number', 'higher_better', TRUE, TRUE,  2),
    ('storage',      '저장 공간',  'GB',   'number', 'higher_better', TRUE, TRUE,  3),
    ('display',      '디스플레이', '인치', 'number', 'higher_better', TRUE, FALSE, 4),
    ('resolution',   '해상도',     'px',   'text',   'neutral',       TRUE, FALSE, 5),
    ('battery',      '배터리',     'Wh',   'number', 'higher_better', TRUE, FALSE, 6),
    ('camera',       '카메라',     'MP',   'number', 'higher_better', TRUE, FALSE, 7),
    ('weight',       '무게',       'g',    'number', 'lower_better',  TRUE, TRUE,  8),
    ('dimensions',   '크기',       'mm',   'text',   'neutral',       TRUE, FALSE, 9),
    ('connectivity', '연결 방식',  NULL,   'text',   'neutral',       TRUE, TRUE,  10),
    ('os',           '운영체제',   NULL,   'text',   'neutral',       TRUE, FALSE, 11)
) AS v(spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
WHERE c.slug = 'tablet'
ON CONFLICT (category_id, spec_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    unit = EXCLUDED.unit,
    comparison_rule = EXCLUDED.comparison_rule,
    is_variant_specific = EXCLUDED.is_variant_specific,
    display_order = EXCLUDED.display_order;

-- 5-C. 스마트워치 (카메라 제외 — 카테고리에 맞지 않는 스펙 미표시 원칙 준수, 10개 항목)
INSERT INTO public.spec_definitions (category_id, spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
SELECT c.id, v.spec_key, v.display_name, v.unit, v.data_type, v.comparison_rule, v.is_comparable, v.is_variant_specific, v.display_order
FROM public.categories c
CROSS JOIN (
  VALUES
    ('processor',    '프로세서',   NULL,   'text',   'neutral',       TRUE, FALSE, 1),
    ('memory',       '메모리',     'GB',   'number', 'higher_better', TRUE, FALSE, 2),
    ('storage',      '저장 공간',  'GB',   'number', 'higher_better', TRUE, FALSE, 3),
    ('display',      '디스플레이', 'mm',   'number', 'higher_better', TRUE, FALSE, 4),
    ('resolution',   '해상도',     'px',   'text',   'neutral',       TRUE, FALSE, 5),
    ('battery',      '배터리',     '시간', 'number', 'higher_better', TRUE, FALSE, 6),
    ('weight',       '무게',       'g',    'number', 'lower_better',  TRUE, TRUE,  7),
    ('dimensions',   '크기',       'mm',   'text',   'neutral',       TRUE, FALSE, 8),
    ('connectivity', '연결 방식',  NULL,   'text',   'neutral',       TRUE, TRUE,  9),
    ('os',           '운영체제',   NULL,   'text',   'neutral',       TRUE, FALSE, 10)
) AS v(spec_key, display_name, unit, data_type, comparison_rule, is_comparable, is_variant_specific, display_order)
WHERE c.slug = 'smartwatch'
ON CONFLICT (category_id, spec_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    unit = EXCLUDED.unit,
    comparison_rule = EXCLUDED.comparison_rule,
    is_variant_specific = EXCLUDED.is_variant_specific,
    display_order = EXCLUDED.display_order;

-- -----------------------------------------------------------------------------
-- 6. Official Verified Products (Released >= 2022-11-01, Real KR Models)
--    - Smartphones: iPhone 16 Pro (A3293), Galaxy S24 Ultra (SM-S928N)
--    - Tablets: iPad Pro 11 (M4) (A2836), Galaxy Tab S10 Ultra (SM-X920)
--    - Smartwatches: Apple Watch Series 10 46mm (A2999), Galaxy Watch7 44mm (SM-L310)
-- -----------------------------------------------------------------------------
INSERT INTO public.products (
  brand_id, category_id, data_source_id, slug, name, series, base_model_number,
  release_date, verification_status, is_test_data, is_active, last_synced_at
)
SELECT
  b.id, c.id, ds.id, v.slug, v.name, v.series, v.base_model_number,
  v.release_date::date, 'verified', FALSE, TRUE, NOW()
FROM (
  VALUES
    ('apple',   'smartphone', 'iphone-16-pro',           'iPhone 16 Pro',           'iPhone',       'A3293',    '2024-09-20'),
    ('samsung', 'smartphone', 'galaxy-s24-ultra',        'Galaxy S24 Ultra',        'Galaxy S',     'SM-S928N', '2024-01-31'),
    ('apple',   'tablet',     'ipad-pro-11-m4',          'iPad Pro 11 (M4)',        'iPad',         'A2836',    '2024-05-15'),
    ('samsung', 'tablet',     'galaxy-tab-s10-ultra',    'Galaxy Tab S10 Ultra',    'Galaxy Tab',   'SM-X920',  '2024-10-04'),
    ('apple',   'smartwatch', 'apple-watch-series-10-46','Apple Watch Series 10 46mm','Apple Watch','A2999',    '2024-09-20'),
    ('samsung', 'smartwatch', 'galaxy-watch7-44',        'Galaxy Watch7 44mm',      'Galaxy Watch', 'SM-L310',  '2024-07-24')
) AS v(brand_slug, category_slug, slug, name, series, base_model_number, release_date)
JOIN public.brands b ON b.slug = v.brand_slug
JOIN public.categories c ON c.slug = v.category_slug
JOIN public.data_sources ds ON ds.code = 'official_manufacturer_kr'
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    base_model_number = EXCLUDED.base_model_number,
    release_date = EXCLUDED.release_date;

-- -----------------------------------------------------------------------------
-- 7. Product Variants (Real Korean Official Variants & Manufacturer Launch Prices)
-- -----------------------------------------------------------------------------
INSERT INTO public.product_variants (
  product_id, sku_code, model_number, storage_capacity, ram_capacity,
  connectivity, color_name, color_hex, launch_price_krw, launch_price_usd, is_default, is_active
)
SELECT
  p.id, v.sku_code, v.model_number, v.storage_capacity, v.ram_capacity,
  v.connectivity, v.color_name, v.color_hex, v.launch_price_krw, v.launch_price_usd, v.is_default, TRUE
FROM (
  VALUES
    ('iphone-16-pro',            'AP-IP16P-128-5G',  'A3293',    '128GB', '8GB',  '5G',               '내추럴 티타늄', '#9A968F', 1550000, 999.00,  TRUE),
    ('iphone-16-pro',            'AP-IP16P-256-5G',  'A3293',    '256GB', '8GB',  '5G',               '내추럴 티타늄', '#9A968F', 1700000, 1099.00, FALSE),
    ('galaxy-s24-ultra',         'SM-S928N-256-5G',  'SM-S928N', '256GB', '12GB', '5G',               '티타늄 그레이', '#7C7A75', 1698400, 1299.99, TRUE),
    ('galaxy-s24-ultra',         'SM-S928N-512-5G',  'SM-S928N', '512GB', '12GB', '5G',               '티타늄 블랙',   '#2B2B2D', 1841400, 1419.99, FALSE),
    ('ipad-pro-11-m4',           'AP-IPP11M4-256-W', 'A2836',    '256GB', '8GB',  'Wi-Fi',            '스페이스 블랙', '#2E2F31', 1499000, 999.00,  TRUE),
    ('ipad-pro-11-m4',           'AP-IPP11M4-512-W', 'A2836',    '512GB', '8GB',  'Wi-Fi',            '스페이스 블랙', '#2E2F31', 1799000, 1199.00, FALSE),
    ('galaxy-tab-s10-ultra',     'SM-X920-256-W',    'SM-X920',  '256GB', '12GB', 'Wi-Fi',            '문스톤 그레이', '#656970', 1598300, 1199.99, TRUE),
    ('apple-watch-series-10-46', 'AP-AWS10-46-GPS',  'A2999',    '64GB',  NULL,   'GPS',              '제트 블랙',     '#151618', 649000,  429.00,  TRUE),
    ('galaxy-watch7-44',         'SM-L310-44-BT',    'SM-L310',  '32GB',  '2GB',  'Bluetooth / Wi-Fi','그린',          '#4B584E', 389000,  329.99,  TRUE)
) AS v(product_slug, sku_code, model_number, storage_capacity, ram_capacity, connectivity, color_name, color_hex, launch_price_krw, launch_price_usd, is_default)
JOIN public.products p ON p.slug = v.product_slug
ON CONFLICT (sku_code) DO UPDATE
SET launch_price_krw = EXCLUDED.launch_price_krw,
    launch_price_usd = EXCLUDED.launch_price_usd,
    is_default = EXCLUDED.is_default;

-- -----------------------------------------------------------------------------
-- 8. Base Specifications (Official Manufacturer Facts; Unannounced values left NULL)
--    For example, Apple does not officially disclose iPhone RAM or mAh on its spec page -> NULL ('정보 없음')
-- -----------------------------------------------------------------------------
INSERT INTO public.specifications (product_id, variant_id, spec_definition_id, spec_value, numeric_value, data_source_id, is_verified)
SELECT
  p.id, NULL, sd.id, v.spec_value, v.numeric_value, ds.id, TRUE
FROM (
  VALUES
    -- iPhone 16 Pro (Apple 공식 사양서 기준; 공식 미표기 항목인 메모리/배터리 용량(mAh)은 NULL로 두어 '정보 없음' 검증)
    ('iphone-16-pro', 'processor',    'Apple A18 Pro (6코어 CPU, 6코어 GPU, 16코어 Neural Engine)', NULL),
    ('iphone-16-pro', 'memory',       NULL, NULL),
    ('iphone-16-pro', 'storage',      '128GB / 256GB / 512GB / 1TB', 128),
    ('iphone-16-pro', 'display',      '6.3인치 Super Retina XDR OLED (120Hz ProMotion)', 6.3),
    ('iphone-16-pro', 'resolution',   '2622 x 1206 픽셀 (460 ppi)', 2622),
    ('iphone-16-pro', 'battery',      NULL, NULL),
    ('iphone-16-pro', 'camera',       '48MP Fusion 메인 + 48MP 초광각 + 12MP 5배 망원', 48),
    ('iphone-16-pro', 'weight',       '199 g', 199),
    ('iphone-16-pro', 'dimensions',   '149.6 x 71.5 x 8.25 mm', NULL),
    ('iphone-16-pro', 'connectivity', '5G, Wi-Fi 7 (802.11be), Bluetooth 5.3, NFC, USB-C 3 (10Gb/s)', NULL),
    ('iphone-16-pro', 'os',           'iOS 18', NULL),

    -- Galaxy S24 Ultra (삼성전자 공식 사양서 기준)
    ('galaxy-s24-ultra', 'processor',    'Snapdragon 8 Gen 3 for Galaxy (옥타코어)', NULL),
    ('galaxy-s24-ultra', 'memory',       '12 GB', 12),
    ('galaxy-s24-ultra', 'storage',      '256GB / 512GB / 1TB', 256),
    ('galaxy-s24-ultra', 'display',      '6.8인치 Dynamic AMOLED 2X (1~120Hz)', 6.8),
    ('galaxy-s24-ultra', 'resolution',   '3120 x 1440 (Quad HD+)', 3120),
    ('galaxy-s24-ultra', 'battery',      '5,000 mAh', 5000),
    ('galaxy-s24-ultra', 'camera',       '200MP 광각 + 50MP 5배 망원 + 12MP 초광각 + 10MP 3배 망원', 200),
    ('galaxy-s24-ultra', 'weight',       '232 g', 232),
    ('galaxy-s24-ultra', 'dimensions',   '162.3 x 79.0 x 8.6 mm', NULL),
    ('galaxy-s24-ultra', 'connectivity', '5G, Wi-Fi 7 (802.11be), Bluetooth 5.3, NFC, UWB, USB-C 3.2 Gen 1', NULL),
    ('galaxy-s24-ultra', 'os',           'Android 14 (One UI 6.1)', NULL),

    -- iPad Pro 11 (M4)
    ('ipad-pro-11-m4', 'processor',    'Apple M4 칩 (9코어 CPU, 10코어 GPU)', NULL),
    ('ipad-pro-11-m4', 'memory',       '8 GB', 8),
    ('ipad-pro-11-m4', 'storage',      '256GB / 512GB / 1TB / 2TB', 256),
    ('ipad-pro-11-m4', 'display',      '11인치 Ultra Retina XDR (탠덤 OLED, 120Hz ProMotion)', 11.0),
    ('ipad-pro-11-m4', 'resolution',   '2420 x 1668 픽셀 (264 ppi)', 2420),
    ('ipad-pro-11-m4', 'battery',      '31.29 Wh', 31.29),
    ('ipad-pro-11-m4', 'camera',       '12MP 와이드 카메라 + 12MP 가로형 초광각 전면 카메라', 12),
    ('ipad-pro-11-m4', 'weight',       '444 g (Wi-Fi)', 444),
    ('ipad-pro-11-m4', 'dimensions',   '249.7 x 177.5 x 5.3 mm', NULL),
    ('ipad-pro-11-m4', 'connectivity', 'Wi-Fi 6E (802.11ax), Bluetooth 5.3, Thunderbolt / USB 4', NULL),
    ('ipad-pro-11-m4', 'os',           'iPadOS 17', NULL),

    -- Galaxy Tab S10 Ultra
    ('galaxy-tab-s10-ultra', 'processor',    'MediaTek Dimensity 9300+ (옥타코어)', NULL),
    ('galaxy-tab-s10-ultra', 'memory',       '12 GB', 12),
    ('galaxy-tab-s10-ultra', 'storage',      '256GB / 512GB / 1TB', 256),
    ('galaxy-tab-s10-ultra', 'display',      '14.6인치 Dynamic AMOLED 2X (120Hz)', 14.6),
    ('galaxy-tab-s10-ultra', 'resolution',   '2960 x 1848 (WQXGA+)', 2960),
    ('galaxy-tab-s10-ultra', 'battery',      '11,200 mAh (약 43.0 Wh)', 43.0),
    ('galaxy-tab-s10-ultra', 'camera',       '후면 13MP + 8MP 초광각 / 전면 12MP + 12MP 초광각', 13),
    ('galaxy-tab-s10-ultra', 'weight',       '718 g (Wi-Fi)', 718),
    ('galaxy-tab-s10-ultra', 'dimensions',   '208.6 x 326.4 x 5.4 mm', NULL),
    ('galaxy-tab-s10-ultra', 'connectivity', 'Wi-Fi 7 (802.11be), Bluetooth 5.3, USB-C 3.2', NULL),
    ('galaxy-tab-s10-ultra', 'os',           'Android 14 (One UI 6.1.1)', NULL),

    -- Apple Watch Series 10 46mm
    ('apple-watch-series-10-46', 'processor',    'Apple S10 SiP (64비트 듀얼 코어, 4코어 Neural Engine)', NULL),
    ('apple-watch-series-10-46', 'memory',       NULL, NULL),
    ('apple-watch-series-10-46', 'storage',      '64 GB', 64),
    ('apple-watch-series-10-46', 'display',      '46mm 와이드 앵글 LTPO3 OLED 상시표시형 Retina', 46),
    ('apple-watch-series-10-46', 'resolution',   '416 x 496 픽셀 (1,220 sq mm)', 496),
    ('apple-watch-series-10-46', 'battery',      '최대 18시간 (저전력 모드 최대 36시간)', 18),
    ('apple-watch-series-10-46', 'weight',       '36.4 g (알루미늄 GPS)', 36.4),
    ('apple-watch-series-10-46', 'dimensions',   '46 x 39 x 9.7 mm', NULL),
    ('apple-watch-series-10-46', 'connectivity', 'GPS, Wi-Fi 4 (802.11n), Bluetooth 5.3, UWB 2세대', NULL),
    ('apple-watch-series-10-46', 'os',           'watchOS 11', NULL),

    -- Galaxy Watch7 44mm
    ('galaxy-watch7-44', 'processor',    'Exynos W1000 (3nm 5코어)', NULL),
    ('galaxy-watch7-44', 'memory',       '2 GB', 2),
    ('galaxy-watch7-44', 'storage',      '32 GB', 32),
    ('galaxy-watch7-44', 'display',      '44mm Super AMOLED (1.5인치)', 44),
    ('galaxy-watch7-44', 'resolution',   '480 x 480 픽셀', 480),
    ('galaxy-watch7-44', 'battery',      '425 mAh (AOD 끄기 시 최대 40시간)', 40),
    ('galaxy-watch7-44', 'weight',       '33.8 g (스트랩 제외)', 33.8),
    ('galaxy-watch7-44', 'dimensions',   '44.4 x 44.4 x 9.7 mm', NULL),
    ('galaxy-watch7-44', 'connectivity', '듀얼 주파수 GPS (L1+L5), Wi-Fi, Bluetooth 5.3, NFC', NULL),
    ('galaxy-watch7-44', 'os',           'Wear OS Powered by Samsung (One UI 6 Watch)', NULL)
) AS v(product_slug, spec_key, spec_value, numeric_value)
JOIN public.products p ON p.slug = v.product_slug
JOIN public.spec_definitions sd ON sd.category_id = p.category_id AND sd.spec_key = v.spec_key
JOIN public.data_sources ds ON ds.code = 'official_manufacturer_kr'
ON CONFLICT (product_id, variant_id, spec_definition_id) DO UPDATE
SET spec_value = EXCLUDED.spec_value,
    numeric_value = EXCLUDED.numeric_value;

-- Variant-specific overrides (e.g., 256GB / 512GB variants)
INSERT INTO public.specifications (product_id, variant_id, spec_definition_id, spec_value, numeric_value, data_source_id, is_verified)
SELECT
  p.id, pv.id, sd.id, pv.storage_capacity,
  REGEXP_REPLACE(pv.storage_capacity, '[^0-9]', '', 'g')::numeric,
  ds.id, TRUE
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
JOIN public.spec_definitions sd ON sd.category_id = p.category_id AND sd.spec_key = 'storage'
JOIN public.data_sources ds ON ds.code = 'official_manufacturer_kr'
WHERE pv.storage_capacity IS NOT NULL
ON CONFLICT (product_id, variant_id, spec_definition_id) DO UPDATE
SET spec_value = EXCLUDED.spec_value,
    numeric_value = EXCLUDED.numeric_value;

COMMIT;
