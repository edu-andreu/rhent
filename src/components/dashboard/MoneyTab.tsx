import { useState } from 'react';
import { TrendingUp, TrendingDown, Landmark, Users, CreditCard, ArrowRightLeft, Plus, DollarSign, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { format } from 'date-fns';
import { formatCurrencyARS } from '../../shared/format/currency';
import { postFunction, deleteFunction } from '../../shared/api/client';
import { handleApiError } from '../../shared/utils/errorHandler';
import { toast } from 'sonner@2.0.3';
import type { DashboardMetrics } from './useDashboardMetrics';
import type { DashboardOwner, DashboardPaymentMethod } from '../../features/dashboard/useDashboardData';

const METHOD_COLORS: Record<string, string> = {
  cash: '#10b981',
  transfer: '#3b82f6',
  credit_card: '#8b5cf6',
  debit_card: '#ec4899',
  digital: '#f59e0b',
};

interface MoneyTabProps {
  metrics: DashboardMetrics;
  filterLabel: string;
  owners: DashboardOwner[];
  paymentMethods: DashboardPaymentMethod[];
  onDistributionAdded?: () => void | Promise<void>;
}

export function MoneyTab({ metrics, filterLabel, owners, paymentMethods, onDistributionAdded }: MoneyTabProps) {
  const [showAddDistributionDialog, setShowAddDistributionDialog] = useState(false);
  const [ownerId, setOwnerId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [distributionDate, setDistributionDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetDistributionDialog = () => {
    setOwnerId('');
    setPaymentMethodId('');
    setAmount('');
    setDescription('');
    setDistributionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const paymentMethodsEnabled = paymentMethods.filter((pm) => pm.payment_user_enabled === 1);

  const handleSubmitDistribution = async () => {
    if (!ownerId) {
      toast.error('Please select an owner');
      return;
    }
    if (!paymentMethodId) {
      toast.error('Please select a payment method');
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await postFunction('dashboard/owner-distribution', {
        owner_id: ownerId,
        payment_method_id: paymentMethodId,
        amount: amountNum,
        description: description.trim() || undefined,
        distribution_date: new Date(distributionDate + 'T12:00:00.000Z').toISOString(),
      });
      toast.success('Owner distribution recorded');
      setShowAddDistributionDialog(false);
      resetDistributionDialog();
      await onDistributionAdded?.();
    } catch (err) {
      handleApiError(err, 'add owner distribution', 'Failed to add owner distribution');
      toast.error(err instanceof Error ? err.message : 'Failed to add owner distribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDistribution = async (id: string) => {
    if (!window.confirm('Delete this distribution? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteFunction(`dashboard/owner-distribution/${id}`);
      toast.success('Distribution deleted');
      await onDistributionAdded?.();
    } catch (err) {
      handleApiError(err, 'delete owner distribution', 'Failed to delete distribution');
      toast.error(err instanceof Error ? err.message : 'Failed to delete distribution');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-emerald-600">{formatCurrencyARS(metrics.totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">across all payment methods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{formatCurrencyARS(metrics.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">across all payment methods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Available Balance</CardTitle>
            <Landmark className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">ready to distribute</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Owner Distribution</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-6">
            <Button onClick={() => setShowAddDistributionDialog(true)} className="w-full" variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Add owner distribution
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDistributionDialog} onOpenChange={(open) => {
        if (!open) resetDistributionDialog();
        setShowAddDistributionDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add owner distribution</DialogTitle>
            <DialogDescription>Record a distribution of funds to an owner.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distribution-date">Date *</Label>
              <Input
                id="distribution-date"
                type="date"
                value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Owner *</Label>
              <Select value={ownerId || undefined} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner..." />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.full_name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment method *</Label>
              <Select value={paymentMethodId || undefined} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodsEnabled.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.payment_method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distribution-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="distribution-amount"
                  type="number"
                  step="1000"
                  className="pl-8"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distribution-description">Description (optional)</Label>
              <Textarea
                id="distribution-description"
                placeholder="Notes about this distribution..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDistributionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitDistribution} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add distribution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance by Payment Method + Cash Vault Transfers (same row) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Balance by Payment Method
            </CardTitle>
            <CardDescription>Current available funds per method for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.methodBalances.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS[m.type] || '#94a3b8' }} />
                        <span>{m.method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrencyARS(m.income)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {m.expenses > 0 ? `-${formatCurrencyARS(m.expenses)}` : formatCurrencyARS(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={m.balance < 0 ? 'text-red-600' : ''}>
                        {formatCurrencyARS(m.balance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-right text-emerald-600">{formatCurrencyARS(metrics.totalIncome)}</TableCell>
                  <TableCell className="text-right text-red-600">-{formatCurrencyARS(metrics.totalExpenses)}</TableCell>
                  <TableCell className="text-right">{formatCurrencyARS(metrics.totalBalance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Cash Vault Transfers
            </CardTitle>
            <CardDescription>Cash moved from drawers to the vault</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.filteredVaultTransfers.length > 0 ? (
              <div className="space-y-3">
                {[...metrics.filteredVaultTransfers]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(vt => (
                    <div key={vt.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <p className="text-sm">{vt.fromDrawer}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(vt.date), 'MMM dd, yyyy')} — by {vt.transferredBy}
                        </p>
                      </div>
                      <span className="text-emerald-600">+{formatCurrencyARS(vt.amount)}</span>
                    </div>
                  ))}
                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-muted-foreground">Total in vault</span>
                  <span className="text-emerald-600">{formatCurrencyARS(metrics.totalVaultCash)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No vault transfers for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Owner Distribution (alone at the end) */}
      <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Owner Distribution
            </CardTitle>
            <CardDescription>Distributions of funds to owners for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.filteredOwnerDistributions.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {[...metrics.filteredOwnerDistributions]
                      .sort((a, b) => new Date(b.distribution_date).getTime() - new Date(a.distribution_date).getTime())
                      .map((od) => (
                        <div key={od.id} className="py-2 border-b last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm">
                                {(od.owner_name || '?').charAt(0)}
                              </div>
                              <p className="text-sm font-medium">{od.owner_name || 'Unknown'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleDeleteDistribution(od.id)}
                              disabled={deletingId === od.id}
                              aria-label="Delete distribution"
                            >
                              {deletingId === od.id ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="ml-11 mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>{od.payment_method}</span>
                            <span>·</span>
                            <span>{formatCurrencyARS(od.amount)}</span>
                            <span>·</span>
                            <span>{format(new Date(od.distribution_date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  {(() => {
                    const byOwner = metrics.filteredOwnerDistributions.reduce(
                      (acc, od) => {
                        const key = od.owner_id;
                        if (!acc[key]) acc[key] = { name: od.owner_name, total: 0 };
                        acc[key].total += od.amount;
                        return acc;
                      },
                      {} as Record<string, { name: string; total: number }>
                    );
                    const ownerEntries = Object.entries(byOwner);
                    const showByOwner = ownerEntries.length > 1;
                    return showByOwner ? (
                      <>
                        <Separator />
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-medium text-muted-foreground">Total distributed by owner</p>
                          {ownerEntries.map(([ownerId, { name, total }]) => (
                            <div key={ownerId} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{name || 'Unknown'}</span>
                              <span>{formatCurrencyARS(total)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null;
                  })()}
                  <Separator />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-muted-foreground">Total distributed in period</span>
                    <span className="text-sm">
                      {formatCurrencyARS(
                        metrics.filteredOwnerDistributions.reduce((sum, od) => sum + od.amount, 0)
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <p>No distributions in this period</p>
                </div>
              )}
              {owners.length > 0 && (() => {
                const equalShare = metrics.totalBalance / owners.length;
                const distributedByOwner = metrics.filteredOwnerDistributions.reduce(
                  (acc, od) => {
                    acc[od.owner_id] = (acc[od.owner_id] || 0) + od.amount;
                    return acc;
                  },
                  {} as Record<string, number>
                );
                return (
                  <>
                    <Separator />
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-medium text-muted-foreground">Surplus / deficit by owner</p>
                      {owners.map((owner) => {
                        const totalDistributed = distributedByOwner[owner.id] ?? 0;
                        const surplusDeficit = totalDistributed - equalShare;
                        return (
                          <div key={owner.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{owner.full_name || 'Unknown'}</span>
                            <span className={surplusDeficit > 0 ? 'text-emerald-600' : surplusDeficit < 0 ? 'text-red-600' : ''}>
                              {surplusDeficit > 0 ? '+' : ''}{formatCurrencyARS(surplusDeficit)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
