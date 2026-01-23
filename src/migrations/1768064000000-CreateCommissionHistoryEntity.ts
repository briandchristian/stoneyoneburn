/**
 * Migration: Create Commission History Entity
 *
 * This migration creates the commission_history table for tracking commission calculations and payments.
 * Part of Phase 3.1: Commission Configuration
 *
 * Changes:
 * - Create commission_history table
 * - Add foreign keys to order and marketplace_seller tables
 * - Add indexes for efficient queries
 * - Add check constraints for data integrity
 */

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableCheck,
} from 'typeorm';

export class CreateCommissionHistoryEntity1768064000000 implements MigrationInterface {
  name = 'CreateCommissionHistoryEntity1768064000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create commission_history table
    await queryRunner.createTable(
      new Table({
        name: 'commission_history',
        columns: [
          // Base VendureEntity columns
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
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          // Order reference
          {
            name: 'orderId',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Order ID this commission is from',
          },
          // Seller relationship
          {
            name: 'sellerId',
            type: 'int',
            isNullable: false,
            comment: 'Seller ID who owns the products in this order',
          },
          // Commission details
          {
            name: 'commissionRate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
            comment: 'Commission rate used (0.0 to 1.0, e.g., 0.15 = 15%)',
          },
          {
            name: 'orderTotal',
            type: 'int',
            isNullable: false,
            comment: 'Order total in cents',
          },
          {
            name: 'commissionAmount',
            type: 'int',
            isNullable: false,
            comment: 'Commission amount in cents',
          },
          {
            name: 'sellerPayout',
            type: 'int',
            isNullable: false,
            comment: 'Seller payout amount in cents',
          },
          // Status tracking
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'CALCULATED'",
            isNullable: false,
            comment: 'Commission status: CALCULATED, PAID, REFUNDED',
          },
        ],
      }),
      true
    );

    // Create foreign key to marketplace_seller table
    await queryRunner.createForeignKey(
      'commission_history',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'marketplace_seller',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Note: We don't create a foreign key to the order table because:
    // 1. Order IDs are stored as strings (varchar) in commission_history
    // 2. The order table uses integer IDs
    // 3. We store orderId as varchar to match Vendure's ID format
    // If needed, we can add a reference constraint later

    // Create check constraints for data integrity
    await queryRunner.createCheckConstraint(
      'commission_history',
      new TableCheck({
        name: 'CHK_commission_history_commissionRate',
        expression: '"commissionRate" >= 0 AND "commissionRate" <= 1',
      })
    );

    await queryRunner.createCheckConstraint(
      'commission_history',
      new TableCheck({
        name: 'CHK_commission_history_orderTotal',
        expression: '"orderTotal" >= 0',
      })
    );

    await queryRunner.createCheckConstraint(
      'commission_history',
      new TableCheck({
        name: 'CHK_commission_history_commissionAmount',
        expression: '"commissionAmount" >= 0',
      })
    );

    await queryRunner.createCheckConstraint(
      'commission_history',
      new TableCheck({
        name: 'CHK_commission_history_sellerPayout',
        expression: '"sellerPayout" >= 0',
      })
    );

    await queryRunner.createCheckConstraint(
      'commission_history',
      new TableCheck({
        name: 'CHK_commission_history_amounts',
        expression: '"commissionAmount" + "sellerPayout" = "orderTotal"',
      })
    );

    // Create indexes for efficient queries
    await queryRunner.createIndex(
      'commission_history',
      new TableIndex({
        name: 'IDX_commission_history_sellerId',
        columnNames: ['sellerId'],
      })
    );

    await queryRunner.createIndex(
      'commission_history',
      new TableIndex({
        name: 'IDX_commission_history_orderId',
        columnNames: ['orderId'],
      })
    );

    await queryRunner.createIndex(
      'commission_history',
      new TableIndex({
        name: 'IDX_commission_history_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'commission_history',
      new TableIndex({
        name: 'IDX_commission_history_sellerId_status',
        columnNames: ['sellerId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'commission_history',
      new TableIndex({
        name: 'IDX_commission_history_createdAt',
        columnNames: ['createdAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('commission_history', 'IDX_commission_history_createdAt');
    await queryRunner.dropIndex('commission_history', 'IDX_commission_history_sellerId_status');
    await queryRunner.dropIndex('commission_history', 'IDX_commission_history_status');
    await queryRunner.dropIndex('commission_history', 'IDX_commission_history_orderId');
    await queryRunner.dropIndex('commission_history', 'IDX_commission_history_sellerId');

    // Drop check constraints
    await queryRunner.dropCheckConstraint('commission_history', 'CHK_commission_history_amounts');
    await queryRunner.dropCheckConstraint(
      'commission_history',
      'CHK_commission_history_sellerPayout'
    );
    await queryRunner.dropCheckConstraint(
      'commission_history',
      'CHK_commission_history_commissionAmount'
    );
    await queryRunner.dropCheckConstraint(
      'commission_history',
      'CHK_commission_history_orderTotal'
    );
    await queryRunner.dropCheckConstraint(
      'commission_history',
      'CHK_commission_history_commissionRate'
    );

    // Drop foreign key
    const table = await queryRunner.getTable('commission_history');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('sellerId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('commission_history', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('commission_history');
  }
}
