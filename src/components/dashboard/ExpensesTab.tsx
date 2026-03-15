import { useState, useEffect, useCallback } from 'react';
import { TrendingDown, Receipt, Plus, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { formatCurrencyARS } from '../../shared/format/currency';
import { getFunction, postFunction } from '../../shared/api/client';
import { handleApiError } from '../../shared/utils/errorHandler';
import { toast } from 'sonner@2.0.3';
import type { DashboardMetrics } from './useDashboardMetrics';
import type { DashboardPaymentMethod } from '../../features/dashboard/useDashboardData';
import { CategoryCombobox } from '../cash-drawer/CategoryCombobox';
import type { TransactionCategory } from '../cash-drawer/useCashDrawer';

const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

interface ExpensesTabProps {
  metrics: DashboardMetrics;
  filterLabel: string;
  paymentMethods: DashboardPaymentMethod[];
  onExpenseAdded?: () => void | Promise<void>;
}

export function ExpensesTab({ metrics, filterLabel, paymentMethods, onExpenseAdded }: ExpensesTabProps) {
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await getFunction<{ categories: TransactionCategory[] }>('drawer/categories?direction=out');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching expense categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAddExpenseDialog && categories.length === 0 && !categoriesLoading) {
      fetchCategories();
    }
  }, [showAddExpenseDialog, categories.length, categoriesLoading, fetchCategories]);

  const resetDialog = useCallback(() => {
    setAmount('');
    setCategoryId('');
    setPaymentMethodId('');
    setDescription('');
  }, []);

  const createCategory = useCallback(async (name: string): Promise<TransactionCategory | null> => {
    try {
      const data = await postFunction<{ category?: TransactionCategory }>('drawer/categories', { name, direction: 'out' });
      if (data.category) {
        await fetchCategories();
        return data.category;
      }
      return null;
    } catch (err) {
      handleApiError(err, 'category creation', 'Failed to create category');
      return null;
    }
  }, [fetchCategories]);

  const handleSubmitExpense = async () => {
    if (!categoryId) {
      toast.error('Please select a category');
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
      await postFunction('dashboard/expense', {
        amount: amountNum,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        description: description.trim() || undefined,
      });
      toast.success('Expense added');
      setShowAddExpenseDialog(false);
      resetDialog();
      await onExpenseAdded?.();
    } catch (err) {
      handleApiError(err, 'add expense', 'Failed to add expense');
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

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
            <CardTitle className="text-sm">Add Expense</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-6">
            <Button onClick={() => setShowAddExpenseDialog(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add expense
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddExpenseDialog} onOpenChange={(open) => {
        if (!open) resetDialog();
        setShowAddExpenseDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Record a manual expense. It will appear in the expenses list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <CategoryCombobox
                categories={categories}
                selectedId={categoryId}
                onSelect={setCategoryId}
                onAddNew={createCategory}
                direction="out"
                disabled={categoriesLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method *</Label>
              <Select value={paymentMethodId || undefined} onValueChange={setPaymentMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter((pm) => pm.payment_user_enabled === 1)
                    .map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.payment_method}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="expense-amount"
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
              <Label htmlFor="expense-description">Description (optional)</Label>
              <Textarea
                id="expense-description"
                placeholder="Details about this expense..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpenseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitExpense} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <CardTitle>Recent Expenses</CardTitle>
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
                      <TableHead>Payment method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...metrics.cashOutTransactions]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">
                            {t.categoryName ?? t.category}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.category}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.paymentMethod ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(t.date), 'MMM dd, yyyy')}
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
