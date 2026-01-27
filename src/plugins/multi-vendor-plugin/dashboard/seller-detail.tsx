/**
 * Marketplace Seller detail page for the dashboard extension.
 * Shows seller info, verification status (with update UI), stats, recent orders, and product summary.
 */

import {
  Page,
  PageBlock,
  PageLayout,
  PageTitle,
  api,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DateTime,
  Money,
  PermissionGuard,
} from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  marketplaceSellerDetailDocument,
  sellerDashboardStatsDocument,
  sellerOrderSummaryDocument,
  sellerProductSummaryDocument,
  updateSellerVerificationStatusMutationDocument,
  sellerCommissionSummaryDocument,
  commissionHistoryDocument,
} from './marketplace-sellers.graphql';

const VERIFICATION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
  SUSPENDED: 'outline',
};

const STATUS_OPTIONS = [
  { value: 'VERIFIED', label: 'Verify' },
  { value: 'REJECTED', label: 'Reject' },
  { value: 'SUSPENDED', label: 'Suspend' },
  { value: 'PENDING', label: 'Set pending' },
] as const;

export function SellerDetail() {
  const { sellerId } = useParams({ strict: false }) as { sellerId: string };
  const queryClient = useQueryClient();

  const { data: sellerData, isLoading: sellerLoading } = useQuery({
    queryKey: ['marketplaceSellerDetail', sellerId],
    queryFn: () => api.query(marketplaceSellerDetailDocument as any, { id: sellerId }),
    enabled: !!sellerId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sellerDashboardStats', sellerId],
    queryFn: () => api.query(sellerDashboardStatsDocument, { sellerId }),
    enabled: !!sellerId,
  });

  const { data: orderSummary, isLoading: ordersLoading } = useQuery({
    queryKey: ['sellerOrderSummary', sellerId],
    queryFn: () => api.query(sellerOrderSummaryDocument, { sellerId, limit: 10 }),
    enabled: !!sellerId,
  });

  const { data: productSummary, isLoading: productsLoading } = useQuery({
    queryKey: ['sellerProductSummary', sellerId],
    queryFn: () => api.query(sellerProductSummaryDocument, { sellerId }),
    enabled: !!sellerId,
  });

  const { data: commissionSummary } = useQuery({
    queryKey: ['sellerCommissionSummary', sellerId],
    queryFn: () => api.query(sellerCommissionSummaryDocument as any, { sellerId }),
    enabled: !!sellerId,
  });

  const { data: commissionHistory } = useQuery({
    queryKey: ['commissionHistory', sellerId],
    queryFn: () =>
      api.query(commissionHistoryDocument as any, {
        sellerId,
        options: { skip: 0, take: 10 },
      }),
    enabled: !!sellerId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (variables: { sellerId: string; status: string }) =>
      api.mutate(updateSellerVerificationStatusMutationDocument as any, variables),
    onSuccess: () => {
      toast.success('Verification status updated');
      queryClient.invalidateQueries({ queryKey: ['marketplaceSellerDetail', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['marketplaceSellersList'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to update verification status', { description: err.message });
    },
  });

  const seller = (sellerData as any)?.marketplaceSeller;
  const isLoading = sellerLoading || statsLoading || ordersLoading || productsLoading;

  if (!sellerId) {
    return (
      <Page>
        <PageTitle>
          <Trans>Seller not found</Trans>
        </PageTitle>
        <PageLayout>
          <PageBlock column="main">
            <p>
              <Trans>No seller ID provided.</Trans>{' '}
              <Link to="/marketplace-sellers">
                <Trans>Back to sellers</Trans>
              </Link>
            </p>
          </PageBlock>
        </PageLayout>
      </Page>
    );
  }

  return (
    <Page>
      <PageTitle>
        <Link to="/marketplace-sellers" className="text-muted-foreground hover:text-foreground">
          <Trans>Marketplace Sellers</Trans>
        </Link>
        <span className="mx-2">/</span>
        {seller?.shopName ?? sellerId}
      </PageTitle>
      <PageLayout>
        <PageBlock column="main">
          {isLoading ? (
            <p>
              <Trans>Loading...</Trans>
            </p>
          ) : !seller ? (
            <p>
              <Trans>Seller not found.</Trans>{' '}
              <Link to="/marketplace-sellers">
                <Trans>Back to sellers</Trans>
              </Link>
            </p>
          ) : (
            <div className="space-y-6">
              {/* Verification status card */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Trans>Verification</Trans>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        <Trans>Status</Trans>:
                      </span>
                      <Badge variant={VERIFICATION_COLORS[seller.verificationStatus] ?? 'outline'}>
                        {seller.verificationStatus}
                      </Badge>
                    </div>
                    <PermissionGuard requires={['UpdateAdministrator']}>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.filter((o) => o.value !== seller.verificationStatus).map(
                          (opt) => (
                            <Button
                              key={opt.value}
                              variant="outline"
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              onClick={() =>
                                updateStatusMutation.mutate({ sellerId, status: opt.value })
                              }
                            >
                              {opt.label}
                            </Button>
                          )
                        )}
                      </div>
                    </PermissionGuard>
                  </div>
                </CardContent>
              </Card>

              {commissionSummary?.sellerCommissionSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Trans>Commission</Trans>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total commissions</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          <Money
                            value={commissionSummary.sellerCommissionSummary.totalCommissions}
                          />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total payouts</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          <Money value={commissionSummary.sellerCommissionSummary.totalPayouts} />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Orders with commission</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          {commissionSummary.sellerCommissionSummary.totalOrders}
                        </p>
                      </div>
                    </div>
                    {commissionHistory?.commissionHistory?.items?.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                          <Trans>Recent commission history</Trans>
                        </p>
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="p-2 text-left font-medium">
                                  <Trans>Order</Trans>
                                </th>
                                <th className="p-2 text-right font-medium">
                                  <Trans>Rate</Trans>
                                </th>
                                <th className="p-2 text-right font-medium">
                                  <Trans>Total</Trans>
                                </th>
                                <th className="p-2 text-right font-medium">
                                  <Trans>Commission</Trans>
                                </th>
                                <th className="p-2 text-right font-medium">
                                  <Trans>Payout</Trans>
                                </th>
                                <th className="p-2 text-left font-medium">
                                  <Trans>Status</Trans>
                                </th>
                                <th className="p-2 text-left font-medium">
                                  <Trans>Date</Trans>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {commissionHistory.commissionHistory.items.map((item: any) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="p-2 font-mono">{item.orderId}</td>
                                  <td className="p-2 text-right">
                                    {Math.round((item.commissionRate ?? 0) * 100)}%
                                  </td>
                                  <td className="p-2 text-right">
                                    <Money value={item.orderTotal} />
                                  </td>
                                  <td className="p-2 text-right">
                                    <Money value={item.commissionAmount} />
                                  </td>
                                  <td className="p-2 text-right">
                                    <Money value={item.sellerPayout} />
                                  </td>
                                  <td className="p-2">
                                    <Badge variant="outline">{item.status}</Badge>
                                  </td>
                                  <td className="p-2">
                                    <DateTime value={item.createdAt} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {stats?.sellerDashboardStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Trans>Statistics</Trans>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total products</Trans>
                        </p>
                        <p className="text-2xl font-semibold">
                          {stats.sellerDashboardStats.totalProducts}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Trans>Active</Trans>: {stats.sellerDashboardStats.activeProducts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total orders</Trans>
                        </p>
                        <p className="text-2xl font-semibold">
                          {stats.sellerDashboardStats.totalOrders}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Trans>Pending</Trans>: {stats.sellerDashboardStats.pendingOrders},{' '}
                          <Trans>Completed</Trans>: {stats.sellerDashboardStats.completedOrders}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total revenue</Trans>
                        </p>
                        <p className="text-2xl font-semibold">
                          <Money value={stats.sellerDashboardStats.totalRevenue} />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Trans>Pending</Trans>:{' '}
                          <Money value={stats.sellerDashboardStats.pendingRevenue} />,{' '}
                          <Trans>Completed</Trans>:{' '}
                          <Money value={stats.sellerDashboardStats.completedRevenue} />
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Average order value</Trans>
                        </p>
                        <p className="text-2xl font-semibold">
                          <Money value={Math.round(stats.sellerDashboardStats.averageOrderValue)} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {productSummary?.sellerProductSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Trans>Products</Trans>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Total</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          {productSummary.sellerProductSummary.totalProducts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Active</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          {productSummary.sellerProductSummary.activeProducts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <Trans>Low stock</Trans>
                        </p>
                        <p className="text-xl font-semibold">
                          {productSummary.sellerProductSummary.lowStockProducts}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {orderSummary?.sellerOrderSummary &&
                orderSummary.sellerOrderSummary.recentOrders.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <Trans>Recent orders</Trans>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {orderSummary.sellerOrderSummary.recentOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between rounded-md border p-3"
                          >
                            <div>
                              <p className="font-medium">{order.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                <DateTime value={order.createdAt} />
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                <Money value={order.total} />
                              </p>
                              <p className="text-sm text-muted-foreground">{order.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
        </PageBlock>
      </PageLayout>
    </Page>
  );
}
