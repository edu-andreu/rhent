import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface RevenueTrendItem {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  revenueTrend: RevenueTrendItem[];
  currentCashBalance: number;
  openingBalance: number;
  avgRentalValue: number;
  totalRentals: number;
}

export function RevenueChart({
  revenueTrend,
  currentCashBalance,
  openingBalance,
  avgRentalValue,
  totalRentals,
}: RevenueChartProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Revenue - Last 7 Days</CardTitle>
          <CardDescription>Daily revenue performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash Drawer</CardTitle>
            <CardDescription>Current cash balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">${currentCashBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Opening balance: ${openingBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Rental Value</CardTitle>
            <CardDescription>Per transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">${avgRentalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on {totalRentals} total rentals
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
