/**
 * Migration: Create Seller Payout Entity
 *
 * This migration creates the seller_payout table for tracking seller payouts from orders.
 * Part of Phase 3.2: Split Payment Processing
 *
 * Changes:
 * - Create seller_payout table
 * - Add foreign key to marketplace_seller table
 * - Add indexes for efficient queries
 * - Support escrow/holding funds until fulfillment
 */

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSellerPayoutEntity1768063000000 implements MigrationInterface {
  name = 'CreateSellerPayoutEntity1768063000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create seller_payout table
    await queryRunner.createTable(
      new Table({
        name: 'seller_payout',
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
          // Seller relationship
          {
            name: 'sellerId',
            type: 'int',
            isNullable: false,
          },
          // Order reference
          {
            name: 'orderId',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          // Payout details
          {
            name: 'amount',
            type: 'int',
            isNullable: false,
            comment: 'Payout amount in cents',
          },
          {
            name: 'commission',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Commission deducted in cents',
          },
          // Status tracking
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'HOLD'",
            isNullable: false,
            comment: 'Payout status: HOLD, PENDING, PROCESSING, COMPLETED, FAILED',
          },
          // Timestamps
          {
            name: 'releasedAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'When payout was released from HOLD',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'When payout was completed',
          },
          // Failure tracking
          {
            name: 'failureReason',
            type: 'text',
            isNullable: true,
            comment: 'Reason for failure if status is FAILED',
          },
        ],
      }),
      true
    );

    // Create foreign key to marketplace_seller table
    await queryRunner.createForeignKey(
      'seller_payout',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'marketplace_seller',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Create indexes for efficient queries
    await queryRunner.createIndex(
      'seller_payout',
      new TableIndex({
        name: 'IDX_seller_payout_sellerId',
        columnNames: ['sellerId'],
      })
    );

    await queryRunner.createIndex(
      'seller_payout',
      new TableIndex({
        name: 'IDX_seller_payout_orderId',
        columnNames: ['orderId'],
      })
    );

    await queryRunner.createIndex(
      'seller_payout',
      new TableIndex({
        name: 'IDX_seller_payout_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'seller_payout',
      new TableIndex({
        name: 'IDX_seller_payout_sellerId_status',
        columnNames: ['sellerId', 'status'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('seller_payout', 'IDX_seller_payout_sellerId_status');
    await queryRunner.dropIndex('seller_payout', 'IDX_seller_payout_status');
    await queryRunner.dropIndex('seller_payout', 'IDX_seller_payout_orderId');
    await queryRunner.dropIndex('seller_payout', 'IDX_seller_payout_sellerId');

    // Drop foreign key
    const table = await queryRunner.getTable('seller_payout');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('sellerId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('seller_payout', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('seller_payout');
  }
}
