/**
 * Migration: Create Review Entity
 *
 * This migration creates the review table for product reviews and ratings.
 * Part of Phase 4: Reviews & Ratings System
 *
 * Changes:
 * - Create review table
 * - Add foreign key to marketplace_seller table
 * - Add indexes for efficient queries (unique constraint on productId + customerId)
 * - Add check constraints for data integrity (rating 1-5)
 */

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableCheck,
  TableUnique,
} from 'typeorm';

export class CreateReviewEntity1769523464000 implements MigrationInterface {
  name = 'CreateReviewEntity1769523464000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create review table
    await queryRunner.createTable(
      new Table({
        name: 'review',
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
          // Product reference
          {
            name: 'productId',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Product ID this review is for',
          },
          // Customer reference
          {
            name: 'customerId',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Customer ID who wrote the review',
          },
          // Seller relationship
          {
            name: 'sellerId',
            type: 'int',
            isNullable: false,
            comment: 'Seller ID (for rating aggregation)',
          },
          // Review content
          {
            name: 'rating',
            type: 'int',
            isNullable: false,
            comment: 'Rating (1-5 stars)',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
            comment: 'Review title',
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
            comment: 'Review body text',
          },
          // Moderation
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
            isNullable: false,
            comment: 'Moderation status: PENDING, APPROVED, REJECTED',
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Whether this is a verified purchase review',
          },
          {
            name: 'helpfulCount',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Number of helpful votes',
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true,
            comment: 'Rejection reason (if status is REJECTED)',
          },
        ],
      }),
      true
    );

    // Create foreign key to marketplace_seller table
    await queryRunner.createForeignKey(
      'review',
      new TableForeignKey({
        columnNames: ['sellerId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'marketplace_seller',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      })
    );

    // Note: We don't create foreign keys to product or customer tables because:
    // 1. Product IDs and Customer IDs are stored as strings (varchar) in review table
    // 2. The product and customer tables use integer IDs or different ID formats
    // 3. We store IDs as varchar to match Vendure's ID format
    // If needed, we can add reference constraints later

    // Create unique constraint: One review per customer per product
    await queryRunner.createUniqueConstraint(
      'review',
      new TableUnique({
        name: 'UQ_review_productId_customerId',
        columnNames: ['productId', 'customerId'],
      })
    );

    // Create check constraints for data integrity
    await queryRunner.createCheckConstraint(
      'review',
      new TableCheck({
        name: 'CHK_review_rating',
        expression: '"rating" >= 1 AND "rating" <= 5',
      })
    );

    await queryRunner.createCheckConstraint(
      'review',
      new TableCheck({
        name: 'CHK_review_helpfulCount',
        expression: '"helpfulCount" >= 0',
      })
    );

    // Create indexes for efficient queries
    // Index for seller rating aggregation
    await queryRunner.createIndex(
      'review',
      new TableIndex({
        name: 'IDX_review_sellerId_status',
        columnNames: ['sellerId', 'status'],
      })
    );

    // Index for product review display
    await queryRunner.createIndex(
      'review',
      new TableIndex({
        name: 'IDX_review_productId_status',
        columnNames: ['productId', 'status'],
      })
    );

    // Index for customer reviews lookup
    await queryRunner.createIndex(
      'review',
      new TableIndex({
        name: 'IDX_review_customerId',
        columnNames: ['customerId'],
      })
    );

    // Index for created date (for sorting)
    await queryRunner.createIndex(
      'review',
      new TableIndex({
        name: 'IDX_review_createdAt',
        columnNames: ['createdAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('review', 'IDX_review_createdAt');
    await queryRunner.dropIndex('review', 'IDX_review_customerId');
    await queryRunner.dropIndex('review', 'IDX_review_productId_status');
    await queryRunner.dropIndex('review', 'IDX_review_sellerId_status');

    // Drop check constraints
    await queryRunner.dropCheckConstraint('review', 'CHK_review_helpfulCount');
    await queryRunner.dropCheckConstraint('review', 'CHK_review_rating');

    // Drop unique constraint
    await queryRunner.dropUniqueConstraint('review', 'UQ_review_productId_customerId');

    // Drop foreign key
    const table = await queryRunner.getTable('review');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('sellerId') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('review', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('review');
  }
}
