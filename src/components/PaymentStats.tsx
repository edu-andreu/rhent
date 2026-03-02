import { DollarSign, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Transaction } from "../types";

interface PaymentStatsProps {
  transactions: Transaction[];
}

export function PaymentStats({ transactions }: PaymentStatsProps) {
  const completedTransactions = transactions.filter(t => t.status === 'completed');
  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  
  const stats = {
    totalSpent: completedTransactions
      .filter(t => t.type !== 'refund')
      .reduce((sum, t) => sum + t.amount, 0),
    totalRefunded: completedTransactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: pendingTransactions.reduce((sum, t) => sum + t.amount, 0),
    totalTransactions: transactions.length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl">${stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Refunded</p>
              <p className="text-2xl">${stats.totalRefunded.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl">${stats.pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl">{stats.totalTransactions}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
