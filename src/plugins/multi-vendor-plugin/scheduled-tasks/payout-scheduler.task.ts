/**
 * Payout Scheduler Task
 *
 * Scheduled task that automatically transitions HOLD payouts to PENDING status
 * on a configurable schedule (weekly/monthly).
 *
 * Part of Phase 3.6: Configurable Payout Schedule Frequency
 *
 * This task runs daily but only processes payouts if the configured frequency
 * interval has elapsed since the last run. This allows dynamic configuration
 * without requiring server restarts.
 */

import {
  ScheduledTask,
  RequestContextService,
  ChannelService,
  GlobalSettingsService,
} from '@vendure/core';
import { PayoutSchedulerService } from '../services/payout-scheduler.service';

/**
 * Scheduled task for processing payouts
 * Runs daily but respects the configured frequency (weekly/monthly)
 *
 * This task automatically transitions all HOLD payouts to PENDING status,
 * making them available for admin approval, based on the configured schedule.
 */
export const processScheduledPayoutsTask = new ScheduledTask({
  id: 'process-scheduled-payouts',
  description:
    'Automatically transitions HOLD payouts to PENDING status for admin approval (runs daily, respects configured frequency)',
  schedule: (cron) => cron.every(1).days(), // Run daily, but check frequency before processing
  async execute({ injector }) {
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
        ...customFields,
        payoutSchedulerLastRun: now.toISOString(),
      };
      await globalSettingsService.updateSettings(ctx, {
        customFields: updatedCustomFields as Record<string, unknown>,
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
    } catch (error: unknown) {
      console.error('[Payout Scheduler] Error processing scheduled payouts:', error);
      throw error;
    }
  },
});
