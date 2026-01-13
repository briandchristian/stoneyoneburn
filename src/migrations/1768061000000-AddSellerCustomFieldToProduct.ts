/**
 * Migration: Add Seller Custom Field to Product
 *
 * This migration adds a seller custom field to the Product entity,
 * enabling products to be associated with marketplace sellers.
 *
 * Part of Phase 2.3: Seller-Product Association
 *
 * Changes:
 * - Add customFieldsSellerid column to product table
 * - Add workaround column for relational custom fields
 * - Create foreign key constraint to marketplace_seller table
 * - Add index on sellerId for efficient seller product queries
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerCustomFieldToProduct1768061000000 implements MigrationInterface {
  name = 'AddSellerCustomFieldToProduct1768061000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add seller custom field column to product table
    // Vendure uses camelCase naming: seller -> customFieldsSellerid
    await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsSellerid" integer`, undefined);

    // Add workaround column for relational custom fields
    // This is a Vendure requirement when only relational custom fields are defined
    await queryRunner.query(
      `ALTER TABLE "product" ADD "customFields__fix_relational_custom_fields__" boolean`,
      undefined
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "product"."customFields__fix_relational_custom_fields__" IS 'A work-around needed when only relational custom fields are defined on an entity'`,
      undefined
    );

    // Create foreign key constraint to marketplace_seller table
    // ON DELETE RESTRICT: Prevent deletion of seller if they have products
    // ON UPDATE CASCADE: If seller ID changes, update product references
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_product_customFieldsSellerid" FOREIGN KEY ("customFieldsSellerid") REFERENCES "marketplace_seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      undefined
    );

    // Add index on sellerId for efficient seller product queries
    // This improves performance when filtering products by seller
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_product_customFieldsSellerid" ON "product" ("customFieldsSellerid")`,
      undefined
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_customFieldsSellerid"`, undefined);

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT IF EXISTS "FK_product_customFieldsSellerid"`,
      undefined
    );

    // Drop workaround column
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "customFields__fix_relational_custom_fields__"`,
      undefined
    );

    // Drop seller custom field column
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "customFieldsSellerid"`,
      undefined
    );
  }
}
