/**
 * Marketplace Shipping Eligibility Checker
 *
 * Phase 5.4: Multi-vendor shipping
 * Filters ShippingMethods based on OrderLine.sellerChannelId.
 * A method is eligible if it's assigned to a channel that matches at least one order line.
 *
 * For methods in default channel only: eligible when at least one line has sellerChannelId = default.
 * For methods in seller channels: eligible when at least one line has matching sellerChannelId.
 *
 * @see https://docs.vendure.io/guides/how-to/multi-vendor-marketplaces/
 */

import { ShippingEligibilityChecker, LanguageCode } from '@vendure/core';

export const marketplaceShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: 'marketplace-seller-channel-eligibility-checker',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Eligible when shipping method is in a channel that matches at least one order line',
    },
  ],
  args: {},
  check: async (ctx, order, _args, method) => {
    // Method must have channels - if not loaded, allow (backward compat)
    const channels = (method as { channels?: { id: number; code: string }[] }).channels;
    if (!channels || channels.length === 0) {
      return true;
    }

    const defaultChannelId = ctx.channelId;
    const lineChannelIds = new Set<number>();
    for (const line of order.lines) {
      const chId = line.sellerChannelId ?? defaultChannelId;
      if (chId != null) {
        lineChannelIds.add(typeof chId === 'string' ? parseInt(chId, 10) : chId);
      }
    }

    for (const ch of channels) {
      const chId = typeof ch.id === 'string' ? parseInt(ch.id, 10) : ch.id;
      if (lineChannelIds.has(chId)) {
        return true;
      }
    }

    return false;
  },
});
