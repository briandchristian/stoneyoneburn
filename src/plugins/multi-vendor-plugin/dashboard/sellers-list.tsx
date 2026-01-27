/**
 * Marketplace Sellers list page for the dashboard extension.
 * Lists all marketplace sellers with pagination and links to detail view.
 */

import { Badge, DetailPageButton, ListPage } from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import type { AnyRoute } from '@tanstack/react-router';
import { marketplaceSellersListDocument } from './marketplace-sellers.graphql';

const VERIFICATION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
  SUSPENDED: 'outline',
};

type SellerRow = {
  id: string;
  shopName: string;
  shopSlug: string;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
};

export function SellersList({ route }: { route: AnyRoute }) {
  return (
    <ListPage
      pageId="marketplace-sellers-list"
      title={<Trans>Marketplace Sellers</Trans>}
      listQuery={marketplaceSellersListDocument as any}
      route={route}
      transformVariables={(variables) => ({
        skip: (variables?.options as { skip?: number })?.skip ?? 0,
        take: (variables?.options as { take?: number })?.take ?? 25,
      })}
      customizeColumns={{
        verificationStatus: {
          header: () => <Trans>Status</Trans>,
          cell: ({ row }) => {
            const status = (row.original as SellerRow).verificationStatus;
            return <Badge variant={VERIFICATION_COLORS[status] ?? 'outline'}>{status}</Badge>;
          },
        },
        isActive: {
          header: () => <Trans>Active</Trans>,
          cell: ({ row }) =>
            (row.original as SellerRow).isActive ? <Trans>Yes</Trans> : <Trans>No</Trans>,
        },
      }}
      additionalColumns={
        {
          shopName: {
            id: 'shopName',
            meta: { dependencies: ['id', 'shopName'] },
            header: () => <Trans>Shop</Trans>,
            cell: ({ row }) => {
              const r = row.original as SellerRow;
              return <DetailPageButton id={r.id} label={r.shopName} />;
            },
          },
        } as any
      }
      defaultColumnOrder={['shopName', 'shopSlug', 'verificationStatus', 'isActive', 'createdAt']}
      defaultVisibility={{
        shopName: true,
        shopSlug: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
      }}
    />
  );
}
