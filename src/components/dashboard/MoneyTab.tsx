import { TrendingUp, TrendingDown, Landmark, Users, CreditCard, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Separator } from '../ui/separator';
import { format } from 'date-fns';
import { formatCurrencyARS } from '../../shared/format/currency';
import type { DashboardMetrics } from './useDashboardMetrics';
import type { DashboardOwner } from '../../features/dashboard/useDashboardData';

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
}

export function MoneyTab({ metrics, filterLabel, owners }: MoneyTabProps) {
  const ownerCount = owners.length;
  const perOwner = ownerCount > 0 ? metrics.totalBalance / ownerCount : 0;

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
            <p className="text-xs text-muted-foreground mt-1">cash drawer expenses</p>
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
            <CardTitle className="text-sm">Per Owner Share</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-emerald-700 dark:text-emerald-400">{formatCurrencyARS(perOwner)}</div>
            <p className="text-xs text-muted-foreground mt-1">{ownerCount} owner{ownerCount !== 1 ? 's' : ''} — equal split</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance by Payment Method */}
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
                <TableHead className="text-right">Vault Transfers</TableHead>
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
                      {m.isCash && <Badge variant="outline" className="text-xs">Cash</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">{formatCurrencyARS(m.income)}</TableCell>
                  <TableCell className="text-right">
                    {m.isCash
                      ? <span className="text-blue-600">{formatCurrencyARS(m.vaultTransfers)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
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
                <TableCell className="text-right text-blue-600">{formatCurrencyARS(metrics.totalVaultCash)}</TableCell>
                <TableCell className="text-right text-red-600">-{formatCurrencyARS(metrics.totalExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrencyARS(metrics.totalBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vault Transfers + Owner Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
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

        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Owner Distribution
            </CardTitle>
            <CardDescription>Equal split of available funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span>{formatCurrencyARS(metrics.totalBalance)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Number of Owners</span>
                <Badge variant="secondary">{ownerCount}</Badge>
              </div>
              <Separator />
              <div className="space-y-3">
                {owners.map(owner => (
                  <div key={owner.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm">
                        {(owner.full_name || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm">{owner.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Owner</p>
                      </div>
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400">{formatCurrencyARS(perOwner)}</span>
                  </div>
                ))}
              </div>
              {ownerCount > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm text-muted-foreground">Remaining after distribution</span>
                    <span className="text-sm">{formatCurrencyARS(metrics.totalBalance - perOwner * ownerCount)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
