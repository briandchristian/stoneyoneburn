import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add unique constraint on product_variant.sku
 *
 * This migration adds a unique index on the SKU column to prevent duplicate SKUs,
 * which can cause issues when creating new product variants. The constraint
 * only applies to non-deleted variants (soft-deleted variants can keep their SKU).
 */
export class AddUniqueSkuConstraint1735430400000 implements MigrationInterface {
  name = 'AddUniqueSkuConstraint1735430400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check for and fix any duplicate SKUs before creating the unique constraint
    // This prevents the migration from failing if duplicates exist
    const duplicates = await queryRunner.query(`
      SELECT sku, array_agg(id ORDER BY "createdAt" DESC) as variant_ids
      FROM product_variant
      WHERE "deletedAt" IS NULL
      GROUP BY sku
      HAVING COUNT(*) > 1;
    `);

    if (duplicates.length > 0) {
      console.log(
        `⚠️  Found ${duplicates.length} duplicate SKU(s). Fixing before creating unique constraint...`
      );

      for (const dup of duplicates) {
        const variantIds = dup.variant_ids;
        // Keep the most recently created (variantIds[0]) - not used but kept for clarity
        const _keepId = variantIds[0];
        const fixIds = variantIds.slice(1); // Fix the others

        for (let i = 0; i < fixIds.length; i++) {
          const variantId = fixIds[i];
          const newSku = `${dup.sku}-${variantId}`;

          // Check if new SKU already exists
          const existing = await queryRunner.query(
            'SELECT id FROM product_variant WHERE sku = $1 AND "deletedAt" IS NULL',
            [newSku]
          );

          if (existing.length > 0) {
            // Use timestamp-based suffix if SKU exists
            const timestampSku = `${dup.sku}-${Date.now()}-${variantId}`;
            await queryRunner.query(
              'UPDATE product_variant SET sku = $1, "updatedAt" = NOW() WHERE id = $2',
              [timestampSku, variantId]
            );
            console.log(`   ✅ Fixed variant ${variantId}: "${dup.sku}" → "${timestampSku}"`);
          } else {
            await queryRunner.query(
              'UPDATE product_variant SET sku = $1, "updatedAt" = NOW() WHERE id = $2',
              [newSku, variantId]
            );
            console.log(`   ✅ Fixed variant ${variantId}: "${dup.sku}" → "${newSku}"`);
          }
        }
      }
    }

    // Verify no duplicates remain before creating the constraint
    const remainingDuplicates = await queryRunner.query(`
      SELECT sku, COUNT(*) as count
      FROM product_variant
      WHERE "deletedAt" IS NULL
      GROUP BY sku
      HAVING COUNT(*) > 1;
    `);

    if (remainingDuplicates.length > 0) {
      throw new Error(
        `Cannot create unique constraint: ${remainingDuplicates.length} duplicate SKU(s) still exist. ` +
          `Please fix duplicates manually before running this migration. ` +
          `Duplicates: ${remainingDuplicates.map((d: { sku: string; count: number }) => d.sku).join(', ')}`
      );
    }

    // Create unique index on SKU, excluding soft-deleted variants
    // This allows soft-deleted variants to keep their SKU while preventing
    // active variants from having duplicate SKUs
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_variant_sku_unique" 
      ON "product_variant" (sku) 
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_product_variant_sku_unique";
    `);
  }
}
