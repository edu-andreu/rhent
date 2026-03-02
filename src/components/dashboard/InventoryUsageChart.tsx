import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface CashCategoryItem {
  category: string;
  amount: number;
}

interface CashFlowTrendItem {
  date: string;
  cashIn: number;
  cashOut: number;
  netFlow: number;
}

interface InventoryUsageChartProps {
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  currentCashBalance: number;
  cashInCategories: CashCategoryItem[];
  cashOutCategories: CashCategoryItem[];
  cashFlowTrend: CashFlowTrendItem[];
}

export function InventoryUsageChart({
  cashIn,
  cashOut,
  netCashFlow,
  currentCashBalance,
  cashInCategories,
  cashOutCategories,
  cashFlowTrend,
}: InventoryUsageChartProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Cash In</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-green-600">${cashIn.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {cashInCategories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Cash Out</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">${cashOut.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {cashOutCategories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Net Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${netCashFlow.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current balance: ${currentCashBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow - Last 7 Days</CardTitle>
          <CardDescription>Daily cash flow performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Line type="monotone" dataKey="cashIn" stroke="#10b981" strokeWidth={2} name="Cash In" />
              <Line type="monotone" dataKey="cashOut" stroke="#ef4444" strokeWidth={2} name="Cash Out" />
              <Line type="monotone" dataKey="netFlow" stroke="#f59e0b" strokeWidth={2} name="Net Flow" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash In</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {cashInCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashInCategories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Out</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            {cashOutCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashOutCategories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="amount" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
