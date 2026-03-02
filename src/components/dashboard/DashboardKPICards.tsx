import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface DashboardKPICardsProps {
  totalRevenue: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  revenueGrowth: number;
  activeRentals: number;
  overdueRentals: number;
  upcomingReservations: number;
}

export function DashboardKPICards({
  totalRevenue,
  todayRevenue,
  thisMonthRevenue,
  revenueGrowth,
  activeRentals,
  overdueRentals,
  upcomingReservations,
}: DashboardKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            ${todayRevenue.toFixed(2)} today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">This Month</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">${thisMonthRevenue.toFixed(2)}</div>
          <div className="flex items-center gap-1 mt-1">
            {revenueGrowth >= 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-500" />
                <p className="text-xs text-green-500">
                  +{revenueGrowth.toFixed(1)}% from last month
                </p>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-500" />
                <p className="text-xs text-red-500">
                  {revenueGrowth.toFixed(1)}% from last month
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Active Rentals</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{activeRentals}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {overdueRentals > 0 && (
              <span className="text-orange-500">{overdueRentals} overdue</span>
            )}
            {overdueRentals === 0 && "All on schedule"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Reservations</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{upcomingReservations}</div>
          <p className="text-xs text-muted-foreground mt-1">Upcoming bookings</p>
        </CardContent>
      </Card>
    </div>
  );
}
