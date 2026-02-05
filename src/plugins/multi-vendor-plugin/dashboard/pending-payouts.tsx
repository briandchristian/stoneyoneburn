/**
 * Pending Payouts dashboard page (Phase 3.3).
 * Lists PENDING/PROCESSING payouts with Approve/Reject actions.
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Input,
  PermissionGuard,
} from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useState } from 'react';
import type { DocumentNode } from 'graphql';
import {
  pendingPayoutsDocument,
  approvePayoutMutationDocument,
  rejectPayoutMutationDocument,
} from './marketplace-sellers.graphql';

type PayoutRow = {
  id: string;
  sellerId: string;
  orderId: string;
  amount: number;
  commission: number;
  status: string;
  createdAt: string;
  releasedAt: string | null;
  failureReason: string | null;
};

export function PendingPayouts() {
  const queryClient = useQueryClient();
  const [rejectingPayout, setRejectingPayout] = useState<PayoutRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pendingPayouts'],
    queryFn: () => api.query(pendingPayoutsDocument as DocumentNode),
  });

  const approveMutation = useMutation({
    mutationFn: (payoutId: string) =>
      api.mutate(approvePayoutMutationDocument as DocumentNode, { payoutId }),
    onSuccess: () => {
      toast.success('Payout approved');
      queryClient.invalidateQueries({ queryKey: ['pendingPayouts'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to approve payout', { description: err.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ payoutId, reason }: { payoutId: string; reason: string }) =>
      api.mutate(rejectPayoutMutationDocument as DocumentNode, { payoutId, reason }),
    onSuccess: () => {
      toast.success('Payout rejected');
      setRejectingPayout(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['pendingPayouts'] });
    },
    onError: (err: Error) => {
      toast.error('Failed to reject payout', { description: err.message });
    },
  });

  const payouts: PayoutRow[] = (data as { pendingPayouts?: PayoutRow[] })?.pendingPayouts ?? [];

  const handleRejectSubmit = () => {
    if (!rejectingPayout || !rejectReason.trim()) return;
    rejectMutation.mutate({ payoutId: rejectingPayout.id, reason: rejectReason.trim() });
  };

  return (
    <Page>
      <PageTitle>
        <Link to="/marketplace-sellers" className="text-muted-foreground hover:text-foreground">
          <Trans>Marketplace</Trans>
        </Link>
        <span className="mx-2">/</span>
        <Trans>Pending Payouts</Trans>
      </PageTitle>
      <PageLayout>
        <PageBlock column="main">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans>Pending Payouts</Trans>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                <Trans>Approve or reject payouts in PENDING or PROCESSING status.</Trans>
              </p>
              {isLoading ? (
                <p>
                  <Trans>Loading...</Trans>
                </p>
              ) : payouts.length === 0 ? (
                <p className="text-muted-foreground">
                  <Trans>No pending payouts.</Trans>
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">
                          <Trans>Payout</Trans>
                        </th>
                        <th className="p-3 text-left font-medium">
                          <Trans>Seller</Trans>
                        </th>
                        <th className="p-3 text-left font-medium">
                          <Trans>Order</Trans>
                        </th>
                        <th className="p-3 text-right font-medium">
                          <Trans>Amount</Trans>
                        </th>
                        <th className="p-3 text-right font-medium">
                          <Trans>Commission</Trans>
                        </th>
                        <th className="p-3 text-left font-medium">
                          <Trans>Status</Trans>
                        </th>
                        <th className="p-3 text-left font-medium">
                          <Trans>Created</Trans>
                        </th>
                        <PermissionGuard requires={['UpdateOrder', 'UpdatePaymentMethod']}>
                          <th className="p-3 text-right font-medium">
                            <Trans>Actions</Trans>
                          </th>
                        </PermissionGuard>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-3 font-mono text-muted-foreground">{p.id}</td>
                          <td className="p-3">
                            <Link
                              to="/marketplace-sellers/$sellerId"
                              params={{ sellerId: p.sellerId }}
                              className="text-primary hover:underline"
                            >
                              {p.sellerId}
                            </Link>
                          </td>
                          <td className="p-3 font-mono">{p.orderId}</td>
                          <td className="p-3 text-right">
                            <Money value={p.amount} />
                          </td>
                          <td className="p-3 text-right">
                            <Money value={p.commission} />
                          </td>
                          <td className="p-3">
                            <Badge variant={p.status === 'PROCESSING' ? 'secondary' : 'outline'}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <DateTime value={p.createdAt} />
                          </td>
                          <PermissionGuard requires={['UpdateOrder', 'UpdatePaymentMethod']}>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  onClick={() => approveMutation.mutate(p.id)}
                                >
                                  <Trans>Approve</Trans>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  onClick={() => {
                                    setRejectingPayout(p);
                                    setRejectReason('');
                                  }}
                                >
                                  <Trans>Reject</Trans>
                                </Button>
                              </div>
                            </td>
                          </PermissionGuard>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </PageBlock>
      </PageLayout>

      <Dialog
        open={!!rejectingPayout}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingPayout(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Reject payout</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>Provide a reason for rejecting this payout. The seller will see this.</Trans>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="reject-reason">
                <Trans>Reason</Trans>
              </label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing documentation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingPayout(null);
                setRejectReason('');
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={handleRejectSubmit}
            >
              <Trans>Reject</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
