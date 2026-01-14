/**
 * Test Auto-Verify Plugin
 *
 * This plugin automatically verifies customer email addresses in test mode.
 * This allows integration tests to proceed without manual email verification.
 *
 * Only active when NODE_ENV=test or APP_ENV=test
 */

import {
  PluginCommonModule,
  VendurePlugin,
  OnVendureBootstrap,
  EventBus,
  CustomerService,
  TransactionalConnection,
  CustomerRegisteredEvent,
} from '@vendure/core';
import { Customer } from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CustomerService],
})
export class TestAutoVerifyPlugin implements OnVendureBootstrap {
  private isTestMode: boolean;

  constructor(
    private eventBus: EventBus,
    private customerService: CustomerService,
    private connection: TransactionalConnection
  ) {
    // Check if we're in test mode
    this.isTestMode = process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test';
  }

  async onVendureBootstrap() {
    if (!this.isTestMode) {
      // Only activate in test mode
      return;
    }

    console.log('🧪 TestAutoVerifyPlugin: Auto-verifying customer emails in test mode');

    // Listen for customer registration events
    // Vendure fires CustomerRegisteredEvent when a customer registers
    this.eventBus.ofType(CustomerRegisteredEvent).subscribe(async (event) => {
      try {
        const customer = event.entity;
        const ctx = event.ctx;

        // Get the customer with verification token
        const customerWithToken = await this.connection.getRepository(ctx, Customer).findOne({
          where: { id: customer.id },
        });

        if (customerWithToken && customerWithToken.verificationToken) {
          // Verify the customer using the verification token
          await this.customerService.verifyCustomerEmailAddress(
            ctx,
            customerWithToken.verificationToken
          );
          console.log(`✅ Auto-verified customer: ${customer.emailAddress}`);
        } else {
          console.warn(`⚠️  Customer ${customer.emailAddress} has no verification token`);
        }
      } catch (error: any) {
        // If verification fails, log but don't throw (customer might already be verified)
        const errorMsg = error.message || String(error);
        if (
          !errorMsg.includes('already verified') &&
          !errorMsg.includes('Invalid token') &&
          !errorMsg.includes('not found')
        ) {
          console.warn(
            `⚠️  Could not auto-verify customer ${event.entity.emailAddress}:`,
            errorMsg
          );
        }
      }
    });
  }
}
