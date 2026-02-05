/**
 * Migration: Add Channel ID to MarketplaceSeller
 *
 * Phase 5.4: Channel-per-seller setup.
 * Each seller gets a dedicated Vendure Channel for order splitting.
 *
 * Changes:
 * - Add channelId column (nullable for existing sellers until backfill migration)
 * - Foreign key to channel table (ON DELETE SET NULL)
 * - Index for efficient lookups by channelId
 */

import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddChannelIdToMarketplaceSeller1769523500000 implements MigrationInterface {
  name = 'AddChannelIdToMarketplaceSeller1769523500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'marketplace_seller',
      new TableColumn({
        name: 'channelId',
        type: 'int',
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      'marketplace_seller',
      new TableForeignKey({
        name: 'FK_marketplace_seller_channelId',
        columnNames: ['channelId'],
        referencedTableName: 'channel',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_marketplace_seller_channelId" ON "marketplace_seller" ("channelId")`,
      undefined
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('marketplace_seller', 'IDX_marketplace_seller_channelId');
    const table = await queryRunner.getTable('marketplace_seller');
    const fk = table?.foreignKeys.find((k) => k.name === 'FK_marketplace_seller_channelId');
    if (fk) {
      await queryRunner.dropForeignKey('marketplace_seller', fk);
    }
    await queryRunner.dropColumn('marketplace_seller', 'channelId');
  }
}
