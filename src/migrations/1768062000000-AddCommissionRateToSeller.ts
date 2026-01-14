/**
 * Migration: Add Commission Rate to Seller
 *
 * This migration adds a commissionRate column to the marketplace_seller table,
 * enabling per-seller commission rate configuration.
 *
 * Part of Phase 3.1: Commission Configuration
 *
 * Changes:
 * - Add commissionRate column to marketplace_seller table (nullable float)
 * - Allows per-seller commission rates (0.0 to 1.0, e.g., 0.15 = 15%)
 * - If null, uses the default commission rate from CommissionService
 */

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCommissionRateToSeller1768062000000 implements MigrationInterface {
  name = 'AddCommissionRateToSeller1768062000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add commissionRate column to marketplace_seller table
    // Type: float (nullable) - allows per-seller rates or null for default
    // Range: 0.0 to 1.0 (0% to 100%)
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'commissionRate',
        type: 'float',
        isNullable: true,
        default: null,
      })
    );

    // Add comment explaining the column
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace_seller"."commissionRate" IS 'Commission rate for this seller (0.0 to 1.0, e.g., 0.15 = 15%). If null, uses default commission rate.'`,
      undefined
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove commissionRate column
    await queryRunner.dropColumn('marketplace_seller', 'commissionRate');
  }
}
