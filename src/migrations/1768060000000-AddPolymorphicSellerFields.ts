/**
 * Migration: Add Polymorphic Seller Fields
 *
 * This migration adds fields for polymorphic seller types (IndividualSeller & CompanySeller)
 * to the existing marketplace_seller table using Single Table Inheritance (STI).
 *
 * Changes:
 * - Add sellerType discriminator column (required for STI)
 * - Add name field (mapped from shopName for compatibility)
 * - Add email field (required for base interface)
 * - Add IndividualSeller fields: firstName, lastName, birthDate
 * - Add CompanySeller fields: companyName, vatNumber, legalForm
 * - Migrate existing data (set sellerType based on businessName)
 * - Keep existing fields for backward compatibility during transition
 *
 * Part of Phase 2.3: Polymorphic Seller Types
 */

import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddPolymorphicSellerFields1768060000000 implements MigrationInterface {
  name = 'AddPolymorphicSellerFields1768060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sellerType discriminator column (required for TypeORM STI)
    // First add as nullable, then set default and make required
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'sellerType',
        type: 'varchar',
        length: '20',
        isNullable: true, // Temporarily nullable for existing rows
        comment: 'Discriminator for Single Table Inheritance: INDIVIDUAL or COMPANY',
      })
    );

    // Set default value for existing rows
    await queryRunner.query(`
      UPDATE "marketplace_seller"
      SET "sellerType" = 'INDIVIDUAL'
      WHERE "sellerType" IS NULL
    `);

    // Now set default and make required
    await queryRunner.query(`
      ALTER TABLE "marketplace_seller"
      ALTER COLUMN "sellerType" SET DEFAULT 'INDIVIDUAL',
      ALTER COLUMN "sellerType" SET NOT NULL
    `);

    // Add name field (for polymorphic base interface)
    // Use shopName as default value for existing rows
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'name',
        type: 'varchar',
        length: '100',
        isNullable: true, // Temporarily nullable to allow data migration
        comment: 'Display name for seller (mapped from shopName)',
      })
    );

    // Add email field (required for polymorphic base interface)
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        length: '200',
        isNullable: true, // Temporarily nullable to allow data migration
        comment: 'Email address of seller (from associated customer)',
      })
    );

    // Add IndividualSeller fields
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'firstName',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'First name of individual seller',
      })
    );

    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'lastName',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'Last name of individual seller',
      })
    );

    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'birthDate',
        type: 'date',
        isNullable: true,
        comment: 'Date of birth for individual seller',
      })
    );

    // Add CompanySeller fields
    // Note: companyName can be mapped from existing businessName field
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'companyName',
        type: 'varchar',
        length: '200',
        isNullable: true,
        comment: 'Legal registered name of company seller',
      })
    );

    // Note: vatNumber can be mapped from existing taxId field (if it's a VAT number)
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'vatNumber',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'VAT or Tax Identification Number for company seller',
      })
    );

    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'legalForm',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: 'Legal form of company (LLC, INC, Corporation, etc.)',
      })
    );

    // Migrate existing data
    // Set sellerType based on whether businessName exists (business = COMPANY, otherwise INDIVIDUAL)
    await queryRunner.query(`
      UPDATE "marketplace_seller"
      SET 
        "sellerType" = CASE 
          WHEN "businessName" IS NOT NULL AND LENGTH("businessName") > 0 THEN 'COMPANY'
          ELSE 'INDIVIDUAL'
        END,
        "name" = COALESCE("shopName", ''),
        "email" = COALESCE(
          (SELECT "emailAddress" FROM "customer" WHERE "id" = "marketplace_seller"."customerId"),
          ''
        )
    `);

    // Migrate IndividualSeller fields: try to parse firstName and lastName from shopName
    // This is a best-effort migration - in production, you might want to manually review
    await queryRunner.query(`
      UPDATE "marketplace_seller"
      SET 
        "firstName" = SPLIT_PART("shopName", ' ', 1),
        "lastName" = CASE 
          WHEN POSITION(' ' IN "shopName") > 0 THEN 
            SUBSTRING("shopName" FROM POSITION(' ' IN "shopName") + 1)
          ELSE ''
        END
      WHERE "sellerType" = 'INDIVIDUAL' AND ("firstName" IS NULL OR "lastName" IS NULL)
    `);

    // Migrate CompanySeller fields: map businessName to companyName, taxId to vatNumber
    await queryRunner.query(`
      UPDATE "marketplace_seller"
      SET 
        "companyName" = "businessName",
        "vatNumber" = "taxId"
      WHERE "sellerType" = 'COMPANY' 
        AND ("companyName" IS NULL AND "businessName" IS NOT NULL)
        AND ("vatNumber" IS NULL AND "taxId" IS NOT NULL)
    `);

    // Make name and email required after data migration
    await queryRunner.query(`
      ALTER TABLE "marketplace_seller"
      ALTER COLUMN "name" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "marketplace_seller"
      ALTER COLUMN "email" SET NOT NULL
    `);

    // Add index on sellerType for efficient filtering
    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_sellerType',
        columnNames: ['sellerType'],
      })
    );

    // Add index on firstName/lastName for IndividualSeller queries
    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_firstName_lastName',
        columnNames: ['firstName', 'lastName'],
      })
    );

    // Add index on companyName for CompanySeller queries
    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_companyName',
        columnNames: ['companyName'],
      })
    );

    // Add unique index on vatNumber for CompanySeller (if not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_marketplace_seller_vatNumber_unique"
      ON "marketplace_seller" ("vatNumber")
      WHERE "vatNumber" IS NOT NULL AND "sellerType" = 'COMPANY'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_marketplace_seller_vatNumber_unique"`);
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_companyName');
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_firstName_lastName');
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_sellerType');

    // Drop polymorphic fields
    await queryRunner.dropColumn('marketplace_seller', 'legalForm');
    await queryRunner.dropColumn('marketplace_seller', 'vatNumber');
    await queryRunner.dropColumn('marketplace_seller', 'companyName');
    await queryRunner.dropColumn('marketplace_seller', 'birthDate');
    await queryRunner.dropColumn('marketplace_seller', 'lastName');
    await queryRunner.dropColumn('marketplace_seller', 'firstName');
    await queryRunner.dropColumn('marketplace_seller', 'email');
    await queryRunner.dropColumn('marketplace_seller', 'name');
    await queryRunner.dropColumn('marketplace_seller', 'sellerType');
  }
}
