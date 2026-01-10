import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableUnique,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: Create MarketplaceSeller Entity
 *
 * This migration creates the marketplace_seller table for the multi-vendor marketplace.
 * Part of Phase 2.1: Seller Entity & Database Schema
 *
 * NOTE: Table is named marketplace_seller to avoid conflict with Vendure's built-in seller table.
 *
 * The marketplace_seller table includes:
 * - Base VendureEntity fields (id, createdAt, updatedAt)
 * - Customer relationship (foreign key)
 * - Shop information (name, slug, description)
 * - Verification status
 * - Business information (optional)
 * - Commission rate
 * - Indexes for performance
 * - Unique constraints (one seller per customer, unique shop slugs)
 * - Check constraints for data validation
 */
export class CreateMarketplaceSellerEntity1768055512210 implements MigrationInterface {
  name = 'CreateMarketplaceSellerEntity1768055512210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the marketplace_seller table
    await queryRunner.createTable(
      new Table({
        name: 'marketplace_seller',
        columns: [
          // Base VendureEntity columns
          // Note: VendureEntity extends BaseEntity which provides id, createdAt, updatedAt
          // We explicitly define them here to match Vendure's schema
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          // Customer relationship
          {
            name: 'customerId',
            type: 'int',
            isNullable: false,
          },
          // Verification status
          {
            name: 'verificationStatus',
            type: 'varchar',
            length: '20',
            isNullable: false,
            // Default will be set via ALTER TABLE after table creation to ensure correct SQL syntax
          },
          // Shop information
          {
            name: 'shopName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'shopSlug',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'shopDescription',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'shopBannerAssetId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'shopLogoAssetId',
            type: 'int',
            isNullable: true,
          },
          // Business information
          {
            name: 'businessName',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'taxId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'paymentAccountId',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          // Active status
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          // Commission rate
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 10.0,
            isNullable: false,
          },
        ],
      }),
      true // ifNotExists
    );

    // Set default value for verificationStatus using raw SQL (PostgreSQL string literal syntax)
    await queryRunner.query(`
      ALTER TABLE "marketplace_seller" 
      ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING'
    `);

    // Create indexes for performance
    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_customerId',
        columnNames: ['customerId'],
      })
    );

    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_shopSlug',
        columnNames: ['shopSlug'],
      })
    );

    await queryRunner.createIndex(
      'marketplace_seller',
      new TableIndex({
        name: 'IDX_marketplace_seller_verificationStatus',
        columnNames: ['verificationStatus'],
      })
    );

    // Create unique constraints
    await queryRunner.createUniqueConstraint(
      'marketplace_seller',
      new TableUnique({
        name: 'UQ_marketplace_seller_customerId',
        columnNames: ['customerId'],
      })
    );

    await queryRunner.createUniqueConstraint(
      'marketplace_seller',
      new TableUnique({
        name: 'UQ_marketplace_seller_shopSlug',
        columnNames: ['shopSlug'],
      })
    );

    // Create check constraints for data validation
    // Note: PostgreSQL supports check constraints, but we need to verify they work with TypeORM
    // If check constraints cause issues, we'll rely on application-level validation
    await queryRunner.query(`
      ALTER TABLE "marketplace_seller" 
      ADD CONSTRAINT "CHK_marketplace_seller_shopName" 
      CHECK ("shopName" IS NOT NULL AND LENGTH("shopName") >= 3 AND LENGTH("shopName") <= 100)
    `);

    await queryRunner.query(`
      ALTER TABLE "marketplace_seller" 
      ADD CONSTRAINT "CHK_marketplace_seller_shopSlug" 
      CHECK ("shopSlug" IS NOT NULL AND LENGTH("shopSlug") >= 3 AND LENGTH("shopSlug") <= 100)
    `);

    await queryRunner.query(`
      ALTER TABLE "marketplace_seller" 
      ADD CONSTRAINT "CHK_marketplace_seller_commissionRate" 
      CHECK ("commissionRate" >= 0 AND "commissionRate" <= 100)
    `);

    // Create foreign key to customer table
    await queryRunner.createForeignKey(
      'marketplace_seller',
      new TableForeignKey({
        name: 'FK_marketplace_seller_customerId',
        columnNames: ['customerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customer',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Create trigger for updatedAt column (PostgreSQL doesn't support ON UPDATE)
    // This ensures updatedAt is automatically updated when a row is modified
    // Note: Vendure/TypeORM typically handles updatedAt automatically via decorators,
    // but since we're creating the table manually, we add a trigger to ensure consistency
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_marketplace_seller_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_marketplace_seller_updated_at 
      BEFORE UPDATE ON "marketplace_seller"
      FOR EACH ROW
      EXECUTE FUNCTION update_marketplace_seller_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger for updatedAt
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_marketplace_seller_updated_at ON "marketplace_seller"`
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_marketplace_seller_updated_at_column()`
    );

    // Drop default value for verificationStatus
    await queryRunner.query(`
      ALTER TABLE "marketplace_seller" 
      ALTER COLUMN "verificationStatus" DROP DEFAULT
    `);

    // Drop foreign key
    const table = await queryRunner.getTable('marketplace_seller');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.name === 'FK_marketplace_seller_customerId'
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('marketplace_seller', foreignKey);
      }
    }

    // Drop check constraints
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_commissionRate"`
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_shopSlug"`
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_shopName"`
    );

    // Drop unique constraints
    await queryRunner.dropUniqueConstraint('marketplace_seller', 'UQ_marketplace_seller_shopSlug');
    await queryRunner.dropUniqueConstraint(
      'marketplace_seller',
      'UQ_marketplace_seller_customerId'
    );

    // Drop indexes
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_verificationStatus');
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_shopSlug');
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_customerId');

    // Drop table
    await queryRunner.dropTable('marketplace_seller');
  }
}
