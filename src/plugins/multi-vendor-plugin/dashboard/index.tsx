/**
 * Multi-Vendor Dashboard Extension
 *
 * Adds Marketplace UI to the Vendure admin dashboard:
 * - "Marketplace" nav: Sellers list/detail, Pending Payouts
 * - Seller list: paginated table; detail: stats, products, orders, verification, commission
 * - Pending Payouts: approve/reject (Phase 3.3)
 *
 * Phase 2.4 + Phase 3
 */

import { defineDashboardExtension } from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import { Store } from 'lucide-react';
import { SellersList } from './sellers-list';
import { SellerDetail } from './seller-detail';
import { PendingPayouts } from './pending-payouts';

defineDashboardExtension({
  navSections: [
    {
      id: 'marketplace',
      title: 'Marketplace',
      icon: Store,
      order: 350,
      placement: 'top',
    },
  ],
  routes: [
    {
      path: '/marketplace-sellers',
      component: (route) => <SellersList route={route} />,
      navMenuItem: {
        sectionId: 'marketplace',
        id: 'marketplace-sellers',
        title: 'Sellers',
        url: '/marketplace-sellers',
        order: 100,
        requiresPermission: ['ReadCatalog', 'ReadOrder'],
      },
      loader: () => ({ breadcrumb: () => <Trans>Marketplace Sellers</Trans> }),
    },
    {
      path: '/marketplace-sellers/$sellerId',
      component: () => <SellerDetail />,
    },
    {
      path: '/marketplace-payouts',
      component: () => <PendingPayouts />,
      navMenuItem: {
        sectionId: 'marketplace',
        id: 'marketplace-payouts',
        title: 'Pending Payouts',
        url: '/marketplace-payouts',
        order: 110,
        requiresPermission: ['ReadOrder', 'ReadPaymentMethod'],
      },
      loader: () => ({ breadcrumb: () => <Trans>Pending Payouts</Trans> }),
    },
  ],
});
