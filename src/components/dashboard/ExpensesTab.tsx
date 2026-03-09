import { TrendingDown, Receipt, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { formatCurrencyARS } from '../../shared/format/currency';
import type { DashboardMetrics } from './useDashboardMetrics';

const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

interface ExpensesTabProps {
  metrics: DashboardMetrics;
  filterLabel: string;
}

export function ExpensesTab({ metrics, filterLabel }: ExpensesTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">{formatCurrencyARS(metrics.totalCashOut)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.cashOutTransactions.length} transaction{metrics.cashOutTransactions.length !== 1 ? 's' : ''} for {filterLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Top Expense Category</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metrics.topExpenseCategory ? (
              <>
                <div className="text-2xl">{metrics.topExpenseCategory.category}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrencyARS(metrics.topExpenseCategory.amount)}
                </p>
              </>
            ) : (
              <div className="text-2xl text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Avg per Transaction</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {formatCurrencyARS(
                metrics.cashOutTransactions.length > 0
                  ? metrics.totalCashOut / metrics.cashOutTransactions.length
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per cash-out transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Table */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Cash out breakdown for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.expenseCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.expenseCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrencyARS(v)} />
                  <YAxis type="category" dataKey="category" width={100} />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyARS(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Cash Outs</CardTitle>
            <CardDescription>Latest expense transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.cashOutTransactions.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...metrics.cashOutTransactions]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">
                            <div>{t.description}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM dd, yyyy')}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{formatCurrencyARS(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense transactions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
