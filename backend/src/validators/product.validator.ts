import { z } from 'zod';

export const brandSlugSchema = z.enum([
  'apple',
  'samsung',
  'sony',
  'lenovo',
  'lg',
  'asus',
  'bose',
  'sennheiser',
  'beats',
  'google',
  'xiaomi',
  'garmin',
]);
export const categorySlugSchema = z.enum([
  'smartphone',
  'tablet',
  'smartwatch',
  'laptop',
  'audio',
]);
export const specKeySchema = z.enum([
  'processor',
  'memory',
  'storage',
  'display',
  'resolution',
  'refresh_rate',
  'battery',
  'camera',
  'weight',
  'dimensions',
  'connectivity',
  'os',
]);

export const productSortSchema = z
  .enum(['release_desc', 'release_asc', 'price_asc', 'price_desc', 'name_asc'])
  .default('release_desc');

export const productListQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    brand: brandSlugSchema.optional(),
    category: categorySlugSchema.optional(),
    series: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    year: z.coerce.number().int().min(2022).max(2030).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    sort: productSortSchema,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeTest: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .refine(
    (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
    { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] },
  );

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain lowercase letters, numbers, or hyphens only'),
});

export const categorySlugParamSchema = z.object({
  slug: categorySlugSchema,
});

export const productSpecsQuerySchema = z.object({
  variantId: z.string().trim().min(1).max(100).optional(),
});

export const compareQuerySchema = z.object({
  items: z
    .string()
    .trim()
    .min(1, 'Comparison items parameter is required')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export const adminProductUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'slug는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.'),
  name: z.string().trim().min(2).max(150),
  brand: brandSlugSchema,
  category: categorySlugSchema,
  series: z.string().trim().min(1).max(80),
  baseModelNumber: z.string().trim().min(1).max(80),
  releaseDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '출시일은 YYYY-MM-DD 형식이어야 합니다.')
    .refine((d) => d >= '2022-11-01', '2022-11-01 이후 출시된 기기만 등록할 수 있습니다.'),
  launchPriceKrw: z.number().int().nonnegative().nullable(),
  storageCapacity: z.string().trim().max(50).nullable().optional(),
  connectivity: z.string().trim().max(50).nullable().optional(),
  colorName: z.string().trim().max(80).nullable().optional(),
  sourceUrl: z.string().trim().max(500).nullable().optional(),
  specs: z
    .array(
      z.object({
        specKey: specKeySchema,
        specValue: z.string().nullable(),
        numericValue: z.number().nullable().optional(),
      }),
    )
    .optional(),
});
