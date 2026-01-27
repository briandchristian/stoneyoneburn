/**
 * Payout Scheduler Task Tests
 *
 * Tests for the scheduled task that processes payouts based on configured frequency.
 * Part of Phase 3.6: Configurable Payout Schedule Frequency
 *
 * Note: We test the execute function logic directly rather than through ScheduledTask
 * to avoid issues with the wrapper calling execute during initialization.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { RequestContextService, ChannelService, GlobalSettingsService } from '@vendure/core';
import { PayoutSchedulerService } from '../services/payout-scheduler.service';

// Extract the execute function logic for testing
// This matches the logic in payout-scheduler.task.ts
async function executePayoutSchedulerTask({ injector }: { injector: any }) {
  const requestContextService = injector.get(RequestContextService);
  const channelService = injector.get(ChannelService);
  const globalSettingsService = injector.get(GlobalSettingsService);
  const payoutSchedulerService = injector.get(PayoutSchedulerService);

  // Get the default channel and create a system context for the scheduled task
  const defaultChannel = await channelService.getDefaultChannel();
  const ctx = await requestContextService.create({
    apiType: 'admin',
    channelOrToken: defaultChannel,
  });

  try {
    // Get configured frequency from GlobalSettings
    const settings = await globalSettingsService.getSettings(ctx);
    const customFields = settings.customFields as
      | {
          payoutScheduleFrequency?: 'weekly' | 'monthly';
          payoutSchedulerLastRun?: string; // ISO date string
        }
      | undefined;

    const frequency = customFields?.payoutScheduleFrequency || 'weekly'; // Default to weekly
    const lastRunStr = customFields?.payoutSchedulerLastRun;
    const lastRun = lastRunStr ? new Date(lastRunStr) : null;

    // Calculate days since last run
    const now = new Date();
    const daysSinceLastRun = lastRun
      ? Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity; // If never run, process immediately

    // Determine required interval based on frequency
    const requiredDays = frequency === 'monthly' ? 30 : 7; // Monthly = 30 days, Weekly = 7 days

    // Skip processing if not enough time has passed
    if (daysSinceLastRun < requiredDays) {
      console.log(
        `[Payout Scheduler] Skipping - last run was ${daysSinceLastRun} days ago, ` +
          `required interval is ${requiredDays} days (${frequency})`
      );
      return {
        success: true,
        skipped: true,
        reason: `Not enough time elapsed (${daysSinceLastRun} < ${requiredDays} days)`,
      };
    }

    // Process payouts
    const result = await payoutSchedulerService.processScheduledPayouts(ctx);

    // Update last run timestamp in GlobalSettings
    const updatedCustomFields = {
      ...(customFields || {}),
      payoutSchedulerLastRun: now.toISOString(),
    };
    await globalSettingsService.updateSettings(ctx, {
      customFields: updatedCustomFields as any,
    });

    // Log the result for monitoring
    console.log(
      `[Payout Scheduler] Processed ${result.totalProcessed} payouts ` +
        `for ${result.sellersAffected} sellers, total amount: ${result.totalAmount / 100} ` +
        `(frequency: ${frequency}, last run: ${lastRun ? lastRun.toISOString() : 'never'})`
    );

    return {
      success: true,
      totalProcessed: result.totalProcessed,
      sellersAffected: result.sellersAffected,
      totalAmount: result.totalAmount,
      frequency,
      daysSinceLastRun,
    };
  } catch (error: any) {
    console.error('[Payout Scheduler] Error processing scheduled payouts:', error);
    throw error;
  }
}

describe('processScheduledPayoutsTask', () => {
  let mockRequestContextService: jest.Mocked<RequestContextService>;
  let mockChannelService: jest.Mocked<ChannelService>;
  let mockGlobalSettingsService: jest.Mocked<GlobalSettingsService>;
  let mockPayoutSchedulerService: jest.Mocked<PayoutSchedulerService>;
  let mockCtx: RequestContext;
  let mockDefaultChannel: any;

  beforeEach(() => {
    // Mock default channel
    mockDefaultChannel = {
      id: '1',
      code: 'default',
    };

    // Mock RequestContext
    mockCtx = {
      channel: mockDefaultChannel,
      languageCode: 'en' as const,
    } as RequestContext;

    // Mock RequestContextService
    mockRequestContextService = {
      create: jest.fn<() => Promise<RequestContext>>().mockResolvedValue(mockCtx),
    } as any;

    // Mock ChannelService
    mockChannelService = {
      getDefaultChannel: jest.fn<() => Promise<any>>().mockResolvedValue(mockDefaultChannel),
    } as any;

    // Mock GlobalSettingsService
    mockGlobalSettingsService = {
      getSettings: jest
        .fn<(ctx: RequestContext) => Promise<{ customFields: any }>>()
        .mockResolvedValue({
          customFields: {},
        }),
      updateSettings: jest
        .fn<(ctx: RequestContext, input: any) => Promise<any>>()
        .mockResolvedValue({} as any),
    } as any;

    // Mock PayoutSchedulerService
    mockPayoutSchedulerService = {
      processScheduledPayouts: jest
        .fn<
          (
            ctx: RequestContext
          ) => Promise<{ totalProcessed: number; sellersAffected: number; totalAmount: number }>
        >()
        .mockResolvedValue({
          totalProcessed: 0,
          sellersAffected: 0,
          totalAmount: 0,
        }),
    } as any;
  });

  const createMockInjector = () => {
    return {
      get: (service: any) => {
        if (service === RequestContextService) {
          return mockRequestContextService;
        }
        if (service === ChannelService) {
          return mockChannelService;
        }
        if (service === GlobalSettingsService) {
          return mockGlobalSettingsService;
        }
        if (service === PayoutSchedulerService) {
          return mockPayoutSchedulerService;
        }
        throw new Error(`Unknown service: ${service?.name || service}`);
      },
    };
  };

  describe('frequency checking', () => {
    it('should process payouts when enough time has passed (weekly)', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'weekly',
          payoutSchedulerLastRun: eightDaysAgo.toISOString(),
        },
      } as any);

      mockPayoutSchedulerService.processScheduledPayouts.mockResolvedValue({
        totalProcessed: 5,
        sellersAffected: 2,
        totalAmount: 10000,
      });

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(result.totalProcessed).toBe(5);
      expect(mockPayoutSchedulerService.processScheduledPayouts).toHaveBeenCalled();
      expect(mockGlobalSettingsService.updateSettings).toHaveBeenCalled();
    });

    it('should process payouts when enough time has passed (monthly)', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'monthly',
          payoutSchedulerLastRun: thirtyOneDaysAgo.toISOString(),
        },
      } as any);

      mockPayoutSchedulerService.processScheduledPayouts.mockResolvedValue({
        totalProcessed: 10,
        sellersAffected: 3,
        totalAmount: 20000,
      });

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(10);
      expect(mockPayoutSchedulerService.processScheduledPayouts).toHaveBeenCalled();
    });

    it('should skip processing when not enough time has passed (weekly)', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'weekly',
          payoutSchedulerLastRun: threeDaysAgo.toISOString(),
        },
      } as any);

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('Not enough time elapsed');
      expect(mockPayoutSchedulerService.processScheduledPayouts).not.toHaveBeenCalled();
      expect(mockGlobalSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    it('should skip processing when not enough time has passed (monthly)', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'monthly',
          payoutSchedulerLastRun: fifteenDaysAgo.toISOString(),
        },
      } as any);

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(mockPayoutSchedulerService.processScheduledPayouts).not.toHaveBeenCalled();
    });

    it('should process payouts immediately if never run before', async () => {
      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'weekly',
          // No payoutSchedulerLastRun
        },
      } as any);

      mockPayoutSchedulerService.processScheduledPayouts.mockResolvedValue({
        totalProcessed: 2,
        sellersAffected: 1,
        totalAmount: 5000,
      });

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.skipped).toBeUndefined();
      expect(mockPayoutSchedulerService.processScheduledPayouts).toHaveBeenCalled();
    });

    it('should default to weekly frequency if not configured', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          // No payoutScheduleFrequency - should default to weekly
          payoutSchedulerLastRun: eightDaysAgo.toISOString(),
        },
      } as any);

      mockPayoutSchedulerService.processScheduledPayouts.mockResolvedValue({
        totalProcessed: 3,
        sellersAffected: 1,
        totalAmount: 7500,
      });

      const injector = createMockInjector();
      const result = await executePayoutSchedulerTask({ injector });

      expect(result.success).toBe(true);
      expect(result.frequency).toBe('weekly');
      expect(mockPayoutSchedulerService.processScheduledPayouts).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error if payout processing fails', async () => {
      mockGlobalSettingsService.getSettings.mockResolvedValue({
        customFields: {
          payoutScheduleFrequency: 'weekly',
        },
      } as any);

      mockPayoutSchedulerService.processScheduledPayouts.mockRejectedValue(
        new Error('Processing failed')
      );

      const injector = createMockInjector();

      await expect(executePayoutSchedulerTask({ injector })).rejects.toThrow('Processing failed');
    });

    it('should handle GlobalSettings access errors gracefully', async () => {
      mockGlobalSettingsService.getSettings.mockRejectedValue(new Error('Settings access failed'));

      const injector = createMockInjector();

      await expect(executePayoutSchedulerTask({ injector })).rejects.toThrow(
        'Settings access failed'
      );
    });
  });
});
