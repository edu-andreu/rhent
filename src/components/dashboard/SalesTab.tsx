import { DollarSign, Package, BarChart3, Clock, AlertTriangle, Calendar, Percent, Tag, Star, CreditCard, Layers, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrencyARS } from '../../shared/format/currency';
import type { DashboardMetrics } from './useDashboardMetrics';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

const TOOLTIP_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' };

interface SalesTabProps {
  metrics: DashboardMetrics;
  filterLabel: string;
  dateFilter: string;
}

function ChangeIndicator({ value, dateFilter }: { value: number; dateFilter: string }) {
  if (dateFilter === 'all') return null;
  if (value === 0) return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> No change
    </span>
  );
  const isPositive = value > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value.toFixed(1)}% vs prev period
    </span>
  );
}

export function SalesTab({ metrics, filterLabel, dateFilter }: SalesTabProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.salesCards.revenue.value)}</div>
            <div className="mt-1">
              <ChangeIndicator value={metrics.salesCards.revenue.change} dateFilter={dateFilter} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{metrics.itemsRented + metrics.itemsReserved + metrics.itemsSold}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.itemsRented} rented - {metrics.itemsReserved} reserved - {metrics.itemsSold} sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Avg Ticket</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.avgTicket)}</div>
            <div className="mt-1">
              <ChangeIndicator value={metrics.salesCards.avgRental.change} dateFilter={dateFilter} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Rentals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{metrics.salesCards.activeRentals.value}</div>
            <div className="mt-1">
              {metrics.overdueRentals > 0 ? (
                <span className="flex items-center gap-1 text-xs text-orange-500">
                  <AlertTriangle className="h-3 w-3" /> {metrics.overdueRentals} overdue
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">All on schedule</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Category + Popular Dresses */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>Distribution for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metrics.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {metrics.categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrencyARS(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Most Popular
            </CardTitle>
            <CardDescription>Top 5 by usage for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.popularDresses.length > 0 ? (
                metrics.popularDresses.map((item, index) => (
                  <div key={item.dressId} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm">
                      {index + 1}
                    </div>
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-md object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <Badge variant="secondary">{item.count} {item.count === 1 ? 'use' : 'uses'}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No rental data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Payment Method + Revenue by Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Revenue by Payment Method
            </CardTitle>
            <CardDescription>Breakdown for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.paymentMethodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrencyARS(v)} />
                  <YAxis type="category" dataKey="method" width={110} />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyARS(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              Revenue by Type
            </CardTitle>
            <CardDescription>Breakdown for {filterLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.revenueByTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={metrics.revenueByTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrencyARS(v)} />
                  <YAxis type="category" dataKey="type" width={110} />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyARS(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No type data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Late Return</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.totalLateFees)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.lateFeeCount > 0
                ? `Avg ${metrics.avgLateDays.toFixed(1)} days late (${metrics.lateFeeCount} items)`
                : 'No late returns'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Extra Days</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.totalExtraDaysRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.rentalsWithExtraDays > 0
                ? `Avg ${metrics.avgExtraDays.toFixed(1)} extra days`
                : 'No extra days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Discounts</CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrencyARS(metrics.totalDiscounts)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.discountCount > 0
                ? `Avg ${metrics.avgDiscountPercent.toFixed(0)}% discount`
                : 'No discounts applied'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Inventory Utilization</CardTitle>
            <Tag className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{metrics.utilizationRate.toFixed(0)}%</div>
            <Progress value={metrics.utilizationRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.itemsUsed} of {metrics.totalDresses} items used
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
