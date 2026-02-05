/**
 * Backfill script: Create Channels for existing MarketplaceSellers (Phase 5.4)
 *
 * Run this script after deploying the channel-per-seller migration to create
 * Channels for sellers that were registered before the migration.
 *
 * Usage: npx ts-node scripts/backfill-seller-channels.ts
 *
 * Prerequisites:
 * - Database running
 * - npm run build (or run with ts-node)
 */

import {
  bootstrap,
  Product,
  TransactionalConnection,
  ChannelService,
  RequestContextService,
  LanguageCode,
} from '@vendure/core';
import { IsNull } from 'typeorm';
import { config } from '../src/vendure-config';
import { MarketplaceSeller } from '../src/plugins/multi-vendor-plugin/entities/seller.entity';

async function backfill() {
  const app = await bootstrap(config);
  const connection = app.get(TransactionalConnection);
  const channelService = app.get(ChannelService);
  const requestContextService = app.get(RequestContextService);

  const defaultCh = await channelService.getDefaultChannel();
  const ctx = await requestContextService.create({
    apiType: 'admin',
    channelOrToken: defaultCh,
  });

  const defaultChannel = await channelService.getDefaultChannel(ctx);
  const defaultChannelWithZones = await channelService.findOne(ctx, defaultChannel.id);
  if (
    !defaultChannelWithZones?.defaultTaxZone?.id ||
    !defaultChannelWithZones?.defaultShippingZone?.id
  ) {
    console.error('Default channel missing tax/shipping zones. Aborting.');
    await app.close();
    process.exit(1);
  }

  const sellerRepo = connection.getRepository(ctx, MarketplaceSeller);
  const sellers = await sellerRepo.find({ where: { channelId: IsNull() } });

  if (sellers.length === 0) {
    console.log('No sellers without channelId. Nothing to backfill.');
    await app.close();
    return;
  }

  console.log(`Found ${sellers.length} seller(s) without channelId. Creating channels...`);

  for (const seller of sellers) {
    try {
      const newChannel = await channelService.create(ctx, {
        code: `seller-${seller.id}`,
        token: `seller-${seller.id}-token`,
        defaultLanguageCode: LanguageCode.en,
        defaultTaxZoneId: defaultChannelWithZones.defaultTaxZone.id.toString(),
        defaultShippingZoneId: defaultChannelWithZones.defaultShippingZone.id.toString(),
        pricesIncludeTax: defaultChannelWithZones.pricesIncludeTax,
        defaultCurrencyCode: defaultChannelWithZones.defaultCurrencyCode,
      });

      if (newChannel && 'id' in newChannel) {
        seller.channelId = newChannel.id;
        await sellerRepo.save(seller);

        // Assign seller's products to the new channel
        const productRepo = connection.getRepository(ctx, Product);
        const products = await productRepo
          .createQueryBuilder('p')
          .where('p.customFieldsSellerid = :sellerId', { sellerId: seller.id })
          .getMany();

        for (const product of products) {
          await channelService.assignToChannels(ctx, Product, product.id, [
            defaultChannel.id,
            newChannel.id,
          ]);
        }

        console.log(
          `  Created channel ${newChannel.id} for seller ${seller.id} (${seller.shopName}), assigned ${products.length} product(s)`
        );
      }
    } catch (err) {
      console.error(`  Failed for seller ${seller.id}:`, (err as Error).message);
    }
  }

  await app.close();
  console.log('Backfill complete.');
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
